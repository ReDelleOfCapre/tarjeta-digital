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

  // ===== WEB NFC API HARDWARE INTEGRATION ENGINE =====
  var nfcAbortController = null;

  window.writeNfcTag = async function(targetUrl, userSlug) {
    // 1. Hardware Detection & Fallback
    if (!('NDEFReader' in window)) {
      showToast('La sincronización NFC física requiere Chrome para Android. Usa tu celular para grabar tu tarjeta.', 'info');
      return;
    }

    var finalUrl = targetUrl;
    if (!finalUrl) {
      var slug = userSlug || (window.perfilesList && window.perfilesList[0] ? window.perfilesList[0].slug : null);
      if (slug) {
        finalUrl = window.location.origin + '/u/' + slug;
      } else {
        showToast('Crea primero una tarjeta digital para sincronizar tu tag NFC', 'error');
        return;
      }
    }

    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    // 2. Open NFC Ripple Modal
    openNfcModal(finalUrl);

    try {
      nfcAbortController = new AbortController();
      const ndef = new NDEFReader();

      // Execute NDEF write
      await ndef.write({
        records: [{ recordType: 'url', data: finalUrl }]
      }, { signal: nfcAbortController.signal });

      // 3. Success Haptic Feedback
      if (navigator.vibrate) {
        try { navigator.vibrate(200); } catch(e){}
      }

      updateNfcModalState('success', '¡Tarjeta Sincronizada!', 'Se grabó exitosamente ' + finalUrl + ' en la tag NFC.');
      setTimeout(closeNfcModal, 2200);

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Sincronización NFC cancelada por el usuario.');
        closeNfcModal();
        return;
      }

      // 4. Error Double Haptic Vibration & Modal Error State
      if (navigator.vibrate) {
        try { navigator.vibrate([100, 50, 100]); } catch(e){}
      }

      console.error('❌ Error de escritura Web NFC:', error);
      updateNfcModalState('error', 'Error de Grabación NFC', 'Ocurrió una interrupción al leer la tarjeta. Acerca la tarjeta nuevamente sin moverla.', finalUrl);
    }
  };

  function openNfcModal(url) {
    let overlay = document.getElementById('nfc-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'nfc-modal-overlay';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="nfc-modal-card" id="nfc-modal-card">
          <button class="nfc-modal-close" onclick="cancelNfcWriting()">✕</button>
          <div class="nfc-ripple-container">
            <div class="nfc-ripple-ring ring-1"></div>
            <div class="nfc-ripple-ring ring-2"></div>
            <div class="nfc-ripple-ring ring-3"></div>
            <div class="nfc-center-icon" id="nfc-modal-icon">⚡</div>
          </div>
          <h3 id="nfc-modal-title" style="font-size:1.2rem;font-weight:800;color:#FFF;margin-bottom:8px">Sincronización NFC Activa</h3>
          <p id="nfc-modal-status" style="font-size:0.88rem;color:var(--text-secondary);line-height:1.5">Acerca tu VYNK Card o Sticker a la parte trasera de tu celular...</p>
          <div id="nfc-modal-actions" style="margin-top:20px">
            <button class="btn btn-secondary btn-sm" onclick="cancelNfcWriting()">Cancelar</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    var card = document.getElementById('nfc-modal-card');
    if (card) {
      card.className = 'nfc-modal-card';
    }
    document.getElementById('nfc-modal-icon').textContent = '⚡';
    document.getElementById('nfc-modal-title').textContent = 'Sincronización NFC Activa';
    document.getElementById('nfc-modal-status').textContent = 'Acerca tu VYNK Card o Sticker a la parte trasera de tu celular...';
    document.getElementById('nfc-modal-actions').innerHTML = '<button class="btn btn-secondary btn-sm" onclick="cancelNfcWriting()">Cancelar</button>';

    overlay.classList.remove('hidden');
  }

  function updateNfcModalState(state, title, message, retryUrl) {
    var card = document.getElementById('nfc-modal-card');
    var icon = document.getElementById('nfc-modal-icon');
    var titleEl = document.getElementById('nfc-modal-title');
    var statusEl = document.getElementById('nfc-modal-status');
    var actionsEl = document.getElementById('nfc-modal-actions');

    if (state === 'success') {
      if (card) card.className = 'nfc-modal-card success-state';
      if (icon) icon.textContent = '✅';
      if (titleEl) titleEl.textContent = title;
      if (statusEl) statusEl.textContent = message;
      if (actionsEl) actionsEl.innerHTML = '<span style="font-size:0.8rem;color:var(--green);font-weight:700">✓ Guardado correctamente</span>';
    } else if (state === 'error') {
      if (card) card.className = 'nfc-modal-card error-state';
      if (icon) icon.textContent = '⚠️';
      if (titleEl) titleEl.textContent = title;
      if (statusEl) statusEl.textContent = message;
      if (actionsEl) {
        actionsEl.innerHTML = '<div style="display:flex;gap:10px;justify-content:center"><button class="btn btn-primary btn-sm" onclick="writeNfcTag(\'' + (retryUrl || '') + '\')">Reintentar</button><button class="btn btn-secondary btn-sm" onclick="closeNfcModal()">Cerrar</button></div>';
      }
    }
  }

  window.cancelNfcWriting = function() {
    if (nfcAbortController) {
      nfcAbortController.abort();
      nfcAbortController = null;
    }
    closeNfcModal();
  };

  window.closeNfcModal = function() {
    var overlay = document.getElementById('nfc-modal-overlay');
    if (overlay) overlay.classList.add('hidden');
  };
})();
