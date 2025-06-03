import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper function to determine if tier change is an upgrade
// Correct hierarchy: Free > Beta > Personal > Pro
function isUpgradeChange(fromTier: string, toTier: string): boolean {
  const tierHierarchy = ['free', 'beta', 'personal', 'pro'];
  const fromIndex = tierHierarchy.indexOf(fromTier.toLowerCase());
  const toIndex = tierHierarchy.indexOf(toTier.toLowerCase());
  return toIndex > fromIndex;
}

export async function sendTierUpgradeEmail(
  userEmail: string,
  username: string,
  fromTier: string,
  toTier: string
) {
  try {
    console.log(`Sending tier change email: ${userEmail} changed from ${fromTier} to ${toTier}`);

    const tierBenefits = getTierBenefits(toTier);
    const isUpgrade = isUpgradeChange(fromTier, toTier);
    const subject = `We've made changes to your account`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Drama Llama - Account Changes</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .benefits { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .benefit-item { padding: 10px 0; border-bottom: 1px solid #eee; }
            .benefit-item:last-child { border-bottom: none; }
            .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
            .promo-code { background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${isUpgrade ? 
                `<h1>🎉 Congratulations ${username}!</h1>
                 <p>You've been upgraded to Drama Llama ${toTier.charAt(0).toUpperCase() + toTier.slice(1)}</p>` :
                `<h1>Account Update for ${username}</h1>
                 <p>Your account has been changed to ${toTier.charAt(0).toUpperCase() + toTier.slice(1)}</p>`
              }
            </div>
            
            <div class="content">
              ${isUpgrade ? 
                `<h2>Your account has been upgraded!</h2>
                 <p>Great news! Your Drama Llama account has been upgraded from <strong>${fromTier}</strong> to <strong>${toTier.charAt(0).toUpperCase() + toTier.slice(1)}</strong>.</p>` :
                `<h2>Account downgrade notification</h2>
                 <p>Sorry to hear you've downgraded your account from <strong>${fromTier}</strong> to <strong>${toTier.charAt(0).toUpperCase() + toTier.slice(1)}</strong>.</p>
                 
                 <div class="promo-code">
                   <h3>Want to upgrade again?</h3>
                   <p>Use promo code <strong>"Upgrade2025"</strong> for 50% off your first month!</p>
                 </div>`
              }
              
              <div class="benefits">
                <h3>Your ${toTier} plan includes:</h3>
                ${tierBenefits.map(benefit => `<div class="benefit-item">✓ ${benefit}</div>`).join('')}
              </div>
              
              <p>These features are now active on your account and ready to use!</p>
              
              <a href="https://77f6210a-876e-4707-b36b-d35568d5f4a1-00-1pmrqgq45ycpw.spock.replit.dev/chat-analysis" class="cta-button">${isUpgrade ? 'Start Using Your New Features' : 'Continue Using Your Features'}</a>
              
              <h3>Need Help?</h3>
              <p>If you have any questions about your features or need assistance, contact our support team at <a href="mailto:support@dramallama.ai">support@dramallama.ai</a>.</p>
              
              <p>Thank you for being part of the Drama Llama community!</p>
              
              <p>Best regards,<br>The Drama Llama Team</p>
            </div>
            
            <div class="footer">
              <p>Drama Llama AI - Intelligent Communication Analysis</p>
              <p>Support: <a href="mailto:support@dramallama.ai">support@dramallama.ai</a></p>
              <p>This email was sent automatically. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
${isUpgrade ? `Congratulations ${username}!` : `Account Update for ${username}`}

${isUpgrade ? 
  `Your Drama Llama account has been upgraded from ${fromTier} to ${toTier.charAt(0).toUpperCase() + toTier.slice(1)}.` :
  `Sorry to hear you've downgraded your account from ${fromTier} to ${toTier.charAt(0).toUpperCase() + toTier.slice(1)}.
  
Want to upgrade again? Use promo code "Upgrade2025" for 50% off your first month!`
}

Your ${toTier} plan includes:
${tierBenefits.map(benefit => `• ${benefit}`).join('\n')}

These features are now active and ready to use!

Visit https://77f6210a-876e-4707-b36b-d35568d5f4a1-00-1pmrqgq45ycpw.spock.replit.dev/chat-analysis to ${isUpgrade ? 'start using your new features' : 'continue using your features'}.

Need help? Contact support at support@dramallama.ai

Thank you for being part of the Drama Llama community!

Best regards,
The Drama Llama Team
    `;

    const result = await resend.emails.send({
      from: 'Drama Llama <onboarding@resend.dev>',
      to: [userEmail],
      subject: subject,
      html: htmlContent,
      text: textContent,
    });

    console.log(`Tier change email sent successfully to ${userEmail}:`, result.data?.id);
    return { success: true, emailId: result.data?.id };

  } catch (error) {
    console.error(`Failed to send tier change email to ${userEmail}:`, error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function getTierBenefits(tier: string): string[] {
  switch (tier.toLowerCase()) {
    case 'free':
      return [
        '2 chat analyses per month',
        'Overall Emotional Tone Summary',
        'Conversation Health Score (0–100 gauge)',
        'Red Flags Detected (Count & Brief Descriptions)',
        'Simple PDF Export'
      ];
    case 'personal':
      return [
        '5 Chat Uploads per Month',
        'Everything in the Free Tier, plus:',
        'Full Emotional Tone Analysis (by participant)',
        'Red Flag Detection with Named Participants & Supporting Quotes',
        'Conversation Health Gauge with Individual Impact',
        'Communication Style Comparison (You vs. Them)',
        'Accountability & Tension Contributions (Named)',
        'Standout Quotes with Behavioral Signals',
        'One-Click PDF Export'
      ];
    case 'beta':
      return [
        'Unlimited chat analysis',
        'Advanced conversation insights',
        'Screenshot text extraction',
        'Priority support',
        'Early access to new features'
      ];
    case 'pro':
      return [
        'Unlimited Chat Uploads',
        'Everything in the Personal Plan, plus:',
        'Behavioral Pattern Detection (repeated avoidance, blame-shifting)',
        'Escalation Markers: When and how tension rises',
        'Power Balance Overview (Simple Participant Meter)',
        'Extended Participant Summary Cards (More Detail, More Clarity)',
        'Enhanced PDF Export (With Timeline and Key Insights)'
      ];
    case 'instant':
      return [
        '1 Chat Upload (Single Use)',
        'Everything in the Free Tier, plus:',
        'Red Flag Count with Key Quotes',
        'Participant Summary Cards (Style & Role in Tension)',
        'Conversation Dynamics Overview',
        'PDF Export'
      ];
    default:
      return [
        'Access to Drama Llama features',
        'Basic conversation analysis'
      ];
  }
}