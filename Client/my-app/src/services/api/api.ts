const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const handleResponse = async (res: Response) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

export const api = {
  auth: {
    register: (data: { name: string; email: string; password: string }) =>
      fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(handleResponse),

    login: (data: { email: string; password: string }) =>
      fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(handleResponse),

    logout: () =>
      fetch(`${API_URL}/auth/logout`, {
        credentials: 'include',
      }).then(handleResponse),
  },

  products: {
    getAll: () => fetch(`${API_URL}/products`).then(handleResponse),
    getById: (id: string) => fetch(`${API_URL}/products/${id}`).then(handleResponse),
    search: (q: string) => fetch(`${API_URL}/products/search?keyword=${q}`).then(handleResponse),
    getTop: () => fetch(`${API_URL}/products/top`).then(handleResponse),
    getRelated: (id: string) => fetch(`${API_URL}/products/${id}/related`).then(handleResponse),
  },

  cart: {
    get: () => fetch(`${API_URL}/cart`, { credentials: 'include' }).then(handleResponse),
    addItem: (productId: string, quantity: number) =>
      fetch(`${API_URL}/cart`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      }).then(handleResponse),
    updateItem: (productId: string, quantity: number) =>
      fetch(`${API_URL}/cart/${productId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      }).then(handleResponse),
    removeItem: (productId: string) =>
      fetch(`${API_URL}/cart/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      }).then(handleResponse),
    applyCoupon: (code: string) =>
      fetch(`${API_URL}/cart/coupon`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      }).then(handleResponse),
    clear: () => fetch(`${API_URL}/cart`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(handleResponse)
  },

  orders: {
    getMy: () => fetch(`${API_URL}/orders`, { credentials: 'include' }).then(handleResponse),
    getById: (id: string) => fetch(`${API_URL}/orders/${id}`, { credentials: 'include' }).then(handleResponse),
    create: (data: any) =>
      fetch(`${API_URL}/orders`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(handleResponse),
    cancel: (id: string) =>
      fetch(`${API_URL}/orders/${id}/cancel`, {
        method: 'PUT',
        credentials: 'include',
      }).then(handleResponse),
  },

  user: {
    getMe: () => fetch(`${API_URL}/users/me`, { credentials: 'include' }).then(handleResponse),
    updateMe: (data: any) =>
      fetch(`${API_URL}/users/update-me`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(handleResponse),
    getWishlist: () => fetch(`${API_URL}/users/wishlist`, { credentials: 'include' }).then(handleResponse),
    getOrders: () => fetch(`${API_URL}/users/orders`, { credentials: 'include' }).then(handleResponse),
  },

  admin: {
    getUsers: () => fetch(`${API_URL}/admin/users`, { credentials: 'include' }).then(handleResponse),
    deleteUser: (id: string) =>
      fetch(`${API_URL}/admin/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      }).then(handleResponse),
    getSalesAnalytics: () =>
      fetch(`${API_URL}/admin/analytics/sales`, { credentials: 'include' }).then(handleResponse),
    getProductStats: () =>
      fetch(`${API_URL}/admin/analytics/products`, { credentials: 'include' }).then(handleResponse),
  },

  payment: {
    createIntent: (amount: number) =>
      fetch(`${API_URL}/payments/create-payment-intent`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      }).then(handleResponse),
    getMethods: () => fetch(`${API_URL}/payments/payment-methods`, {
      credentials: 'include',
    }).then(handleResponse),
  }
};
