import { sendEmail } from './services/resend-email-service';

async function testEmailService() {
  console.log('Testing Resend email service...');
  
  const testEmail = 'elskieproduction@gmail.com'; // User's email for testing
  
  const result = await sendEmail({
    to: testEmail,
    subject: 'Drama Llama AI - Email Test',
    text: 'This is a test email from Drama Llama AI application.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #22C9C9;">Drama Llama AI Email Test</h2>
        <p>This is a test email from the Drama Llama AI application.</p>
        <p>If you received this email, the email service is working correctly!</p>
        <p>Thank you,<br>The Drama Llama AI Team</p>
      </div>
    `
  });
  
  if (result) {
    console.log('✅ Email sent successfully!');
  } else {
    console.log('❌ Failed to send email. Check logs for details.');
  }
}

// Run the test function
testEmailService().catch(console.error);