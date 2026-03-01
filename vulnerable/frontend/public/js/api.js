window.API_URL = window.API_URL || window.location.origin;

window.API = {
  async request(path, options = {}) {
    const res = await fetch(`${window.API_URL}${path}`, {
      credentials: 'include',
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
    const res = await fetch(`${window.API_URL}/api/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },
};
