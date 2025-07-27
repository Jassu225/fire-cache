import type {FirestoreInstance } from '../src/core/index';
// --- Mocks ---

// Mock DocumentSnapshot
const mockDocSnapshot = (path: string, data: any) => ({
  id: path.split('/').pop(),
  ref: { path },
  exists: true,
  data: () => data,
});

export const getCallCountRef = {
    current: 0,
};

// Mock DocumentReference using ES6 class so prototype patching works
class MockDocumentReference {
  constructor(public path: string, private data: any) {}
  get() {
    getCallCountRef.current++;
    return Promise.resolve(mockDocSnapshot(this.path, this.data));
  }
}

// Mock QuerySnapshot
const mockQuerySnapshot = (docs: any[]) => ({
  docs,
  empty: docs.length === 0,
});

// Mock Query using ES6 class so prototype patching works
class MockQuery {
  private docs: any[];
  constructor(docs: any[]) {
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
export const mockFirestore = (collections: Record<string, any>) => {
  return {
    collection: (path: string) => {
      const docs = collections[path] || [];
      const query = new MockQuery(docs.map((doc: any) => mockDocSnapshot(doc.path, doc.data)));
      // Add a doc() method to the query instance
      (query as any).doc = (id: string) => {
        const docPath = `${path}/${id}`;
        const docData = collections[path]?.find((d: any) => d.path === docPath);
        return new MockDocumentReference(docPath, docData?.data || {});
      };
      return query;
    },
  } as unknown as FirestoreInstance;
};
