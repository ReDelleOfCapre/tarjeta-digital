// Mapa interactivo de ubicaciones (agrupa todos los bloques "ubicacion" de un perfil
// en un único componente con visor real de Google Maps, pines interactivos y ticket desplegable).

const uid = () => 'vmap-' + Math.random().toString(36).slice(2, 8);

function toNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function computePinPositions(locs) {
  if (locs.length === 1) return [{ ...locs[0], x: 50, y: 44 }];

  const withCoords = locs.filter(l => toNum(l.lat) !== null && toNum(l.lng) !== null);
  let base;
  if (withCoords.length === locs.length) {
    const lats = withCoords.map(l => toNum(l.lat));
    const lngs = withCoords.map(l => toNum(l.lng));
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const spanLat = (maxLat - minLat) || 0.001;
    const spanLng = (maxLng - minLng) || 0.001;
    const padLat = spanLat * 0.18, padLng = spanLng * 0.18;
    const loLat = minLat - padLat, hiLat = maxLat + padLat;
    const loLng = minLng - padLng, hiLng = maxLng + padLng;
    base = locs.map(l => ({
      ...l,
      x: ((toNum(l.lng) - loLng) / (hiLng - loLng)) * 86 + 7,
      y: (1 - ((toNum(l.lat) - loLat) / (hiLat - loLat))) * 86 + 7
    }));
  } else {
    const preset = [[26, 62], [58, 34], [80, 70], [70, 20], [18, 30], [48, 55], [36, 82], [86, 50]];
    base = locs.map((l, i) => ({ ...l, x: preset[i % preset.length][0], y: preset[i % preset.length][1] }));
  }

  const SEP = 10;
  const pts = base.map((l, i) => ({ x: l.x, y: l.y, _i: i }));
  for (let iter = 0; iter < 50; iter++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < SEP && dist > 0.0001) {
          const push = (SEP - dist) / 2;
          const ux = dx / dist, uy = dy / dist;
          pts[i].x = Math.min(91, Math.max(6, pts[i].x + ux * push));
          pts[i].y = Math.min(88, Math.max(8, pts[i].y + uy * push));
          pts[j].x = Math.min(91, Math.max(6, pts[j].x - ux * push));
          pts[j].y = Math.min(88, Math.max(8, pts[j].y - uy * push));
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return pts.map(p => ({ ...base[p._i], x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }));
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jsonEsc(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

const STYLE = `
<style>
[data-vmap] { --coral:#EF6F7C; --coral-dark:#D9505F; --cream-map:#F6DFA8; --cream-bg:#FFF8EE;
  --sage:#7C9885; --sage-dark:#5E7A67; --ink:#2B241D; --ink-soft:#6E6255; --paper:#FFFFFF;
  --line:rgba(43,36,29,0.14); --font-display:'Space Grotesk',sans-serif;
  --font-body:'Inter',sans-serif; --font-mono:'JetBrains Mono',monospace; }
[data-vmap] * { box-sizing: border-box; margin: 0; padding: 0; }
[data-vmap] { grid-column: 1 / -1; width: 100%; margin: 16px 0; }
[data-vmap] .vmap-shell { font-family: var(--font-body); color: var(--ink); }
[data-vmap] .vmap-stage { transition: opacity .45s ease, transform .45s ease; }
[data-vmap] .vmap-step-prompt { text-align: center; padding: 34px 18px 38px; background: var(--cream-bg);
  border: 1.5px solid var(--line); border-radius: 24px; }
[data-vmap] .vmap-eyebrow { display: inline-block; font-family: var(--font-mono); font-size: 12px;
  letter-spacing: .14em; text-transform: uppercase; color: var(--sage-dark);
  background: rgba(124,152,133,0.16); padding: 5px 13px; border-radius: 999px; margin-bottom: 14px; }
[data-vmap] .vmap-title { font-family: var(--font-display); font-weight: 700; font-size: 24px;
  line-height: 1.15; margin: 0 0 10px; color: var(--ink); }
[data-vmap] .vmap-sub { max-width: 420px; margin: 0 auto 22px; color: var(--ink-soft); font-size: 15px; line-height: 1.55; }
[data-vmap] .vmap-cta { font-family: var(--font-body); font-weight: 700; font-size: 15px; color: #fff;
  background: var(--coral); border: none; padding: 13px 26px; border-radius: 999px; cursor: pointer;
  box-shadow: 0 10px 24px -8px rgba(239,111,124,0.55); transition: transform .15s ease, background .15s ease; }
[data-vmap] .vmap-cta:hover { background: var(--coral-dark); transform: translateY(-2px); }
[data-vmap] .vmap-map-wrap { display: grid; grid-template-columns: 1.35fr 1fr; gap: 16px; align-items: stretch; }
[data-vmap] .vmap-panel { position: relative; min-height: 320px; border-radius: 24px; overflow: hidden;
  border: 1.5px solid var(--line); background: #151517; box-shadow: 0 18px 40px -20px rgba(0,0,0,0.4); display: flex; flex-direction: column; }
[data-vmap] .vmap-iframe-container { width: 100%; height: 100%; min-height: 320px; border: none; border-radius: 22px; overflow: hidden; position: relative; }
[data-vmap] .vmap-live-iframe { width: 100%; height: 100%; min-height: 320px; border: none; }
[data-vmap] .vmap-tabs-bar { display: flex; gap: 8px; overflow-x: auto; padding: 10px; background: rgba(0,0,0,0.06); border-bottom: 1px solid var(--line); }
[data-vmap] .vmap-tab-item { padding: 8px 14px; border-radius: 999px; border: 1px solid var(--line); background: var(--paper);
  font-family: var(--font-body); font-size: 13px; font-weight: 600; color: var(--ink); cursor: pointer; white-space: nowrap; transition: all .2s ease; }
[data-vmap] .vmap-tab-item.active { background: var(--sage-dark); color: #fff; border-color: var(--sage-dark); }
[data-vmap] .vmap-ticket { background: var(--paper); border-radius: 22px; padding: 22px; position: relative;
  box-shadow: 0 16px 34px -18px rgba(43,36,29,0.4); border: 1.5px solid var(--line); display: flex; flex-direction: column; justify-content: space-between; }
[data-vmap] .vmap-ticket-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
[data-vmap] .vmap-ticket-head h3 { font-family: var(--font-display); font-size: 20px; margin: 0; line-height: 1.25; color: var(--ink); }
[data-vmap] .vmap-count-badge { font-family: var(--font-mono); font-size: 11px; color: var(--sage-dark);
  background: rgba(124,152,133,0.16); padding: 5px 10px; border-radius: 999px; white-space: nowrap; }
[data-vmap] .vmap-row { font-size: 14px; color: var(--ink-soft); margin-bottom: 10px; line-height: 1.5; }
[data-vmap] .vmap-row b { color: var(--ink); font-weight: 700; }
[data-vmap] .vmap-divider { border: none; border-top: 1.5px dashed var(--line); margin: 14px 0; }
[data-vmap] .vmap-actions { margin-top: 16px; display: flex; gap: 10px; flex-wrap: wrap; }
[data-vmap] .vmap-btn { font-family: var(--font-body); font-weight: 700; font-size: 14px; padding: 12px 18px;
  border-radius: 14px; cursor: pointer; border: none; transition: transform .15s ease; text-decoration: none; display: inline-flex;
  align-items: center; justify-content: center; gap: 8px; flex: 1; min-width: 130px; text-align: center; }
[data-vmap] .vmap-btn-primary { background: linear-gradient(135deg, #EF6F7C, #D9505F); color: #fff; box-shadow: 0 6px 18px rgba(239,111,124,0.4); }
[data-vmap] .vmap-btn-primary:hover { transform: translateY(-2px); }
[data-vmap] .vmap-btn-ghost { background: transparent; color: var(--ink); border: 1.5px solid var(--line); }
[data-vmap] .vmap-btn-ghost:hover { border-color: var(--ink); background: rgba(0,0,0,0.03); }
@media (max-width: 720px) { [data-vmap] .vmap-map-wrap { grid-template-columns: 1fr; } }
</style>
`;

function createClientScript(mapaId, uidMapa, locations) {
  const compact = locations.map(l => ({
    i: l._i,
    n: l.nombre,
    a: l.direccion,
    h: l.horario,
    p: l.telefono,
    la: l.lat,
    ln: l.lng,
    url: l.url
  }));

  return `
<script>
(function () {
  const root = document.querySelector('[data-vmap="${uidMapa}"]');
  if (!root) return;
  const LOCS = ${jsonEsc(compact)};
  const $ = function (sel) { return root.querySelector(sel); };
  const state = { selectedId: 0, geo: 'idle', lastKm: null };

  function destUrl(loc) {
    if (loc.url && loc.url.indexOf('http') === 0) return loc.url;
    const q = (loc.la && loc.ln) ? loc.la + ',' + loc.ln : encodeURIComponent(loc.a || loc.n);
    return 'https://www.google.com/maps/dir/?api=1&destination=' + q;
  }

  function embedUrl(loc) {
    const query = encodeURIComponent(loc.a || loc.n);
    return 'https://maps.google.com/maps?q=' + query + '&t=&z=15&ie=UTF8&iwloc=&output=embed';
  }

  function ticketHtml(loc) {
    const lnum = LOCS.length > 1 ? (loc.i + 1) + '/' + LOCS.length : '';
    return '<div class="vmap-ticket-head"><h3>📍 ' + esc(loc.n) + '</h3>'
      + (lnum ? '<span class="vmap-count-badge">Sede ' + lnum + '</span>' : '') + '</div>'
      + '<div class="vmap-row"><b>🏢 Dirección:</b><br>' + esc(loc.a || 'Ubicación registrada') + '</div>'
      + (loc.h ? '<div class="vmap-row"><b>⏰ Horario:</b><br>' + esc(loc.h) + '</div>' : '')
      + (loc.p ? '<div class="vmap-row"><b>📞 Teléfono:</b> ' + esc(loc.p) + '</div>' : '')
      + '<hr class="vmap-divider">'
      + '<div class="vmap-actions">'
      + '<a class="vmap-btn vmap-btn-primary" href="' + esc(destUrl(loc)) + '" target="_blank" rel="noopener" data-action="click_mapa">🧭 Como llegar (GPS)</a>'
      + (loc.p ? '<a class="vmap-btn vmap-btn-ghost" href="tel:' + esc(loc.p) + '">📞 Llamar</a>' : '')
      + '</div>';
  }

  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function renderTabs() {
    const tabsContainer = $('.vmap-tabs-bar');
    if (!tabsContainer) return;
    if (LOCS.length <= 1) {
      tabsContainer.style.display = 'none';
      return;
    }
    tabsContainer.innerHTML = LOCS.map(function(l) {
      const activeClass = l.i === state.selectedId ? ' active' : '';
      return '<button type="button" class="vmap-tab-item' + activeClass + '" data-idx="' + l.i + '">📍 ' + esc(l.n) + '</button>';
    }).join('');

    tabsContainer.querySelectorAll('.vmap-tab-item').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const idx = parseInt(btn.getAttribute('data-idx'));
        selectLocation(idx);
      });
    });
  }

  function selectLocation(id) {
    state.selectedId = id;
    const loc = LOCS.find(function (l) { return l.i === id; }) || LOCS[0];
    const iframe = $('.vmap-live-iframe');
    if (iframe && loc) {
      iframe.src = embedUrl(loc);
    }
    const ticket = $('.vmap-ticket');
    if (ticket && loc) {
      ticket.innerHTML = ticketHtml(loc);
    }
    renderTabs();
  }

  const stepPrompt = $('.vmap-step-prompt');
  const stepMap = $('.vmap-step-map');
  const cta = $('.vmap-cta');

  if (cta) {
    cta.addEventListener('click', function () {
      stepPrompt.style.display = 'none';
      stepMap.style.display = 'block';
      requestAnimationFrame(function () { stepMap.style.opacity = '1'; stepMap.style.transform = 'translateY(0)'; });
      selectLocation(0);
    });
  }
})();
</script>`;
}

function renderMapaUbicaciones(locations) {
  if (!locations || !locations.length) return '';
  const u = uid();
  const mapaId = 'mapa-' + u;
  const locs = computePinPositions(locations.map((l, i) => ({ ...l, _i: i })));
  const isMulti = locs.length > 1;
  const initialLoc = locs[0] || {};
  const initialEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(initialLoc.direccion || initialLoc.nombre || 'Ubicacion')}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return `
<div class="block-wrapper block-ubicaciones-map" data-vmap="${u}">
  ${STYLE}
  <div class="vmap-shell">
    <div class="vmap-stage vmap-step-prompt">
      <span class="vmap-eyebrow">Encuéntranos</span>
      <h3 class="vmap-title">${isMulti ? '¿Dónde te queda más cerca?' : 'Así llegas hasta nosotros'}</h3>
      <p class="vmap-sub">${isMulti ? 'Elige tu sede y explora el mapa interactivo en vivo con referencias reales y GPS.' : 'Explora el mapa interactivo en vivo con referencias reales y GPS.'}</p>
      <button class="vmap-cta" type="button">${isMulti ? 'Ver ubicaciones en vivo →' : 'Ver mapa en vivo →'}</button>
    </div>
    <div class="vmap-stage vmap-step-map" style="display:none;opacity:0;transform:translateY(14px)">
      <div class="vmap-map-wrap">
        <div class="vmap-panel" id="${mapaId}">
          <div class="vmap-tabs-bar"></div>
          <div class="vmap-iframe-container">
            <iframe class="vmap-live-iframe" src="${initialEmbedUrl}" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
          </div>
        </div>
        <div class="vmap-ticket">
          <div class="vmap-ticket-head">
            <h3>📍 ${esc(initialLoc.nombre || 'Sucursal')}</h3>
          </div>
          <div class="vmap-row"><b>🏢 Dirección:</b><br>${esc(initialLoc.direccion || 'Ubicación registrada')}</div>
          ${initialLoc.horario ? `<div class="vmap-row"><b>⏰ Horario:</b><br>${esc(initialLoc.horario)}</div>` : ''}
          ${initialLoc.telefono ? `<div class="vmap-row"><b>📞 Teléfono:</b> ${esc(initialLoc.telefono)}</div>` : ''}
          <hr class="vmap-divider">
          <div class="vmap-actions">
            <a class="vmap-btn vmap-btn-primary" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(initialLoc.direccion || initialLoc.nombre)}" target="_blank" rel="noopener" data-action="click_mapa">🧭 Cómo llegar (GPS)</a>
            ${initialLoc.telefono ? `<a class="vmap-btn vmap-btn-ghost" href="tel:${esc(initialLoc.telefono)}">📞 Llamar</a>` : ''}
          </div>
        </div>
      </div>
    </div>
  </div>
  ${createClientScript(mapaId, u, locs)}
</div>`;
}

module.exports = { renderMapaUbicaciones };