import { API_URL, handleResponse } from './utils';

export const authAPI = {
  register: (data: { name: string; email: string; password: string }) =>
    fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  login: (credentials: { email: string; password: string }) =>
    fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    }).then(handleResponse),

  logout: () =>
    fetch(`${API_URL}/auth/logout`, {
      credentials: 'include',
    }).then(handleResponse),

  forgotPassword: (email: string) =>
    fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then(handleResponse),

  resetPassword: (token: string, password: string) =>
    fetch(`${API_URL}/auth/reset-password/${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }).then(handleResponse),

  updatePassword: (currentPassword: string, newPassword: string) =>
    fetch(`${API_URL}/auth/update-password`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    }).then(handleResponse),

  verifyEmail: (token: string) =>
    fetch(`${API_URL}/auth/verify-email/${token}`, {
      credentials: 'include',
    }).then(handleResponse),
};
