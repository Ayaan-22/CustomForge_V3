import { API_URL, handleResponse } from './utils';

export const cartAPI = {
  get: () => fetch(`${API_URL}/cart`, { credentials: 'include' }).then(handleResponse),

  addItem: (productId: string, quantity: number = 1) =>
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

  removeCoupon: () =>
    fetch(`${API_URL}/cart/coupon`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(handleResponse),

  clear: () =>
    fetch(`${API_URL}/cart`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(handleResponse),
};
