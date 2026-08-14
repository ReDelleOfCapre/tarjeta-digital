// Mapa compacto de ubicaciones (agrupa todos los bloques "ubicacion" de un perfil).
// Secundario y ligero: altura 160-220px en móvil, siervo en el pase oscuro.
// Cero emoji: iconos SVG del sistema único (utils/icons.js).

const { icon } = require('./icons');

const uid = () => 'vmap-' + Math.random().toString(36).slice(2, 8);

function toNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
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
[data-vmap] { --vmap-line: rgba(255,255,255,0.10); --vmap-muted: var(--text-secondary, #94A3B8);
  --vmap-fg: var(--text-primary, #FFF); --vmap-accent: var(--accent, #7FAEE8);
  --vmap-card: rgba(255,255,255,0.04); }
[data-vmap] * { box-sizing: border-box; margin: 0; padding: 0; }
[data-vmap] { grid-column: 1 / -1; width: 100%; }
[data-vmap] .vmap-shell { font-family: var(--font-body, 'Inter', sans-serif); color: var(--vmap-fg);
  display: flex; flex-direction: column; gap: 10px;
  padding: 14px; border-radius: 20px;
  background: var(--vmap-card);
  border: 1px solid var(--vmap-line); }
[data-vmap] .vmap-head { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.95rem;
  font-family: var(--font-display, 'Space Grotesk', sans-serif); }
[data-vmap] .vmap-head svg { width: 1.1em; height: 1.1em; color: var(--vmap-accent); flex-shrink: 0; }
[data-vmap] .vmap-count { margin-left: auto; font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 0.62rem; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--vmap-muted); border: 1px solid var(--vmap-line);
  padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
[data-vmap] .vmap-iframe { width: 100%; height: clamp(160px, 36vw, 220px); border: none;
  border-radius: 14px; display: block; filter: saturate(0.92) contrast(1.02); }
@media (min-width: 720px) { [data-vmap] .vmap-iframe { height: 220px; } }
[data-vmap] .vmap-tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; }
[data-vmap] .vmap-tab { display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 999px; border: 1px solid var(--vmap-line);
  background: transparent; color: var(--vmap-muted); font-size: 0.8rem; font-weight: 600;
  cursor: pointer; white-space: nowrap; font-family: inherit;
  transition: background .15s ease, color .15s ease; }
[data-vmap] .vmap-tab svg { width: 0.9em; height: 0.9em; }
[data-vmap] .vmap-tab.is-active { background: var(--vmap-accent); color: var(--on-accent, #141318); border-color: transparent; }
[data-vmap] .vmap-ticket { padding: 12px 14px; border-radius: 14px;
  background: rgba(255,255,255,0.03); border: 1px solid var(--vmap-line);
  display: flex; flex-direction: column; gap: 6px; }
[data-vmap] .vmap-ticket-name { font-weight: 700; font-size: 0.92rem; font-family: var(--font-display, 'Space Grotesk', sans-serif); }
[data-vmap] .vmap-ticket-row { font-size: 0.82rem; color: var(--vmap-muted); line-height: 1.45;
  display: flex; align-items: flex-start; gap: 8px; }
[data-vmap] .vmap-ticket-row svg { width: 0.95em; height: 0.95em; flex-shrink: 0; margin-top: 2px; }
[data-vmap] .vmap-actions { display: flex; gap: 8px; margin-top: 4px; }
[data-vmap] .vmap-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  flex: 1; min-height: 44px; padding: 0 14px; border-radius: 13px;
  font-weight: 700; font-size: 0.85rem; text-decoration: none; cursor: pointer;
  transition: transform .15s ease, filter .15s ease; }
[data-vmap] .vmap-btn svg { width: 1em; height: 1em; }
[data-vmap] .vmap-btn:active { transform: scale(0.97); }
[data-vmap] .vmap-btn-primary { background: var(--vmap-accent); color: var(--on-accent, #141318); border: none; }
[data-vmap] .vmap-btn-primary:hover { filter: brightness(1.08); }
[data-vmap] .vmap-btn-ghost { background: transparent; color: var(--vmap-muted); border: 1px solid var(--vmap-line); }
@media (prefers-reduced-motion: reduce) { [data-vmap] * { transition: none !important; } }
</style>
`;

function createClientScript(locations) {
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
  const root = document.querySelector('[data-vmap]');
  if (!root) return;
  const LOCS = ${jsonEsc(compact)};
  const $ = function (sel) { return root.querySelector(sel); };
  const state = { selectedId: 0 };

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
    return '<div class="vmap-ticket-name">' + loc.n + '</div>'
      + '<div class="vmap-ticket-row">' + '${icon('mapPin')}' + '<span>' + (loc.a || 'Ubicación registrada') + '</span></div>'
      + (loc.h ? '<div class="vmap-ticket-row">' + '${icon('clock')}' + '<span>' + loc.h + '</span></div>' : '')
      + '<div class="vmap-actions">'
      + '<a class="vmap-btn vmap-btn-primary" href="' + destUrl(loc) + '" target="_blank" rel="noopener" data-action="click_mapa">' + '${icon('navigation')}' + ' Cómo llegar</a>'
      + (loc.p ? '<a class="vmap-btn vmap-btn-ghost" href="tel:' + loc.p + '">' + '${icon('phone')}' + ' Llamar</a>' : '')
      + '</div>';
  }

  function renderTabs() {
    const tabs = $('.vmap-tabs');
    if (!tabs || LOCS.length <= 1) { if (tabs) tabs.style.display = 'none'; return; }
    tabs.innerHTML = LOCS.map(function (l) {
      const active = l.i === state.selectedId ? ' is-active' : '';
      return '<button type="button" class="vmap-tab' + active + '" data-idx="' + l.i + '">' + '${icon('mapPin')}' + l.n + '</button>';
    }).join('');
    tabs.querySelectorAll('.vmap-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectLocation(parseInt(btn.getAttribute('data-idx')));
      });
    });
  }

  function selectLocation(id) {
    state.selectedId = id;
    const loc = LOCS.find(function (l) { return l.i === id; }) || LOCS[0];
    const iframe = $('.vmap-iframe');
    if (iframe && loc) iframe.src = embedUrl(loc);
    const ticket = $('.vmap-ticket');
    if (ticket && loc) ticket.innerHTML = ticketHtml(loc);
    renderTabs();
  }

  renderTabs();
  if (LOCS.length > 1 && state.selectedId != null) {
    const first = LOCS.find(function (l) { return l.i === 0; }) || LOCS[0];
    const ticket = $('.vmap-ticket');
    if (ticket && first) ticket.innerHTML = ticketHtml(first);
  }
})();
</script>`;
}

function renderMapaUbicaciones(locations) {
  if (!locations || !locations.length) return '';
  const locs = locations.map((l, i) => ({ ...l, _i: i }));
  const initialLoc = locs[0] || {};
  const isMulti = locs.length > 1;
  const initialEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(initialLoc.direccion || initialLoc.nombre || 'Ubicacion')}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  const destUrl = (loc) => {
    if (loc.url && String(loc.url || '').startsWith('http')) return loc.url;
    const q = (toNum(loc.lat) !== null && toNum(loc.lng) !== null)
      ? `${loc.lat},${loc.lng}`
      : encodeURIComponent(loc.direccion || loc.nombre || 'Ubicación');
    return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
  };

  const tabsBar = isMulti
    ? `<div class="vmap-tabs">${locs.map(l => `<button type="button" class="vmap-tab${l._i === 0 ? ' is-active' : ''}" data-idx="${l._i}">${icon('mapPin')} ${esc(l.nombre || 'Sucursal')}</button>`).join('')}</div>`
    : '';

  return `
<div class="block-wrapper block-ubicaciones-map" data-vmap="${uid()}">
  ${STYLE}
  <div class="vmap-shell">
    <div class="vmap-head">
      ${icon('mapPin')}
      <span>${isMulti ? 'Nuestras sucursales' : 'Ubicación'}</span>
      <span class="vmap-count">${isMulti ? locs.length + ' sedes' : 'GPS'}</span>
    </div>
    <iframe class="vmap-iframe" src="${initialEmbedUrl}" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Mapa de ${esc(initialLoc.nombre || 'la ubicación')}"></iframe>
    ${tabsBar}
    <div class="vmap-ticket" aria-live="polite">
      <div class="vmap-ticket-name">${esc(initialLoc.nombre || 'Sucursal')}</div>
      <div class="vmap-ticket-row">${icon('mapPin')}<span>${esc(initialLoc.direccion || 'Ubicación registrada')}</span></div>
      ${initialLoc.horario ? `<div class="vmap-ticket-row">${icon('clock')}<span>${esc(initialLoc.horario)}</span></div>` : ''}
      <div class="vmap-actions">
        <a class="vmap-btn vmap-btn-primary" href="${esc(destUrl(initialLoc))}" target="_blank" rel="noopener" data-action="click_mapa">${icon('navigation')} Cómo llegar</a>
        ${initialLoc.telefono ? `<a class="vmap-btn vmap-btn-ghost" href="tel:${esc(initialLoc.telefono)}">${icon('phone')} Llamar</a>` : ''}
      </div>
    </div>
  </div>
  ${createClientScript(locs)}
</div>`;
}

module.exports = { renderMapaUbicaciones };