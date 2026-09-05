const BASE_URL = '/api/v1';

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('admin_access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('admin_access_token');
    // Don't reload immediately if we are already on login or just loaded to avoid infinite loops
    if (token) {
      window.location.reload();
    }
    throw new Error('Sessiya muddati tugadi, qaytadan kiring.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || 'Xatolik yuz berdi');
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

