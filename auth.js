const AUTH_USERS_KEY = 'auth_users_v1';
const AUTH_SESSION_KEY = 'auth_session_v1';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const DEFAULT_PASSWORD = 'Oi@12345';

const USERS = [
  { id: "329897", name: "Eduardo Mota Batista", role: "user" },
  { id: "418073", name: "Jussimara Santos Nascimento Almeida", role: "user" },
  { id: "418074", name: "Nermi Gomes Mende", role: "user" },
  { id: "414923", name: "Nilo Martins Da Paixao", role: "user" },
  { id: "414838", name: "Rita de Cassia Oliveira Passos dos Santos", role: "user" },
  { id: "457348", name: "Anabelly Cris Silva", role: "user" },
  { id: "457138", name: "Ariadna Almeida da Silva", role: "user" },
  { id: "418144", name: "Attos Filipe Da Silva Quaresma", role: "user" },
  { id: "418274", name: "Bruno Henrique Cunha Pessoa", role: "user" },
  { id: "457344", name: "Caroline Victoria Marques de Oliveira", role: "user" },
  { id: "418103", name: "Daniel Ferreira Guedes", role: "user" },
  { id: "370431", name: "Debora Vieira dos Anjos", role: "user" },
  { id: "457160", name: "Elizabeth Yorane Pereira Maia", role: "user" },
  { id: "418275", name: "Elvikiss Anjos Moura", role: "user" },
  { id: "333012", name: "Fabricio Gonçalves de Oliveira", role: "user" },
  { id: "418072", name: "Giuliano Ribeiro de Souza", role: "user" },
  { id: "418114", name: "Golper Sales Da Silva", role: "user" },
  { id: "457111", name: "Henrique Souza Alves", role: "user" },
  { id: "418856", name: "Jesus Cardoso de Araújo", role: "user" },
  { id: "418254", name: "Jose Welington Galdino De Arruda", role: "user" },
  { id: "457117", name: "Leandro Barbosa Mota", role: "user" },
  { id: "457134", name: "Lorrane Silva do Espirito Santo", role: "user" },
  { id: "457112", name: "Lucas Brandão da Silva", role: "user" },
  { id: "457110", name: "Marcos Akira Essaki", role: "user" },
  { id: "457345", name: "Marcos Danniel Gonçalves da Silva", role: "user" },
  { id: "457139", name: "Natália Pimenta de Silva", role: "user" },
  { id: "414767", name: "Nathália Andrade D'Azevedo", role: "user" },
  { id: "418076", name: "Neudmar Almeida Souza", role: "user" },
  { id: "457136", name: "Nicoly Cristine Chiovato Belo", role: "user" },
  { id: "457346", name: "Pedro Gabriel Cardoso dos Santos", role: "user" },
  { id: "339045", name: "Renata Adrielly Dantas", role: "user" },
  { id: "419261", name: "Rodrigo Nunes da Silva", role: "user" },
  { id: "457347", name: "Ryan Oliveira Soares", role: "user" },
  { id: "457169", name: "Samara De Paiva Pontes", role: "user" },
  { id: "419216", name: "Ronivon Nunes Figueiredo", role: "user" },
  { id: "405883", name: "Sergio Celso De Souza", role: "user" },
  { id: "419357", name: "Francisco Ferreira Silva", role: "user" },
  { id: "418078", name: "Sidney Silva Neiva", role: "user" },
  { id: "457133", name: "Sarli Cristina Souza e Silva", role: "user" },
  { id: "457118", name: "Washington Ferreira de Souza", role: "user" },
  { id: "304326", name: "Antonio Estanislau", role: "user" },
  { id: "457135", name: "Arinos André de Moraes Nascimento", role: "user" },
  { id: "403214", name: "Claudio Garcia da Silva", role: "user" },
  { id: "457113", name: "Davi Artur da Silva Borba", role: "user" },
  { id: "457116", name: "Denver Nascimento Barros", role: "user" },
  { id: "419525", name: "Eder Simões Duarte Da Silva", role: "user" },
  { id: "457159", name: "Ehrica Rhaissa Oliveira de Souza", role: "user" },
  { id: "368972", name: "Jacyara Lima Afonseca", role: "user" },
  { id: "419551", name: "José Henrique Ferreira Mendes", role: "user" },
  { id: "457158", name: "Juan Gabriel Veras Bento", role: "user" },
  { id: "457115", name: "Matheus José de Carvalho Lopes", role: "user" },
  { id: "274612", name: "Rafael Pereira Gomes", role: "user" },
  { id: "418088", name: "Wesley Fernandes da Fonseca Rodrigues", role: "user" },
  { id: "418124", name: "William Faria Moreira", role: "user" },
  { id: "418115", name: "Francisco De Assis Ribeiro De Araujo", role: "user" },
  { id: "419523", name: "Gustavo Alves Da Costa", role: "user" },
  { id: "418262", name: "Lucas Nunes De Oliveira", role: "user" },
  { id: "419221", name: "Max Jonathan da Mata Oliveira", role: "user" },
  { id: "419629", name: "Rafael Pontes Vieira", role: "user" },
  { id: "418268", name: "Rener Guedes De Assis Silva Kravczyk", role: "user" },
  { id: "419554", name: "Robson Alves Rodrigues", role: "user" },
  { id: "414925", name: "Thiago Dos Passos Sousa", role: "user" },
  { id: "457140", name: "Tiago Alves de Carvalho", role: "user" },
  { id: "457157", name: "Tiago Lacerda de Brito", role: "user" },
  { id: "418857", name: "Wallace Farias Machado", role: "user" },
  { id: "418265", name: "Walter Santos Souza", role: "user" },
  { id: "414888", name: "Wilton Dantas Pereira", role: "user" },
  { id: "418068", name: "Amilton Oliveira Delgado", role: "user" },
  { id: "418117", name: "Neliton Pereira Machado Marques", role: "user" },
  { id: "418852", name: "Claudio Soares Mendes", role: "user" },
  { id: "310949", name: "Glauber Luciano Alves de Souza", role: "user" },
  { id: "418118", name: "Manoel Victor Da Costa Barros", role: "admin" },  // ADM
  { id: "308514", name: "Marcio Edenil José Almeida", role: "user" },
  { id: "368101", name: "Marcio Rodrigues da Cunha", role: "user" },
  { id: "367682", name: "Josue Almeida Lima", role: "user" },
  { id: "403291", name: "Wanderson André Almeida", role: "user" },
  { id: "457059", name: "Angêla Neli Heredias Santos", role: "user" },
  { id: "418071", name: "Camilo Borges Dias", role: "user" },
  { id: "369035", name: "Cristiano de Lelis Silva", role: "user" },
  { id: "418264", name: "Ericson Policarpo Gonzaga", role: "user" },
  { id: "312120", name: "Greiciane Beatriz Rodrigues Silva", role: "user" },
  { id: "308213", name: "Edson Domingos Moreira de Jesus", role: "user" },
  { id: "340882", name: "Rodrigo Pereira dos Santos de Oliveira", role: "user" },
  { id: "273214", name: "Fabiano Soares Silva", role: "user" }
];


