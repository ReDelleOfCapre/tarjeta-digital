const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'vynk.platform@gmail.com',
    pass: process.env.SMTP_PASS || 'app_password_placeholder'
  }
});

/**
 * Enviar correo de Bienvenida SaaS
 */
async function sendWelcomeEmail(toEmail, userName) {
  if (!toEmail) return;

  const html = `
    <div style="background-color:#030306;color:#F8FAFC;font-family:system-ui,-apple-system,sans-serif;padding:32px 20px;max-width:600px;margin:0 auto;border-radius:24px;border:1px solid rgba(255,255,255,0.12)">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="background:linear-gradient(135deg,#7C3AED,#06B6D4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:2rem;margin:0">⚡ VYNK</h1>
        <p style="color:#94A3B8;font-size:0.85rem;margin-top:4px">El Centro de Identidad Digital Inteligente</p>
      </div>

      <div style="background:rgba(255,255,255,0.03);padding:24px;border-radius:16px;border:1px solid rgba(255,255,255,0.08);margin-bottom:24px">
        <h2 style="font-size:1.3rem;margin:0 0 12px 0;color:#FFFFFF">¡Bienvenido a bordo, ${userName}! 🚀</h2>
        <p style="color:#CBD5E1;line-height:1.6;font-size:0.95rem">
          Tu cuenta en VYNK ha sido activada con éxito. Ya puedes crear tus tarjetas digitales hiper-personalizadas, compartirlas vía QR dinámico o NFC físico y medir el rendimiento de tus enlaces en tiempo real.
        </p>
        <div style="text-align:center;margin-top:24px">
          <a href="https://vynk.onrender.com/dashboard.html" style="background:linear-gradient(135deg,#7C3AED,#6366F1);color:#FFFFFF;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:600;display:inline-block">Ir a mi Dashboard →</a>
        </div>
      </div>

      <p style="text-align:center;color:#64748B;font-size:0.75rem;margin:0">
        © 2026 VYNK Platform Inc. — Todos los derechos reservados.
      </p>
    </div>
  `;

  try {
    if (process.env.SMTP_PASS === 'app_password_placeholder' || process.env.NODE_ENV === 'test') {
      console.log(`✉️ [SMTP MOCK] Correo de Bienvenida simulado a: ${toEmail}`);
      return;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"⚡ VYNK Platform" <noreply@vynk.onrender.com>',
      to: toEmail,
      subject: '⚡ ¡Bienvenido a VYNK! Tu cuenta está lista',
      html
    });
    console.log(`✉️ Correo de bienvenida enviado a: ${toEmail}`);
  } catch (err) {
    console.error('Error enviando correo de bienvenida:', err.message);
  }
}

/**
 * Enviar correo motivacional tras crear la primera tarjeta digital
 */
async function sendFirstCardNotification(toEmail, userName, cardSlug) {
  if (!toEmail) return;

  const cardUrl = `https://vynk.onrender.com/u/${cardSlug}`;

  const html = `
    <div style="background-color:#030306;color:#F8FAFC;font-family:system-ui,-apple-system,sans-serif;padding:32px 20px;max-width:600px;margin:0 auto;border-radius:24px;border:1px solid rgba(255,255,255,0.12)">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="background:linear-gradient(135deg,#7C3AED,#06B6D4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:2rem;margin:0">⚡ VYNK</h1>
      </div>

      <div style="background:rgba(255,255,255,0.03);padding:24px;border-radius:16px;border:1px solid rgba(255,255,255,0.08);margin-bottom:24px">
        <h2 style="font-size:1.3rem;margin:0 0 12px 0;color:#10B981">🎉 ¡Tu primera tarjeta digital está viva!</h2>
        <p style="color:#CBD5E1;line-height:1.6;font-size:0.95rem">
          Hola ${userName}, tu tarjeta digital <strong>${cardSlug}</strong> ha sido publicada en vivo. Ya puedes compartirla con tus clientes o programar tu tarjeta NFC física.
        </p>
        <div style="text-align:center;margin-top:24px">
          <a href="${cardUrl}" style="background:linear-gradient(135deg,#10B981,#06B6D4);color:#FFFFFF;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:600;display:inline-block">Ver mi Tarjeta En Vivo →</a>
        </div>
      </div>
    </div>
  `;

  try {
    if (process.env.SMTP_PASS === 'app_password_placeholder' || process.env.NODE_ENV === 'test') {
      console.log(`✉️ [SMTP MOCK] Correo de Primera Tarjeta simulado a: ${toEmail} (${cardSlug})`);
      return;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"⚡ VYNK Platform" <noreply@vynk.onrender.com>',
      to: toEmail,
      subject: `🎉 ¡Tu tarjeta digital ${cardSlug} ya está en vivo!`,
      html
    });
    console.log(`✉️ Correo de primera tarjeta enviado a: ${toEmail}`);
  } catch (err) {
    console.error('Error enviando correo de primera tarjeta:', err.message);
  }
}

module.exports = {
  sendWelcomeEmail,
  sendFirstCardNotification
};
