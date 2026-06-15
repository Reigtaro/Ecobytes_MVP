import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

const logoPath = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'LogoGlobo.png');

function getLogoAttachment() {
  try {
    const content = fs.readFileSync(logoPath);
    return [{ filename: 'LogoGlobo.png', content, contentId: 'ecobytes-logo' }];
  } catch {
    return [];
  }
}

const LOGO_IMG = `<img src="cid:ecobytes-logo" alt="EcoBytes" style="height: 128px; width: auto;" />`;

export async function sendVerificationCode(email: string, code: string): Promise<void> {
  await resend.emails.send({
    from: `EcoBytes <${FROM_EMAIL}>`,
    to: email,
    subject: 'Codigo de verificacion - EcoBytes',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 32px;">
          ${LOGO_IMG}
        </div>
        <div style="background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
          <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0 0 16px 0;">Tu codigo de verificacion es:</p>
          <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ffffff; font-family: 'Courier New', monospace;">
            ${code}
          </div>
        </div>
        <p style="color: #666; font-size: 14px; text-align: center; margin: 0 0 8px 0;">
          Este codigo expira en <strong>10 minutos</strong>.
        </p>
        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
          Si no solicitaste este codigo, puedes ignorar este email.
        </p>
      </div>
    `,
    attachments: getLogoAttachment(),
  });
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  await resend.emails.send({
    from: `EcoBytes <${FROM_EMAIL}>`,
    to: email,
    subject: 'Recuperar contraseña - EcoBytes',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 32px;">
          ${LOGO_IMG}
        </div>
        <div style="background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
          <p style="color: rgba(255,255,255,0.9); font-size: 15px; margin: 0 0 8px 0; font-weight: 600;">Recuperacion de contraseña</p>
          <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 0 0 24px 0;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta EcoBytes.<br/>
            Haz clic en el boton para crear una nueva contraseña.
          </p>
          <a href="${resetUrl}" style="display: inline-block; background: #ffffff; color: #0d9488; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">
            Restablecer Contraseña
          </a>
        </div>
        <p style="color: #666; font-size: 14px; text-align: center; margin: 0 0 8px 0;">
          Este enlace expira en <strong>30 minutos</strong>.
        </p>
        <p style="color: #999; font-size: 12px; text-align: center; margin: 0 0 8px 0;">
          Si no solicitaste esto, puedes ignorar este email. Tu contraseña no cambiara.
        </p>
        <p style="color: #bbb; font-size: 11px; text-align: center; margin: 0; word-break: break-all;">
          Si el boton no funciona, copia este enlace: ${resetUrl}
        </p>
      </div>
    `,
    attachments: getLogoAttachment(),
  });
}

export async function sendDeactivationEmail(email: string, confirmUrl: string): Promise<void> {
  await resend.emails.send({
    from: `EcoBytes <${FROM_EMAIL}>`,
    to: email,
    subject: 'Confirmar desactivacion de cuenta - EcoBytes',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 32px;">
          ${LOGO_IMG}
        </div>
        <div style="background: linear-gradient(135deg, #dc2626 0%, #f59e0b 100%); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
          <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0 0 16px 0;">Solicitud de desactivacion de cuenta</p>
          <p style="color: #ffffff; font-size: 16px; margin: 0 0 24px 0;">Hiciste una solicitud para desactivar tu cuenta. Haz clic en el boton para confirmar.</p>
          <a href="${confirmUrl}" style="display: inline-block; background: #ffffff; color: #dc2626; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">Confirmar Desactivacion</a>
        </div>
        <p style="color: #666; font-size: 14px; text-align: center; margin: 0 0 8px 0;">
          Este enlace expira en <strong>30 minutos</strong>.
        </p>
        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
          Si no solicitaste esto, puedes ignorar este email. Tu cuenta permanecera activa.
        </p>
      </div>
    `,
    attachments: getLogoAttachment(),
  });
}

export async function sendReactivationEmail(email: string, confirmUrl: string): Promise<void> {
  await resend.emails.send({
    from: `EcoBytes <${FROM_EMAIL}>`,
    to: email,
    subject: 'Reactivar tu cuenta - EcoBytes',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 32px;">
          ${LOGO_IMG}
        </div>
        <div style="background: linear-gradient(135deg, #0d9488 0%, #10b981 100%); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
          <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0 0 16px 0;">Reactivacion de cuenta</p>
          <p style="color: #ffffff; font-size: 16px; margin: 0 0 24px 0;">Haz clic en el boton para reactivar tu cuenta y volver a usar EcoBytes.</p>
          <a href="${confirmUrl}" style="display: inline-block; background: #ffffff; color: #0d9488; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">Reactivar Cuenta</a>
        </div>
        <p style="color: #666; font-size: 14px; text-align: center; margin: 0 0 8px 0;">
          Este enlace expira en <strong>24 horas</strong>.
        </p>
        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
          Si no solicitaste esto, puedes ignorar este email.
        </p>
      </div>
    `,
    attachments: getLogoAttachment(),
  });
}
