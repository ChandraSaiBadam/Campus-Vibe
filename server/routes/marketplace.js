const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Item = require("../models/Item");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { sendItemPostedNotification, sendItemDeletedNotification } = require("../utils/emailService");

// Configure multer for file uploads to memory (for storing in MongoDB)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

// Generate unique delete token
const generateDeleteToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// POST /api/marketplace - Create new listing
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { title, description, price, category, contact, email } = req.body;

    // Validation
    if (!title || !description || !price || !category || !contact || !email) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Title, description, price, category, contact, and email are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Invalid email",
        message: "Please provide a valid email address",
      });
    }

    if (parseFloat(price) <= 0) {
      return res.status(400).json({
        error: "Invalid price",
        message: "Price must be greater than 0",
      });
    }

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database unavailable",
        message: "Database is not connected. Please try again later.",
      });
    }

    // Create item with image data
    const itemData = {
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category,
      contact: contact.trim(),
      email: email.trim().toLowerCase(),
      deleteToken: generateDeleteToken(),
    };

    // Add image data if provided
    if (req.file) {
      itemData.image = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    const item = new Item(itemData);
    await item.save();

    // Prepare response data (without sensitive data)
    const responseData = {
      id: item._id,
      title: item.title,
      description: item.description,
      price: item.price,
      category: item.category,
      contact: item.contact,
      createdAt: item.createdAt,
      hasImage: !!item.image,
    };

    // Send email notification asynchronously (non-blocking)
    setImmediate(async () => {
      try {
        const emailData = {
          title: item.title,
          description: item.description,
          price: item.price,
          category: item.category,
          contact: item.contact,
          email: item.email,
          id: item._id,
          deleteToken: item.deleteToken,
        };
        
        const emailResult = await sendItemPostedNotification(emailData);
        if (emailResult.success) {
          console.log(`📧 Notification email sent to ${item.email} for item: ${item.title}`);
        } else {
          console.warn(`⚠️ Failed to send email notification: ${emailResult.error}`);
        }
      } catch (emailError) {
        console.error('Email notification error:', emailError);
      }
    });

    res.status(201).json({
      success: true,
      message: "Item posted successfully! Check your email for deletion details.",
      item: responseData,
      emailSent: "A confirmation email has been sent with your delete key.",
    });
  } catch (error) {
    console.error("Marketplace post error:", error);
    res.status(500).json({
      error: "Failed to post item",
      message: "An error occurred while posting the item",
    });
  }
});

// GET /api/marketplace - Get all listings
router.get("/", async (req, res) => {
  try {
  const { category, search, sort = "newest", page = 1, limit = 50 } = req.query;

    let query = { status: "active" };

    // Filter by category
    if (category && category !== "all") {
      query.category = category;
    }

    // Search functionality - case insensitive partial match
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Sorting options
    let sortOption = {};
    switch (sort) {
      case "price-low":
        sortOption = { price: 1 };
        break;
      case "price-high":
        sortOption = { price: -1 };
        break;
      case "oldest":
        sortOption = { createdAt: 1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    // Pagination
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);

    const items = await Item.find(query)
      .sort(sortOption)
      .select("-deleteToken -image.data")
      .skip((pageNum - 1) * perPage)
      .limit(perPage);

    // Add hasImage property to each item and map _id to id
    const itemsWithImageInfo = items.map((item) => {
      const itemObj = item.toObject();

      // Check if item has a valid image (either new MongoDB format or old file path format)
      const hasImage = !!(
        itemObj.image &&
        (itemObj.image.contentType || // New MongoDB format
          (typeof itemObj.image === "string" &&
            itemObj.image.startsWith("/uploads/"))) // Old file path format
      );

      return {
        ...itemObj,
        id: itemObj._id, // Map _id to id for client-side compatibility
        hasImage: hasImage,
      };
    });

    // Return pagination info
    const totalCount = await Item.countDocuments(query);
    res.json({
      success: true,
      items: itemsWithImageInfo,
      total: totalCount,
      page: pageNum,
      perPage,
    });
  } catch (error) {
    console.error("Marketplace fetch error:", error);
    res.status(500).json({
      error: "Failed to fetch items",
      message: "An error occurred while fetching items",
    });
  }
});

// GET /api/marketplace/image/:id - Get image for an item
router.get("/image/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Find item and select only image data
    const item = await Item.findById(id).select("image");

    if (!item || !item.image || !item.image.data) {
      return res.status(404).json({
        error: "Image not found",
        message: "No image found for this item",
      });
    }

    // Set content type and send image data
    res.set("Content-Type", item.image.contentType);
    res.send(item.image.data);
  } catch (error) {
    console.error("Image fetch error:", error);
    res.status(500).json({
      error: "Failed to fetch image",
      message: "An error occurred while fetching the image",
    });
  }
});

// GET /api/marketplace/categories
router.get("/categories", (req, res) => {
  res.json({
    categories: [
      { value: "all", label: "All Categories" },
      { value: "Books", label: "Books" },
      { value: "Notes", label: "Notes" },
      { value: "Gadgets", label: "Gadgets" },
      { value: "Other", label: "Other" },
    ],
  });
});

// DELETE /api/marketplace/:id - Delete listing
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        error: "Missing token",
        message: "Delete token is required",
      });
    }

    const item = await Item.findOne({ _id: id, deleteToken: token });

    if (!item) {
      return res.status(404).json({
        error: "Item not found",
        message: "Item not found or invalid delete token",
      });
    }

    // Store item data for email before deletion
    const itemData = {
      title: item.title,
      email: item.email,
    };

    await Item.findByIdAndDelete(id);

    // Send deletion confirmation email asynchronously
    setImmediate(async () => {
      try {
        const emailResult = await sendItemDeletedNotification(itemData);
        if (emailResult.success) {
          console.log(`📧 Deletion confirmation email sent to ${itemData.email} for item: ${itemData.title}`);
        } else {
          console.warn(`⚠️ Failed to send deletion confirmation email: ${emailResult.error}`);
        }
      } catch (emailError) {
        console.error('Deletion confirmation email error:', emailError);
      }
    });

    res.json({
      success: true,
      message: "Item deleted successfully! A confirmation email has been sent.",
    });
  } catch (error) {
    console.error("Marketplace delete error:", error);
    res.status(500).json({
      error: "Failed to delete item",
      message: "An error occurred while deleting the item",
    });
  }
});

module.exports = router;
