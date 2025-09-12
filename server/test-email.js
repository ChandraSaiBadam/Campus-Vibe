require('dotenv').config();
const { sendItemPostedNotification } = require('./utils/emailService');

async function testEmail() {
  const testData = {
    title: "Test Item",
    description: "This is a test item",
    price: 100,
    category: "Test Category",
    contact: "1234567890",
    email: "campusconnect81@outlook.com", // Using the same email to test
    id: "test123",
    deleteToken: "testtoken123"
  };

  try {
    console.log('Attempting to send test email...');
    const result = await sendItemPostedNotification(testData);
    console.log('Email result:', result);
  } catch (error) {
    console.error('Error sending test email:', error);
  }
}

testEmail();
