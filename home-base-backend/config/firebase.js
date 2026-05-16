const admin = require('firebase-admin');

if (!admin.apps.length) {
  let serviceAccount;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const path = require('path');
    const fs = require('fs');
    const fullPath = path.resolve(__dirname, '..', process.env.FIREBASE_SERVICE_ACCOUNT);
    serviceAccount = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else {
    console.error('❌ Firebase Admin not configured.');
    console.error('   Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_JSON in your .env');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin SDK initialized');
}

module.exports = admin;