import express from 'express';
import request from 'supertest';
import { fireCacheMiddleware } from '../src/middleware/express';
import { DocumentReferenceType } from '../src/core/cache';
import { serviceAccount, testCollection } from './test-helper';
import admin from 'firebase-admin';
import { v4 as uuidV4 } from 'uuid';

const shouldRun = !!serviceAccount;

(shouldRun ? describe : describe.skip)('Express Middleware integration with real Firestore', () => {
  let app: express.Express;
  let firestore: admin.firestore.Firestore;
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
    if (admin.apps.length) {
      await admin.app().delete();
    }
  });

  beforeEach(() => {
    app = express();
    app.use(fireCacheMiddleware(firestore));
  });

  it('should cache document gets within a single request', async () => {
    const docRefPrototype = Object.getPrototypeOf(firestore.collection(testCollection).doc(testDocId)) as DocumentReferenceType;
    const originalGet = docRefPrototype.get;
    const mockGet = jest.fn(originalGet);
    docRefPrototype.get = mockGet;

    app.get('/test', async (req, res) => {
      try {
        const docRef = firestore.collection(testCollection).doc(testDocId);
        await docRef.get(); // First call
        await docRef.get(); // Second call (should be cached)
        res.sendStatus(200);
      } catch (error) {
        console.error('Error in /test endpoint:', error);
        res.sendStatus(500);
      }
    });

    await request(app).get('/test').expect(200);
    expect(mockGet).toHaveBeenCalledTimes(1);

    // Cleanup the patched method
    docRefPrototype.get = originalGet;
  });

  it('should not cache across different requests', async () => {
    const docRefPrototype = Object.getPrototypeOf(firestore.collection(testCollection).doc(testDocId)) as DocumentReferenceType;
    const originalGet = docRefPrototype.get;
    const mockGet = jest.fn(originalGet);
    docRefPrototype.get = mockGet;

    app.get('/test', async (req, res) => {
      try {
        const docRef = firestore.collection(testCollection).doc(testDocId);
        await docRef.get();
        res.sendStatus(200);
      } catch (error) {
        console.error('Error in /test endpoint:', error);
        res.sendStatus(500);
      }
    });

    await request(app).get('/test').expect(200);
    await request(app).get('/test').expect(200);

    expect(mockGet).toHaveBeenCalledTimes(2);

    // Cleanup the patched method
    docRefPrototype.get = originalGet;
  });
});