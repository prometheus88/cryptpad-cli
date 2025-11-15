#!/usr/bin/env node

const WebSocket = require('../../node_modules/ws');
const CpNetflux = require('../../node_modules/chainpad-netflux');
const CpCrypto = require('../../node_modules/chainpad-crypto');
const session = require('./session');

// Ensure WebSocket is available globally for chainpad-netflux
if (typeof(globalThis.WebSocket) === 'undefined') {
    globalThis.WebSocket = WebSocket;
}

/**
 * Get the mailbox configuration from the proxy
 */
const getMailboxConfig = (mailboxName = 'notifications') => {
    if (!session.isAuthenticated()) {
        throw new Error('Not authenticated');
    }

    const proxy = session.getProxy();
    const mailbox = proxy.mailboxes && proxy.mailboxes[mailboxName];
    
    if (!mailbox || !mailbox.channel) {
        throw new Error(`Mailbox '${mailboxName}' not found or not configured`);
    }

    // Use mailbox-specific keys if available, otherwise use user's main curve keys
    const keys = mailbox.keys || {
        curvePrivate: proxy.curvePrivate,
        curvePublic: proxy.curvePublic
    };

    if (!keys.curvePrivate || !keys.curvePublic) {
        throw new Error('Missing curve keys for mailbox decryption');
    }

    return {
        channel: mailbox.channel,
        keys: keys,
        lastKnownHash: mailbox.lastKnownHash || null
    };
};

/**
 * Read messages from a mailbox
 * @param {string} wsUrl - WebSocket URL
 * @param {string} mailboxName - Name of the mailbox (default: 'notifications')
 * @param {function} callback - Callback(error, messages)
 */
const readMailbox = (wsUrl, mailboxName, callback) => {
    console.log(`Reading mailbox: ${mailboxName}...`);

    let mailboxConfig;
    try {
        mailboxConfig = getMailboxConfig(mailboxName);
    } catch (err) {
        return callback(err);
    }

    const proxy = session.getProxy();
    const messages = [];
    let cpNf;

    // Create mailbox encryptor for decryption
    const encryptor = CpCrypto.Mailbox.createEncryptor({
        curvePublic: mailboxConfig.keys.curvePublic,
        curvePrivate: mailboxConfig.keys.curvePrivate
    });

    const config = {
        websocketURL: wsUrl,
        channel: mailboxConfig.channel,
        noChainPad: true,
        crypto: {
            encrypt: (msg) => {
                console.error('Should not be encrypting in read-only mode');
                return msg;
            },
            decrypt: (msg) => {
                // Message format: the raw message content (base64 ciphertext)
                try {
                    const decrypted = encryptor.decrypt(msg);
                    if (!decrypted) {
                        console.error('Failed to decrypt message');
                        return null;
                    }
                    return decrypted.content;
                } catch (e) {
                    console.error('Decryption error:', e.message);
                    return null;
                }
            }
        },
        validateKey: mailboxConfig.keys.validateKey || proxy.edPublic,
        owners: [],
        onMessage: function (msg, user, vKey, isCp, hash, author, data) {
            if (!msg) { return; }
            
            const time = data && data.time;
            try {
                const parsed = JSON.parse(msg);
                parsed.time = time;
                if (author) { parsed.author = author; }
                if (hash) { parsed.hash = hash; }
                messages.push(parsed);
                console.log(`Received message: ${parsed.type || 'unknown type'}`);
            } catch (e) {
                console.error('Failed to parse message:', e.message);
            }
        },
        onError: (err) => {
            console.error('Mailbox error:', err);
            if (cpNf && typeof cpNf.stop === 'function') {
                cpNf.stop();
            }
            callback(err);
        },
        onChannelError: (err) => {
            console.error('Mailbox channel error:', err);
            if (cpNf && typeof cpNf.stop === 'function') {
                cpNf.stop();
            }
            callback(err);
        },
        onReady: function () {
            console.log(`Mailbox ready. Found ${messages.length} messages.`);
            if (cpNf && typeof cpNf.stop === 'function') {
                cpNf.stop();
            }
            callback(null, messages);
        }
    };

    cpNf = CpNetflux.start(config);
};

/**
 * Get pending friend requests from the notifications mailbox
 * @param {string} wsUrl - WebSocket URL
 * @param {function} callback - Callback(error, requests)
 */
const getPendingRequests = (wsUrl, callback) => {
    readMailbox(wsUrl, 'notifications', (err, messages) => {
        if (err) {
            return callback(err);
        }

        // Filter for friend request messages
        const friendRequests = messages
            .filter(msg => msg.type === 'FRIEND_REQUEST')
            .map(msg => {
                const userData = msg.content && (msg.content.user || msg.content);
                return {
                    type: msg.type,
                    hash: msg.hash,
                    time: msg.time,
                    author: msg.author || userData.curvePublic,
                    displayName: userData.displayName || 'Unknown',
                    curvePublic: userData.curvePublic,
                    edPublic: userData.edPublic,
                    profile: userData.profile,
                    avatar: userData.avatar,
                    notifications: userData.notifications
                };
            });

        callback(null, friendRequests);
    });
};

module.exports = {
    readMailbox,
    getPendingRequests,
    getMailboxConfig
};

