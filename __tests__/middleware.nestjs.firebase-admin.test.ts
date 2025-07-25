import { INestApplication, Controller, Get, Inject } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { FireCacheInterceptor, FIRESTORE_INSTANCE_PROVIDER } from '../src/middleware/nestjs';
import type { FirestoreInstance, DocumentReferenceType } from '../src/core/cache'; // Changed to import type
import { serviceAccount, testCollection } from './test-helper';
import admin from 'firebase-admin';
import { v4 as uuidV4 } from 'uuid';

const shouldRun = !!serviceAccount;

(shouldRun ? describe : describe.skip)('NestJS Middleware integration with real Firestore', () => {
  let app: INestApplication;
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

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TestController],
      providers: [
        {
          provide: FIRESTORE_INSTANCE_PROVIDER,
          useValue: firestore,
        },
        {
          provide: 'APP_INTERCEPTOR',
          useFactory: (firestoreInstance: FirestoreInstance) => new (FireCacheInterceptor(firestoreInstance))(),
          inject: [FIRESTORE_INSTANCE_PROVIDER],
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  @Controller('test')
  class TestController {
    constructor(@Inject(FIRESTORE_INSTANCE_PROVIDER) private readonly firestoreInstance: FirestoreInstance) {}

    @Get('cache-document')
    async cacheDocument() {
      const docRef = this.firestoreInstance.collection(testCollection).doc(testDocId);
      await docRef.get(); // First call
      await docRef.get(); // Second call (should be cached)
      return 'OK';
    }

    @Get('no-cache-across-requests')
    async noCacheAcrossRequests() {
      const docRef = this.firestoreInstance.collection(testCollection).doc(testDocId);
      await docRef.get();
      return 'OK';
    }
  }

  it('should cache document gets within a single request', async () => {
    const docRefPrototype = Object.getPrototypeOf(firestore.collection(testCollection).doc(testDocId)) as DocumentReferenceType;
    const originalGet = docRefPrototype.get;
    const mockGet = jest.fn(originalGet);
    docRefPrototype.get = mockGet;

    await request(app.getHttpServer())
      .get('/test/cache-document')
      .expect(200);
    expect(mockGet).toHaveBeenCalledTimes(1);

    // Cleanup the patched method
    docRefPrototype.get = originalGet;
  });

  it('should not cache across different requests', async () => {
    const docRefPrototype = Object.getPrototypeOf(firestore.collection(testCollection).doc(testDocId)) as DocumentReferenceType;
    const originalGet = docRefPrototype.get;
    const mockGet = jest.fn(originalGet);
    docRefPrototype.get = mockGet;

    await request(app.getHttpServer())
      .get('/test/no-cache-across-requests')
      .expect(200);
    await request(app.getHttpServer())
      .get('/test/no-cache-across-requests')
      .expect(200);
    expect(mockGet).toHaveBeenCalledTimes(2);

    // Cleanup the patched method
    docRefPrototype.get = originalGet;
  });
});