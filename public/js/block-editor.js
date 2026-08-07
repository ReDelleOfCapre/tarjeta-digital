// ============================================
// My ID — Block Editor v3
// ============================================
(function(){
  if (!checkAuth()) return;

  // ===== CONFIG =====
  var BLOCK_TYPES = [
    { tipo:'link', label:'Link', icon:'📎', color:'#007AFF' },
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
  var selectedColor = '#007AFF';
  var selectedTheme = 'ios';
  var blocks = []; // [{_tempId, tipo, contenido, id?}]
  var profileSlug = null;

  // ===== INIT =====
  renderThemes();
  renderPalette();
  renderBlockList();
  setupColorPicker();
  setupPhotoUpload();

  if (editId) {
    document.getElementById('page-title').textContent = 'Editar tarjeta';
    loadExisting(editId);
  }

  document.getElementById('btn-save').addEventListener('click', saveAll);
  document.getElementById('btn-final-save').addEventListener('click', saveAll);

  // ===== STEPS =====
  window.goStep = function(s) {
    for (var i=1;i<=3;i++) {
      document.getElementById('step-'+i).classList.toggle('hidden', i!==s);
      var dot = document.getElementById('dot-'+i);
      dot.classList.remove('active','done');
      if (i<s) dot.classList.add('done');
      if (i===s) dot.classList.add('active');
    }
    window.scrollTo(0,0);
  };

  // ===== COLOR PICKER =====
  function setupColorPicker() {
    document.querySelectorAll('.color-option').forEach(function(el){
      el.addEventListener('click', function(){
        document.querySelectorAll('.color-option').forEach(function(c){
          c.style.borderColor = 'transparent';
        });
        el.style.borderColor = 'var(--text-primary)';
        selectedColor = el.dataset.color;
      });
    });
    // Set initial
    document.querySelector('.color-option[data-color="#007AFF"]').style.borderColor = 'var(--text-primary)';
  }

  // ===== PHOTO =====
  function setupPhotoUpload() {
    document.getElementById('input-foto').addEventListener('change', function(e){
      var file = e.target.files[0];
      if (!file) return;
      if (file.size > 5*1024*1024) { showToast('Máximo 5MB','error'); return; }
      var reader = new FileReader();
      reader.onload = function(ev) {
        var preview = document.getElementById('photo-preview');
        preview.innerHTML = '<img src="'+ev.target.result+'" style="width:100%;height:100%;object-fit:cover">';
      };
      reader.readAsDataURL(file);
    });
  }

  // ===== THEMES =====
  function renderThemes() {
    var container = document.getElementById('theme-picker');
    container.innerHTML = THEMES.map(function(t){
      var isActive = selectedTheme === t.id;
      return '<div style="padding:8px;border-radius:12px;cursor:pointer;text-align:center;border:2px solid '+(isActive?'var(--accent)':'transparent')+';background:var(--bg-card)" onclick="selectTheme(\''+t.id+'\')">' +
        '<div style="height:48px;border-radius:8px;background:'+t.bg+';margin-bottom:6px;display:flex;flex-direction:column;justify-content:center;padding:6px">' +
          '<div style="height:6px;border-radius:3px;background:'+t.accent+';width:70%;margin-bottom:4px"></div>' +
          '<div style="height:6px;border-radius:3px;background:'+t.accent+';width:50%;opacity:0.5"></div>' +
        '</div>' +
        '<span style="font-size:var(--font-xs);font-weight:600">'+t.name+'</span>' +
      '</div>';
    }).join('');
  }

  window.selectTheme = function(id) {
    selectedTheme = id;
    renderThemes();
  };

  // ===== BLOCK PALETTE =====
  function renderPalette() {
    var container = document.getElementById('block-palette');
    container.innerHTML = BLOCK_TYPES.map(function(b){
      return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px;border-radius:12px;background:var(--bg-tertiary);cursor:pointer;min-width:65px;font-size:var(--font-xs);color:var(--text-secondary)" onclick="showBlockForm(\''+b.tipo+'\')">' +
        '<span style="font-size:1.2rem">'+b.icon+'</span>'+b.label +
      '</div>';
    }).join('');
  }

  // ===== BLOCK FORM =====
  window.showBlockForm = function(tipo) {
    var area = document.getElementById('block-form-area');
    var html = '<div class="card p-16" style="border:2px solid var(--accent)">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><strong>'+getBlockLabel(tipo)+'</strong><button class="btn btn-sm btn-ghost" onclick="hideBlockForm()">✕</button></div>';

    if (tipo === 'link') {
      html += field('URL *','bf-url','https://...');
      html += field('Título *','bf-titulo','Mi enlace');
      html += field('Subtítulo','bf-sub','Descripción corta');
    } else if (tipo === 'spotify' || tipo === 'youtube' || tipo === 'tweet' || tipo === 'tiktok') {
      html += field('URL *','bf-url','Pega la URL de '+tipo);
    } else if (tipo === 'whatsapp') {
      html += field('Número *','bf-tel','522311556138');
      html += field('Mensaje','bf-msg','Hola, te contacto desde VYNK');
    } else if (tipo === 'social_icons') {
      html += '<p style="font-size:var(--font-xs);color:var(--text-muted);margin-bottom:8px">Agrega tus redes (deja vacío las que no uses)</p>';
      SOCIAL_TYPES.forEach(function(s){
        html += '<div class="form-group" style="margin-bottom:6px"><label class="form-label" style="font-size:var(--font-xs)">'+s.icon+' '+s.label+'</label><input type="text" class="form-input" id="bf-social-'+s.tipo+'" placeholder="@usuario o URL" style="padding:8px 12px;font-size:var(--font-sm)"></div>';
      });
    } else if (tipo === 'texto') {
      html += '<div class="form-group"><label class="form-label">Texto</label><textarea class="form-input" id="bf-texto" rows="3" placeholder="Tu texto aquí"></textarea></div>';
      html += '<div class="form-group"><label class="form-label">Estilo</label><select class="form-select" id="bf-estilo"><option value="normal">Normal</option><option value="titulo">Título</option><option value="cita">Cita</option></select></div>';
    } else if (tipo === 'email_capture') {
      html += field('Título','bf-titulo','Suscríbete a mi newsletter');
      html += field('Texto del botón','bf-btn','Suscribirme');
    } else if (tipo === 'countdown') {
      html += field('Título','bf-titulo','¡Próximo lanzamiento!');
      html += '<div class="form-group"><label class="form-label">Fecha</label><input type="datetime-local" class="form-input" id="bf-fecha"></div>';
    }

    html += '<button class="btn btn-primary btn-sm btn-block" style="margin-top:8px" onclick="addBlock(\''+tipo+'\')">Añadir</button>';
    html += '</div>';
    area.innerHTML = html;
    area.classList.remove('hidden');
    var firstInput = area.querySelector('input,textarea');
    if (firstInput) firstInput.focus();
  };

  window.hideBlockForm = function() {
    document.getElementById('block-form-area').classList.add('hidden');
  };

  function field(label, id, placeholder) {
    return '<div class="form-group"><label class="form-label">'+label+'</label><input type="text" class="form-input" id="'+id+'" placeholder="'+(placeholder||'')+'"></div>';
  }

  function getBlockLabel(tipo) {
    var bt = BLOCK_TYPES.find(function(b){return b.tipo===tipo;});
    return bt ? bt.icon+' '+bt.label : tipo;
  }

  // ===== ADD BLOCK =====
  window.addBlock = function(tipo) {
    var contenido = {};

    if (tipo === 'link') {
      var url = gv('bf-url'); if(!url){showToast('URL requerida','error');return;}
      contenido = {url:url, titulo:gv('bf-titulo')||url, subtitulo:gv('bf-sub')||''};
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

    blocks.push({_tempId:'t'+Date.now(), tipo:tipo, contenido:contenido, orden:blocks.length});
    hideBlockForm();
    renderBlockList();
    showToast('Bloque añadido ✓','success');
  };

  function gv(id) { var el=document.getElementById(id); return el?el.value.trim():''; }

  // ===== REMOVE BLOCK =====
  window.removeBlock = function(idx) {
    var b = blocks[idx];
    if (b.id && editId) {
      api('/bloques/'+b.id, {method:'DELETE'}).catch(function(){});
    }
    blocks.splice(idx,1);
    renderBlockList();
  };

  // ===== RENDER BLOCK LIST =====
  function renderBlockList() {
    var container = document.getElementById('block-list');
    if (blocks.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px 0;font-size:var(--font-sm)">Toca un bloque arriba para añadirlo</p>';
      return;
    }
    container.innerHTML = blocks.map(function(b, i){
      var bt = BLOCK_TYPES.find(function(t){return t.tipo===b.tipo;}) || {icon:'•',label:b.tipo,color:'#8E8E93'};
      var preview = b.contenido.titulo || b.contenido.url || b.contenido.texto || b.contenido.numero || (b.contenido.redes?b.contenido.redes.length+' redes':'') || '';
      if (preview.length > 40) preview = preview.substring(0,37)+'...';

      return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:0.5px solid var(--separator)" draggable="true" ondragstart="dragStart(event,'+i+')" ondragover="event.preventDefault()" ondrop="dragDrop(event,'+i+')">' +
        '<span style="color:var(--text-muted);cursor:grab;font-size:1.1rem">☰</span>' +
        '<div style="width:32px;height:32px;border-radius:8px;background:'+bt.color+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.8rem;flex-shrink:0">'+bt.icon+'</div>' +
        '<div style="flex:1;min-width:0"><div style="font-size:var(--font-xs);color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px">'+bt.label+'</div><div style="font-size:var(--font-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escapeHtml(preview)+'</div></div>' +
        '<button class="btn btn-sm btn-ghost" onclick="removeBlock('+i+')" style="color:var(--red);font-size:0.8rem">✕</button>' +
      '</div>';
    }).join('');
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

  // ===== SAVE =====
  function saveAll() {
    var nombre = gv('nombre_perfil');
    if (!nombre) { showToast('El nombre es obligatorio','error'); goStep(1); return; }

    var saveBtn = document.getElementById('btn-final-save');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    var formData = new FormData();
    formData.append('nombre_perfil', nombre);
    formData.append('tipo', gv('tipo_perfil') || 'personal');
    formData.append('color', selectedColor);
    formData.append('bio', gv('bio_perfil'));
    formData.append('cumpleanos', gv('cumpleanos'));
    formData.append('lugar_estudio', gv('lugar_estudio'));
    formData.append('pronombres', gv('pronombres'));

    var fotoFile = document.getElementById('input-foto').files[0];
    if (fotoFile) formData.append('foto', fotoFile);

    var method = editId ? 'PUT' : 'POST';
    var url = editId ? '/perfiles/'+editId : '/perfiles';

    api(url, {method:method, body:formData, headers:{}})
      .then(function(data){
        if (!data || data.error) throw data;
        var perfilId = data.id || editId;
        profileSlug = data.slug;

        // Save blocks sequentially
        return saveBlocksSeq(perfilId, 0);
      })
      .then(function(){
        showToast(editId?'Tarjeta actualizada':'¡Tarjeta creada!','success');
        if (profileSlug) {
          var previewBtn = document.getElementById('btn-preview');
          previewBtn.href = '/u/'+profileSlug;
          previewBtn.classList.remove('hidden');
        }
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Guardar tarjeta';
      })
      .catch(function(err){
        showToast((err&&err.error)||'Error al guardar','error');
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Guardar tarjeta';
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
      console.warn('Error loading:', err);
    });
  }

  function escapeHtml(t){if(!t)return'';var d=document.createElement('div');d.textContent=t;return d.innerHTML;}
})();
