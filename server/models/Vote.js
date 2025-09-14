const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Target ID is required'],
    refPath: 'targetType'
  },
  targetType: {
    type: String,
    required: [true, 'Target type is required'],
    enum: ['Question', 'Comment']
  },
  voteType: {
    type: String,
    required: [true, 'Vote type is required'],
    enum: ['upvote', 'downvote']
  },
  ipAddress: {
    type: String,
    required: [true, 'IP address is required']
  },
  userAgent: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Compound indexes to prevent duplicate votes and optimize queries
voteSchema.index({ targetId: 1, targetType: 1, ipAddress: 1 }, { unique: true });
voteSchema.index({ targetId: 1, targetType: 1 });
voteSchema.index({ ipAddress: 1 });

// Pre-save middleware to update vote counts
voteSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const Model = mongoose.model(this.targetType);
      const increment = this.voteType === 'upvote' ? 
        { 'votes.upvotes': 1 } : 
        { 'votes.downvotes': 1 };
      
      await Model.findByIdAndUpdate(this.targetId, { $inc: increment });
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Pre-remove middleware to update vote counts when vote is removed
voteSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    const Model = mongoose.model(this.targetType);
    const decrement = this.voteType === 'upvote' ? 
      { 'votes.upvotes': -1 } : 
      { 'votes.downvotes': -1 };
    
    await Model.findByIdAndUpdate(this.targetId, { $inc: decrement });
  } catch (error) {
    return next(error);
  }
  next();
});

// Static method to change vote
voteSchema.statics.changeVote = async function(targetId, targetType, ipAddress, newVoteType) {
  const existingVote = await this.findOne({ targetId, targetType, ipAddress });
  
  if (existingVote) {
    if (existingVote.voteType === newVoteType) {
      // Remove vote if same type
      await existingVote.deleteOne();
      return { action: 'removed', vote: null };
    } else {
      // Update vote counts for the change
      const Model = mongoose.model(targetType);
      const oldDecrement = existingVote.voteType === 'upvote' ? 
        { 'votes.upvotes': -1 } : 
        { 'votes.downvotes': -1 };
      const newIncrement = newVoteType === 'upvote' ? 
        { 'votes.upvotes': 1 } : 
        { 'votes.downvotes': 1 };
      
      await Model.findByIdAndUpdate(targetId, { 
        $inc: { ...oldDecrement, ...newIncrement } 
      });
      
      // Update existing vote
      existingVote.voteType = newVoteType;
      await existingVote.save();
      return { action: 'changed', vote: existingVote };
    }
  } else {
    // Create new vote
    const newVote = new this({
      targetId,
      targetType,
      voteType: newVoteType,
      ipAddress
    });
    await newVote.save();
    return { action: 'created', vote: newVote };
  }
};

module.exports = mongoose.model('Vote', voteSchema);