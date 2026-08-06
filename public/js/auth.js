// ============================================
// My ID — Auth Page Logic
// ============================================
(function() {
  // If already logged in, redirect
  if (localStorage.getItem('token')) {
    location.href = '/dashboard.html';
    return;
  }

  window.showAuthTab = function(tab) {
    document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
    document.getElementById('form-registro').classList.toggle('hidden', tab !== 'registro');
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-registro').classList.toggle('active', tab === 'registro');
  };

  window.handleLogin = async function(e) {
    e.preventDefault();
    var btn = document.getElementById('btn-login');
    btn.disabled = true;
    btn.textContent = 'Entrando...';

    try {
      var data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          telefono: document.getElementById('login-telefono').value.trim(),
          password: document.getElementById('login-password').value
        })
      });

      if (data && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        location.href = '/dashboard.html';
      }
    } catch(err) {
      showToast(err.error || 'Error al iniciar sesión', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Entrar';
  };

  window.handleRegistro = async function(e) {
    e.preventDefault();
    var btn = document.getElementById('btn-registro');
    btn.disabled = true;
    btn.textContent = 'Creando...';

    try {
      var data = await api('/auth/registro', {
        method: 'POST',
        body: JSON.stringify({
          nombre: document.getElementById('reg-nombre').value.trim(),
          telefono: document.getElementById('reg-telefono').value.trim(),
          password: document.getElementById('reg-password').value
        })
      });

      if (data && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        showToast('¡Cuenta creada! Bienvenido a VYNK', 'success');
        setTimeout(function() { location.href = '/dashboard.html'; }, 500);
      }
    } catch(err) {
      showToast(err.error || 'Error al crear cuenta', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Crear cuenta';
  };
})();
