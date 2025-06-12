/**
 * Send live chat announcement to all verified users
 */

import { Resend } from 'resend';
import fs from 'fs';
import { createClient } from '@neondatabase/serverless';

async function sendBulkAnnouncement() {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY environment variable is required');
      process.exit(1);
    }

    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is required');
      process.exit(1);
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const sql = createClient({ connectionString: process.env.DATABASE_URL });

    // Get all verified users
    const result = await sql`
      SELECT email FROM users 
      WHERE email IS NOT NULL 
      AND email_verified = true
    `;

    const users = result.rows;
    
    if (users.length === 0) {
      console.log('No verified users found');
      return;
    }

    console.log(`Found ${users.length} verified users`);

    // Read the base64 encoded logo
    const logoBase64 = fs.readFileSync('logo-base64-complete.txt', 'utf8').trim();

    const subject = '🎉 Live Chat Support is Now Available!';

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
            background: #f8fafc;
            color: #1f2937;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 40px 20px;
        }
        
        .content {
            padding: 40px;
        }
        
        .benefit {
            display: flex;
            align-items: flex-start;
            margin: 20px 0;
            padding: 15px;
            background: #f8fafc;
            border-left: 4px solid #667eea;
            border-radius: 6px;
        }
        
        .benefit-icon {
            font-size: 20px;
            margin-right: 15px;
            background: #667eea;
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
        }
        
        .footer {
            background: #f8fafc;
            text-align: center;
            padding: 30px 20px;
            color: #6b7280;
            font-size: 14px;
            border-top: 1px solid #e5e7eb;
        }
        
        .special-notice {
            background: #e8f5e8;
            border: 2px solid #4caf50;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="margin-bottom: 15px;">
                <img src="data:image/png;base64,${logoBase64}" alt="Drama LLama AI" style="width: 60px; height: 60px; border-radius: 8px; margin-bottom: 10px;" />
                <br><span style="font-size: 24px; font-weight: bold;">Drama LLama AI</span>
            </div>
            <h1 style="margin: 0; font-size: 28px;">Live Chat Support is Here!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Get instant help whenever you need it</p>
        </div>
        
        <div class="content">
            <div style="background: #667eea; color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; text-align: center;">
                <h3 style="margin-top: 0;">💬 Introducing Live Chat Support</h3>
                <p style="margin-bottom: 0;">We're excited to announce that you can now chat directly with our support team! No more waiting for email responses - get instant help when you need it most.</p>
            </div>
            
            <h3>✨ What you can use live chat for:</h3>
            <div class="benefits">
                <div class="benefit">
                    <div class="benefit-icon">?</div>
                    <div>
                        <strong>Technical Support</strong><br>
                        Having trouble with chat analysis or features? We're here to help!
                    </div>
                </div>
                <div class="benefit">
                    <div class="benefit-icon">💡</div>
                    <div>
                        <strong>How-to Questions</strong><br>
                        Need guidance on uploading files or understanding your results?
                    </div>
                </div>
                <div class="benefit">
                    <div class="benefit-icon">⚡</div>
                    <div>
                        <strong>Quick Answers</strong><br>
                        Get instant responses about subscriptions, features, and account issues
                    </div>
                </div>
            </div>
            
            <h3>🎯 How to start chatting:</h3>
            <p>Visit <a href="https://www.DramaLlama.ai" style="color: #667eea;">www.DramaLlama.ai</a> and look for the chat bubble in the <strong>bottom-left corner</strong> of any page. Click it to start a conversation with our support team instantly!</p>
            
            <div style="text-align: center;">
                <a href="https://www.DramaLlama.ai" class="cta-button">
                    Try Live Chat Now
                </a>
            </div>
            
            <div class="special-notice">
                <h4 style="margin-top: 0; color: #2e7d32;">🎉 Special Notice</h4>
                <p style="margin-bottom: 0; color: #2e7d32;"><strong>Limited Time: ALL users now have FREE Beta Tier access with enhanced features!</strong> Take advantage of deeper analysis capabilities while this special offer lasts.</p>
            </div>
            
            <p style="margin-top: 30px;">Our team is available during business hours to help make your Drama LLama experience even better. We're committed to providing you with the support you deserve!</p>
            
            <p style="font-size: 12px; margin-top: 15px;">
                This email was sent to inform you about our new live chat feature. 
                If you have any questions, feel free to use our new live chat support!
            </p>
        </div>
        
        <div class="footer">
            <p>
                <strong>Drama LLama AI</strong><br>
                They gaslight, we spotlight.<br>
                <a href="https://www.DramaLlama.ai" style="color: #6b7280;">www.DramaLlama.ai</a>
            </p>
        </div>
    </div>
</body>
</html>`;

    const textContent = `
Hi there!

We're excited to announce that Drama LLama AI now has live chat support!

You can now get instant help with:
• Technical questions about using the app
• How-to guidance for analyzing your conversations
• Quick answers to your questions
• Feature requests and feedback

How to access live chat:
Visit www.DramaLlama.ai and look for the chat bubble icon in the bottom-left corner of any page. Click it to start a conversation with our support team.

🎉 SPECIAL NOTICE: Limited Time - ALL users now have FREE Beta Tier access with enhanced features! Take advantage of deeper analysis capabilities while this special offer lasts.

We're here to help you get the most out of Drama LLama AI's conversation analysis features.

Best regards,
The Drama LLama AI Team
support@dramallama.ai
`;

    // Send emails in batches to avoid overwhelming the API
    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < users.length; i += batchSize) {
      batches.push(users.slice(i, i + batchSize));
    }

    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Sending batch ${i + 1} of ${batches.length} (${batch.length} emails)...`);

      const emailPromises = batch.map(user => {
        return resend.emails.send({
          from: 'Drama LLama AI <support@dramallama.ai>',
          to: user.email,
          subject: subject,
          text: textContent,
          html: htmlContent
        });
      });

      const results = await Promise.allSettled(emailPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          totalSent++;
          console.log(`✓ Email sent to ${batch[index].email}`);
        } else {
          totalFailed++;
          console.error(`✗ Failed to send to ${batch[index].email}:`, result.reason);
        }
      });

      // Add delay between batches to respect rate limits
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n=== Email Send Complete ===');
    console.log(`Total users: ${users.length}`);
    console.log(`Successfully sent: ${totalSent}`);
    console.log(`Failed: ${totalFailed}`);
    console.log('Subject:', subject);
    console.log('Timestamp:', new Date().toISOString());

  } catch (error) {
    console.error('Failed to send bulk announcement:', error);
    process.exit(1);
  }
}

// Run the script
sendBulkAnnouncement();