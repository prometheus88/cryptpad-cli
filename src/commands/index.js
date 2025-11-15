const auth = require('../cryptpad/auth');
const session = require('../cryptpad/session');
const contacts = require('../cryptpad/contacts');
const messenger = require('../cryptpad/messenger');
const contactManager = require('../cryptpad/contact-manager');

module.exports = function(env) {
    const { fs } = env;

    function print(line = '') {
        env.stdout.write(line + '\n');
    }

    async function cmd_help() {
        print('Available commands:');
        print('');
        print('Authentication:');
        print('  login <username> <password>        Login to CryptPad');
        print('  logout                             Logout from CryptPad');
        print('  whoami                             Show current user info');
        print('  status                             Show connection status');
        print('');
        print('Contacts & Messaging:');
        print('  contacts                           List all contacts');
        print('  profile                            Show your shareable profile URL');
        print('  pending                            List pending friend requests');
        print('  remove <contact>                   Remove a contact/friend');
        print('  accept <contact>                   Accept pending friend request');
        print('  reject <contact>                   Reject pending friend request');
        print('  messages <contact>                 Show message history with contact');
        print('  send <contact> <message>           Send message to contact');
        print('');
        print('Drive Management:');
        print('  pwd                                Print working directory');
        print('  ls [path]                          List directory');
        print('  info <name>                        Show info for root item');
        print('  cat <name>                         Show URL/content for file item');
        print('  cd <path>                          Change directory');
        print('  mv <source> <target>               Move document to folder');
        print('  rename <old> <new>                 Rename folder');
        print('  download <name> [path]             Download pad to local file');
        print('  create <type> <title> [password]   Create new pad (optionally password-protected)');
        print('');
        print('Other:');
        print('  clear                              Clear the screen');
        print('  exit                               Exit the shell');
    }

    async function cmd_pwd() {
        if (typeof fs.getPath === 'function') {
            print(fs.getPath());
        } else {
            print(env.cwd);
        }
    }

    async function cmd_ls(args) {
        const path = fs.join(env.cwd, args[0] || '.');
        const items = typeof fs.listDisplay === 'function' ? await fs.listDisplay(path) : await fs.list(path);
        if (!items.length) return;
        print('');
        print(items.join('\n'));
    }

    async function cmd_cd(args) {
        if (!args[0]) throw new Error('Usage: cd <path>');
        const result = await fs.changeDir(env.cwd, args[0]);
        if (typeof result === 'string') {
            env.cwd = result;
            print('Changed folder to ' + args[0]);
        } else if (result && typeof result === 'object' && 'path' in result) {
            env.cwd = result.path;
            if (result.message) print(result.message);
        } else {
            env.cwd = '/';
        }
    }

    async function cmd_info(args) {
        if (!args[0]) throw new Error('Usage: info <name>');
        if (typeof fs.info !== 'function') throw new Error('info not supported by filesystem');
        const data = await fs.info(env.cwd, args[0]);
        const text = JSON.stringify(data, null, 2);
        print(text);
    }

async function cmd_cat(args) {
    if (!args[0]) throw new Error('Usage: cat <name>');
    if (typeof fs.cat !== 'function') throw new Error('cat not supported by filesystem');
    const res = await fs.cat(env.cwd, args[0], print);
    if (res && res.url) {
        print(res.url);
    }
    if (res && res.content !== undefined) {
        print('');
        print(String(res.content));
    }
}

async function cmd_mv(args) {
    if (!args[0]) throw new Error('Usage: mv <source> <target>');
    if (!args[1]) throw new Error('Usage: mv <source> <target>');
    if (typeof fs.mv !== 'function') throw new Error('mv not supported by filesystem');
    const res = await fs.mv(env.cwd, args[0], args[1]);
    if (res && res.message) {
        print(res.message);
    }
}

async function cmd_rename(args) {
    if (!args[0]) throw new Error('Usage: rename <oldName> <newName>');
    if (!args[1]) throw new Error('Usage: rename <oldName> <newName>');
    if (typeof fs.rename !== 'function') throw new Error('rename not supported by filesystem');
    const res = await fs.rename(env.cwd, args[0], args[1]);
    if (res && res.message) {
        print(res.message);
    }
}

async function cmd_download(args) {
    if (!args[0]) throw new Error('Usage: download <name> [localPath]');
    if (typeof fs.download !== 'function') throw new Error('download not supported by filesystem');
    const res = await fs.download(env.cwd, args[0], args[1]);
    if (res && res.message) {
        print(res.message);
    }
}

async function cmd_create(args) {
    if (!args[0]) throw new Error('Usage: create <padType> <title> [password]');
    if (!args[1]) throw new Error('Usage: create <padType> <title> [password]');
    if (typeof fs.create !== 'function') throw new Error('create not supported by filesystem');
    
    const padType = args[0];
    const title = args[1];
    const password = args[2]; // Optional password parameter
    
    const res = await fs.create(env.cwd, padType, title, password);
    if (res && res.message) {
        print(res.message);
    }
    if (res && res.data) {
        print('');
        print('Prepared data:');
        print(JSON.stringify(res.data, null, 2));
    }
    if (password) {
        print('');
        print('🔐 Password protection enabled');
        print('⚠️  Users will need to enter the password when opening the document');
        print('💡 Share the URL and password securely (preferably through different channels)');
    }
}

    async function cmd_clear() {
        // ANSI clear screen
        print('\x1Bc');
    }

    async function cmd_exit() {
        messenger.closeAllChannels();
        process.exit(0);
    }

    // Authentication commands
    async function cmd_login(args) {
        if (!args[0] || !args[1]) {
            throw new Error('Usage: login <username> <password>');
        }

        if (session.isAuthenticated()) {
            print('Already logged in as ' + session.getUsername());
            print('Use "logout" first if you want to switch accounts');
            return;
        }

        const username = args[0];
        const password = args[1];
        
        // Get URLs from env (required)
        const wsUrl = env.wsUrl;
        const baseUrl = env.baseUrl;

        if (!wsUrl || !baseUrl) {
            throw new Error('Server URLs not configured. Please restart the CLI with CRYPTPAD_BASE_URL and CRYPTPAD_WS_URL set.');
        }

        print('Logging in as ' + username + '...');

        return new Promise((resolve, reject) => {
            auth.login(username, password, wsUrl, baseUrl, (err, userData) => {
                if (err) {
                    print('✗ Login failed: ' + err.message);
                    reject(err);
                    return;
                }

                print('');
                print('✓ Login successful!');
                print('  Username: ' + userData.displayName);
                print('  Public Key: ' + (userData.curvePublic || 'N/A').slice(0, 16) + '...');
                
                const friendCount = Object.keys(userData.proxy.friends || {}).length;
                print('  Contacts: ' + friendCount);
                print('');
                
                // Update prompt if available
                if (env.updatePrompt) {
                    env.updatePrompt();
                }
                
                resolve();
            });
        });
    }

    async function cmd_logout() {
        if (!session.isAuthenticated()) {
            print('Not logged in');
            return;
        }

        const username = session.getUsername();
        messenger.closeAllChannels();
        auth.logout();
        print('✓ Logged out from ' + username);
        
        // Update prompt if available
        if (env.updatePrompt) {
            env.updatePrompt();
        }
    }

    async function cmd_whoami() {
        if (!session.isAuthenticated()) {
            print('Not logged in');
            print('Use "login <username> <password>" to authenticate');
            return;
        }

        const userInfo = session.getUserInfo();
        print('');
        print('Current User:');
        print('  Username: ' + userInfo.username);
        print('  Display Name: ' + userInfo.displayName);
        print('  Ed Public: ' + (userInfo.edPublic || 'N/A'));
        print('  Curve Public: ' + (userInfo.curvePublic || 'N/A'));
        
        const proxy = session.getProxy();
        const friendCount = Object.keys(proxy.friends || {}).length;
        print('  Contacts: ' + friendCount);
        print('');
    }

    async function cmd_status() {
        print('');
        print('CryptPad CLI Status:');
        print('  Authenticated: ' + (session.isAuthenticated() ? '✓ Yes' : '✗ No'));
        
        if (session.isAuthenticated()) {
            print('  User: ' + session.getUsername());
            const rt = session.getRealtime();
            print('  Drive Connected: ' + (rt ? '✓ Yes' : '✗ No'));
        }
        print('');
    }

    // Contacts & Messaging commands
    async function cmd_profile() {
        if (!session.isAuthenticated()) {
            throw new Error('Not authenticated. Use "login" command first.');
        }

        const profileUrls = contactManager.getProfileUrls();
        
        if (!profileUrls) {
            print('');
            print('❌ No profile set up yet.');
            print('   Create one through the web interface at:');
            print('   ' + (env.baseUrl || 'https://cryptpad.fr') + '/profile/');
            print('');
            return;
        }

        const baseUrl = env.baseUrl || 'https://cryptpad.fr';
        
        print('');
        print('='.repeat(60));
        print('👤 Your CryptPad Profile');
        print('='.repeat(60));
        print('');
        print('📝 Edit Your Profile:');
        print('   ' + baseUrl + profileUrls.edit);
        print('');
        print('🔗 Share Your Profile (Public View):');
        print('   ' + baseUrl + profileUrls.view);
        print('');
        print('💡 Anyone with the view link can see your public profile');
        print('   and send you a friend request!');
        print('');
    }

    async function cmd_pending() {
        if (!session.isAuthenticated()) {
            throw new Error('Not authenticated. Use "login" command first.');
        }

        print('');
        print('📨 Pending Friend Requests:');
        print('  Reading notifications mailbox...');
        print('');

        return new Promise((resolve, reject) => {
            contactManager.getPendingRequests(env.wsUrl, (err, pending) => {
                if (err) {
                    print('✗ Failed to read pending requests: ' + err.message);
                    reject(err);
                    return;
                }

                if (pending.length === 0) {
                    print('  No pending requests');
                } else {
                    pending.forEach((request, index) => {
                        const num = String(index + 1).padStart(3, ' ');
                        print('  ' + num + '. ' + request.displayName);
                        print('       Curve Public: ' + request.curvePublic.slice(0, 20) + '...');
                        if (request.time) {
                            const date = new Date(request.time);
                            print('       Received: ' + date.toLocaleString());
                        }
                        print('       Use "accept ' + request.displayName + '" or "reject ' + request.displayName + '"');
                        print('');
                    });
                }
                
                print('');
                resolve();
            });
        });
    }

    async function cmd_remove(args) {
        if (!session.isAuthenticated()) {
            throw new Error('Not authenticated. Use "login" command first.');
        }

        if (!args[0]) {
            throw new Error('Usage: remove <contact>');
        }

        const identifier = args[0];
        
        print('Removing contact: ' + identifier + '...');

        return new Promise((resolve, reject) => {
            contactManager.removeFriend(identifier, (err, result) => {
                if (err) {
                    print('✗ Failed to remove contact: ' + err.message);
                    reject(err);
                    return;
                }

                print('✓ Removed ' + result.name + ' from your contacts');
                print('  Curve Public: ' + result.curvePublic.slice(0, 20) + '...');
                resolve();
            });
        });
    }

    async function cmd_accept(args) {
        if (!session.isAuthenticated()) {
            throw new Error('Not authenticated. Use "login" command first.');
        }

        if (!args[0]) {
            throw new Error('Usage: accept <contact>');
        }

        const identifier = args[0];
        
        print('Accepting friend request from: ' + identifier + '...');

        return new Promise((resolve, reject) => {
            contactManager.acceptFriendRequest(identifier, (err, result) => {
                if (err) {
                    print('✗ Failed to accept request: ' + err.message);
                    reject(err);
                    return;
                }

                print('✓ Accepted friend request from ' + result.name);
                print('  You can now message them using: send ' + result.name + ' <message>');
                resolve();
            });
        });
    }

    async function cmd_reject(args) {
        if (!session.isAuthenticated()) {
            throw new Error('Not authenticated. Use "login" command first.');
        }

        if (!args[0]) {
            throw new Error('Usage: reject <contact>');
        }

        const identifier = args[0];
        
        print('Rejecting friend request from: ' + identifier + '...');

        return new Promise((resolve, reject) => {
            contactManager.rejectFriendRequest(identifier, (err, result) => {
                if (err) {
                    print('✗ Failed to reject request: ' + err.message);
                    reject(err);
                    return;
                }

                print('✓ Rejected friend request from ' + result.name);
                resolve();
            });
        });
    }

    async function cmd_contacts() {
        if (!session.isAuthenticated()) {
            throw new Error('Not authenticated. Use "login" command first.');
        }

        const contactsList = contacts.getAllContacts();
        
        if (contactsList.length === 0) {
            print('No contacts found');
            print('You can add friends through the CryptPad web interface');
            return;
        }

        print('');
        print('Contacts (' + contactsList.length + '):');
        print('');

        contactsList.forEach((contact, index) => {
            const num = String(index + 1).padStart(3, ' ');
            const name = contact.displayName.padEnd(30, ' ');
            const key = contact.curvePublic.slice(0, 12) + '...';
            print('  ' + num + '. ' + name + ' ' + key);
        });
        
        print('');
    }

    async function cmd_messages(args) {
        if (!session.isAuthenticated()) {
            throw new Error('Not authenticated. Use "login" command first.');
        }

        if (!args[0]) {
            throw new Error('Usage: messages <contact>');
        }

        const identifier = args[0];
        const friend = contacts.getFriend(identifier);

        if (!friend) {
            print('Contact not found: ' + identifier);
            print('Use "contacts" command to see your contact list');
            return;
        }

        print('Loading messages with ' + friend.displayName + '...');

        const wsUrl = env.wsUrl;
        if (!wsUrl) {
            throw new Error('WebSocket URL not configured');
        }

        const proxy = session.getProxy();
        const myPublic = proxy.curvePublic;

        return new Promise((resolve, reject) => {
            messenger.getMessages(friend, wsUrl, (err, messages) => {
                if (err) {
                    print('✗ Failed to load messages: ' + err.message);
                    reject(err);
                    return;
                }

                print('');
                print('=== Messages with ' + friend.displayName + ' ===');
                print('');

                if (messages.length === 0) {
                    print('  No messages yet');
                } else {
                    messages.forEach((msg) => {
                        const date = new Date(msg.timestamp);
                        const timeStr = date.toLocaleString();
                        const isMe = msg.author === myPublic;
                        const sender = isMe ? 'You' : (msg.displayName || friend.displayName);
                        
                        print('[' + timeStr + '] ' + sender + ': ' + msg.content);
                    });
                }

                print('');
                resolve();
            });
        });
    }

    async function cmd_send(args) {
        if (!session.isAuthenticated()) {
            throw new Error('Not authenticated. Use "login" command first.');
        }

        if (!args[0] || !args[1]) {
            throw new Error('Usage: send <contact> <message>');
        }

        const identifier = args[0];
        const message = args.slice(1).join(' ');

        const friend = contacts.getFriend(identifier);

        if (!friend) {
            print('Contact not found: ' + identifier);
            print('Use "contacts" command to see your contact list');
            return;
        }

        print('Sending message to ' + friend.displayName + '...');

        const wsUrl = env.wsUrl;
        if (!wsUrl) {
            throw new Error('WebSocket URL not configured');
        }

        return new Promise((resolve, reject) => {
            messenger.sendMessage(friend, message, wsUrl, (err) => {
                if (err) {
                    print('✗ Failed to send message: ' + err.message);
                    reject(err);
                    return;
                }

                print('✓ Message sent to ' + friend.displayName);
                resolve();
            });
        });
    }

    return {
        // Authentication
        login: cmd_login,
        logout: cmd_logout,
        whoami: cmd_whoami,
        status: cmd_status,
        // Contacts & Messaging
        contacts: cmd_contacts,
        profile: cmd_profile,
        pending: cmd_pending,
        remove: cmd_remove,
        accept: cmd_accept,
        reject: cmd_reject,
        messages: cmd_messages,
        send: cmd_send,
        // Drive Management
        help: cmd_help,
        pwd: cmd_pwd,
        ls: cmd_ls,
        info: cmd_info,
        cat: cmd_cat,
        cd: cmd_cd,
        mv: cmd_mv,
        rename: cmd_rename,
        download: cmd_download,
        create: cmd_create,
        // Other
        clear: cmd_clear,
        exit: cmd_exit,
    };
};



