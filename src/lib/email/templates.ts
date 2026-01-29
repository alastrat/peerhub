import { sendEmail } from "./resend";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Kultiva";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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

export async function sendInvitationEmail(params: {
  to: string;
  inviterName: string;
  companyName: string;
  inviteUrl: string;
}) {
  const html = baseTemplate(`
    <h1>You're invited to join ${params.companyName}</h1>
    <p>${params.inviterName} has invited you to join ${params.companyName} on ${APP_NAME}, our 360° performance feedback platform.</p>
    <a href="${params.inviteUrl}" class="button">Accept Invitation</a>
    <p class="secondary-text">This invitation will expire in 7 days.</p>
  `);

  return sendEmail({
    to: params.to,
    subject: `You're invited to join ${params.companyName} on ${APP_NAME}`,
    html,
    text: `${params.inviterName} has invited you to join ${params.companyName} on ${APP_NAME}. Accept your invitation: ${params.inviteUrl}`,
  });
}

export async function sendReviewRequestEmail(params: {
  to: string;
  reviewerName: string;
  revieweeName: string;
  cycleName: string;
  dueDate: string;
  reviewUrl: string;
}) {
  const html = baseTemplate(`
    <h1>Feedback Request: ${params.revieweeName}</h1>
    <p>Hi ${params.reviewerName},</p>
    <p>You've been asked to provide feedback for <strong>${params.revieweeName}</strong> as part of the "${params.cycleName}" review cycle.</p>
    <div class="highlight">
      <p style="margin: 0;"><strong>Due date:</strong> ${params.dueDate}</p>
    </div>
    <a href="${params.reviewUrl}" class="button">Start Review</a>
    <p class="secondary-text">Your feedback is valuable and will help ${params.revieweeName} grow professionally. Please be thoughtful and constructive in your responses.</p>
  `);

  return sendEmail({
    to: params.to,
    subject: `Feedback requested for ${params.revieweeName}`,
    html,
    text: `You've been asked to provide feedback for ${params.revieweeName}. Due: ${params.dueDate}. Start your review: ${params.reviewUrl}`,
  });
}

export async function sendExternalReviewRequestEmail(params: {
  to: string;
  reviewerName: string;
  revieweeName: string;
  companyName: string;
  cycleName: string;
  dueDate: string;
  reviewUrl: string;
}) {
  const html = baseTemplate(`
    <h1>Feedback Request from ${params.companyName}</h1>
    <p>Hi ${params.reviewerName},</p>
    <p>${params.companyName} has requested your feedback for <strong>${params.revieweeName}</strong> as part of their "${params.cycleName}" review cycle.</p>
    <div class="highlight">
      <p style="margin: 0;"><strong>Due date:</strong> ${params.dueDate}</p>
    </div>
    <a href="${params.reviewUrl}" class="button">Provide Feedback</a>
    <p class="secondary-text">No account is required. Simply click the button above to share your feedback. This link is unique to you and will expire after use.</p>
  `);

  return sendEmail({
    to: params.to,
    subject: `${params.companyName} requests your feedback for ${params.revieweeName}`,
    html,
    text: `${params.companyName} has requested your feedback for ${params.revieweeName}. Due: ${params.dueDate}. Provide feedback: ${params.reviewUrl}`,
  });
}

export async function sendReminderEmail(params: {
  to: string;
  reviewerName: string;
  pendingCount: number;
  dueDate: string;
  dashboardUrl: string;
}) {
  const html = baseTemplate(`
    <h1>Reminder: ${params.pendingCount} Pending Review${params.pendingCount > 1 ? "s" : ""}</h1>
    <p>Hi ${params.reviewerName},</p>
    <p>This is a friendly reminder that you have <strong>${params.pendingCount} pending review${params.pendingCount > 1 ? "s" : ""}</strong> awaiting your feedback.</p>
    <div class="highlight">
      <p style="margin: 0;"><strong>Due date:</strong> ${params.dueDate}</p>
    </div>
    <a href="${params.dashboardUrl}" class="button">View Pending Reviews</a>
    <p class="secondary-text">Your feedback helps your colleagues grow. Please complete your reviews before the deadline.</p>
  `);

  return sendEmail({
    to: params.to,
    subject: `Reminder: ${params.pendingCount} pending review${params.pendingCount > 1 ? "s" : ""}`,
    html,
    text: `You have ${params.pendingCount} pending reviews due by ${params.dueDate}. Complete them here: ${params.dashboardUrl}`,
  });
}

export async function sendReportReleasedEmail(params: {
  to: string;
  employeeName: string;
  cycleName: string;
  reportUrl: string;
}) {
  const html = baseTemplate(`
    <h1>Your Feedback Report is Ready</h1>
    <p>Hi ${params.employeeName},</p>
    <p>Great news! Your feedback report for the "${params.cycleName}" review cycle is now available.</p>
    <a href="${params.reportUrl}" class="button">View Your Report</a>
    <p class="secondary-text">This report contains aggregated feedback from your reviewers. Take time to reflect on the insights and consider discussing them with your manager.</p>
  `);

  return sendEmail({
    to: params.to,
    subject: `Your feedback report for "${params.cycleName}" is ready`,
    html,
    text: `Your feedback report for "${params.cycleName}" is now available. View it here: ${params.reportUrl}`,
  });
}

export async function sendNominationRequestEmail(params: {
  to: string;
  employeeName: string;
  cycleName: string;
  minPeers: number;
  maxPeers: number;
  dueDate: string;
  nominationUrl: string;
}) {
  const html = baseTemplate(`
    <h1>Nominate Your Peer Reviewers</h1>
    <p>Hi ${params.employeeName},</p>
    <p>It's time to nominate colleagues to provide feedback for you as part of the "${params.cycleName}" review cycle.</p>
    <div class="highlight">
      <p style="margin: 0 0 8px 0;"><strong>Required:</strong> ${params.minPeers}-${params.maxPeers} peer reviewers</p>
      <p style="margin: 0;"><strong>Due date:</strong> ${params.dueDate}</p>
    </div>
    <a href="${params.nominationUrl}" class="button">Nominate Reviewers</a>
    <p class="secondary-text">Choose colleagues who work closely with you and can provide valuable feedback on your performance.</p>
  `);

  return sendEmail({
    to: params.to,
    subject: `Nominate your peer reviewers for "${params.cycleName}"`,
    html,
    text: `Nominate ${params.minPeers}-${params.maxPeers} peer reviewers for "${params.cycleName}" by ${params.dueDate}. Nominate here: ${params.nominationUrl}`,
  });
}
