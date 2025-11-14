# CryptPad CLI

Command-line interface for CryptPad with support for authentication, encrypted messaging, and drive management.

## 🚀 Features

- **🔐 Authentication**: Secure login to CryptPad accounts
- **💬 Encrypted Messaging**: Send and receive end-to-end encrypted messages
- **👥 Contact Management**: View and interact with your CryptPad contacts
- **📁 Drive Management**: Browse, create, and manage documents
- **🔒 Password Protection**: Create password-protected documents
- **🖥️ Interactive Shell**: Full-featured command-line shell

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/cryptpad/cryptpad-cli.git
cd cryptpad-cli

# Install dependencies
npm install

# Make binaries executable (Linux/macOS)
chmod +x bin/*
```

## ⚙️ Configuration

The CLI requires two environment variables to connect to your CryptPad instance:

- `CRYPTPAD_BASE_URL` - The HTTP(S) URL of your CryptPad server
- `CRYPTPAD_WS_URL` - The WebSocket URL of your CryptPad server

### Option 1: Export Environment Variables

```bash
# For a self-hosted instance
export CRYPTPAD_BASE_URL="http://your-server.com:3010"
export CRYPTPAD_WS_URL="ws://your-server.com:3013"

# For the official CryptPad instance (with SSL)
export CRYPTPAD_BASE_URL="https://cryptpad.fr"
export CRYPTPAD_WS_URL="wss://cryptpad.fr/cryptpad_websocket"
```

### Option 2: Use Inline Environment Variables

```bash
CRYPTPAD_BASE_URL="https://cryptpad.fr" \
CRYPTPAD_WS_URL="wss://cryptpad.fr/cryptpad_websocket" \
node bin/drive-cryptpad
```

### Option 3: Create a Shell Script

Create a file `run-cli.sh`:

```bash
#!/bin/bash
export CRYPTPAD_BASE_URL="https://cryptpad.fr"
export CRYPTPAD_WS_URL="wss://cryptpad.fr/cryptpad_websocket"
node bin/drive-cryptpad
```

Then run:
```bash
chmod +x run-cli.sh
./run-cli.sh
```

## 🎯 Quick Start

```bash
# Set your CryptPad server URLs (see Configuration above)
export CRYPTPAD_BASE_URL="https://cryptpad.fr"
export CRYPTPAD_WS_URL="wss://cryptpad.fr/cryptpad_websocket"

# Start the CLI
node bin/drive-cryptpad

# Login
cryptpad> login your-username your-password

# View your contacts
cryptpad[your-username]> contacts

# Send a message
cryptpad[your-username]> send Alice Hello from the CLI!

# Read messages
cryptpad[your-username]> messages Alice

# Create a document
cryptpad[your-username]> create pad "My Notes"

# List your documents
cryptpad[your-username]> ls

# Get help
cryptpad[your-username]> help

# Logout
cryptpad[your-username]> logout

# Exit
cryptpad> exit
```

## 📖 Available Commands

### Authentication & User Management
- `login <username> <password>` - Login to your CryptPad account
- `logout` - Logout from CryptPad
- `whoami` - Show current user information
- `status` - Show authentication and connection status

### Contacts & Messaging
- `contacts` - List all your contacts/friends
- `messages <contact>` - Show message history with a contact
- `send <contact> <message>` - Send an encrypted message to a contact

### Drive Management
- `ls [path]` - List documents and folders
- `cd <path>` - Change directory
- `pwd` - Print working directory
- `info <name>` - Display information about a document or folder
- `cat <name>` - Display content of a document
- `mv <source> <target>` - Move a document to another folder
- `rename <old> <new>` - Rename a folder
- `download <name> [path]` - Download a document to a local file
- `create <type> <title> [password]` - Create a new document (optionally password-protected)

### Utility Commands
- `help` - Show all available commands
- `clear` - Clear the screen
- `exit` - Exit the shell

## 🔒 Password-Protected Documents

Create documents with password protection for enhanced security:

```bash
# Create a password-protected pad
cryptpad> create pad "Secret Notes" MySecurePassword123

# Create a password-protected code document
cryptpad> create code "Private Code" StrongP@ssw0rd
```

**Security Notes:**
- 🔐 Passwords are used for client-side encryption
- 🔑 Both the URL and password are required to access the document
- 💡 Share URLs and passwords through different channels for maximum security
- ⚠️ Store passwords securely (use a password manager)

## 💬 Messaging Examples

### View Contacts
```bash
cryptpad[alice]> contacts

Contacts (3):

   1. Bob                            a5FwzTMWb7...
   2. Charlie                        vm+/CDgq7R...
   3. Dave                           rWkb52uWJK...
```

### Read Message History
```bash
cryptpad[alice]> messages Bob
Loading messages with Bob...

=== Messages with Bob ===

[2024-11-14 15:30:45] You: Hey Bob!
[2024-11-14 15:31:12] Bob: Hi Alice, how are you?
[2024-11-14 15:31:30] You: Great! Want to collaborate on a document?
[2024-11-14 15:32:00] Bob: Sure, send me the link!
```

### Send a Message
```bash
cryptpad[alice]> send Bob Check out this document: https://cryptpad.fr/pad/#/2/pad/edit/...
Sending message to Bob...
✓ Message sent to Bob
```

## 🏗️ Architecture

```
cryptpad-cli/
├── bin/
│   ├── cryptpad-cli        # Main executable (symlink to drive-cryptpad)
│   └── drive-cryptpad      # CLI entry point
├── src/
│   ├── cryptpad/           # Core CryptPad modules
│   │   ├── auth.js         # Authentication & login
│   │   ├── messenger.js    # Encrypted messaging
│   │   ├── contacts.js     # Contact management
│   │   ├── session.js      # Session state
│   │   ├── drive.js        # Drive operations
│   │   └── ...
│   ├── commands/           # CLI command implementations
│   │   └── index.js
│   ├── fs/                 # Filesystem adapters
│   └── shell.js            # Interactive shell
└── package.json
```

## 🔐 Security

- **End-to-End Encryption**: All messages and documents are encrypted client-side
- **Curve25519**: Used for key exchange in messaging
- **XSalsa20-Poly1305**: Used for message encryption
- **Ed25519**: Used for signatures
- **Scrypt**: Used for password-based key derivation
- **Zero-Knowledge**: Server never sees plaintext content or passwords

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Resources

- [CryptPad Official Site](https://cryptpad.fr)
- [CryptPad GitHub](https://github.com/cryptpad/cryptpad)
- [CryptPad Documentation](https://docs.cryptpad.fr)

## 💡 Tips

1. **Use Tab Completion**: The shell supports tab completion for commands
2. **Command History**: Use Up/Down arrows to navigate command history
3. **Batch Operations**: Create scripts to automate repetitive tasks
4. **Environment Setup**: Create a `.env` file or shell aliases for your server configuration
5. **Security**: Always use HTTPS/WSS URLs for production instances

## 🐛 Troubleshooting

### "Server URLs not configured" Error
Make sure you've set both `CRYPTPAD_BASE_URL` and `CRYPTPAD_WS_URL` environment variables before starting the CLI.

### Login Fails
- Verify your username and password are correct
- Check that your CryptPad instance is accessible
- Ensure WebSocket connections are not blocked by a firewall

### Connection Issues
- Confirm the server URLs are correct (HTTP/HTTPS and WS/WSS must match)
- Check that the CryptPad server is running
- Verify network connectivity

### Message Not Received
- Ensure both users are contacts/friends on CryptPad
- Check that the recipient is online or has accessed CryptPad recently
- Messages are end-to-end encrypted and stored on the server

## 📚 Additional Documentation

- [Authentication & Messaging Guide](./AUTHENTICATION_MESSAGING.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Getting Started Guide](./GETTING_STARTED.md)
- [Quick Reference](./QUICK_REFERENCE.md)
