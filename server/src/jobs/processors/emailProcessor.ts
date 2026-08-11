import type { Job } from 'bullmq';
import { emailService } from '../../services/email/email.service.js';

export interface EmailJobData {
  kind: 'verification' | 'password-reset';
  firstName: string;
  email: string;
  token: string;
}

/**
 * Throws on send failure so BullMQ retries with backoff — a transient SMTP outage no
 * longer means the user simply never gets their verification/reset email.
 */
export async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { kind, firstName, email, token } = job.data;
  const sent = kind === 'verification'
    ? await emailService.sendVerificationEmail(firstName, email, token)
    : await emailService.sendPasswordResetEmail(firstName, email, token);
  if (!sent) throw new Error(`Failed to send ${kind} email to ${email}`);
}
