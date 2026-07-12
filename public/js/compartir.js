// ============================================
// TarjetaDigital — Compartir (compartir.js)
// ============================================

(function () {
  'use strict';

  if (!checkAuth()) return;

  // --- Get slug from URL ---
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  if (!slug) {
    showToast('No se encontró la tarjeta', 'error');
    setTimeout(() => location.href = 'dashboard.html', 1000);
    return;
  }

  // --- DOM refs ---
  const shareNombre = document.getElementById('share-nombre');
  const shareTipo = document.getElementById('share-tipo');
  const qrImg = document.getElementById('qr-img');
  const shareUrlEl = document.getElementById('share-url');
  const btnCopy = document.getElementById('btn-copy');
  const btnCopyLink = document.getElementById('btn-copy-link');
  const btnWa = document.getElementById('btn-wa');
  const btnDownloadQr = document.getElementById('btn-download-qr');
  const btnView = document.getElementById('btn-view');

  // --- Build URL ---
  const profileUrl = location.origin + '/u/' + slug;

  // --- Set values ---
  // Try to get info from URL params first, then fetch
  const nombre = params.get('nombre');
  const tipo = params.get('tipo');

  if (nombre) {
    shareNombre.textContent = nombre;
  }
  if (tipo) {
    shareTipo.textContent = tipo;
  }

  // If no name/tipo in params, try fetching
  if (!nombre || !tipo) {
    loadProfileInfo();
  }

  async function loadProfileInfo() {
    const data = await api('/perfiles/slug/' + slug, { method: 'GET' });
    if (data && !data.error) {
      const perfil = data.perfil || data;
      shareNombre.textContent = perfil.nombre_perfil || slug;
      shareTipo.textContent = perfil.tipo || 'personal';
    } else {
      shareNombre.textContent = slug;
      shareTipo.textContent = 'Tarjeta';
    }
  }

  // --- QR code ---
  qrImg.src = '/api/perfiles/' + slug + '/qr';
  qrImg.onerror = () => {
    qrImg.alt = 'No se pudo cargar el QR';
  };

  // --- Share URL display ---
  shareUrlEl.textContent = profileUrl;

  // --- View link ---
  btnView.href = '/u/' + slug;

  // --- Copy URL ---
  function copyUrl() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(profileUrl).then(() => {
        showToast('¡Enlace copiado!', 'success');
      }).catch(() => {
        fallbackCopy();
      });
    } else {
      fallbackCopy();
    }
  }

  function fallbackCopy() {
    const textarea = document.createElement('textarea');
    textarea.value = profileUrl;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('¡Enlace copiado!', 'success');
    } catch (e) {
      showToast('No se pudo copiar el enlace', 'error');
    }
    document.body.removeChild(textarea);
  }

  btnCopy.addEventListener('click', copyUrl);
  btnCopyLink.addEventListener('click', copyUrl);

  // --- WhatsApp share ---
  btnWa.addEventListener('click', () => {
    const text = encodeURIComponent('Mira mi tarjeta digital: ' + profileUrl);
    window.open('https://wa.me/?text=' + text, '_blank');
  });

  // --- Download QR ---
  btnDownloadQr.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/perfiles/' + slug + '/qr');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tarjeta-' + slug + '-qr.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('QR descargado', 'success');
    } catch (e) {
      showToast('Error al descargar el QR', 'error');
    }
  });
})();
