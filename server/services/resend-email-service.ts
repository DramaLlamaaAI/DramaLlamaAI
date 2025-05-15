import { Resend } from 'resend';
import { User } from '@shared/schema';

// Drama Llama Logo in base64 format for email avatar
const DRAMA_LLAMA_LOGO_BASE64 = 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4KICA8IS0tIEJhY2tncm91bmQgLS0+CiAgPHJlY3Qgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIGZpbGw9IiMyMkM5QzkiIHN0eWxlPSJkaXNwbGF5Om5vbmU7Ii8+CiAgCiAgPCEtLSBQaW5rIExsYW1hIC0tPgogIDxwYXRoIGQ9Ik0yNTYgOTBjLTQwIDAtNzUgMjAtMTAwIDQ1LTI1IDI1LTQwIDYwLTQwIDk1IDAgMzAgMTUgNTUgMzUgNzAgMjAgMTUgNDUgMjAgNjUgMjAgMTUgMCAzMC01IDQwLTE1IDEwLTEwIDE1LTI1IDE1LTQ1IDAtMTUtNS0zMC0xNS00MC0xMC0xMC0yNS0xNS00MC0xNS0xMCAwLTIwIDUtMjUgMTAtNSA1LTEwIDE1LTEwIDI1IDAgNSAwIDEwIDUgMTUgNSA1IDEwIDUgMTUgNSA1IDAgMTAgMCAxNS01IDUtNSA1LTEwIDUtMTUiIGZpbGw9IiNGRjY5QjQiIC8+CiAgCiAgPCEtLSBFYXJzIC0tPgogIDxwYXRoIGQ9Ik0xNzAgMTMwYy0xMC0xNS0yMC0zNS0xNS01NSA1LTIwIDIwLTM1IDQwLTQwIDIwLTUgNDAgNSA1NSAyMCAxNSAxNSAyMCAzNSAxNSA1NS01IDIwLTIwIDMwLTM1IDM1LTE1IDUtMzAgMC00NS01IiBmaWxsPSIjRkY2OUI0IiAvPgogIDxwYXRoIGQ9Ik0zNDIgMTMwYzEwLTE1IDIwLTM1IDE1LTU1LTUtMjAtMjAtMzUtNDAtNDAtMjAtNS00MCA1LTU1IDIwLTE1IDE1LTIwIDM1LTE1IDU1IDUgMjAgMjAgMzAgMzUgMzUgMTUgNSAzMCAwIDQ1LTUiIGZpbGw9IiNGRjY5QjQiIC8+CiAgCiAgPCEtLSBGYWNlIERldGFpbHMgLS0+CiAgPGVsbGlwc2UgY3g9IjIwNSIgY3k9IjIxMCIgcng9IjEwIiByeT0iMTUiIGZpbGw9IiMwMDAiIC8+CiAgPGVsbGlwc2UgY3g9IjMwNyIgY3k9IjIxMCIgcng9IjEwIiByeT0iMTUiIGZpbGw9IiMwMDAiIC8+CiAgCiAgPCEtLSBOb3NlIC0tPgogIDxwYXRoIGQ9Ik0yNTYgMjM1Yy0xMCAwLTIwIDUtMjUgMTAtNSA1LTEwIDE1LTEwIDI1IDAgMTAgNSAyMCAxNSAyNSAxMCA1IDIwIDUgMzAgMCAxMC01IDE1LTE1IDE1LTI1IDAtMTAtNS0yMC0xMC0yNS01LTUtMTAtMTAtMTUtMTAiIGZpbGw9IiNGRkMwQ0IiIC8+CiAgCiAgPCEtLSBNb3V0aCAtLT4KICA8cGF0aCBkPSJNMjQwIDI3NWM1IDEwIDE1IDE1IDI1IDE1IDEwIDAgMjAtNSAyNS0xNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjUiIC8+CiAgCiAgPCEtLSBTdW5nbGFzc2VzIC0tPgogIDxwYXRoIGQ9Ik0xNzUgMTkwaDE2MGMxMCAwIDIwIDEwIDIwIDIwdjEwYzAgMTAtMTAgMjAtMjAgMjBoLTcwYy01IDAtMTAtNS0xMC0xMCAwLTUgNS0xMCAxMC0xMGgzMGM1IDAgMTAtNSAxMC0xMCAwLTUtNS0xMC0xMC0xMGgtODBjLTUgMC0xMCA1LTEwIDEwIDAgNSA1IDEwIDEwIDEwaDMwYzUgMCAxMCA1IDEwIDEwIDAgNS01IDEwLTEwIDEwaC03MGMtMTAgMC0yMC0xMC0yMC0yMHYtMTBjMC0xMCAxMC0yMCAyMC0yMHoiIGZpbGw9IiMwMDAiIC8+CiAgCiAgPCEtLSBPdXRsaW5lIC0tPgogIDxwYXRoIGQ9Ik0yNTYgOTBjLTQwIDAtNzUgMjAtMTAwIDQ1LTI1IDI1LTQwIDYwLTQwIDk1IDAgMzAgMTUgNTUgMzUgNzAgMjAgMTUgNDUgMjAgNjUgMjAgMTUgMCAzMC01IDQwLTE1IDEwLTEwIDE1LTI1IDE1LTQ1TTE3MCAxMzBjLTEwLTE1LTIwLTM1LTE1LTU1IDUtMjAgMjAtMzUgNDAtNDAgMjAtNSA0MCA1IDU1IDIwIDE1IDE1IDIwIDM1IDE1IDU1LTUgMjAtMjAgMzAtMzUgMzUtMTUgNS0zMCAwLTQ1LTVNMzQyIDEzMGMxMC0xNSAyMC0zNSAxNS01NS01LTIwLTIwLTM1LTQwLTQwLTIwLTUtNDAgNS01NSAyMC0xNSAxNS0yMCAzNS0xNSA1NSA1IDIwIDIwIDMwIDM1IDM1IDE1IDUgMzAgMCA0NS01IiBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMTAiIC8+Cjwvc3ZnPg==';

