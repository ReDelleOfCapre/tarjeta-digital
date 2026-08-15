/**
 * VYNK Icon System (utils/icons.js)
 * Fuente única de iconografía. Estilo Lucide: viewBox 24, stroke 1.8,
 * fill none, currentColor, linecap/linejoin round.
 * Prohibido emojis como iconos. Cada icono es un SVG accesible (aria-hidden).
 * El tamaño se controla por CSS (1em por defecto) para que herede del texto.
 */

const P = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

function svg(inner) {
  return `<svg viewBox="0 0 24 24" ${P} width="1em" height="1em">${inner}</svg>`;
}

const paths = {
  arrowUpRight: '<path d="M7 17 17 7"/><path d="M7 7h10v10"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  shareIos: '<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/>',
  download: '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3z"/><path d="M21 14v.01M14 21h.01M18 21h3v-3"/>',
  wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
  nfc: '<path d="M6 8.3a10 10 0 0 1 0 7.4"/><path d="M9.5 6.2a14 14 0 0 1 0 11.6"/><path d="M13 4a19 19 0 0 1 0 16"/><path d="M16.5 2a23 23 0 0 1 0 20"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.27a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.9z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  whatsapp: '<path d="M21 12a8 8 0 0 1-8 8H4l3-3a8 8 0 1 1 14-5z"/>',
  mapPin: '<path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/>',
  navigation: '<path d="M3 11l19-8-8 19-2-8-9-3z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.5 5-6.5 8-6.5s6.5 2 8 6.5"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  zap: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m5 13 4 4 10-10"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m8.5 12.5 2.5 2.5 5-6"/>',
  alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  star: '<path d="m12 3 2.9 5.9 6.1.9-4.5 4.3 1.1 6.1L12 17.8 6.4 20.2l1.1-6.1L3 9.8l6.1-.9z"/>',
  pdf: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"/><path d="M14 3v6h6M9 13h6M9 17h4"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"/><path d="M14 3v6h6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  bike: '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/><path d="M12 17.5V11l-2 3M13 9l2 2 4 0"/>',
  shoppingBag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 17v5"/>',
  speaker: '<rect x="11" y="2" width="8" height="14" rx="3" transform="rotate(45 15 9)"/><path d="M8 15 5.5 12.5a2 2 0 0 1 0-3L8 7"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 6h.01M15 6h.01M9 10h.01M15 10h.01M9 14h.01M15 14h.01M9 18h.01M15 18h.01"/>',
  tag: '<path d="M20.6 13.4 12 22 2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  note: '<path d="M12 2v9l4.5 4.5a1 1 0 0 1-.7 1.7H8.2a1 1 0 0 1-.7-1.7L12 11V2"/><path d="M8 21h8"/>',
  schedule: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 15l2 2 4-4"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-5M12 8h.01"/>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v5h-5"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9M7 8a3 3 0 1 1 5 2 3 3 0 1 1 5-2"/>',
  cup: '<path d="M3 8h14v6a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"/><path d="M17 9h2a2 2 0 0 1 0 4h-2"/>',
  play: '<path d="M6 3.5v17l14-8.5z"/>',
  // Redes sociales (trazo consistente)
  facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
  instagram: '<rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8.5 6l1-2h5l1 2"/>',
  tiktok: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  twitter: '<path d="M4 4l16 16M20 4L4 20"/>',
  linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V9h4v1.5a6 6 0 0 1 2-1.5z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
  youtube: '<path d="M6 4l14 8-14 8V4z"/>',
  threads: '<circle cx="12" cy="12" r="2.5"/><path d="M12 2c4 0 6.5 2 6.5 5.5 0 2-1.2 3.2-2 3.7.8.5 2 1.7 2 3.7C18.5 18.5 16 20.5 12 20.5S5.5 18.5 5.5 15c0-1.4.5-2.5 1.3-3.5"/>',
  telegram: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  snapchat: '<path d="M12 2c2 0 3.5 1.6 4 4 .2 1 .6 1.6 1.3 2.2.5.4 1.2.5 1.8.4.4-.1.8.2.9.6.1.3-.1.6-.3.8-.7.7-2 .9-2.9 1.4-.4.2-.5.5-.4.9 0 .4.4.7 1 .9.9.4 2 .7 2.4 1.1.3.3.3.7 0 1-.3.3-1 .4-2 .4-.5 0-1 .1-1.4.3-.5.3-.6 1.1-1.7 1.1s-1.2-.8-1.7-1.1c-.4-.2-.9-.3-1.4-.3-1 0-1.7-.1-2-.4-.3-.3-.3-.7 0-1 .4-.4 1.5-.7 2.4-1.1.6-.2 1-.5 1-.9-.1-.4 0-.7-.4-.9-.9-.5-2.2-.7-2.9-1.4-.2-.2-.4-.5-.3-.8.1-.4.5-.7.9-.6.6.1 1.3 0 1.8-.4.7-.6 1.1-1.2 1.3-2.2.5-2.4 2-4 4-4z"/>',
  discord: '<path d="M18 7c-1.2-.6-2.5-1-3.8-1.1l-.5 1a11 11 0 0 0-3.4 0l-.5-1C8.5 6 7.2 6.4 6 7a17 17 0 0 0-2.7 13.4 13 13 0 0 0 4 2l.9-1.5c-.9-.3-1.8-.7-2.5-1.2l.6-.5a10 10 0 0 0 9.4 0l.6.5c-.7.5-1.6.9-2.5 1.2l.9 1.5a13 13 0 0 0 4-2A17 17 0 0 0 18 7z"/><path d="M9.5 12.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zM14.5 12.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"/>',
  twitch: '<path d="M4 3h16v12l-4 4H11l-3 3v-3H4z"/><path d="M9 8v5M15 8v5"/>',
  spotify: '<circle cx="12" cy="12" r="10"/><path d="M7 9.5c3.6-1 7.3-.6 10 1.2M7.5 13.2c2.8-.8 5.7-.4 7.9 1M8.5 16.5c2-.5 4-.2 5.6 1"/>',
  appleMusic: '<path d="M9 18V6l12-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  github: '<path d="M9 9V5a3 3 0 1 0-3 3h4z"/><path d="M15 9V5a3 3 0 1 1 3 3h-4z"/><path d="M15 15v4a3 3 0 1 1-3-3h3z"/><path d="M9 15v4a3 3 0 1 0 3-3H9z"/>',
  briefcase: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>',
  send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
  bank: '<path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 10V7h14v3M7 7V4h10v3"/><path d="M3 17h18"/>',
  pin: '<path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  truck: '<path d="M5 18H3V6h13v12h-4"/><path d="M16 9h4l2 3v6h-6"/><circle cx="8" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  utensils: '<path d="M3 2v7a2 2 0 0 0 4 0V2"/><path d="M5 2v20"/><path d="M16 2c-1.5 1-2 4-2 6s.5 4 2 5v9"/><path d="M16 2c1.5 1 2 4 2 6s-.5 4-2 5"/>',
  headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2" y="14" width="4" height="6" rx="2"/><rect x="18" y="14" width="4" height="6" rx="2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  sparkles: '<path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  compass: '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.2 6.2-6.2 2.2 2.2-6.2z"/>',
  pinterest: '<circle cx="12" cy="12" r="10"/><path d="M12 6c-2.4 0-4.2 1.7-4.2 4.1 0 1.4.6 2.6 1.7 3.1"/><path d="M12.4 17.6 10 21"/>',
  reddit: '<circle cx="12" cy="12" r="10"/><circle cx="9.5" cy="10.5" r="1.5"/><circle cx="14.5" cy="10.5" r="1.5"/><path d="M12 14.5c2 0 3 1.5 3 1.5s-1 1.5-3 1.5-3-1.5-3-1.5 1-1.5 3-1.5z"/><path d="M10.5 6.5 12 4"/>',
  behance: '<path d="M3 6h7M3 12h8M3 18h5"/><circle cx="15" cy="9" r="2"/><path d="M13 9h6M16 9v7c2 0 4-1 4-3 0-1.5-1.5-2.5-3-2.5"/>',
  dribbble: '<circle cx="12" cy="12" r="10"/><path d="M8 3.5a20 20 0 0 0 0 17"/><path d="M16 3a20 20 0 0 1 0 18"/><path d="M2.5 12h19"/>',
  steam: '<circle cx="12" cy="12" r="9"/><path d="M5.5 15.5 3 18"/><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><circle cx="15.5" cy="9.5" r="1"/>',
  gamepad: '<rect x="2" y="7" width="20" height="12" rx="5"/><path d="M8 11v4M6 13h4"/><path d="M15.5 12.5h.01M17.5 14.5h.01"/>'
};

