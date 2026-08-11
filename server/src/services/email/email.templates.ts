interface TemplateData {
  firstName: string;
  clientUrl: string;
  appName: string;
}

interface VerificationData extends TemplateData {
  token: string;
}

interface ResetData extends TemplateData {
  token: string;
}

function baseHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="en" style="margin:0;padding:0;background-color:#f4f4f5;">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;background-color:#f4f4f5;color:#18181b;line-height:1.6}
  .wrapper{max-width:560px;margin:40px auto;padding:0 20px}
  .card{background:#fff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
  .logo{font-size:24px;font-weight:700;color:#18181b;margin-bottom:24px}
  .logo span{color:#7c3aed}
  h1{font-size:22px;font-weight:600;margin-bottom:12px}
  p{color:#52525b;margin-bottom:20px;font-size:15px}
  .btn{display:inline-block;padding:12px 32px;border-radius:8px;background-color:#7c3aed;color:#fff !important;text-decoration:none;font-weight:600;font-size:15px;margin:8px 0 24px}
  .btn:hover{background-color:#6d28d9}
  .footer{margin-top:32px;padding-top:24px;border-top:1px solid #e4e4e7;font-size:13px;color:#a1a1aa}
  .footer p{margin-bottom:4px;font-size:13px;color:#a1a1aa}
  .muted{color:#71717a;font-size:14px}
  .link{color:#7c3aed;word-break:break-all}
</style>
</head>
<body>
<div class="wrapper">
<div class="card">
${body}
</div>
</div>
</body>
</html>`;
}

export function verificationEmailHtml(data: VerificationData): string {
  const url = `${data.clientUrl}/verify-email?token=${data.token}`;
  return baseHtml(`
    <div class="logo">NEXPULSE<span> AI</span></div>
    <h1>Verify your email address</h1>
    <p>Hi ${data.firstName},</p>
    <p>Thanks for signing up! Please verify your email address by clicking the button below.</p>
    <a class="btn" href="${url}" target="_blank">Verify Email</a>
    <p class="muted">Or copy and paste this link into your browser:</p>
    <p class="muted"><a class="link" href="${url}">${url}</a></p>
    <div class="footer">
      <p>This link expires in 24 hours.</p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <p>&copy; ${new Date().getFullYear()} ${data.appName}. All rights reserved.</p>
    </div>
  `);
}

export function passwordResetEmailHtml(data: ResetData): string {
  const url = `${data.clientUrl}/reset-password?token=${data.token}`;
  return baseHtml(`
    <div class="logo">NEXPULSE<span> AI</span></div>
    <h1>Reset your password</h1>
    <p>Hi ${data.firstName},</p>
    <p>We received a request to reset your password. Click the button below to create a new password.</p>
    <a class="btn" href="${url}" target="_blank">Reset Password</a>
    <p class="muted">Or copy and paste this link into your browser:</p>
    <p class="muted"><a class="link" href="${url}">${url}</a></p>
    <div class="footer">
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      <p>&copy; ${new Date().getFullYear()} ${data.appName}. All rights reserved.</p>
    </div>
  `);
}

export function welcomeEmailHtml(data: TemplateData): string {
  return baseHtml(`
    <div class="logo">NEXPULSE<span> AI</span></div>
    <h1>Welcome to ${data.appName}!</h1>
    <p>Hi ${data.firstName},</p>
    <p>Your account has been created successfully. You're now ready to start managing your social media presence with AI-powered insights.</p>
    <p>Here's what you can do:</p>
    <p style="margin-left:16px">
      &bull; Generate content with AI<br>
      &bull; Analyze audience engagement<br>
      &bull; Track competitor performance<br>
      &bull; Schedule and plan campaigns
    </p>
    <a class="btn" href="${data.clientUrl}" target="_blank">Go to Dashboard</a>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${data.appName}. All rights reserved.</p>
    </div>
  `);
}

export function verificationEmailText(data: VerificationData): string {
  const url = `${data.clientUrl}/verify-email?token=${data.token}`;
  return `Verify your email address\n\nHi ${data.firstName},\n\nThanks for signing up! Please verify your email address by visiting:\n${url}\n\nThis link expires in 24 hours.\nIf you didn't create an account, you can safely ignore this email.`;
}

export function passwordResetEmailText(data: ResetData): string {
  const url = `${data.clientUrl}/reset-password?token=${data.token}`;
  return `Reset your password\n\nHi ${data.firstName},\n\nWe received a request to reset your password. Visit the link below to create a new password:\n${url}\n\nThis link expires in 1 hour.\nIf you didn't request a password reset, you can safely ignore this email.`;
}

export function welcomeEmailText(data: TemplateData): string {
  return `Welcome to ${data.appName}!\n\nHi ${data.firstName},\n\nYour account has been created successfully. You're now ready to start managing your social media presence with AI-powered insights.\n\nVisit ${data.clientUrl} to get started.\n\n- The ${data.appName} Team`;
}
