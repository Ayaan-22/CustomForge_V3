import { API_URL, handleResponse } from './utils';

export const orderAPI = {
  create: (orderData: any) =>
    fetch(`${API_URL}/orders`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    }).then(handleResponse),

  getMyOrders: () =>
    fetch(`${API_URL}/orders`, { credentials: 'include' }).then(handleResponse),

  getById: (id: string) =>
    fetch(`${API_URL}/orders/${id}`, { credentials: 'include' }).then(handleResponse),

  cancel: (id: string) =>
    fetch(`${API_URL}/orders/${id}/cancel`, {
      method: 'PUT',
      credentials: 'include',
    }).then(handleResponse),

  returnRequest: (id: string, reason: string) =>
    fetch(`${API_URL}/orders/${id}/return`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    }).then(handleResponse),
};
