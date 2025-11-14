# CryptPad CLI - Authentication & Messaging Guide

## Overview

The CryptPad CLI now supports user authentication and encrypted messaging! You can log in with your CryptPad account, view your contacts, read message history, and send messages—all from the command line.

## Features

- **User Authentication**: Login with username/password using CryptPad's secure scrypt-based key derivation
- **Contact Management**: View your friends list
- **Message History**: Read past messages with any contact
- **Send Messages**: Send encrypted messages to your contacts
- **Session Management**: Stay logged in between CLI sessions

## Getting Started

### 1. Start the CLI

```bash
cd /root/cryptpad-cli
node bin/drive-cryptpad
```

### 2. Login

```bash
cryptpad> login myusername mypassword
Deriving keys from credentials...
Connecting to user drive...
Drive loaded successfully

✓ Login successful!
  Username: myusername
  Public Key: Ab3dEf5gH8j9...
  Contacts: 3

cryptpad[myusername]>
```

### 3. View Your Contacts

```bash
cryptpad[myusername]> contacts

Contacts (3):
    1. Alice Smith                  Ab3dEf5gH8j9...
    2. Bob Johnson                  Cd5fGh7iJ9k0...
    3. Carol Williams               Ef7gHi9jK0l1...

cryptpad[myusername]>
```

### 4. Read Message History

```bash
cryptpad[myusername]> messages Alice
Loading messages with Alice Smith...

=== Messages with Alice Smith ===

[11/14/2025, 10:30:15 AM] Alice Smith: Hey, how are you?
[11/14/2025, 10:32:22 AM] You: I'm good! Working on the CLI.
[11/14/2025, 10:35:18 AM] Alice Smith: That's awesome!
[11/14/2025, 11:05:42 AM] You: Want to test the new messaging feature?

cryptpad[myusername]>
```

### 5. Send a Message

```bash
cryptpad[myusername]> send Alice Check out the new CLI messaging!
Sending message to Alice Smith...
✓ Message sent to Alice Smith

cryptpad[myusername]>
```

You can also send multi-word messages without quotes:

```bash
cryptpad[myusername]> send Bob This is a longer message with multiple words
```

### 6. Check Your Status

```bash
cryptpad[myusername]> status

CryptPad CLI Status:
  Authenticated: ✓ Yes
  User: myusername
  Drive Connected: ✓ Yes

cryptpad[myusername]>
```

### 7. View Your Info

```bash
cryptpad[myusername]> whoami

Current User:
  Username: myusername
  Display Name: My Display Name
  Ed Public: AbCdEfGhIjKlMnOpQrStUvWxYz0123456789AbCdEf
  Curve Public: GhIjKlMnOpQrStUvWxYz0123456789AbCdEfGhIj
  Contacts: 3

cryptpad[myusername]>
```

### 8. Logout

```bash
cryptpad[myusername]> logout
✓ Logged out from myusername
cryptpad>
```

## Command Reference

### Authentication Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `login` | Login to CryptPad | `login <username> <password>` |
| `logout` | Logout from CryptPad | `logout` |
| `whoami` | Show current user info | `whoami` |
| `status` | Show connection status | `status` |

### Messaging Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `contacts` | List all contacts | `contacts` |
| `messages` | Show message history | `messages <contact>` |
| `send` | Send a message | `send <contact> <message>` |

### Finding Contacts

You can refer to contacts by:
- **Display name**: `messages Alice` or `messages "Alice Smith"`
- **Curve public key**: `messages Ab3dEf5gH8j9K0L1M2N3O4P5Q6R7S8T9U0V1W2X3`

The CLI performs case-insensitive matching on display names.

## Configuration

### Server Configuration

By default, the CLI connects to your self-hosted instance at:
- **Base URL**: `http://5.78.77.95:3010`
- **WebSocket**: `ws://5.78.77.95:3013`

You can override these with environment variables:

