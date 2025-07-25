import Koa from 'koa';
import request from 'supertest';
import { fireCacheMiddleware } from '../src/middleware/koa';
import type { FirestoreInstance, DocumentReferenceType } from '../src/core/cache';
import { serviceAccount, testCollection } from './test-helper';
import admin from 'firebase-admin';
import { v4 as uuidV4 } from 'uuid';

const shouldRun = !!serviceAccount;

(shouldRun ? describe : describe.skip)('Koa Middleware integration with real Firestore', () => {
  let app: Koa;
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
    app = new Koa();
    app.use(fireCacheMiddleware(firestore));
  });

  it('should cache document gets within a single request', async () => {
    const docRefPrototype = Object.getPrototypeOf(firestore.collection(testCollection).doc(testDocId)) as DocumentReferenceType;
    const originalGet = docRefPrototype.get;
    const mockGet = jest.fn(originalGet);
    docRefPrototype.get = mockGet;

    app.use(async (ctx) => {
      try {
        const docRef = firestore.collection(testCollection).doc(testDocId);
        await docRef.get(); // First call
        await docRef.get(); // Second call (should be cached)
        ctx.status = 200;
        ctx.body = 'OK';
      } catch (error) {
        console.error('Error in /test endpoint:', error);
        ctx.status = 500;
        ctx.body = 'Internal Server Error';
      }
    });

    await request(app.callback()).get('/').expect(200);
    expect(mockGet).toHaveBeenCalledTimes(1);

    // Cleanup the patched method
    docRefPrototype.get = originalGet;
  });

  it('should not cache across different requests', async () => {
    const docRefPrototype = Object.getPrototypeOf(firestore.collection(testCollection).doc(testDocId)) as DocumentReferenceType;
    const originalGet = docRefPrototype.get;
    const mockGet = jest.fn(originalGet);
    docRefPrototype.get = mockGet;

    app.use(async (ctx) => {
      try {
        const docRef = firestore.collection(testCollection).doc(testDocId);
        await docRef.get();
        ctx.status = 200;
        ctx.body = 'OK';
      } catch (error) {
        console.error('Error in /test endpoint:', error);
        ctx.status = 500;
        ctx.body = 'Internal Server Error';
      }
    });

    await request(app.callback()).get('/').expect(200);
    await request(app.callback()).get('/').expect(200);
    expect(mockGet).toHaveBeenCalledTimes(2);

    // Cleanup the patched method
    docRefPrototype.get = originalGet;
  });
});