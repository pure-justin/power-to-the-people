const admin = require('firebase-admin');

const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'power-to-the-people-vpp'
});

const db = admin.firestore();
const auth = admin.auth();

async function createAdminUser() {
  const email = 'justin@agntc.tech';
  
  let user;
  try {
    user = await auth.createUser({
      email: email,
      password: 'TempPass123!',
      displayName: 'Justin Griffith'
    });
    console.log('Created auth user:', user.uid);
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      user = await auth.getUserByEmail(email);
      console.log('User exists:', user.uid);
    } else {
      throw e;
    }
  }
  
  await db.collection('users').doc(user.uid).set({
    email: email,
    displayName: 'Justin Griffith',
    role: 'admin',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  
  console.log('Admin user created');
  console.log('Email:', email);
  console.log('UID:', user.uid);
  
  process.exit(0);
}

createAdminUser().catch(e => { console.error(e); process.exit(1); });
