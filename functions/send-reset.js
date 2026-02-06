const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = require('../firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'power-to-the-people-vpp'
  });
}

const auth = admin.auth();

async function sendReset() {
  const link = await auth.generatePasswordResetLink('justin@agntc.tech');
  console.log('Password reset link:');
  console.log(link);
}

sendReset().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