```bash
export CP_BASE_URL="https://cryptpad.example.com"
export CP_WS_URL="wss://cryptpad.example.com/cryptpad_websocket"
node bin/drive-cryptpad
```

### Session Persistence

Your session is automatically saved (encrypted) to `~/.cryptpad-cli-session.json`. Sessions expire after 24 hours for security.

To manually clear your saved session:

```bash
rm ~/.cryptpad-cli-session.json
```

## Security Features

### End-to-End Encryption

All messages are encrypted end-to-end using:
- **Curve25519** for key exchange
- **XSalsa20-Poly1305** for message encryption
- Shared channel keys between friends

### Key Derivation

User credentials are processed using:
- **scrypt** (N=8192, r=8, p=1) for password-based key derivation
- No passwords are ever sent to the server
- Client-side key generation only

### Zero-Knowledge

The CryptPad server cannot:
- Read your messages
- Access your contacts
- Decrypt your drive
- See your passwords

Everything is encrypted on the client side before transmission.

## Troubleshooting

### Login Fails

**Symptom**: "Invalid credentials or empty drive"

**Solutions**:
1. Verify your username and password are correct
2. Ensure the account exists on your CryptPad instance
3. Check server connectivity: `curl http://5.78.77.95:3010`

### Cannot See Contacts

**Symptom**: "No contacts found"

**Solutions**:
1. Add friends through the CryptPad web interface first
2. Verify you're logged into the correct account
3. Check that friends have accepted your requests

### Messages Not Loading

**Symptom**: Messages command times out or shows errors

**Solutions**:
1. Verify the contact exists: `contacts`
2. Check WebSocket connectivity
3. Ensure you have message history with this contact

### Connection Errors

**Symptom**: "Failed to connect" or timeout errors

**Solutions**:
1. Check that CryptPad server is running
2. Verify WebSocket URL is accessible
3. Check firewall rules if applicable

## Advanced Usage

### Scripting

You can automate CLI interactions using pipes or heredocs:

```bash
# Send a quick message
echo -e "login myuser mypass\nsend Alice Hello from script!\nlogout\nexit" | node bin/drive-cryptpad
```

### Multiple Sessions

Each CLI instance maintains its own session. You can run multiple instances logged in as different users.

### Integration

The CLI can be integrated into:
- Monitoring scripts
- Notification systems
- Automation workflows
- CI/CD pipelines

## Examples

### Daily Standup Bot

```bash
#!/bin/bash
cat << EOF | node bin/drive-cryptpad
login bot-user bot-password
send Team Daily standup time! Please share your updates.
logout
exit
EOF
```

### Check for New Messages

```bash
#!/bin/bash
cat << EOF | node bin/drive-cryptpad
login myuser mypass
contacts
messages Alice
logout
exit
EOF
```

## Limitations

### Current Limitations

1. **No Friend Requests**: Cannot send/accept friend requests from CLI (use web interface)
2. **No Team Chats**: Only supports 1-on-1 messaging
3. **No Read Receipts**: Cannot see if messages were read
4. **No Notifications**: CLI doesn't show new message notifications in real-time
5. **No File Sharing**: Cannot send/receive files through messages

### Future Enhancements

Potential features for future releases:
- Real-time message notifications
- Group chat support
- Friend request management
- File attachment support
- Message search
- Read receipts
- Typing indicators

## Contributing

Found a bug or want to add a feature? The code is organized as follows:

- `src/cryptpad/auth.js` - Authentication logic
- `src/cryptpad/session.js` - Session management
- `src/cryptpad/contacts.js` - Contact list management
- `src/cryptpad/messenger.js` - Messaging functionality
- `src/commands/index.js` - CLI commands
- `src/shell.js` - Shell interface

## Support

For issues specific to:
- **CryptPad**: See main CryptPad documentation
- **CLI Tool**: Check this guide and code comments
- **Self-hosted Instance**: Verify server configuration

## License

This extension maintains the same license as the CryptPad CLI tool (MIT).

