#!/usr/bin/env node

/**
 * CryptPad Contact Management Tool
 * 
 * Standalone script for:
 * - Viewing pending friend requests from mailbox
 * - Accepting/rejecting friend requests
 * - Viewing current contacts
 * - Removing contacts
 * 
 * Usage:
 *   CRYPTPAD_BASE_URL=http://your-instance:3010 \
 *   CRYPTPAD_WS_URL=ws://your-instance:3013 \
 *   node contact-management-tool.js
 */

const readline = require('readline');
const auth = require('../src/cryptpad/auth');
const session = require('../src/cryptpad/session');
const contacts = require('../src/cryptpad/contacts');
const mailbox = require('../src/cryptpad/mailbox');
const contactManager = require('../src/cryptpad/contact-manager');

// Configuration from environment variables
const baseUrl = process.env.CRYPTPAD_BASE_URL;
const wsUrl = process.env.CRYPTPAD_WS_URL;

if (!baseUrl || !wsUrl) {
    console.error('Error: CryptPad server URLs not configured!');
    console.error('');
    console.error('Please set the following environment variables:');
    console.error('  CRYPTPAD_BASE_URL  (e.g., http://localhost:3000)');
    console.error('  CRYPTPAD_WS_URL    (e.g., ws://localhost:3003)');
    console.error('');
    console.error('Example usage:');
    console.error('  CRYPTPAD_BASE_URL=http://localhost:3000 \\');
    console.error('  CRYPTPAD_WS_URL=ws://localhost:3003 \\');
    console.error('  node contact-management-tool.js');
    process.exit(1);
}

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Promisified question function
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Utility functions
const print = console.log;
const separator = () => print('='.repeat(70));

// Display menu
function displayMenu() {
    print('');
    separator();
    print('CONTACT MANAGEMENT MENU');
    separator();
    print('');
    print('  1. View Pending Friend Requests (from mailbox)');
    print('  2. Accept a Friend Request');
    print('  3. Reject a Friend Request');
    print('  4. Send a Friend Request');
    print('  5. View Current Contacts');
    print('  6. Remove a Contact');
    print('  7. View Profile URLs');
    print('  8. Logout and Exit');
    print('');
}

// View pending requests from mailbox
async function viewPendingRequests() {
    print('');
    separator();
    print('PENDING FRIEND REQUESTS');
    separator();
    print('');
    print('📬 Reading notifications mailbox...');
    print('');

    return new Promise((resolve, reject) => {
        mailbox.getPendingRequests(wsUrl, (err, pending) => {
            if (err) {
                print('✗ Error reading mailbox:', err.message);
                return reject(err);
            }

            if (pending.length === 0) {
                print('  No pending friend requests.');
            } else {
                print(`Found ${pending.length} pending request(s):`);
                print('');

                pending.forEach((request, index) => {
                    print(`  ${index + 1}. ${request.displayName || 'Unknown'}`);
                    print(`     Curve Public: ${request.curvePublic}`);
                    if (request.edPublic) {
                        print(`     Ed Public: ${request.edPublic}`);
                    }
                    if (request.time) {
                        print(`     Received: ${new Date(request.time).toLocaleString()}`);
                    }
                    if (request.profile) {
                        print(`     Profile: ${baseUrl}${request.profile}`);
                    }
                    print('');
                });
            }

            resolve(pending);
        });
    });
}

// Accept a friend request
async function acceptFriendRequest() {
    print('');
    separator();
    print('ACCEPT FRIEND REQUEST');
    separator();
    print('');

    // First, show pending requests
    let pending;
    try {
        pending = await viewPendingRequests();
        if (pending.length === 0) {
            return;
        }
    } catch (err) {
        return;
    }

    print('');
    const identifier = await question('Enter the name or curve public key to accept (or "cancel"): ');
    
    if (!identifier || identifier.toLowerCase() === 'cancel') {
        print('Cancelled.');
        return;
    }

    print('');
    print(`Accepting friend request from: ${identifier}...`);

    return new Promise((resolve, reject) => {
        contactManager.acceptFriendRequest(wsUrl, identifier, (err, result) => {
            if (err) {
                print(`✗ Failed to accept: ${err.message}`);
                reject(err);
                return;
            }

            print('');
            print(`✓ Accepted friend request from ${result.friend}`);
            print(`  Acceptance notification sent to their mailbox!`);
            resolve();
        });
    });
}

// Reject a friend request
async function rejectFriendRequest() {
    print('');
    separator();
    print('REJECT FRIEND REQUEST');
    separator();
    print('');

    // First, show pending requests
    let pending;
    try {
        pending = await viewPendingRequests();
        if (pending.length === 0) {
            return;
        }
    } catch (err) {
        return;
    }

    print('');
    const identifier = await question('Enter the name or curve public key to reject (or "cancel"): ');
    
    if (!identifier || identifier.toLowerCase() === 'cancel') {
        print('Cancelled.');
        return;
    }

    print('');
    print(`Rejecting friend request from: ${identifier}...`);

    return new Promise((resolve, reject) => {
        contactManager.rejectFriendRequest(wsUrl, identifier, (err, result) => {
            if (err) {
                print(`✗ Failed to reject: ${err.message}`);
                reject(err);
                return;
            }

            print('');
            print(`✓ Rejected friend request from ${result.user}`);
            print(`  Decline notification sent to their mailbox!`);
            resolve();
        });
    });
}

