#!/usr/bin/env node

/**
 * Example: Read message history with a contact
 * 
 * This example demonstrates how to:
 * 1. Login to a CryptPad account
 * 2. Read encrypted message history with a contact
 * 
 * Usage:
 *   CRYPTPAD_BASE_URL="https://cryptpad.fr" \
 *   CRYPTPAD_WS_URL="wss://cryptpad.fr/cryptpad_websocket" \
 *   node examples/read-messages-example.js <username> <password> <contact>
 */

const auth = require('../src/cryptpad/auth');
const contacts = require('../src/cryptpad/contacts');
const messenger = require('../src/cryptpad/messenger');

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
const [username, password, contactName] = process.argv.slice(2);

if (!username || !password || !contactName) {
    console.error('Usage: node read-messages-example.js <username> <password> <contact>');
    console.error('');
    console.error('Example:');
    console.error('  CRYPTPAD_BASE_URL="https://cryptpad.fr" \\');
    console.error('  CRYPTPAD_WS_URL="wss://cryptpad.fr/cryptpad_websocket" \\');
    console.error('  node examples/read-messages-example.js alice mypassword bob');
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
    
    // Find the specified contact
    const contact = contacts.getFriend(contactName);
    
    if (!contact) {
        console.error(`❌ Contact "${contactName}" not found`);
        const allContacts = contacts.getAllContacts();
        console.error('Available contacts:', allContacts.map(c => c.displayName).join(', '));
        process.exit(1);
    }
    
    console.log(`📨 Reading messages with ${contact.displayName}...`);
    console.log('');
    
    messenger.getMessages(contact, wsUrl, (err, messages) => {
        if (err) {
            console.error('❌ Failed to read messages:', err.message);
            process.exit(1);
        }
        
        console.log('=' .repeat(80));
        console.log(`Messages with ${contact.displayName} (${messages.length} total)`);
        console.log('=' .repeat(80));
        console.log('');
        
        if (messages.length === 0) {
            console.log('  No messages yet. Send the first one!');
        } else {
            const myPublic = result.proxy.curvePublic;
            
            messages.forEach((msg, i) => {
                const date = new Date(msg.timestamp);
                const timeStr = date.toLocaleString();
                const isMe = msg.author === myPublic;
                const sender = isMe ? 'You' : contact.displayName;
                const prefix = isMe ? '→' : '←';
                
                console.log(`${prefix} [${timeStr}] ${sender}:`);
                console.log(`  ${msg.content}`);
                console.log('');
            });
        }
        
        console.log('=' .repeat(80));
        console.log('✅ Done!');
        
        messenger.closeAllChannels();
        setTimeout(() => process.exit(0), 500);
    });
});

