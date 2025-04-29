import { API_URL, handleResponse } from './utils';

export const userAPI = {
  getMe: () =>
    fetch(`${API_URL}/users/me`, { credentials: 'include' }).then(handleResponse),

  updateMe: (userData: any) =>
    fetch(`${API_URL}/users/update-me`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    }).then(handleResponse),

  deleteMe: () =>
    fetch(`${API_URL}/users/delete-me`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(handleResponse),

  getWishlist: () =>
    fetch(`${API_URL}/users/wishlist`, { credentials: 'include' }).then(handleResponse),

  getOrders: () =>
    fetch(`${API_URL}/users/orders`, { credentials: 'include' }).then(handleResponse),

  getAllUsers: () =>
    fetch(`${API_URL}/users`, { credentials: 'include' }).then(handleResponse),

  getUser: (id: string) =>
    fetch(`${API_URL}/users/${id}`, { credentials: 'include' }).then(handleResponse),

  updateUser: (id: string, data: any) =>
    fetch(`${API_URL}/users/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  deleteUser: (id: string) =>
    fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(handleResponse),
};
