// Same-origin '/api' by default (backend serves the built frontend in one deploy).
// Override with VITE_API_BASE for a split frontend/backend setup.
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(method, path, data = null, isAdmin = false) {
  const tokenKey = isAdmin ? 'avtpp_admin_token' : 'avtpp_token';
  const token = localStorage.getItem(tokenKey);

  const config = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  if (data) {
    config.body = JSON.stringify(data);
  }

  const res = await fetch(`${API_BASE}${path}`, config);
  
  // Handle CSV downloads
  if (res.headers.get('content-type')?.includes('text/csv')) {
    const blob = await res.blob();
    return { data: blob, ok: true };
  }

  const json = await res.json();

  if (!res.ok) {
    throw { status: res.status, message: json.error || 'Request failed', data: json };
  }

  return { data: json, status: res.status, ok: true };
}

// Simulated toll-gate device call. Authenticates with the shared gate key
// (x-gate-key) instead of a user session — it emulates the roadside
// identification device described in the report (§1.6.2), not a logged-in user.
async function gateTrigger(data) {
  const res = await fetch(`${API_BASE}/toll/gate-trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gate-key': import.meta.env.VITE_GATE_KEY || '',
    },
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) {
    throw { status: res.status, message: json.error || 'Request failed', data: json };
  }
  return { data: json, status: res.status, ok: true };
}

const api = {
  get: (path, isAdmin) => request('GET', path, null, isAdmin),
  post: (path, data, isAdmin) => request('POST', path, data, isAdmin),
  put: (path, data, isAdmin) => request('PUT', path, data, isAdmin),
  delete: (path, isAdmin) => request('DELETE', path, null, isAdmin),
  gateTrigger,
};

export default api;
