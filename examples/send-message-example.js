#!/usr/bin/env node

/**
 * Example: Send a message to a contact
 * 
 * This example demonstrates how to:
 * 1. Login to a CryptPad account
 * 2. List contacts
 * 3. Send an encrypted message
 * 4. Read message history
 * 
 * Usage:
 *   CRYPTPAD_BASE_URL="https://cryptpad.fr" \
 *   CRYPTPAD_WS_URL="wss://cryptpad.fr/cryptpad_websocket" \
 *   node examples/send-message-example.js <username> <password> <contact> <message>
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
const [username, password, contactName, ...messageParts] = process.argv.slice(2);

if (!username || !password || !contactName || messageParts.length === 0) {
    console.error('Usage: node send-message-example.js <username> <password> <contact> <message>');
    console.error('');
    console.error('Example:');
    console.error('  CRYPTPAD_BASE_URL="https://cryptpad.fr" \\');
    console.error('  CRYPTPAD_WS_URL="wss://cryptpad.fr/cryptpad_websocket" \\');
    console.error('  node examples/send-message-example.js alice mypassword bob "Hello from CLI!"');
    console.error('');
    process.exit(1);
}

const messageText = messageParts.join(' ');

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
    console.log(`📇 You have ${allContacts.length} contacts:`);
    allContacts.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.displayName}`);
    });
    console.log('');
    
    // Find the specified contact
    const contact = contacts.getFriend(contactName);
    
    if (!contact) {
        console.error(`❌ Contact "${contactName}" not found`);
        console.error('Available contacts:', allContacts.map(c => c.displayName).join(', '));
        process.exit(1);
    }
    
    console.log(`📤 Sending message to ${contact.displayName}...`);
    console.log(`   Message: "${messageText}"`);
    console.log('');
    
    // Send the message
    messenger.sendMessage(contact, messageText, wsUrl, (err) => {
        if (err) {
            console.error('❌ Failed to send message:', err.message);
            process.exit(1);
        }
        
        console.log(`✅ Message sent successfully to ${contact.displayName}!`);
        console.log('');
        console.log('📨 Reading message history...');
        console.log('');
        
        // Read message history to confirm
        setTimeout(() => {
            messenger.getMessages(contact, wsUrl, (err, messages) => {
                if (err) {
                    console.error('❌ Failed to read messages:', err.message);
                    process.exit(1);
                }
                
                console.log(`Found ${messages.length} messages with ${contact.displayName}:`);
                console.log('');
                
                const myPublic = result.proxy.curvePublic;
                
                // Show last 5 messages
                const recentMessages = messages.slice(-5);
                recentMessages.forEach((msg) => {
                    const date = new Date(msg.timestamp);
                    const timeStr = date.toLocaleString();
                    const isMe = msg.author === myPublic;
                    const sender = isMe ? 'You' : contact.displayName;
                    
                    console.log(`[${timeStr}] ${sender}: ${msg.content}`);
                });
                
                console.log('');
                console.log('✅ Done!');
                
                messenger.closeAllChannels();
                setTimeout(() => process.exit(0), 500);
            });
        }, 1000);
    });
});

