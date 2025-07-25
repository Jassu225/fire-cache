import express from 'express';
import request from 'supertest';
import { fireCacheMiddleware } from '../src/middleware/express';
import type { FirestoreInstance } from '../src/core/cache';
import { getCallCountRef, mockFirestore } from './mock-test-helper';


// --- Tests ---

describe('Express Middleware', () => {
  let app: express.Express;
  let firestore: FirestoreInstance;

  beforeEach(() => {
    app = express();
    const userDoc = { path: 'users/user1', data: { name: 'Alice' } };
    firestore = mockFirestore({users: [userDoc]});
    app.use(fireCacheMiddleware(firestore));
    getCallCountRef.current = 0;
  });

  it('should cache document gets within a single request', async () => {
    app.get('/test', async (req, res) => {
      try {
        const docRef = firestore.collection('users').doc('user1');
        await docRef.get(); // First call
        await docRef.get(); // Second call (should be cached)
        res.sendStatus(200);
      } catch (error) {
        console.error('Error in /test endpoint:', error);
        res.sendStatus(500);
      }
    });

    await request(app).get('/test').expect(200);
    expect(getCallCountRef.current).toBe(1); // Should only call the underlying get once
  });

  it('should not cache across different requests', async () => {
    app.get('/test', async (req, res) => {
      try {
        const docRef = firestore.collection('users').doc('user1');
        await docRef.get();
        res.sendStatus(200);
      } catch (error) {
        console.error('Error in /test endpoint:', error);
        res.sendStatus(500);
      }
    });

    await request(app).get('/test').expect(200);
    await request(app).get('/test').expect(200);

    expect(getCallCountRef.current).toBe(2);
  });
});