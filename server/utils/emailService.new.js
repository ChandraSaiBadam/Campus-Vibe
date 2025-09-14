require('dotenv').config();
const nodemailer = require('nodemailer');

// Email configuration
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Email credentials not configured. Please set EMAIL_USER and EMAIL_PASS in .env file');
    return null;
  }

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Send email notification when an item is posted to marketplace
 * @param {Object} itemData - The item data
 */
const sendItemPostedNotification = async (itemData) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      return { success: false, error: 'Email configuration not found' };
    }

    const deleteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/delete-item?id=${itemData.id}&token=${itemData.deleteToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: itemData.email,
      subject: `✅ Your item "${itemData.title}" has been posted to VIT Connect Marketplace`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">VIT Connect Marketplace</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Your item has been successfully posted!</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1e40af; margin: 0 0 15px 0;">📦 Item Details</h2>
            <p style="margin: 8px 0;"><strong>Title:</strong> ${itemData.title}</p>
            <p style="margin: 8px 0;"><strong>Description:</strong> ${itemData.description}</p>
            <p style="margin: 8px 0;"><strong>Price:</strong> ₹${itemData.price}</p>
            <p style="margin: 8px 0;"><strong>Category:</strong> ${itemData.category}</p>
            <p style="margin: 8px 0;"><strong>Contact:</strong> ${itemData.contact}</p>
            <p style="margin: 8px 0;"><strong>Posted on:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div style="background-color: #fff7ed; padding: 20px; border-radius: 8px; border: 1px solid #fed7aa; margin-bottom: 20px;">
            <h2 style="color: #9a3412; margin: 0 0 15px 0;">🗑️ Need to remove this item?</h2>
            <p style="margin: 0 0 15px 0;">Click the link below to remove your item from the marketplace:</p>
            <a href="${deleteUrl}" style="display: inline-block; background-color: #ea580c; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Delete Item</a>
            <p style="margin: 15px 0 0 0; color: #666; font-size: 14px;">This link is unique to your item and should not be shared with others.</p>
          </div>
          
          <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0 0 10px 0;">Visit our platform:</p>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="color: #2563eb;">VIT Connect Marketplace</a>
            </p>
          </div>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send email confirmation when item is deleted
 * @param {Object} itemData - The deleted item data
 */
const sendItemDeletedNotification = async (itemData) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      return { success: false, error: 'Email configuration not found' };
    }
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: itemData.email,
      subject: `🗑️ Your item "${itemData.title}" has been removed from VIT Connect Marketplace`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">VIT Connect Marketplace</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Your item has been successfully removed</p>
          </div>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #0369a1; margin: 0 0 15px 0;">✅ Deletion Confirmed</h2>
            <p style="margin: 0 0 15px 0; color: #374151;">Your item "<strong>${itemData.title}</strong>" has been successfully removed from the marketplace.</p>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              <strong>Deleted on:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; margin-top: 30px;">
            <p style="color: #6b7280; margin: 0 0 10px 0;">Want to post another item?</p>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              Visit: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/marketplace" style="color: #2563eb;">VIT Connect Marketplace</a>
            </p>
          </div>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Deletion confirmation email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending deletion confirmation email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendItemPostedNotification,
  sendItemDeletedNotification,
};
