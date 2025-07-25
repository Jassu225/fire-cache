import { createRequestCache, DocumentReferenceType } from '../src/core/cache';
import {v4 as uuidV4} from 'uuid';
import admin from 'firebase-admin';

import { serviceAccount, testCollection } from './test-helper';

const shouldRun = !!serviceAccount;

(shouldRun ? describe : describe.skip)('fire-cache integration with real Firestore', () => {
  let firestore: admin.firestore.Firestore;
  let cleanup: () => void;
  let testDocId: string;

  beforeAll(async () => {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    firestore = admin.firestore();
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
    const docRefPrototype = Object.getPrototypeOf(firestore.collection(testCollection).doc(testDocId)) as DocumentReferenceType;
    const originalGet = docRefPrototype.get;
    const mockGet = jest.fn(originalGet);
    docRefPrototype.get = mockGet;

    cleanup = createRequestCache(firestore);

    const docRef = firestore.collection(testCollection).doc(testDocId);

    // First call (cache miss)
    const snap1 = await docRef.get();
    expect(snap1.exists).toBe(true);
    expect(snap1.data()?.foo).toBe('bar');
    expect(mockGet).toHaveBeenCalledTimes(1);

    // Second call (should hit cache, not Firestore)
    const snap2 = await docRef.get();
    expect(snap2.exists).toBe(true);
    expect(snap2.data()?.foo).toBe('bar');
    expect(mockGet).toHaveBeenCalledTimes(1);

    docRefPrototype.get = originalGet; // Restore original get method
    cleanup();
  });
});