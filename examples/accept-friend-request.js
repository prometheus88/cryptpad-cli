#!/usr/bin/env node

/**
 * Accept Friend Request - Standalone Script
 * 
 * This script demonstrates how to:
 * 1. Login to a CryptPad account
 * 2. Read pending friend requests from the notifications mailbox
 * 3. Accept a friend request (adds to contacts + sends notification)
 * 
 * Usage:
 *   CRYPTPAD_BASE_URL=http://your-instance:3010 \
 *   CRYPTPAD_WS_URL=ws://your-instance:3013 \
 *   node accept-friend-request.js <username> <password> <friend_name>
 * 
 * Example:
 *   CRYPTPAD_BASE_URL=http://localhost:3000 \
 *   CRYPTPAD_WS_URL=ws://localhost:3003 \
 *   node accept-friend-request.js sean mypassword stuart
 */

const auth = require('../src/cryptpad/auth');
const contactManager = require('../src/cryptpad/contact-manager');
const session = require('../src/cryptpad/session');

// Get configuration from environment variables
const baseUrl = process.env.CRYPTPAD_BASE_URL;
const wsUrl = process.env.CRYPTPAD_WS_URL;

// Get credentials from command line arguments
const username = process.argv[2];
const password = process.argv[3];
const friendName = process.argv[4];

// Validate inputs
if (!baseUrl || !wsUrl) {
    console.error('Error: CryptPad server URLs not configured!');
    console.error('');
    console.error('Please set the following environment variables:');
    console.error('  CRYPTPAD_BASE_URL  (e.g., http://localhost:3000)');
    console.error('  CRYPTPAD_WS_URL    (e.g., ws://localhost:3003)');
    console.error('');
    process.exit(1);
}

if (!username || !password) {
    console.error('Usage: node accept-friend-request.js <username> <password> [friend_name]');
    console.error('');
    console.error('Arguments:');
    console.error('  username    - Your CryptPad username');
    console.error('  password    - Your CryptPad password');
    console.error('  friend_name - Name of friend to accept (optional, shows all if omitted)');
    console.error('');
    console.error('Environment variables:');
    console.error('  CRYPTPAD_BASE_URL - Base URL of CryptPad instance');
    console.error('  CRYPTPAD_WS_URL   - WebSocket URL of CryptPad instance');
    console.error('');
    process.exit(1);
}

console.log('='.repeat(70));
console.log('CryptPad - Accept Friend Request');
console.log('='.repeat(70));
console.log('');
console.log(`Server: ${baseUrl}`);
console.log(`User: ${username}`);
console.log('');

// Step 1: Login
console.log('Step 1: Logging in...');
auth.login(username, password, wsUrl, baseUrl, (err) => {
    if (err) {
        console.error('✗ Login failed:', err.message);
        process.exit(1);
    }

    console.log('✓ Logged in successfully');
    console.log('');

    // Step 2: Read pending friend requests
    console.log('Step 2: Reading pending friend requests...');
    contactManager.getPendingRequests(wsUrl, (err, pending) => {
        if (err) {
            console.error('✗ Failed to read pending requests:', err.message);
            process.exit(1);
        }

        console.log(`✓ Found ${pending.length} pending request(s)`);
        console.log('');

        if (pending.length === 0) {
            console.log('No pending friend requests to accept.');
            process.exit(0);
        }

        // Display all pending requests
        console.log('Pending requests:');
        pending.forEach((req, index) => {
            console.log(`  ${index + 1}. ${req.displayName}`);
            console.log(`     Curve Public: ${req.curvePublic.slice(0, 20)}...`);
            console.log(`     Received: ${new Date(req.time).toLocaleString()}`);
        });
        console.log('');

        // If no friend name specified, exit
        if (!friendName) {
            console.log('No friend name specified. Use:');
            console.log(`  node accept-friend-request.js ${username} <password> <friend_name>`);
            console.log('');
            process.exit(0);
        }

        // Step 3: Accept the specified friend request
        console.log(`Step 3: Accepting friend request from "${friendName}"...`);
        console.log('');

        contactManager.acceptFriendRequest(wsUrl, friendName, (err, result) => {
            if (err) {
                console.error('✗ Failed to accept:', err.message);
                process.exit(1);
            }

            console.log('');
            console.log('='.repeat(70));
            console.log('✓ SUCCESS!');
            console.log('='.repeat(70));
            console.log('');
            console.log(`Friend request accepted from: ${result.friend}`);
            console.log('');
            console.log('What happened:');
            console.log(`  ✓ ${result.friend} added to your contacts`);
            console.log(`  ✓ Acceptance notification sent to ${result.friend}'s mailbox`);
            console.log(`  ✓ ${result.friend} will see the acceptance in their browser`);
            console.log('');
            console.log('Both users should now see each other as friends!');
            console.log('');

            // Get current friends list
            const proxy = session.getProxy();
            const friendsList = Object.keys(proxy.friends || {});
            console.log(`Total friends: ${friendsList.length}`);
            console.log('');

            setTimeout(() => {
                process.exit(0);
            }, 2000);
        });
    });
});