function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readStoredUsers() {
  const raw = localStorage.getItem(AUTH_USERS_KEY);
  const parsed = parseJson(raw);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

function persistStoredUsers(users) {
  try {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  } catch {
    // ignore storage errors
  }
}

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text || '');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function findUserDefinition(id) {
  return USERS.find((user) => user.id === id) || null;
}

async function createStoredUser(definition) {
  const now = new Date().toISOString();
  const hash = await sha256(DEFAULT_PASSWORD);
  return {
    ...definition,
    passHash: hash,
    mustChangePassword: true,
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeId(value) {
  return String(value || '').trim();
}

function getSession() {
  const raw = localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) {
    return null;
  }
  const session = parseJson(raw);
  if (!session || !session.id || !session.expiresAt) {
    clearSession();
    return null;
  }
  if (Date.now() >= session.expiresAt) {
    clearSession();
    return null;
  }
  return session;
}

function setSession(id) {
  const now = Date.now();
  const payload = {
    id,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(payload));
}

function clearSession() {
  localStorage.removeItem(AUTH_SESSION_KEY);
}

function getSessionUser() {
  const session = getSession();
  if (!session) {
    return null;
  }
  const stored = readStoredUsers();
  return stored[session.id] || null;
}

function renderAuthStatus(user) {
  const label = document.getElementById('authLabel');
  const badge = document.getElementById('authRoleBadge');
  const container = document.getElementById('authInfo');
  const signOutButton = document.getElementById('authSignOut');
  if (container) {
    container.classList.toggle('hidden', !user);
  }
  if (label) {
    label.textContent = user ? `Logado: ${user.name} (${user.id})` : '';
  }
  if (badge) {
    badge.classList.toggle('hidden', !(user && user.role === 'admin'));
  }
  if (signOutButton) {
    signOutButton.disabled = !user;
    signOutButton.onclick = (event) => {
      event.preventDefault();
      signOut();
    };
  }
}

async function ensureStoredUser(id) {
  const normalized = normalizeId(id);
  if (!normalized) {
    return null;
  }
  const stored = readStoredUsers();
  if (stored[normalized]) {
    return stored[normalized];
  }
  const definition = findUserDefinition(normalized);
  if (!definition) {
    return null;
  }
  const record = await createStoredUser(definition);
  stored[normalized] = record;
  persistStoredUsers(stored);
  return record;
}

async function signIn({ id, password }) {
  const normalizedId = normalizeId(id);
  const definition = findUserDefinition(normalizedId);
  if (!definition) {
    throw new Error('ID inválido.');
  }
  const storedUser = await ensureStoredUser(normalizedId);
  if (!storedUser) {
    throw new Error('ID inválido.');
  }
  const hash = await sha256(password);
  if (hash !== storedUser.passHash) {
    throw new Error('ID ou senha inválidos.');
  }
  setSession(normalizedId);
  return { ...storedUser };
}

async function changePassword(newPassword) {
  const session = getSession();
  if (!session) {
    throw new Error('Sessão inválida.');
  }
  const stored = readStoredUsers();
  const user = stored[session.id];
  if (!user) {
    throw new Error('Usuário não encontrado.');
  }
  const hash = await sha256(newPassword);
  const now = new Date().toISOString();
  const updated = {
    ...user,
    passHash: hash,
    mustChangePassword: false,
    updatedAt: now,
  };
  stored[session.id] = updated;
  persistStoredUsers(stored);
  setSession(session.id);
  return updated;
}

function requireAuthOrRedirect({ allowChangePasswordPage = false, loginPath = 'login.html' } = {}) {
  const user = getSessionUser();
  if (!user) {
    clearSession();
    if (loginPath) {
      window.location.href = loginPath;
    }
    return null;
  }
  if (user.mustChangePassword && !allowChangePasswordPage) {
    window.location.href = 'change-password.html';
    return null;
  }
  if (!user.mustChangePassword && allowChangePasswordPage) {
    window.location.href = 'index.html';
    return null;
  }
  renderAuthStatus(user);
  return user;
}

function signOut() {
  clearSession();
  window.location.href = 'login.html';
}

window.requireAuthOrRedirect = requireAuthOrRedirect;
window.signIn = signIn;
window.changePassword = changePassword;
window.getSessionUser = getSessionUser;
window.signOut = signOut;
window.USERS = USERS;
