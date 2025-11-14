#!/bin/bash

# CryptPad CLI Messaging Demo
# This script demonstrates the authentication and messaging features

echo "=================================="
echo "CryptPad CLI - Messaging Demo"
echo "=================================="
echo ""
echo "This demo will show you how to:"
echo "  1. Login to your CryptPad account"
echo "  2. View your contacts"
echo "  3. Check your authentication status"
echo "  4. View message history"
echo "  5. Send a message"
echo ""
echo "Note: You'll need a CryptPad account with at least one contact"
echo ""

# Check if username and password are provided
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: $0 <username> <password> [contact_name]"
    echo ""
    echo "Example:"
    echo "  $0 myusername mypassword Alice"
    echo ""
    exit 1
fi

USERNAME="$1"
PASSWORD="$2"
CONTACT="${3:-}"

# Create a temporary script
TEMP_SCRIPT=$(mktemp)

cat > "$TEMP_SCRIPT" << EOF
# Login
login $USERNAME $PASSWORD

# Show status
status

# Show user info
whoami

# List contacts
contacts

EOF

# If contact is specified, show messages and send a test message
if [ -n "$CONTACT" ]; then
    cat >> "$TEMP_SCRIPT" << EOF
# View message history with contact
messages $CONTACT

# Send a test message
send $CONTACT Hello from the CryptPad CLI demo! This message was sent at $(date)

# Show messages again to confirm
messages $CONTACT

EOF
fi

cat >> "$TEMP_SCRIPT" << EOF
# Logout
logout

# Exit
exit
EOF

echo "Running demo commands..."
echo "========================"
echo ""

# Run the CLI with the script
cd "$(dirname "$0")/.."
node bin/drive-cryptpad < "$TEMP_SCRIPT"

# Cleanup
rm "$TEMP_SCRIPT"

echo ""
echo "========================"
echo "Demo completed!"
echo ""

