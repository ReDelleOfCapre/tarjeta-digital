const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

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

  let htmlContent = '';
  const templatePath = path.join(process.cwd(), 'templates', 'emails', 'onboarding.html');
  if (fs.existsSync(templatePath)) {
    htmlContent = fs.readFileSync(templatePath, 'utf8')
      .replace(/{{nombre}}/g, nombre || 'Usuario')
      .replace(/{{action_url}}/g, targetLink)
      .replace(/{{email}}/g, email || '');
  } else {
    htmlContent = `<p>Bienvenido a VYNK, ${nombre || 'Usuario'}. Tu identidad digital está lista.</p>`;
  }

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

  let htmlContent = '';
  const templatePath = path.join(process.cwd(), 'templates', 'emails', 'invite.html');
  if (fs.existsSync(templatePath)) {
    htmlContent = fs.readFileSync(templatePath, 'utf8')
      .replace(/{{remitente}}/g, senderName || 'Un colega')
      .replace(/{{invite_url}}/g, inviteLink)
      .replace(/{{email}}/g, email || '');
  } else {
    htmlContent = `<p>${senderName || 'Un colega'} te ha invitado a unirte a VYNK.</p>`;
  }

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
