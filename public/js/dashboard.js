// ============================================
// TarjetaDigital — Dashboard (dashboard.js)
// ============================================

(function () {
  'use strict';

  if (!checkAuth()) return;

  // --- User info ---
  const user = getUser();
  const userNameEl = document.getElementById('user-name');
  if (user && userNameEl) {
    userNameEl.textContent = user.nombre || '';
  }

  // --- Logout ---
  document.getElementById('btn-logout').addEventListener('click', logout);

  // --- FAB ---
  document.getElementById('fab-new').addEventListener('click', () => {
    location.href = 'editor.html';
  });

  // --- Delete modal ---
  let deletePerfilId = null;
  const modalDelete = document.getElementById('modal-delete');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');

  function showDeleteModal(id) {
    deletePerfilId = id;
    modalDelete.classList.remove('hidden');
  }

  function hideDeleteModal() {
    deletePerfilId = null;
    modalDelete.classList.add('hidden');
  }

  btnCancelDelete.addEventListener('click', hideDeleteModal);

  // Close modal on overlay click
  modalDelete.addEventListener('click', (e) => {
    if (e.target === modalDelete) hideDeleteModal();
  });

  btnConfirmDelete.addEventListener('click', async () => {
    if (!deletePerfilId) return;

    btnConfirmDelete.classList.add('loading');
    btnConfirmDelete.disabled = true;

    const data = await api('/perfiles/' + deletePerfilId, { method: 'DELETE' });

    btnConfirmDelete.classList.remove('loading');
    btnConfirmDelete.disabled = false;

    if (data && !data.error) {
      showToast('Tarjeta eliminada', 'success');
      hideDeleteModal();
      loadPerfiles();
    }
  });

  // --- Load profiles ---
  async function loadPerfiles() {
    const grid = document.getElementById('profile-grid');
    const emptyState = document.getElementById('empty-state');
    const totalPerfiles = document.getElementById('total-perfiles');
    const totalVisitas = document.getElementById('total-visitas');
    const upgradeBanner = document.getElementById('upgrade-banner');

    const data = await api('/perfiles', { method: 'GET' });

    if (!data || data.error) return;

    const perfiles = data.perfiles || data || [];

    // Update stats
    totalPerfiles.textContent = perfiles.length;
    const visitas = perfiles.reduce((sum, p) => sum + (p.visitas || 0), 0);
    totalVisitas.textContent = visitas;

    // Empty state
    if (perfiles.length === 0) {
      grid.classList.add('hidden');
      emptyState.classList.remove('hidden');
      upgradeBanner.classList.add('hidden');
      return;
    }

    grid.classList.remove('hidden');
    emptyState.classList.add('hidden');

    // Upgrade banner (free plan with 1+ profiles)
    if (user && user.plan === 'free' && perfiles.length >= 1) {
      upgradeBanner.classList.remove('hidden');
    } else {
      upgradeBanner.classList.add('hidden');
    }

    // Render profile cards
    grid.innerHTML = perfiles.map(perfil => {
      const color = perfil.color || '#6C63FF';
      const initials = getInitials(perfil.nombre_perfil);
      const avatarHTML = perfil.foto_url
        ? `<div class="avatar avatar-md"><img src="${perfil.foto_url}" alt="${perfil.nombre_perfil}"></div>`
        : `<div class="avatar avatar-md" style="background:${color}">${initials}</div>`;

      return `
        <div class="profile-card card" data-id="${perfil.id}">
          <div class="color-stripe" style="background:${color}"></div>
          <div class="profile-info">
            ${avatarHTML}
            <div class="info-text">
              <h4>${escapeHTML(perfil.nombre_perfil)}</h4>
              <span class="badge">${perfil.tipo || 'personal'}</span>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span class="text-muted text-sm">👁️ ${perfil.visitas || 0} visitas</span>
            <div class="profile-actions">
              <button class="btn btn-sm btn-secondary" onclick="location.href='editor.html?id=${perfil.id}'" title="Editar">✏️</button>
              <button class="btn btn-sm btn-primary" onclick="location.href='compartir.html?slug=${perfil.slug}'" title="Compartir">🔗</button>
              <button class="btn btn-sm btn-danger" onclick="window._deletePerfil(${perfil.id})" title="Eliminar">🗑️</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Expose delete function
  window._deletePerfil = showDeleteModal;

  // --- Helpers ---
  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Init ---
  loadPerfiles();
})();
