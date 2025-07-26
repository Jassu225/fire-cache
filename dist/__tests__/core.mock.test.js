"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("../src/core/cache");
const mock_test_helper_1 = require("./mock-test-helper");
// --- Tests ---
describe('createRequestCache', () => {
    it('should cache a single document get request', async () => {
        const userDoc = { path: 'users/user1', data: { name: 'Alice' } };
        const firestore = (0, mock_test_helper_1.mockFirestore)({ users: [userDoc] });
        console.log('Testing single document cache...');
        const cleanup = (0, cache_1.createRequestCache)(firestore);
        const docRef = firestore.collection('users').doc('user1');
        mock_test_helper_1.getCallCountRef.current = 0;
        // First call (cache miss)
        console.log('First call (cache miss)');
        const snap1 = await docRef.get();
        expect(snap1.data()).toEqual({ name: 'Alice' });
        // Second call (cache hit)
        console.log('Second call (cache hit)');
        const snap2 = await docRef.get();
        expect(snap2.data()).toEqual({ name: 'Alice' });
        expect(mock_test_helper_1.getCallCountRef.current).toBe(1); // Should only call the underlying get once
        cleanup();
    });
});
