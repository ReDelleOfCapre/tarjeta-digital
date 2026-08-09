// ============================================
// VYNK — Admin Master Client Logic (admin.js)
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const adminLoginForm = document.getElementById('admin-login-form');
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const keyInput = document.getElementById('admin-key').value;
      const errorBox = document.getElementById('error-box');
      const btnSubmit = document.getElementById('btn-submit');

      if (errorBox) errorBox.style.display = 'none';
      if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = 'Verificando...'; }

      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: keyInput })
        });
        
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Acceso denegado.');
        }

        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('token', data.token);
        if (data.usuario) {
          localStorage.setItem('user', JSON.stringify(data.usuario));
        }

        window.location.href = '/admin.html';
      } catch (err) {
        if (errorBox) {
          errorBox.textContent = err.message;
          errorBox.style.display = 'block';
        }
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Desbloquear Panel';
        }
      }
    });
  }

  // Admin Dashboard View Handler
  const adminDashboard = document.getElementById('admin-dashboard-container') || document.querySelector('.stats-grid');
  if (adminDashboard) {
    loadAdminDashboard();
  }

  // Pure Event Delegation for Admin Actions
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');

    if (action === 'admin-logout') {
      api('/auth/logout', { method: 'POST' }).catch(function(){});
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/admin-login.html';
    } else if (action === 'export-csv') {
      exportUsersCsv();
    } else if (action === 'filter-users') {
      filterUsersTable();
    } else if (action === 'close-modal-perfiles') {
      closePerfilesModal();
    }
  });
});

async function loadAdminDashboard() {
  try {
    const statsRes = await api('/api/admin/stats');
    if (statsRes && statsRes.error) {
      window.location.href = '/admin-login.html';
      return;
    }

    if (statsRes.usuarios) {
      const uStat = document.getElementById('stat-users');
      const pStat = document.getElementById('stat-pro');
      const rStat = document.getElementById('stat-revenue');
      if (uStat) uStat.textContent = statsRes.usuarios.total;
      if (pStat) pStat.textContent = statsRes.usuarios.paid;
      if (rStat) rStat.textContent = '$' + (statsRes.ingresos || 0);
    }

    const paymentsRes = await api('/api/admin/pagos');
    const tbodyPayments = document.querySelector('#payments-table tbody');
    if (paymentsRes && paymentsRes.pagos && tbodyPayments) {
      const pendingStat = document.getElementById('stat-pending');
      if (pendingStat) pendingStat.textContent = paymentsRes.pagos.length;

      tbodyPayments.innerHTML = paymentsRes.pagos.length === 0 
        ? '<tr><td colspan="6" style="text-align:center;padding:16px">No hay pagos pendientes</td></tr>' 
        : paymentsRes.pagos.map(p => `
          <tr>
            <td>${new Date(p.fecha_solicitud).toLocaleDateString()}</td>
            <td>${escapeHtml(p.usuario_nombre)}</td>
            <td>${escapeHtml(p.usuario_telefono)}</td>
            <td>${escapeHtml(p.plan.toUpperCase())}</td>
            <td>$${p.monto}</td>
            <td>
              <button class="btn-sm btn-view" onclick="window.open('${escapeHtml(p.comprobante_url)}', '_blank')">Ver Recibo</button>
              <button class="btn-sm btn-approve" onclick="approvePayment(${p.id}, '${p.plan}')">Aprobar</button>
              <button class="btn-sm btn-reject" onclick="rejectPayment(${p.id})">Rechazar</button>
            </td>
          </tr>
        `).join('');
    }

    const usersRes = await api('/api/admin/usuarios');
    const tbodyUsers = document.querySelector('#users-table tbody');
    if (usersRes && usersRes.usuarios && tbodyUsers) {
      tbodyUsers.innerHTML = usersRes.usuarios.map(u => `
        <tr>
          <td>${u.id}</td>
          <td>${escapeHtml(u.nombre)}</td>
          <td>${escapeHtml(u.telefono)}</td>
          <td><span class="badge ${u.plan}">${u.plan.toUpperCase()}</span></td>
          <td>${u.plan_expira ? new Date(u.plan_expira).toLocaleDateString() : '-'}</td>
          <td>${u.total_perfiles}</td>
          <td>
            <button class="btn-sm btn-view" onclick="verPerfiles(${u.id}, '${escapeHtml(u.nombre)}')">Ver Tarjetas</button>
            <button class="btn-sm" style="background:#8B5CF6; color:white;" onclick="adminResetPassword(${u.id}, '${escapeHtml(u.nombre)}')">🔑 Pass</button>
            <button class="btn-sm btn-toggle" onclick="togglePlan(${u.id}, '${u.plan === 'paid' ? 'free' : 'paid'}')">
              Hacer ${u.plan === 'paid' ? 'Free' : 'Pro'}
            </button>
            ${u.plan === 'free' ? `<button class="btn-sm" style="background:#06B6D4; color:white;" onclick="resetQuota(${u.id})">Recargar Energía</button>` : ''}
          </td>
        </tr>
      `).join('');
    }

  } catch (err) {
    console.error('Error al cargar dashboard admin:', err);
    window.location.href = '/admin-login.html';
  }
}

