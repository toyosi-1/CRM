import {
  collection, doc, getDocs, setDoc,
  updateDoc, onSnapshot, query, where,
  orderBy, Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  ref, uploadBytes, getDownloadURL,
} from 'firebase/storage';
import { db, storage } from './firebase';
import type {
  User, Site, Vendor, Asset, MaintenanceRequest, Checklist, TreasuryEntry,
} from '../types';

// ─── Collection names ────────────────────────────────────────────────────────
export const COLLECTIONS = {
  users:    'users',
  sites:    'sites',
  vendors:  'vendors',
  assets:   'assets',
  requests: 'requests',
  checklists: 'checklists',
  treasury: 'treasury',
} as const;

// ─── Timestamp helpers ───────────────────────────────────────────────────────
export function tsToISO(ts: Timestamp | string | undefined): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === 'string') return ts;
  return ts.toDate().toISOString();
}

// ─── Users ───────────────────────────────────────────────────────────────────
export async function fetchUsers(): Promise<User[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.users));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
}

export async function fetchUserByEmail(email: string): Promise<User | null> {
  const q = query(collection(db, COLLECTIONS.users), where('email', '==', email));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as User;
}

export async function upsertUser(user: User): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.users, user.id), user, { merge: true });
}

// ─── Sites ───────────────────────────────────────────────────────────────────
export async function fetchSites(): Promise<Site[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.sites));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Site));
}

export async function updateSiteInDB(siteId: string, data: Partial<Site>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.sites, siteId), data as Record<string, unknown>);
}

// ─── Vendors ─────────────────────────────────────────────────────────────────
export async function fetchVendors(): Promise<Vendor[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.vendors));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Vendor));
}

export async function upsertVendor(vendor: Vendor): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.vendors, vendor.id), vendor, { merge: true });
}

// ─── Assets ──────────────────────────────────────────────────────────────────
export async function fetchAssets(): Promise<Asset[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.assets));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Asset));
}

// ─── Requests ────────────────────────────────────────────────────────────────
export function subscribeRequests(
  callback: (requests: MaintenanceRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.requests),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => {
    const requests = snap.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        createdAt: tsToISO(data.createdAt),
        updatedAt: tsToISO(data.updatedAt),
        slaDeadline: tsToISO(data.slaDeadline),
      } as MaintenanceRequest;
    });
    callback(requests);
  });
}

export async function createRequestInDB(req: MaintenanceRequest): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.requests, req.id), req);
}

export async function updateRequestInDB(
  requestId: string,
  data: Partial<MaintenanceRequest>
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.requests, requestId), {
    ...data,
    updatedAt: new Date().toISOString(),
  } as Record<string, unknown>);
}

// ─── Checklists ──────────────────────────────────────────────────────────────
export function subscribeChecklists(
  callback: (checklists: Checklist[]) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTIONS.checklists), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Checklist)));
  });
}

export async function updateChecklistInDB(
  checklistId: string,
  data: Partial<Checklist>
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.checklists, checklistId), data as Record<string, unknown>);
}

// ─── Treasury ────────────────────────────────────────────────────────────────
export function subscribeTreasury(
  callback: (entries: TreasuryEntry[]) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTIONS.treasury), orderBy('date', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as TreasuryEntry)));
  });
}

export async function addTreasuryEntryInDB(entry: TreasuryEntry): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.treasury, entry.id), entry);
}

// ─── Storage helpers ─────────────────────────────────────────────────────────
export async function uploadFile(
  path: string,
  file: File
): Promise<string> {
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}
