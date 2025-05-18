/**
 * Test script for stonewalling detection
 * Run with: npx tsx test-stonewalling.ts ./attached_assets/Conversation_6_Gaslighting_Grace_Leo.txt
 */
import * as fs from 'fs';
import { detectRedFlagsDirectly } from './server/services/direct-red-flag-detector';

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