async function approvePayment(pagoId, plan) {
  if (!confirm('¿Aprobar pago y actualizar usuario a ' + plan.toUpperCase() + '?')) return;
  try {
    const res = await api(`/api/admin/pagos/${pagoId}/aprobar`, { method: 'POST' });
    if (res.ok) {
      alert('Pago aprobado con éxito.');
      loadAdminDashboard();
    } else {
      alert('Error: ' + (res.error || 'No se pudo aprobar'));
    }
  } catch (e) { alert('Error de conexión'); }
}

async function rejectPayment(pagoId) {
  const motivo = prompt('Motivo del rechazo:');
  if (!motivo) return;
  try {
    const res = await api(`/api/admin/pagos/${pagoId}/rechazar`, {
      method: 'POST',
      body: JSON.stringify({ motivo })
    });
    if (res.ok) {
      alert('Pago rechazado.');
      loadAdminDashboard();
    } else {
      alert('Error: ' + (res.error || 'No se pudo rechazar'));
    }
  } catch (e) { alert('Error de conexión'); }
}

async function togglePlan(userId, newPlan) {
  if (!confirm(`¿Cambiar plan del usuario a ${newPlan.toUpperCase()}?`)) return;
  try {
    const res = await api(`/api/admin/usuarios/${userId}/plan`, {
      method: 'POST',
      body: JSON.stringify({ plan: newPlan, dias: 30 })
    });
    if (res.ok) {
      loadAdminDashboard();
    } else {
      alert('Error: ' + (res.error || 'No se pudo actualizar'));
    }
  } catch (e) { alert('Error de conexión'); }
}

async function resetQuota(userId) {
  try {
    const res = await api(`/api/admin/usuarios/${userId}/reset-quota`, { method: 'POST' });
    if (res.ok) {
      alert('Energía recargada a 10 acciones.');
      loadAdminDashboard();
    } else {
      alert('Error: ' + (res.error || 'No se pudo reiniciar'));
    }
  } catch (e) { alert('Error de conexión'); }
}

async function adminResetPassword(userId, nombre) {
  const newPass = prompt(`Nueva contraseña para ${nombre}:`);
  if (!newPass) return;
  try {
    const res = await api(`/api/admin/usuarios/${userId}/password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword: newPass })
    });
    if (res.ok) {
      alert('Contraseña actualizada correctamente.');
    } else {
      alert('Error: ' + (res.error || 'No se pudo actualizar'));
    }
  } catch (e) { alert('Error de conexión'); }
}

async function verPerfiles(userId, nombre) {
  const title = document.getElementById('modal-perfiles-title');
  const list = document.getElementById('modal-perfiles-list');
  const modal = document.getElementById('modal-perfiles');
  if (title) title.textContent = `Tarjetas de ${nombre}`;
  if (list) list.innerHTML = '<p>Cargando tarjetas...</p>';
  if (modal) modal.classList.add('active');

  try {
    const res = await api(`/api/admin/usuarios/${userId}/perfiles`);
    if (res && res.perfiles && res.perfiles.length > 0 && list) {
      list.innerHTML = res.perfiles.map(p => `
        <div class="perfil-item" id="perfil-item-${p.id}" style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid rgba(255,255,255,0.08)">
          <div>
            <strong>/u/${escapeHtml(p.slug)}</strong><br>
            <span style="font-size:0.8rem; color:#9CA3AF">${p.visitas} visitas | ${p.total_campos} bloques</span>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn-sm btn-view" onclick="window.open('/u/${escapeHtml(p.slug)}', '_blank')">Abrir</button>
            <button class="btn-sm btn-reject" onclick="deletePerfilAdmin(${p.id})">Eliminar</button>
          </div>
        </div>
      `).join('');
    } else if (list) {
      list.innerHTML = '<p>Este usuario no tiene tarjetas creadas.</p>';
    }
  } catch(e) {
    if (list) list.innerHTML = '<p>Error al cargar tarjetas.</p>';
  }
}

function closePerfilesModal() {
  const modal = document.getElementById('modal-perfiles');
  if (modal) modal.classList.remove('active');
}

async function deletePerfilAdmin(perfilId) {
  if(!confirm('¿Seguro que deseas eliminar permanentemente esta tarjeta digital? Esta acción no se puede deshacer.')) return;
  try {
    const res = await api(`/api/admin/perfiles/${perfilId}`, { method: 'DELETE' });
    if(res && res.ok) {
      const item = document.getElementById(`perfil-item-${perfilId}`);
      if (item) item.remove();
      loadAdminDashboard(); 
    } else {
      alert('Error: ' + (res.error || 'No se pudo eliminar'));
    }
  } catch(e) { alert('Error de conexión'); }
}

function filterUsersTable() {
  const filterVal = prompt('Filtrar usuarios por nombre o teléfono:');
  if (!filterVal) return;
  const rows = document.querySelectorAll('#users-table tbody tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(filterVal.toLowerCase()) ? '' : 'none';
  });
}

function exportUsersCsv() {
  const rows = Array.from(document.querySelectorAll('#users-table tr'));
  const csvContent = "data:text/csv;charset=utf-8," 
    + rows.map(r => Array.from(r.querySelectorAll('th,td')).map(c => `"${c.textContent.trim()}"`).join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'usuarios_vynk.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
