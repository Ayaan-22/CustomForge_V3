import { API_URL, handleResponse } from './utils';

export const adminAPI = {
  getUsers: () =>
    fetch(`${API_URL}/admin/users`, { credentials: 'include' }).then(handleResponse),

  getUserById: (id: string) =>
    fetch(`${API_URL}/admin/users/${id}`, { credentials: 'include' }).then(handleResponse),

  deleteUser: (id: string) =>
    fetch(`${API_URL}/admin/users/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(handleResponse),

  getSalesAnalytics: () =>
    fetch(`${API_URL}/admin/analytics/sales`, { credentials: 'include' }).then(handleResponse),

  getProductStats: () =>
    fetch(`${API_URL}/admin/analytics/products`, { credentials: 'include' }).then(handleResponse),
};
