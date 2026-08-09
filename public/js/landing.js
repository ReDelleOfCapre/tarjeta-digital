// ============================================
// VYNK — Landing Page Client Logic (Pure Event Listeners)
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Redirect if logged in
  if (localStorage.getItem('token')) {
    window.location.href = '/dashboard.html';
    return;
  }

  // Handle URL params (e.g. ?plan=pro)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('plan') === 'pro' || localStorage.getItem('vynk_selected_plan') === 'pro') {
    switchTab('register');
  }

  // Scroll Animations Observer
  const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, observerOptions);
  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

  // Explicit Auth Link Smooth Scrolling & Tab Switching
  document.querySelectorAll('a[href="#auth"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const tab = link.getAttribute('data-tab') || (link.textContent.toLowerCase().includes('iniciar') ? 'login' : 'register');
      switchTab(tab);
      const authSec = document.getElementById('auth');
      if (authSec) {
        e.preventDefault();
        authSec.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  document.querySelectorAll('a[href="#features"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const feat = document.getElementById('features');
      if (feat) {
        e.preventDefault();
        feat.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  document.querySelectorAll('a[href="#precios"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const price = document.getElementById('precios');
      if (price) {
        e.preventDefault();
        price.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Global Event Delegation for buttons & tabs
  document.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;

    const action = actionBtn.getAttribute('data-action');
    if (action === 'switch-tab') {
      const tab = actionBtn.getAttribute('data-tab') || 'register';
      switchTab(tab);
    } else if (action === 'sso') {
      const provider = actionBtn.getAttribute('data-provider');
      if (provider) ssoLogin(provider);
    } else if (action === 'open-help') {
      openHelpModal();
    } else if (action === 'close-help') {
      closeHelpModal();
    }
  });

  // Auth Forms
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const telefono = document.getElementById('loginTelefono').value;
      const password = document.getElementById('loginPassword').value;
      const btn = e.target.querySelector('button');
      const originalText = btn.innerText;
      btn.innerText = 'Cargando...'; btn.disabled = true;

      try {
        const res = await api('/auth/login', { 
          method: 'POST', 
          body: JSON.stringify({ telefono, password }) 
        });
        if(res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.usuario));
          localStorage.setItem('usuario', JSON.stringify(res.usuario));
          showToast('Bienvenido de vuelta', 'success');
          setTimeout(() => window.location.href = '/dashboard.html', 300);
        }
      } catch (err) {
        showToast(err.error || err.message || 'Error al iniciar sesión', 'error');
      } finally {
        btn.innerText = originalText; btn.disabled = false;
      }
    });
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('regName').value;
      const telefono = document.getElementById('regTelefono').value;
      const email = document.getElementById('regEmail').value;
      const password = document.getElementById('regPassword').value;
      const btn = e.target.querySelector('button');
      const originalText = btn.innerText;
      btn.innerText = 'Cargando...'; btn.disabled = true;

      try {
        const res = await api('/auth/registro', { 
          method: 'POST', 
          body: JSON.stringify({ nombre, telefono, email, password }) 
        });
        if(res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.usuario));
          localStorage.setItem('usuario', JSON.stringify(res.usuario));
          showToast('Cuenta creada con éxito', 'success');

          // Despachar correo de onboarding asíncronamente
          api('/onboarding', {
            method: 'POST',
            body: JSON.stringify({ email: email, nombre: nombre })
          }).catch(err => console.error('Onboarding async email error:', err));

          setTimeout(() => window.location.href = '/dashboard.html', 300);
        }
      } catch (err) {
        showToast(err.error || err.message || 'Error al registrar', 'error');
      } finally {
        btn.innerText = originalText; btn.disabled = false;
      }
    });
  }
});

function switchTab(tab) {
  const tabLogin = document.getElementById('tab-login');
  const tabReg = document.getElementById('tab-register');
  const loginForm = document.getElementById('loginForm');
  const regForm = document.getElementById('registerForm');

  if (tabLogin) tabLogin.classList.remove('active');
  if (tabReg) tabReg.classList.remove('active');
  if (loginForm) loginForm.classList.remove('active');
  if (regForm) regForm.classList.remove('active');
  
  if (tab === 'login') {
    if (tabLogin) tabLogin.classList.add('active');
    if (loginForm) loginForm.classList.add('active');
  } else {
    if (tabReg) tabReg.classList.add('active');
    if (regForm) regForm.classList.add('active');
  }
}

async function ssoLogin(provider) {
  showToast('Conectando con ' + provider.toUpperCase() + '...', 'info');
  try {
    const dummyEmail = provider + '_user_' + Math.floor(Math.random() * 1000) + '@vynk.app';
    const res = await api('/auth/sso-login', {
      method: 'POST',
      body: JSON.stringify({
        provider: provider,
        email: dummyEmail,
        nombre: 'Usuario ' + provider.toUpperCase(),
        providerId: 'sso_id_' + Date.now()
      })
    });

    if (res.token) {
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.usuario));
      localStorage.setItem('usuario', JSON.stringify(res.usuario));
      showToast('¡Sesión iniciada con ' + provider.toUpperCase() + '!', 'success');

      // Despachar correo de onboarding asíncronamente
      api('/onboarding', {
        method: 'POST',
        body: JSON.stringify({ email: res.usuario?.email || dummyEmail, nombre: res.usuario?.nombre || 'Usuario' })
      }).catch(err => console.error('Onboarding SSO async email error:', err));

      window.location.href = '/dashboard.html';
    }
  } catch (err) {
    showToast(err.error || 'Error de autenticación SSO', 'error');
  }
}

function openHelpModal() {
  const helpModal = document.getElementById('helpModal');
  if (helpModal) {
    helpModal.style.display = 'flex';
  } else {
    alert('Instrucciones de recuperación enviadas a tu correo.');
  }
}

function closeHelpModal() {
  const helpModal = document.getElementById('helpModal');
  if (helpModal) helpModal.style.display = 'none';
}