// Initialize the Resend service if the API key is set
let resendClient: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  console.log('RESEND_API_KEY is set, initializing Resend client');
  resendClient = new Resend(process.env.RESEND_API_KEY);
} else {
  console.log('RESEND_API_KEY is not set, email functionality will be disabled');
}

// Check if email service is available
const isEmailServiceAvailable = (): boolean => {
  return !!resendClient;
};

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Send an email using Resend
export const sendEmail = async (params: EmailParams): Promise<boolean> => {
  if (!isEmailServiceAvailable()) {
    console.log('Resend API key not set, email functionality disabled');
    return false;
  }

  // Add Gmail specific markup for logo display
  const gmailLogoMarkup = `
    <div itemscope itemtype="https://schema.org/EmailMessage">
      <div itemprop="sender" itemscope itemtype="https://schema.org/Person">
        <meta itemprop="name" content="Drama Llama AI" />
        <meta itemprop="image" content="data:image/svg+xml;base64,${DRAMA_LLAMA_LOGO_BASE64}" />
      </div>
    </div>
  `;

  // Combine the Gmail markup with the email content
  const htmlWithLogo = gmailLogoMarkup + (params.html || '');

  try {
    // Send the email with Resend
    const { data, error } = await resendClient!.emails.send({
      from: 'Drama Llama AI <onboarding@resend.dev>', // Resend allows using onboarding@resend.dev for testing
      to: params.to,
      subject: params.subject,
      text: params.text || '',
      html: htmlWithLogo,
    });
    
    if (error) {
      console.error('Failed to send email:', error);
      return false;
    }
    
    console.log('Email sent successfully:', data?.id);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

// Send a password reset email to a user
export const sendPasswordResetEmail = async (user: User, resetCode: string): Promise<boolean> => {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/forgot-password?code=${resetCode}&email=${encodeURIComponent(user.email)}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="data:image/svg+xml;base64,${DRAMA_LLAMA_LOGO_BASE64}" alt="Drama Llama Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #22C9C9;">Drama Llama AI Password Reset</h2>
      <p>Hi ${user.username},</p>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #22C9C9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p>Or enter this verification code when prompted: <strong>${resetCode}</strong></p>
      <p>This code will expire in 24 hours.</p>
      <p>If you didn't request a password reset, please ignore this email.</p>
      <p>Thank you,<br>The Drama Llama AI Team</p>
    </div>
  `;
  
  const textContent = `
    Drama Llama AI Password Reset
    
    Hi ${user.username},
    
    We received a request to reset your password. Please visit the link below to set a new password:
    
    ${resetUrl}
    
    Or enter this verification code when prompted: ${resetCode}
    
    This code will expire in 24 hours.
    
    If you didn't request a password reset, please ignore this email.
    
    Thank you,
    The Drama Llama AI Team
  `;
  
  return sendEmail({
    to: user.email,
    subject: 'Reset Your Drama Llama AI Password',
    text: textContent,
    html: htmlContent,
  });
};

// Send a verification email to a user
export const sendVerificationEmail = async (user: User, verificationCode: string): Promise<boolean> => {
  const verificationUrl = `${process.env.APP_URL || 'http://localhost:5000'}/verify-email?code=${verificationCode}&email=${encodeURIComponent(user.email)}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="data:image/svg+xml;base64,${DRAMA_LLAMA_LOGO_BASE64}" alt="Drama Llama Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #22C9C9;">Welcome to Drama Llama AI!</h2>
      <p>Hi ${user.username},</p>
      <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #22C9C9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Verify Email
        </a>
      </div>
      <p>Or enter this verification code when prompted: <strong>${verificationCode}</strong></p>
      <p>This code will expire in 24 hours.</p>
      <p>If you didn't sign up for Drama Llama AI, please ignore this email.</p>
      <p>Thank you,<br>The Drama Llama AI Team</p>
    </div>
  `;
  
  const textContent = `
    Welcome to Drama Llama AI!
    
    Hi ${user.username},
    
    Thank you for signing up. Please verify your email address by visiting the link below:
    
    ${verificationUrl}
    
    Or enter this verification code when prompted: ${verificationCode}
    
    This code will expire in 24 hours.
    
    If you didn't sign up for Drama Llama AI, please ignore this email.
    
    Thank you,
    The Drama Llama AI Team
  `;
  
  return sendEmail({
    to: user.email,
    subject: 'Verify Your Drama Llama AI Account',
    text: textContent,
    html: htmlContent,
  });
};

// Generate a random verification code
export const generateVerificationCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};