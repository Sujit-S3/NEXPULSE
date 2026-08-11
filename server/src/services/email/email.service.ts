import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config } from '../../config/env.js';
import { logger } from '../../logger/index.js';
import {
  verificationEmailHtml,
  passwordResetEmailHtml,
  welcomeEmailHtml,
  verificationEmailText,
  passwordResetEmailText,
  welcomeEmailText,
} from './email.templates.js';

let transporter: Transporter | null = null;
let smtpConfigured = false;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const { host, port, user, password } = config.email;

  if (!host || !user || !password) {
    if (!smtpConfigured) {
      logger.warn('SMTP not configured — email sending is disabled. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD to enable.');
      smtpConfigured = true;
    }
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  });

  return transporter;
}

const fromAddress = config.email.from || `noreply@${new URL(config.app.clientUrl).hostname || 'nexpulse.ai'}`;

interface SendOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

function emailConfigured(): boolean {
  return Boolean(config.features.email && config.email.host && config.email.user && config.email.password);
}

async function sendMail(options: SendOptions): Promise<boolean> {
  const transport = getTransporter();
  if (!transport || !config.features.email) return false;

  try {
    await transport.sendMail({
      from: `"${config.app.name}" <${fromAddress}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return true;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Failed to send email', { error: err.message, to: options.to, subject: options.subject });
    return false;
  }
}

export const emailService = {
  isConfigured: emailConfigured,

  async sendVerificationEmail(firstName: string, email: string, token: string): Promise<boolean> {
    const data = { firstName, token, clientUrl: config.app.clientUrl, appName: config.app.name };
    return sendMail({
      to: email,
      subject: `Verify your email address — ${config.app.name}`,
      html: verificationEmailHtml(data),
      text: verificationEmailText(data),
    });
  },

  async sendPasswordResetEmail(firstName: string, email: string, token: string): Promise<boolean> {
    const data = { firstName, token, clientUrl: config.app.clientUrl, appName: config.app.name };
    return sendMail({
      to: email,
      subject: `Reset your password — ${config.app.name}`,
      html: passwordResetEmailHtml(data),
      text: passwordResetEmailText(data),
    });
  },

  async sendWelcomeEmail(firstName: string, email: string): Promise<boolean> {
    const data = { firstName, clientUrl: config.app.clientUrl, appName: config.app.name };
    return sendMail({
      to: email,
      subject: `Welcome to ${config.app.name}!`,
      html: welcomeEmailHtml(data),
      text: welcomeEmailText(data),
    });
  },

  async sendMfaCode(firstName: string, email: string, code: string): Promise<boolean> {
    return sendMail({
      to: email,
      subject: `Your ${config.app.name} verification code`,
      html: `<p>Hi ${firstName},</p><p>Your verification code is <strong>${code}</strong>.</p><p>It expires in 5 minutes. Do not share it.</p>`,
      text: `Hi ${firstName}, your ${config.app.name} verification code is ${code}. It expires in 5 minutes.`,
    });
  },

  async sendInvitationEmail(firstName: string, email: string, workspaceName: string, token: string): Promise<boolean> {
    const url = `${config.app.clientUrl}/login?invitation=${encodeURIComponent(token)}`;
    return sendMail({
      to: email,
      subject: `Invitation to ${workspaceName}`,
      html: `<p>Hi ${firstName},</p><p>You were invited to ${workspaceName}.</p><p><a href="${url}">Sign in to accept</a></p><p>This invitation expires in 7 days.</p>`,
      text: `You were invited to ${workspaceName}. Sign in and accept at ${url}. This invitation expires in 7 days.`,
    });
  },
};
