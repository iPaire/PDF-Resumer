import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendPasswordResetEmailParams {
  to: string;
  token: string;
}

export async function sendPasswordResetEmail({ to, token }: SendPasswordResetEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: [to],
      subject: 'Resetare parolă - PDF Resumer',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: #ffffff;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .token-box {
              background-color: #f0f9ff;
              border: 2px solid #2563eb;
              border-radius: 8px;
              padding: 30px;
              text-align: center;
              margin: 30px 0;
            }
            .token {
              font-size: 36px;
              font-weight: bold;
              letter-spacing: 8px;
              color: #2563eb;
              font-family: 'Courier New', monospace;
            }
            .content {
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 14px;
              color: #6b7280;
              text-align: center;
            }
            .warning {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 12px;
              margin: 20px 0;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">PDF Resumer</div>
              <h1 style="color: #1f2937; margin: 0;">Resetare parolă</h1>
            </div>

            <div class="content">
              <p>Bună!</p>
              <p>Am primit o cerere de resetare a parolei pentru contul tău.</p>
              <p>Folosește codul de mai jos pentru a-ți reseta parola:</p>
            </div>

            <div class="token-box">
              <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">Codul tău de verificare</div>
              <div class="token">${token}</div>
            </div>

            <div class="warning">
              <strong>Important:</strong> Acest cod expiră în 15 minute și poate fi folosit o singură dată.
            </div>

            <div class="content">
              <p>Dacă nu ai solicitat resetarea parolei, te rugăm să ignori acest email. Parola ta va rămâne neschimbată.</p>
            </div>

            <div class="footer">
              <p>Acesta este un email automat, te rugăm să nu răspunzi la el.</p>
              <p>&copy; ${new Date().getFullYear()} PDF Resumer. Toate drepturile rezervate.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Eroare la trimiterea email-ului:', error);
      throw new Error('Nu s-a putut trimite email-ul');
    }

    console.log('Email trimis cu succes:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Excepție la trimiterea email-ului:', error);
    throw error;
  }
}
