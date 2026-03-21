window.API_URL = window.API_URL || window.location.origin;

function readCookie(name) {
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  const prefix = `${name}=`;
  const entry = cookies.find(c => c.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
}

function withCsrfHeaders(options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return options;
  }

  const csrfToken = readCookie('csrf_token');
  if (!csrfToken) {
    return options;
  }

  return {
    ...options,
    headers: {
      ...(options.headers || {}),
      'x-csrf-token': csrfToken,
    },
  };
}

window.API = {
  async request(path, options = {}) {
    const requestOptions = withCsrfHeaders(options);
    const res = await fetch(`${window.API_URL}${path}`, {
      credentials: 'include',
      ...requestOptions,
    });
    if (!res.ok) {throw new Error(`HTTP ${res.status}`);}
    return res.json();
  },

  post(path, body = null) {
    const opts = { method: 'POST' };
    if (body !== null) {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body);
    }
    return this.request(path, opts);
  },

  put(path, body) {
    return this.request(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  delete(path) {
    return this.request(path, { method: 'DELETE' });
  },

  async upload(formData) {
    const csrfToken = readCookie('csrf_token');
    const res = await fetch(`${window.API_URL}/api/upload`, {
      method: 'POST',
      credentials: 'include',
      headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
      body: formData,
    });
    if (!res.ok) {throw new Error('Upload failed');}
    return res.json();
  },
};
