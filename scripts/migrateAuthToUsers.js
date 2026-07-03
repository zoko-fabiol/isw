/*
  Usage:
    Set env var `GOOGLE_APPLICATION_CREDENTIALS` pointing to your service account JSON,
    then run:
      node scripts/migrateAuthToUsers.js

  Or pass path as first arg:
      node scripts/migrateAuthToUsers.js path/to/serviceAccount.json

  This will list all Firebase Auth users and create a Firestore document
  under `users/<email>` with basic profile and default permissions.
*/

const admin = require('firebase-admin');

const path = process.argv[2] || process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!path) {
  console.error('Please provide a service account JSON path as arg or set GOOGLE_APPLICATION_CREDENTIALS.');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(require(path)) });
const db = admin.firestore();

const buildDefaultPermissions = () => {
  const tabs = [
    { id: 'dashboard', actions: [] },
    { id: 'employees', actions: ['add', 'edit', 'delete'] },
    { id: 'attendance', actions: ['add', 'edit', 'delete'] },
    { id: 'delays', actions: ['add', 'edit', 'delete'] },
    { id: 'leaves', actions: ['add', 'edit', 'delete'] },
    { id: 'payrolls', actions: ['add', 'edit', 'delete'] },
    { id: 'reports', actions: [] },
  ];
  const perms = {};
  tabs.forEach((t) => { perms[t.id] = { view: true }; t.actions.forEach(a => perms[t.id][a] = false); });
  return perms;
};

async function migrate() {
  console.log('Listing users...');
  let result = await admin.auth().listUsers(1000);
  const users = result.users;
  console.log(`Found ${users.length} users (first page).`);

  for (const u of users) {
    const email = (u.email || '').trim().toLowerCase();
    if (!email) continue;
    const profile = {
      displayName: u.displayName || email.split('@')[0],
      role: 'user',
      active: true,
      createdAt: Date.now(),
      permissions: buildDefaultPermissions(),
    };
    await db.doc(`users/${email}`).set(profile, { merge: true });
    console.log(`Created/updated profile for ${email}`);
  }

  // Note: for more than 1000 users, implement pagination with nextPageToken.
  console.log('Done.');
}

migrate().catch((err) => { console.error(err); process.exit(1); });
