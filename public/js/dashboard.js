// ============================================
// My ID — Dashboard Logic
// ============================================
(function() {
  if (!checkAuth()) return;

  var user = getUser();
  if (!user) { logout(); return; }

  // UI Setup
  document.getElementById('user-name').textContent = user.nombre;
  document.getElementById('btn-logout').addEventListener('click', logout);
  var fabNew = document.getElementById('fab-new');
  if (fabNew) {
    fabNew.addEventListener('click', function() {
      location.href = '/editor.html';
    });
  }

  // Show admin button if admin
  if (user.role === 'admin') {
    document.getElementById('btn-admin').classList.remove('hidden');
  }

  // Show Pro badge or upgrade banner
  if (user.plan === 'paid') {
    document.getElementById('btn-plan').textContent = '✓ Pro';
    document.getElementById('btn-plan').style.color = 'var(--green)';
  } else {
    document.getElementById('upgrade-banner').classList.remove('hidden');
  }

  // Check Legal Terms consent
  var legalModal = document.getElementById('modal-legal-terms');
  if (legalModal && user.terms_accepted === false) {
    legalModal.classList.remove('hidden');
    document.getElementById('btn-accept-terms').addEventListener('click', function() {
      api('/auth/accept-terms', { method: 'POST' }).then(function(res) {
        if (res.token) {
          localStorage.setItem('token', res.token);
        }
        user.terms_accepted = true;
        localStorage.setItem('user', JSON.stringify(user));
        legalModal.classList.add('hidden');
        showToast('Términos aceptados correctamente', 'success');
      }).catch(function(err) {
        showToast('Error aceptando términos', 'error');
      });
    });
  }

  // Load profiles
  loadProfiles();

  // Delete modal
  var deleteId = null;
  document.getElementById('btn-cancel-delete').addEventListener('click', closeDeleteModal);
  document.getElementById('btn-confirm-delete').addEventListener('click', function() {
    if (deleteId) {
      api('/perfiles/' + deleteId, { method: 'DELETE' })
        .then(function() {
          showToast('Tarjeta eliminada', 'success');
          loadProfiles();
          closeDeleteModal();
        })
        .catch(function(err) { showToast(err.error || 'Error', 'error'); });
    }
  });

  function closeDeleteModal() {
    document.getElementById('modal-delete').classList.add('hidden');
    deleteId = null;
  }

  window.confirmDelete = function(id) {
    deleteId = id;
    document.getElementById('modal-delete').classList.remove('hidden');
  };

  function loadProfiles() {
    api('/perfiles?_t=' + Date.now()).then(function(data) {
      if (!data || data.error) return;

      var perfiles = Array.isArray(data) ? data : (data.perfiles || []);
      renderGrid(perfiles);
    }).catch(function(err) {
      showToast('Error cargando tarjetas', 'error');
    });
  }

  function renderGrid(perfiles) {
    var grid = document.getElementById('profile-grid');
    var empty = document.getElementById('empty-state');

    // Stats
    document.getElementById('total-perfiles').textContent = perfiles.length;
    var totalVisitas = perfiles.reduce(function(sum, p) { return sum + (p.visitas || 0); }, 0);
    document.getElementById('total-visitas').textContent = totalVisitas;

    if (perfiles.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    grid.innerHTML = perfiles.map(function(p) {
      var initials = p.nombre_perfil.split(' ').map(function(w){ return w[0]; }).slice(0,2).join('').toUpperCase();
      var color = p.color || 'var(--accent)';
      var avatarHtml = p.foto_url
        ? '<div class="avatar avatar-md" style="border:2px solid ' + color + '"><img src="' + p.foto_url + '" alt=""></div>'
        : '<div class="avatar avatar-md" style="background:' + color + '">' + initials + '</div>';

      return '<div class="profile-card" onclick="location.href=\'/editor.html?id=' + p.id + '\'">' +
        avatarHtml +
        '<div class="card-info">' +
          '<div class="card-name">' + escapeHtml(p.nombre_perfil) + '</div>' +
          '<div class="card-meta">' +
            '<span>' + (p.tipo || 'personal') + '</span>' +
            '<span>·</span>' +
            '<span>' + (p.visitas || 0) + ' visitas</span>' +
            '<span>·</span>' +
            '<span>' + (p.total_campos || 0) + ' campos</span>' +
          '</div>' +
        '</div>' +
        '<div class="card-actions">' +
          '<a href="/u/' + p.slug + '" class="btn btn-icon btn-sm" onclick="event.stopPropagation()" target="_blank" title="Ver perfil público">👁</a>' +
          '<a href="/analytics.html?id=' + p.id + '" class="btn btn-icon btn-sm" onclick="event.stopPropagation()" title="Analíticas">📊</a>' +
          '<a href="/compartir.html?id=' + p.id + '&slug=' + p.slug + '" class="btn btn-icon btn-sm" onclick="event.stopPropagation()" title="Compartir & QR">↗</a>' +
          '<a href="/compartir.html?id=' + p.id + '&slug=' + p.slug + '&nfc=true" class="btn btn-icon btn-sm" onclick="event.stopPropagation()" title="Grabar en NFC Física" style="color:#06B6D4">⚡</a>' +
          '<button class="btn btn-icon btn-sm" onclick="event.stopPropagation();confirmDelete(' + p.id + ')" title="Eliminar" style="color:var(--red)">✕</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Guided Tour Onboarding (FTUE) for First-Time Users
  var isFirstTime = user.is_first_login !== false && !localStorage.getItem('vynk_tour_completed');
  if (isFirstTime && window.driver) {
    setTimeout(startGuidedTour, 800);
  }

  function startGuidedTour() {
    try {
      const driverObj = window.driver.js.driver({
        showProgress: true,
        animate: true,
        popoverClass: 'vynk-driver-popover',
        steps: [
          {
            element: '.navbar',
            popover: {
              title: '👋 ¡Bienvenido a tu Centro de Comando!',
              description: 'Este es tu ecosistema de identidad digital Enterprise. Diseña, gestiona y sincroniza tus e-cards con tecnología NFC y QR.'
            }
          },
          {
            element: '#btn-create-card',
            popover: {
              title: '🪪 Crear Nueva Identidad Digital',
              description: 'Presiona aquí para desplegar tu primera e-card inteligente con tus redes, catálogo, menú y botón de cobro.'
            }
          },
          {
            element: '#stats-bar',
            popover: {
              title: '📊 Métricas & Conexiones en Tiempo Real',
              description: 'Monitorea tus interacciones, escaneos NFC y descargas de vCard al instante.'
            }
          },
          {
            element: '#select-workspace',
            popover: {
              title: '💼 Workspaces Multi-Tenant B2B',
              description: 'Alterna entre tu espacio personal y el corporativo para colaborar con tu equipo.'
            }
          }
        ],
        onDestroyStarted: function() {
          localStorage.setItem('vynk_tour_completed', 'true');
          api('/auth/complete-tour', { method: 'POST' }).catch(function(){});
          driverObj.destroy();
        }
      });
      driverObj.drive();
    } catch(e) {
      console.log('Driver tour notice:', e);
    }
  }
})();
