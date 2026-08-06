// ============================================
// My ID — Common Utilities (app.js)
// ============================================

/**
 * API helper with auth, errors, upgrade prompts.
 * Can be called as api('/endpoint', opts) or apiFetch('/api/endpoint', opts)
 */
async function api(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const isFormData = options.body instanceof FormData;
  const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
  if (options.headers) Object.assign(headers, options.headers);
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (isFormData) delete headers['Content-Type'];

  const config = { ...options, headers };

  try {
    const url = endpoint.startsWith('/api') ? endpoint : '/api' + endpoint;
    const res = await fetch(url, config);
    const data = await res.json();

    if (res.status === 401) {
      localStorage.clear();
      location.href = '/';
      return;
    }

    if (!res.ok) {
      if (data.upgrade) {
        showUpgradeToast(data.mensaje);
      }
      throw data;
    }

    return data;
  } catch (e) {
    if (e && e.error) throw e;
    showToast('Error de conexión', 'error');
    throw { error: 'Error de conexión' };
  }
}

// Alias for direct URL calls
async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  const config = { ...options };
  if (!config.headers) config.headers = {};
  if (token) config.headers['Authorization'] = 'Bearer ' + token;
  if (config.body && typeof config.body === 'string' && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, config);
  const data = await res.json();

  if (res.status === 401) {
    localStorage.clear();
    location.href = '/';
    return;
  }

  if (!res.ok) throw data;
  return data;
}

/**
 * Show a toast notification.
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showUpgradeToast(message) {
  const container = document.getElementById('toast-container');
  if (container) {
    showToast('⚡ ' + (message || 'Actualiza a Pro para más funciones'), 'error');
  } else {
    alert('⚡ ' + (message || 'Actualiza a Pro para más funciones'));
  }
}

function checkAuth() {
  if (!localStorage.getItem('token')) {
    location.href = '/';
    return false;
  }
  return true;
}

function logout() {
  localStorage.clear();
  location.href = '/';
}

function getUser() {
  const u = localStorage.getItem('usuario');
  return u ? JSON.parse(u) : null;
}

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
