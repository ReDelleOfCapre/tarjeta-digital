// ============================================
// My ID — Block Editor v3
// ============================================
(function(){
  if (!checkAuth()) return;

  // ===== CONFIG =====
  var BLOCK_TYPES = [
    { tipo:'link', label:'Link', icon:'📎', color:'#007AFF' },
    { tipo:'ubicacion', label:'Ubicación / Oficina', icon:'📍', color:'#EA4335' },
    { tipo:'whatsapp', label:'WhatsApp CTA', icon:'💬', color:'#25D366' },
    { tipo:'social_icons', label:'Redes', icon:'🔗', color:'#AF52DE' },
    { tipo:'galeria', label:'Fotos / Galería', icon:'📸', color:'#EC4899' },
    { tipo:'wishlist', label:'Wishlist / Tienda', icon:'🎁', color:'#FF9500' },
    { tipo:'pdf', label:'Documento PDF', icon:'📄', color:'#EF4444' },
    { tipo:'pago', label:'Transferencia / Pago', icon:'💳', color:'#10B981' },
    { tipo:'nota', label:'Nota / Aviso', icon:'📌', color:'#F59E0B' },
    { tipo:'seccion', label:'Título Sección', icon:'🏷️', color:'#8B5CF6' },
    { tipo:'spotify', label:'Spotify', icon:'🎵', color:'#1DB954' },
    { tipo:'youtube', label:'YouTube', icon:'▶️', color:'#FF0000' },
    { tipo:'tiktok', label:'TikTok', icon:'🎬', color:'#000' },
    { tipo:'texto', label:'Texto libre', icon:'📝', color:'#8E8E93' },
    { tipo:'email_capture', label:'Captura Email', icon:'📧', color:'#FF9500' },
    { tipo:'countdown', label:'Cuenta regresiva', icon:'⏳', color:'#FF3B30' }
  ];

  var THEMES = [
    { id:'auto', name:'Camaleón / Auto 🦎', bg:'linear-gradient(135deg, #7C3AED, #EC4899)', fg:'#FFF', accent:'#7C3AED' },
    { id:'ios', name:'iOS Glass', bg:'#F2F2F7', fg:'#1C1C1E', accent:'#007AFF' },
    { id:'neon', name:'Neon Dark', bg:'#0a0a0f', fg:'#00f0ff', accent:'#00f0ff' },
    { id:'minimal', name:'Minimal Clean', bg:'#fafafa', fg:'#111', accent:'#111' },
    { id:'gradient', name:'Gradient VIP', bg:'linear-gradient(135deg,#667eea,#764ba2)', fg:'#fff', accent:'#fff' },
    { id:'food', name:'Street Food / Rest', bg:'linear-gradient(135deg,#1F2937,#111827)', fg:'#F97316', accent:'#F97316' },
    { id:'premium', name:'Luxury Gold', bg:'linear-gradient(135deg,#0F172A,#020617)', fg:'#F59E0B', accent:'#F59E0B' }
  ];

  var SOCIAL_TYPES = [
    {tipo:'instagram',label:'Instagram',icon:'📷'},
    {tipo:'tiktok',label:'TikTok',icon:'♪'},
    {tipo:'twitter',label:'X',icon:'𝕏'},
    {tipo:'youtube',label:'YouTube',icon:'▶'},
    {tipo:'facebook',label:'Facebook',icon:'f'},
    {tipo:'linkedin',label:'LinkedIn',icon:'in'},
    {tipo:'twitch',label:'Twitch',icon:'🎬'},
    {tipo:'kick',label:'Kick',icon:'K'},
    {tipo:'spotify',label:'Spotify',icon:'🎵'},
    {tipo:'discord',label:'Discord',icon:'🎮'},
    {tipo:'telegram',label:'Telegram',icon:'✈'},
    {tipo:'github',label:'GitHub',icon:'⌨'},
    {tipo:'web',label:'Web',icon:'🌐'}
  ];

  // ===== STATE =====
  var editId = new URLSearchParams(location.search).get('id');
  var selectedColor = '#7C3AED';
  var selectedTheme = 'ios';
  var blocks = []; // [{_tempId, tipo, contenido, id?}]
  var profileSlug = null;
  var currentStep = 1;
  var autoExtractedColor = null;

  // ===== WIZARD STEPPER NAVIGATION =====
  window.goStep = function(s) {
    if (s < 1 || s > 3) return;

    if (s > 1) {
      var nombre = gv('nombre_perfil');
      var inputNombre = document.getElementById('nombre_perfil');
      if (!nombre || !nombre.trim()) {
        if (inputNombre) {
          inputNombre.style.borderColor = 'var(--red)';
          inputNombre.focus();
        }
        showToast('Por favor ingresa el Nombre para continuar', 'error');
        return false;
      } else if (inputNombre) {
        inputNombre.style.borderColor = '';
      }
    }

    currentStep = s;

    var track = document.getElementById('wizard-track');
    if (track) {
      var offset = (s - 1) * -33.33333;
      track.style.transform = 'translateX(' + offset + '%)';
    }

    for (var i = 1; i <= 3; i++) {
      var dot = document.getElementById('dot-' + i);
      if (dot) {
        dot.classList.remove('active', 'done');
        if (i < s) dot.classList.add('done');
        if (i === s) dot.classList.add('active');
      }
    }

    var btnPrev = document.getElementById('btn-prev-step');
    var btnNext = document.getElementById('btn-next-step');

    if (btnPrev) {
      btnPrev.disabled = (s === 1);
    }
    if (btnNext) {
      if (s === 3) {
        btnNext.textContent = '⚡ Guardar & Publicar';
      } else {
        btnNext.textContent = 'Siguiente →';
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.nextStep = function() {
    if (currentStep === 3) {
      saveAll();
    } else {
      goStep(currentStep + 1);
    }
  };

  window.prevStep = function() {
    if (currentStep > 1) {
      goStep(currentStep - 1);
    }
  };

  // ===== AUTO / CHAMELEON THEME ENGINE =====
  function extractDominantColorFromImage(imgEl) {
    if (!imgEl) return;
    try {
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(imgEl, 0, 0, 50, 50);
      var data = ctx.getImageData(0, 0, 50, 50).data;
      var r = 0, g = 0, b = 0, count = 0;
      for (var i = 0; i < data.length; i += 16) {
        var cr = data[i], cg = data[i+1], cb = data[i+2], ca = data[i+3];
        if (ca > 128 && !(cr > 240 && cg > 240 && cb > 240) && !(cr < 25 && cg < 25 && cb < 25)) {
          r += cr; g += cg; b += cb; count++;
        }
      }
      if (count > 0) {
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        autoExtractedColor = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
        console.log('🎨 Color Camaleón Auto extraído:', autoExtractedColor);
        if (selectedTheme === 'auto') {
          selectedColor = autoExtractedColor;
          updateLivePreview();
        }
      }
    } catch(e) {
      console.error('Error calculando color dominante:', e);
    }
  }

  // ===== INIT =====
  renderThemes();
  renderPalette();
  renderBlockList();
  setupColorPicker();
  setupPhotoUpload();
  setupLivePreviewListeners();
  setupSortableDragAndDrop();

  if (editId) {
    var titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = 'Editar Identidad Digital';
    loadExisting(editId);
  }

  var btnSave = document.getElementById('btn-save');
  var btnFinalSave = document.getElementById('btn-final-save');
  if (btnSave) btnSave.addEventListener('click', saveAll);
  if (btnFinalSave) btnFinalSave.addEventListener('click', saveAll);

  // ===== REAL-TIME LIVE PREVIEW DATA BINDING =====
  function setupLivePreviewListeners() {
    ['nombre_perfil', 'tipo_perfil', 'bio_perfil', 'cumpleanos', 'lugar_estudio', 'pronombres', 'marco_estilo'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', updateLivePreview);
        el.addEventListener('change', updateLivePreview);
      }
    });
  }

  function updateLivePreview() {
    var nombre = gv('nombre_perfil') || 'Tu Nombre';
    var tipo = gv('tipo_perfil') || 'personal';
    var bio = gv('bio_perfil') || 'Tu biografía profesional aparecerá aquí...';
    var marcoEstilo = gv('marco_estilo') || 'solid';

    if (selectedTheme === 'auto' && autoExtractedColor) {
      selectedColor = autoExtractedColor;
    }

    var prevName = document.getElementById('prev-name');
    var prevType = document.getElementById('prev-type');
    var prevBio = document.getElementById('prev-bio');
    var prevInitials = document.getElementById('prev-avatar-initials');
    var prevAvatarBox = document.getElementById('prev-avatar-box');
    var prevBlocksContainer = document.getElementById('prev-blocks');

    if (prevName) prevName.textContent = nombre;
    if (prevType) prevType.textContent = tipo;
    if (prevBio) prevBio.textContent = bio;

    if (prevInitials) {
      var parts = nombre.trim().split(' ');
      var initials = parts.map(function(p){ return p[0]; }).slice(0, 2).join('').toUpperCase();
      prevInitials.textContent = initials || 'V';
    }

    if (prevAvatarBox) {
      if (marcoEstilo === 'gradient') {
        prevAvatarBox.style.border = 'none';
        prevAvatarBox.style.padding = '4px';
        prevAvatarBox.style.background = 'linear-gradient(135deg, ' + selectedColor + ', #EC4899)';
      } else if (marcoEstilo === 'none') {
        prevAvatarBox.style.border = 'none';
        prevAvatarBox.style.padding = '0';
        prevAvatarBox.style.background = 'transparent';
        prevAvatarBox.style.boxShadow = 'none';
      } else { // solid
        prevAvatarBox.style.border = '3px solid ' + selectedColor;
        prevAvatarBox.style.padding = '0';
        prevAvatarBox.style.background = '#18181B';
        prevAvatarBox.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)';
      }
    }

    var frame = document.getElementById('smartphone-frame');
    if (frame) {
      frame.setAttribute('data-theme', selectedTheme);

      if (selectedTheme === 'neon') {
        frame.style.background = '#020205';
        frame.style.color = '#00F0FF';
        frame.style.border = '2px solid #7C3AED';
        frame.style.boxShadow = '0 0 25px rgba(124, 58, 237, 0.4)';
      } else if (selectedTheme === 'ios') {
        frame.style.background = '#F2F2F7';
        frame.style.color = '#1C1C1E';
        frame.style.border = '1px solid rgba(0, 0, 0, 0.1)';
        frame.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
      } else if (selectedTheme === 'minimal') {
        frame.style.background = '#0A0A0B';
        frame.style.color = '#FFFFFF';
        frame.style.border = '1px solid rgba(255, 255, 255, 0.08)';
        frame.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
      } else if (selectedTheme === 'gradient') {
        frame.style.background = 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)';
        frame.style.color = '#FFFFFF';
        frame.style.border = 'none';
        frame.style.boxShadow = '0 15px 35px rgba(236, 72, 153, 0.3)';
      } else if (selectedTheme === 'food') {
        frame.style.background = '#111827';
        frame.style.color = '#F97316';
        frame.style.border = '2px solid #F97316';
        frame.style.boxShadow = '0 8px 24px rgba(249, 115, 22, 0.2)';
      } else if (selectedTheme === 'premium' || selectedTheme === 'luxury') {
        frame.style.background = '#0B0A09';
        frame.style.color = '#D4AF37';
        frame.style.border = '2px solid #D4AF37';
        frame.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.3)';
      } else if (selectedTheme === 'auto') {
        var colorHex = autoExtractedColor || selectedColor || '#7C3AED';
        frame.style.background = 'linear-gradient(135deg, ' + colorHex + ' 0%, #0A0A0B 100%)';
        frame.style.color = '#FFFFFF';
        frame.style.border = '1px solid ' + colorHex;
        frame.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
      } else {
        frame.style.background = '#0A0A0B';
        frame.style.color = '#FFFFFF';
      }
    }

    // Render Live Preview Blocks (Interactive Maps & Rich Bento UI)
    if (prevBlocksContainer) {
      if (blocks.length === 0) {
        prevBlocksContainer.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.78rem;border:1px dashed rgba(255,255,255,0.1);border-radius:14px">Tus botones y smart blocks aparecerán aquí al instante...</div>';
      } else {
        prevBlocksContainer.innerHTML = blocks.map(function(b) {
          try {
            if (!b || !b.tipo) return '';
            var bCont = b.contenido || {};
            var bt = BLOCK_TYPES.find(function(t){ return t.tipo === b.tipo; }) || { icon: '📎', label: b.tipo || 'Bloque', color: '#7C3AED' };
            var title = bCont.titulo || bCont.texto || bCont.url || bCont.numero || bt.label;
            var url = bCont.url || '';

            if (url.includes('open.spotify.com')) {
              return '<div style="padding:10px;border-radius:14px;background:rgba(29,185,84,0.12);border:1px solid rgba(29,185,84,0.3);color:#1DB954;font-size:0.78rem;font-weight:700;display:flex;align-items:center;gap:8px">🎵 Spotify Smart Player</div>';
            }

            if (b.tipo === 'ubicacion' || url.includes('google.com/maps') || url.includes('maps.google') || (title && (title.toLowerCase().includes('ubicacion') || title.toLowerCase().includes('sucursal')))) {
              var locationQuery = bCont.direccion || bCont.texto || url || title;
              return '<div class="preview-location-block" style="padding:12px;border-radius:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);margin-bottom:8px">' +
                '<div style="font-size:0.8rem;font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:6px">📍 ' + escapeHtml(title) + '</div>' +
                '<iframe width="100%" height="110" style="border:0;border-radius:10px;margin-bottom:8px" loading="lazy" src="https://maps.google.com/maps?q=' + encodeURIComponent(locationQuery) + '&output=embed"></iframe>' +
                '<div style="display:flex;gap:6px">' +
                  '<a href="https://maps.google.com/?q=' + encodeURIComponent(locationQuery) + '" target="_blank" style="flex:1;background:#EA4335;color:#fff;text-align:center;border-radius:8px;padding:6px;font-weight:700;font-size:0.72rem;text-decoration:none">🗺️ Google Maps</a>' +
                  '<a href="https://maps.apple.com/?q=' + encodeURIComponent(locationQuery) + '" target="_blank" style="flex:1;background:#007AFF;color:#fff;text-align:center;border-radius:8px;padding:6px;font-weight:700;font-size:0.72rem;text-decoration:none">🍎 Apple Maps</a>' +
                '</div>' +
              '</div>';
            }

            var isLightTheme = (selectedTheme === 'ios');
            var textColor = isLightTheme ? '#1C1C1E' : '#FFFFFF';
            var cardBg = isLightTheme ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)';
            var cardBorder = isLightTheme ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)';

            return '<div style="padding:12px 14px;border-radius:14px;background:' + cardBg + ';border:1px solid ' + cardBorder + ';border-left:4px solid ' + selectedColor + ';display:flex;align-items:center;justify-content:space-between;color:' + textColor + ';font-size:0.82rem;font-weight:600;margin-bottom:6px">' +
              '<div style="display:flex;align-items:center;gap:8px"><span>' + bt.icon + '</span> <span>' + escapeHtml(title) + '</span></div>' +
              '<span style="opacity:0.5">→</span>' +
            '</div>';
          } catch(e) {
            console.error('Error al mapear bloque preview individual:', e);
            return '';
          }
        }).join('');
      }
    }
  }

  function setupSortableDragAndDrop() {
    var blockListEl = document.getElementById('block-list');
    if (blockListEl && window.Sortable) {
      window.Sortable.create(blockListEl, {
        animation: 150,
        handle: '.drag-handle',
        onEnd: function(evt) {
          if (evt.oldIndex !== undefined && evt.newIndex !== undefined) {
            var moved = blocks.splice(evt.oldIndex, 1)[0];
            blocks.splice(evt.newIndex, 0, moved);
            blocks.forEach(function(b, idx) { b.orden = idx; });
            updateLivePreview();
          }
        }
      });
    }
  }

  // ===== COLOR PICKER =====
  function setupColorPicker() {
    var options = document.querySelectorAll('.color-option');
    options.forEach(function(el) {
      el.addEventListener('click', function(e) {
        if (e && e.preventDefault) e.preventDefault();
        options.forEach(function(c) {
          c.classList.remove('active', 'selected');
          c.style.borderColor = 'transparent';
          c.style.transform = 'none';
        });
        el.classList.add('active', 'selected');
        el.style.borderColor = '#FFFFFF';
        el.style.transform = 'scale(1.15)';
        selectedColor = el.dataset.color || el.getAttribute('data-color') || '#7C3AED';
        console.log('Color de acento seleccionado:', selectedColor);
        updateLivePreview();
      });
    });
    // Set initial
    var initial = document.querySelector('.color-option[data-color="' + selectedColor + '"]') || options[0];
    if (initial) {
      initial.classList.add('active', 'selected');
      initial.style.borderColor = '#FFFFFF';
    }
  }

  // ===== PHOTO =====
  function setupPhotoUpload() {
    var inputFoto = document.getElementById('input-foto');
    if (inputFoto) {
      inputFoto.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('Máximo 5MB', 'error'); return; }
        var reader = new FileReader();
        reader.onload = function(ev) {
          var preview = document.getElementById('photo-preview');
          if (preview) preview.innerHTML = '<img src="' + ev.target.result + '" style="width:100%;height:100%;object-fit:cover">';
          var prevAvatarBox = document.getElementById('prev-avatar-box');
          if (prevAvatarBox) prevAvatarBox.innerHTML = '<img src="' + ev.target.result + '" style="width:100%;height:100%;object-fit:cover">';
        };
        reader.readAsDataURL(file);
      });
    }
  }

  // ===== THEMES =====
  function renderThemes() {
    var container = document.getElementById('theme-picker');
    if (!container) return;
    container.innerHTML = THEMES.map(function(t) {
      var isActive = selectedTheme === t.id;
      return '<div class="theme-card ' + (isActive ? 'active selected' : '') + '" style="padding:10px;border-radius:14px;cursor:pointer;text-align:center;border:2px solid ' + (isActive ? 'var(--primary)' : 'rgba(255,255,255,0.1)') + ';background:' + (isActive ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.03)') + '" onclick="selectTheme(\'' + t.id + '\')">' +
        '<div style="height:48px;border-radius:8px;background:' + t.bg + ';margin-bottom:6px;display:flex;flex-direction:column;justify-content:center;padding:6px">' +
          '<div style="height:6px;border-radius:3px;background:' + t.accent + ';width:70%;margin-bottom:4px"></div>' +
          '<div style="height:6px;border-radius:3px;background:' + t.accent + ';width:50%;opacity:0.5"></div>' +
        '</div>' +
        '<span style="font-size:var(--font-xs);font-weight:600;color:#FFF">' + t.name + '</span>' +
      '</div>';
    }).join('');
  }

  window.selectTheme = function(id) {
    selectedTheme = id;
    console.log('Tema seleccionado:', selectedTheme);
    renderThemes();
    updateLivePreview();
  };

  // ===== BLOCK PALETTE =====
  function renderPalette() {
    var container = document.getElementById('block-palette');
    if (!container) return;
    container.innerHTML = BLOCK_TYPES.map(function(b){
      return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);cursor:pointer;min-width:75px;font-size:var(--font-xs);color:var(--text-secondary)" onclick="showBlockForm(\''+b.tipo+'\')">' +
        '<span style="font-size:1.2rem">'+b.icon+'</span>'+b.label +
      '</div>';
    }).join('');
  }

  // ===== BLOCK FORM (Add / Edit) =====
  window.showBlockForm = function(tipo, idx) {
    if (idx !== undefined) editingBlockIdx = idx;
    var existing = (editingBlockIdx !== null && blocks[editingBlockIdx]) ? blocks[editingBlockIdx].contenido : null;

    var area = document.getElementById('block-form-area');
    var isEdit = (editingBlockIdx !== null);
    var html = '<div class="card p-16" style="border:2px solid var(--accent)">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><strong>' + (isEdit ? '✏️ Editar ' : '➕ ') + getBlockLabel(tipo) + '</strong><button class="btn btn-sm btn-ghost" onclick="hideBlockForm()">✕</button></div>';

    if (tipo === 'link' || tipo === 'ubicacion') {
      html += field('URL o Dirección *','bf-url', existing ? (existing.url || existing.direccion || '') : 'https://...');
      html += field('Título *','bf-titulo', existing ? (existing.titulo || '') : 'Mi enlace / Oficina');
      html += field('Subtítulo o Descripción','bf-sub', existing ? (existing.subtitulo || '') : 'Descripción corta');
    } else if (tipo === 'spotify' || tipo === 'youtube' || tipo === 'tweet' || tipo === 'tiktok') {
      html += field('URL *','bf-url', existing ? (existing.url || '') : 'Pega la URL de '+tipo);
    } else if (tipo === 'whatsapp') {
      html += field('Número *','bf-tel', existing ? (existing.numero || '') : '522311556138');
      html += field('Mensaje','bf-msg', existing ? (existing.mensaje_default || '') : 'Hola, te contacto desde VYNK');
    } else if (tipo === 'social_icons') {
      html += '<p style="font-size:var(--font-xs);color:var(--text-muted);margin-bottom:8px">Agrega tus redes (deja vacío las que no uses)</p>';
      SOCIAL_TYPES.forEach(function(s){
        var socialVal = '';
        if (existing && Array.isArray(existing.redes)) {
          var matched = existing.redes.find(function(r){ return r.tipo === s.tipo; });
          if (matched) socialVal = matched.url;
        }
        html += '<div class="form-group" style="margin-bottom:6px"><label class="form-label" style="font-size:var(--font-xs)">'+s.icon+' '+s.label+'</label><input type="text" class="form-input" id="bf-social-'+s.tipo+'" value="'+escapeHtml(socialVal)+'" placeholder="@usuario o URL" style="padding:8px 12px;font-size:var(--font-sm)"></div>';
      });
    } else if (tipo === 'texto') {
      html += '<div class="form-group"><label class="form-label">Texto</label><textarea class="form-input" id="bf-texto" rows="3" placeholder="Tu texto aquí">'+escapeHtml(existing ? (existing.texto || '') : '')+'</textarea></div>';
      html += '<div class="form-group"><label class="form-label">Estilo</label><select class="form-select" id="bf-estilo"><option value="normal">Normal</option><option value="titulo">Título</option><option value="cita">Cita</option></select></div>';
    } else if (tipo === 'email_capture') {
      html += field('Título','bf-titulo', existing ? (existing.titulo || '') : 'Suscríbete a mi newsletter');
      html += field('Texto del botón','bf-btn', existing ? (existing.boton_texto || '') : 'Suscribirme');
    } else if (tipo === 'countdown') {
      html += field('Título','bf-titulo', existing ? (existing.titulo || '') : '¡Próximo lanzamiento!');
      html += '<div class="form-group"><label class="form-label">Fecha</label><input type="datetime-local" class="form-input" id="bf-fecha" value="'+(existing ? (existing.fecha_fin || '') : '')+'"></div>';
    }

    html += '<button class="btn btn-primary btn-sm btn-block" style="margin-top:8px" onclick="addBlock(\''+tipo+'\')">' + (isEdit ? '✓ Actualizar Bloque' : '➕ Añadir') + '</button>';
    html += '</div>';
    area.innerHTML = html;
    area.classList.remove('hidden');
    var firstInput = area.querySelector('input,textarea');
    if (firstInput) firstInput.focus();
  };

  window.hideBlockForm = function() {
    editingBlockIdx = null;
    document.getElementById('block-form-area').classList.add('hidden');
  };

  function field(label, id, value) {
    var valStr = (typeof value === 'string' && !value.startsWith('http') && !value.startsWith('52')) ? value : '';
    var phStr = (typeof value === 'string' && (value.startsWith('http') || value.startsWith('52'))) ? value : '';
    return '<div class="form-group"><label class="form-label">'+label+'</label><input type="text" class="form-input" id="'+id+'" value="'+escapeHtml(valStr)+'" placeholder="'+escapeHtml(phStr)+'"></div>';
  }

  function getBlockLabel(tipo) {
    var bt = BLOCK_TYPES.find(function(b){return b.tipo===tipo;});
    return bt ? bt.icon+' '+bt.label : tipo;
  }

  // ===== ADD / UPDATE BLOCK =====
  window.addBlock = function(tipo) {
    var contenido = {};

    if (tipo === 'link' || tipo === 'ubicacion') {
      var url = gv('bf-url'); if (!url){ showToast('URL o Dirección requerida','error'); return; }
      var tit = gv('bf-titulo') || url;
      var sub = gv('bf-sub') || '';

      contenido = { url: url, direccion: url, titulo: tit, subtitulo: sub };
      
      if (editingBlockIdx !== null && blocks[editingBlockIdx]) {
        blocks[editingBlockIdx].contenido = contenido;
        showToast('Bloque actualizado ✓', 'success');
      } else {
        var newBlock = { _tempId: 't'+Date.now(), tipo: tipo, contenido: contenido, orden: blocks.length };
        blocks.push(newBlock);
        showToast('Bloque añadido ✓', 'success');
      }

      hideBlockForm();
      renderBlockList();

      // Auto fetch metadata in background if URL
      if (url.startsWith('http')) {
        var targetBlock = (editingBlockIdx !== null && blocks[editingBlockIdx]) ? blocks[editingBlockIdx] : blocks[blocks.length - 1];
        var spinner = document.getElementById('spinner-metadata') || document.getElementById('bf-spinner');
        if (spinner) spinner.style.display = 'inline-block';

        api('/metadata', { method: 'POST', body: JSON.stringify({ url: url }) })
          .then(function(meta) {
            if (meta && meta.domain && targetBlock) {
              if (meta.title && (!tit || tit === url)) targetBlock.contenido.titulo = meta.title;
              if (meta.description && !sub) targetBlock.contenido.subtitulo = meta.description;
              targetBlock.contenido.og_title = meta.title;
              targetBlock.contenido.og_description = meta.description;
              targetBlock.contenido.og_image = meta.image;
              targetBlock.contenido.favicon = meta.favicon;
              targetBlock.contenido.domain = meta.domain;
              renderBlockList();
            }
          })
          .catch(function(err) {
            console.error('Fallo obteniendo metadata:', err);
            showToast('No se pudo cargar la vista previa del enlace', 'info');
          })
          .finally(function() {
            if (spinner) spinner.style.display = 'none';
          });
      }
      editingBlockIdx = null;
      return;
    } else if (tipo==='spotify'||tipo==='youtube'||tipo==='tweet'||tipo==='tiktok') {
      var url = gv('bf-url'); if(!url){showToast('URL requerida','error');return;}
      contenido = {url:url};
    } else if (tipo === 'whatsapp') {
      var tel = gv('bf-tel'); if(!tel){showToast('Número requerido','error');return;}
      contenido = {numero:tel.replace(/[^0-9]/g,''), mensaje_default:gv('bf-msg')||''};
    } else if (tipo === 'social_icons') {
      var redes = [];
      SOCIAL_TYPES.forEach(function(s){
        var val = gv('bf-social-'+s.tipo);
        if (val) redes.push({tipo:s.tipo, url:val});
      });
      if (redes.length===0){showToast('Agrega al menos una red','error');return;}
      contenido = {redes:redes};
    } else if (tipo === 'texto') {
      var txt = gv('bf-texto'); if(!txt){showToast('Texto requerido','error');return;}
      contenido = {texto:txt, estilo:gv('bf-estilo')||'normal'};
    } else if (tipo === 'email_capture') {
      contenido = {titulo:gv('bf-titulo')||'Suscríbete', boton_texto:gv('bf-btn')||'Suscribirme'};
    } else if (tipo === 'countdown') {
      var fecha = gv('bf-fecha'); if(!fecha){showToast('Fecha requerida','error');return;}
      contenido = {titulo:gv('bf-titulo')||'', fecha_fin:fecha};
    }

    if (editingBlockIdx !== null && blocks[editingBlockIdx]) {
      blocks[editingBlockIdx].contenido = contenido;
      showToast('Bloque actualizado ✓','success');
    } else {
      blocks.push({_tempId:'t'+Date.now(), tipo:tipo, contenido:contenido, orden:blocks.length});
      showToast('Bloque añadido ✓','success');
    }

    editingBlockIdx = null;
    hideBlockForm();
    renderBlockList();
  };

  function gv(id) { var el=document.getElementById(id); return el?el.value.trim():''; }

  // ===== REMOVE / MOVE / EDIT BLOCK =====
  window.removeBlock = function(idx) {
    var b = blocks[idx];
    if (b && b.id && editId) {
      api('/bloques/'+b.id, {method:'DELETE'}).catch(function(){});
    }
    blocks.splice(idx,1);
    renderBlockList();
  };

  window.moveBlock = function(idx, dir) {
    var newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    var moved = blocks.splice(idx, 1)[0];
    blocks.splice(newIdx, 0, moved);
    blocks.forEach(function(b, i){ b.orden = i; });
    renderBlockList();
  };

  var editingBlockIdx = null;

  window.editBlock = function(idx) {
    var b = blocks[idx];
    if (!b) return;
    editingBlockIdx = idx;
    showBlockForm(b.tipo, idx);
  };

  // ===== RENDER BLOCK LIST (Interactive Controls) =====
  function renderBlockList() {
    var container = document.getElementById('block-list');
    if (!container) return;
    if (blocks.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px 0;font-size:var(--font-sm)">Toca un bloque arriba para añadirlo</p>';
      updateLivePreview();
      return;
    }
    container.innerHTML = blocks.map(function(b, i){
      try {
        if (!b || !b.tipo) return '';
        var bCont = b.contenido || {};
        var bt = BLOCK_TYPES.find(function(t){return t.tipo===b.tipo;}) || {icon:'•',label:b.tipo || 'Bloque',color:'#8E8E93'};
        var preview = bCont.titulo || bCont.url || bCont.texto || bCont.numero || (bCont.redes?bCont.redes.length+' redes':'') || '';
        if (preview.length > 30) preview = preview.substring(0,27)+'...';

        return '<div class="block-item-row" style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;margin-bottom:8px" draggable="true" ondragstart="dragStart(event,'+i+')" ondragover="event.preventDefault()" ondrop="dragDrop(event,'+i+')">' +
          '<span class="drag-handle" style="color:var(--text-muted);cursor:grab;font-size:1.1rem;padding:0 2px">☰</span>' +
          '<div style="width:32px;height:32px;border-radius:8px;background:'+bt.color+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.8rem;flex-shrink:0">'+bt.icon+'</div>' +
          '<div style="flex:1;min-width:0"><div style="font-size:var(--font-xs);color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px">'+bt.label+'</div><div style="font-size:var(--font-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#FFF;font-weight:600">'+escapeHtml(preview)+'</div></div>' +
          '<div style="display:flex;align-items:center;gap:4px">' +
            '<button class="btn btn-sm btn-ghost" onclick="moveBlock('+i+', -1)" style="padding:4px 6px;font-size:0.75rem" ' + (i === 0 ? 'disabled' : '') + '>▲</button>' +
            '<button class="btn btn-sm btn-ghost" onclick="moveBlock('+i+', 1)" style="padding:4px 6px;font-size:0.75rem" ' + (i === blocks.length - 1 ? 'disabled' : '') + '>▼</button>' +
            '<button class="btn btn-sm btn-ghost" onclick="editBlock('+i+')" style="padding:4px 6px;font-size:0.8rem;color:var(--accent)">✏️</button>' +
            '<button class="btn btn-sm btn-ghost" onclick="removeBlock('+i+')" style="padding:4px 6px;font-size:0.8rem;color:var(--red)">✕</button>' +
          '</div>' +
        '</div>';
      } catch(e) {
        console.error('Error al renderizar bloque individual:', e);
        return '';
      }
    }).join('');

    updateLivePreview();
  }

  // ===== DRAG & DROP =====
  var dragIdx = null;
  window.dragStart = function(e, i) { dragIdx = i; e.dataTransfer.effectAllowed='move'; };
  window.dragDrop = function(e, i) {
    e.preventDefault();
    if (dragIdx===null||dragIdx===i) return;
    var item = blocks.splice(dragIdx,1)[0];
    blocks.splice(i,0,item);
    blocks.forEach(function(b,j){b.orden=j;});
    dragIdx=null;
    renderBlockList();
  };

  // ===== SAVE ALL (Fast Parallel Non-Blocking) =====
  function saveAll(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (navigator.vibrate) { try { navigator.vibrate(50); } catch(e){} }

    var nombre = gv('nombre_perfil');
    var inputNombre = document.getElementById('nombre_perfil');
    if (!nombre || !nombre.trim()) {
      if (inputNombre) {
        inputNombre.style.borderColor = 'var(--red)';
        inputNombre.focus();
      }
      alert('⚠️ El nombre de la tarjeta es obligatorio.');
      return;
    }

    var saveBtn = document.getElementById('btn-final-save');
    var navSaveBtn = document.getElementById('btn-save');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⚡ Guardando...'; }
    if (navSaveBtn) { navSaveBtn.disabled = true; navSaveBtn.textContent = 'Guardando...'; }

    var formData = new FormData();
    formData.append('nombre_perfil', nombre.trim());
    formData.append('tipo', gv('tipo_perfil') || 'personal');
    formData.append('color', selectedColor || '#7C3AED');
    formData.append('tema', selectedTheme || 'ios');
    formData.append('marco_estilo', gv('marco_estilo') || 'solid');
    formData.append('bio', gv('bio_perfil') || '');
    formData.append('cumpleanos', gv('cumpleanos') || '');
    formData.append('lugar_estudio', gv('lugar_estudio') || '');
    formData.append('pronombres', gv('pronombres') || '');

    var fotoInput = document.getElementById('input-foto');
    if (fotoInput && fotoInput.files && fotoInput.files[0]) {
      formData.append('foto', fotoInput.files[0]);
    }

    var method = editId ? 'PUT' : 'POST';
    var url = editId ? '/perfiles/' + editId : '/perfiles';

    api(url, { method: method, body: formData, headers: {} })
      .then(function(data) {
        if (!data || data.error) throw new Error(data ? (data.error || data.mensaje) : 'Respuesta inválida del servidor');
        var perfilId = data.id || editId;
        profileSlug = data.slug || profileSlug;

        // Fast Parallel Save (< 500ms)
        var blockPromises = blocks.map(function(b, idx) {
          if (b.id) {
            return api('/bloques/' + b.id, {
              method: 'PUT',
              body: JSON.stringify({ tipo: b.tipo, contenido: b.contenido, orden: idx })
            }).catch(function(){});
          }
          return api('/perfiles/' + perfilId + '/bloques', {
            method: 'POST',
            body: JSON.stringify({ tipo: b.tipo, contenido: b.contenido, orden: idx })
          });
        });

        return Promise.all(blockPromises);
      })
      .then(function() {
        if (saveBtn) saveBtn.textContent = '¡Guardado con éxito!';
        if (navSaveBtn) navSaveBtn.textContent = '¡Guardado!';
        showToast('¡Tarjeta guardada con éxito!', 'success');
        setTimeout(function() {
          window.location.replace('/dashboard.html');
        }, 300);
      })
      .catch(function(err) {
        console.error('❌ Error exacto en saveAll:', err);
        alert('❌ Error al guardar la tarjeta: ' + (err.message || err.error || 'Error de conexión'));
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '⚡ Guardar & Publicar Identidad Digital'; }
        if (navSaveBtn) { navSaveBtn.disabled = false; navSaveBtn.textContent = '⚡ Guardar'; }
      });
  }

  function saveBlocksSeq(perfilId, idx) {
    if (idx >= blocks.length) return Promise.resolve();
    var b = blocks[idx];
    if (b.id) return saveBlocksSeq(perfilId, idx+1); // already saved

    return api('/perfiles/'+perfilId+'/bloques', {
      method:'POST',
      body: JSON.stringify({tipo:b.tipo, contenido:b.contenido, orden:idx})
    }).then(function(){ return saveBlocksSeq(perfilId, idx+1); });
  }

  // ===== LOAD EXISTING =====
  function loadExisting(id) {
    api('/perfiles').then(function(data){
      var perfiles = Array.isArray(data) ? data : [];
      var p = perfiles.find(function(x){return x.id==id;});
      if (!p) { showToast('No encontrado','error'); return; }

      document.getElementById('nombre_perfil').value = p.nombre_perfil || '';
      document.getElementById('tipo_perfil').value = p.tipo || 'personal';
      document.getElementById('bio_perfil').value = p.bio || '';
      document.getElementById('cumpleanos').value = p.cumpleanos || '';
      document.getElementById('lugar_estudio').value = p.lugar_estudio || '';
      document.getElementById('pronombres').value = p.pronombres || '';
      var elMarco = document.getElementById('marco_estilo');
      if (elMarco && p.marco_estilo) elMarco.value = p.marco_estilo;
      profileSlug = p.slug;

      if (p.color) {
        selectedColor = p.color;
        document.querySelectorAll('.color-option').forEach(function(c){
          c.style.borderColor = c.dataset.color === p.color ? 'var(--text-primary)' : 'transparent';
        });
      }

      if (p.foto_url) {
        document.getElementById('photo-preview').innerHTML = '<img src="'+p.foto_url+'" style="width:100%;height:100%;object-fit:cover">';
      }

      if (profileSlug) {
        var previewBtn = document.getElementById('btn-preview');
        previewBtn.href = '/u/'+profileSlug;
        previewBtn.classList.remove('hidden');
      }

      // Load blocks
      return api('/perfiles/'+id+'/bloques');
    }).then(function(data){
      if (data && Array.isArray(data)) {
        blocks = data.map(function(b){
          var c = typeof b.contenido === 'string' ? JSON.parse(b.contenido) : b.contenido;
          return {id:b.id, tipo:b.tipo, contenido:c, orden:b.orden};
        });
        renderBlockList();
      }
    }).catch(function(err){
      console.error(err);
      alert('Error al cargar datos. Reintente.');
    });
  }

  function escapeHtml(t){if(!t)return'';var d=document.createElement('div');d.textContent=t;return d.innerHTML;}
})();
