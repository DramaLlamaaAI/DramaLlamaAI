// Test Azure Vision API connection
import axios from 'axios';

async function testAzureConnection() {
  const endpoint = process.env.AZURE_VISION_ENDPOINT;
  const subscriptionKey = process.env.AZURE_VISION_KEY;
  
  console.log('Testing Azure Vision API connection...');
  console.log('Endpoint:', endpoint);
  console.log('Key (first 10 chars):', subscriptionKey?.substring(0, 10) + '...');
  
  try {
    // Test basic connection with a simple API call
    const testUrl = `${endpoint.replace(/\/$/, '')}/vision/v3.2/models`;
    console.log('Test URL:', testUrl);
    
    const response = await axios.get(testUrl, {
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey
      },
      timeout: 10000
    });
    
    console.log('✅ Basic connection successful!');
    console.log('Status:', response.status);
    console.log('Available models:', response.data?.models?.length || 'unknown');
    
    // Now test the Read API endpoint specifically
    console.log('\n🔍 Testing Read API endpoint...');
    const readUrl = `${endpoint.replace(/\/$/, '')}/vision/v3.2/read/analyze`;
    console.log('Read URL:', readUrl);
    
    // Create a minimal test image (1x1 pixel PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    const testImageBuffer = Buffer.from(testImageBase64, 'base64');
    
    const readResponse = await axios.post(readUrl, testImageBuffer, {
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/octet-stream'
      },
      timeout: 10000
    });
    
    console.log('✅ Read API submission successful!');
    console.log('Status:', readResponse.status);
    console.log('Operation Location:', readResponse.headers['operation-location'] ? 'received' : 'missing');
    
  } catch (error) {
    console.error('Connection failed:');
    console.error('Status:', error.response?.status);
    console.error('StatusText:', error.response?.statusText);
    console.error('Error Code:', error.response?.headers?.['ms-azure-ai-errorcode']);
    console.error('Message:', error.response?.data?.error?.message || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n❌ Authentication Error: Check your subscription key');
    } else if (error.response?.status === 403) {
      console.log('\n❌ Access Denied: Check endpoint region and resource permissions');
    } else if (error.response?.status === 404) {
      console.log('\n❌ Endpoint Not Found: Check your endpoint URL');
    }
  }
}

testAzureConnection();