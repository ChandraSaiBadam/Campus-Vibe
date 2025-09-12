const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Item title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Item description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["Books", "Notes", "Gadgets", "Other"],
      default: "Other",
    },
    image: {
      data: Buffer,
      contentType: String,
    },
    contact: {
      type: String,
      required: [true, "Contact information is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required for notifications"],
      trim: true,
      lowercase: true,
      validate: {
        validator: function(email) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: "Please provide a valid email address"
      }
    },
    deleteToken: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["active", "sold", "deleted"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Index for better search performance
itemSchema.index({ title: "text", description: "text" });
itemSchema.index({ category: 1, status: 1 });
itemSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Item", itemSchema);
