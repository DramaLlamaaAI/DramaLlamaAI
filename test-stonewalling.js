/**
 * Test script for stonewalling detection
 */
const fs = require('fs');
const { detectRedFlagsDirectly } = require('./server/services/direct-red-flag-detector');

// Load the conversation file
const conversationPath = process.argv[2] || './attached_assets/Conversation_6_Gaslighting_Grace_Leo.txt';
const conversation = fs.readFileSync(conversationPath, 'utf-8');

console.log('Testing stonewalling detection:');
console.log('---------------------------------------------------------');
console.log(conversation);
console.log('---------------------------------------------------------');
console.log('Detected red flags:');
const flags = detectRedFlagsDirectly(conversation);
console.log(JSON.stringify(flags, null, 2));