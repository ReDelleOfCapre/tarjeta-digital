// ============================================
// VYNK Intelligence — vynk-intelligence.js (editor)
// Panel "VYNK Intelligence" dentro del editor:
// score, breakdown, recomendaciones accionables,
// aplicar mejoras con undo/redo. Determinístico,
// sin LLM. La lógica vive en el servidor
// (services/intelligence); este archivo solo UI.
// ============================================

(function () {
  'use strict';

  var scoreEl = document.getElementById('intel-score');
  var msgEl = document.getElementById('intel-message');
  var breakdownEl = document.getElementById('intel-breakdown');
  var recsEl = document.getElementById('intel-recs');
  var undoBtn = document.getElementById('intel-undo');
  var applyAllBtn = document.getElementById('intel-apply-all');
  var refreshBtn = document.getElementById('intel-refresh');

  if (!scoreEl) return;

  // --- Undo / redo: snapshot del estado real del editor ---
  var history = [];
  var historyIdx = -1;

  function pushSnapshot() {
    if (!window.vynkEditorBridge) return;
    var snap = window.vynkEditorBridge.getState();
    // Recorta historial futuro si ya hicimos undo.
    history = history.slice(0, historyIdx + 1);
    history.push(snap);
    if (history.length > 20) history.shift();
    historyIdx = history.length - 1;
    updateUndoBtn();
  }

  function restoreSnapshot(snap) {
    if (!snap) return;
    if (window.vynkEditorBridge.setTheme) window.vynkEditorBridge.setTheme(snap.theme);
    if (window.vynkEditorBridge.setColor) window.vynkEditorBridge.setColor(snap.color);
    if (window.vynkEditorBridge.reorderByTipo) {
      window.vynkEditorBridge.reorderByTipo(snap.blocks.map(function (b) { return b.tipo; }));
    }
  }

  function updateUndoBtn() {
    if (undoBtn) undoBtn.disabled = historyIdx <= 0;
  }

  if (undoBtn) {
    undoBtn.addEventListener('click', function () {
      if (historyIdx <= 0) return;
      historyIdx -= 1;
      restoreSnapshot(history[historyIdx]);
      updateUndoBtn();
      reanalyze();
    });
  }

  // --- Carga del análisis desde el servidor ---
  function currentProfile() {
    var tipoSel = document.getElementById('tipo_perfil');
    return {
      nombre_perfil: (document.getElementById('nombre_perfil') || {}).value || '',
      tipo: tipoSel ? tipoSel.value : 'personal',
      bio: (document.getElementById('bio_perfil') || {}).value || '',
      foto_url: '',
      color: window.vynkEditorBridge ? window.vynkEditorBridge.getState().color : '#E8A33D',
      tema: window.vynkEditorBridge ? window.vynkEditorBridge.getState().theme : 'auto'
    };
  }

  function currentBlocks() {
    if (!window.vynkEditorBridge) return [];
    return window.vynkEditorBridge.getState().blocks.map(function (b) {
      return { tipo: b.tipo, contenido: b.contenido || {}, visible: b.visible === false ? 0 : 1 };
    });
  }

  function reanalyze() {
    if (!scoreEl) return;
    scoreEl.textContent = '…';
    if (msgEl) msgEl.textContent = 'Analizando tu identidad…';
    if (recsEl) recsEl.innerHTML = '<div class="vynk-intel-empty">Analizando…</div>';
    if (breakdownEl) breakdownEl.innerHTML = '';

    var payload = {
      profile: currentProfile(),
      blocks: currentBlocks()
    };

    api('/intelligence/analyze', { method: 'POST', body: JSON.stringify(payload) })
      .then(function (data) {
        if (!data || data.error) throw data || { error: 'Sin respuesta' };
        render(data);
      })
      .catch(function () {
        if (scoreEl) scoreEl.textContent = '–';
        if (msgEl) msgEl.textContent = 'No se pudo analizar. Intenta de nuevo.';
        if (recsEl) recsEl.innerHTML = '<div class="vynk-intel-empty">Error al conectar.</div>';
      });
  }

  // --- Render del panel ---
  var CATEGORY_LABELS = { design: 'Diseño', content: 'Contenido', conversion: 'Conversión', branding: 'Marca' };

  function render(data) {
    var score = (data.score && data.score.score) || 0;
    if (scoreEl) scoreEl.textContent = score;
    if (msgEl) msgEl.textContent = (data.score && data.score.message) || '';

    // Breakdown
    if (breakdownEl && data.score && data.score.breakdown) {
      var items = Object.keys(data.score.breakdown).map(function (key) {
        return data.score.breakdown[key];
      });
      breakdownEl.innerHTML = items.map(function (b) {
        var pct = b.max > 0 ? Math.round((b.score / b.max) * 100) : 0;
        return '<div class="vynk-intel-bar">' +
          '<div class="vynk-intel-bar-label"><span>' + escapeHtml(b.label) + '</span><strong>' + pct + '%</strong></div>' +
          '<div class="vynk-intel-bar-track"><div class="vynk-intel-bar-fill" style="width:' + pct + '%"></div></div>' +
          '</div>';
      }).join('');
    }

    // Recomendaciones
    var recs = (data.recommendations || []).slice(0, 6);
    if (recsEl) {
      if (!recs.length) {
        recsEl.innerHTML = '<div class="vynk-intel-empty">Sin recomendaciones pendientes. Tu identidad está bien encaminada.</div>';
      } else {
        recsEl.innerHTML = recs.map(function (r, idx) {
          var cat = CATEGORY_LABELS[r.category] || r.category;
          return '<div class="vynk-intel-rec" data-level="' + escapeHtml(r.level || 'info') + '" data-idx="' + idx + '">' +
            '<div class="vynk-intel-rec-body">' +
              '<div class="vynk-intel-rec-cat">' + escapeHtml(cat) + '</div>' +
              '<div class="vynk-intel-rec-title">' + escapeHtml(r.title) + '</div>' +
              '<div>' + escapeHtml(r.message) + '</div>' +
            '</div>' +
            (r.action ? '<button type="button" class="editor-btn vynk-intel-rec-btn" data-apply="' + idx + '">Aplicar</button>' : '') +
          '</div>';
        }).join('');

        recsEl.querySelectorAll('[data-apply]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var idx = Number(btn.getAttribute('data-apply'));
            var rec = recs[idx];
            if (rec && rec.action) {
              pushSnapshot();
              applyAction(rec.action);
              markApplied(btn);
            }
          });
        });
      }
    }

    // Botón aplicar todas las mejoras accionables
    var actionable = recs.filter(function (r) { return r.action && r.action.type !== 'focus_field' && r.action.type !== 'add_block'; });
    var actionableAdd = recs.filter(function (r) { return r.action && r.action.type === 'add_block'; });

    if (applyAllBtn) {
      applyAllBtn.disabled = !actionable.length && !actionableAdd.length;
    }
  }

  function markApplied(btn) {
    var card = btn.closest('.vynk-intel-rec');
    if (card) {
      card.classList.add('applied');
      btn.remove();
    }
  }

  // --- Aplicación de acciones reales sobre el editor ---
  function applyAction(action) {
    if (!action || !window.vynkEditorBridge) return;
    var bridge = window.vynkEditorBridge;

    switch (action.type) {
      case 'set_theme':
        if (action.themeId) bridge.setTheme(action.themeId);
        break;
      case 'set_color':
        if (action.color) bridge.setColor(action.color);
        break;
      case 'move_cta':
        if (Array.isArray(action.order)) bridge.reorderByTipo(action.order);
        break;
      case 'add_block':
        if (action.blockType) bridge.addBlock(action.blockType);
        break;
      case 'focus_field':
        if (action.field) bridge.focusField(action.field);
        break;
      case 'group_social':
        if (Array.isArray(action.order)) bridge.reorderByTipo(action.order);
        break;
      default:
        break;
    }
  }

  if (refreshBtn) refreshBtn.addEventListener('click', reanalyze);

  if (applyAllBtn) {
    applyAllBtn.addEventListener('click', function () {
      pushSnapshot();
      // Busca mejoras aplicables de tema/orden/color en las recomendaciones vigentes.
      var cards = recsEl ? recsEl.querySelectorAll('.vynk-intel-rec') : [];
      cards.forEach(function (card) {
        var btn = card.querySelector('[data-apply]');
        if (btn) btn.click();
      });
    });
  }

  // Escucha cambios del editor para reanalizar (debounce).
  var debounceTimer = null;
  ['nombre_perfil', 'bio_perfil', 'tipo_perfil'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(reanalyze, 1200);
      });
      el.addEventListener('change', function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(reanalyze, 500);
      });
    }
  });

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    var div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
  }

  // Inicio
  setTimeout(reanalyze, 400);
})();
