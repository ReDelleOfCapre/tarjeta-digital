const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getTransporter } = require('../utils/email');

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
  const safeToken = inviteToken || ('vynk_' + crypto.randomBytes(24).toString('hex'));
  const inviteLink = `https://tarjeta-digital.onrender.com/register.html?invite_token=${safeToken}`;

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
