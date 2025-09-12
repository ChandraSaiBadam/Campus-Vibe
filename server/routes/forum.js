const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Comment = require('../models/Comment');
const Vote = require('../models/Vote');
const { generateUsernameFromIP, getRealIP } = require('../utils/usernameGenerator');

// Sanitize HTML function
const sanitizeHtml = (text) => {
  return text.replace(/<[^>]*>/g, '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
};

// Simple in-memory cache for frequently accessed data
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

// Helper function to get client IP
const getClientIP = (req) => {
  return req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
         (req.connection.socket ? req.connection.socket.remoteAddress : null) || 'unknown';
};

// Get all questions with pagination and sorting
router.get('/questions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const sort = req.query.sort || 'hot'; // hot, new, top, controversial
    const category = req.query.category;
    const search = req.query.search;

    let sortCriteria;
    switch (sort) {
      case 'new':
        sortCriteria = { createdAt: -1 };
        break;
      case 'top':
        sortCriteria = { 'votes.upvotes': -1 };
        break;
      case 'controversial':
        sortCriteria = { 'votes.downvotes': -1, 'votes.upvotes': -1 };
        break;
      case 'hot':
      default:
        // For hot sorting, we'll use a combination of votes and recency
        sortCriteria = { 'votes.upvotes': -1, createdAt: -1 };
        break;
    }

    let query = {};
    if (category && category !== 'all') {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const questions = await Question.find(query)
      .sort(sortCriteria)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Calculate comment counts for each question
    const questionIds = questions.map(q => q._id);
    const commentCounts = await Comment.aggregate([
      {
        $match: {
          questionId: { $in: questionIds },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$questionId',
          count: { $sum: 1 }
        }
      }
    ]);

    const commentCountMap = commentCounts.reduce((acc, item) => {
      acc[item._id.toString()] = item.count;
      return acc;
    }, {});

    // Get user's votes for these questions
    const clientIP = getClientIP(req);
    const votes = await Vote.find({
      targetId: { $in: questionIds },
      ipAddress: clientIP,
      targetType: 'Question'
    }).lean();

    const voteMap = votes.reduce((acc, vote) => {
      acc[vote.targetId.toString()] = vote.voteType;
      return acc;
    }, {});

    // Add comment counts and user votes to questions
    const questionsWithCounts = questions.map(question => ({
      ...question,
      commentCount: commentCountMap[question._id.toString()] || 0,
      userVote: voteMap[question._id.toString()]
    }));

    const total = await Question.countDocuments(query);

    res.json({
      questions: questionsWithCounts,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Get a single question with its comments
router.get('/questions/:id', async (req, res) => {
  try {
    const questionId = req.params.id;
    
    // Don't auto-increment view count - only on card click
    const question = await Question.findById(questionId).lean();

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Get client IP for vote lookup
    const clientIP = getClientIP(req);

    // Get user's vote for this question
    const questionVote = await Vote.findOne({
      targetId: questionId,
      ipAddress: clientIP,
      targetType: 'Question'
    });

    // Get all comments for this question with nested structure
    const buildCommentTree = async () => {
      // Get all comments for this question
      const allComments = await Comment.find({
        questionId,
        isDeleted: false
      })
      .sort({ createdAt: 1 })
      .lean();

      // Get all comment IDs for vote lookup
      const commentIds = allComments.map(c => c._id);
      
      // Get user's votes for all comments
      const commentVotes = await Vote.find({
        targetId: { $in: commentIds },
        ipAddress: clientIP,
        targetType: 'Comment'
      }).lean();

      const voteMap = commentVotes.reduce((acc, vote) => {
        acc[vote.targetId.toString()] = vote.voteType;
        return acc;
      }, {});

      // Add user vote to each comment
      const commentsWithVotes = allComments.map(comment => ({
        ...comment,
        userVote: voteMap[comment._id.toString()]
      }));

      // Build comment tree
      const commentMap = {};
      const rootComments = [];

      // First pass: create comment map and initialize reply arrays
      commentsWithVotes.forEach(comment => {
        comment.replies = [];
        commentMap[comment._id.toString()] = comment;
      });

      // Second pass: build tree structure
      commentsWithVotes.forEach(comment => {
        if (comment.parentId) {
          const parent = commentMap[comment.parentId.toString()];
          if (parent) {
            parent.replies.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      // Calculate reply counts recursively
      const calculateReplyCounts = (comment) => {
        if (comment.replies && comment.replies.length > 0) {
          comment.replyCount = comment.replies.length;
          comment.replies.forEach(calculateReplyCounts);
        } else {
          comment.replyCount = 0;
        }
      };

      rootComments.forEach(calculateReplyCounts);
      return rootComments;
    };

    const comments = await buildCommentTree();

    const questionWithVote = {
      ...question,
      userVote: questionVote?.voteType
    };

    res.json({
      question: questionWithVote,
      comments
    });
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ error: 'Failed to fetch question' });
  }
});

// Increment view count (separate endpoint for card clicks)
router.post('/questions/:id/view', async (req, res) => {
  try {
    const questionId = req.params.id;

    // Update view count
    const question = await Question.findByIdAndUpdate(
      questionId,
      { $inc: { viewCount: 1 } },
      { new: true }
    );

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ viewCount: question.viewCount });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new question
router.post('/questions', async (req, res) => {
  try {
    const { title, content, category, tags } = req.body;
    const clientIP = getClientIP(req);
    const userAgent = req.get('User-Agent') || '';
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Sanitize input
    const author = generateUsernameFromIP(clientIP);

    const question = new Question({
      title: sanitizeHtml(title.trim()),
      content: sanitizeHtml(content.trim()),
      author,
      category: category || 'General',
      tags: Array.isArray(tags) ? tags.map(tag => sanitizeHtml(tag.trim())).filter(Boolean) : [],
      ipAddress: clientIP,
      userAgent,
      isAnonymous: true
    });

    await question.save();
    
    res.status(201).json({
      message: 'Question created successfully',
      question
    });
  } catch (error) {
    console.error('Error creating question:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// Get replies to a comment
router.get('/comments/:id/replies', async (req, res) => {
  try {
    const parentId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const replies = await Comment.find({ 
      parentId, 
      isDeleted: false 
    })
    .sort({ 'votes.upvotes': -1, createdAt: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

    // Get user's votes for these replies
    const clientIP = getClientIP(req);
    const votes = await Vote.find({ 
      targetId: { $in: replies.map(r => r._id) },
      ipAddress: clientIP 
    }).lean();

    const voteMap = votes.reduce((acc, vote) => {
      acc[vote.targetId.toString()] = vote.voteType;
      return acc;
    }, {});

    res.json({
      replies: replies.map(reply => ({
        ...reply,
        userVote: voteMap[reply._id.toString()]
      }))
    });
  } catch (error) {
    console.error('Error fetching replies:', error);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// Create a new comment or reply
router.post('/comments', async (req, res) => {
  try {
    const { questionId, parentId, content } = req.body;
    const clientIP = getClientIP(req);
    const userAgent = req.get('User-Agent') || '';
    
    if (!questionId || !content) {
      return res.status(400).json({ error: 'Question ID and content are required' });
    }

    // Verify question exists
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const author = generateUsernameFromIP(clientIP);

    const comment = new Comment({
      questionId,
      parentId: parentId || null,
      content: sanitizeHtml(content.trim()),
      author,
      ipAddress: clientIP,
      userAgent,
      isAnonymous: true
    });

    await comment.save();
    
    res.status(201).json({
      message: 'Comment created successfully',
      comment
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Vote on a question or comment
router.post('/vote', async (req, res) => {
  try {
    const { targetId, targetType, voteType } = req.body;
    const clientIP = getClientIP(req);
    const userAgent = req.get('User-Agent') || '';
    
    if (!targetId || !targetType || !voteType) {
      return res.status(400).json({ error: 'Target ID, type, and vote type are required' });
    }

    if (!['Question', 'Comment'].includes(targetType)) {
      return res.status(400).json({ error: 'Invalid target type' });
    }

    if (!['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({ error: 'Invalid vote type' });
    }

    const result = await Vote.changeVote(targetId, targetType, clientIP, voteType);
    
    // Get updated vote counts
    const Model = require(`../models/${targetType}`);
    const target = await Model.findById(targetId).select('votes').lean();
    
    res.json({
      message: `Vote ${result.action} successfully`,
      action: result.action,
      votes: target?.votes || { upvotes: 0, downvotes: 0 }
    });
  } catch (error) {
    console.error('Error processing vote:', error);
    res.status(500).json({ error: 'Failed to process vote' });
  }
});

// Get categories
router.get('/categories', (req, res) => {
  const cached = getCachedData('categories');
  if (cached) {
    return res.json({ categories: cached });
  }

  const categories = ['Academic', 'Campus Life', 'Events', 'General', 'Technical', 'Career'];
  setCachedData('categories', categories);
  res.json({ categories });
});

// Get trending tags
router.get('/tags/trending', async (req, res) => {
  try {
    const cached = getCachedData('trendingTags');
    if (cached) {
      return res.json({ tags: cached });
    }

    const trendingTags = await Question.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
      { $project: { tag: '$_id', count: 1, _id: 0 } }
    ]);

    setCachedData('trendingTags', trendingTags);
    res.json({ tags: trendingTags });
  } catch (error) {
    console.error('Error fetching trending tags:', error);
    res.status(500).json({ error: 'Failed to fetch trending tags' });
  }
});

module.exports = router;