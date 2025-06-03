/**
 * Test script for name detection functionality
 */

const sampleWhatsAppChat = `[25/5/23, 2:30:45 PM] Sarah: Hey, how was your day?
[25/5/23, 2:31:12 PM] Mike: It was pretty good! Thanks for asking
[25/5/23, 2:31:45 PM] Sarah: That's great to hear
[25/5/23, 2:32:01 PM] Mike: How about you? How did your meeting go?
[25/5/23, 2:32:30 PM] Sarah: It went well, we got the project approved
[25/5/23, 2:33:15 PM] Mike: Awesome! Congratulations`;

async function testNameDetection() {
  try {
    console.log('Testing name detection with sample WhatsApp chat...');
    
    const response = await fetch('http://localhost:5000/api/analyze/detect-names', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversation: sampleWhatsAppChat })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Name detection successful:', result);
    } else {
      const error = await response.json();
      console.error('Name detection failed:', error);
    }
  } catch (error) {
    console.error('Error testing name detection:', error);
  }
}

testNameDetection();