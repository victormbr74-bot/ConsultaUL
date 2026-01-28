const DEFAULT_PASSWORD = 'Oi@12345';
const USER_LIST_URL = './data/users.json';
const LOCAL_STATE_KEY = 'consultaul.localAuthState';
const LOCAL_SESSION_KEY = 'consultaul.localAuthSession';

const state = {
  definitions: new Map(),
  definitionsLoaded: false,
  definitionsPromise: null,
  profile: null,
  defaultPasswordHashPromise: null,
  authReadyPromise: Promise.resolve(),
};

function normalizeId(value) {
  return String(value || '').trim();
}

async function hashString(value) {
  const raw = String(value || '');
  if (window.crypto?.subtle && window.TextEncoder) {
    const encoded = new TextEncoder().encode(raw);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  try {
    return btoa(raw);
  } catch {
    return raw;
  }
}

async function getDefaultPasswordHash() {
  if (!state.defaultPasswordHashPromise) {
    state.defaultPasswordHashPromise = hashString(DEFAULT_PASSWORD);
  }
  return state.defaultPasswordHashPromise;
}

function getStoredAuthState() {
  const raw = localStorage.getItem(LOCAL_STATE_KEY);
  if (!raw) {
    return { userStates: {} };
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return { userStates: parsed.userStates || {} };
    }
  } catch {
    // ignore
  }
  return { userStates: {} };
}

function setStoredAuthState(snapshot) {
  try {
    const payload = { userStates: snapshot.userStates || {} };
    localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('Falha ao salvar estado local da autenticação', error);
  }
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
    const entries = Array.isArray(payload?.users) ? payload.users : [];
    const map = new Map();
    entries.forEach((entry) => {
      const normalized = normalizeId(entry?.id);
      if (!normalized) {
        return;
      }
      map.set(normalized, {
        id: normalized,
        name: entry?.name || normalized,
        role: entry?.role || 'user',
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

function loadSession() {
  const raw = sessionStorage.getItem(LOCAL_SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function persistSession(profile) {
  if (!profile) {
    sessionStorage.removeItem(LOCAL_SESSION_KEY);
    state.profile = null;
    return;
  }
  try {
    sessionStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('Falha ao persistir sessão local', error);
  }
  state.profile = profile;
}

function renderAuthStatus(profile) {
  const label = document.getElementById('authLabel');
  const badge = document.getElementById('authRoleBadge');
  const container = document.getElementById('authInfo');
  const signOutButton = document.getElementById('authSignOut');
  const welcomeGreeting = document.getElementById('welcomeGreeting');
  const welcomeName = document.getElementById('welcomeName');
  if (container) {
    container.classList.toggle('hidden', !profile);
  }
  if (label) {
    label.textContent = profile ? `Logado: ${profile.name} (${profile.id})` : '';
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
  if (welcomeName) {
    welcomeName.textContent = profile ? profile.name : '';
  }
  if (welcomeGreeting) {
    welcomeGreeting.classList.toggle('hidden', !profile);
  }
}

async function signIn({ id, password }) {
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
  const stored = getStoredAuthState();
  const entry = stored.userStates[normalizedId] || {};
  const requestedHash = await hashString(password);
  const defaultHash = await getDefaultPasswordHash();
  const expectedHash = entry.passwordHash || defaultHash;
  if (requestedHash !== expectedHash) {
    throw new Error('ID ou senha inválidos.');
  }
  const mustChangePassword = Boolean(entry.mustChangePassword ?? (requestedHash === defaultHash));
  const profile = {
    id: normalizedId,
    name: definition.name,
    role: definition.role || 'user',
    mustChangePassword,
  };
  stored.userStates[normalizedId] = {
    ...entry,
    mustChangePassword,
  };
  setStoredAuthState(stored);
  persistSession(profile);
  renderAuthStatus(profile);
  return profile;
}

async function changePassword(newPassword) {
  if (!newPassword) {
    throw new Error('Informe a nova senha.');
  }
  const session = loadSession();
  if (!session) {
    throw new Error('Sessão inválida.');
  }
  const normalizedId = normalizeId(session.id);
  if (!normalizedId) {
    throw new Error('Sessão inválida.');
  }
  const hashedPassword = await hashString(newPassword);
  const stored = getStoredAuthState();
  stored.userStates[normalizedId] = {
    ...(stored.userStates[normalizedId] || {}),
    passwordHash: hashedPassword,
    mustChangePassword: false,
    updatedAt: new Date().toISOString(),
  };
  setStoredAuthState(stored);
  const updatedProfile = {
    ...session,
    mustChangePassword: false,
  };
  persistSession(updatedProfile);
  renderAuthStatus(updatedProfile);
  return updatedProfile;
}

async function submitPasswordResetRequest() {
  throw new Error('Solicitação de reset indisponível no modo local.');
}

function performSignOut() {
  persistSession(null);
  renderAuthStatus(null);
}

async function signOut() {
  performSignOut();
  window.location.href = 'login.html';
}

async function requireAuthOrRedirect({ allowChangePasswordPage = false, loginPath = 'login.html', requiredRole = null } = {}) {
  try {
    const definitions = await ensureDefinitionsLoaded();
    const session = loadSession();
    if (!session) {
      window.location.href = loginPath;
      return null;
    }
    const normalizedId = normalizeId(session.id);
    if (!normalizedId || !definitions.has(normalizedId)) {
      performSignOut();
      window.location.href = loginPath;
      return null;
    }
    const definition = definitions.get(normalizedId);
    const role = session.role || definition.role || 'user';
    const mustChangePassword = Boolean(session.mustChangePassword ?? true);
    if (mustChangePassword && !allowChangePasswordPage) {
      window.location.href = 'change-password.html';
      return null;
    }
    if (!mustChangePassword && allowChangePasswordPage) {
      window.location.href = 'index.html';
      return null;
    }
    if (requiredRole && role !== requiredRole) {
      window.location.href = loginPath;
      return null;
    }
    const profile = {
      id: normalizedId,
      name: definition.name,
      role,
      mustChangePassword,
    };
    persistSession(profile);
    state.profile = profile;
    renderAuthStatus(profile);
    return profile;
  } catch (error) {
    console.error('Falha na verificação de autenticação local', error);
    performSignOut();
    window.location.href = loginPath;
    return null;
  }
}

window.signIn = signIn;
window.changePassword = changePassword;
window.submitPasswordResetRequest = submitPasswordResetRequest;
window.requireAuthOrRedirect = requireAuthOrRedirect;
window.signOut = signOut;
window.waitForAllowedUsers = ensureDefinitionsLoaded;
window.authReady = state.authReadyPromise;
window.DEFAULT_PASSWORD = DEFAULT_PASSWORD;
window.getSessionUser = () => state.profile || loadSession();

ensureDefinitionsLoaded().catch(() => {});

window.addEventListener('load', () => {
  const localChangeNotice = 'Alteração salva localmente ? — a base oficial será carregada toda sexta-feira.';
  if (typeof window.notifyLocalSave === 'function') {
    window.notifyLocalSave = () => window.showSnackbar?.(localChangeNotice);
  }
});
