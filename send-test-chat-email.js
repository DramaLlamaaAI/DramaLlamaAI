/**
 * Send test email for live chat feature announcement
 */
import { Resend } from 'resend';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check for Resend API key
if (!process.env.RESEND_API_KEY) {
  console.error('RESEND_API_KEY environment variable not set');
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestChatEmail() {
  const subject = '🎉 New Feature: Live Chat Support Now Available!';
  
  const textContent = `
Hi there!

We're excited to announce that Drama Llama now has live chat support!

You can now get instant help with:
• Technical questions about using the app
• How-to guidance for analyzing your conversations
• Quick answers to your questions
• Feature requests and feedback

How to access live chat:
Look for the chat bubble icon in the bottom-right corner of any page on Drama Llama. Click it to start a conversation with our support team.

We're here to help you get the most out of Drama Llama's conversation analysis features.

Best regards,
The Drama Llama Team
support@dramallama.ai
`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Chat Support Now Available</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .feature-list { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .feature-list ul { margin: 0; padding-left: 20px; }
        .feature-list li { margin: 8px 0; }
        .cta-section { background: #e3f2fd; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #666; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .highlight { color: #1976d2; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">
            <img src="data:image/png;base64,$(cat logo-base64-complete.txt)" alt="Drama LLama AI" style="width: 60px; height: 60px; border-radius: 8px; margin-bottom: 10px;" />
            <br>Drama LLama AI
        </div>
        <h1 style="margin: 0; font-size: 28px;">Live Chat Support is Here!</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Get instant help whenever you need it</p>
    </div>
    
    <div class="content">
        <p>Hi there!</p>
        
        <p>We're excited to announce that <strong>Drama LLama AI now has live chat support!</strong></p>
        
        <div class="feature-list">
            <h3 style="margin-top: 0; color: #1976d2;">You can now get instant help with:</h3>
            <ul>
                <li><strong>Technical questions</strong> about using the app</li>
                <li><strong>How-to guidance</strong> for analyzing your conversations</li>
                <li><strong>Quick answers</strong> to your questions</li>
                <li><strong>Feature requests</strong> and feedback</li>
            </ul>
        </div>
        
        <div class="cta-section">
            <h3 style="margin-top: 0; color: #1976d2;">How to access live chat:</h3>
            <p>Visit <a href="https://www.dramallama.ai" style="color: #1976d2; text-decoration: none; font-weight: bold;">www.DramaLlama.ai</a> and look for the <span class="highlight">chat bubble icon</span> in the bottom-left corner of any page. Click it to start a conversation with our support team.</p>
        </div>
        
        <div style="background: #e8f5e8; border: 2px solid #4caf50; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <h4 style="margin-top: 0; color: #2e7d32;">🎉 Special Notice</h4>
            <p style="margin-bottom: 0; color: #2e7d32;"><strong>Don't forget: Your account has been upgraded to our limited time access 'Beta Tier' for FREE deeper insights!</strong> Take advantage of enhanced analysis features while this special access lasts.</p>
        </div>
        
        <p>We're here to help you get the most out of Drama LLama AI's conversation analysis features.</p>
        
        <p>Best regards,<br>
        <strong>The Drama LLama AI Team</strong></p>
    </div>
    
    <div class="footer">
        <p>Drama LLama AI - AI-Powered Conversation Analysis</p>
        <p>Questions? Reply to this email or use our new live chat feature!</p>
        <p style="margin-top: 15px; font-size: 12px; color: #999;">
            You received this email because you have an account with Drama LLama AI.<br>
            If you no longer wish to receive updates, please contact support@dramallama.ai
        </p>
    </div>
</body>
</html>
`;

  // Read the logo file
  const logoPath = join(__dirname, 'attached_assets', 'FB Profile Pic.png');
  const logoBuffer = readFileSync(logoPath);

  const emailData = {
    from: 'support@dramallama.ai',
    to: 'support@dramallama.ai',
    subject: subject,
    text: textContent,
    html: htmlContent,
    attachments: [
      {
        filename: 'drama-llama-logo.png',
        content: logoBuffer,
        cid: 'logo'
      }
    ]
  };

  try {
    console.log('Sending test email to support@dramallama.ai...');
    const result = await resend.emails.send(emailData);
    console.log('✅ Test email sent successfully to support@dramallama.ai');
    console.log('Email ID:', result.data?.id);
    console.log('Subject:', subject);
    console.log('\nYou can now review the email content and formatting.');
    console.log('If it looks good, you can proceed to send it to all users.');
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    
    if (error.message.includes('API key')) {
      console.error('\n🔑 Authentication error: Please check your RESEND_API_KEY');
    } else if (error.message.includes('forbidden')) {
      console.error('\n🚫 Forbidden: Check your Resend account permissions');
    }
  }
}

sendTestChatEmail();