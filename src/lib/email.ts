import { Resend } from 'resend';

interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
}

export async function sendPasswordResetEmail(email: string, resetUrl: string, userName?: string): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not defined in environment variables');
    }
    const resend = new Resend(apiKey);

    const emailTemplate: EmailTemplate = {
      to: email,
      subject: 'Reset Your Password - ANINO AI',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - ANINO AI</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding: 20px 0;
              border-bottom: 2px solid #f0f0f0;
            }
            .logo {
              font-size: 2rem;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .logo-coin {
              color: #00D09C;
            }
            .logo-bff {
              color: #333;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 10px;
              margin: 20px 0;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #00D09C 0%, #05e2ab 100%);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .button:hover {
              opacity: 0.9;
            }
            .footer {
              text-align: center;
              font-size: 0.9rem;
              color: #666;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #f0f0f0;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">
              <span class="logo-coin">ANINO</span><span class="logo-bff"> AI</span>
            </div>
            <p>Secure Password Reset</p>
          </div>
          
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hello${userName ? ` ${userName}` : ''},</p>
            <p>We received a request to reset your password for your ANINO AI account. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset My Password</a>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This link will expire in <strong>1 hour</strong></li>
                <li>If you didn't request this reset, you can safely ignore this email</li>
                <li>Your password won't change unless you click the link above</li>
              </ul>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px;">
              ${resetUrl}
            </p>
          </div>
          
          <div class="footer">
            <p>This email was sent by ANINO AI</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </body>
        </html>
      `
    };

    const data = await resend.emails.send({
      from: 'ANINO AI <onboarding@resend.dev>', // Using Resend's free test domain
      to: emailTemplate.to,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    console.log('Password reset email sent successfully:', data);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

export async function sendWelcomeEmail(email: string, userName: string): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not defined in environment variables');
    }
    const resend = new Resend(apiKey);

    const data = await resend.emails.send({
      from: 'ANINO AI <onboarding@resend.dev>',
      to: email,
      subject: 'Welcome to ANINO AI!',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ANINO AI</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding: 20px 0;
            }
            .logo {
              font-size: 2rem;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .logo-coin { color: #00D09C; }
            .logo-bff { color: #333; }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">
              <span class="logo-coin">ANINO</span><span class="logo-bff"> AI</span>
            </div>
          </div>
          
          <div class="content">
            <h2>Welcome to ANINO AI, ${userName}! 🎉</h2>
            <p>Thank you for joining our platform. You can now:</p>
            <ul>
              <li>Create and manage smart AI agents</li>
              <li>Configure automated responses and WhatsApp helpers</li>
              <li>Track customer interactions and phone calls</li>
            </ul>
            <p>Get started by exploring your dashboard and creating your first AI agent!</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log('Welcome email sent successfully:', data);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
}