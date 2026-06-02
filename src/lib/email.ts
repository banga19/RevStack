import nodemailer from 'nodemailer';

// Configuration for nodemailer — start with placeholder, update later if needed
let transporter: nodemailer.Transporter;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  // If SMTP credentials are provided, use them
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return transporter;
  }

  // Development fallback: use Ethereal test account
  if (process.env.NODE_ENV !== 'production') {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return transporter;
  }

  // Last resort — create without auth (will likely fail)
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
  });
  return transporter;
}

/**
 * Send a welcome email to a new user
 * @param email - User's email address
 * @param name - User's name
 */
export async function sendWelcomeEmail(email: string, name: string) {
  try {
    const mailTransport = await getTransporter();

    // Email content
    const mailOptions = {
      from: '"Mapato" <welcome@mapato.app>',
      to: email,
      subject: 'Welcome to Mapato! 🎉',
      text: `
        Hello ${name},

        Welcome to Mapato! We're thrilled to have you on board.

        Get started by exploring our dashboard and setting up your first project.

        If you have any questions, don't hesitate to reach out to our support team.

        Best regards,
        The Mapato Team
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to Mapato! 🎉</h2>
          <p>Hello ${name},</p>
          <p>Welcome to Mapato! We're thrilled to have you on board.</p>
          <p>Get started by exploring our dashboard and setting up your first project.</p>
          <p>If you have any questions, don't hesitate to reach out to our support team.</p>
          <p>Best regards,<br>The Mapato Team</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 0.8em; color: #666;">
            You're receiving this email because you signed up at Mapato.
          </p>
        </div>
      `,
    };

    // Send email
    const info = await mailTransport.sendMail(mailOptions);

    // Log preview URL in development if using ethereal
    if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_USER) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: (error as Error).message };
  }
}