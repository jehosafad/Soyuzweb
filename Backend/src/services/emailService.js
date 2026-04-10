/**
 * emailService.js
 * Motor de notificaciones transaccionales con Nodemailer.
 * Si SMTP no está configurado, falla de forma silenciosa (graceful degradation).
 */

const nodemailer = require("nodemailer");

let _transporter = null;

function getTransporter() {
    if (_transporter) return _transporter;

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        return null;
    }

    _transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        tls: { rejectUnauthorized: process.env.NODE_ENV === "production" },
    });

    return _transporter;
}

const FROM_ADDRESS = process.env.SMTP_FROM || '"Agencia Soyuz" <noreply@soyuz.local>';
const PORTAL_URL = process.env.CLIENT_PORTAL_URL || "http://localhost:5173/client/portal";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function baseTemplate(title, bodyHtml) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06);padding:40px;max-width:600px;width:100%;">
        <tr><td>
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;
                    letter-spacing:.1em;color:#64748b;">Agencia Soyuz</p>
          <h1 style="margin:0 0 28px;font-size:22px;font-weight:700;color:#0f172a;
                     line-height:1.3;">${escapeHtml(title)}</h1>
          ${bodyHtml}
          <hr style="margin:32px 0;border:none;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
            Mensaje automático del sistema Soyuz. No respondas a este correo.<br>
            Si crees que lo recibiste por error, ignóralo.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(href, text) {
    return `<a href="${escapeHtml(href)}"
  style="display:inline-block;margin-top:8px;padding:12px 26px;background:#06b6d4;
         color:#fff;text-decoration:none;border-radius:10px;font-weight:600;
         font-size:14px;">${escapeHtml(text)} →</a>`;
}

function infoBlock(label, value) {
    return `<div style="background:#f1f5f9;border-radius:10px;padding:14px 18px;margin:8px 0;">
  <p style="margin:0 0 4px;font-size:12px;font-weight:600;
            text-transform:uppercase;letter-spacing:.06em;color:#64748b;">${escapeHtml(label)}</p>
  <p style="margin:0;font-size:15px;color:#0f172a;">${escapeHtml(value)}</p>
</div>`;
}

// ─── Envío interno ────────────────────────────────────────────────────────────

async function sendMail({ to, subject, html }) {
    const transport = getTransporter();

    if (!transport) {
        console.warn(`[emailService] SMTP no configurado — email omitido: "${subject}" → ${to}`);
        return null;
    }

    try {
        const info = await transport.sendMail({ from: FROM_ADDRESS, to, subject, html });
        console.info(`[emailService] Email enviado: "${subject}" → ${to} (${info.messageId})`);
        return info;
    } catch (err) {
        console.error(`[emailService] Error al enviar: ${err.message}`);
        return null;
    }
}

// ─── Notificaciones públicas ──────────────────────────────────────────────────

/**
 * Se dispara cuando el admin responde un ticket de soporte.
 */
async function sendTicketResponseNotification({ to, ticketSummary, adminResponse }) {
    const html = baseTemplate("Tu solicitud ha sido respondida", `
    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px;">
      El equipo de Soyuz ha respondido a tu solicitud de soporte.
    </p>
    ${infoBlock("Solicitud", ticketSummary)}
    <div style="background:#ecfdf5;border-radius:10px;padding:14px 18px;margin:8px 0;
                border-left:3px solid #10b981;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;
                text-transform:uppercase;letter-spacing:.06em;color:#065f46;">Respuesta del equipo</p>
      <p style="margin:0;font-size:15px;color:#064e3b;white-space:pre-line;">${escapeHtml(adminResponse)}</p>
    </div>
    <p style="color:#334155;font-size:15px;margin:20px 0 8px;">
      Accede a tu portal para ver todos los detalles y el historial completo:
    </p>
    ${ctaButton(PORTAL_URL, "Ir a mi portal")}
  `);

    return sendMail({ to, subject: "Respuesta a tu solicitud — Soyuz", html });
}

/**
 * Se dispara cuando el admin crea una cotización manual vinculada a un ticket.
 */
async function sendNewQuoteNotification({ to, quoteTitle, amountFormatted, expiresAt }) {
    const html = baseTemplate("Nueva cotización disponible para ti", `
    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Hemos preparado una cotización manual que requiere tu revisión y aprobación.
    </p>
    ${infoBlock("Cotización", quoteTitle)}
    ${infoBlock("Monto", amountFormatted)}
    ${expiresAt ? infoBlock("Válida hasta", expiresAt) : ""}
    <p style="color:#334155;font-size:15px;margin:20px 0 8px;">
      Revisa el detalle completo, acepta o rechaza la propuesta desde tu portal:
    </p>
    ${ctaButton(PORTAL_URL, "Revisar cotización")}
  `);

    return sendMail({ to, subject: "Nueva cotización disponible — Soyuz", html });
}

/**
 * Se dispara cuando el admin actualiza la fase de un proyecto.
 */
async function sendProjectPhaseNotification({ to, projectName, newPhase }) {
    const html = baseTemplate(`"${projectName}" ha avanzado de fase`, `
    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px;">
      El estado de tu proyecto fue actualizado por el equipo de Soyuz.
    </p>
    ${infoBlock("Proyecto", projectName)}
    ${infoBlock("Nueva fase", newPhase)}
    <p style="color:#334155;font-size:15px;margin:20px 0 8px;">
      Revisa el progreso completo y la línea de tiempo en tu portal:
    </p>
    ${ctaButton(PORTAL_URL, "Ver mi proyecto")}
  `);

    return sendMail({
        to,
        subject: `Tu proyecto "${projectName}" ha cambiado de fase — Soyuz`,
        html,
    });
}

/**
 * Se dispara cuando el admin sube un nuevo archivo entregable al proyecto.
 */
async function sendNewDeliverableNotification({ to, projectName, fileLabel }) {
    const html = baseTemplate("Nuevo archivo entregable disponible", `
    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Se ha subido un nuevo archivo a tu proyecto y está listo para descargar.
    </p>
    ${infoBlock("Proyecto", projectName)}
    ${infoBlock("Archivo", fileLabel)}
    <p style="color:#334155;font-size:15px;margin:20px 0 8px;">
      Descárgalo desde la sección "Archivos entregados" en tu portal:
    </p>
    ${ctaButton(PORTAL_URL, "Descargar archivo")}
  `);

    return sendMail({
        to,
        subject: `Nuevo entregable disponible — ${projectName} — Soyuz`,
        html,
    });
}

async function sendPasswordResetEmail({ to, resetToken }) {
    const resetUrl = `${PORTAL_URL.replace("/client/portal", "")}/reset-password?token=${resetToken}`;

    return sendMail({
        to,
        subject: "Recupera tu contraseña — Soyuz",
        html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#1e40af;">Soyuz</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
        <p style="margin:24px 0;">
          <a href="${escapeHtml(resetUrl)}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Restablecer contraseña
          </a>
        </p>
        <p style="color:#64748b;font-size:13px;">Este enlace expira en 1 hora. Si no solicitaste esto, ignora este correo.</p>
      </div>
    `,
    });
}

module.exports = {
    sendTicketResponseNotification,
    sendNewQuoteNotification,
    sendProjectPhaseNotification,
    sendNewDeliverableNotification,
    sendPasswordResetEmail,
};