// Aliases para nombres de campo/campo que aparecen en datos reales
const aliases = {
  telefono: 'phone',
  tel: 'phone',
  email: 'mail',
  correo: 'mail',
  direccion: 'mapPin',
  direccion_google: 'mapPin',
  ubicacion: 'mapPin',
  ubicaciones: 'mapPin',
  mapa: 'mapPin',
  sucursal: 'building',
  web: 'globe',
  sitio_web: 'globe',
  portafolio: 'briefcase',
  otro: 'link',
  pdf: 'pdf',
  menu: 'book',
  menú: 'book',
  carta: 'book',
  whatsapp: 'whatsapp',
  x: 'twitter',
  apple_music: 'appleMusic',
  pinterest: 'pinterest',
  reddit: 'reddit',
  behance: 'behance',
  dribbble: 'dribbble',
  steam: 'steam',
  xbox: 'gamepad',
  psn: 'gamepad',
  kick: 'gamepad',
  bereal: 'camera',
  amazon_wishlist: 'gift'
};

const icons = {};
for (const name of Object.keys(paths)) {
  icons[name] = svg(paths[name]);
}

/**
 * Devuelve el SVG (string) de un icono por nombre.
 * @param {string} name - nombre del icono o alias de campo/tipo
 * @returns {string} SVG o icono link como fallback (nunca emoji)
 */
function icon(name) {
  const key = String(name || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (icons[key]) return icons[key];
  if (aliases[key]) return icons[aliases[key]] || icons.link;
  return icons.link;
}

function resolveForUrl(url = '', title = '') {
  const u = String(url).toLowerCase();
  const t = String(title || '').toLowerCase();
  const pairs = [
    ['whatsapp', 'whatsapp'],
    ['facebook', 'facebook'],
    ['instagram', 'instagram'],
    ['tiktok', 'tiktok'],
    ['youtube', 'youtube'],
    ['spotify', 'spotify'],
    ['x.com', 'twitter'],
    ['twitter', 'twitter'],
    ['linkedin', 'linkedin'],
    ['threads', 'threads'],
    ['telegram', 'telegram'],
    ['snapchat', 'snapchat'],
    ['discord', 'discord'],
    ['twitch', 'twitch'],
    ['github', 'github'],
    ['tel:', 'phone'],
    ['mailto:', 'mail'],
    ['maps', 'mapPin'],
    ['mapa', 'mapPin'],
    ['sucursal', 'building'],
    ['ubicacion', 'mapPin'],
    ['.pdf', 'pdf'],
    ['menu', 'book'],
    ['carta', 'book']
  ];
  for (const [needle, iconName] of pairs) {
    if (u.includes(needle) || t.includes(needle)) return iconName;
  }
  return 'link';
}

module.exports = { icons, icon, resolveForUrl, paths };
