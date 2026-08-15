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
      // Auto-recuperación de sesión demo SOLO si el modo demo está activo.
      // En producción (VYNK_DEMO_MODE=false) el 401 se propaga sin enmascarar
      // credenciales incorrectas ni crear sesiones demo fantasma.
      if (window.VYNK_DEMO_MODE && location.pathname !== '/' && !location.pathname.endsWith('index.html')) {
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
    if (window.VYNK_DEMO_MODE && location.pathname !== '/' && !location.pathname.endsWith('index.html')) {
      localStorage.setItem('token', 'vynk_demo_active_token');
      var demoUser = { id: null, nombre: 'Cuenta Demo VYNK', role: 'user', isPro: true };
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
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { toast.classList.add('show'); });
  });

  setTimeout(function () {
    toast.classList.remove('show');
    setTimeout(function () { toast.remove(); }, 250);
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
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.15em;margin-right:6px"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> Redirigiendo a pasarela segura...';
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
    showToast((message || 'Actualiza a Pro para más funciones'), 'error');
  } else {
    alert((message || 'Actualiza a Pro para más funciones'));
  }
}

function checkAuth() {
  if (!localStorage.getItem('token') && window.VYNK_DEMO_MODE) {
    // Prevenir rebotes al acceder a /dashboard.html (SOLO en modo demo).
    var demoUser = { id: null, nombre: 'Cuenta Demo VYNK', role: 'user', isPro: true };
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

// ============================================
// PRIORIDAD 1 — ADN VISUAL: Botones líquidos
// Seguidor de mouse (translate + scale sutil).
// Solo desktop con mouse fino; inactivo en touch/TV.
// ============================================
function initLiquidButtons() {
  var liquid = document.querySelectorAll('.liquid-btn');
  if (!liquid.length) return;
  if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  liquid.forEach(function (btn) {
    btn.addEventListener('mousemove', function (e) {
      var rect = btn.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var maxX = 6;
      var maxY = 5;
      var dx = (x / rect.width - 0.5) * 2;
      var dy = (y / rect.height - 0.5) * 2;
      btn.style.setProperty('--lx', (dx * maxX).toFixed(2) + 'px');
      btn.style.setProperty('--ly', (dy * maxY).toFixed(2) + 'px');
      btn.style.setProperty('--ls', '1.02');
      btn.style.setProperty('--px', x + 'px');
      btn.style.setProperty('--py', y + 'px');
    });
    btn.addEventListener('mouseleave', function () {
      btn.style.setProperty('--lx', '0px');
      btn.style.setProperty('--ly', '0px');
      btn.style.setProperty('--ls', '1');
    });
  });
}

document.addEventListener('DOMContentLoaded', initLiquidButtons);
initLiquidButtons();
