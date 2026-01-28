const DEFAULT_PASSWORD = 'Oi@12345';
const USER_LIST_URL = './data/users.json';
const EMAIL_DOMAIN = 'oi.local';
const FirebaseClient = window.FirebaseClient;

if (!FirebaseClient) {
  console.error('Firebase client não inicializado antes de auth.js');
}

const state = {
  definitions: new Map(),
  definitionsLoaded: false,
  definitionsPromise: null,
  profile: null,
  profilePromise: null,
  authReadyPromise: null,
  authReadyResolve: null,
  authReadyResolved: false,
};

state.authReadyPromise = new Promise((resolve) => {
  state.authReadyResolve = resolve;
});

function markAuthReady() {
  if (!state.authReadyResolved) {
    state.authReadyResolved = true;
    if (state.authReadyResolve) {
      state.authReadyResolve();
    }
  }
}

function normalizeId(value) {
  return String(value || '').trim();
}

function formatEmail(id) {
  return ${id}@;
}

function translateFirebaseError(error) {
  if (!error || !error.code) {
    return null;
  }
  const map = {
    'auth/user-not-found': 'ID ou senha inválidos.',
    'auth/wrong-password': 'ID ou senha inválidos.',
    'auth/invalid-email': 'ID inválido.',
    'auth/user-disabled': 'Conta desativada. Contate o ADM.',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
    'auth/requires-recent-login': 'É necessário autenticar novamente.',
  };
  return map[error.code] || null;
}

async function ensureDefinitionsLoaded() {
  if (state.definitionsLoaded) {
    return state.definitions;
  }
  if (state.definitionsPromise) {
    return state.definitionsPromise;
  }
  state.definitionsPromise = (async () => {
    const response = await fetch(USER_LIST_URL, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error('Não foi possível carregar a lista de usuários.');
    }
    const payload = await response.json();
    const list = Array.isArray(payload?.users) ? payload.users : [];
    const map = new Map();
    list.forEach((entry) => {
      const normalized = normalizeId(entry.id);
      if (!normalized) {
        return;
      }
      map.set(normalized, {
        id: normalized,
        name: entry.name || normalized,
        role: entry.role || 'user',
      });
    });
    state.definitions = map;
    state.definitionsLoaded = true;
    return map;
  })().finally(() => {
    state.definitionsPromise = null;
  });
  return state.definitionsPromise;
}

async function fetchProfileFromFirestore(firebaseUser) {
  if (!FirebaseClient) {
    throw new Error('Firebase não está disponível.');
  }
  const docRef = FirebaseClient.doc(FirebaseClient.db, 'users', firebaseUser.uid);
  const snapshot = await FirebaseClient.getDoc(docRef);
  if (!snapshot.exists()) {
    throw new Error('Perfil de usuário não encontrado no Firestore.');
  }
  await ensureDefinitionsLoaded();
  const data = snapshot.data() || {};
  const normalizedId = normalizeId(data.id || '');
  if (!normalizedId) {
    throw new Error('Dados de autenticação incompletos.');
  }
  const definition = state.definitions.get(normalizedId);
  if (!definition) {
    throw new Error('ID não autorizado. Contate o ADM.');
  }
  return {
    uid: firebaseUser.uid,
    id: normalizedId,
    email: firebaseUser.email || formatEmail(normalizedId),
    name: data.name || definition.name,
    role: data.role || definition.role || 'user',
    mustChangePassword: Boolean(data.mustChangePassword),
  };
}

async function hydrateProfile(force = false) {
  if (state.profile && !force) {
    return state.profile;
  }
  if (!FirebaseClient || !FirebaseClient.auth) {
    return null;
  }
  const firebaseUser = FirebaseClient.auth.currentUser;
  if (!firebaseUser) {
    state.profile = null;
    return null;
  }
  if (state.profilePromise && !force) {
    return state.profilePromise;
  }
  state.profilePromise = (async () => {
    const profile = await fetchProfileFromFirestore(firebaseUser);
    state.profile = profile;
    state.profilePromise = null;
    renderAuthStatus(profile);
    return profile;
  })();
  return state.profilePromise;
}

async function signIn({ id, password }) {
  if (!FirebaseClient || !FirebaseClient.auth) {
    throw new Error('Firebase não inicializado.');
  }
  const normalizedId = normalizeId(id);
  if (!normalizedId) {
    throw new Error('Informe o ID.');
  }
  if (!password) {
    throw new Error('Informe a senha.');
  }
  const definitions = await ensureDefinitionsLoaded();
  const definition = definitions.get(normalizedId);
  if (!definition) {
    throw new Error('ID inválido ou não autorizado.');
  }
  try {
    await FirebaseClient.signInWithEmailAndPassword(
      FirebaseClient.auth,
      formatEmail(normalizedId),
      password
    );
    const profile = await hydrateProfile(true);
    if (!profile) {
      throw new Error('Não foi possível carregar o perfil.');
    }
    return profile;
  } catch (error) {
    const friendly = translateFirebaseError(error);
    throw new Error(friendly || 'Falha ao autenticar. Tente novamente.');
  }
}

