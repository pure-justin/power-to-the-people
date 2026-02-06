const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = require('../firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'power-to-the-people-vpp'
  });
}

const auth = admin.auth();
const db = admin.firestore();

async function checkUser() {
  try {
    const user = await auth.getUserByEmail('justin@agntc.tech');
    console.log('Auth User:');
    console.log('  UID:', user.uid);
    console.log('  Email:', user.email);
    console.log('  Email Verified:', user.emailVerified);
    console.log('  Disabled:', user.disabled);
    
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (userDoc.exists) {
      console.log('Firestore Profile:', userDoc.data());
    } else {
      console.log('No Firestore profile found');
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

checkUser();
