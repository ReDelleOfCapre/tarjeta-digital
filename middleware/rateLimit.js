/**
 * Rate Limiter en memoria usando Map.
 * Fábrica que retorna un middleware configurado.
 *
 * @param {number} maxAttempts - Número máximo de intentos permitidos (default: 5)
 * @param {number} windowMs - Ventana de tiempo en milisegundos (default: 15 min)
 * @returns {Function} Middleware Express
 */
function createRateLimit(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const attempts = new Map();

  // Limpieza periódica de entradas expiradas cada 60 segundos
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of attempts.entries()) {
      if (now - entry.firstAttempt > windowMs) {
        attempts.delete(key);
      }
    }
  }, 60 * 1000);

  // Evitar que el intervalo mantenga vivo el proceso
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function rateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    const entry = attempts.get(ip);

    if (!entry) {
      attempts.set(ip, { count: 1, firstAttempt: now });
      return next();
    }

    // Si la ventana de tiempo ha pasado, reiniciar
    if (now - entry.firstAttempt > windowMs) {
      attempts.set(ip, { count: 1, firstAttempt: now });
      return next();
    }

    // Incrementar contador
    entry.count++;

    if (entry.count > maxAttempts) {
      const tiempoRestante = Math.ceil((windowMs - (now - entry.firstAttempt)) / 1000);
      return res.status(429).json({
        error: 'Demasiados intentos. Intenta de nuevo más tarde.',
        reintentar_en_segundos: tiempoRestante
      });
    }

    next();
  };
}

module.exports = createRateLimit;
