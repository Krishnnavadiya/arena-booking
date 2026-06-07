// Tiny fetch wrapper: prefixes /api, attaches the JWT, throws on non-2xx.

// Base URL of the API. Empty in dev (Vite proxies /api); set VITE_API_URL in prod.
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const TOKEN_KEY = 'arena.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export async function api(path, options = {}) {
  const { auth = true, headers, body, ...rest } = options;

  const finalHeaders = { ...(headers || {}) };
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';

  const token = tokenStore.get();
  if (auth && token) finalHeaders.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Parse JSON when present; tolerate empty/non-JSON bodies.
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const error = new Error((data && data.error) || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }

  return data;
}
