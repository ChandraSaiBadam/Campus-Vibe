const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

/**
 * Creates a test email account using Ethereal Email
 * This is perfect for development/testing without needing real email credentials
 */
async function createTestEmailAccount() {
  try {
    console.log('🔧 Creating test email account...');
    
    // Generate test SMTP service account from ethereal.email
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('✅ Test email account created successfully!');
    console.log('\n📧 Account Details:');
    console.log(`   Email: ${testAccount.user}`);
    console.log(`   Password: ${testAccount.pass}`);
    console.log(`   SMTP Host: ${testAccount.smtp.host}`);
    console.log(`   SMTP Port: ${testAccount.smtp.port}`);
    console.log(`   View sent emails at: https://ethereal.email/messages`);
    
    // Path to .env file
    const envPath = path.join(__dirname, '..', '.env');
    
    // Read current .env file
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add Ethereal credentials
    const etherealConfig = `
# Ethereal Test Email Configuration (for development/testing)
USE_ETHEREAL_EMAIL=true
ETHEREAL_USER=${testAccount.user}
ETHEREAL_PASS=${testAccount.pass}
ETHEREAL_VIEW_URL=https://ethereal.email/messages`;
    
    // Check if Ethereal config already exists
    if (envContent.includes('ETHEREAL_USER')) {
      // Replace existing Ethereal config
      envContent = envContent.replace(/# Ethereal Test Email Configuration[\s\S]*?ETHEREAL_VIEW_URL=.*/g, etherealConfig.trim());
    } else {
      // Append Ethereal config
      envContent += '\n' + etherealConfig;
    }
    
    // Write updated .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ .env file updated with test email credentials');
    console.log('\n📌 To view sent emails:');
    console.log(`   1. Go to: https://ethereal.email/login`);
    console.log(`   2. Login with:`);
    console.log(`      Email: ${testAccount.user}`);
    console.log(`      Password: ${testAccount.pass}`);
    console.log('\n🚀 You can now test email functionality without real email credentials!');
    
    return testAccount;
  } catch (error) {
    console.error('❌ Error creating test email account:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createTestEmailAccount();
}

module.exports = { createTestEmailAccount };
