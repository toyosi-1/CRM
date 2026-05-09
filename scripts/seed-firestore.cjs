/**
 * FacilityOps — Firestore Seed Script
 *
 * Seeds all mock data into Firestore and creates Firebase Auth accounts
 * for each user with a default password.
 *
 * Prerequisites:
 *   1. npm install -g firebase-tools
 *   2. firebase login
 *   3. Set FIREBASE_PROJECT_ID in this file (or pass as env var)
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/seed-firestore.cjs
 *
 * Or using the Firebase Admin SDK with a service account JSON file
 * downloaded from Firebase Console > Project Settings > Service Accounts.
 */

const admin = require('firebase-admin');
const path = require('path');

const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS
  || path.join(__dirname, '..', 'serviceAccountKey.json');

try {
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
  console.error('\n❌  Could not load service account key.');
  console.error('    Download it from Firebase Console > Project Settings > Service Accounts');
  console.error(`    Expected path: ${SERVICE_ACCOUNT_PATH}\n`);
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

// ─── Mock data (mirrors src/data/mockData.ts) ────────────────────────────────

const USERS = [
  { id: 'u1', name: 'Amara Osei',    email: 'amara@facilityops.com',  role: 'facility_manager', siteId: 's1', department: 'Operations',     avatar: 'AO' },
  { id: 'u2', name: 'Kwame Mensah',  email: 'kwame@facilityops.com',  role: 'facility_manager', siteId: 's2', department: 'Operations',     avatar: 'KM' },
  { id: 'u3', name: 'Chioma Eze',    email: 'chioma@facilityops.com', role: 'procurement',      department: 'Procurement',                  avatar: 'CE' },
  { id: 'u4', name: 'Bola Adeyemi',  email: 'bola@facilityops.com',   role: 'supervisor',       department: 'Management',                   avatar: 'BA' },
  { id: 'u5', name: 'Tunde Fashola', email: 'tunde@facilityops.com',  role: 'finance',          department: 'Finance',                      avatar: 'TF' },
  { id: 'u6', name: 'Ngozi Okonkwo', email: 'ngozi@facilityops.com',  role: 'admin',            department: 'Administration',               avatar: 'NO' },
];

const DEFAULT_PASSWORD = 'FacilityOps2026!';

const SITES = [
  { id: 's1', name: 'Lagos Head Office',     address: '14 Marina Street, Lagos Island, Lagos', size: '12,500 sqft', contactName: 'Amara Osei',   contactPhone: '+234 801 234 5678', contactEmail: 'amara@facilityops.com',  pettyCashEnabled: true,  floatLimit: 150000, monthlyBudget: 2500000, currentMonthSpend: 1850000, slaExpiryDate: '2026-12-31', createdAt: '2024-01-15' },
  { id: 's2', name: 'Abuja Regional Office', address: '7 Gana Street, Maitama, Abuja',         size: '8,200 sqft',  contactName: 'Kwame Mensah', contactPhone: '+234 802 345 6789', contactEmail: 'kwame@facilityops.com',  pettyCashEnabled: true,  floatLimit: 100000, monthlyBudget: 1800000, currentMonthSpend: 1200000, slaExpiryDate: '2026-09-30', createdAt: '2024-03-01' },
  { id: 's3', name: 'Port Harcourt Branch',  address: '3 Aba Road, Port Harcourt, Rivers',     size: '6,000 sqft',  contactName: 'Admin',        contactPhone: '+234 803 456 7890', contactEmail: 'ph@facilityops.com',     pettyCashEnabled: false, floatLimit: 50000,  monthlyBudget: 1200000, currentMonthSpend: 890000,  slaExpiryDate: '2026-06-30', createdAt: '2024-06-01' },
];

const VENDORS = [
  { id: 'v1', name: 'ProClean Facilities',   category: 'Cleaning',        type: 'recurring', bankName: 'GTBank',    accountNumber: '0123456789', accountName: 'ProClean Ltd',        totalJobsCompleted: 47, totalAmountPaid: 3200000, avgCompletionDays: 1, lastJobDate: '2026-05-01', riskScore: 'low',    createdAt: '2023-06-01' },
  { id: 'v2', name: 'TechFix Solutions Ltd', category: 'IT/AV Equipment', type: 'one_time',  bankName: 'Zenith',    accountNumber: '9876543210', accountName: 'TechFix Solutions',   totalJobsCompleted: 12, totalAmountPaid: 890000,  avgCompletionDays: 3, lastJobDate: '2026-04-22', riskScore: 'medium', createdAt: '2024-01-10' },
  { id: 'v3', name: 'CoolAir HVAC Services', category: 'HVAC',            type: 'recurring', bankName: 'First Bank', accountNumber: '1122334455', accountName: 'CoolAir Nigeria Ltd', totalJobsCompleted: 28, totalAmountPaid: 5600000, avgCompletionDays: 2, lastJobDate: '2026-05-03', riskScore: 'low',    createdAt: '2023-03-15' },
  { id: 'v4', name: 'SafeGuard Security',    category: 'Security',        type: 'recurring', bankName: 'Access',    accountNumber: '5544332211', accountName: 'SafeGuard Nigeria',   totalJobsCompleted: 36, totalAmountPaid: 2100000, avgCompletionDays: 1, lastJobDate: '2026-04-30', riskScore: 'low',    createdAt: '2023-09-01' },
];

const TREASURY = [
  { id: 't1', description: 'Monthly operational budget release — Lagos HQ',  source: 'Finance Dept', amount: 2500000, type: 'inflow',  date: '2026-05-01', recordedBy: 'Ngozi Okonkwo' },
  { id: 't2', description: 'ProClean Facilities — May cleaning services',    source: 'Vendor Payment', amount: 320000, type: 'outflow', date: '2026-05-03', recordedBy: 'Tunde Fashola' },
  { id: 't3', description: 'Monthly operational budget release — Abuja',     source: 'Finance Dept', amount: 1800000, type: 'inflow',  date: '2026-05-01', recordedBy: 'Ngozi Okonkwo' },
  { id: 't4', description: 'CoolAir HVAC — quarterly maintenance contract',  source: 'Vendor Payment', amount: 680000, type: 'outflow', date: '2026-05-02', recordedBy: 'Tunde Fashola' },
];

// ─── Seed helpers ─────────────────────────────────────────────────────────────

async function seedCollection(collectionName, records) {
  const batch = db.batch();
  for (const record of records) {
    const { id, ...data } = record;
    batch.set(db.collection(collectionName).doc(id), data);
  }
  await batch.commit();
  console.log(`  ✓ ${collectionName} (${records.length} records)`);
}

async function createAuthUsers() {
  let created = 0;
  let skipped = 0;
  for (const user of USERS) {
    try {
      await auth.createUser({
        uid: user.id,
        email: user.email,
        password: DEFAULT_PASSWORD,
        displayName: user.name,
      });
      created++;
    } catch (e) {
      if (e.code === 'auth/uid-already-exists' || e.code === 'auth/email-already-exists') {
        skipped++;
      } else {
        console.warn(`  ⚠ Could not create auth user ${user.email}: ${e.message}`);
      }
    }
  }
  console.log(`  ✓ auth/users — ${created} created, ${skipped} already existed`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('\n🔥 FacilityOps — Seeding Firestore\n');

  await createAuthUsers();
  await seedCollection('users',    USERS.map(({ id, ...u }) => ({ id, ...u })));
  await seedCollection('sites',    SITES);
  await seedCollection('vendors',  VENDORS);
  await seedCollection('treasury', TREASURY);

  console.log(`\n✅  Seed complete!`);
  console.log(`\n📧  Login credentials (all users):`);
  USERS.forEach(u => console.log(`    ${u.email}  /  ${DEFAULT_PASSWORD}  [${u.role}]`));
  console.log('\n    Change passwords in Firebase Console after first login.\n');

  process.exit(0);
})();
