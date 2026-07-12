// ============================================
// TarjetaDigital — Auth (auth.js)
// ============================================

(function () {
  'use strict';

  // If already logged in, redirect to dashboard
  if (localStorage.getItem('token')) {
    location.href = '/dashboard.html';
    return;
  }

  // --- Tab switching ---
  const tabs = document.querySelectorAll('.auth-tab');
  const loginForm = document.getElementById('login-form');
  const registroForm = document.getElementById('registro-form');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');

      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Toggle forms
      if (target === 'login') {
        loginForm.classList.remove('hidden');
        registroForm.classList.add('hidden');
      } else {
        loginForm.classList.add('hidden');
        registroForm.classList.remove('hidden');
      }

      // Clear errors
      clearErrors();
    });
  });

  // --- Helpers ---
  function clearErrors() {
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    document.querySelectorAll('.error-text').forEach(el => el.remove());
  }

  function showFieldError(input, message) {
    input.classList.add('input-error');
    const existing = input.parentElement.querySelector('.error-text');
    if (existing) existing.remove();
    const errorEl = document.createElement('span');
    errorEl.className = 'error-text';
    errorEl.textContent = message;
    input.parentElement.appendChild(errorEl);
  }

  function setLoading(btn, loading) {
    if (loading) {
      btn.classList.add('loading');
      btn.disabled = true;
      btn._originalText = btn.textContent;
      btn.textContent = 'Cargando...';
    } else {
      btn.classList.remove('loading');
      btn.disabled = false;
      btn.textContent = btn._originalText || 'Enviar';
    }
  }

  // --- Login ---
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const telefono = document.getElementById('login-tel').value.trim();
    const password = document.getElementById('login-pass').value;

    // Validate
    if (!telefono) {
      showFieldError(document.getElementById('login-tel'), 'El teléfono es obligatorio');
      return;
    }
    if (!password || password.length < 6) {
      showFieldError(document.getElementById('login-pass'), 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    const btn = loginForm.querySelector('button[type="submit"]');
    setLoading(btn, true);

    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ telefono, password }),
    });

    setLoading(btn, false);

    if (data && !data.error) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      location.href = '/dashboard.html';
    }
  });

  // --- Register ---
  registroForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const nombre = document.getElementById('reg-nombre').value.trim();
    const telefono = document.getElementById('reg-tel').value.trim();
    const password = document.getElementById('reg-pass').value;
    const password2 = document.getElementById('reg-pass2').value;

    // Validate
    let hasError = false;

    if (!nombre || nombre.length < 2) {
      showFieldError(document.getElementById('reg-nombre'), 'El nombre debe tener al menos 2 caracteres');
      hasError = true;
    }
    if (!telefono) {
      showFieldError(document.getElementById('reg-tel'), 'El teléfono es obligatorio');
      hasError = true;
    }
    if (!password || password.length < 6) {
      showFieldError(document.getElementById('reg-pass'), 'La contraseña debe tener al menos 6 caracteres');
      hasError = true;
    }
    if (password !== password2) {
      showFieldError(document.getElementById('reg-pass2'), 'Las contraseñas no coinciden');
      hasError = true;
    }

    if (hasError) return;

    const btn = registroForm.querySelector('button[type="submit"]');
    setLoading(btn, true);

    const data = await api('/auth/registro', {
      method: 'POST',
      body: JSON.stringify({ nombre, telefono, password }),
    });

    setLoading(btn, false);

    if (data && !data.error) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      showToast('¡Cuenta creada exitosamente!', 'success');
      setTimeout(() => {
        location.href = '/dashboard.html';
      }, 500);
    }
  });
})();
