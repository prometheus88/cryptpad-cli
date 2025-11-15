// session.js - Manage authenticated session state

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class Session {
    constructor() {
        this.authenticated = false;
        this.username = null;
        this.userHash = null;
        this.blockHash = null;
        this.keys = null;
        this.proxy = null;
        this.rt = null;
        this.network = null;
        this.edPublic = null;
        this.curvePublic = null;
        this.displayName = null;
        this.sessionFile = path.join(process.env.HOME || process.env.USERPROFILE, '.cryptpad-cli-session.json');
    }

    isAuthenticated() {
        return this.authenticated;
    }

    getUsername() {
        return this.username;
    }

    getUserInfo() {
        return {
            username: this.username,
            displayName: this.displayName,
            edPublic: this.edPublic,
            curvePublic: this.curvePublic,
            authenticated: this.authenticated
        };
    }

    setAuthData(data) {
        this.authenticated = true;
        this.username = data.username;
        this.userHash = data.userHash;
        this.blockHash = data.blockHash;
        this.keys = data.keys;
        this.proxy = data.proxy;
        this.rt = data.rt;
        this.network = data.network;
        this.edPublic = data.edPublic;
        this.curvePublic = data.curvePublic;
        this.displayName = data.displayName || data.username;
    }

    getProxy() {
        return this.proxy;
    }

    getRealtime() {
        return this.rt;
    }

    async getNetwork() {
        // Network might be a Promise, resolve it
        if (this.network && typeof this.network.then === 'function') {
            return await this.network;
        }
        return this.network;
    }

    async getHistoryKeeper() {
        const network = await this.getNetwork();
        return network ? network.historyKeeper : null;
    }

    clear() {
        this.authenticated = false;
        this.username = null;
        this.userHash = null;
        this.blockHash = null;
        this.keys = null;
        this.proxy = null;
        this.edPublic = null;
        this.curvePublic = null;
        this.displayName = null;
        
        // Stop realtime if it exists
        if (this.rt) {
            try {
                this.rt.stop();
            } catch (e) {
                // Ignore errors during cleanup
            }
            this.rt = null;
        }
        
        this.network = null;
    }

    // Save session to disk (basic encryption)
    save() {
        if (!this.authenticated) {
            return;
        }

        const sessionData = {
            username: this.username,
            userHash: this.userHash,
            blockHash: this.blockHash,
            displayName: this.displayName,
            edPublic: this.edPublic,
            curvePublic: this.curvePublic,
            timestamp: Date.now()
        };

        try {
            // Simple encryption using crypto
            const key = crypto.scryptSync('cryptpad-cli-session', 'salt', 32);
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
            
            let encrypted = cipher.update(JSON.stringify(sessionData), 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const data = {
                iv: iv.toString('hex'),
                encrypted: encrypted
            };
            
            fs.writeFileSync(this.sessionFile, JSON.stringify(data));
        } catch (err) {
            console.error('Failed to save session:', err.message);
        }
    }

    // Load session from disk
    load() {
        try {
            if (!fs.existsSync(this.sessionFile)) {
                return false;
            }

            const data = JSON.parse(fs.readFileSync(this.sessionFile, 'utf8'));
            const key = crypto.scryptSync('cryptpad-cli-session', 'salt', 32);
            const iv = Buffer.from(data.iv, 'hex');
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            
            let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            const sessionData = JSON.parse(decrypted);
            
            // Check if session is not too old (24 hours)
            const age = Date.now() - sessionData.timestamp;
            if (age > 24 * 60 * 60 * 1000) {
                this.clearSavedSession();
                return false;
            }
            
            return sessionData;
        } catch (err) {
            console.error('Failed to load session:', err.message);
            this.clearSavedSession();
            return false;
        }
    }

    clearSavedSession() {
        try {
            if (fs.existsSync(this.sessionFile)) {
                fs.unlinkSync(this.sessionFile);
            }
        } catch (err) {
            // Ignore errors
        }
    }
}

// Singleton instance
const session = new Session();

module.exports = session;

