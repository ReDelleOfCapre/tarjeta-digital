// ============================================
// TarjetaDigital — Editor (editor.js)
// ============================================

(function () {
  'use strict';

  if (!checkAuth()) return;

  // --- State ---
  let currentStep = 1;
  const totalSteps = 4;
  let perfilId = null;
  let perfilData = {
    nombre_perfil: '',
    tipo: 'personal',
    color: '#6C63FF',
    foto_url: null,
  };
  let campos = [];
  let archivos = [];
  let editingCampoId = null;
  let fotoFile = null;

  // Plan limits (defaults for free)
  const user = getUser();
  const limits = {
    campos: user && user.plan === 'pro' ? 20 : 5,
    archivos: user && user.plan === 'pro' ? 10 : 1,
  };

  // --- Preset colors ---
  const presetColors = [
    '#6C63FF', '#FF6B6B', '#4ECDC4', '#FFE66D',
    '#95E1D3', '#F38181', '#AA96DA', '#FF9A76',
  ];

  // --- DOM refs ---
  const editorTitle = document.getElementById('editor-title');
  const stepDots = document.querySelectorAll('.step-dot');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const colorPicker = document.getElementById('color-picker');
  const fotoUpload = document.getElementById('foto-upload');
  const inpFoto = document.getElementById('inp-foto');
  const fotoPreview = document.getElementById('foto-preview');
  const fotoPreviewImg = document.getElementById('foto-preview-img');
  const btnRemoveFoto = document.getElementById('btn-remove-foto');
  const campoList = document.getElementById('campo-list');
  const campoLimit = document.getElementById('campo-limit');
  const btnAddCampo = document.getElementById('btn-add-campo');
  const campoForm = document.getElementById('campo-form');
  const btnSaveCampo = document.getElementById('btn-save-campo');
  const btnCancelCampo = document.getElementById('btn-cancel-campo');
  const campoTipo = document.getElementById('campo-tipo');
  const campoValor = document.getElementById('campo-valor');
  const campoEtiqueta = document.getElementById('campo-etiqueta');
  const fileUploadZone = document.getElementById('file-upload-zone');
  const inpArchivo = document.getElementById('inp-archivo');
  const archivoList = document.getElementById('archivo-list');
  const archivoLimit = document.getElementById('archivo-limit');
  const previewContainer = document.getElementById('preview-container');

  // --- Init ---
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('id');

  if (editId) {
    perfilId = parseInt(editId);
    editorTitle.textContent = 'Editar tarjeta';
    loadExistingProfile();
  }

  renderColorPicker();

  // --- Color picker ---
  function renderColorPicker() {
    colorPicker.innerHTML = presetColors.map(c => `
      <div class="color-option ${c === perfilData.color ? 'selected' : ''}" 
           style="background:${c}" 
           data-color="${c}"
           title="${c}"></div>
    `).join('') + `
      <label class="color-option" style="background:conic-gradient(red,yellow,lime,aqua,blue,magenta,red);cursor:pointer;position:relative;overflow:hidden" title="Color personalizado">
        <input type="color" value="${perfilData.color}" 
               style="position:absolute;opacity:0;width:100%;height:100%;cursor:pointer;top:0;left:0" 
               id="custom-color-input">
      </label>
    `;

    // Color click handlers
    colorPicker.querySelectorAll('.color-option[data-color]').forEach(el => {
      el.addEventListener('click', () => {
        perfilData.color = el.dataset.color;
        updateColorSelection();
      });
    });

    // Custom color input
    const customInput = document.getElementById('custom-color-input');
    if (customInput) {
      customInput.addEventListener('input', (e) => {
        perfilData.color = e.target.value;
        updateColorSelection();
      });
    }
  }

  function updateColorSelection() {
    colorPicker.querySelectorAll('.color-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.color === perfilData.color);
    });
  }

  // --- Foto upload ---
  fotoUpload.addEventListener('click', () => inpFoto.click());

  inpFoto.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast('La imagen no debe superar 2MB', 'error');
      inpFoto.value = '';
      return;
    }

    // Resize with canvas
    resizeImage(file, 800, (resizedFile, dataUrl) => {
      fotoFile = resizedFile;
      fotoPreviewImg.src = dataUrl;
      fotoPreview.classList.remove('hidden');
      fotoUpload.classList.add('hidden');
    });
  });

  btnRemoveFoto.addEventListener('click', () => {
    fotoFile = null;
    perfilData.foto_url = null;
    inpFoto.value = '';
    fotoPreview.classList.add('hidden');
    fotoUpload.classList.remove('hidden');
  });

  /**
   * Resize image using canvas. Max dimension 800px, output JPEG at 80% quality.
   */
  function resizeImage(file, maxDim, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob((blob) => {
          const resizedFile = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
            type: 'image/jpeg',
          });
          callback(resizedFile, canvas.toDataURL('image/jpeg', 0.8));
        }, 'image/jpeg', 0.8);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // --- Campo (contact field) management ---
  const campoPlaceholders = {
    whatsapp: '+52 1234567890',
    telefono: '+52 1234567890',
    email: 'correo@ejemplo.com',
    direccion: 'Calle 123, Col. Centro',
    facebook: 'https://facebook.com/tu-pagina',
    instagram: '@tu_usuario',
    tiktok: '@tu_usuario',
    linkedin: 'https://linkedin.com/in/tu-perfil',
    twitter: '@tu_usuario',
    web: 'https://tu-sitio.com',
    otro: 'Valor del campo',
  };

  const campoIcons = {
    whatsapp: '💬',
    telefono: '📞',
    email: '📧',
    direccion: '📍',
    facebook: '📘',
    instagram: '📸',
    tiktok: '🎵',
    linkedin: '💼',
    twitter: '🐦',
    web: '🌐',
    otro: '📌',
  };

  campoTipo.addEventListener('change', () => {
    campoValor.placeholder = campoPlaceholders[campoTipo.value] || '';
  });

  btnAddCampo.addEventListener('click', () => {
    if (campos.length >= limits.campos) {
      showToast(`Límite de ${limits.campos} campos alcanzado`, 'error');
      return;
    }
    editingCampoId = null;
    campoTipo.value = 'whatsapp';
    campoValor.value = '';
    campoValor.placeholder = campoPlaceholders.whatsapp;
    campoEtiqueta.value = '';
    campoForm.classList.remove('hidden');
    btnAddCampo.classList.add('hidden');
  });

  btnCancelCampo.addEventListener('click', () => {
    campoForm.classList.add('hidden');
    btnAddCampo.classList.remove('hidden');
    editingCampoId = null;
  });

  btnSaveCampo.addEventListener('click', async () => {
    const valor = campoValor.value.trim();
    if (!valor) {
      showToast('El valor es obligatorio', 'error');
      return;
    }

    const campoData = {
      tipo: campoTipo.value,
      valor: valor,
      etiqueta: campoEtiqueta.value.trim() || null,
    };

    btnSaveCampo.classList.add('loading');
    btnSaveCampo.disabled = true;

    let data;
    if (editingCampoId) {
      data = await api('/perfiles/' + perfilId + '/campos/' + editingCampoId, {
        method: 'PUT',
        body: JSON.stringify(campoData),
      });
    } else {
      data = await api('/perfiles/' + perfilId + '/campos', {
        method: 'POST',
        body: JSON.stringify(campoData),
      });
    }

    btnSaveCampo.classList.remove('loading');
    btnSaveCampo.disabled = false;

    if (data && !data.error) {
      if (editingCampoId) {
        const idx = campos.findIndex(c => c.id === editingCampoId);
        if (idx !== -1) campos[idx] = data.campo || { ...campos[idx], ...campoData };
      } else {
        campos.push(data.campo || { id: Date.now(), ...campoData });
      }
      renderCampos();
      campoForm.classList.add('hidden');
      btnAddCampo.classList.remove('hidden');
      editingCampoId = null;
      showToast('Campo guardado', 'success');
    }
  });

  function renderCampos() {
    updateCampoLimit();
    if (campos.length === 0) {
      campoList.innerHTML = '<p class="text-muted text-sm" style="padding:16px;text-align:center">No hay campos todavía</p>';
      return;
    }

    campoList.innerHTML = campos.map((c, i) => `
      <div class="campo-item card" data-campo-id="${c.id}">
        <div class="campo-icon">${campoIcons[c.tipo] || '📌'}</div>
        <div class="campo-info">
          <div class="campo-label">${capitalize(c.tipo)}${c.etiqueta ? ' · ' + escapeHTML(c.etiqueta) : ''}</div>
          <div class="campo-value">${escapeHTML(c.valor)}</div>
        </div>
        <div class="campo-actions">
          <button class="btn-icon" style="width:36px;height:36px;min-height:36px;font-size:0.9rem" onclick="window._editCampo(${c.id})" title="Editar">✏️</button>
          <button class="btn-icon" style="width:36px;height:36px;min-height:36px;font-size:0.9rem" onclick="window._deleteCampo(${c.id})" title="Eliminar">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  function updateCampoLimit() {
    campoLimit.textContent = campos.length + ' / ' + limits.campos;
    campoLimit.classList.toggle('warning', campos.length >= limits.campos - 1);
  }

  window._editCampo = function (id) {
    const campo = campos.find(c => c.id === id);
    if (!campo) return;
    editingCampoId = id;
    campoTipo.value = campo.tipo;
    campoValor.value = campo.valor;
    campoValor.placeholder = campoPlaceholders[campo.tipo] || '';
    campoEtiqueta.value = campo.etiqueta || '';
    campoForm.classList.remove('hidden');
    btnAddCampo.classList.add('hidden');
  };

  window._deleteCampo = async function (id) {
    const data = await api('/perfiles/' + perfilId + '/campos/' + id, { method: 'DELETE' });
    if (data && !data.error) {
      campos = campos.filter(c => c.id !== id);
      renderCampos();
      showToast('Campo eliminado', 'success');
    }
  };

  // --- Archivos management ---
  fileUploadZone.addEventListener('click', () => {
    if (archivos.length >= limits.archivos) {
      showToast(`Límite de ${limits.archivos} archivos alcanzado`, 'error');
      return;
    }
    inpArchivo.click();
  });

  inpArchivo.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size
    const maxSize = file.type === 'application/pdf' ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast(`Archivo demasiado grande (máx ${file.type === 'application/pdf' ? '5MB' : '2MB'})`, 'error');
      inpArchivo.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('archivo', file);

    const data = await api('/perfiles/' + perfilId + '/archivos', {
      method: 'POST',
      body: formData,
    });

    inpArchivo.value = '';

    if (data && !data.error) {
      archivos.push(data.archivo || { id: Date.now(), nombre: file.name, tamano: file.size, tipo_mime: file.type });
      renderArchivos();
      showToast('Archivo subido', 'success');
    }
  });

  function renderArchivos() {
    updateArchivoLimit();
    if (archivos.length === 0) {
      archivoList.innerHTML = '<p class="text-muted text-sm" style="padding:16px;text-align:center">No hay archivos todavía</p>';
      return;
    }

    archivoList.innerHTML = archivos.map(a => {
      const icon = a.tipo_mime === 'application/pdf' ? '📄' : '🖼️';
      const size = formatFileSize(a.tamano || 0);
      return `
        <div class="file-item card" data-archivo-id="${a.id}">
          <div class="file-info">
            <span class="file-icon">${icon}</span>
            <div>
              <div class="file-name">${escapeHTML(a.nombre || 'Archivo')}</div>
              <div class="file-size">${size}</div>
            </div>
          </div>
          <button class="btn-icon" style="width:36px;height:36px;min-height:36px;font-size:0.9rem" onclick="window._deleteArchivo(${a.id})" title="Eliminar">🗑️</button>
        </div>
      `;
    }).join('');
  }

  function updateArchivoLimit() {
    archivoLimit.textContent = archivos.length + ' / ' + limits.archivos;
    archivoLimit.classList.toggle('warning', archivos.length >= limits.archivos - 1);
  }

  window._deleteArchivo = async function (id) {
    const data = await api('/perfiles/' + perfilId + '/archivos/' + id, { method: 'DELETE' });
    if (data && !data.error) {
      archivos = archivos.filter(a => a.id !== id);
      renderArchivos();
      showToast('Archivo eliminado', 'success');
    }
  };

  // --- Step navigation ---
  btnPrev.addEventListener('click', () => navigateStep(-1));
  btnNext.addEventListener('click', () => navigateStep(1));

  function navigateStep(direction) {
    const nextStep = currentStep + direction;

    if (nextStep < 1 || nextStep > totalSteps) return;

    // Validate current step before moving forward
    if (direction > 0) {
      if (!validateStep(currentStep)) return;

      // Save profile on leaving step 1
      if (currentStep === 1) {
        saveProfileStep1().then(ok => {
          if (ok) goToStep(nextStep);
        });
        return;
      }

      // On last step, save and redirect
      if (currentStep === totalSteps) {
        showToast('¡Tarjeta guardada!', 'success');
        setTimeout(() => {
          location.href = 'compartir.html?slug=' + perfilData.slug;
        }, 500);
        return;
      }
    }

    goToStep(nextStep);
  }

  function goToStep(step) {
    // Hide all steps
    for (let i = 1; i <= totalSteps; i++) {
      document.getElementById('step-' + i).classList.add('hidden');
    }
    document.getElementById('step-' + step).classList.remove('hidden');

    // Update dots
    stepDots.forEach(dot => {
      const dotStep = parseInt(dot.dataset.step);
      dot.classList.toggle('active', dotStep === step);
      dot.classList.toggle('completed', dotStep < step);
    });

    // Update buttons
    currentStep = step;
    btnPrev.disabled = step === 1;

    if (step === totalSteps) {
      btnNext.textContent = 'Guardar ✓';
      buildPreview();
    } else {
      btnNext.textContent = 'Siguiente →';
    }

    // Render step data
    if (step === 2) renderCampos();
    if (step === 3) renderArchivos();
  }

  function validateStep(step) {
    if (step === 1) {
      const nombre = document.getElementById('inp-nombre').value.trim();
      if (!nombre) {
        showToast('El nombre de la tarjeta es obligatorio', 'error');
        document.getElementById('inp-nombre').classList.add('input-error');
        return false;
      }
      document.getElementById('inp-nombre').classList.remove('input-error');
      perfilData.nombre_perfil = nombre;
      perfilData.tipo = document.getElementById('inp-tipo').value;
      return true;
    }
    return true;
  }

  async function saveProfileStep1() {
    const formData = new FormData();
    formData.append('nombre_perfil', perfilData.nombre_perfil);
    formData.append('tipo', perfilData.tipo);
    formData.append('color', perfilData.color);

    if (fotoFile) {
      formData.append('foto', fotoFile);
    }

    let data;
    if (perfilId) {
      data = await api('/perfiles/' + perfilId, {
        method: 'PUT',
        body: formData,
      });
    } else {
      data = await api('/perfiles', {
        method: 'POST',
        body: formData,
      });
    }

    if (data && !data.error) {
      const perfil = data.perfil || data;
      perfilId = perfil.id || perfilId;
      perfilData.slug = perfil.slug;
      perfilData.foto_url = perfil.foto_url || perfilData.foto_url;
      return true;
    }
    return false;
  }

  // --- Load existing profile for editing ---
  async function loadExistingProfile() {
    const data = await api('/perfiles/' + perfilId, { method: 'GET' });
    if (!data || data.error) {
      showToast('No se pudo cargar la tarjeta', 'error');
      setTimeout(() => location.href = 'dashboard.html', 1000);
      return;
    }

    const perfil = data.perfil || data;
    perfilData = {
      nombre_perfil: perfil.nombre_perfil,
      tipo: perfil.tipo,
      color: perfil.color || '#6C63FF',
      foto_url: perfil.foto_url,
      slug: perfil.slug,
    };

    // Fill form
    document.getElementById('inp-nombre').value = perfilData.nombre_perfil;
    document.getElementById('inp-tipo').value = perfilData.tipo;

    // Update color picker
    renderColorPicker();

    // Show photo if exists
    if (perfilData.foto_url) {
      fotoPreviewImg.src = perfilData.foto_url;
      fotoPreview.classList.remove('hidden');
      fotoUpload.classList.add('hidden');
    }

    // Load campos
    const camposData = await api('/perfiles/' + perfilId + '/campos', { method: 'GET' });
    if (camposData && !camposData.error) {
      campos = camposData.campos || camposData || [];
    }

    // Load archivos
    const archivosData = await api('/perfiles/' + perfilId + '/archivos', { method: 'GET' });
    if (archivosData && !archivosData.error) {
      archivos = archivosData.archivos || archivosData || [];
    }
  }

  // --- Preview ---
  function buildPreview() {
    const color = perfilData.color || '#6C63FF';
    const initials = getInitials(perfilData.nombre_perfil);
    const fotoSrc = fotoFile ? fotoPreviewImg.src : perfilData.foto_url;

    // Avatar
    const avatarHTML = fotoSrc
      ? `<div style="width:100px;height:100px;border-radius:50%;overflow:hidden;margin:0 auto 16px;border:3px solid rgba(255,255,255,0.3)">
           <img src="${fotoSrc}" alt="Foto" style="width:100%;height:100%;object-fit:cover">
         </div>`
      : `<div style="width:100px;height:100px;border-radius:50%;margin:0 auto 16px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:2.5rem;font-weight:700;color:#fff">${initials}</div>`;

    // Action buttons — only show for existing campo types
    const hasWhatsapp = campos.find(c => c.tipo === 'whatsapp');
    const hasTelefono = campos.find(c => c.tipo === 'telefono');
    const hasEmail = campos.find(c => c.tipo === 'email');

    let actionButtonsHTML = '';
    const actionBtns = [];
    if (hasWhatsapp) {
      actionBtns.push(`<a href="https://wa.me/${hasWhatsapp.valor.replace(/[^0-9]/g,'')}" target="_blank" class="pv-action-btn" style="background:#25D366">
        <span style="font-size:1.3rem">💬</span><span>WhatsApp</span>
      </a>`);
    }
    if (hasTelefono) {
      actionBtns.push(`<a href="tel:${hasTelefono.valor}" class="pv-action-btn" style="background:${color}">
        <span style="font-size:1.3rem">📞</span><span>Llamar</span>
      </a>`);
    }
    if (hasEmail) {
      actionBtns.push(`<a href="mailto:${hasEmail.valor}" class="pv-action-btn" style="background:#FF6B35">
        <span style="font-size:1.3rem">✉️</span><span>Email</span>
      </a>`);
    }

    if (actionBtns.length > 0) {
      actionButtonsHTML = `
        <div style="position:sticky;top:0;z-index:10;background:rgba(15,12,41,0.97);padding:12px;display:flex;justify-content:center;gap:10px;border-bottom:1px solid rgba(255,255,255,0.1)">
          ${actionBtns.join('')}
        </div>`;
    }

    // Separate social campos from contact campos
    const socialTypes = ['facebook', 'instagram', 'tiktok', 'linkedin', 'twitter', 'web'];
    const contactCampos = campos.filter(c => !socialTypes.includes(c.tipo));
    const socialCampos = campos.filter(c => socialTypes.includes(c.tipo));

    // Contact items
    const contactHTML = contactCampos.length > 0
      ? contactCampos.map(c => {
          const link = getCampoLink(c);
          return `
            <a href="${escapeHTML(link)}" target="_blank" rel="noopener" class="pv-contact-item" style="text-decoration:none;color:inherit">
              <div class="pv-contact-icon">${campoIcons[c.tipo] || '📌'}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:0.7rem;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.5px">${capitalize(c.tipo)}${c.etiqueta ? ' · ' + escapeHTML(c.etiqueta) : ''}</div>
                <div style="font-weight:500;margin-top:2px;word-break:break-all">${escapeHTML(c.valor)}</div>
              </div>
              <span style="color:rgba(255,255,255,0.3);font-size:1.2rem">›</span>
            </a>`;
        }).join('')
      : '<p style="text-align:center;color:rgba(255,255,255,0.4);font-size:0.9rem;padding:16px 0">Sin campos de contacto</p>';

    // Social grid
    let socialHTML = '';
    if (socialCampos.length > 0) {
      const socialItems = socialCampos.map(c => {
        const link = getCampoLink(c);
        return `<a href="${escapeHTML(link)}" target="_blank" rel="noopener" class="pv-social-btn" title="${capitalize(c.tipo)}">${campoIcons[c.tipo] || '🌐'}</a>`;
      }).join('');
      socialHTML = `
        <div style="padding:0 16px 16px">
          <div style="font-size:0.7rem;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;font-weight:600">Redes sociales</div>
          <div style="display:grid;grid-template-columns:repeat(${Math.min(socialCampos.length, 4)}, 1fr);gap:10px">${socialItems}</div>
        </div>`;
    }

    // Files
    let archivosHTML = '';
    if (archivos.length > 0) {
      const fileItems = archivos.map(a => {
        const icon = (a.tipo || a.tipo_mime || '').includes('pdf') ? '📄' : '🖼️';
        const displayName = a.nombre && a.nombre.length > 30 ? a.nombre.substring(0, 27) + '...' : (a.nombre || 'Archivo');
        return `
          <a href="${a.url || '#'}" target="_blank" rel="noopener" class="pv-contact-item" style="text-decoration:none;color:inherit">
            <div class="pv-contact-icon">${icon}</div>
            <span style="flex:1;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(displayName)}</span>
            <span style="color:${color};font-size:0.85rem">Ver ↗</span>
          </a>`;
      }).join('');
      archivosHTML = `
        <div style="padding:0 16px 16px">
          <div style="font-size:0.7rem;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;font-weight:600">Archivos</div>
          ${fileItems}
        </div>`;
    }

    previewContainer.innerHTML = `
      <style>
        .pv-action-btn {
          display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 16px;border-radius:10px;
          color:#fff;text-decoration:none;font-weight:600;font-size:0.75rem;min-width:70px;
          transition:transform 0.15s ease,opacity 0.15s ease;
        }
        .pv-action-btn:hover { transform:scale(1.05); opacity:0.9; }
        .pv-contact-item {
          display:flex;align-items:center;gap:12px;padding:12px;margin-bottom:6px;
          border-radius:10px;transition:background 0.15s ease;cursor:pointer;
        }
        .pv-contact-item:hover { background:rgba(255,255,255,0.05); }
        .pv-contact-icon {
          width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,0.05);
          display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;
        }
        .pv-social-btn {
          display:flex;align-items:center;justify-content:center;aspect-ratio:1;border-radius:12px;
          background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);font-size:1.5rem;
          text-decoration:none;transition:transform 0.15s ease,background 0.15s ease;
        }
        .pv-social-btn:hover { transform:scale(1.08); background:rgba(255,255,255,0.1); }
      </style>

      <!-- Header with gradient -->
      <div style="background:linear-gradient(135deg, ${color}, ${color}99);padding:40px 20px 48px;text-align:center;position:relative">
        ${avatarHTML}
        <h3 style="font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:6px">${escapeHTML(perfilData.nombre_perfil || 'Sin nombre')}</h3>
        <span style="display:inline-block;padding:4px 14px;border-radius:20px;background:rgba(255,255,255,0.15);font-size:0.75rem;color:rgba(255,255,255,0.9)">${capitalize(perfilData.tipo || 'personal')}</span>
      </div>

      <!-- Action buttons bar -->
      ${actionButtonsHTML}

      <!-- Contact fields -->
      <div style="padding:16px;margin-top:${actionButtonsHTML ? '0' : '-24px'}">
        <div style="background:rgba(255,255,255,0.03);border-radius:14px;padding:4px 4px 0;margin-bottom:12px">
          <div style="font-size:0.7rem;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;padding:12px 12px 0;font-weight:600">Contacto</div>
          ${contactHTML}
        </div>
      </div>

      <!-- Social grid -->
      ${socialHTML}

      <!-- Files -->
      ${archivosHTML}

      <!-- Save contact button -->
      <div style="padding:0 16px 16px">
        <div style="display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;padding:0 24px;border-radius:12px;background:linear-gradient(135deg,${color},${color}cc);color:#fff;font-weight:600;font-size:0.95rem;cursor:pointer;transition:transform 0.15s ease"
             onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
          💾 Guardar contacto
        </div>
      </div>

      <!-- Branding -->
      <div style="text-align:center;padding:12px 16px 20px;font-size:0.7rem;color:rgba(255,255,255,0.25)">
        Creado con <span style="color:${color}">TarjetaDigital</span>
      </div>
    `;
  }

  // Helper: get link URL for a campo
  function getCampoLink(campo) {
    switch (campo.tipo) {
      case 'whatsapp': return 'https://wa.me/' + campo.valor.replace(/[^0-9]/g, '');
      case 'telefono': return 'tel:' + campo.valor;
      case 'email': return 'mailto:' + campo.valor;
      case 'direccion': return 'https://maps.google.com/?q=' + encodeURIComponent(campo.valor);
      case 'facebook': return campo.valor.startsWith('http') ? campo.valor : 'https://facebook.com/' + campo.valor;
      case 'instagram': return campo.valor.startsWith('http') ? campo.valor : 'https://instagram.com/' + campo.valor;
      case 'tiktok': return campo.valor.startsWith('http') ? campo.valor : 'https://tiktok.com/@' + campo.valor;
      case 'linkedin': return campo.valor.startsWith('http') ? campo.valor : 'https://linkedin.com/in/' + campo.valor;
      case 'twitter': return campo.valor.startsWith('http') ? campo.valor : 'https://twitter.com/' + campo.valor;
      case 'web': return campo.valor.startsWith('http') ? campo.valor : 'https://' + campo.valor;
      default: return '#';
    }
  }

  // --- Utilities ---
  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // --- Step dot clicks ---
  stepDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const targetStep = parseInt(dot.dataset.step);
      if (targetStep < currentStep) {
        goToStep(targetStep);
      }
    });
  });

  // Init renders
  renderCampos();
  renderArchivos();
})();