async function changePassword(newPassword) {
  if (!newPassword) {
    throw new Error('Informe a nova senha.');
  }
  if (!FirebaseClient || !FirebaseClient.auth) {
    throw new Error('Sessão inválida.');
  }
  await state.authReadyPromise;
  const firebaseUser = FirebaseClient.auth.currentUser;
  if (!firebaseUser) {
    throw new Error('Sessão inválida.');
  }
  try {
    await FirebaseClient.updatePassword(firebaseUser, newPassword);
    const userDocRef = FirebaseClient.doc(FirebaseClient.db, 'users', firebaseUser.uid);
    await FirebaseClient.updateDoc(userDocRef, {
      mustChangePassword: false,
      passwordChangedAt: FirebaseClient.serverTimestamp(),
    });
    if (state.profile) {
      state.profile = { ...state.profile, mustChangePassword: false };
      renderAuthStatus(state.profile);
    }
    return state.profile;
  } catch (error) {
    const friendly = translateFirebaseError(error);
    throw new Error(friendly || 'Falha ao atualizar a senha.');
  }
}

async function submitPasswordResetRequest({ id, note }) {
  if (!id) {
    throw new Error('Informe o ID.');
  }
  if (!FirebaseClient || !FirebaseClient.db) {
    throw new Error('Firebase não está disponível.');
  }
  await ensureDefinitionsLoaded();
  const normalizedId = normalizeId(id);
  if (!state.definitions.has(normalizedId)) {
    throw new Error('ID inválido.');
  }
  const payload = {
    createdAt: FirebaseClient.serverTimestamp(),
    requestedId: normalizedId,
    requestedEmail: formatEmail(normalizedId),
    requestedByUid: state.profile?.uid || null,
    status: 'pending',
    adminUid: null,
    adminAt: null,
    adminNote: '',
    note: String(note || '').trim(),
  };
  await FirebaseClient.addDoc(
    FirebaseClient.collection(FirebaseClient.db, 'password_reset_requests'),
    payload
  );
  return true;
}

async function performSignOut() {
  if (FirebaseClient && FirebaseClient.auth) {
    try {
      await FirebaseClient.signOut(FirebaseClient.auth);
    } catch (error) {
      console.error('Erro ao sair', error);
    }
  }
  state.profile = null;
  renderAuthStatus(null);
}

async function signOut() {
  await performSignOut();
  window.location.href = 'login.html';
}

async function requireAuthOrRedirect({
  allowChangePasswordPage = false,
  loginPath = 'login.html',
  requiredRole = null,
} = {}) {
  try {
    await state.authReadyPromise;
    const profile = await hydrateProfile();
    if (!profile) {
      window.location.href = loginPath;
      return null;
    }
    if (profile.mustChangePassword && !allowChangePasswordPage) {
      window.location.href = 'change-password.html';
      return null;
    }
    if (!profile.mustChangePassword && allowChangePasswordPage) {
      window.location.href = 'index.html';
      return null;
    }
    if (requiredRole && profile.role !== requiredRole) {
      window.location.href = loginPath;
      return null;
    }
    renderAuthStatus(profile);
    return profile;
  } catch (error) {
    console.error('Falha na verificação de autenticação', error);
    await performSignOut();
    window.location.href = loginPath;
    return null;
  }
}

function renderAuthStatus(profile) {
  const label = document.getElementById('authLabel');
  const badge = document.getElementById('authRoleBadge');
  const container = document.getElementById('authInfo');
  const signOutButton = document.getElementById('authSignOut');
  if (container) {
    container.classList.toggle('hidden', !profile);
  }
  if (label) {
    label.textContent = profile ? Logado:  () : '';
  }
  if (badge) {
    badge.classList.toggle('hidden', !(profile && profile.role === 'admin'));
  }
  if (signOutButton) {
    signOutButton.disabled = !profile;
    signOutButton.onclick = (event) => {
      event.preventDefault();
      signOut();
    };
  }
}

async function handleAuthStateChanged(user) {
  markAuthReady();
  if (!user) {
    state.profile = null;
    renderAuthStatus(null);
    return;
  }
  try {
    await ensureDefinitionsLoaded();
    const profile = await fetchProfileFromFirestore(user);
    state.profile = profile;
    renderAuthStatus(profile);
  } catch (error) {
    console.error('Falha ao sincronizar usuário', error);
    await performSignOut();
  }
}

if (FirebaseClient && FirebaseClient.auth && FirebaseClient.onAuthStateChanged) {
  FirebaseClient.onAuthStateChanged(FirebaseClient.auth, handleAuthStateChanged);
} else {
  markAuthReady();
}

ensureDefinitionsLoaded().catch(() => {});

window.signIn = signIn;
window.changePassword = changePassword;
window.submitPasswordResetRequest = submitPasswordResetRequest;
window.requireAuthOrRedirect = requireAuthOrRedirect;
window.getSessionUser = () => state.profile;
window.signOut = signOut;
window.waitForAllowedUsers = ensureDefinitionsLoaded;
window.authReady = state.authReadyPromise;
window.DEFAULT_PASSWORD = DEFAULT_PASSWORD;

window.addEventListener('load', () => {
  const localChangeNotice = 'Alteração salva localmente ✅ — a base oficial será carregada toda sexta-feira.';
  if (typeof window.notifyLocalSave === 'function') {
    window.notifyLocalSave = () => window.showSnackbar?.(localChangeNotice);
  }
});
