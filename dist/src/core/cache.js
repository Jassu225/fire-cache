"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequestCache = createRequestCache;
// A type guard to check if the firestore instance is from firebase-admin
// function isAdminFirestore(db: FirestoreInstance): db is adminFirestore.Firestore {
//     // firebase-admin's Firestore class has a `app` property.
//     return 'app' in db;
// }
/**
 * Creates a request-scoped cache and patches the `get` methods of the provided
 * Firestore instance to use the cache.
 *
 * @param firestore The Firestore instance to patch.
 * @returns A function to clean up the patch and clear the cache.
 */
function createRequestCache(firestore) {
    const cache = new Map();
    // Get the prototypes of DocumentReference and Query.
    const docRefPrototype = Object.getPrototypeOf(firestore.collection('__dummy__').doc('__dummy__'));
    // Use a real Query instance for prototype patching
    const queryPrototype = Object.getPrototypeOf(firestore.collection('__dummy__').where('__dummy__', '==', '__dummy__'));
    // Save the original `get` methods.
    const originalDocGetDesc = Object.getOwnPropertyDescriptor(docRefPrototype, 'get');
    const originalQueryGetDesc = Object.getOwnPropertyDescriptor(queryPrototype, 'get');
    const originalDocGet = originalDocGetDesc?.value;
    const originalQueryGet = originalQueryGetDesc?.value;
    if (!originalDocGet) {
        throw new Error('Original DocumentReference get method is undefined');
    }
    if (!originalQueryGet) {
        throw new Error('Original Query get method is undefined');
    }
    // === Patch DocumentReference.get() ===
    docRefPrototype.get = function () {
        const key = this.path;
        if (cache.has(key)) {
            // We use a non-null assertion (!) because the `if` check guarantees the key exists.
            return cache.get(key);
        }
        if (!originalDocGet) {
            throw new Error('Original get method is undefined');
        }
        const promise = originalDocGet.apply(this);
        cache.set(key, promise);
        return promise;
    };
    // === Patch Query.get() ===
    queryPrototype.get = async function () {
        // Execute the original query to get the fresh QuerySnapshot.
        const querySnapshot = (await originalQueryGet.apply(this));
        // Unconditionally cache each individual document from the result to ensure freshness.
        for (const doc of querySnapshot.docs) {
            const key = doc.ref.path;
            cache.set(key, Promise.resolve(doc));
        }
        // Return the original, fresh QuerySnapshot.
        return querySnapshot;
    };
    // Return a cleanup function to be called at the end of the request.
    return () => {
        docRefPrototype.get = originalDocGet;
        queryPrototype.get = originalQueryGet;
        cache.clear();
    };
}
