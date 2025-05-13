/**
 * This is a simple test client for the password reset flow.
 * Run it with: node test-reset-password.js
 */
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';

// Replace with an actual email from your users
const EMAIL = 'demo@example.com';

async function testResetFlow() {
  try {
    // Step 1: Request password reset
    console.log(`Requesting password reset for ${EMAIL}...`);
    const requestResponse = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL })
    });
    
    const requestData = await requestResponse.json();
    console.log('Response:', requestData);
    
    // Check if we get a verification code directly (for testing)
    if (!requestData.verificationCode) {
      console.log('No verification code in response - in production this is expected');
      console.log('Check the email sent to', EMAIL, 'for the reset code');
      return;
    }
    
    // Step 2: Reset the password using the code
    const resetCode = requestData.verificationCode;
    console.log(`Using verification code: ${resetCode}`);
    
    const resetResponse = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: resetCode,
        password: 'NewPassword123',
        email: EMAIL
      })
    });
    
    const resetData = await resetResponse.json();
    console.log('Reset response:', resetData);
    
    // Step 3: Try to login with the new password
    console.log('Trying to login with new password...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: EMAIL,
        password: 'NewPassword123'
      })
    });
    
    if (loginResponse.ok) {
      console.log('Login successful! Password reset flow works correctly.');
    } else {
      const errorData = await loginResponse.json();
      console.log('Login failed:', errorData);
    }
    
  } catch (error) {
    console.error('Error testing reset flow:', error);
  }
}

// Self-executing async function for ES modules
(async () => {
  await testResetFlow();
})();