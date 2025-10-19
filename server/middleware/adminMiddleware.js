// File: server/middleware/adminMiddleware.js

import { restrictTo } from "./authMiddleware.js";

// Thin wrappers around the central restrictTo to avoid duplication
export const isAdmin = restrictTo("admin");
export const isPublisher = restrictTo("publisher", "admin");
