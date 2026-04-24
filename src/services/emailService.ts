import nodemailer from 'nodemailer';

const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure =
    process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : port === 465;

  if (!host) throw new Error('SMTP_HOST is missing');
  if (!port || Number.isNaN(port)) throw new Error('SMTP_PORT is missing or invalid');
  if (!user) throw new Error('SMTP_USER is missing');
  if (!pass) throw new Error('SMTP_PASS is missing');

  console.log('Creating SMTP transporter with:', {
    host,
    port,
    secure,
    user,
  });

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
};

export const sendResetPasswordEmail = async (to: string, resetLink: string) => {
  const transporter = getTransporter();

  const mailOptions = {
    from: `"La Mia Cucina" <${process.env.SMTP_FROM || 'noreply@lamiaCucina.com'}>`,
    to,
    subject: 'Password Reset Request - La Mia Cucina',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 10px;">
        <h2 style="color: #4a5d4a; text-align: center;">Mia Cucina</h2>
        <p>Hello Chef,</p>
        <p>We received a request to reset your password for your Mia Cucina kitchen. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #4a5d4a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset My Password</a>
        </div>
        <p style="font-size: 14px; color: #666;">If the button above doesn't work, copy and paste this link into your browser:</p>
        <p style="font-size: 12px; color: #4a5d4a; word-break: break-all;">${resetLink}</p>
        <p>If you didn't request this, you can safely ignore this email. This link will expire in 1 hour.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">
          Bon Appétit!<br>
          The La Mia Cucina Team
        </p>
      </div>
    `,
  };

  try {
    await transporter.verify();
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send reset email. Please ensure SMTP settings are configured.');
  }
};