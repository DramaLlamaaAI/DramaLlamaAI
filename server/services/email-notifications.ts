import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTierUpgradeEmail(
  userEmail: string,
  username: string,
  fromTier: string,
  toTier: string
) {
  try {
    console.log(`Sending tier upgrade email: ${userEmail} upgraded from ${fromTier} to ${toTier}`);

    const tierBenefits = getTierBenefits(toTier);
    const subject = `Welcome to Drama Llama ${toTier.charAt(0).toUpperCase() + toTier.slice(1)}!`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Drama Llama - Tier Upgrade</title>
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
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Congratulations ${username}!</h1>
              <p>You've been upgraded to Drama Llama ${toTier.charAt(0).toUpperCase() + toTier.slice(1)}</p>
            </div>
            
            <div class="content">
              <h2>Your account has been upgraded!</h2>
              <p>Great news! Your Drama Llama account has been upgraded from <strong>${fromTier}</strong> to <strong>${toTier.charAt(0).toUpperCase() + toTier.slice(1)}</strong>.</p>
              
              <div class="benefits">
                <h3>Your new ${toTier} benefits include:</h3>
                ${tierBenefits.map(benefit => `<div class="benefit-item">✓ ${benefit}</div>`).join('')}
              </div>
              
              <p>These features are now active on your account and ready to use!</p>
              
              <a href="https://drama-llama.replit.app/chat-analysis" class="cta-button">Start Using Your New Features</a>
              
              <h3>Need Help?</h3>
              <p>If you have any questions about your new features or need assistance, don't hesitate to reach out to our support team.</p>
              
              <p>Thank you for being part of the Drama Llama community!</p>
              
              <p>Best regards,<br>The Drama Llama Team</p>
            </div>
            
            <div class="footer">
              <p>Drama Llama AI - Intelligent Communication Analysis</p>
              <p>This email was sent automatically. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Congratulations ${username}!

Your Drama Llama account has been upgraded from ${fromTier} to ${toTier.charAt(0).toUpperCase() + toTier.slice(1)}.

Your new ${toTier} benefits include:
${tierBenefits.map(benefit => `• ${benefit}`).join('\n')}

These features are now active and ready to use!

Visit https://drama-llama.replit.app/chat-analysis to start using your new features.

Thank you for being part of the Drama Llama community!

Best regards,
The Drama Llama Team
    `;

    const result = await resend.emails.send({
      from: 'Drama Llama <noreply@dramallama.ai>',
      to: [userEmail],
      subject: subject,
      html: htmlContent,
      text: textContent,
    });

    console.log(`Tier upgrade email sent successfully to ${userEmail}:`, result.data?.id);
    return { success: true, emailId: result.data?.id };

  } catch (error) {
    console.error(`Failed to send tier upgrade email to ${userEmail}:`, error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function getTierBenefits(tier: string): string[] {
  switch (tier.toLowerCase()) {
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
        'Everything in Beta',
        'Bulk conversation processing',
        'Advanced analytics dashboard',
        'Custom analysis parameters',
        'API access for integrations',
        'White-label options'
      ];
    case 'enterprise':
      return [
        'Everything in Pro',
        'Dedicated account manager',
        'Custom integrations',
        'Advanced security features',
        'SLA guarantees',
        'Custom training and onboarding'
      ];
    default:
      return [
        'Access to Drama Llama features',
        'Basic conversation analysis',
        'Community support'
      ];
  }
}