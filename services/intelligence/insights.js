// ============================================
// VYNK Intelligence — insights.js
// Insights calculados SOLO desde datos reales
// de analytics (tabla estadisticas). Nunca inventa
// cifras: si no hay datos, dice que no hay datos.
// Determinístico.
// ============================================

const EVENT_NAMES = {
  visita: 'visita',
  click_whatsapp: 'WhatsApp',
  click_llamar: 'Llamada',
  click_email: 'Email',
  descarga_vcard: 'Contacto (vCard)',
  click_mapa: 'Mapa',
  click_red_social: 'Red social',
  ver_archivo: 'Archivo'
};

// Normaliza el payload del endpoint /estadisticas/perfiles/:id/estadisticas
// o uno equivalente { visitas_total, eventos, tendencia }.
function normalizeAnalytics(raw) {
  if (!raw || typeof raw !== 'object') return { visitas_total: 0, eventos: {}, tendencia: [] };
  const eventos = raw.eventos || {};
  const tendencia = Array.isArray(raw.tendencia) ? raw.tendencia : [];
  return {
    visitas_total: Number(raw.visitas_total) || 0,
    eventos,
    tendencia
  };
}

function interactionsTotal(eventos) {
  let total = 0;
  Object.keys(eventos || {}).forEach(function (key) {
    if (key === 'visita') return;
    total += Number(eventos[key]) || 0;
  });
  return total;
}

function sumLastDays(tendencia, days) {
  if (!Array.isArray(tendencia) || !tendencia.length) return 0;
  const now = new Date();
  let total = 0;
  tendencia.forEach(function (row) {
    const d = new Date(row.fecha);
    const diff = Math.floor((now - d) / 86400000);
    if (diff >= 0 && diff < days) total += Number(row.visitas) || 0;
  });
  return total;
}

// Insight principal: interacciones por tipo de evento, en orden.
function topInteractions(eventos, limit) {
  const list = [];
  Object.keys(eventos || {}).forEach(function (key) {
    if (key === 'visita') return;
    list.push({ evento: key, label: EVENT_NAMES[key] || key, total: Number(eventos[key]) || 0 });
  });
  list.sort(function (a, b) { return b.total - a.total; });
  return list.slice(0, limit || 3);
}

// Calcula insights accionables con los datos reales disponibles.
// Cada insight incluye data real y un mensaje que la refleja fielmente.
function calculateInsights(analytics, profile, blocks) {
  const a = normalizeAnalytics(analytics);
  const eventos = a.eventos || {};
  const interactions = interactionsTotal(eventos);
  const visits = a.visitas_total;
  const ctr = visits > 0 ? (interactions / visits) * 100 : 0;

  const last7 = sumLastDays(a.tendencia, 7);
  const prev7 = sumLastDays(a.tendencia, 14) - last7;

  const insights = [];

  if (visits === 0 && interactions === 0) {
    insights.push({
      id: 'no_data',
      level: 'info',
      title: 'Aún no hay métricas',
      message: 'Cuando tu tarjeta reciba visitas y clics, aquí verás datos reales de interacción.',
      data: { visitas: 0, interacciones: 0 }
    });
    return insights;
  }

  insights.push({
    id: 'visits_total',
    level: 'info',
    title: visits + ' visitas',
    message: 'Tu tarjeta acumula ' + visits + ' visitas registradas.',
    data: { visitas: visits }
  });

  if (interactions > 0) {
    insights.push({
      id: 'interactions',
      level: 'info',
      title: interactions + ' interacciones',
      message: 'Tus visitantes realizaron ' + interactions + ' acciones sobre tus enlaces y botones (CTR ' + ctr.toFixed(1) + '%).',
      data: { interacciones: interactions, ctr: Math.round(ctr * 10) / 10 }
    });
  }

  const top = topInteractions(eventos, 1)[0];
  if (top) {
    const pct = interactions > 0 ? Math.round((top.total / interactions) * 100) : 0;
    insights.push({
      id: 'top_action',
      level: 'highlight',
      title: top.label + ' es tu acción principal',
      message: top.label + ' recibió ' + top.total + ' interacciones (' + pct + '% del total).',
      data: { evento: top.evento, label: top.label, total: top.total, pct }
    });
  }

  if (last7 > 0) {
    if (prev7 > 0) {
      const diff = last7 - prev7;
      const pct = Math.round((diff / prev7) * 100);
      insights.push({
        id: 'trend_week',
        level: pct >= 0 ? 'positive' : 'warning',
        title: 'Última semana: ' + last7 + ' visitas',
        message: 'Comparado con la semana anterior (' + prev7 + '), tu tráfico ' + (pct >= 0 ? 'subió un ' + pct + '%.' : 'bajó un ' + Math.abs(pct) + '%.'),
        data: { last7, prev7, pct }
      });
    } else {
      insights.push({
        id: 'trend_week_first',
        level: 'positive',
        title: 'Primera semana: ' + last7 + ' visitas',
        message: 'Tu tarjeta registró ' + last7 + ' visitas esta semana.',
        data: { last7 }
      });
    }
  }

  // Insignt de conversión basado en vCard (compartir) y mapa.
  const vcard = Number(eventos.descarga_vcard) || 0;
  if (vcard > 0) {
    insights.push({
      id: 'vcard',
      level: 'positive',
      title: vcard + ' guardados de contacto',
      message: 'Tus visitantes descargaron tu vCard ' + vcard + ' veces. Tu tarjeta está convirtiendo.',
      data: { vcard }
    });
  }

  return insights;
}

module.exports = { calculateInsights, normalizeAnalytics, interactionsTotal, topInteractions };
