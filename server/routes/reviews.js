const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Review = require("../models/Review");
const crypto = require("crypto");

// Simple in-memory cache for frequently accessed data
const cache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for reviews (less frequent updates)

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// Generate anonymous ID
const generateAnonymousId = () => {
  return "anon_" + crypto.randomBytes(8).toString("hex");
};


// POST /api/reviews - Submit a review
router.post("/", async (req, res) => {
  try {
    const { facultyName, rating, review, subject, semester } = req.body;

    // Validation
    if (!facultyName || !rating || !review) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Faculty name, rating, and review are required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: "Invalid rating",
        message: "Rating must be between 1 and 5",
      });
    }

    if (review.length > 1000) {
      return res.status(400).json({
        error: "Review too long",
        message: "Review cannot exceed 1000 characters",
      });
    }

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database unavailable",
        message: "Database is not connected. Please try again later.",
      });
    }

    // Create review
    const newReview = new Review({
      facultyName: facultyName.trim(),
      rating: parseInt(rating),
      review: review.trim(),
      subject: subject ? subject.trim() : "",
      semester: semester ? semester.trim() : "",
      anonymousId: generateAnonymousId(),
    });

    await newReview.save();

    // Clear cache when new review is added
    cache.delete('facultyList');

    res.status(201).json({
      success: true,
      message: "Review submitted successfully!",
      review: {
        id: newReview._id,
        facultyName: newReview.facultyName,
        rating: newReview.rating,
        review: newReview.review,
        subject: newReview.subject,
        semester: newReview.semester,
        createdAt: newReview.createdAt,
      },
    });
  } catch (error) {
    console.error("Review submission error:", error);
    res.status(500).json({
      error: "Failed to submit review",
      message: "An error occurred while submitting the review",
    });
  }
});

// GET /api/reviews - Get all reviews or aggregated faculty reviews
router.get("/", async (req, res) => {
  try {
    const {
      faculty,
      sort = "newest",
      limit = 50,
      aggregate = false,
    } = req.query;
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

    // If aggregate is true, return aggregated faculty reviews
    if (aggregate === "true") {
      // Build aggregation pipeline
      const pipeline = [];

      // Add match stage if faculty filter is provided
      if (faculty) {
        pipeline.push({
          $match: {
            facultyName: { $regex: faculty, $options: "i" },
          },
        });
      }

      // Add grouping stage
      pipeline.push({
        $group: {
          _id: "$facultyName",
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
          reviews: {
            $push: {
              id: "$_id",
              rating: "$rating",
              review: "$review",
              subject: "$subject",
              semester: "$semester",
              createdAt: "$createdAt",
            },
          },
        },
      });

      // Add projection stage
      pipeline.push({
        $project: {
          facultyName: "$_id",
          averageRating: { $round: ["$averageRating", 1] },
          reviewCount: 1,
          reviews: 1,
          _id: 0,
        },
      });

      const facultyReviews = await Review.aggregate(pipeline);

      // Sort the aggregated results
      let sortedFacultyReviews = facultyReviews;
      switch (sort) {
        case "rating-high":
          sortedFacultyReviews = facultyReviews.sort(
            (a, b) => b.averageRating - a.averageRating
          );
          break;
        case "rating-low":
          sortedFacultyReviews = facultyReviews.sort(
            (a, b) => a.averageRating - b.averageRating
          );
          break;
        case "review-count":
          sortedFacultyReviews = facultyReviews.sort(
            (a, b) => b.reviewCount - a.reviewCount
          );
          break;
        default:
          // Default sort by average rating (highest first)
          sortedFacultyReviews = facultyReviews.sort(
            (a, b) => b.averageRating - a.averageRating
          );
      }

      return res.json({
        success: true,
        facultyReviews: sortedFacultyReviews,
        total: facultyReviews.length,
      });
    }

    // Regular review fetching logic
    let query = {};

    // Filter by faculty name - case insensitive partial match
    if (faculty) {
      // Handle multiple faculty names in query
      if (Array.isArray(faculty)) {
        query.facultyName = { $in: faculty };
      } else {
        query.facultyName = { $regex: faculty, $options: "i" };
      }
    }

    // Sorting options
    let sortOption = {};
    switch (sort) {
      case "rating-high":
        sortOption = { rating: -1 };
        break;
      case "rating-low":
        sortOption = { rating: 1 };
        break;
      case "oldest":
        sortOption = { createdAt: 1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const reviews = await Review.find(query)
      .sort(sortOption)
      .limit(limitNum)
      .select("-anonymousId");

    res.json({
      success: true,
      reviews,
      total: reviews.length,
    });
  } catch (error) {
    console.error("Reviews fetch error:", error);
    res.status(500).json({
      error: "Failed to fetch reviews",
      message: "An error occurred while fetching reviews",
    });
  }
});

// GET /api/reviews/faculty/:name - Get reviews for specific faculty
router.get("/faculty/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const { sort = "newest" } = req.query;

    let sortOption = {};
    switch (sort) {
      case "rating-high":
        sortOption = { rating: -1 };
        break;
      case "rating-low":
        sortOption = { rating: 1 };
        break;
      case "oldest":
        sortOption = { createdAt: 1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const reviews = await Review.find({
      facultyName: { $regex: name, $options: "i" },
    })
      .sort(sortOption)
      .select("-anonymousId");

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating =
      reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;

    // Count ratings by star
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((review) => {
      ratingCounts[review.rating]++;
    });

    res.json({
      success: true,
      facultyName: name,
      reviews,
      total: reviews.length,
      averageRating: parseFloat(averageRating),
      ratingCounts,
    });
  } catch (error) {
    console.error("Faculty reviews fetch error:", error);
    res.status(500).json({
      error: "Failed to fetch faculty reviews",
      message: "An error occurred while fetching faculty reviews",
    });
  }
});

// GET /api/reviews/faculty-list - Get list of all faculty
router.get("/faculty-list", async (req, res) => {
  try {
    const cached = getCachedData('facultyList');
    if (cached) {
      return res.json({
        success: true,
        faculty: cached,
      });
    }

    const facultyList = await Review.aggregate([
      {
        $group: {
          _id: "$facultyName",
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
      {
        $project: {
          facultyName: "$_id",
          averageRating: { $round: ["$averageRating", 1] },
          reviewCount: 1,
          _id: 0,
        },
      },
      {
        $sort: { averageRating: -1 },
      },
    ]);

    setCachedData('facultyList', facultyList);
    res.json({
      success: true,
      faculty: facultyList,
    });
  } catch (error) {
    console.error("Faculty list fetch error:", error);
    res.status(500).json({
      error: "Failed to fetch faculty list",
      message: "An error occurred while fetching faculty list",
    });
  }
});


module.exports = router;
