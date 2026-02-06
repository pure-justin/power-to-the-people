const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = require('../firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'power-to-the-people-vpp'
  });
}

const auth = admin.auth();

async function resetPassword() {
  // Update user with new password
  await auth.updateUser('L0eF0YAnDDdBzNf8v2UCyTdfxYx2', {
    password: 'Solar2026!'
  });
  console.log('Password reset successfully');
  console.log('');
  console.log('Login with:');
  console.log('  Email: justin@agntc.tech');
  console.log('  Password: Solar2026!');
  process.exit(0);
}

resetPassword().catch(e => { console.error(e); process.exit(1); });
