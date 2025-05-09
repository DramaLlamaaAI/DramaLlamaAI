import { MailService } from '@sendgrid/mail';
import { User } from '@shared/schema';

// Initialize the mail service if the API key is set
const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

// Check if email service is available
const isEmailServiceAvailable = (): boolean => {
  return !!process.env.SENDGRID_API_KEY;
};

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Send an email using SendGrid
export const sendEmail = async (params: EmailParams): Promise<boolean> => {
  if (!isEmailServiceAvailable()) {
    console.log('SendGrid API key not set, email functionality disabled');
    return false;
  }

  try {
    await mailService.send({
      to: params.to,
      from: 'noreply@dramallama.ai', // Update this with your validated sender
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

// Send a verification email to a user
export const sendVerificationEmail = async (user: User, verificationCode: string): Promise<boolean> => {
  const verificationUrl = `${process.env.APP_URL || 'http://localhost:5000'}/verify-email?code=${verificationCode}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #22C9C9;">Welcome to Drama Llama!</h2>
      <p>Hi ${user.username},</p>
      <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #22C9C9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Verify Email
        </a>
      </div>
      <p>Or enter this verification code when prompted: <strong>${verificationCode}</strong></p>
      <p>This code will expire in 24 hours.</p>
      <p>If you didn't sign up for Drama Llama, please ignore this email.</p>
      <p>Thank you,<br>The Drama Llama Team</p>
    </div>
  `;
  
  const textContent = `
    Welcome to Drama Llama!
    
    Hi ${user.username},
    
    Thank you for signing up. Please verify your email address by visiting the link below:
    
    ${verificationUrl}
    
    Or enter this verification code when prompted: ${verificationCode}
    
    This code will expire in 24 hours.
    
    If you didn't sign up for Drama Llama, please ignore this email.
    
    Thank you,
    The Drama Llama Team
  `;
  
  return sendEmail({
    to: user.email,
    subject: 'Verify Your Drama Llama Account',
    text: textContent,
    html: htmlContent,
  });
};

// Generate a random verification code
export const generateVerificationCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};