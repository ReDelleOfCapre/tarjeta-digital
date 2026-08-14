// ============================================
// VYNK Intelligence — dashboard-intelligence.js
// Llena la sección "Hoy en VYNK" del dashboard
// con insights y recomendaciones calculadas desde
// datos REALES de la DB. Sin mocks, sin inventar
// cifras. Si no hay datos, lo dice.
// ============================================

(function () {
  'use strict';

  var insightBox = document.getElementById('vynk-intel-insight');
  var scoreBox = document.getElementById('vynk-intel-score');
  var recsBox = document.getElementById('vynk-intel-recs');
  var providerEl = document.getElementById('vynk-intel-provider');

  if (!insightBox && !recsBox) return;

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    var div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
  }

  function renderInsights(insights) {
    if (!insightBox) return;
    if (!insights || !insights.length) {
      insightBox.innerHTML = '<p class="vynk-insight-text">Aún no hay datos suficientes de actividad.</p>';
      return;
    }
    insightBox.innerHTML = insights.map(function (i) {
      return '<p class="vynk-insight-text" style="margin-bottom:8px">' + escapeHtml(i.title) + '</p>' +
        '<div style="font-size:0.8rem;color:var(--vynk-text-tertiary);line-height:1.45">' + escapeHtml(i.message) + '</div>';
    }).join('');
  }

  function renderScore(score) {
    if (!scoreBox) return;
    if (!score || typeof score.score !== 'number') return;
    scoreBox.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px">' +
        '<div style="width:46px;height:46px;flex-shrink:0;border-radius:14px;background:linear-gradient(135deg,#722F43,#9A4159);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.15rem;color:#FFF">' + score.score + '</div>' +
        '<div style="flex:1">' +
          '<div style="font-size:0.78rem;font-weight:700;color:var(--vynk-text)">VYNK Profile Score</div>' +
          '<div style="font-size:0.72rem;color:var(--vynk-text-tertiary)">' + escapeHtml(score.message || '') + '</div>' +
        '</div>' +
      '</div>';
  }

  function renderRecs(recs) {
    if (!recsBox) return;
    if (!recs || !recs.length) {
      recsBox.innerHTML =
        '<div class="vynk-activity-item">' +
          '<div class="vynk-activity-icon" style="color:#30D158"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em"><path d="M20 6 9 17l-5-5"/></svg></div>' +
          '<div style="flex:1"><div>Sin recomendaciones pendientes.</div><div class="vynk-activity-time">Tu identidad está bien encaminada.</div></div>' +
        '</div>';
      return;
    }
    var icons = {
      design: 'sparkles',
      content: 'file',
      conversion: 'zap',
      branding: 'palette'
    };
    recsBox.innerHTML = recs.slice(0, 4).map(function (r) {
      return '<div class="vynk-activity-item">' +
        '<div class="vynk-activity-icon" style="color:var(--vynk-accent-hi)">' + (window.vynkIcon ? vynkIcon(icons[r.category] || 'zap', { size: 15 }) : '') + '</div>' +
        '<div style="flex:1">' +
          '<div>' + escapeHtml(r.title) + '</div>' +
          '<div class="vynk-activity-time">' + escapeHtml(r.message) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function load() {
    // Usa el primer perfil real del usuario.
    var perfiles = window.perfilesList || null;
    var pick = function (list) {
      return list && list.length ? list[0].id : null;
    };

    if (perfiles && perfiles.length) {
      api('/intelligence/analyze', { method: 'POST', body: JSON.stringify({ perfil_id: perfiles[0].id }) })
        .then(function (data) {
          if (!data || data.error) throw data || { error: 'error' };
          renderInsights(data.insights);
          renderScore(data.score);
          renderRecs(data.recommendations);
          if (providerEl) providerEl.textContent = '● ' + (data.provider || 'determinístico');
        })
        .catch(function () {
          renderInsights(null);
          if (recsBox) recsBox.innerHTML = '<div class="vynk-activity-item"><div style="flex:1"><div>No se pudo cargar.</div></div></div>';
        });
    } else {
      // Espera a que loadProfiles complete.
      var tries = 0;
      var timer = setInterval(function () {
        tries += 1;
        if (window.perfilesList && window.perfilesList.length) {
          clearInterval(timer);
          load();
        } else if (tries > 30) {
          clearInterval(timer);
          renderInsights(null);
        }
      }, 200);
    }
  }

  load();
})();
