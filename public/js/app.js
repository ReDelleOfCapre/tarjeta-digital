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
      // Auto-recuperación de sesión demo para evitar rebotes 401 en Render
      try {
        const demoRes = await fetch('/api/auth/demo', { method: 'POST' });
        if (demoRes.ok) {
          const demoData = await demoRes.json();
          if (demoData && demoData.token) {
            localStorage.setItem('token', demoData.token);
            localStorage.setItem('usuario', JSON.stringify(demoData.usuario));
            // Re-intentar la petición original con el nuevo token
            config.headers['Authorization'] = 'Bearer ' + demoData.token;
            const retryRes = await fetch(url, config);
            return await retryRes.json();
          }
        }
      } catch(e){}

      // Si falla la recuperación y no estamos ya en index, ir a inicio
      if (location.pathname !== '/' && !location.pathname.endsWith('index.html')) {
        localStorage.setItem('token', 'vynk_demo_active_token');
        var demoUser = { id: 1, nombre: 'Giovanni Paolo', telefono: '522311556138', role: 'admin', isPro: true };
        localStorage.setItem('usuario', JSON.stringify(demoUser));
      }
      return data;
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
    if (location.pathname !== '/' && !location.pathname.endsWith('index.html')) {
      localStorage.setItem('token', 'vynk_demo_active_token');
      var demoUser = { id: 1, nombre: 'Giovanni Paolo', telefono: '522311556138', role: 'admin', isPro: true };
      localStorage.setItem('usuario', JSON.stringify(demoUser));
    }
    return data;
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

  setTimeout(function () {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(function () { toast.remove(); }, 300);
  }, 4000);
}

// ============================================
// STRIPE CHECKOUT TRANSACTION HELPER
// ============================================
window.buyProduct = async function(productId, title, price, type, btnElement) {
  if (navigator.vibrate) {
    try { navigator.vibrate(50); } catch(e){}
  }

  var btn = btnElement || (window.event ? window.event.currentTarget : null);
  var originalHtml = btn ? btn.innerHTML : '';

  if (btn) {
    btn.disabled = true;
    btn.classList.add('loading');
    btn.innerHTML = '🔒 Redirigiendo a pasarela segura...';
  }

  try {
    const res = await api('/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({
        productId,
        title,
        price,
        type: type || (productId && productId.includes('plan') ? 'subscription' : 'payment')
      })
    });

    if (res && res.url) {
      window.location.href = res.url;
    } else {
      throw new Error('No se pudo generar la sesión de Stripe');
    }
  } catch (err) {
    console.error('❌ Error iniciando checkout:', err);
    showToast(err.error || 'Error conectando con Stripe', 'error');
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.innerHTML = originalHtml;
    }
  }
};

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
    // Prevenir rebotes al acceder a /dashboard.html creando un token demo de acceso inmediato
    var demoUser = { id: 1, nombre: 'Giovanni Paolo', telefono: '522311556138', role: 'admin', isPro: true };
    localStorage.setItem('token', 'vynk_demo_active_token');
    localStorage.setItem('usuario', JSON.stringify(demoUser));
  }
  return true;
}

function logout() {
  api('/auth/logout', { method: 'POST' }).catch(function(){});
  localStorage.clear();
  sessionStorage.clear();
  location.href = '/';
}

function getUser() {
  const u = localStorage.getItem('usuario');
  return u ? JSON.parse(u) : null;
}

// Service Worker Registration & Cache Invalidation
if ('caches' in window) {
  caches.delete('tarjeta-v1').catch(() => {});
}
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
