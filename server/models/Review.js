const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    facultyName: {
      type: String,
      required: [true, "Faculty name is required"],
      trim: true,
      maxlength: [100, "Faculty name cannot exceed 100 characters"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    review: {
      type: String,
      required: [true, "Review text is required"],
      trim: true,
      maxlength: [1000, "Review cannot exceed 1000 characters"],
    },
    subject: {
      type: String,
      trim: true,
      maxlength: [100, "Subject name cannot exceed 100 characters"],
    },
    semester: {
      type: String,
      trim: true,
      maxlength: [50, "Semester cannot exceed 50 characters"],
    },
    anonymousId: {
      type: String,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
reviewSchema.index({ facultyName: 1, rating: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ rating: 1 });

// Removed inefficient virtual - average ratings calculated in routes instead

module.exports = mongoose.model("Review", reviewSchema);
