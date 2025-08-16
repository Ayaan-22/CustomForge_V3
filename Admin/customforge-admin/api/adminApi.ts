// api/adminApi.ts
import axios from "axios";

// ✅ Configure Axios to send cookies
const api = axios.create({
  baseURL: "http://localhost:5000/api/v1", // Replace with your production base URL
  withCredentials: true,
});

/* 🔧 PRODUCT MANAGEMENT */

// Add a new product
export const createProduct = (data: any) => api.post("/products", data);

// Update an existing product
export const updateProduct = (id: string, data: any) => api.patch(`/products/${id}`, data);

// Delete a product
export const deleteProduct = (id: string) => api.delete(`/products/${id}`);

/* 🗣️ REVIEW MODERATION */

// Get all reviews for a product
export const getProductReviews = (productId: string) => api.get(`/products/${productId}/reviews`);

// Delete a review
export const deleteProductReview = (productId: string, reviewId: string) =>
  api.delete(`/products/${productId}/reviews/${reviewId}`);

/* 👥 USER MANAGEMENT */

// List all users
export const getUsers = () => api.get("/admin/users");

// Get a specific user
export const getUserById = (id: string) => api.get(`/admin/users/${id}`);

// Delete a user
export const deleteUser = (id: string) => api.delete(`/admin/users/${id}`);

/* 📈 ANALYTICS */

// Get sales data
export const getSalesAnalytics = () => api.get("/admin/analytics/sales");

// Get product stats
export const getProductStats = () => api.get("/admin/analytics/products");
