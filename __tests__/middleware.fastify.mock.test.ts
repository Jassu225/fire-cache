import { registerHooks } from "../src/middleware/fastify";
import { mockFirestore, getCallCountRef } from "./mock-test-helper";

// Mock Fastify
const mockFastify = () => {
  const hooks: Record<string, Function[]> = {};

  return {
    addHook: (name: string, fn: Function) => {
      if (!hooks[name]) {
        hooks[name] = [];
      }
      hooks[name].push(fn);
    },
    register: async (plugin: Function) => {
      await plugin({
        addHook: (name: string, fn: Function) => (hooks[name] = [fn]),
      });
    },
    hooks,
  };
};

describe("Fastify Middleware", () => {
  it("should cache Firestore reads within a request", async () => {
    const userDoc = { path: "users/user1", data: { name: "Alice" } };
    const firestore = mockFirestore({ users: [userDoc] });
    const fastify = mockFastify();

    // Register the plugin
    registerHooks(fastify as any, firestore);

    // Simulate a request by calling the preHandler hook
    const preHandlerHook = fastify.hooks.preHandler?.[0];
    expect(preHandlerHook).toBeDefined();

    // Mock request and reply objects
    const mockReq = {};
    const mockReply = {};

    // Call the middleware
    await preHandlerHook(mockReq, mockReply);

    // Verify that the cleanup function was stored in the request
    expect((mockReq as any).fireCacheCleanup).toBeDefined();

    // Test the caching behavior
    const docRef = firestore.collection("users").doc("user1");
    getCallCountRef.current = 0;

    // First call (cache miss)
    const snap1 = await docRef.get();
    expect(snap1.data()).toEqual({ name: "Alice" });

    // Second call (cache hit)
    const snap2 = await docRef.get();
    expect(snap2.data()).toEqual({ name: "Alice" });

    expect(getCallCountRef.current).toBe(1); // Should only call the underlying get once
  });
});
