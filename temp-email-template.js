/**
 * Send test email for live chat feature announcement with embedded logo
 */

const { Resend } = require('resend');
const fs = require('fs');

async function sendTestChatEmail() {
  try {
    // Read the base64 encoded logo
    const logoBase64 = fs.readFileSync('logo-base64-complete.txt', 'utf8').trim();
    
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY environment variable is required');
      process.exit(1);
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Chat Support is Here!</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .header {
            text-align: center;
            padding: 40px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .logo {
            font-size: 18px;
            font-weight: 600;
            color: white;
            margin-bottom: 20px;
        }
        
        .content {
            background: white;
            color: #333;
            padding: 40px;
            margin: 0 20px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        
        .feature-list {
            background: #f8fafc;
            padding: 24px;
            border-radius: 8px;
            margin: 24px 0;
        }
        
        .feature-item {
            display: flex;
            align-items: center;
            margin: 12px 0;
            color: #374151;
        }
        
        .check-icon {
            color: #10b981;
            margin-right: 12px;
            font-weight: bold;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 24px 0;
            text-align: center;
            min-width: 200px;
        }
        
        .footer {
            text-align: center;
            padding: 30px 20px;
            color: rgba(255,255,255,0.8);
            font-size: 14px;
        }
        
        .beta-notice {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 8px;
            margin: 20px;
            text-align: center;
            border: 1px solid rgba(255,255,255,0.2);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <img src="data:image/png;base64,${logoBase64}" alt="Drama LLama AI" style="width: 60px; height: 60px; border-radius: 8px; margin-bottom: 10px;" />
                <br>Drama LLama AI
            </div>
            <h1 style="margin: 0; font-size: 28px;">Live Chat Support is Here!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Get instant help whenever you need it</p>
        </div>
        
        <div class="content">
            <h2 style="color: #1f2937; margin-top: 0;">We're excited to announce our new live chat feature!</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
                You can now get instant support directly through our website. Our live chat widget appears in the bottom-left corner of every page, ready to help you with any questions or issues.
            </p>
            
            <div class="feature-list">
                <h3 style="margin-top: 0; color: #1f2937;">What you get with live chat:</h3>
                <div class="feature-item">
                    <span class="check-icon">✓</span>
                    Instant responses to your questions
                </div>
                <div class="feature-item">
                    <span class="check-icon">✓</span>
                    Technical support for upload issues
                </div>
                <div class="feature-item">
                    <span class="check-icon">✓</span>
                    Help understanding your analysis results
                </div>
                <div class="feature-item">
                    <span class="check-icon">✓</span>
                    Guidance on subscription upgrades
                </div>
            </div>
            
            <div style="text-align: center;">
                <a href="https://www.DramaLlama.ai" class="cta-button">
                    Try Live Chat Now
                </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
                Look for the chat bubble in the bottom-left corner of any page on our website. Click it to start a conversation with our support team!
            </p>
        </div>
        
        <div class="beta-notice">
            <h3 style="margin-top: 0;">🎉 Beta Tier Users - Enhanced Features Coming!</h3>
            <p style="margin-bottom: 0; opacity: 0.9;">
                As a valued member, you'll soon get access to enhanced features at no extra cost. Stay tuned for updates!
            </p>
        </div>
        
        <div class="footer">
            <p>
                <strong>Drama LLama AI</strong><br>
                They gaslight, we spotlight.<br>
                <a href="https://www.DramaLlama.ai" style="color: rgba(255,255,255,0.8);">www.DramaLlama.ai</a>
            </p>
        </div>
    </div>
</body>
</html>
`;

    const result = await resend.emails.send({
      from: 'Drama LLama AI <support@dramallama.ai>',
      to: ['support@dramallama.ai'],
      subject: '🎉 Live Chat Support is Now Available!',
      html: htmlContent,
    });

    console.log('Test email sent successfully!');
    console.log('Message ID:', result.data?.id);
    console.log('Email details:', {
      to: 'support@dramallama.ai',
      subject: '🎉 Live Chat Support is Now Available!',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to send test email:', error);
    process.exit(1);
  }
}

// Run the script
sendTestChatEmail();