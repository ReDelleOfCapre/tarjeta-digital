const nodemailer = require('nodemailer');

// Configuración de transportador seguro con fallback de desarrollo
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'notificaciones@vynk.me',
    pass: process.env.SMTP_PASS || 'mock_pass'
  }
});

/**
  * Genera el envoltorio HTML universal de Lujo Silencioso VYNK
  */
function wrapVynkEmailTemplate(title, bodyHtml) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0A0A0C; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', Roboto, sans-serif; color: #F8F4EF; }
    .email-container { max-width: 580px; margin: 30px auto; background: #151517; border: 1px solid rgba(255,255,255,0.15); border-radius: 24px; overflow: hidden; box-shadow: 0 30px 70px rgba(0,0,0,0.8); }
    .email-header { padding: 32px 32px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); background: linear-gradient(180deg, rgba(92,72,230,0.12), transparent); }
    .email-body { padding: 32px; font-size: 15px; line-height: 1.6; color: rgba(248,244,239,0.85); }
    .email-footer { padding: 24px 32px; text-align: center; font-size: 12px; color: rgba(248,244,239,0.4); border-top: 1px solid rgba(255,255,255,0.08); background: #0F0F12; }
    .btn-cal { display: inline-block; padding: 14px 28px; border-radius: 100px; background: linear-gradient(135deg, #5C48E6, #173B63); color: #FFFFFF !important; font-weight: 700; font-size: 14px; text-decoration: none; box-shadow: 0 8px 24px rgba(92,72,230,0.4); margin-top: 16px; }
    .meta-box { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 20px; margin: 20px 0; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
    .meta-label { color: rgba(248,244,239,0.5); font-family: monospace; }
    .meta-value { font-weight: 600; color: #FFFFFF; text-align: right; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#5C48E6,#173B63);margin:0 auto 12px;display:grid;place-items:center;font-weight:900;font-size:20px;color:#fff">V</div>
      <h1 style="font-size:20px;font-weight:700;margin:0;color:#FFF;letter-spacing:-0.02em">${title}</h1>
    </div>
    <div class="email-body">
      ${bodyHtml}
    </div>
    <div class="email-footer">
      VYNK Startup Engine 2027 — Identidad Digital Inteligente & Citas en Vivo<br>
      © VYNK Inc. Todos los derechos reservados.
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Enviar Correo de Bienvenida al Registrarse
 */
async function sendWelcomeEmail(emailOrObj, nombreArg) {
  const email = typeof emailOrObj === 'object' ? emailOrObj.email : emailOrObj;
  const nombre = typeof emailOrObj === 'object' ? emailOrObj.nombre : nombreArg;
  const subject = "✨ Bienvenido a VYNK — Tu Identidad Digital Inteligente";
  const body = `
    <p>Hola <strong>${nombre || 'Creador'}</strong>,</p>
    <p>Bienvenido a <strong>VYNK</strong>, la plataforma de identidades digitales inteligentes de alto nivel.</p>
    <p>Tu cuenta ha sido creada con éxito. Ya puedes personalizar tu tarjeta digital, configurar tus redes sociales, agendar citas en tiempo real y emitir tu insignia oficial verificada.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="https://tarjeta-digital-1.onrender.com/editor.html" class="btn-cal">🚀 Diseñar Mi Tarjeta Ahora</a>
    </div>
  `;
  const html = wrapVynkEmailTemplate(subject, body);
  return sendMailSilently({ to: email, subject, html });
}

/**
 * Notificación de Nueva Cita para el Propietario del Negocio
 */
async function sendOwnerAppointmentNotification({ ownerEmail, ownerName, clientName, clientEmail, clientPhone, dateStr, serviceName, location, notes, googleCalUrl }) {
  const subject = `📅 Nueva Cita Agendada: ${serviceName} - ${clientName}`;
  const body = `
    <p>Hola <strong>${ownerName}</strong>,</p>
    <p>Un nuevo cliente ha reservado una cita a través de tu tarjeta digital inteligente VYNK.</p>
    
    <div class="meta-box">
      <div class="meta-row"><span class="meta-label">CLIENTE:</span><span class="meta-value">${clientName}</span></div>
      <div class="meta-row"><span class="meta-label">CORREO:</span><span class="meta-value">${clientEmail}</span></div>
      <div class="meta-row"><span class="meta-label">TELÉFONO:</span><span class="meta-value">${clientPhone || 'No proporcionado'}</span></div>
      <div class="meta-row"><span class="meta-label">SERVICIO:</span><span class="meta-value">${serviceName}</span></div>
      <div class="meta-row"><span class="meta-label">FECHA & HORA:</span><span class="meta-value">${dateStr}</span></div>
      <div class="meta-row"><span class="meta-label">SEDE / LUGAR:</span><span class="meta-value">${location}</span></div>
      ${notes ? `<div class="meta-row"><span class="meta-label">NOTAS:</span><span class="meta-value">${notes}</span></div>` : ''}
    </div>

    <div style="text-align:center;margin:24px 0">
      <a href="${googleCalUrl}" target="_blank" class="btn-cal">📅 Sincronizar en mi Google Calendar</a>
    </div>
  `;
  const html = wrapVynkEmailTemplate("📅 Nueva Cita Recibida", body);
  return sendMailSilently({ to: ownerEmail, subject, html });
}

/**
 * Confirmación de Cita para el Cliente
 */
async function sendClientAppointmentConfirmation({ clientEmail, clientName, ownerName, dateStr, serviceName, location, googleCalUrl }) {
  const subject = `✅ Cita Confirmada con ${ownerName}`;
  const body = `
    <p>Hola <strong>${clientName}</strong>,</p>
    <p>Tu cita con <strong>${ownerName}</strong> ha sido agendada con éxito.</p>
    
    <div class="meta-box">
      <div class="meta-row"><span class="meta-label">PROVEEDOR:</span><span class="meta-value">${ownerName}</span></div>
      <div class="meta-row"><span class="meta-label">SERVICIO:</span><span class="meta-value">${serviceName}</span></div>
      <div class="meta-row"><span class="meta-label">FECHA & HORA:</span><span class="meta-value">${dateStr}</span></div>
      <div class="meta-row"><span class="meta-label">UBICACIÓN:</span><span class="meta-value">${location}</span></div>
    </div>

    <div style="text-align:center;margin:24px 0">
      <a href="${googleCalUrl}" target="_blank" class="btn-cal">📅 Añadir a mi Google Calendar</a>
    </div>
  `;
  const html = wrapVynkEmailTemplate("✅ Cita Confirmada", body);
  return sendMailSilently({ to: clientEmail, subject, html });
}

/**
 * Enviar mail silencioso con log o fallback
 */
async function sendMailSilently({ to, subject, html }) {
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'notificaciones@vynk.me') {
    console.log(`✉️ [EMAIL MOCK SENT to ${to}]: ${subject}`);
    return { ok: true, mock: true };
  }
  try {
    const info = await transporter.sendMail({
      from: `"VYNK" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });
    console.log(`✉️ Correo enviado a ${to}: ${info.messageId}`);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error(`⚠️ Error enviando correo a ${to}:`, err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  sendWelcomeEmail,
  sendOwnerAppointmentNotification,
  sendClientAppointmentConfirmation
};
