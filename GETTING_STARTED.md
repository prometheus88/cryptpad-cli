# Getting Started with CryptPad CLI Authentication & Messaging

## 🚀 Quick Start (5 minutes)

### Step 1: Start the CLI

```bash
cd /root/cryptpad-cli
node bin/drive-cryptpad
```

You'll see:
```
============================================================
CryptPad CLI - Command Line Interface
============================================================
Server: http://5.78.77.95:3010
WebSocket: ws://5.78.77.95:3013

Type "help" for available commands
Type "login <username> <password>" to authenticate
============================================================

cryptpad>
```

### Step 2: Login

```bash
cryptpad> login your_username your_password
```

You'll see:
```
Deriving keys from credentials...
Connecting to user drive...
Drive loaded successfully

✓ Login successful!
  Username: Your Name
  Public Key: AbCdEf123456...
  Contacts: 3

cryptpad[your_username]>
```

### Step 3: View Your Contacts

```bash
cryptpad[your_username]> contacts
```

Output:
```
Contacts (3):
    1. Alice Smith                  AbCd123...
    2. Bob Johnson                  EfGh456...
    3. Carol Williams               IjKl789...
```

### Step 4: Read Messages

```bash
cryptpad[your_username]> messages Alice
```

Output:
```
Loading messages with Alice Smith...

=== Messages with Alice Smith ===

[11/14/2025, 10:30:15 AM] Alice Smith: Hey there!
[11/14/2025, 10:35:22 AM] You: Hi Alice!

cryptpad[your_username]>
```

### Step 5: Send a Message

```bash
cryptpad[your_username]> send Alice Testing the new CLI!
```

Output:
```
Sending message to Alice Smith...
✓ Message sent to Alice Smith
```

## 📚 What You Can Do

### Authentication
- ✅ Login with your CryptPad credentials
- ✅ Stay logged in between sessions (24 hours)
- ✅ Check your authentication status
- ✅ View your user info

### Messaging
- ✅ List all your contacts/friends
- ✅ Read message history with any contact
- ✅ Send encrypted messages
- ✅ All messages are end-to-end encrypted

### Document Management
- ✅ All existing features still work
- ✅ Create documents
- ✅ Navigate your drive
- ✅ Download documents

## 🔐 Security

- **Zero-knowledge**: Server never sees your password or messages
- **End-to-end encryption**: All messages encrypted on your device
- **Secure key derivation**: Uses scrypt (same as web interface)
- **Session encryption**: Saved sessions are encrypted on disk

## 💡 Tips

1. **Contact names are flexible**: Use display names or public keys
   ```bash
   messages Alice      # Works
   messages "Alice Smith"  # Also works
   messages AbCd123...     # Also works with public key
   ```

2. **Multi-word messages don't need quotes**:
   ```bash
   send Alice This is a message with spaces
   ```

3. **Use Tab for completion**: Start typing a command and press Tab

4. **Session persistence**: You stay logged in for 24 hours
   ```bash
   # Day 1
   login user pass
   logout
   
   # Day 2 (within 24 hours) - still logged in automatically
   ```

5. **Check status anytime**:
   ```bash
   status    # Connection info
   whoami    # User info
   ```

## 🎯 Common Use Cases

### Quick Message
```bash
node bin/drive-cryptpad
cryptpad> login user pass
cryptpad[user]> send Alice Meeting at 3pm today
cryptpad[user]> exit
```

### Check All Messages
```bash
cryptpad> login user pass
cryptpad[user]> contacts
cryptpad[user]> messages Alice
cryptpad[user]> messages Bob
cryptpad[user]> messages Carol
cryptpad[user]> exit
```

### Create and Share Document
```bash
cryptpad[user]> create pad "Project Notes"
# Copy the URL from output
cryptpad[user]> send Team Check this out: [URL]
```

## 🆘 Troubleshooting

### "Login failed: Invalid credentials"
- Double-check username and password
- Usernames are case-sensitive
- Make sure account exists on your CryptPad instance

### "Contact not found"
- Run `contacts` to see exact names
- Names are case-insensitive: "alice" works for "Alice"
- You can only message your friends (added in web interface)

### "Not authenticated"
- Run `login` first
- Check if session expired (>24 hours)
- Try `status` to see connection info

### Connection Issues
- Verify CryptPad server is running:
  ```bash
  curl http://5.78.77.95:3010
  ```
- Check WebSocket connectivity
- Make sure you're on the right network

## 📖 Learn More

- **Full Guide**: Read `AUTHENTICATION_MESSAGING.md`
- **Quick Reference**: See `QUICK_REFERENCE.md`
- **Implementation Details**: Check `IMPLEMENTATION_SUMMARY.md`

## 🎬 Run the Demo

Try the automated demo:

```bash
cd /root/cryptpad-cli
./examples/messaging-demo.sh your_username your_password Alice
```

This will automatically:
1. Login
2. Show status
3. List contacts
4. View messages with Alice
5. Send a test message
6. Logout

## ✨ You're Ready!

That's it! You now know how to:
- ✅ Login to CryptPad from CLI
- ✅ View and message your contacts
- ✅ Manage your documents
- ✅ Stay secure with end-to-end encryption

Start exploring:
```bash
cd /root/cryptpad-cli
node bin/drive-cryptpad
cryptpad> help
```

Happy messaging! 🚀

