import { sendEmail } from './resend-email-service';

interface ChatNotificationData {
  userName: string;
  userEmail?: string;
  message: string;
  timestamp: Date;
}

export async function sendChatNotification(data: ChatNotificationData) {
  try {
    const subject = `New Live Chat Message from ${data.userName}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ec4899;">New Live Chat Message</h2>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>From:</strong> ${data.userName}</p>
          ${data.userEmail ? `<p><strong>Email:</strong> ${data.userEmail}</p>` : ''}
          <p><strong>Time:</strong> ${data.timestamp.toLocaleString()}</p>
          <p><strong>Message:</strong></p>
          <div style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #ec4899;">
            ${data.message}
          </div>
        </div>
        
        <p>Log into your admin dashboard to respond: <a href="https://dramallama.ai/admin">Admin Dashboard</a></p>
      </div>
    `;

    await sendEmail({
      to: 'dramallamaconsultancy@gmail.com',
      subject,
      html: htmlContent
    });

    console.log(`Chat notification sent for message from ${data.userName}`);
  } catch (error) {
    console.error('Failed to send chat notification:', error);
  }
}