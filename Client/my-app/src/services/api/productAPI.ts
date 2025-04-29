import { API_URL, handleResponse } from "./utils";

export const productAPI = {
  // Public APIs
  getAll: () => fetch(`${API_URL}/products`).then(handleResponse),

  getTop: () => fetch(`${API_URL}/products/top`).then(handleResponse),

  search: (query: string) =>
    fetch(`${API_URL}/products/search?keyword=${query}`).then(handleResponse),

  getById: (id: string) =>
    fetch(`${API_URL}/products/${id}`).then(handleResponse),

  getRelated: (id: string) =>
    fetch(`${API_URL}/products/${id}/related`).then(handleResponse),

  getCategories: () =>
    fetch(`${API_URL}/products/categories`).then(handleResponse),

  getFeatured: () =>
    fetch(`${API_URL}/products/featured`).then(handleResponse),

  getByCategory: (category: string) =>
    fetch(`${API_URL}/products/category/${category}`).then(handleResponse),

  // Protected APIs
  createReview: (productId: string, review: any) =>
    fetch(`${API_URL}/products/${productId}/reviews`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(review),
    }).then(handleResponse),

  addToWishlist: (id: string) =>
    fetch(`${API_URL}/products/${id}/wishlist`, {
      method: "POST",
      credentials: "include",
    }).then(handleResponse),

  removeFromWishlist: (id: string) =>
    fetch(`${API_URL}/products/${id}/wishlist`, {
      method: "DELETE",
      credentials: "include",
    }).then(handleResponse),

  getWishlist: () =>
    fetch(`${API_URL}/products/wishlist`, {
      credentials: "include",
    }).then(handleResponse),

  // Admin APIs
  create: (data: FormData) =>
    fetch(`${API_URL}/products`, {
      method: "POST",
      credentials: "include",
      body: data,
    }).then(handleResponse),

  update: (id: string, data: FormData) =>
    fetch(`${API_URL}/products/${id}`, {
      method: "PATCH",
      credentials: "include",
      body: data,
    }).then(handleResponse),

  delete: (id: string) =>
    fetch(`${API_URL}/products/${id}`, {
      method: "DELETE",
      credentials: "include",
    }).then(handleResponse),

  // Admin-specific functions for managing reviews
  getProductReviews: (id: string) =>
    fetch(`${API_URL}/products/${id}/reviews`).then(handleResponse),

  deleteProductReview: (productId: string, reviewId: string) =>
    fetch(`${API_URL}/products/${productId}/reviews/${reviewId}`, {
      method: "DELETE",
      credentials: "include",
    }).then(handleResponse),
};
