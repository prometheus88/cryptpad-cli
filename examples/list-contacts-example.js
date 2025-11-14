#!/usr/bin/env node

/**
 * Example: List all contacts
 * 
 * This example demonstrates how to:
 * 1. Login to a CryptPad account
 * 2. List all contacts with their details
 * 
 * Usage:
 *   CRYPTPAD_BASE_URL="https://cryptpad.fr" \
 *   CRYPTPAD_WS_URL="wss://cryptpad.fr/cryptpad_websocket" \
 *   node examples/list-contacts-example.js <username> <password>
 */

const auth = require('../src/cryptpad/auth');
const contacts = require('../src/cryptpad/contacts');

// Get configuration from environment
const baseUrl = process.env.CRYPTPAD_BASE_URL;
const wsUrl = process.env.CRYPTPAD_WS_URL;

if (!baseUrl || !wsUrl) {
    console.error('Error: CryptPad server URLs not configured!');
    console.error('');
    console.error('Please set environment variables:');
    console.error('  CRYPTPAD_BASE_URL  - e.g., https://cryptpad.fr');
    console.error('  CRYPTPAD_WS_URL    - e.g., wss://cryptpad.fr/cryptpad_websocket');
    console.error('');
    process.exit(1);
}

// Get arguments
const [username, password] = process.argv.slice(2);

if (!username || !password) {
    console.error('Usage: node list-contacts-example.js <username> <password>');
    console.error('');
    console.error('Example:');
    console.error('  CRYPTPAD_BASE_URL="https://cryptpad.fr" \\');
    console.error('  CRYPTPAD_WS_URL="wss://cryptpad.fr/cryptpad_websocket" \\');
    console.error('  node examples/list-contacts-example.js alice mypassword');
    console.error('');
    process.exit(1);
}

console.log('🔐 Logging into CryptPad...');
console.log('  Server:', baseUrl);
console.log('  User:', username);
console.log('');

auth.login(username, password, wsUrl, baseUrl, (err, result) => {
    if (err) {
        console.error('❌ Login failed:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Logged in successfully!');
    console.log('');
    
    // Get all contacts
    const allContacts = contacts.getAllContacts();
    
    if (allContacts.length === 0) {
        console.log('📇 You have no contacts yet.');
        console.log('   Add friends through the CryptPad web interface!');
        process.exit(0);
    }
    
    console.log(`📇 Your Contacts (${allContacts.length}):`);
    console.log('');
    console.log('=' .repeat(80));
    
    allContacts.forEach((contact, i) => {
        const num = String(i + 1).padStart(3, ' ');
        console.log(`${num}. ${contact.displayName}`);
        console.log(`     Curve Public Key: ${contact.curvePublic}`);
        console.log(`     Ed Public Key:    ${contact.edPublic || 'N/A'}`);
        console.log(`     Message Channel:  ${contact.channel}`);
        if (contact.profile) {
            console.log(`     Profile: ${contact.profile}`);
        }
        console.log('');
    });
    
    console.log('=' .repeat(80));
    console.log('');
    console.log('✅ Done!');
    
    process.exit(0);
});

