#!/usr/bin/env node

/**
 * Mailbox Sender - Send encrypted messages to CryptPad mailboxes
 * 
 * This module handles sending encrypted messages to other users' mailboxes,
 * including friend requests, acceptances, and declines.
 */

const CpCrypto = require('../../node_modules/chainpad-crypto');
const session = require('./session');
const rpcClient = require('./rpc-client');

// Global RPC client instance
let globalRpcClient = null;

/**
 * Create user data for messaging (similar to Messaging.createData)
 */
const createUserData = (includeChannel = true) => {
    if (!session.isAuthenticated()) {
        throw new Error('Not authenticated');
    }

    const proxy = session.getProxy();
    const data = {
        curvePublic: proxy.curvePublic,
        edPublic: proxy.edPublic,
        displayName: proxy[proxy.displayNameKey] || 'Anonymous',
        notifications: proxy.mailboxes?.notifications?.channel,
        avatar: proxy.profile?.avatar,
        profile: proxy.profile?.view
    };

    // Include channel for messaging
    if (includeChannel) {
        // Generate a new channel for this friendship
        const crypto = require('crypto');
        data.channel = crypto.randomBytes(16).toString('hex');
    }

    return data;
};

/**
 * Generate a unique transaction ID
 */
const generateTxid = () => {
    return require('crypto').randomBytes(16).toString('hex');
};

/**
 * Send a message to another user's mailbox using the existing Netflux network
 * 
 * @param {string} messageType - Type of message (e.g., 'FRIEND_REQUEST', 'ACCEPT_FRIEND_REQUEST', 'DECLINE_FRIEND_REQUEST')
 * @param {object} messageContent - Content to send
 * @param {object} recipient - Recipient info { channel: string, curvePublic: string }
 * @param {function} callback - Callback(error, result)
 */
const sendTo = async (messageType, messageContent, recipient, callback) => {
    if (!session.isAuthenticated()) {
        return callback(new Error('Not authenticated'));
    }

    const proxy = session.getProxy();
    
    let network, historyKeeper;
    try {
        network = await session.getNetwork();
        historyKeeper = await session.getHistoryKeeper();
    } catch (err) {
        return callback(new Error('Failed to get network: ' + err.message));
    }

    if (!network) {
        return callback(new Error('No network connection'));
    }

    if (!historyKeeper) {
        return callback(new Error('No history keeper found'));
    }

    // Validate recipient
    if (!recipient || !recipient.channel || !recipient.curvePublic) {
        return callback(new Error('Invalid recipient: missing channel or curvePublic'));
    }

    // Get our encryption keys
    const myKeys = {
        curvePrivate: proxy.curvePrivate,
        curvePublic: proxy.curvePublic
    };

    if (!myKeys.curvePrivate || !myKeys.curvePublic) {
        return callback(new Error('Missing curve keys'));
    }

    // Create the mailbox encryptor
    const crypto = CpCrypto.Mailbox.createEncryptor(myKeys);

    // Build the message object
    const messageObj = {
        type: messageType,
        content: messageContent
    };

    // Serialize and encrypt
    const text = JSON.stringify(messageObj);
    const ciphertext = crypto.encrypt(text, recipient.curvePublic);

    if (!ciphertext) {
        return callback(new Error('Encryption failed'));
    }

    console.log(`Sending ${messageType} to channel ${recipient.channel}...`);
    console.log(`Using history keeper: ${historyKeeper}`);

    // Generate transaction ID
    const txid = generateTxid();

    // Prepare RPC message: [txid, ['WRITE_PRIVATE_MESSAGE', [channel, ciphertext]]]
    const rpcMessage = [txid, ['WRITE_PRIVATE_MESSAGE', [recipient.channel, ciphertext]]];

    // Set up response handler
    const timeout = setTimeout(() => {
        network.off('message', onMessage);
        callback(new Error('RPC timeout'));
    }, 30000); // 30 second timeout

    const onMessage = (msg, sender) => {
        if (sender !== historyKeeper) return;

        try {
            const parsed = JSON.parse(msg);
            if (Array.isArray(parsed) && parsed[0] === txid) {
                clearTimeout(timeout);
                network.off('message', onMessage);

                const error = parsed[1];
                if (error) {
                    console.error('RPC Error:', error);
                    return callback(new Error(`RPC Error: ${error}`));
                }

                console.log('Message sent successfully!');
                callback(null, {
                    success: true,
                    hash: ciphertext.slice(0, 64),
                    channel: recipient.channel
                });
            }
        } catch (e) {
            // Not our message, ignore
        }
    };

    network.on('message', onMessage);

    // Send the RPC message
    network.sendto(historyKeeper, JSON.stringify(rpcMessage))
        .then(() => {
            console.log('RPC message sent to history keeper');
        })
        .catch(err => {
            clearTimeout(timeout);
            network.off('message', onMessage);
            callback(new Error(`Failed to send: ${err.message}`));
        });
};

