#!/usr/bin/env node

// Test script for x402 Image Uploader Service
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const SERVER_URL = 'http://localhost:3001';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

async function testHealthEndpoint() {
  console.log(colorize('🏥 Testing health endpoint...', 'cyan'));
  
  try {
    const response = await fetch(`${SERVER_URL}/health`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(colorize('✅ Health check passed', 'green'));
      console.log(`   Status: ${data.status}`);
      console.log(`   Message: ${data.message}`);
      return true;
    } else {
      console.log(colorize('❌ Health check failed', 'red'));
      return false;
    }
  } catch (error) {
    console.log(colorize(`❌ Health check error: ${error.message}`, 'red'));
    return false;
  }
}

async function testUploadEndpoint(imagePath = null) {
  console.log(colorize('Testing upload endpoint (will require payment)...', 'cyan'));
  
  const FormData = require('form-data');
  const form = new FormData();
  
  if (imagePath && fs.existsSync(imagePath)) {
    // Use real image file if provided
    console.log(colorize(`   Using image file: ${imagePath}`, 'blue'));
    form.append('image', fs.createReadStream(imagePath));
  } else {
    // Create a simple test image buffer (1x1 pixel PNG)
    console.log(colorize('   Using generated test image (1x1 PNG)', 'blue'));
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x57, 0x63, 0xF8, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x5C, 0xC2, 0x8B, 0x05, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    form.append('image', testImageBuffer, {
      filename: 'test-image.png',
      contentType: 'image/png'
    });
  }

  try {
    const response = await fetch(`${SERVER_URL}/upload`, {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'x-user-address': 'test-user-123'
      }
    });

    if (response.status === 402) {
      console.log(colorize(' Payment required (HTTP 402) - This is expected!', 'yellow'));
      
      const paymentInfo = await response.json();
      console.log('Payment requirements received:');
      
      if (paymentInfo.accepts && paymentInfo.accepts.length > 0) {
        const requirement = paymentInfo.accepts[0];
        console.log(`Amount: ${requirement.maxAmountRequired} (atomic units)`);
        console.log(` Network: ${requirement.network}`);
        console.log(` Pay to: ${requirement.payTo}`);
        console.log(`Description: ${requirement.description || 'Image upload'}`);
      }
      
      console.log('\n' + colorize('Next Steps:', 'bright'));
      console.log('1. Use x402-fetch or x402-axios for automatic payment handling');
      console.log('2. Or implement manual payment with x402 SDK');
      console.log('3. Example with x402-fetch:');
      console.log(colorize(`
const { x402Fetch } = require('x402-fetch');

const response = await x402Fetch('${SERVER_URL}/upload', {
  method: 'POST',
  body: formData,
  payment: {
    wallet: yourWallet,
    maxAmount: 0.05
  }
});`, 'blue'));
      
      return true;
    } else if (response.ok) {
      const result = await response.json();
      console.log(colorize(' Upload successful (payment was processed)', 'green'));
      console.log(`   Image URL: ${result.url}`);
      console.log(`   Upload ID: ${result.id}`);
      return true;
    } else {
      const error = await response.json();
      console.log(colorize(` Upload failed: ${error.error || response.statusText}`, 'red'));
      return false;
    }
  } catch (error) {
    console.log(colorize(` Upload error: ${error.message}`, 'red'));
    return false;
  }
}

async function testImagesEndpoint() {
  console.log(colorize('📋 Testing images list endpoint...', 'cyan'));
  
  try {
    const response = await fetch(`${SERVER_URL}/images`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(colorize(`✅ Found ${data.images.length} uploaded images`, 'green'));
      
      if (data.images.length > 0) {
        console.log('Recent uploads:');
        data.images.slice(0, 3).forEach((img, idx) => {
          console.log(`   ${idx + 1}. ${img.original_name || 'Unknown'} - ${img.mime} (${new Date(img.uploaded_at).toLocaleString()})`);
        });
      }
      return true;
    } else {
      console.log(colorize('❌ Images list failed', 'red'));
      return false;
    }
  } catch (error) {
    console.log(colorize(`❌ Images list error: ${error.message}`, 'red'));
    return false;
  }
}

async function main() {
  console.log(colorize(' x402 Image Uploader Service - Test Suite', 'bright'));
  console.log('='.repeat(50));
  
  console.log(`Testing server at: ${SERVER_URL}\n`);
  
  // Check for command line arguments (image path)
  const imagePath = process.argv[2];
  if (imagePath) {
    console.log(colorize(` Using custom image: ${imagePath}`, 'magenta'));
  }
  
  // Test health endpoint
  const healthOk = await testHealthEndpoint();
  console.log('');
  
  if (!healthOk) {
    console.log(colorize('Server is not responding. Make sure it\'s running:', 'red'));
    console.log('   npm run dev');
    return;
  }
  
  // Test upload endpoint (will require payment)
  await testUploadEndpoint(imagePath);
  console.log('');
  
  // Test images list
  await testImagesEndpoint();
  console.log('');
  
  console.log(colorize('Test suite completed!', 'green'));
  console.log('\n' + colorize('To test with your own image:', 'bright'));
  console.log('   npm test path/to/your/image.jpg');
}

// Run the test suite
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testHealthEndpoint,
  testUploadEndpoint,
  testImagesEndpoint
};