import { INestApplication, Controller, Get, Inject } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { FireCacheInterceptor, FIRESTORE_INSTANCE_PROVIDER } from '../src/middleware/nestjs';
import * as cache from '../src/core/cache';
import { getCallCountRef, mockFirestore } from './mock-test-helper';

@Controller('test')
class TestController {
  constructor(@Inject(FIRESTORE_INSTANCE_PROVIDER) private readonly firestoreInstance: cache.FirestoreInstance) {}

  @Get('cache-document')
  async cacheDocument() {
    const docRef = this.firestoreInstance.collection('users').doc('user1');
    await docRef.get(); // First call
    await docRef.get(); // Second call (should be cached)
    return 'OK';
  }

  @Get('no-cache-across-requests')
  async noCacheAcrossRequests() {
    const docRef = this.firestoreInstance.collection('users').doc('user1');
    await docRef.get();
    return 'OK';
  }
}

describe('NestJS Middleware', () => {
  let app: INestApplication;
  let firestore: cache.FirestoreInstance;

  beforeEach(async () => {
    const userDoc = { path: 'users/user1', data: { name: 'Alice' } };
    firestore = mockFirestore({ users: [userDoc] });
    getCallCountRef.current = 0;

    const moduleRef = await Test.createTestingModule({
      controllers: [TestController],
      providers: [
        {
          provide: FIRESTORE_INSTANCE_PROVIDER,
          useValue: firestore,
        },
        {
          provide: 'APP_INTERCEPTOR',
          useFactory: (firestoreInstance: cache.FirestoreInstance) => new (FireCacheInterceptor(firestoreInstance))(),
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

  it('should cache document gets within a single request', async () => {
    await request(app.getHttpServer())
      .get('/test/cache-document')
      .expect(200);
    expect(getCallCountRef.current).toBe(1);
  });

  it('should not cache across different requests', async () => {
    await request(app.getHttpServer())
      .get('/test/no-cache-across-requests')
      .expect(200);
    await request(app.getHttpServer())
      .get('/test/no-cache-across-requests')
      .expect(200);
    expect(getCallCountRef.current).toBe(2);
  });
});