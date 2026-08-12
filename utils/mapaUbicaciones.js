// Mapa interactivo de ubicaciones (agrupa todos los bloques "ubicacion" de un perfil
// en un único componente con pines animados, ruta SVG y ticket con distancia real).
// Inspirado en public/mapa-ubicaciones.html pero embebible y aislado por UID.

const uid = () => 'vmap-' + Math.random().toString(36).slice(2, 8);

function toNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

// Proyecta lat/lng a posiciones % dentro del panel (con padding de 18%)
// y aplica repulsión para que pines cercanos no se superpongan (legibles y clicables).
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

  // Repulsión: separa pines que queden a menos de SEP%.
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

// < en JSON debe escaparse para no cerrar el <script> anidado.
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
[data-vmap] { grid-column: 1 / -1; width: 100%; }
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
[data-vmap] .vmap-map-wrap { display: grid; grid-template-columns: 1.35fr 1fr; gap: 20px; align-items: start; }
[data-vmap] .vmap-panel { position: relative; aspect-ratio: 4/3.1; border-radius: 24px; overflow: hidden;
  border: 1.5px solid var(--line); background: radial-gradient(circle at 20% 25%, rgba(255,255,255,0.5), transparent 55%),
  linear-gradient(135deg, #FBEFD3, #F6DFA8 60%, #F3D394); box-shadow: 0 18px 40px -20px rgba(43,36,29,0.35); }
[data-vmap] .vmap-dotgrid { position: absolute; inset: 0; background-image: radial-gradient(rgba(43,36,29,0.10) 1.4px, transparent 1.4px);
  background-size: 22px 22px; opacity: .6; }
[data-vmap] .vmap-blob { position: absolute; border-radius: 50%; opacity: .55; }
[data-vmap] .vmap-blob-a { width: 230px; height: 190px; top: -40px; left: -50px; background: #F0637B22; }
[data-vmap] .vmap-blob-b { width: 260px; height: 220px; bottom: -70px; right: -60px; background: #5E7A6722; }
[data-vmap] .vmap-route { position: absolute; inset: 0; width: 100%; height: 100%; stroke: var(--ink);
  stroke-opacity: .28; stroke-width: 2; stroke-dasharray: 6 8; fill: none; }
[data-vmap] .vmap-pins { position: absolute; inset: 0; }
[data-vmap] .vmap-pin { position: absolute; width: 34px; height: 34px; background: var(--coral);
  border-radius: 50% 50% 50% 0; transform: translate(-50%, -100%) rotate(-45deg);
  box-shadow: 0 6px 14px -4px rgba(217,80,95,0.6); cursor: pointer; border: none; padding: 0; opacity: 0;
  animation: vmapPinDrop .5s cubic-bezier(.34,1.56,.64,1) forwards; }
[data-vmap] .vmap-pin::after { content: ''; position: absolute; top: 50%; left: 50%; width: 14px; height: 14px;
  background: #fff; border-radius: 50%; transform: translate(-50%, -50%); }
[data-vmap] .vmap-pin:focus-visible { outline: 3px solid var(--sage); outline-offset: 4px; }
[data-vmap] .vmap-pin.selected { background: var(--sage-dark); box-shadow: 0 6px 16px -3px rgba(94,122,103,0.65); }
[data-vmap] .vmap-pin.selected::before { content: ''; position: absolute; inset: -10px; border-radius: 50%;
  border: 2px solid var(--sage-dark); transform: rotate(45deg); animation: vmapPulse 1.8s ease-out infinite; }
@keyframes vmapPinDrop { from { opacity: 0; transform: translate(-50%, -160%) rotate(-45deg) scale(.4); }
  to { opacity: 1; transform: translate(-50%, -100%) rotate(-45deg) scale(1); } }
@keyframes vmapPulse { 0% { opacity: .7; transform: rotate(45deg) scale(.7); }
  100% { opacity: 0; transform: rotate(45deg) scale(1.5); } }
[data-vmap] .vmap-pin-label { position: absolute; transform: translate(-50%, 4px); font-family: var(--font-mono);
  font-size: 11px; background: var(--paper); padding: 3px 8px; border-radius: 6px; border: 1px solid var(--line);
  white-space: nowrap; pointer-events: none; opacity: .9; }
[data-vmap] .vmap-ticket { background: var(--paper); border-radius: 18px; padding: 22px 22px 18px; position: relative;
  box-shadow: 0 16px 34px -18px rgba(43,36,29,0.4); min-height: 300px; display: flex; flex-direction: column; }
[data-vmap] .vmap-ticket::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 14px;
  background-image: radial-gradient(circle at 10px 0, transparent 9px, var(--cream-bg) 9.5px);
  background-size: 20px 14px; background-repeat: repeat-x; }
[data-vmap] .vmap-ticket-empty { margin: auto; text-align: center; color: var(--ink-soft); font-size: 14px; padding: 20px; }
[data-vmap] .vmap-ticket-empty strong { display: block; font-family: var(--font-display); color: var(--ink);
  font-size: 18px; margin-bottom: 6px; }
[data-vmap] .vmap-ticket-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
[data-vmap] .vmap-ticket-head h3 { font-family: var(--font-display); font-size: 20px; margin: 0; line-height: 1.15; }
[data-vmap] .vmap-count-badge { font-family: var(--font-mono); font-size: 11px; color: var(--sage-dark);
  background: rgba(124,152,133,0.16); padding: 5px 10px; border-radius: 999px; white-space: nowrap; }
[data-vmap] .vmap-row { font-size: 13.5px; color: var(--ink-soft); margin-bottom: 6px; line-height: 1.4; }
[data-vmap] .vmap-row b { color: var(--ink); font-weight: 600; }
[data-vmap] .vmap-divider { border: none; border-top: 1.5px dashed var(--line); margin: 14px 0; }
[data-vmap] .vmap-distance-block { margin-bottom: 14px; }
[data-vmap] .vmap-distance-label { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase;
  letter-spacing: .08em; color: var(--ink-soft); margin-bottom: 6px; }
[data-vmap] .vmap-distance-value { font-family: var(--font-mono); font-weight: 700; font-size: 28px; color: var(--ink); }
[data-vmap] .vmap-distance-value small { font-size: 13px; font-weight: 500; color: var(--ink-soft); }
[data-vmap] .vmap-distance-hint { font-size: 12.5px; color: var(--ink-soft); margin-top: 6px; line-height: 1.4; }
[data-vmap] .vmap-link-btn { background: none; border: none; padding: 0; margin-top: 8px;
  font-family: var(--font-mono); font-size: 12.5px; font-weight: 700; color: var(--coral-dark);
  cursor: pointer; text-decoration: underline; }
[data-vmap] .vmap-actions { margin-top: auto; display: flex; gap: 10px; flex-wrap: wrap; }
[data-vmap] .vmap-btn { font-family: var(--font-body); font-weight: 700; font-size: 14px; padding: 11px 16px;
  border-radius: 12px; cursor: pointer; border: none; transition: transform .15s ease; text-decoration: none; display: inline-flex;
  align-items: center; justify-content: center; gap: 8px; }
[data-vmap] .vmap-btn-primary { background: var(--ink); color: #fff; }
[data-vmap] .vmap-btn-primary:hover { transform: translateY(-2px); }
[data-vmap] .vmap-btn-ghost { background: transparent; color: var(--ink); border: 1.5px solid var(--line); }
[data-vmap] .vmap-btn-ghost:hover { border-color: var(--ink); }
@media (max-width: 720px) { [data-vmap] .vmap-map-wrap { grid-template-columns: 1fr; } }
</style>
`;

// cliente: lógica de pines, ruta, ticket, geolocalización y "cómo llegar".
function createClientScript(mapaId, uidMapa, locations) {
  const compact = locations.map(l => ({ i: l._i, n: l.nombre, a: l.direccion, h: l.horario, p: l.telefono, la: l.lat, ln: l.lng, x: l.x, y: l.y }));
  return `
<script>
(function () {
  const root = document.querySelector('[data-vmap="${uidMapa}"]');
  if (!root) return;
  const LOCS = ${jsonEsc(compact)};
  const $ = function (sel) { return root.querySelector(sel); };
  const state = { selectedId: null, geo: 'idle', lastKm: null, hasCoords: false };

  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function destUrl(loc) {
    const q = (loc.la && loc.ln) ? loc.la + ',' + loc.ln : encodeURIComponent(loc.a || loc.n);
    return 'https://www.google.com/maps/dir/?api=1&destination=' + q;
  }

  function ticketHtml(loc) {
    let dHtml;
    if (!loc.la || !loc.ln) {
      dHtml = '<div class="vmap-distance-value">&mdash;<small> distancia no calculable</small></div>'
        + '<div class="vmap-distance-hint">Agrega latitud y longitud en el editor para ver la distancia real.</div>';
    } else if (state.geo === 'ready' && state.lastKm !== null) {
      dHtml = '<div class="vmap-distance-value">' + state.lastKm.toFixed(1) + '<small> km desde tu ubicación</small></div>'
        + '<button class="vmap-link-btn" data-geo="1">Recalcular</button>';
    } else if (state.geo === 'loading') {
      dHtml = '<div class="vmap-distance-value">&mdash; <small>calculando&hellip;</small></div>';
    } else if (state.geo === 'error') {
      dHtml = '<div class="vmap-distance-value">&mdash; <small>sin acceso a tu ubicación</small></div>'
        + '<div class="vmap-distance-hint">Actívala en tu navegador y vuelve a intentarlo.</div>'
        + '<button class="vmap-link-btn" data-geo="1">Reintentar</button>';
    } else {
      dHtml = '<div class="vmap-distance-value">&mdash; <small>km</small></div>'
        + '<div class="vmap-distance-hint">Calcula la distancia real desde donde estás ahora mismo.</div>'
        + '<button class="vmap-link-btn" data-geo="1">Calcular distancia real</button>';
    }
    const n = loc.n, lnum = LOCS.length > 1 ? (loc.i + 1) + '/' + LOCS.length : '';
    return '<div class="vmap-ticket-head"><h3>' + esc(loc.n) + '</h3>'
      + (lnum ? '<span class="vmap-count-badge">' + lnum + '</span>' : '') + '</div>'
      + '<div class="vmap-row"><b>Dirección &mdash; </b>' + esc(loc.a || 'Ubicación disponible') + '</div>'
      + (loc.h ? '<div class="vmap-row"><b>Horario &mdash; </b>' + esc(loc.h) + '</div>' : '')
      + '<hr class="vmap-divider">'
      + '<div class="vmap-distance-block"><div class="vmap-distance-label">Distancia real</div>' + dHtml + '</div>'
      + '<div class="vmap-actions">'
      + '<a class="vmap-btn vmap-btn-primary" href="' + esc(destUrl(loc)) + '" target="_blank" rel="noopener" data-action="click_mapa">Cómo llegar</a>'
      + (loc.p ? '<a class="vmap-btn vmap-btn-ghost" href="tel:' + esc(loc.p) + '">Llamar</a>' : '')
      + (LOCS.length > 1 ? '<button class="vmap-btn vmap-btn-ghost" data-cerrar="1">Ver otra sede</button>' : '')
      + '</div>';
  }

  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function renderPins() {
    const layer = $('.vmap-pins');
    layer.innerHTML = '';
    const route = $('.vmap-route');
    let points = '';
    LOCS.forEach(function (loc, i) {
      const pin = document.createElement('button');
      pin.className = 'vmap-pin' + (loc.i === state.selectedId ? ' selected' : '');
      pin.style.left = loc.x + '%';
      pin.style.top = loc.y + '%';
      pin.style.animationDelay = (i * 0.12) + 's';
      pin.setAttribute('aria-label', 'Ver información de ' + loc.n);
      pin.addEventListener('click', function () { selectLocation(loc.i); });
      layer.appendChild(pin);
      if (LOCS.length > 1) {
        const lb = document.createElement('div');
        lb.className = 'vmap-pin-label';
        lb.style.left = loc.x + '%';
        lb.style.top = loc.y + '%';
        lb.textContent = loc.n.split(' ')[0];
        layer.appendChild(lb);
      }
      if (LOCS.length > 1) points += Math.round(loc.x * 6) + ',' + Math.round(loc.y * 4.6) + ' ';
    });
    if (LOCS.length > 1 && points) {
      route.setAttribute('viewBox', '0 0 600 460');
      route.innerHTML = '<polyline class="vmap-route" points="' + points.trim() + '"/>';
    } else {
      route.innerHTML = '';
    }
  }

  function renderTicket() {
    const t = $('.vmap-ticket');
    const loc = LOCS.find(function (l) { return l.i === state.selectedId; });
    if (!loc) {
      t.innerHTML = '<div class="vmap-ticket-empty"><strong>Selecciona un pin</strong>Toca una ubicación en el mapa para ver su información completa.</div>';
      return;
    }
    t.innerHTML = ticketHtml(loc);
    const geoBtn = t.querySelector('[data-geo]');
    if (geoBtn) geoBtn.addEventListener('click', function () { requestGeo(loc); });
    const cerrar = t.querySelector('[data-cerrar]');
    if (cerrar) cerrar.addEventListener('click', function () { state.selectedId = null; renderPins(); renderTicket(); });
  }

  function requestGeo(loc) {
    state.geo = 'loading';
    renderTicket();
    if (!navigator.geolocation) { state.geo = 'error'; renderTicket(); return; }
    navigator.geolocation.getCurrentPosition(function (pos) {
      if (loc.la && loc.ln) { state.lastKm = haversine(pos.coords.latitude, pos.coords.longitude, loc.la, loc.ln); state.hasCoords = true; }
      else { state.lastKm = null; state.hasCoords = false; }
      state.geo = 'ready';
      renderTicket();
    }, function () { state.geo = 'error'; renderTicket(); }, { enableHighAccuracy: true, timeout: 8000 });
  }

  function selectLocation(id) { state.selectedId = id; state.geo = 'idle'; state.lastKm = null; renderPins(); renderTicket(); }

  const stepPrompt = $('.vmap-step-prompt');
  const stepMap = $('.vmap-step-map');
  const cta = $('.vmap-cta');
  cta.addEventListener('click', function () {
    stepPrompt.style.display = 'none';
    stepMap.style.display = 'block';
    requestAnimationFrame(function () { stepMap.style.opacity = '1'; stepMap.style.transform = 'translateY(0)'; });
    if (LOCS.length === 1) { selectLocation(LOCS[0].i); }
    else { renderPins(); renderTicket(); }
  });
})();
</script>`;
}

function renderMapaUbicaciones(locations) {
  if (!locations || !locations.length) return '';
  const u = uid();
  const mapaId = 'mapa-' + u;
  const locs = computePinPositions(locations.map((l, i) => ({ ...l, _i: i })));
  const isMulti = locs.length > 1;

  return `
<div class="block-wrapper block-ubicaciones-map" data-vmap="${u}">
  ${STYLE}
  <div class="vmap-shell">
    <div class="vmap-stage vmap-step-prompt">
      <span class="vmap-eyebrow">Encuéntranos</span>
      <h3 class="vmap-title">${isMulti ? '¿Dónde te queda más cerca?' : 'Así llegas hasta nosotros'}</h3>
      <p class="vmap-sub">${isMulti ? 'Elige tu sede y te mostramos el mapa, la distancia real desde donde estás y cómo llegar.' : 'Te mostramos el mapa, la distancia real desde donde estás y cómo llegar.'}</p>
      <button class="vmap-cta" type="button">${isMulti ? 'Ver ubicaciones →' : 'Ver en el mapa →'}</button>
    </div>
    <div class="vmap-stage vmap-step-map" style="display:none;opacity:0;transform:translateY(14px)">
      <div class="vmap-map-wrap">
        <div class="vmap-panel" id="${mapaId}">
          <div class="vmap-dotgrid"></div>
          <div class="vmap-blob vmap-blob-a"></div>
          <div class="vmap-blob vmap-blob-b"></div>
          <svg class="vmap-route"></svg>
          <div class="vmap-pins"></div>
        </div>
        <div class="vmap-ticket"><div class="vmap-ticket-empty"><strong>Selecciona un pin</strong>Toca una ubicación en el mapa para ver su información completa.</div></div>
      </div>
    </div>
  </div>
  ${createClientScript(mapaId, u, locs)}
</div>`;
}

module.exports = { renderMapaUbicaciones };