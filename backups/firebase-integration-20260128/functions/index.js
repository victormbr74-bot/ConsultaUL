const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const USERS_COLLECTION = 'users';
const REQUESTS_COLLECTION = 'password_reset_requests';
const DEFAULT_PASSWORD = 'Oi@12345';

exports.adminResetPassword = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário precisa estar autenticado.');
  }
  const callerUid = context.auth.uid;
  const adminDoc = await admin.firestore().doc(`${USERS_COLLECTION}/${callerUid}`).get();
  if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem executar esta ação.');
  }
  const requestId = data?.requestId;
  if (!requestId) {
    throw new functions.https.HttpsError('invalid-argument', 'Informe a solicitação a ser aprovada.');
  }
  const requestRef = admin.firestore().collection(REQUESTS_COLLECTION).doc(requestId);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Solicitação inexistente.');
  }
  const requestData = requestSnap.data();
  if (requestData.status !== 'pending') {
    throw new functions.https.HttpsError('failed-precondition', 'Solicitação já foi processada.');
  }
  const email = requestData.requestedEmail;
  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Solicitação inválida.');
  }
  let targetUser;
  try {
    targetUser = await admin.auth().getUserByEmail(email);
  } catch (error) {
    throw new functions.https.HttpsError('not-found', 'Usuário não encontrado no Auth.');
  }
  await admin.auth().updateUser(targetUser.uid, { password: DEFAULT_PASSWORD });
  await admin.firestore().doc(`${USERS_COLLECTION}/${targetUser.uid}`).set(
    { mustChangePassword: true },
    { merge: true }
  );
  await requestRef.update({
    status: 'approved',
    adminUid: callerUid,
    adminAt: admin.firestore.FieldValue.serverTimestamp(),
    adminNote: '',
  });
  return { success: true };
});
