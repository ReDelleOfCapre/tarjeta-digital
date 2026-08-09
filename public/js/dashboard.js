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

  // Show Pro badge or upgrade banner, unlock Pro analytics & UI features
  var isPro = user.isPro || user.is_pro || user.plan === 'paid';
  if (isPro) {
    var btnPlan = document.getElementById('btn-plan');
    if (btnPlan) {
      btnPlan.textContent = '✓ Pro';
      btnPlan.style.color = 'var(--green)';
    }
    var banner = document.getElementById('upgrade-banner');
    if (banner) banner.classList.add('hidden');

    // Desbloquear visualmente etiquetas Pro y CTA de suscripción
    document.querySelectorAll('.pro-badge-lock').forEach(function(el) {
      el.style.background = 'rgba(16, 185, 129, 0.2)';
      el.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      el.style.color = '#10B981';
      if (el.textContent.includes('Pro')) el.textContent = '✓ Pro Activo';
    });
  } else {
  // Global Functions & Event Listeners (Zero Inline JS)
  window.toggleMobileNavDrawer = function() {
    var drawer = document.getElementById('mobile-nav-drawer');
    var backdrop = document.getElementById('mobile-nav-backdrop');
    if (drawer && backdrop) {
      drawer.classList.toggle('active');
      backdrop.classList.toggle('active');
    }
  };

  window.toggleCommandPalette = function() {
    var overlay = document.getElementById('cmd-palette-overlay');
    if (overlay) {
      overlay.classList.toggle('hidden');
      if (!overlay.classList.contains('hidden')) {
        var input = document.getElementById('cmd-search-input');
        if (input) input.focus();
      }
    }
  };

  window.toggleFocusMode = function() {
    document.body.classList.toggle('focus-mode');
    showToast('Modo Concentración Trazado', 'info');
    toggleCommandPalette();
  };

  window.switchWorkspace = function(val) {
    if (val === 'new') {
      var name = prompt('Nombre del nuevo Company Workspace:');
      if (name) {
        api('/workspaces', { method: 'POST', body: JSON.stringify({ nombre: name, tipo: 'company' }) })
          .then(function() {
            showToast('Workspace corporativo creado', 'success');
            setTimeout(function() { location.reload(); }, 400);
          })
          .catch(function(err) {
            console.error('Fallo en la petición:', err);
            alert('Ocurrió un error en el servidor.');
          });
      }
    } else {
      showToast('Cambiado a ' + (val === 'company' ? 'Company Workspace B2B' : 'Personal Workspace'), 'info');
    }
  };

  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggleCommandPalette();
    }
    if (e.key === 'Escape') {
      var overlay = document.getElementById('cmd-palette-overlay');
      if (overlay && !overlay.classList.contains('hidden')) {
        overlay.classList.add('hidden');
      }
    }
  });

  window.openTeamModal = function() {
    var modal = document.getElementById('modal-team-rbac') || document.getElementById('modal-team-members');
    if (modal) modal.classList.remove('hidden');
  };

  window.closeTeamModal = function() {
    var modal = document.getElementById('modal-team-rbac') || document.getElementById('modal-team-members');
    if (modal) modal.classList.add('hidden');
  };

  window.openNfcModal = function() {
    var modal = document.getElementById('modal-nfc-writer');
    if (modal) modal.classList.remove('hidden');
  };

  window.closeNfcModal = function() {
    var modal = document.getElementById('modal-nfc-writer');
    if (modal) modal.classList.add('hidden');
  };

  window.toggleSupportChat = function() {
    var win = document.getElementById('chat-window');
    if (win) win.classList.toggle('hidden');
  };

  window.askChat = function(topic) {
    var body = document.getElementById('chat-body');
    if (!body) return;
    var reply = document.createElement('div');
    reply.className = 'chat-msg chat-bot';

    if (topic === 'nfc') {
      reply.innerHTML = '📱 <strong>Para grabar tu tarjeta NFC física:</strong><br>1. Entra a tu tarjeta y presiona el ícono <strong>⚡</strong>.<br>2. Presiona <i>Grabar en Tarjeta NFC Física</i>.<br>3. Acerca tu tarjeta o llavero NFC al reverso de tu celular.';
    } else if (topic === 'pro') {
      reply.innerHTML = '⚡ <strong>El plan VYNK Pro incluye:</strong><br>• Identidades digitales e-card ilimitadas.<br>• Programación NFC nativa en 1 clic.<br>• Analíticas de clics y descargas vCard.<br>• Dominios y marcas personalizadas.';
    } else if (topic === 'human') {
      reply.innerHTML = '💬 <strong>Soporte Humano 24/7:</strong><br>Escríbenos directamente por WhatsApp: <br><a href="https://wa.me/522311556138?text=Hola,%20necesito%20asistencia%20humana%20con%20mi%20cuenta%20VYNK" target="_blank" style="color:var(--accent);font-weight:700">📱 Abrir WhatsApp de Soporte</a>';
    }

    body.appendChild(reply);
    body.scrollTop = body.scrollHeight;
  };

  window.sendInvite = function() {
    var emailInput = document.getElementById('invite-email');
    var roleInput = document.getElementById('invite-role');
    var selectWorkspace = document.getElementById('select-workspace');
    if (!emailInput) return;
    var email = emailInput.value.trim();
    var role = roleInput ? roleInput.value : 'Editor';
    var workspaceId = (selectWorkspace && selectWorkspace.value && selectWorkspace.value !== 'personal' && selectWorkspace.value !== 'new') ? selectWorkspace.value : 1;

    if (!email) { showToast('Ingresa un correo electrónico', 'error'); return; }

    var senderName = user ? user.nombre : 'Colega VYNK';

    // Persistir relación RBAC en Workspace vía POST /api/workspaces/:id/members
    api('/workspaces/' + workspaceId + '/members', {
      method: 'POST',
      body: JSON.stringify({ email: email, role: role })
    }).then(function(res) {
      api('/invite', { method: 'POST', body: JSON.stringify({ email: email, senderName: senderName }) }).catch(function(){});

      var list = document.getElementById('team-members-list');
      if (list) {
        var item = document.createElement('div');
        item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px;background:rgba(255,255,255,0.04);border-radius:12px;margin-top:4px';
        item.innerHTML = '<div><div style="font-weight:700;color:#FFF;font-size:0.88rem">' + escapeHtml(email.split('@')[0]) + '</div><div style="font-size:0.75rem;color:var(--text-tertiary)">' + escapeHtml(email) + '</div></div><span class="pro-badge-lock" style="background:rgba(6,182,212,0.2);color:#38BDF8;border-color:rgba(6,182,212,0.4)">' + escapeHtml(role) + '</span>';
        list.appendChild(item);
      }
      emailInput.value = '';
      showToast('Miembro guardado en Workspace RBAC', 'success');
    }).catch(function(err) {
      // Si no existe aún en DB, despachar correo de registro
      api('/invite', { method: 'POST', body: JSON.stringify({ email: email, senderName: senderName }) })
        .then(function() {
          var list = document.getElementById('team-members-list');
          if (list) {
            var item = document.createElement('div');
            item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px;background:rgba(255,255,255,0.04);border-radius:12px;margin-top:4px';
            item.innerHTML = '<div><div style="font-weight:700;color:#FFF;font-size:0.88rem">' + escapeHtml(email.split('@')[0]) + '</div><div style="font-size:0.75rem;color:var(--text-tertiary)">' + escapeHtml(email) + '</div></div><span class="pro-badge-lock" style="background:rgba(6,182,212,0.2);color:#38BDF8;border-color:rgba(6,182,212,0.4)">' + escapeHtml(role) + ' (Pendiente)</span>';
            list.appendChild(item);
          }
          emailInput.value = '';
          showToast('Invitación de registro enviada a ' + email, 'success');
        })
        .catch(function(e) {
          console.error('Fallo enviando invitación:', e);
          showToast('Error asignando miembro en Workspace', 'error');
        });
    });
  };

  document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    if (action === 'open-team') openTeamModal();
    else if (action === 'close-team') closeTeamModal();
    else if (action === 'open-nfc') openNfcModal();
    else if (action === 'close-nfc') closeNfcModal();
    else if (action === 'toggle-chat') toggleSupportChat();
    else if (action === 'toggle-drawer') toggleMobileNavDrawer();
    else if (action === 'toggle-cmd') toggleCommandPalette();
    else if (action === 'toggle-focus') toggleFocusMode();
    else if (action === 'ask-chat') askChat(btn.getAttribute('data-topic'));
    else if (action === 'send-invite') sendInvite();
    else if (action === 'logout') logout();
  });
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
        console.error('Fallo en la petición:', err);
        alert('Ocurrió un error en el servidor.');
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
    var grid = document.getElementById('profile-grid');
    if (grid && (!grid.children || grid.children.length === 0)) {
      grid.innerHTML = `
        <div class="card p-20 skeleton-pulse" style="height:90px;margin-bottom:12px"></div>
        <div class="card p-20 skeleton-pulse" style="height:90px;margin-bottom:12px"></div>
      `;
    }
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

    if (!perfiles || !Array.isArray(perfiles) || perfiles.length === 0) {
      if (grid) grid.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      var totalP = document.getElementById('total-perfiles');
      var totalV = document.getElementById('total-visitas');
      if (totalP) totalP.textContent = '0';
      if (totalV) totalV.textContent = '0';
      return;
    }

    // Stats
    var totalP = document.getElementById('total-perfiles');
    var totalV = document.getElementById('total-visitas');
    if (totalP) totalP.textContent = perfiles.length;
    var totalVisitas = perfiles.reduce(function(sum, p) { return sum + ((p && p.visitas) || 0); }, 0);
    if (totalV) totalV.textContent = totalVisitas;

    if (empty) empty.classList.add('hidden');
    grid.innerHTML = perfiles.map(function(p) {
      if (!p) return '';
      var initials = (p.nombre_perfil || 'V').split(' ').map(function(w){ return w[0]; }).slice(0,2).join('').toUpperCase();
      var color = p.color || 'var(--accent)';
      var fotoUrl = p.foto_url
        ? (p.foto_url.startsWith('http') || p.foto_url.startsWith('data:image') ? p.foto_url : (p.foto_url.startsWith('/') ? p.foto_url : '/' + p.foto_url))
        : '';
      var avatarHtml = fotoUrl
        ? '<div class="avatar avatar-md" style="border:2px solid ' + color + ';flex-shrink:0"><img src="' + fotoUrl + '" alt="" onerror="this.onerror=null;this.src=\'/img/logo.svg\';"></div>'
        : '<div class="avatar avatar-md" style="background:' + color + ';flex-shrink:0">' + initials + '</div>';

      return '<div class="profile-card" onclick="location.href=\'/editor.html?id=' + p.id + '\'">' +
        avatarHtml +
        '<div class="card-info" style="flex:1;min-width:0;padding:0 8px">' +
          '<div class="card-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(p.nombre_perfil || '') + '</div>' +
          '<div class="card-meta">' +
            '<span>' + escapeHtml(p.tipo || 'personal') + '</span>' +
            '<span>·</span>' +
            '<span>' + (p.visitas || 0) + ' visitas</span>' +
            '<span>·</span>' +
            '<span>' + (p.total_campos || 0) + ' campos</span>' +
          '</div>' +
        '</div>' +
        '<div class="card-actions" style="display:flex;align-items:center;justify-content:center;gap:6px;width:max-content;flex-shrink:0">' +
          '<a href="/u/' + p.slug + '" class="btn btn-icon btn-sm" onclick="event.stopPropagation()" target="_blank" title="Ver perfil público" style="width:34px;height:34px;min-width:34px;flex:0 0 34px;display:inline-flex;align-items:center;justify-content:center">👁</a>' +
          '<a href="/analytics.html?id=' + p.id + '" class="btn btn-icon btn-sm" onclick="event.stopPropagation()" title="Analíticas" style="width:34px;height:34px;min-width:34px;flex:0 0 34px;display:inline-flex;align-items:center;justify-content:center">📊</a>' +
          '<a href="/compartir.html?id=' + p.id + '&slug=' + p.slug + '" class="btn btn-icon btn-sm" onclick="event.stopPropagation()" title="Compartir & QR" style="width:34px;height:34px;min-width:34px;flex:0 0 34px;display:inline-flex;align-items:center;justify-content:center">↗</a>' +
          '<a href="/compartir.html?id=' + p.id + '&slug=' + p.slug + '&nfc=true" class="btn btn-icon btn-sm" onclick="event.stopPropagation()" title="Grabar en NFC Física" style="width:34px;height:34px;min-width:34px;flex:0 0 34px;display:inline-flex;align-items:center;justify-content:center;color:#06B6D4">⚡</a>' +
          '<button class="btn btn-icon btn-sm" onclick="event.stopPropagation();confirmDelete(' + p.id + ')" title="Eliminar" style="width:34px;height:34px;min-width:34px;flex:0 0 34px;display:inline-flex;align-items:center;justify-content:center;color:var(--red)">✕</button>' +
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

      if (error.name === 'NotAllowedError') {
        console.warn('Permiso NDEF NFC denegado por el usuario.');
        showToast('Permiso de NFC denegado en el dispositivo', 'error');
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
