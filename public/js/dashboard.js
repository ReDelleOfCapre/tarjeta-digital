// ============================================
// E-COMMERCE B2C & B2B DUAL PIVOT LOGIC (Global Handlers)
// ============================================
var currentCheckoutProductId = 'card-nfc-single';
var currentCheckoutItemTitle = 'Tarjeta NFC Personalizada';
var currentCheckoutItemPrice = 19.99;
var editPerfilId = null;

// Iconos: sistema único compartido (js/vynk-icons.js) -> vynkIcon(name, size)

function switchDashboardTab(tabId) {
  var allViews = document.querySelectorAll('.tab-view-content');
  allViews.forEach(function(view) {
    view.classList.add('hidden');
    view.style.display = 'none';
  });

  var targetView = document.getElementById('view-tab-' + tabId);
  if (targetView) {
    targetView.classList.remove('hidden');
    targetView.style.display = 'block';
  }

  var allNavItems = document.querySelectorAll('.nav-side-item, [data-tab]');
  allNavItems.forEach(function(item) {
    var itemTab = item.getAttribute('data-tab');
    if (!itemTab && item.id && item.id.startsWith('nav-item-')) {
      itemTab = item.id.replace('nav-item-', '');
    }
    if (itemTab === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}
window.switchDashboardTab = switchDashboardTab;

document.addEventListener('click', function(e) {
  var target = e.target ? e.target.closest('[data-tab]') : null;
  if (target) {
    var tab = target.getAttribute('data-tab');
    if (tab && typeof switchDashboardTab === 'function') {
      switchDashboardTab(tab);
    }
  }
});

window.openCheckoutModal = function(productId, title, price) {
  currentCheckoutProductId = productId || 'card-nfc-single';
  currentCheckoutItemTitle = title || 'Tarjeta NFC Personalizada VYNK';
  currentCheckoutItemPrice = price || 19.99;

  var titleEl = document.getElementById('checkout-item-title');
  var priceEl = document.getElementById('checkout-item-price');
  if (titleEl) titleEl.textContent = currentCheckoutItemTitle;
  if (priceEl) priceEl.textContent = '$' + currentCheckoutItemPrice + ' USD';

  var modal = document.getElementById('modal-checkout-nfc');
  if (modal) modal.classList.remove('hidden');
};

window.closeCheckoutModal = function() {
  var modal = document.getElementById('modal-checkout-nfc');
  if (modal) modal.classList.add('hidden');
};

window.executeCheckout = async function(e) {
  if (e) e.preventDefault();
  var name = document.getElementById('checkout-name').value;
  var address = document.getElementById('checkout-address').value;

  if (typeof showToast === 'function') showToast('Enviando datos de envío...', 'info');
  closeCheckoutModal();

  if (window.buyProduct) {
    window.buyProduct(currentCheckoutProductId, currentCheckoutItemTitle, currentCheckoutItemPrice, 'payment');
  }
};

window.openAssignClientModal = function() {
  var modal = document.getElementById('modal-assign-client');
  if (modal) modal.classList.remove('hidden');
};

window.closeAssignClientModal = function() {
  var modal = document.getElementById('modal-assign-client');
  if (modal) modal.classList.add('hidden');
};

window.executeAssignClient = async function(e) {
  if (e) e.preventDefault();
  var name = document.getElementById('assign-client-name').value;
  var slug = document.getElementById('assign-client-slug').value;

  if (!name || !slug) {
    if (typeof showToast === 'function') showToast('Completa nombre y slug del cliente', 'error');
    return;
  }

  try {
    if (typeof showToast === 'function') showToast('Creando perfil para cliente ' + name + '...', 'info');
    if (typeof api === 'function') {
      var created = await api('/perfiles', {
        method: 'POST',
        body: JSON.stringify({ nombre_perfil: name, tipo: 'personal', bio: 'Perfil activado por distribuidor' })
      });
    }

    closeAssignClientModal();
    
    var stockEl = document.getElementById('reseller-stock-count');
    var assignedEl = document.getElementById('reseller-assigned-count');
    if (stockEl) {
      var currStock = parseInt(stockEl.textContent || '10', 10);
      if (currStock > 0) stockEl.textContent = currStock - 1;
    }
    if (assignedEl) {
      var currAssigned = parseInt(assignedEl.textContent || '0', 10);
      assignedEl.textContent = currAssigned + 1;
    }

    if (typeof showToast === 'function') showToast('✅ Perfil creado. Inicie la grabación Web NFC acercando la tarjeta física.', 'success');
    if (typeof writeNfcTag === 'function') writeNfcTag(window.location.origin + '/u/' + (created && created.slug ? created.slug : slug));
  } catch (err) {
    if (typeof showToast === 'function') showToast(err.error || 'Error asignando tarjeta a cliente', 'error');
  }
};

// ============================================
// CORE CREATION & MANAGEMENT LOGIC
// ============================================
window.openCreateModal = function() {
  editPerfilId = null;
  // El editor visual completo vive en editor.html (diseño Apple Wallet + guardado real).
  window.location.href = '/editor.html';
};

window.openEditModal = async function(id) {
  editPerfilId = id;
  // Edición completa vía el editor visual (mantiene preview = tarjeta publicada).
  window.location.href = '/editor.html?id=' + encodeURIComponent(id);
};

window.closeCreateModal = function() {
  editPerfilId = null;
  var modal = document.getElementById('modal-perfiles');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
};

window.executeCreatePerfil = async function(e) {
  if (e) e.preventDefault();
  var nombreInput = document.getElementById('create-perfil-nombre');
  var slugInput = document.getElementById('create-perfil-slug');
  var tipoInput = document.getElementById('create-perfil-tipo');
  var bioInput = document.getElementById('create-perfil-bio');
  var waInput = document.getElementById('create-perfil-wa');
  var igInput = document.getElementById('create-perfil-ig');
  var webInput = document.getElementById('create-perfil-web');
  var cumpleInput = document.getElementById('create-perfil-cumple');
  var estudiosInput = document.getElementById('create-perfil-estudios');
  var pronombresInput = document.getElementById('create-perfil-pronombres');
  var temaSelect = document.getElementById('create-perfil-tema');

  var nombre = nombreInput ? nombreInput.value.trim() : '';
  var slug = slugInput ? slugInput.value.trim() : '';
  var tipo = tipoInput ? tipoInput.value : 'personal';
  var bio = bioInput ? bioInput.value.trim() : '';
  var whatsapp = waInput ? waInput.value.trim() : '';
  var instagram = igInput ? igInput.value.trim() : '';
  var sitio_web = webInput ? webInput.value.trim() : '';
  var cumpleanos = cumpleInput ? cumpleInput.value.trim() : '';
  var estudios = estudiosInput ? estudiosInput.value.trim() : '';
  var pronombres = pronombresInput ? pronombresInput.value.trim() : '';
  var tema_color = temaSelect ? temaSelect.value : 'neon';

  if (!nombre || !slug) {
    if (typeof showToast === 'function') showToast('Ingresa un nombre y link para tu tarjeta', 'error');
    else alert('Ingresa un nombre y link para tu tarjeta');
    return;
  }

  slug = slug.toLowerCase().replace(/[^a-z0-9_-]/g, '-');

  try {
    if (typeof showToast === 'function') showToast(editPerfilId ? 'Guardando cambios...' : 'Creando nueva tarjeta digital...', 'info');
    
    var payload = {
      nombre_perfil: nombre,
      slug: slug,
      tipo: tipo,
      bio: bio,
      whatsapp: whatsapp,
      instagram: instagram,
      sitio_web: sitio_web,
      cumpleanos: cumpleanos,
      estudios: estudios,
      pronombres: pronombres,
      tema_color: tema_color
    };

    var data;
    if (editPerfilId) {
      data = await api('/perfiles/' + editPerfilId, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      data = await api('/perfiles', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    closeCreateModal();
    if (typeof showToast === 'function') showToast(editPerfilId ? '✅ Tarjeta actualizada con éxito' : '✅ Tarjeta creada con éxito', 'success');

    if (typeof window.loadProfilesGlobal === 'function') {
      window.loadProfilesGlobal();
    }
  } catch (err) {
    console.error('❌ Error en creación de perfil:', err);
    var mensajeError = err.error || err.mensaje || 'Error al conectar con la ruta POST /api/perfiles';
    if (typeof showToast === 'function') showToast(mensajeError, 'error');
    else alert('Error: ' + mensajeError);
  }
};

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
      openCreateModal();
    });
  }

  // Guided Onboarding Tour (Non-intrusive, User-initiated)
  window.startGuidedTour = function() {
    if (typeof driver === 'undefined' || typeof driver.driver !== 'function') {
      if (typeof showToast === 'function') showToast('La guía interactiva se está cargando...', 'info');
      return;
    }
    var driverObj = driver.driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      doneBtnText: '¡Comprendido!',
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Anterior',
      steps: [
        { element: '#profile-grid', popover: { title: '📇 Tu Galería de Identidades', description: 'Aquí residen todas tus tarjetas digitales VYNK. Toca cualquier tarjeta para editar sus bloques y colores.', side: 'bottom', align: 'start' } },
        { element: '#fab-new', popover: { title: '✨ Crear Nueva Tarjeta', description: 'Genera identidades digitales para uso personal o para tu negocio en segundos.', side: 'left', align: 'center' } },
        { element: '#nav-item-tienda', popover: { title: '📱 Tienda NFC & Tarjetas Físicas', description: 'Vincula tus tarjetas virtuales a llaveros y tarjetas físicas NFC en 1 clic.', side: 'bottom', align: 'center' } },
        { element: '#btn-plan', popover: { title: '⚡ Centro de Control Pro', description: 'Accede a analíticas de métricas en tiempo real, descargas de vCard y características avanzadas.', side: 'bottom', align: 'end' } }
      ]
    });
    driverObj.drive();
  };

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

    // Desbloquear módulos Pro (Insights Inteligentes, Actividad Reciente, Vista Previa)
    document.querySelectorAll('.pro-module').forEach(function(el) {
      el.classList.add('pro-active');
      el.style.display = 'flex';
    });
  } else {
    // Mantener interfaz limpia para usuarios Free
    document.querySelectorAll('.pro-module').forEach(function(el) {
      el.classList.remove('pro-active');
      el.style.display = 'none';
    });
  }
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

  window.cmdNfcShortcut = function() {
    var list = window.perfilesList || [];
    var first = list[0];
    if (first && first.slug) {
      location.href = '/compartir.html?id=' + first.id + '&slug=' + first.slug + '&nfc=true';
    } else {
      list.forEach(function(p) {
        if (p && p.slug && !first) first = p;
      });
      if (first && first.slug) {
        location.href = '/compartir.html?id=' + first.id + '&slug=' + first.slug + '&nfc=true';
      } else if (typeof showToast === 'function') {
        showToast('Crea primero una tarjeta digital para sincronizar NFC', 'error');
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

  // Touch-optimized navigation for iOS / Mobile devices

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

  var legalModal = document.getElementById('modal-legal-terms') || document.getElementById('modal-terms') || document.getElementById('modal-legal');
  if (legalModal && user && !user.terms_accepted) {
    legalModal.classList.remove('hidden');
    var btnAccept = document.getElementById('btn-accept-terms');
    if (btnAccept) {
      btnAccept.addEventListener('click', function() {
        api('/auth/accept-terms', { method: 'POST' }).then(function(res) {
          if (res.token) {
            localStorage.setItem('token', res.token);
          }
          user.terms_accepted = true;
          localStorage.setItem('usuario', JSON.stringify(user));
          legalModal.classList.add('hidden');
          showToast('Términos aceptados correctamente', 'success');
        }).catch(function(err) {
          console.error('Fallo en la petición:', err);
          alert('Ocurrió un error en el servidor.');
        });
      });
    }
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
    window.loadProfilesGlobal = loadProfiles;
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
      window.perfilesList = perfiles;
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
        ? '<div class="avatar avatar-md" style="border:1px solid var(--border-hairline);border-radius:50%;flex-shrink:0;width:44px;height:44px;overflow:hidden"><img src="' + fotoUrl + '" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.onerror=null;this.src=\'/img/default-avatar.png\';"></div>'
        : '<div class="avatar avatar-md" style="background:rgba(255,255,255,0.08);border:1px solid var(--border-hairline);border-radius:50%;flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--text-primary)">' + initials + '</div>';

      return '<div class="profile-card glass-card" onclick="openEditModal(' + p.id + ')" style="background:var(--bg-elevated);border:1px solid var(--border-hairline);border-radius:20px;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;box-shadow:0 8px 30px rgba(0,0,0,0.35);transition:transform 200ms cubic-bezier(0.4, 0, 0.2, 1);cursor:pointer">' +
        avatarHtml +
        '<div class="card-info" style="flex:1;min-width:0">' +
          '<div class="card-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600;font-size:1.05rem;color:var(--text-primary)">' + escapeHtml(p.nombre_perfil || '') + '</div>' +
          '<div class="card-meta" style="font-size:0.82rem;color:var(--text-secondary);margin-top:4px;display:flex;align-items:center;gap:8px">' +
            '<span style="background:rgba(255,255,255,0.06);padding:2px 8px;border-radius:6px;font-size:0.75rem;text-transform:capitalize">' + escapeHtml(p.tipo || 'personal') + '</span>' +
            '<span>·</span>' +
            '<span>' + (p.visitas || 0) + ' visitas</span>' +
            '<span>·</span>' +
            '<span>' + (p.total_campos || 0) + ' bloques</span>' +
          '</div>' +
        '</div>' +
        '<div class="card-actions" style="display:flex;align-items:center;gap:6px;flex-shrink:0">' +
          '<button type="button" class="btn btn-icon btn-sm action-monochrome" onclick="event.stopPropagation(); openEditModal(' + p.id + ');" title="Abrir editor visual incrustado">' + vynkIcon('edit') + '</button>' +
          '<a href="/u/' + (p.slug || p.id) + '" class="btn btn-icon btn-sm action-monochrome" onclick="event.stopPropagation()" target="_blank" title="Ver perfil público">' + vynkIcon('eye') + '</a>' +
          '<a href="/analytics.html?id=' + p.id + '" class="btn btn-icon btn-sm action-monochrome" onclick="event.stopPropagation()" title="Analíticas">' + vynkIcon('chart') + '</a>' +
          '<a href="/compartir.html?id=' + p.id + '&slug=' + (p.slug || p.id) + '" class="btn btn-icon btn-sm action-monochrome" onclick="event.stopPropagation()" title="Compartir & QR">' + vynkIcon('share') + '</a>' +
          '<a href="/compartir.html?id=' + p.id + '&slug=' + (p.slug || p.id) + '&nfc=true" class="btn btn-icon btn-sm action-monochrome" onclick="event.stopPropagation()" title="Grabar en NFC Física">' + vynkIcon('bolt') + '</a>' +
          '<button class="btn btn-icon btn-sm action-monochrome action-delete" onclick="event.stopPropagation();confirmDelete(' + p.id + ')" title="Eliminar">' + vynkIcon('close') + '</button>' +
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
          <button class="nfc-modal-close" onclick="cancelNfcWriting()">' + vynkIcon('close') + '</button>
          <div class="nfc-ripple-container">
            <div class="nfc-ripple-ring ring-1"></div>
            <div class="nfc-ripple-ring ring-2"></div>
            <div class="nfc-ripple-ring ring-3"></div>
            <div class="nfc-center-icon" id="nfc-modal-icon">' + vynkIcon('bolt') + '</div>
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
    document.getElementById('nfc-modal-icon').innerHTML = vynkIcon('bolt');
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
      if (icon) icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.6em;height:1.6em"><path d="M5 13l4 4L19 7"/></svg>';
      if (titleEl) titleEl.textContent = title;
      if (statusEl) statusEl.textContent = message;
      if (actionsEl) actionsEl.innerHTML = '<span style="font-size:0.8rem;color:var(--green);font-weight:700">' + vynkIcon('check') + ' Guardado correctamente</span>';
    } else if (state === 'error') {
      if (card) card.className = 'nfc-modal-card error-state';
      if (icon) icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.6em;height:1.6em"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
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

  window.openEditModal = function(id) {
    if (id) {
      window.location.href = '/editor.html?id=' + id;
    } else {
      window.location.href = '/editor.html';
    }
  };

  window.openCreateModal = function(id) {
    if (id) {
      window.location.href = '/editor.html?id=' + id;
    } else {
      window.location.href = '/editor.html';
    }
  };

  window.closeCreateModal = function() {
    var m = document.getElementById('modal-perfiles');
    if (m) m.classList.add('hidden');
  };

  // ============================================
  // MOTOR DE THEMING — VYNK SMART PROFILE ENGINE
  // ============================================
  function initVynkThemingEngine() {
    const phone = document.getElementById('phone');
    if (!phone) return;

    const ICONS = {
      mapPin:   window.VYNK.path('mapPin'),
      clock:    window.VYNK.path('clock'),
      book:     window.VYNK.path('book'),
      truck:    window.VYNK.path('truck'),
      star:     window.VYNK.path('star'),
      user:     window.VYNK.path('user'),
      share:    window.VYNK.path('share'),
      briefcase: window.VYNK.path('briefcase'),
      chev:     window.VYNK.path('chev')
    };

    function svg(name) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
    }

    function hexToRgb(hex) {
      hex = hex.replace('#','');
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const n = parseInt(hex, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function rgbToHex(r, g, b) {
      return '#' + [r, g, b].map(v => {
        v = Math.max(0, Math.min(255, Math.round(v)));
        return v.toString(16).padStart(2, '0');
      }).join('');
    }

    function mix(hexA, hexB, t) {
      const a = hexToRgb(hexA), b = hexToRgb(hexB);
      return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
    }

    function luminance(hex) {
      const { r, g, b } = hexToRgb(hex);
      const chan = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
    }

    function textColorFor(bgHex) {
      return luminance(bgHex) > 0.42 ? '#171620' : '#F5F3EF';
    }

    function dist(hexA, hexB) {
      const a = hexToRgb(hexA), b = hexToRgb(hexB);
      return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
    }

    function generateTheme(raw) {
      const primary = raw[0];
      const secondary = raw[1] || mix(primary, '#FFFFFF', 0.35);
      const background = mix(primary, '#14131A', 0.87);
      const surface = mix(primary, '#201F26', 0.90);
      return {
        primary, secondary, background, surface,
        onBg: textColorFor(background),
        onBgMuted: mix(textColorFor(background), background, 0.42),
        onPrimary: textColorFor(primary)
      };
    }

    const SAMPLES = [
      { id: 'taqueria', type: 'negocio', name: 'Cristina Restaurante', tag: 'Tacos al pastor y desayunos', raw: ['#C2410C', '#FBBF24'] },
      { id: 'clinica',  type: 'negocio', name: 'Dra. Ibarra', tag: 'Consultorio de nutrición clínica', raw: ['#0F766E', '#5EEAD4'] },
      { id: 'foto',     type: 'negocio', name: 'Estudio Nocturno', tag: 'Fotografía de retrato y producto', raw: ['#D4AF37', '#4B4B52'] },
      { id: 'personal', type: 'personal', name: 'Paolo G.', tag: 'Desarrollador · diseño de producto', raw: ['#4338CA', '#818CF8'] }
    ];

    const BLOCKS = {
      personal: [
        { id: 'contact',   label: 'Guardar contacto', hint: 'vCard interactiva con foto y datos', icon: 'user' },
        { id: 'social',    label: 'Redes sociales',   hint: 'Instagram, Facebook, TikTok, LinkedIn', icon: 'share' },
        { id: 'portfolio', label: 'Portafolio & Galería', hint: 'Muestra tus mejores proyectos y trabajos', icon: 'briefcase' },
        { id: 'location',  label: 'Ubicación / Dirección', hint: 'Mapa interactivas y coordenadas GPS', icon: 'mapPin' },
        { id: 'menu',      label: 'Servicios & Lista', hint: 'Servicios, menú o publicaciones', icon: 'book' },
        { id: 'reviews',   label: 'Reseñas & Puntuación', hint: 'Google Maps y recomendaciones', icon: 'star' }
      ],
      negocio: [
        { id: 'location', label: 'Sucursales (Ubicaciones)', hint: 'Dirección física + mapas integrados', icon: 'mapPin' },
        { id: 'menu',     label: 'Menú Digital / Catálogo', hint: 'Platillos, cortes o productos', icon: 'book' },
        { id: 'delivery', label: 'Botones Delivery', hint: 'Uber Eats, Rappi, Didi Food', icon: 'truck' },
        { id: 'reviews',  label: 'Reseñas & Google Rating', hint: 'Calificación de clientes y opiniones', icon: 'star' },
        { id: 'hours',    label: 'Horario de Atención', hint: 'Días y horas de servicio', icon: 'clock' },
        { id: 'contact',  label: 'Guardar contacto vCard', hint: 'Descarga directa de contacto al celular', icon: 'user' },
        { id: 'social',   label: 'Redes Sociales de Marca', hint: 'Instagram, Facebook, YouTube', icon: 'share' },
        { id: 'portfolio', label: 'Galería de Productos', hint: 'Fotos de la sucursal y platillos', icon: 'briefcase' }
      ]
    };
    const DEFAULT_BLOCKS = { personal: ['contact', 'social', 'portfolio'], negocio: ['location', 'menu', 'delivery', 'reviews', 'hours'] };

    const state = {
      cardType: 'negocio',
      sampleId: 'taqueria',
      uploadedRaw: null,
      name: 'Cristina Restaurante',
      tag: 'Tacos al pastor y desayunos',
      socialWa: '',
      socialIg: '',
      socialWeb: '',
      activeBlocks: new Set(DEFAULT_BLOCKS.negocio)
    };

    function currentRaw() {
      if (state.uploadedRaw) return state.uploadedRaw;
      const s = SAMPLES.find(s => s.id === state.sampleId);
      return s ? s.raw : ['#C2410C', '#FBBF24'];
    }

    function applyThemeToDOM() {
      const t = generateTheme(currentRaw());
      let bg = t.background;
      let primary = t.primary;

      if (state.bgMode === 'custom_color') {
        bg = state.customBg || '#0F0B1E';
        primary = state.customAccent || '#7C3AED';
      }

      phone.style.setProperty('--card-bg', bg);
      phone.style.setProperty('--card-surface', t.surface);
      phone.style.setProperty('--card-primary', primary);
      phone.style.setProperty('--card-secondary', t.secondary);
      phone.style.setProperty('--card-text', textColorFor(bg));
      phone.style.setProperty('--card-text-muted', mix(textColorFor(bg), bg, 0.42));
      phone.style.setProperty('--card-on-primary', textColorFor(primary));
      return t;
    }

    function initials(name) {
      return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '—';
    }

    state.blockData = state.blockData || {
      location: { titulo: 'Sucursal 1: Centro — Teziutlán', query: 'Allende 603 Centro Teziutlan Puebla', telefono: '+52 231 312 2032' },
      menu: { titulo: 'Menú Digital & Carta Completa', descripcion: 'Tacos al pastor, parrilladas y antojitos típicos' },
      social: { ig: '@cristina_taqueria', fb: 'cristinataqueria', wa: '+52 231 130 2033', spotify: '' },
      delivery: { uber: 'https://ubereats.com', rappi: 'https://rappi.com' },
      reviews: { rating: '4.9 ★★★★★ (180 reseñas en Google)' },
      hours: { texto: 'Lunes a Domingo: 8:00 AM - 11:00 PM' }
    };

    const bgModeSelect = document.getElementById('create-perfil-bg-mode');
    const customPickerWrap = document.getElementById('custom-color-picker-wrap');
    if (bgModeSelect && customPickerWrap) {
      bgModeSelect.addEventListener('change', e => {
        state.bgMode = e.target.value;
        customPickerWrap.classList.toggle('hidden', state.bgMode !== 'custom_color');
        fullRender();
      });
    }

    const customBgInput = document.getElementById('create-perfil-custom-bg');
    const customAccentInput = document.getElementById('create-perfil-custom-accent');
    if (customBgInput) customBgInput.addEventListener('input', e => { state.customBg = e.target.value; fullRender(); });
    if (customAccentInput) customAccentInput.addEventListener('input', e => { state.customAccent = e.target.value; fullRender(); });

    function renderIdentity() {
      const pAvatar = document.getElementById('pAvatar');
      const pName = document.getElementById('pName');
      const pTag = document.getElementById('pTag');
      const pBadge = document.getElementById('pBadge');
      const pSocial = document.getElementById('pSocialLinks');

      if (pAvatar) pAvatar.textContent = initials(state.name);
      if (pName) pName.textContent = state.name || 'Tu nombre';
      if (pTag) pTag.textContent = state.tag || '';
      if (pBadge) pBadge.textContent = state.cardType;

      if (pSocial) {
        let html = '';
        const sData = state.blockData.social || {};
        if (state.socialWa || sData.wa) html += `<div style="width:32px;height:32px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;color:#FFF"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></div>`;
        if (state.socialIg || sData.ig) html += `<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(45deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);display:flex;align-items:center;justify-content:center;color:#FFF"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></div>`;
        if (state.socialWeb) html += `<div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;color:#FFF"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg></div>`;
        pSocial.innerHTML = html;
      }
    }

    function renderBlocksPreview() {
      const list = BLOCKS[state.cardType].filter(b => state.activeBlocks.has(b.id));
      const primaryCtaWrap = document.getElementById('pPrimaryCta');
      const listWrap = document.getElementById('pListBlocks');
      if (!listWrap || !primaryCtaWrap) return;
      listWrap.innerHTML = '';
      primaryCtaWrap.innerHTML = '';

      if (list.length === 0) return;
      const [first, ...rest] = list;
      primaryCtaWrap.innerHTML = `<div class="primary-cta">${svg(first.icon)}${first.label}</div>`;

      rest.forEach(b => {
        const row = document.createElement('div');
        row.className = 'list-block';

        if (b.id === 'location') {
          const locData = state.blockData.location || {};
          const query = locData.query || 'Teziutlan Puebla';
          row.innerHTML = `
            <div style="width:100%">
              <div style="font-weight:700;font-size:0.85rem;margin-bottom:6px;display:flex;align-items:center;gap:6px">📍 ${locData.titulo || 'Nuestra Ubicación'}</div>
              <iframe width="100%" height="90" style="border:0;border-radius:10px;margin-bottom:6px" loading="lazy" src="https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed"></iframe>
            </div>`;
        } else {
          row.innerHTML = `
            <div class="list-icon">${svg(b.icon)}</div>
            <div class="list-text">
              <div class="l-label">${b.label}</div>
              <div class="l-hint">${b.hint}</div>
            </div>
            <div class="list-chev">${svg('chev')}</div>`;
        }
        listWrap.appendChild(row);
      });
    }

    function renderChecklist() {
      const wrap = document.getElementById('blocksList');
      if (!wrap) return;
      wrap.innerHTML = '';
      BLOCKS[state.cardType].forEach(b => {
        const checked = state.activeBlocks.has(b.id);
        const container = document.createElement('div');
        container.style.cssText = 'background:rgba(255,255,255,0.03);border:1px solid var(--panel-border);border-radius:12px;margin-bottom:10px;padding:12px;overflow:hidden';

        let fieldsHtml = '';
        if (b.id === 'location') {
          const d = state.blockData.location || {};
          fieldsHtml = `
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;gap:8px">
              <input type="text" data-block-id="location" data-key="titulo" placeholder="Nombre Sucursal (Ej. Sucursal Centro)" value="${d.titulo || ''}" style="padding:8px 10px;font-size:0.82rem;border-radius:6px;background:#08080E;color:#FFF;border:1px solid var(--panel-border)">
              <input type="text" data-block-id="location" data-key="query" placeholder="Dirección / Google Maps Query (Ej. Allende 603 Teziutlan)" value="${d.query || ''}" style="padding:8px 10px;font-size:0.82rem;border-radius:6px;background:#08080E;color:#FFF;border:1px solid var(--panel-border)">
            </div>`;
        } else if (b.id === 'menu') {
          const d = state.blockData.menu || {};
          fieldsHtml = `
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;gap:8px">
              <input type="text" data-block-id="menu" data-key="titulo" placeholder="Título del Menú (Ej. Menú Digital & Carta)" value="${d.titulo || ''}" style="padding:8px 10px;font-size:0.82rem;border-radius:6px;background:#08080E;color:#FFF;border:1px solid var(--panel-border)">
              <input type="text" data-block-id="menu" data-key="descripcion" placeholder="Descripción de platillos o especialidades" value="${d.descripcion || ''}" style="padding:8px 10px;font-size:0.82rem;border-radius:6px;background:#08080E;color:#FFF;border:1px solid var(--panel-border)">
            </div>`;
        } else if (b.id === 'social') {
          const d = state.blockData.social || {};
          fieldsHtml = `
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;gap:8px">
              <input type="text" data-block-id="social" data-key="ig" placeholder="Instagram (@usuario)" value="${d.ig || ''}" style="padding:8px 10px;font-size:0.82rem;border-radius:6px;background:#08080E;color:#FFF;border:1px solid var(--panel-border)">
              <input type="text" data-block-id="social" data-key="fb" placeholder="Facebook URL / Página" value="${d.fb || ''}" style="padding:8px 10px;font-size:0.82rem;border-radius:6px;background:#08080E;color:#FFF;border:1px solid var(--panel-border)">
              <input type="text" data-block-id="social" data-key="spotify" placeholder="Spotify Track / Artist URL" value="${d.spotify || ''}" style="padding:8px 10px;font-size:0.82rem;border-radius:6px;background:#08080E;color:#FFF;border:1px solid var(--panel-border)">
            </div>`;
        }

        container.innerHTML = `
          <label class="block-row" style="margin:0;padding:0;cursor:pointer">
            <input type="checkbox" data-block="${b.id}" ${checked ? 'checked' : ''}/>
            <div class="block-icon">${svg(b.icon)}</div>
            <div class="block-text">
              <div class="b-label" style="font-weight:700">${b.label}</div>
              <div class="b-hint">${b.hint}</div>
            </div>
          </label>
          ${checked ? fieldsHtml : ''}`;

        wrap.appendChild(container);
      });

      wrap.querySelectorAll('input[type=checkbox]').forEach(cb => {
        cb.addEventListener('change', e => {
          const id = e.target.getAttribute('data-block');
          if (e.target.checked) state.activeBlocks.add(id); else state.activeBlocks.delete(id);
          renderChecklist();
          renderBlocksPreview();
          renderSchema();
        });
      });

      wrap.querySelectorAll('input[data-block-id]').forEach(inp => {
        inp.addEventListener('input', e => {
          const bId = e.target.getAttribute('data-block-id');
          const key = e.target.getAttribute('data-key');
          if (!state.blockData[bId]) state.blockData[bId] = {};
          state.blockData[bId][key] = e.target.value;
          renderBlocksPreview();
          renderSchema();
        });
      });
    }

    function renderSamples() {
      const wrap = document.getElementById('samplesWrap');
      if (!wrap) return;
      wrap.innerHTML = '';
      SAMPLES.forEach(s => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sample-btn' + (!state.uploadedRaw && s.id === state.sampleId ? ' active' : '');
        btn.style.background = `linear-gradient(135deg, ${s.raw[0]}, ${s.raw[1] || s.raw[0]})`;
        btn.textContent = initials(s.name);
        btn.title = s.name;
        btn.addEventListener('click', () => {
          state.uploadedRaw = null;
          state.sampleId = s.id;
          state.cardType = s.type;
          state.name = s.name;
          state.tag = s.tag;
          state.activeBlocks = new Set(DEFAULT_BLOCKS[s.type]);
          const note = document.getElementById('uploadNote');
          if (note) note.textContent = '';
          const inputName = document.getElementById('create-perfil-nombre');
          const inputTag = document.getElementById('create-perfil-bio');
          if (inputName) inputName.value = state.name;
          if (inputTag) inputTag.value = state.tag;
          syncSegmented();
          fullRender();
        });
        wrap.appendChild(btn);
      });
    }

    function syncSegmented() {
      const btnP = document.getElementById('btnPersonal');
      const btnN = document.getElementById('btnNegocio');
      if (btnP) btnP.classList.toggle('active', state.cardType === 'personal');
      if (btnN) btnN.classList.toggle('active', state.cardType === 'negocio');
    }

    function renderPalette() {
      const t = generateTheme(currentRaw());
      const strip = document.getElementById('paletteStrip');
      const meta = document.getElementById('paletteMeta');
      if (!strip || !meta) return;
      strip.innerHTML = '';
      [t.primary, t.secondary, t.background].forEach(c => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.style.background = c;
        chip.title = c;
        strip.appendChild(chip);
      });
      meta.innerHTML = `<b>${t.primary}</b> · <b>${t.secondary}</b> · fondo <b>${t.background}</b> — generado automáticamente`;
    }

    function renderSchema() {
      const t = generateTheme(currentRaw());
      const blocks = BLOCKS[state.cardType]
        .filter(b => state.activeBlocks.has(b.id))
        .map(b => `    { "type": "${b.id}", "icon": "auto" }`)
        .join(',\n');
      const json =
`{
  "card_type": "${state.cardType}",
  "theme": {
    "source": "${state.uploadedRaw ? 'logo_upload' : 'sample_logo'}",
    "primary": "${t.primary}",
    "secondary": "${t.secondary}",
    "background": "${t.background}",
    "text": "auto_contrast"
  },
  "blocks": [
${blocks || '    // ninguno seleccionado'}
  ]
}`;
      const pre = document.getElementById('schemaPre');
      if (pre) pre.textContent = json;
    }

    function fullRender() {
      applyThemeToDOM();
      renderIdentity();
      renderChecklist();
      renderBlocksPreview();
      renderSamples();
      renderPalette();
      renderSchema();
    }

    // Events
    const btnP = document.getElementById('btnPersonal');
    const btnN = document.getElementById('btnNegocio');
    if (btnP) btnP.addEventListener('click', () => {
      state.cardType = 'personal';
      state.activeBlocks = new Set(DEFAULT_BLOCKS.personal);
      syncSegmented(); fullRender();
    });
    if (btnN) btnN.addEventListener('click', () => {
      state.cardType = 'negocio';
      state.activeBlocks = new Set(DEFAULT_BLOCKS.negocio);
      syncSegmented(); fullRender();
    });

    const inputName = document.getElementById('create-perfil-nombre');
    const inputTag = document.getElementById('create-perfil-bio');
    const inputWa = document.getElementById('create-perfil-wa');
    const inputIg = document.getElementById('create-perfil-ig');
    const inputWeb = document.getElementById('create-perfil-web');

    if (inputName) inputName.addEventListener('input', e => {
      state.name = e.target.value; renderIdentity(); renderSchema();
    });
    if (inputTag) inputTag.addEventListener('input', e => {
      state.tag = e.target.value; renderIdentity();
    });
    if (inputWa) inputWa.addEventListener('input', e => {
      state.socialWa = e.target.value; renderIdentity();
    });
    if (inputIg) inputIg.addEventListener('input', e => {
      state.socialIg = e.target.value; renderIdentity();
    });
    if (inputWeb) inputWeb.addEventListener('input', e => {
      state.socialWeb = e.target.value; renderIdentity();
    });

    const schemaToggle = document.getElementById('schemaToggle');
    if (schemaToggle) schemaToggle.addEventListener('click', () => {
      const sb = document.getElementById('schemaBlock');
      if (sb) sb.classList.toggle('show');
    });

    // Upload & color extraction
    function extractColors(img) {
      const size = 48;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      let data;
      try { data = ctx.getImageData(0, 0, size, size).data; }
      catch(e) { return null; }

      const buckets = {};
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
        if (a < 128) continue;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        if (sat < 0.18) continue;
        const key = [Math.round(r/24)*24, Math.round(g/24)*24, Math.round(b/24)*24].join(',');
        buckets[key] = (buckets[key] || 0) + 1;
      }
      const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
      if (sorted.length === 0) return null;
      const top = sorted.slice(0, 8).map(([k]) => {
        const [r, g, b] = k.split(',').map(Number);
        return rgbToHex(r, g, b);
      });
      const distinct = [];
      for (const c of top) {
        if (distinct.every(d => dist(d, c) > 55)) distinct.push(c);
        if (distinct.length >= 3) break;
      }
      return distinct.length ? distinct : top.slice(0, 2);
    }

    function handleFile(file) {
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          const colors = extractColors(img);
          const note = document.getElementById('uploadNote');
          if (colors && colors.length) {
            state.uploadedRaw = colors;
            if (note) note.textContent = 'Colores extraídos: ' + colors.join(' · ');
          } else {
            state.uploadedRaw = ['#6D6875', '#B5A8B0'];
            if (note) note.textContent = 'No se detectaron colores dominantes claros — se usó una paleta neutra.';
          }
          if (inputName) inputName.value = state.name = state.cardType === 'negocio' ? 'Tu Negocio' : 'Tu Nombre';
          if (inputTag) inputTag.value = state.tag = 'Descripción corta aquí';
          document.querySelectorAll('.sample-btn').forEach(b => b.classList.remove('active'));
          fullRender();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }

    const dz = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    if (dz && fileInput) {
      dz.addEventListener('click', () => fileInput.click());
      dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
      fileInput.addEventListener('change', e => handleFile(e.target.files[0]));
      ['dragover', 'dragenter'].forEach(evt => dz.addEventListener(evt, e => { e.preventDefault(); dz.classList.add('drag'); }));
      ['dragleave', 'drop'].forEach(evt => dz.addEventListener(evt, e => { e.preventDefault(); dz.classList.remove('drag'); }));
      dz.addEventListener('drop', e => { handleFile(e.dataTransfer.files[0]); });
    }

    // Init values
    if (inputName) inputName.value = state.name;
    if (inputTag) inputTag.value = state.tag;
    fullRender();
  }

  document.addEventListener('DOMContentLoaded', initVynkThemingEngine);
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initVynkThemingEngine();
  }
})();
