// ============================================
// VYNK — Landing Page Client Logic (Pure Event Listeners)
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Si está autenticado, transformar el botón del nav para ir directo al Dashboard sin bloquear navegación a inicio
  const existingToken = localStorage.getItem('token');
  const isDemoToken = existingToken && (existingToken === 'vynk_demo_active_token' || existingToken.startsWith('vynk_demo_'));
  if (existingToken && !isDemoToken) {
    const navAuthBtn = document.querySelector('a[href="#auth"]');
    if (navAuthBtn) {
      navAuthBtn.href = '/dashboard.html';
      navAuthBtn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px"><path d="M12 7.5l1.8 3.8 4.2.6-3 2.9.7 4.2L12 16.8l-3.7 2 .7-4.2-3-2.9 4.2-.6z"/><path d="M4 4.5h16"/></svg>Ir a mi Dashboard';
      navAuthBtn.removeAttribute('data-tab');
    }
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

  // SSO real: consulta qué providers están configurados y activa los botones honestos
  initSsoButtons();

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

function handleAuthSuccess(res, provider) {
  if (res && res.token) {
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.usuario));
    localStorage.setItem('usuario', JSON.stringify(res.usuario));
    showToast('¡Sesión iniciada con ' + provider.toUpperCase() + '!', 'success');
    setTimeout(function () { window.location.href = '/dashboard.html'; }, 300);
  }
}

// --- Google Identity Services (SDK real, solo si hay client_id configurado) ---
function loadScript(src) {
  return new Promise(function (resolve, reject) {
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = function () { reject(new Error('No se pudo cargar ' + src)); };
    document.head.appendChild(s);
  });
}

var googleReady = null;
async function initGoogle(providers) {
  var btn = document.querySelector('[data-provider="google"]');
  if (!btn || !providers.google || !providers.google.configured) {
    if (btn) { btn.classList.add('sso-unavailable'); btn.disabled = true; }
    return;
  }
  btn.classList.remove('sso-unavailable');
  btn.disabled = false;
  try {
    await loadScript('https://accounts.google.com/gsi/client');
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.initialize({
        client_id: providers.google.clientId,
        callback: function (response) {
          if (!response || !response.credential) { showToast('No se pudo obtener la credencial de Google', 'error'); return; }
          api('/auth/sso/google', {
            method: 'POST',
            body: JSON.stringify({ credential: response.credential })
          }).then(function (res) {
            handleAuthSuccess(res, 'Google');
          }).catch(function (err) {
            showToast(err.error || 'No se pudo iniciar sesión con Google', 'error');
          });
        }
      });
      googleReady = function () {
        window.google.accounts.id.prompt();
      };
    }
  } catch (e) {
    console.error('Error inicializando Google SSO:', e);
  }
}

// --- Sign in with Apple (SDK real, solo si hay client_id configurado) ---
var appleReady = null;
async function initApple(providers) {
  var btn = document.querySelector('[data-provider="apple"]');
  if (!btn || !providers.apple || !providers.apple.configured) {
    if (btn) { btn.classList.add('sso-unavailable'); btn.disabled = true; }
    return;
  }
  btn.classList.remove('sso-unavailable');
  btn.disabled = false;
  try {
    await loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js');
    if (window.AppleID) {
      var redirectUri = window.location.origin + '/#auth';
      window.AppleID.auth.init({
        clientId: providers.apple.clientId,
        scope: 'name email',
        redirectURI: redirectUri,
        usePopup: true
      });
      appleReady = function () {
        window.AppleID.auth.signIn().then(function (data) {
          var idToken = data && data.authorization && data.authorization.id_token;
          if (!idToken) { showToast('No se pudo obtener el identity token de Apple', 'error'); return; }
          api('/auth/sso/apple', {
            method: 'POST',
            body: JSON.stringify({ identityToken: idToken, user: data.user || null })
          }).then(function (res) {
            handleAuthSuccess(res, 'Apple');
          }).catch(function (err) {
            showToast(err.error || 'No se pudo iniciar sesión con Apple', 'error');
          });
        }).catch(function (err) {
          showToast(err.error || 'Se canceló el inicio de sesión con Apple', 'error');
        });
      };
    }
  } catch (e) {
    console.error('Error inicializando Apple SSO:', e);
  }
}

function initSsoButtons() {
  var anyBtn = document.querySelector('[data-action="sso"]');
  if (!anyBtn) return;
  api('/auth/providers').then(function (providers) {
    if (!providers) return;
    initGoogle(providers);
    initApple(providers);
  }).catch(function () {
    // Si el endpoint falla, mostrar los botones como no disponibles (honestos, no simulados)
    document.querySelectorAll('[data-action="sso"]').forEach(function (b) {
      b.classList.add('sso-unavailable');
      b.disabled = true;
    });
  });
}

async function ssoLogin(provider) {
  showToast('Conectando con ' + provider.toUpperCase() + '...', 'info');
  if (provider === 'google' && googleReady) {
    googleReady();
    return;
  }
  if (provider === 'apple' && appleReady) {
    appleReady();
    return;
  }
  showToast('Inicio de sesión con ' + provider.toUpperCase() + ' aún no disponible', 'error');
}

function openHelpModal() {
  const helpModal = document.getElementById('helpModal');
  if (helpModal) {
    helpModal.classList.add('open');
  } else {
    alert('Instrucciones de recuperación enviadas a tu correo.');
  }
}

function closeHelpModal() {
  const helpModal = document.getElementById('helpModal');
  if (helpModal) helpModal.classList.remove('open');
}
