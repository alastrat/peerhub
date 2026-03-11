import { sendEmail } from "./resend";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Kultiva";

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #171717;
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
      background-color: #fafafa;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #0066FF;
      margin-bottom: 32px;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 16px 0;
      color: #171717;
    }
    p {
      margin: 0 0 16px 0;
      color: #525252;
    }
    .button {
      display: inline-block;
      background: #0066FF;
      color: white !important;
      padding: 14px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      margin: 16px 0;
    }
    .button:hover {
      background: #0052CC;
    }
    .secondary-text {
      font-size: 14px;
      color: #737373;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e5e5;
      font-size: 14px;
      color: #737373;
    }
    .highlight {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">${APP_NAME}</div>
    ${content}
    <div class="footer">
      <p>This email was sent by ${APP_NAME}. If you have questions, please contact your HR administrator.</p>
    </div>
  </div>
</body>
</html>
`;
}

export async function sendPortalMagicLinkEmail(
  to: string,
  name: string,
  magicLinkUrl: string
): Promise<void> {
  const html = baseTemplate(`
    <h1>Access Your Portal</h1>
    <p>Hi ${name},</p>
    <p>You requested access to your ${APP_NAME} employee portal. Click the button below to sign in.</p>
    <a href="${magicLinkUrl}" class="button">Sign In to Portal</a>
    <p class="secondary-text">This link will expire in 24 hours. If you didn't request this, you can safely ignore this email.</p>
  `);

  await sendEmail({
    to,
    subject: `Access your ${APP_NAME} portal`,
    html,
    text: `Hi ${name}, you requested access to your ${APP_NAME} employee portal. Sign in here: ${magicLinkUrl} — This link will expire in 24 hours.`,
  });
}
