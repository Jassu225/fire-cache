# Product Context

This file provides a high-level overview of the project and the expected product that will be created. Initially it is based upon projectBrief.md (if provided) and all other available project-related information in the working directory. This file is intended to be updated as the project evolves, and should be used to inform all other modes of the project's goals and context.
2025-07-23 11:12:46 - Log of updates made will be appended as footnotes to the end of this file.

*

## Project Goal

*   Create a performant and easy-to-use caching layer for Firestore on the server-side, reducing redundant database queries and improving application response times.

## Key Features

*   Request-level caching of Firestore documents.
*   Automatic cache invalidation at the end of each request.
*   Middleware-based integration with popular Node.js frameworks (Express.js, NestJS, Koa.js).
*   Written in TypeScript and published as an ES module npm package.
*   Wrapper around the `@google-cloud/firestore` package.

## Overall Architecture

*   The core `fire-cache` library will expose a class or factory function to initialize the cache.
*   It will provide middleware functions for different frameworks.
*   The cache itself will likely be a `Map` or a similar in-memory data structure, scoped to each incoming HTTP request.
*   The library will intercept Firestore `get` calls to check the cache before hitting the database.