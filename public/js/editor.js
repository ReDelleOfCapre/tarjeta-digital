// ============================================
// My ID — Editor Logic
// ============================================
(function() {
  if (!checkAuth()) return;
  var user = getUser();

  // Field type definitions
  var FIELD_TYPES = [
    { tipo: 'whatsapp', label: 'WhatsApp', icon: '💬', color: '#25D366', placeholder: 'Número con lada: 522311556138' },
    { tipo: 'telefono', label: 'Teléfono', icon: '📞', color: '#34C759', placeholder: 'Número de teléfono' },
    { tipo: 'email', label: 'Email', icon: '✉️', color: '#FF9500', placeholder: 'correo@ejemplo.com' },
    { tipo: 'instagram', label: 'Instagram', icon: '📷', color: '#E4405F', placeholder: '@usuario' },
    { tipo: 'tiktok', label: 'TikTok', icon: '♪', color: '#000', placeholder: '@usuario' },
    { tipo: 'facebook', label: 'Facebook', icon: 'f', color: '#1877F2', placeholder: 'URL o usuario' },
    { tipo: 'twitter', label: 'X', icon: '𝕏', color: '#1DA1F2', placeholder: '@usuario' },
    { tipo: 'youtube', label: 'YouTube', icon: '▶', color: '#FF0000', placeholder: '@canal o URL' },
    { tipo: 'linkedin', label: 'LinkedIn', icon: 'in', color: '#0A66C2', placeholder: 'URL o usuario' },
    { tipo: 'spotify', label: 'Spotify', icon: '🎵', color: '#1DB954', placeholder: 'URL de playlist o perfil' },
    { tipo: 'twitch', label: 'Twitch', icon: '🎬', color: '#9146FF', placeholder: 'usuario' },
    { tipo: 'kick', label: 'Kick', icon: 'K', color: '#53FC18', placeholder: 'usuario' },
    { tipo: 'discord', label: 'Discord', icon: '🎮', color: '#5865F2', placeholder: 'usuario#0000 o link' },
    { tipo: 'telegram', label: 'Telegram', icon: '✈', color: '#26A5E4', placeholder: '@usuario' },
    { tipo: 'threads', label: 'Threads', icon: '@', color: '#000', placeholder: '@usuario' },
    { tipo: 'snapchat', label: 'Snapchat', icon: '👻', color: '#FFFC00', placeholder: 'usuario' },
    { tipo: 'web', label: 'Sitio web', icon: '🌐', color: '#007AFF', placeholder: 'www.ejemplo.com' },
    { tipo: 'github', label: 'GitHub', icon: '⌨', color: '#333', placeholder: 'usuario' },
    { tipo: 'amazon_wishlist', label: 'Amazon Wishlist', icon: '🛒', color: '#FF9900', placeholder: 'URL de lista' },
    { tipo: 'steam', label: 'Steam', icon: '🎮', color: '#1B2838', placeholder: 'usuario' },
    { tipo: 'xbox', label: 'Xbox', icon: '🎯', color: '#107C10', placeholder: 'Gamertag' },
    { tipo: 'psn', label: 'PlayStation', icon: '🎯', color: '#003087', placeholder: 'PSN ID' },
    { tipo: 'pinterest', label: 'Pinterest', icon: '📌', color: '#E60023', placeholder: 'usuario' },
    { tipo: 'reddit', label: 'Reddit', icon: '🔴', color: '#FF4500', placeholder: 'u/usuario' },
    { tipo: 'behance', label: 'Behance', icon: 'Bē', color: '#1769FF', placeholder: 'usuario' },
    { tipo: 'dribbble', label: 'Dribbble', icon: '🏀', color: '#EA4C89', placeholder: 'usuario' },
    { tipo: 'apple_music', label: 'Apple Music', icon: '♫', color: '#FC3C44', placeholder: 'URL' },
    { tipo: 'portafolio', label: 'Portafolio', icon: '💼', color: '#AF52DE', placeholder: 'URL' },
    { tipo: 'direccion', label: 'Dirección', icon: '📍', color: '#FF3B30', placeholder: 'Tu dirección' },
    { tipo: 'otro', label: 'Otro', icon: '•', color: '#8E8E93', placeholder: 'Valor' }
  ];

  var params = new URLSearchParams(location.search);
  var editId = params.get('id');
  var selectedColor = '#007AFF';
  var selectedTema = 'ios';
  var selectedFieldType = null;
  var addedFields = []; // {tipo, valor, etiqueta, id?}
  var existingFoto = null;

  // Init
  renderFieldChips();
  setupColorPicker();
  setupThemePicker();
  setupPhotoUpload();

  if (editId) {
    document.getElementById('page-title').textContent = 'Editar tarjeta';
    loadProfile(editId);
  }

  document.getElementById('btn-save').addEventListener('click', saveProfile);

  // --- Steps ---
  window.goStep = function(step) {
    for (var i = 1; i <= 3; i++) {
      document.getElementById('step-' + i).classList.toggle('hidden', i !== step);
      var dot = document.getElementById('dot-' + i);
      dot.classList.remove('active', 'done');
      if (i < step) dot.classList.add('done');
      if (i === step) dot.classList.add('active');
    }
    window.scrollTo(0, 0);
  };

  // --- Color Picker ---
  function setupColorPicker() {
    document.querySelectorAll('.color-option').forEach(function(el) {
      el.addEventListener('click', function() {
        document.querySelectorAll('.color-option').forEach(function(c) { c.classList.remove('active'); });
        el.classList.add('active');
        selectedColor = el.dataset.color;
      });
    });
  }

  // --- Theme Picker ---
  function setupThemePicker() {
    document.querySelectorAll('.theme-option').forEach(function(el) {
      el.addEventListener('click', function() {
        document.querySelectorAll('.theme-option').forEach(function(t) { t.classList.remove('selected'); });
        el.classList.add('selected');
        selectedTema = el.dataset.theme;
      });
    });
  }

  // --- Photo Upload ---
  function setupPhotoUpload() {
    document.getElementById('input-foto').addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        showToast('El archivo es demasiado grande (máx 5MB)', 'error');
        return;
      }
      var reader = new FileReader();
      reader.onload = function(ev) {
        document.getElementById('photo-img').src = ev.target.result;
        document.getElementById('photo-img').style.display = 'block';
        document.getElementById('photo-placeholder').style.display = 'none';

        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas');
          var MAX_WIDTH = 800;
          var MAX_HEIGHT = 800;
          var width = img.width;
          var height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          window.fotoBase64 = canvas.toDataURL('image/jpeg', 0.85);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // --- Field Chips ---
  function renderFieldChips() {
    var container = document.getElementById('field-chips');
    container.innerHTML = FIELD_TYPES.map(function(f) {
      return '<button class="field-chip" data-tipo="' + f.tipo + '" ' +
        'style="border-color:transparent" ' +
        'onclick="selectFieldType(\'' + f.tipo + '\')">' +
        '<span style="font-size:0.875rem">' + f.icon + '</span> ' + f.label +
      '</button>';
    }).join('');
  }

  window.selectFieldType = function(tipo) {
    var def = FIELD_TYPES.find(function(f) { return f.tipo === tipo; });
    if (!def) return;

    selectedFieldType = tipo;
    document.getElementById('field-type-label').textContent = def.label;
    document.getElementById('field-value').placeholder = def.placeholder;
    document.getElementById('field-value').value = '';
    document.getElementById('field-label').value = '';
    document.getElementById('add-field-form').classList.remove('hidden');
    document.getElementById('field-value').focus();

    // Highlight chip
    document.querySelectorAll('.field-chip').forEach(function(c) { c.classList.remove('selected'); });
    var chip = document.querySelector('.field-chip[data-tipo="' + tipo + '"]');
    if (chip) chip.classList.add('selected');
  };

  window.cancelField = function() {
    document.getElementById('add-field-form').classList.add('hidden');
    selectedFieldType = null;
    document.querySelectorAll('.field-chip').forEach(function(c) { c.classList.remove('selected'); });
  };

  window.saveField = function() {
    var valor = document.getElementById('field-value').value.trim();
    if (!valor) { showToast('Ingresa un valor', 'error'); return; }

    var etiqueta = document.getElementById('field-label').value.trim();
    addedFields.push({ tipo: selectedFieldType, valor: valor, etiqueta: etiqueta || null });
    renderAddedFields();
    cancelField();
    showToast('Campo agregado', 'success');
  };

  window.removeField = function(index) {
    var removed = addedFields[index];
    // If it has an ID, delete from server
    if (removed.id && editId) {
      api('/campos/' + removed.id, { method: 'DELETE' });
    }
    addedFields.splice(index, 1);
    renderAddedFields();
  };

  function renderAddedFields() {
    var container = document.getElementById('added-fields');
    if (addedFields.length === 0) {
      container.innerHTML = '<p class="text-muted text-center text-sm" style="padding:24px 0">Selecciona los campos que quieres agregar</p>';
      return;
    }

    container.innerHTML = addedFields.map(function(f, i) {
      var def = FIELD_TYPES.find(function(d) { return d.tipo === f.tipo; }) || { icon: '•', color: '#8E8E93', label: f.tipo };
      return '<div class="added-field">' +
        '<div class="field-icon" style="background:' + def.color + '">' + def.icon + '</div>' +
        '<div class="field-info">' +
          '<div class="field-label">' + escapeHtml(f.etiqueta || def.label) + '</div>' +
          '<div class="field-value">' + escapeHtml(f.valor) + '</div>' +
        '</div>' +
        '<span class="field-remove" onclick="removeField(' + i + ')">✕</span>' +
      '</div>';
    }).join('');
  }

  // Init empty state
  renderAddedFields();

  // --- Load existing profile ---
  function loadProfile(id) {
    api('/perfiles').then(function(data) {
      var perfiles = Array.isArray(data) ? data : (data.perfiles || []);
      var perfil = perfiles.find(function(p) { return p.id == id; });
      if (!perfil) { showToast('Tarjeta no encontrada', 'error'); return; }

      document.getElementById('nombre-perfil').value = perfil.nombre_perfil;
      document.getElementById('tipo-perfil').value = perfil.tipo || 'personal';
      document.getElementById('bio-perfil').value = perfil.bio || '';
      document.getElementById('cumpleanos').value = perfil.cumpleanos || '';
      document.getElementById('lugar-estudio').value = perfil.lugar_estudio || '';
      document.getElementById('pronombres').value = perfil.pronombres || '';

      if (perfil.color) {
        selectedColor = perfil.color;
        document.querySelectorAll('.color-option').forEach(function(c) {
          c.classList.toggle('active', c.dataset.color === perfil.color);
        });
      }
      
      if (perfil.tema) {
        selectedTema = perfil.tema;
        document.querySelectorAll('.theme-option').forEach(function(t) {
          t.classList.toggle('selected', t.dataset.theme === perfil.tema);
        });
      }

      if (perfil.foto_url) {
        existingFoto = perfil.foto_url;
        document.getElementById('photo-img').src = perfil.foto_url;
        document.getElementById('photo-img').style.display = 'block';
        document.getElementById('photo-placeholder').style.display = 'none';
      }

      // Load campos
      return api('/perfiles/' + id + '/campos');
    }).then(function(data) {
      if (!data) return;
      var campos = Array.isArray(data) ? data : (data.campos || []);
      addedFields = campos.map(function(c) {
        return { id: c.id, tipo: c.tipo, valor: c.valor, etiqueta: c.etiqueta };
      });
      renderAddedFields();
    }).catch(function() {});
  }

  // --- Save Profile ---
  window.saveProfile = function() {
    var nombre = document.getElementById('nombre-perfil').value.trim();
    if (!nombre) { showToast('El nombre es obligatorio', 'error'); goStep(1); return; }

    var btn = document.getElementById('btn-final-save');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    var formData = new FormData();
    formData.append('nombre_perfil', nombre);
    formData.append('tipo', document.getElementById('tipo-perfil').value);
    formData.append('color', selectedColor);
    formData.append('tema', selectedTema);

    var bio = document.getElementById('bio-perfil').value.trim();
    var cumpleanos = document.getElementById('cumpleanos').value.trim();
    var lugarEstudio = document.getElementById('lugar-estudio').value.trim();
    var pronombres = document.getElementById('pronombres').value.trim();

    if (bio) formData.append('bio', bio);
    if (cumpleanos) formData.append('cumpleanos', cumpleanos);
    if (lugarEstudio) formData.append('lugar_estudio', lugarEstudio);
    if (pronombres) formData.append('pronombres', pronombres);

    if (window.fotoBase64) {
      formData.append('foto_base64', window.fotoBase64);
    } else {
      var fotoFile = document.getElementById('input-foto').files[0];
      if (fotoFile) formData.append('foto', fotoFile);
    }

    var method = editId ? 'PUT' : 'POST';
    var url = editId ? '/perfiles/' + editId : '/perfiles';

    api(url, { method: method, body: formData, headers: {} })
      .then(function(data) {
        if (!data || data.error) {
          btn.disabled = false;
          btn.textContent = '💾 Guardar tarjeta';
          return;
        }

        var perfilId = data.id || editId;
        if (!editId && addedFields.length > 0) {
          // Save fields for new profile
          return saveFieldsSequentially(perfilId, 0);
        }
        return perfilId;
      })
      .then(function(perfilId) {
        if (perfilId) {
          showToast(editId ? 'Tarjeta actualizada' : '¡Tarjeta creada!', 'success');
          setTimeout(function() { location.href = '/dashboard.html'; }, 500);
        }
      })
      .catch(function(err) {
        showToast(err.error || err.mensaje || 'Error al guardar', 'error');
        btn.disabled = false;
        btn.textContent = '💾 Guardar tarjeta';
      });
  };

  function saveFieldsSequentially(perfilId, index) {
    if (index >= addedFields.length) return perfilId;
    var f = addedFields[index];
    if (f.id) return saveFieldsSequentially(perfilId, index + 1); // skip existing

    return api('/perfiles/' + perfilId + '/campos', {
      method: 'POST',
      body: JSON.stringify({ tipo: f.tipo, valor: f.valor, etiqueta: f.etiqueta, orden: index })
    }).then(function() {
      return saveFieldsSequentially(perfilId, index + 1);
    });
  }

  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