// Send a friend request
async function sendFriendRequest() {
    print('');
    separator();
    print('SEND FRIEND REQUEST');
    separator();
    print('');
    print('To send a friend request, you need the recipient\'s:');
    print('  - Display Name');
    print('  - Profile URL (or their public keys)');
    print('');
    print('Example profile URL: http://your-instance/2/profile/view/...');
    print('');

    const profileUrl = await question('Enter the profile URL (or "cancel"): ');
    
    if (!profileUrl || profileUrl.toLowerCase() === 'cancel') {
        print('Cancelled.');
        return;
    }

    // TODO: Parse profile URL to extract public keys and notification channel
    // For now, this is a placeholder
    print('');
    print('⚠️  Profile URL parsing not yet implemented.');
    print('   You need to manually extract:');
    print('   - curvePublic');
    print('   - edPublic');
    print('   - notifications channel');
    print('   - displayName');
    print('');
    print('This feature requires additional implementation to fetch and parse');
    print('the profile data from the URL.');
}

// View current contacts
async function viewCurrentContacts() {
    print('');
    separator();
    print('CURRENT CONTACTS');
    separator();
    print('');

    const contactsList = contacts.getAllContacts();

    if (contactsList.length === 0) {
        print('  No contacts found.');
        print('');
        return [];
    }

    print(`You have ${contactsList.length} contact(s):`);
    print('');

    contactsList.forEach((contact, index) => {
        print(`  ${index + 1}. ${contact.displayName || 'Unknown'}`);
        print(`     Curve Public: ${contact.curvePublic}`);
        if (contact.edPublic) {
            print(`     Ed Public: ${contact.edPublic}`);
        }
        if (contact.profile) {
            print(`     Profile: ${baseUrl}${contact.profile}`);
        }
        print('');
    });

    return contactsList;
}

// Remove a contact
async function removeContact() {
    print('');
    separator();
    print('REMOVE CONTACT');
    separator();
    print('');

    // First, show current contacts
    const contactsList = await viewCurrentContacts();
    
    if (contactsList.length === 0) {
        return;
    }

    print('');
    const identifier = await question('Enter the name or curve public key to remove (or "cancel"): ');
    
    if (!identifier || identifier.toLowerCase() === 'cancel') {
        print('Cancelled.');
        return;
    }

    print('');
    const confirm = await question(`⚠️  Are you sure you want to remove "${identifier}"? (yes/no): `);
    
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
        print('Cancelled.');
        return;
    }

    print('');
    print(`Removing contact: ${identifier}...`);

    return new Promise((resolve, reject) => {
        contactManager.removeFriend(identifier, (err, result) => {
            if (err) {
                print(`✗ Failed to remove: ${err.message}`);
                reject(err);
                return;
            }

            print('');
            print(`✓ Removed ${result.name} from your contacts`);
            print(`  Curve Public: ${result.curvePublic}`);
            resolve();
        });
    });
}

// View profile URLs
async function viewProfileUrls() {
    print('');
    separator();
    print('YOUR PROFILE');
    separator();
    print('');

    try {
        const profileUrls = contactManager.getProfileUrls();

        if (!profileUrls) {
            print('⚠️  You don\'t have a profile set up yet.');
            print('   Create one through the CryptPad web interface.');
            return;
        }

        print('📝 Edit Your Profile:');
        print(`   ${baseUrl}${profileUrls.edit}`);
        print('');
        print('🔗 Share Your Profile (Public View):');
        print(`   ${baseUrl}${profileUrls.view}`);
        print('');
        print('💡 Anyone with the view link can see your public profile');
        print('   and send you a friend request!');
    } catch (err) {
        print(`✗ Error: ${err.message}`);
    }
}

// Main menu loop
async function mainMenu() {
    while (true) {
        displayMenu();

        const choice = await question('Select an option (1-8): ');

        try {
            switch (choice.trim()) {
                case '1':
                    await viewPendingRequests();
                    await question('\nPress Enter to continue...');
                    break;
                case '2':
                    await acceptFriendRequest();
                    await question('\nPress Enter to continue...');
                    break;
                case '3':
                    await rejectFriendRequest();
                    await question('\nPress Enter to continue...');
                    break;
                case '4':
                    await sendFriendRequest();
                    await question('\nPress Enter to continue...');
                    break;
                case '5':
                    await viewCurrentContacts();
                    await question('\nPress Enter to continue...');
                    break;
                case '6':
                    await removeContact();
                    await question('\nPress Enter to continue...');
                    break;
                case '7':
                    await viewProfileUrls();
                    await question('\nPress Enter to continue...');
                    break;
                case '8':
                    print('');
                    print('Logging out...');
                    print('Goodbye!');
                    rl.close();
                    process.exit(0);
                default:
                    print('');
                    print('✗ Invalid option. Please select 1-8.');
                    await question('Press Enter to continue...');
            }
        } catch (err) {
            print('');
            print(`✗ Error: ${err.message}`);
            await question('\nPress Enter to continue...');
        }
    }
}

// Login and start
async function main() {
    print('');
    separator();
    print('CRYPTPAD CONTACT MANAGEMENT TOOL');
    separator();
    print('');
    print(`Server: ${baseUrl}`);
    print('');

    // Get credentials
    const username = await question('Username: ');
    const password = await question('Password: ');

    print('');
    print('Logging in...');

    return new Promise((resolve, reject) => {
        auth.login(username, password, wsUrl, baseUrl, async (err) => {
            if (err) {
                print('');
                print(`✗ Login failed: ${err.message}`);
                rl.close();
                process.exit(1);
            }

            print('✓ Login successful!');
            print('');
            
            const proxy = session.getProxy();
            print(`Welcome, ${proxy.profile?.displayName || username}!`);

            // Start main menu
            await mainMenu();
        });
    });
}

// Start the application
main().catch(err => {
    console.error('Fatal error:', err);
    rl.close();
    process.exit(1);
});
