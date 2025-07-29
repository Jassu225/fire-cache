import { createRequestCache } from "../src/core/index";
import { getCallCountRef, mockFirestore } from "./mock-test-helper";

// --- Tests ---

describe("createRequestCache", () => {
  it("should cache a single document get request", async () => {
    const userDoc = { path: "users/user1", data: { name: "Alice" } };
    const firestore = mockFirestore({ users: [userDoc] });

    // console.log('Testing single document cache...');
    const cleanup = createRequestCache(firestore);

    const docRef = firestore.collection("users").doc("user1");
    getCallCountRef.current = 0;

    // First call (cache miss)
    // console.log('First call (cache miss)');
    const snap1 = await docRef.get();
    expect(snap1.data()).toEqual({ name: "Alice" });

    // Second call (cache hit)
    // console.log("Second call (cache hit)");
    const snap2 = await docRef.get();
    expect(snap2.data()).toEqual({ name: "Alice" });

    expect(getCallCountRef.current).toBe(1); // Should only call the underlying get once

    cleanup();
  });
});
