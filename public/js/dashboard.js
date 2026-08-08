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
  document.getElementById('fab-new').addEventListener('click', function() {
    location.href = '/editor.html';
  });

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
          '<a href="/u/' + p.slug + '" class="btn btn-icon btn-sm" onclick="event.stopPropagation()" target="_blank" title="Ver perfil">👁</a>' +
          '<a href="/analytics.html?id=' + p.id + '" class="btn btn-icon btn-sm" onclick="event.stopPropagation()" title="Analíticas">📊</a>' +
          '<a href="/compartir.html?id=' + p.id + '&slug=' + p.slug + '" class="btn btn-icon btn-sm" onclick="event.stopPropagation()" title="Compartir">↗</a>' +
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
})();
