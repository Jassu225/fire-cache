import Koa from 'koa';
import request from 'supertest';
import { fireCacheMiddleware } from '../src/middleware/koa';
import { FirestoreInstance } from '../src/core/cache';
import { getCallCountRef, mockFirestore } from './mock-test-helper';

describe('Koa Middleware', () => {
  let app: Koa;
  let firestore: FirestoreInstance;

  beforeEach(() => {
    app = new Koa();
    const userDoc = { path: 'users/user1', data: { name: 'Alice' } };
    firestore = mockFirestore({ users: [userDoc] });
    app.use(fireCacheMiddleware(firestore));
    getCallCountRef.current = 0;
  });

  it('should cache document gets within a single request', async () => {
    app.use(async (ctx) => {
      const docRef = firestore.collection('users').doc('user1');
      await docRef.get(); // First call
      await docRef.get(); // Second call (should be cached)
      ctx.status = 200;
      ctx.body = 'OK';
    });

    await request(app.callback()).get('/').expect(200);
    expect(getCallCountRef.current).toBe(1);
  });

  it('should not cache across different requests', async () => {
    app.use(async (ctx) => {
      const docRef = firestore.collection('users').doc('user1');
      await docRef.get();
      ctx.status = 200;
      ctx.body = 'OK';
    });

    await request(app.callback()).get('/').expect(200);
    await request(app.callback()).get('/').expect(200);
    expect(getCallCountRef.current).toBe(2);
  });
});