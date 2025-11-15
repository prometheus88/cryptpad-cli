// contact-manager.js - Advanced contact management functions

const session = require('./session');
const mailbox = require('./mailbox');

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
 * Note: This moves the friend from friends_pending to friends
 */
const acceptFriendRequest = (identifier, callback) => {
    if (!session.isAuthenticated()) {
        return callback(new Error('Not authenticated'));
    }
    
    const proxy = session.getProxy();
    
    if (!proxy.friends_pending) {
        return callback(new Error('No pending requests'));
    }
    
    // Find pending request
    let curvePublicToAccept = null;
    let requestData = null;
    
    if (proxy.friends_pending[identifier]) {
        curvePublicToAccept = identifier;
        requestData = proxy.friends_pending[identifier];
    } else {
        // Search by display name
        const normalizedIdentifier = identifier.toLowerCase();
        for (const [curvePublic, data] of Object.entries(proxy.friends_pending)) {
            if (data.displayName && 
                data.displayName.toLowerCase() === normalizedIdentifier) {
                curvePublicToAccept = curvePublic;
                requestData = data;
                break;
            }
        }
    }
    
    if (!curvePublicToAccept) {
        return callback(new Error(`Pending request not found: ${identifier}`));
    }
    
    // Move from pending to friends
    proxy.friends = proxy.friends || {};
    proxy.friends[curvePublicToAccept] = requestData;
    delete proxy.friends_pending[curvePublicToAccept];
    
    // Sync the changes
    const rt = session.getRealtime();
    if (rt && rt.sync) {
        rt.sync();
        
        setTimeout(() => {
            callback(null, {
                accepted: true,
                name: requestData.displayName,
                curvePublic: curvePublicToAccept
            });
        }, 500);
    } else {
        callback(null, {
            accepted: true,
            name: requestData.displayName,
            curvePublic: curvePublicToAccept,
            note: 'Changes queued but sync unavailable'
        });
    }
};

/**
 * Reject/decline a pending friend request
 */
const rejectFriendRequest = (identifier, callback) => {
    if (!session.isAuthenticated()) {
        return callback(new Error('Not authenticated'));
    }
    
    const proxy = session.getProxy();
    
    if (!proxy.friends_pending) {
        return callback(new Error('No pending requests'));
    }
    
    // Find pending request
    let curvePublicToReject = null;
    let requestName = null;
    
    if (proxy.friends_pending[identifier]) {
        curvePublicToReject = identifier;
        requestName = proxy.friends_pending[identifier].displayName;
    } else {
        // Search by display name
        const normalizedIdentifier = identifier.toLowerCase();
        for (const [curvePublic, data] of Object.entries(proxy.friends_pending)) {
            if (data.displayName && 
                data.displayName.toLowerCase() === normalizedIdentifier) {
                curvePublicToReject = curvePublic;
                requestName = data.displayName;
                break;
            }
        }
    }
    
    if (!curvePublicToReject) {
        return callback(new Error(`Pending request not found: ${identifier}`));
    }
    
    // Remove from pending
    delete proxy.friends_pending[curvePublicToReject];
    
    // Sync the changes
    const rt = session.getRealtime();
    if (rt && rt.sync) {
        rt.sync();
        
        setTimeout(() => {
            callback(null, {
                rejected: true,
                name: requestName,
                curvePublic: curvePublicToReject
            });
        }, 500);
    } else {
        callback(null, {
            rejected: true,
            name: requestName,
            curvePublic: curvePublicToReject,
            note: 'Changes queued but sync unavailable'
        });
    }
};

module.exports = {
    getProfileUrls,
    getPendingRequests,
    removeFriend,
    acceptFriendRequest,
    rejectFriendRequest
};

