"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockFirestore = exports.getCallCountRef = void 0;
// --- Mocks ---
// Mock DocumentSnapshot
const mockDocSnapshot = (path, data) => ({
    id: path.split('/').pop(),
    ref: { path },
    exists: true,
    data: () => data,
});
exports.getCallCountRef = {
    current: 0,
};
// Mock DocumentReference using ES6 class so prototype patching works
class MockDocumentReference {
    path;
    data;
    constructor(path, data) {
        this.path = path;
        this.data = data;
    }
    get() {
        exports.getCallCountRef.current++;
        return Promise.resolve(mockDocSnapshot(this.path, this.data));
    }
}
// Mock QuerySnapshot
const mockQuerySnapshot = (docs) => ({
    docs,
    empty: docs.length === 0,
});
// Mock Query using ES6 class so prototype patching works
class MockQuery {
    docs;
    constructor(docs) {
        this.docs = docs;
    }
    get() {
        return Promise.resolve(mockQuerySnapshot(this.docs));
    }
    where() {
        // For the purpose of these tests, a simple return of 'this' is sufficient
        // to allow method chaining like .where().get()
        return this;
    }
    _query = { path: 'test-collection' };
}
// Mock Firestore instance using the class-based DocumentReference and Query
const mockFirestore = (collections) => {
    return {
        collection: (path) => {
            const docs = collections[path] || [];
            const query = new MockQuery(docs.map((doc) => mockDocSnapshot(doc.path, doc.data)));
            // Add a doc() method to the query instance
            query.doc = (id) => {
                const docPath = `${path}/${id}`;
                const docData = collections[path]?.find((d) => d.path === docPath);
                return new MockDocumentReference(docPath, docData?.data || {});
            };
            return query;
        },
    };
};
exports.mockFirestore = mockFirestore;
