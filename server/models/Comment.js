const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: [true, 'Question ID is required']
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null // null for top-level comments, ObjectId for replies
  },
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true,
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    default: 'Anonymous'
  },
  votes: {
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 }
  },
  replyCount: {
    type: Number,
    default: 0
  },
  depth: {
    type: Number,
    default: 0,
    max: [5, 'Maximum nesting depth is 5 levels']
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
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
commentSchema.index({ questionId: 1, createdAt: 1 });
commentSchema.index({ parentId: 1, createdAt: 1 });
commentSchema.index({ questionId: 1, parentId: 1, createdAt: 1 });
commentSchema.index({ votes: -1 });

// Virtual for score calculation
commentSchema.virtual('score').get(function() {
  return this.votes.upvotes - this.votes.downvotes;
});

// Pre-save middleware to calculate depth
commentSchema.pre('save', async function(next) {
  if (this.isNew && this.parentId) {
    try {
      const parent = await this.constructor.findById(this.parentId);
      if (parent) {
        this.depth = parent.depth + 1;
        // Update parent's reply count
        await this.constructor.findByIdAndUpdate(
          this.parentId,
          { $inc: { replyCount: 1 } }
        );
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Post-save middleware to update question's comment count
commentSchema.post('save', async function(doc) {
  if (doc.isNew && !doc.isDeleted) {
    try {
      const Question = require('./Question');
      await Question.findByIdAndUpdate(
        doc.questionId,
        { $inc: { commentCount: 1 } }
      );
    } catch (error) {
      console.error('Error updating question comment count:', error);
    }
  }
});

module.exports = mongoose.model('Comment', commentSchema);