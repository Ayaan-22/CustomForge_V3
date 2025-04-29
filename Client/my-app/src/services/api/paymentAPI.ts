import { API_URL, handleResponse } from './utils';

export const paymentAPI = {
  createIntent: (amount: number) =>
    fetch(`${API_URL}/payments/create-payment-intent`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    }).then(handleResponse),

  saveMethod: (paymentMethodId: string) =>
    fetch(`${API_URL}/payments/payment-methods`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethodId }),
    }).then(handleResponse),

  getMethods: () =>
    fetch(`${API_URL}/payments/payment-methods`, {
      credentials: 'include',
    }).then(handleResponse),
};
