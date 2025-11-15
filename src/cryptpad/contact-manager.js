// contact-manager.js - Advanced contact management functions

const session = require('./session');
const mailbox = require('./mailbox');
const mailboxSender = require('./mailbox-sender');

/**
 * Get user's shareable profile URLs
 */
const getProfileUrls = () => {
    if (!session.isAuthenticated()) {
        throw new Error('Not authenticated');
    }
    
    const proxy = session.getProxy();
    
    if (!proxy.profile) {
        return null;
    }
    
    return {
        edit: proxy.profile.edit,
        view: proxy.profile.view
    };
};

/**
 * Get pending friend requests
 * This reads from the notifications mailbox to get unprocessed friend requests
 */
const getPendingRequests = (wsUrl, callback) => {
    if (!session.isAuthenticated()) {
        return callback(new Error('Not authenticated'));
    }
    
    // Use the mailbox module to read pending requests
    mailbox.getPendingRequests(wsUrl, callback);
};

/**
 * Remove a friend/contact
 * Note: This modifies the proxy but requires the realtime to be synced
 */
const removeFriend = (identifier, callback) => {
    if (!session.isAuthenticated()) {
        return callback(new Error('Not authenticated'));
    }
    
    const proxy = session.getProxy();
    
    if (!proxy.friends) {
        return callback(new Error('No friends list found'));
    }
    
    // Find friend by curve public key or display name
    let curvePublicToRemove = null;
    let friendName = null;
    
    // Try direct curve public key lookup
    if (proxy.friends[identifier]) {
        curvePublicToRemove = identifier;
        friendName = proxy.friends[identifier].displayName;
    } else {
        // Search by display name (case insensitive)
        const normalizedIdentifier = identifier.toLowerCase();
        for (const [curvePublic, friendData] of Object.entries(proxy.friends)) {
            if (friendData.displayName && 
                friendData.displayName.toLowerCase() === normalizedIdentifier) {
                curvePublicToRemove = curvePublic;
                friendName = friendData.displayName;
                break;
            }
        }
    }
    
    if (!curvePublicToRemove) {
        return callback(new Error(`Friend not found: ${identifier}`));
    }
    
    // Remove the friend
    delete proxy.friends[curvePublicToRemove];
    
    // Sync the changes
    const rt = session.getRealtime();
    if (rt && rt.sync) {
        rt.sync();
        
        // Wait for sync to complete
        setTimeout(() => {
            callback(null, {
                removed: true,
                name: friendName,
                curvePublic: curvePublicToRemove
            });
        }, 500);
    } else {
        callback(null, {
            removed: true,
            name: friendName,
            curvePublic: curvePublicToRemove,
            note: 'Changes queued but sync unavailable'
        });
    }
};

/**
 * Accept a pending friend request
 * Note: This moves the friend from friends_pending to friends and sends acceptance message
 */
const acceptFriendRequest = (wsUrl, identifier, callback) => {
    if (!session.isAuthenticated()) {
        return callback(new Error('Not authenticated'));
    }
    
    // First, get the pending request from mailbox
    mailbox.getPendingRequests(wsUrl, (err, pending) => {
        if (err) {
            return callback(err);
        }
        
        // Find the request to accept
        let requestToAccept = null;
        
        // Try exact match on display name first
        requestToAccept = pending.find(req => 
            req.displayName.toLowerCase() === identifier.toLowerCase()
        );
        
        // Try curve public key match
        if (!requestToAccept) {
            requestToAccept = pending.find(req => req.curvePublic === identifier);
        }
        
        if (!requestToAccept) {
            return callback(new Error(`Pending request not found: ${identifier}`));
        }
        
        // Use mailbox sender to accept
        mailboxSender.acceptFriendRequest(requestToAccept, callback);
    });
};

/**
 * Reject/decline a pending friend request
 */
const rejectFriendRequest = (wsUrl, identifier, callback) => {
    if (!session.isAuthenticated()) {
        return callback(new Error('Not authenticated'));
    }
    
    // First, get the pending request from mailbox
    mailbox.getPendingRequests(wsUrl, (err, pending) => {
        if (err) {
            return callback(err);
        }
        
        // Find the request to reject
        let requestToReject = null;
        
        // Try exact match on display name first
        requestToReject = pending.find(req => 
            req.displayName.toLowerCase() === identifier.toLowerCase()
        );
        
        // Try curve public key match
        if (!requestToReject) {
            requestToReject = pending.find(req => req.curvePublic === identifier);
        }
        
        if (!requestToReject) {
            return callback(new Error(`Pending request not found: ${identifier}`));
        }
        
        // Use mailbox sender to decline
        mailboxSender.declineFriendRequest(requestToReject, callback);
    });
};

module.exports = {
    getProfileUrls,
    getPendingRequests,
    removeFriend,
    acceptFriendRequest,
    rejectFriendRequest,
    sendFriendRequest: mailboxSender.sendFriendRequest
};

