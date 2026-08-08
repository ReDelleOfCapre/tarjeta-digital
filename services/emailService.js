const nodemailer = require('nodemailer');

// Configure test/production Nodemailer transport safely
let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Graceful test account or console fallback
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    } catch(e) {
      console.log('⚠️ Using mock email logger fallback');
      transporter = {
        sendMail: async (opts) => {
          console.log(`[MOCK EMAIL SENT TO ${opts.to}]:`, opts.subject);
          return { messageId: 'mock-' + Date.now() };
        }
      };
    }
  }
  return transporter;
}

async function sendOnboardingEmail(email, nombre, profileUrl) {
  const mailer = await getTransporter();
  const targetLink = profileUrl || 'https://tarjeta-digital.onrender.com/dashboard.html';

  const htmlContent = `
    <div style="background-color:#08080E;color:#FFFFFF;font-family:'Inter',system-ui,sans-serif;padding:32px;border-radius:16px;max-width:560px;margin:0 auto">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="font-size:1.8rem;font-weight:800;letter-spacing:-0.03em;color:#FFF;margin:0">VYNK</h1>
        <p style="font-size:0.85rem;color:#7C3AED;margin-top:4px">Ecosistema de Identidad Digital Enterprise</p>
      </div>

      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);padding:24px;border-radius:16px;margin-bottom:24px">
        <h2 style="font-size:1.2rem;margin-top:0;color:#FFF">¡Bienvenido a VYNK, ${nombre || 'Usuario'}! ⚡</h2>
        <p style="font-size:0.92rem;color:rgba(255,255,255,0.8);line-height:1.6">
          Tu identidad digital está lista. Sigue estos <strong>3 pasos para sincronizar tu tag NFC</strong> y transmitir la máxima autoridad con tus clientes:
        </p>

        <ol style="font-size:0.88rem;color:rgba(255,255,255,0.85);line-height:1.7;padding-left:20px;margin-top:16px">
          <li style="margin-bottom:10px"><strong>Personaliza tu Tarjeta:</strong> Configura tus redes, catálogo social selling, PDF y ubicación en el Editor Live.</li>
          <li style="margin-bottom:10px"><strong>Sincroniza Hardware NFC:</strong> Abre la app en Chrome para Android y acerca tu sticker o VYNK Card física.</li>
          <li style="margin-bottom:10px"><strong>Comparte sin Límites:</strong> Despliega tu QR nativo o link personalizado en WhatsApp y redes.</li>
        </ol>
      </div>

      <div style="text-align:center;margin-top:28px">
        <a href="${targetLink}" target="_blank" style="background:linear-gradient(135deg,#7C3AED,#06B6D4);color:#FFFFFF;padding:14px 28px;border-radius:12px;font-weight:700;font-size:0.95rem;text-decoration:none;display:inline-block;box-shadow:0 8px 25px rgba(124,58,237,0.4)">
          🚀 Ir a Mi Centro de Comando
        </a>
      </div>

      <div style="margin-top:32px;text-align:center;font-size:0.75rem;color:rgba(255,255,255,0.4);border-top:1px solid rgba(255,255,255,0.08);padding-top:16px">
        © 2026 VYNK Enterprise Identity Engine. Todos los derechos reservados.
      </div>
    </div>
  `;

  try {
    return await mailer.sendMail({
      from: '"VYNK Enterprise" <no-reply@vynk.app>',
      to: email,
      subject: '⚡ Bienvenido a VYNK: Tu Identidad Digital está Lista',
      html: htmlContent
    });
  } catch(err) {
    console.log('⚠️ Warning enviando email onboarding (fallback mock log):', err.message);
    return { messageId: 'mock-fallback-' + Date.now() };
  }
}

async function sendInviteEmail(email, senderName, inviteToken) {
  const mailer = await getTransporter();
  const inviteLink = `https://tarjeta-digital.onrender.com/register.html?invite_token=${inviteToken || 'vynk2026'}`;

  const htmlContent = `
    <div style="background-color:#08080E;color:#FFFFFF;font-family:'Inter',system-ui,sans-serif;padding:32px;border-radius:16px;max-width:560px;margin:0 auto">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="font-size:1.8rem;font-weight:800;letter-spacing:-0.03em;color:#FFF;margin:0">VYNK</h1>
        <p style="font-size:0.85rem;color:#06B6D4;margin-top:4px">Invitación a Red Corporativa</p>
      </div>

      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(124,58,237,0.3);padding:24px;border-radius:16px;margin-bottom:24px">
        <h2 style="font-size:1.15rem;margin-top:0;color:#FFF">📩 Has sido invitado a unirte al ecosistema VYNK</h2>
        <p style="font-size:0.9rem;color:rgba(255,255,255,0.85);line-height:1.6">
          <strong>${senderName || 'Un colega'}</strong> te ha enviado un acceso exclusivo para unirte a la plataforma de identidad digital VYNK.
        </p>
        <p style="font-size:0.85rem;color:rgba(255,255,255,0.7);line-height:1.5">
          Crea tu tarjeta inteligente, sincroniza hardware NFC y colabora en espacios de trabajo corporativos B2B.
        </p>
      </div>

      <div style="text-align:center;margin-top:24px">
        <a href="${inviteLink}" target="_blank" style="background:linear-gradient(135deg,#06B6D4,#7C3AED);color:#FFFFFF;padding:14px 28px;border-radius:12px;font-weight:700;font-size:0.95rem;text-decoration:none;display:inline-block">
          ✨ Aceptar Invitación & Registrarme
        </a>
      </div>

      <div style="margin-top:32px;text-align:center;font-size:0.75rem;color:rgba(255,255,255,0.4);border-top:1px solid rgba(255,255,255,0.08);padding-top:16px">
        © 2026 VYNK Identity Infrastructure.
      </div>
    </div>
  `;

  try {
    return await mailer.sendMail({
      from: '"VYNK Network" <invites@vynk.app>',
      to: email,
      subject: `📩 ${senderName || 'Un colega'} te ha invitado a unirte a VYNK`,
      html: htmlContent
    });
  } catch(err) {
    console.log('⚠️ Warning enviando email invite (fallback mock log):', err.message);
    return { messageId: 'mock-fallback-' + Date.now() };
  }
}

module.exports = {
  sendOnboardingEmail,
  sendInviteEmail
};
