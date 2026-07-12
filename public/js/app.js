// ============================================
// TarjetaDigital — Common Utilities (app.js)
// ============================================

/**
 * API helper — handles auth, errors, and upgrade prompts.
 * @param {string} endpoint - API path (e.g. '/auth/login')
 * @param {object} options  - fetch options (method, body, headers…)
 * @returns {Promise<object>}
 */
async function api(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };
  if (token) config.headers['Authorization'] = 'Bearer ' + token;

  // If body is FormData, let the browser set Content-Type with boundary
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  try {
    const res = await fetch('/api' + endpoint, config);
    const data = await res.json();

    if (res.status === 401) {
      localStorage.clear();
      location.href = '/';
      return;
    }

    if (!res.ok) {
      if (data.upgrade) {
        showUpgradeToast(data.mensaje);
      } else {
        showToast(data.error || (data.errors && data.errors[0] && data.errors[0].msg) || 'Error', 'error');
      }
      return { error: true, ...data };
    }

    return data;
  } catch (e) {
    showToast('Error de conexión', 'error');
    return { error: true };
  }
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'info'|'success'|'error'} type
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

/**
 * Show an upgrade/pro toast.
 * @param {string} message
 */
function showUpgradeToast(message) {
  showToast('🚀 ' + (message || 'Actualiza a Pro para más funciones'), 'info');
}

/**
 * Redirect to login if no token found.
 * @returns {boolean}
 */
function checkAuth() {
  if (!localStorage.getItem('token')) {
    location.href = '/';
    return false;
  }
  return true;
}

/**
 * Clear local storage and redirect to login.
 */
function logout() {
  localStorage.clear();
  location.href = '/';
}

/**
 * Get the current user from localStorage.
 * @returns {object|null}
 */
function getUser() {
  const u = localStorage.getItem('usuario');
  return u ? JSON.parse(u) : null;
}

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
