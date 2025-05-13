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
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4KICA8IS0tIEJhY2tncm91bmQgLS0+CiAgPHJlY3Qgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIGZpbGw9IiMyMkM5QzkiIHN0eWxlPSJkaXNwbGF5Om5vbmU7Ii8+CiAgCiAgPCEtLSBQaW5rIExsYW1hIC0tPgogIDxwYXRoIGQ9Ik0yNTYgOTBjLTQwIDAtNzUgMjAtMTAwIDQ1LTI1IDI1LTQwIDYwLTQwIDk1IDAgMzAgMTUgNTUgMzUgNzAgMjAgMTUgNDUgMjAgNjUgMjAgMTUgMCAzMC01IDQwLTE1IDEwLTEwIDE1LTI1IDE1LTQ1IDAtMTUtNS0zMC0xNS00MC0xMC0xMC0yNS0xNS00MC0xNS0xMCAwLTIwIDUtMjUgMTAtNSA1LTEwIDE1LTEwIDI1IDAgNSAwIDEwIDUgMTUgNSA1IDEwIDUgMTUgNSA1IDAgMTAgMCAxNS01IDUtNSA1LTEwIDUtMTUiIGZpbGw9IiNGRjY5QjQiIC8+CiAgCiAgPCEtLSBFYXJzIC0tPgogIDxwYXRoIGQ9Ik0xNzAgMTMwYy0xMC0xNS0yMC0zNS0xNS01NSA1LTIwIDIwLTM1IDQwLTQwIDIwLTUgNDAgNSA1NSAyMCAxNSAxNSAyMCAzNSAxNSA1NS01IDIwLTIwIDMwLTM1IDM1LTE1IDUtMzAgMC00NS01IiBmaWxsPSIjRkY2OUI0IiAvPgogIDxwYXRoIGQ9Ik0zNDIgMTMwYzEwLTE1IDIwLTM1IDE1LTU1LTUtMjAtMjAtMzUtNDAtNDAtMjAtNS00MCA1LTU1IDIwLTE1IDE1LTIwIDM1LTE1IDU1IDUgMjAgMjAgMzAgMzUgMzUgMTUgNSAzMCAwIDQ1LTUiIGZpbGw9IiNGRjY5QjQiIC8+CiAgCiAgPCEtLSBGYWNlIERldGFpbHMgLS0+CiAgPGVsbGlwc2UgY3g9IjIwNSIgY3k9IjIxMCIgcng9IjEwIiByeT0iMTUiIGZpbGw9IiMwMDAiIC8+CiAgPGVsbGlwc2UgY3g9IjMwNyIgY3k9IjIxMCIgcng9IjEwIiByeT0iMTUiIGZpbGw9IiMwMDAiIC8+CiAgCiAgPCEtLSBOb3NlIC0tPgogIDxwYXRoIGQ9Ik0yNTYgMjM1Yy0xMCAwLTIwIDUtMjUgMTAtNSA1LTEwIDE1LTEwIDI1IDAgMTAgNSAyMCAxNSAyNSAxMCA1IDIwIDUgMzAgMCAxMC01IDE1LTE1IDE1LTI1IDAtMTAtNS0yMC0xMC0yNS01LTUtMTAtMTAtMTUtMTAiIGZpbGw9IiNGRkMwQ0IiIC8+CiAgCiAgPCEtLSBNb3V0aCAtLT4KICA8cGF0aCBkPSJNMjQwIDI3NWM1IDEwIDE1IDE1IDI1IDE1IDEwIDAgMjAtNSAyNS0xNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjUiIC8+CiAgCiAgPCEtLSBTdW5nbGFzc2VzIC0tPgogIDxwYXRoIGQ9Ik0xNzUgMTkwaDE2MGMxMCAwIDIwIDEwIDIwIDIwdjEwYzAgMTAtMTAgMjAtMjAgMjBoLTcwYy01IDAtMTAtNS0xMC0xMCAwLTUgNS0xMCAxMC0xMGgzMGM1IDAgMTAtNSAxMC0xMCAwLTUtNS0xMC0xMC0xMGgtODBjLTUgMC0xMCA1LTEwIDEwIDAgNSA1IDEwIDEwIDEwaDMwYzUgMCAxMCA1IDEwIDEwIDAgNS01IDEwLTEwIDEwaC03MGMtMTAgMC0yMC0xMC0yMC0yMHYtMTBjMC0xMCAxMC0yMCAyMC0yMHoiIGZpbGw9IiMwMDAiIC8+CiAgCiAgPCEtLSBPdXRsaW5lIC0tPgogIDxwYXRoIGQ9Ik0yNTYgOTBjLTQwIDAtNzUgMjAtMTAwIDQ1LTI1IDI1LTQwIDYwLTQwIDk1IDAgMzAgMTUgNTUgMzUgNzAgMjAgMTUgNDUgMjAgNjUgMjAgMTUgMCAzMC01IDQwLTE1IDEwLTEwIDE1LTI1IDE1LTQ1TTE3MCAxMzBjLTEwLTE1LTIwLTM1LTE1LTU1IDUtMjAgMjAtMzUgNDAtNDAgMjAtNSA0MCA1IDU1IDIwIDE1IDE1IDIwIDM1IDE1IDU1LTUgMjAtMjAgMzAtMzUgMzUtMTUgNS0zMCAwLTQ1LTVNMzQyIDEzMGMxMC0xNSAyMC0zNSAxNS01NS01LTIwLTIwLTM1LTQwLTQwLTIwLTUtNDAgNS01NSAyMC0xNSAxNS0yMCAzNS0xNSA1NSA1IDIwIDIwIDMwIDM1IDM1IDE1IDUgMzAgMCA0NS01IiBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMTAiIC8+Cjwvc3ZnPg==" alt="Drama Llama Logo" style="width: 120px; height: auto;" />
        </div>
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