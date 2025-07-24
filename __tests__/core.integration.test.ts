import { createRequestCache } from '../src/core/cache';
import { config as dotenvConfig } from 'dotenv';
import {v4 as uuidV4} from 'uuid';

dotenvConfig({ path: '.env.test' });

const admin = require('firebase-admin');

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(atob(process.env.FIREBASE_SERVICE_ACCOUNT))
  : undefined;

const shouldRun = !!serviceAccount;

(shouldRun ? describe : describe.skip)('fire-cache integration with real Firestore', () => {
  let firestore: import('firebase-admin').firestore.Firestore;
  let cleanup: () => void;
  let testCollection: string;
  let testDocId: string;

  beforeAll(async () => {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    firestore = admin.firestore();
    testCollection = `firecache_test_${uuidV4()}`;
    testDocId = uuidV4();
    await firestore.collection(testCollection).doc(testDocId).set({ foo: 'bar', ts: Date.now() });
  });

  afterAll(async () => {
    if (!firestore) return;
    await firestore.collection(testCollection).doc(testDocId).delete();
    // Optionally delete the collection if needed
    if (admin.apps.length) {
      await admin.app().delete();
    }
  });

  it('should cache a real document get request', async () => {
    if (!firestore) return;
    cleanup = createRequestCache(firestore);

    const docRef = firestore.collection(testCollection).doc(testDocId);

    // First call (cache miss)
    const snap1 = await docRef.get();
    expect(snap1.exists).toBe(true);
    expect(snap1.data()?.foo).toBe('bar');

    // Second call (should hit cache, not Firestore)
    const snap2 = await docRef.get();
    expect(snap2.exists).toBe(true);
    expect(snap2.data()?.foo).toBe('bar');

    cleanup();
  });
});