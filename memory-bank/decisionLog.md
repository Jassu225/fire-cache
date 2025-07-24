# Decision Log

This file records architectural and implementation decisions using a list format.
2025-07-23 11:13:47 - Log of updates made.

*

## Decision

*

## Rationale 

*

## Implementation Details

*
[2025-07-23 11:29:33] - Decided on API Design

## Decision

*   The `fire-cache` library will use a "monkey-patching" approach to intercept Firestore `get()` calls.

## Rationale

*   This approach was chosen for maximum ease of use and adoption. It requires zero code changes in the user's application logic, making it extremely simple to integrate. The trade-off in terms of potential fragility was deemed acceptable for the significant improvement in developer experience.

## Implementation Details

*   A middleware will be responsible for patching the `get` methods on the `DocumentReference` and `Query` prototypes of the Firestore instance for the duration of a single request.
*   A request-scoped cache (e.g., a `Map`) will be used to store results.
*   The original `get` methods will be restored at the end of the request to ensure no side effects.
[2025-07-23 11:37:14] - CORRECTED: Supported Firestore SDKs

## Decision

*   `fire-cache` will support both the standalone Google Cloud Firestore SDK (`@google-cloud/firestore`) and the Firestore service from the Firebase Admin SDK (`firebase-admin`).

## Rationale

*   Both of these SDKs are used in server-side Node.js environments. Supporting both provides flexibility for developers, whether they are using Firebase services monolithically (via `firebase-admin`) or using Firestore as a standalone database (via `@google-cloud/firestore`). This correction from the previously considered client SDK (`firebase/firestore`) is critical for a server-side library.

## Implementation Details

*   The core caching logic will need to handle the `Firestore` instances from both packages.
*   The monkey-patching mechanism must inspect the provided `Firestore` instance to determine its origin (`@google-cloud/firestore` or `firebase-admin`) and apply the correct patches to its prototypes. The APIs are very similar, which should simplify this process.
[2025-07-23 11:51:03] - Refined Caching Strategy: Document-Level Only

## Decision

*   The caching strategy has been changed. Instead of caching the entire result of a `Query.get()` call, `fire-cache` will now only cache the individual `DocumentSnapshot` objects returned from both `DocumentReference.get()` and `Query.get()`.

## Rationale

*   Caching entire query results is brittle and can easily lead to stale data if any document within that query's result set changes. By caching only the individual documents, we ensure that `DocumentReference.get()` calls are always fast, while `Query.get()` calls always fetch the latest list of documents from Firestore, preventing staleness. The documents *within* the fresh query result will then be populated from the cache if they exist, providing a good balance of performance and data consistency.

## Implementation Details

*   The patch for `DocumentReference.get()` will remain largely the same.
*   The patch for `Query.get()` will be significantly changed. It will no longer cache the `QuerySnapshot` promise. Instead, it will await the `QuerySnapshot`, iterate through its `.docs` array, and populate the request-level cache with each individual `DocumentSnapshot`, keyed by its `path`. The original, unmodified `QuerySnapshot` will then be returned to the caller.
[2025-07-23 11:55:17] - Final Refinement to Caching Strategy: Overwrite on Query

## Decision

*   The caching strategy for `Query.get()` has been refined. When a query is executed, the documents it returns will now **overwrite** any existing entries for those same documents in the request-level cache.

## Rationale

*   This ensures maximum data freshness within the request. If a `DocumentReference.get()` is called, and then later a `Query.get()` retrieves a newer version of that same document, any subsequent calls to `DocumentReference.get()` for that document will receive the latest version from the query. This prevents stale reads within the same request and represents the most robust caching model.

## Implementation Details

*   The implementation of the `Query.get()` patch will be modified to unconditionally use `cache.set()` for each document returned by the query, removing the previous `if (!cache.has(key))` check.
[2025-07-23 12:01:38] - Refined Caching Strategy: Strongly-Typed DocumentSnapshots

## Decision

*   The cache will store the full `DocumentSnapshot` object to maintain 100% API compatibility with the underlying Firestore SDKs.
*   To improve type safety, the cache and related functions will be strongly typed. Unified types for `DocumentData`, `DocumentSnapshot`, and `QuerySnapshot` will be created to represent the objects from both the `@google-cloud/firestore` and `firebase-admin` SDKs.

## Rationale

*   Storing only `DocumentData` is not feasible as it would prevent the library from returning a valid `DocumentSnapshot` on a cache hit, breaking the SDK's API contract.
*   By caching the full snapshot and introducing unified types, we achieve the user's goal of strong type safety throughout the library while ensuring it remains a transparent, non-breaking wrapper.

## Implementation Details

*   Create `DocumentDataType`, `DocumentSnapshotType`, and `QuerySnapshotType` as union types.
*   The request-level cache will be typed as `Map<string, Promise<DocumentSnapshotType>>`.
*   The `createRequestCache` function and all patched methods will be updated to use these new, stricter types.