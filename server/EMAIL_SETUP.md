# Email Setup Instructions for VIT Connect Marketplace

## Overview
The marketplace feature sends email notifications when items are posted. This includes sending a deletion key to the user's email address for managing their listings.

## Email Configuration Options

### Option 1: Use Ethereal Test Email (Recommended for Testing)
This is the easiest option that doesn't require any email account setup.

1. **Run the setup script:**
   ```bash
   cd Campus-connect/server
   node utils/setupTestEmail.js
   ```

2. **The script will:**
   - Create a test email account automatically
   - Update your .env file with the credentials
   - Show you where to view sent emails

3. **View sent emails:**
   - The script will provide a URL and login credentials
   - All emails sent will be caught and viewable online
   - Perfect for development and testing

### Option 2: Use Gmail with App Password (Requires 2FA)
If you want to use real Gmail, you need 2-Step Verification enabled.

1. **Enable 2-Factor Authentication:**
   - Go to: https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and generate password
   - Copy the 16-character password

3. **Update .env file:**
   ```
   USE_ETHEREAL_EMAIL=false
   EMAIL_USER=parashararyaman108@gmail.com
   EMAIL_PASS=your-app-password-here
   ```

### Option 3: Use Alternative Email Service
You can use other email services like Outlook, Yahoo, etc.

Example for Outlook:
```
USE_ETHEREAL_EMAIL=false
EMAIL_SERVICE=outlook
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

## Testing Email Functionality
1. Go to the Marketplace page
2. Post a new item with a valid email address
3. Check your email for the confirmation with deletion key

## Troubleshooting

### Common Issues:
1. **"Invalid login" error**: Make sure you're using the app password, not your regular Gmail password
2. **No email received**: Check spam folder and ensure the email address is correct
3. **Rate limiting**: Gmail has sending limits. For development, this shouldn't be an issue

### Email Features:
- ✅ Sends item details when posted
- ✅ Includes unique deletion key
- ✅ Provides direct deletion link
- ✅ Sends confirmation when item is deleted

## Security Notes
- Never commit the actual app password to version control
- Use environment variables for all sensitive data
- The deletion token is cryptographically secure (32 bytes of random data)