/**
 * Send a friend request to another user
 * 
 * @param {object} recipient - Recipient info { displayName: string, notifications: string, curvePublic: string, edPublic: string, profile: string }
 * @param {function} callback - Callback(error, result)
 */
const sendFriendRequest = (recipient, callback) => {
    console.log(`Sending friend request to: ${recipient.displayName || 'Unknown'}`);

    // Check if already friends
    const proxy = session.getProxy();
    if (proxy.friends && proxy.friends[recipient.curvePublic]) {
        return callback(new Error('Already friends with this user'));
    }

    // Check if already pending
    if (proxy.friends_pending && proxy.friends_pending[recipient.curvePublic]) {
        return callback(new Error('Friend request already sent'));
    }

    // Add to our pending list
    proxy.friends_pending = proxy.friends_pending || {};
    proxy.friends_pending[recipient.curvePublic] = {
        time: Date.now(),
        channel: recipient.notifications,
        curvePublic: recipient.curvePublic,
        displayName: recipient.displayName
    };

    // Create our user data to send
    const userData = createUserData(true);

    // Send the friend request message
    sendTo('FRIEND_REQUEST', { user: userData }, {
        channel: recipient.notifications,
        curvePublic: recipient.curvePublic
    }, (err, result) => {
        if (err) {
            // Remove from pending on error
            delete proxy.friends_pending[recipient.curvePublic];
            return callback(err);
        }

        // Sync the drive
        const rt = session.getRealtime();
        if (rt && rt.sync) {
            rt.sync();
        }

        callback(null, {
            sent: true,
            recipient: recipient.displayName,
            hash: result.hash
        });
    });
};

/**
 * Accept a friend request
 * 
 * @param {object} requester - Requester info { displayName: string, notifications: string, curvePublic: string, edPublic: string, channel: string }
 * @param {function} callback - Callback(error, result)
 */
const acceptFriendRequest = (requester, callback) => {
    console.log(`Accepting friend request from: ${requester.displayName || 'Unknown'}`);

    const proxy = session.getProxy();

    // Check if already friends
    if (proxy.friends && proxy.friends[requester.curvePublic]) {
        return callback(new Error('Already friends with this user'));
    }

    // Add to friends list
    proxy.friends = proxy.friends || {};
    proxy.friends[requester.curvePublic] = {
        displayName: requester.displayName,
        curvePublic: requester.curvePublic,
        edPublic: requester.edPublic,
        notifications: requester.notifications,
        channel: requester.channel || generateChannel(),
        profile: requester.profile,
        avatar: requester.avatar
    };

    // Remove from pending
    if (proxy.friends_pending && proxy.friends_pending[requester.curvePublic]) {
        delete proxy.friends_pending[requester.curvePublic];
    }

    // Create our user data to send back
    const friend = proxy.friends[requester.curvePublic];
    const userData = createUserData(false);
    userData.channel = friend.channel;

    // Send acceptance message
    sendTo('ACCEPT_FRIEND_REQUEST', { user: userData }, {
        channel: requester.notifications,
        curvePublic: requester.curvePublic
    }, (err, result) => {
        if (err) {
            // Rollback on error
            delete proxy.friends[requester.curvePublic];
            return callback(err);
        }

        // Sync the drive
        const rt = session.getRealtime();
        if (rt && rt.sync) {
            rt.sync();
        }

        callback(null, {
            accepted: true,
            friend: requester.displayName,
            hash: result.hash
        });
    });
};

/**
 * Decline a friend request
 * 
 * @param {object} requester - Requester info { notifications: string, curvePublic: string }
 * @param {function} callback - Callback(error, result)
 */
const declineFriendRequest = (requester, callback) => {
    console.log(`Declining friend request from: ${requester.displayName || 'Unknown'}`);

    // Send decline message
    sendTo('DECLINE_FRIEND_REQUEST', {}, {
        channel: requester.notifications,
        curvePublic: requester.curvePublic
    }, (err, result) => {
        if (err) {
            return callback(err);
        }

        callback(null, {
            declined: true,
            user: requester.displayName,
            hash: result.hash
        });
    });
};

/**
 * Generate a random channel ID for friend messaging
 */
const generateChannel = () => {
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('hex');
};

module.exports = {
    sendTo,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    createUserData
};

