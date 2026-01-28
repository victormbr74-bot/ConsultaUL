const admin = require('firebase-admin');
const { users } = require('../data/users.json');

const DEFAULT_PASSWORD = 'Oi@12345';

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.warn('Defina GOOGLE_APPLICATION_CREDENTIALS apontando para o service account JSON antes de rodar este script.');
}

if (!admin.apps.length) {
  admin.initializeApp();
}

const auth = admin.auth();
const db = admin.firestore();

async function ensureUser(userDef) {
  const email = `${userDef.id}@oi.local`;
  try {
    await auth.getUserByEmail(email);
    console.info(`Usuário ${userDef.id} já existe, será ignorado.`);
    return;
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }
  }
  const created = await auth.createUser({
    email,
    password: DEFAULT_PASSWORD,
  });
  await db.doc(`users/${created.uid}`).set({
    id: userDef.id,
    name: userDef.name,
    role: userDef.role || 'user',
    mustChangePassword: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.info(`Usuário ${userDef.id} criado.`);
}

async function main() {
  for (const userDef of users) {
    await ensureUser(userDef);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
