const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = require('../firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'power-to-the-people-vpp'
  });
}

const db = admin.firestore();

async function checkData() {
  // Check leads collection
  const leadsSnap = await db.collection('leads').limit(5).get();
  console.log('Leads count:', leadsSnap.size);
  
  // Check users collection
  const usersSnap = await db.collection('users').limit(5).get();
  console.log('Users count:', usersSnap.size);
  
  if (leadsSnap.size === 0) {
    console.log('');
    console.log('No leads found - creating test data...');
    
    // Add sample leads
    const testLeads = [
      {
        name: 'John Smith',
        email: 'john@example.com',
        phone: '(512) 555-1234',
        address: '123 Solar Lane, Austin, TX 78701',
        zipCode: '78701',
        status: 'new',
        leadType: 'residential',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        name: 'ABC Corporation',
        email: 'contact@abc.com',
        phone: '(512) 555-5678',
        address: '456 Business Park, Austin, TX 78702',
        zipCode: '78702',
        status: 'contacted',
        leadType: 'commercial',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        phone: '(512) 555-9012',
        address: '789 Green St, Austin, TX 78703',
        zipCode: '78703',
        status: 'qualified',
        leadType: 'residential',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];
    
    for (const lead of testLeads) {
      await db.collection('leads').add(lead);
    }
    console.log('Created', testLeads.length, 'test leads');
  }
  
  process.exit(0);
}

checkData().catch(e => { console.error(e); process.exit(1); });
