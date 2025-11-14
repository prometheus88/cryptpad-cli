// contacts.js - Manage contacts and friend list

const session = require('./session');

// Get friend list from proxy
const getFriendList = () => {
    if (!session.isAuthenticated()) {
        throw new Error('Not authenticated');
    }
    
    const proxy = session.getProxy();
    
    if (!proxy || !proxy.friends) {
        return {};
    }
    
    return proxy.friends;
};

// Get a specific friend by curve public key or display name
const getFriend = (identifier) => {
    const friends = getFriendList();
    
    // Try to find by exact curve public key
    if (friends[identifier]) {
        return {
            curvePublic: identifier,
            ...friends[identifier]
        };
    }
    
    // Try to find by display name (case insensitive)
    const normalizedIdentifier = identifier.toLowerCase();
    for (const [curvePublic, friendData] of Object.entries(friends)) {
        if (friendData.displayName && 
            friendData.displayName.toLowerCase() === normalizedIdentifier) {
            return {
                curvePublic: curvePublic,
                ...friendData
            };
        }
    }
    
    return null;
};

// Get all friends as an array with formatted data
const getAllContacts = () => {
    const friends = getFriendList();
    const contacts = [];
    
    for (const [curvePublic, friendData] of Object.entries(friends)) {
        contacts.push({
            curvePublic: curvePublic,
            displayName: friendData.displayName || 'Unknown',
            channel: friendData.channel,
            profile: friendData.profile,
            avatar: friendData.avatar,
            notifications: friendData.notifications,
            edPublic: friendData.edPublic
        });
    }
    
    // Sort by display name
    contacts.sort((a, b) => {
        return a.displayName.localeCompare(b.displayName);
    });
    
    return contacts;
};

// Check if a user is in the friend list
const isFriend = (identifier) => {
    return getFriend(identifier) !== null;
};

module.exports = {
    getFriendList,
    getFriend,
    getAllContacts,
    isFriend
};

