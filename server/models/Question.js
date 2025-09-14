const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Question title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Question content is required'],
    trim: true,
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    default: 'Anonymous'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  category: {
    type: String,
    enum: ['Academic', 'Campus Life', 'Events', 'General', 'Technical', 'Career'],
    default: 'General'
  },
  votes: {
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 }
  },
  viewCount: {
    type: Number,
    default: 0
  },
  commentCount: {
    type: Number,
    default: 0
  },
  isAnonymous: {
    type: Boolean,
    default: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for better query performance
questionSchema.index({ createdAt: -1 });
questionSchema.index({ votes: -1 });
questionSchema.index({ category: 1, createdAt: -1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ viewCount: -1 });

// Virtual for score calculation (upvotes - downvotes)
questionSchema.virtual('score').get(function() {
  return this.votes.upvotes - this.votes.downvotes;
});

// Virtual for hot score (Reddit-like algorithm)
questionSchema.virtual('hotScore').get(function() {
  const ageInHours = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
  const score = this.votes.upvotes - this.votes.downvotes;
  return score / Math.pow(ageInHours + 2, 1.8);
});

module.exports = mongoose.model('Question', questionSchema);