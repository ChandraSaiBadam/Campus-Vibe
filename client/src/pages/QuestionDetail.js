import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ThumbsUp, 
  ThumbsDown, 
  Eye, 
  Clock, 
  Tag, 
  MessageSquare,
  Reply,
  ArrowLeft,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';

const CommentTree = ({ comment, onVote, onReply, onLoadReplies, depth = 0 }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [loadingReplies, setLoadingReplies] = useState(false);

  const maxDepth = 5;

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    try {
      const response = await fetch('http://localhost:3001/api/forum/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: comment.questionId,
          parentId: comment._id,
          content: replyContent.trim()
        }),
      });

      if (!response.ok) throw new Error('Failed to post reply');

      const data = await response.json();
      setReplyContent('');
      setShowReplyForm(false);
      toast.success('Reply posted successfully!');
      
      if (onReply) {
        onReply(comment._id, data.comment);
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      toast.error('Failed to post reply');
    }
  };

  const handleLoadReplies = async () => {
    if (comment.replyCount === 0 || comment.replies) return;
    
    setLoadingReplies(true);
    try {
      const response = await fetch(`http://localhost:3001/api/forum/comments/${comment._id}/replies`);
      if (!response.ok) throw new Error('Failed to load replies');
      
      const data = await response.json();
      if (onLoadReplies) {
        onLoadReplies(comment._id, data.replies);
      }
    } catch (error) {
      console.error('Error loading replies:', error);
      toast.error('Failed to load replies');
    } finally {
      setLoadingReplies(false);
    }
  };

  const getScoreColor = (upvotes, downvotes) => {
    const score = upvotes - downvotes;
    if (score > 0) return 'text-green-600 dark:text-green-400';
    if (score < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''}`}>
      <div className="bg-white dark:bg-dark-bg-800 rounded-lg p-4 mb-4 shadow-sm">
        <div className="flex items-start space-x-3">
          {/* Vote Section */}
          <div className="flex flex-col items-center space-y-1 min-w-0">
            <button
              onClick={() => onVote(comment._id, 'upvote', 'Comment')}
              className={`p-1 rounded transition-colors ${
                comment.userVote === 'upvote'
                  ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900 hover:text-green-600 dark:hover:text-green-400'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <span className={`text-sm font-semibold ${getScoreColor(comment.votes.upvotes, comment.votes.downvotes)}`}>
              {comment.votes.upvotes - comment.votes.downvotes}
            </span>
            <button
              onClick={() => onVote(comment._id, 'downvote', 'Comment')}
              className={`p-1 rounded transition-colors ${
                comment.userVote === 'downvote'
                  ? 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-400'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
          </div>

          {/* Comment Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {comment.author}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-500 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {formatTimeAgo(comment.createdAt)}
              </span>
            </div>

            <p className="text-gray-800 dark:text-gray-200 mb-3">
              {comment.content}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              {depth < maxDepth && (
                <button
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center"
                >
                  <Reply className="w-4 h-4 mr-1" />
                  Reply
                </button>
              )}
              
              {comment.replyCount > 0 && (
                <button
                  onClick={comment.replies ? () => onLoadReplies(comment._id, null) : handleLoadReplies}
                  disabled={loadingReplies}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center"
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  {loadingReplies ? 'Loading...' : comment.replies ? 'Hide replies' : `${comment.replyCount} replies`}
                </button>
              )}
            </div>

            {/* Reply Form */}
            {showReplyForm && (
              <form onSubmit={handleReply} className="mt-4">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write your reply..."
                  rows={3}
                  className="w-full input-field mb-2 dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                  required
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowReplyForm(false)}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary text-sm">
                    Post Reply
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentTree
              key={reply._id}
              comment={reply}
              onVote={onVote}
              onReply={onReply}
              onLoadReplies={onLoadReplies}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const QuestionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (id) {
      fetchQuestion();
    }
  }, [id]);

  const fetchQuestion = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/forum/questions/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Question not found');
          navigate('/forum');
          return;
        }
        throw new Error('Failed to fetch question');
      }
      
      const data = await response.json();
      setQuestion(data.question);
      setComments(data.comments);
    } catch (error) {
      console.error('Error fetching question:', error);
      toast.error('Failed to load question');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (targetId, voteType, targetType) => {
    try {
      const response = await fetch('http://localhost:3001/api/forum/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetId,
          targetType,
          voteType
        }),
      });

      if (!response.ok) throw new Error('Failed to vote');
      
      const data = await response.json();
      
      if (targetType === 'Question') {
        setQuestion(prev => ({ ...prev, votes: data.votes }));
      } else {
        // Update comment votes - handle both top-level and nested comments
        const updateCommentVotes = (comments) => {
          return comments.map(comment => {
            if (comment._id === targetId) {
              return { ...comment, votes: data.votes };
            }
            // If comment has replies, recursively update them
            if (comment.replies && comment.replies.length > 0) {
              return { ...comment, replies: updateCommentVotes(comment.replies) };
            }
            return comment;
          });
        };
        
        setComments(prevComments => updateCommentVotes(prevComments));
      }

      toast.success(`Vote ${data.action} successfully`);
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    setSubmittingComment(true);
    try {
      const response = await fetch('http://localhost:3001/api/forum/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: id,
          content: commentContent.trim()
        }),
      });

      if (!response.ok) throw new Error('Failed to post comment');

      const data = await response.json();
      setComments([...comments, data.comment]);
      setCommentContent('');
      toast.success('Comment posted successfully!');
      
      // Update question comment count
      setQuestion(prev => ({ ...prev, commentCount: prev.commentCount + 1 }));
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReply = (parentId, newReply) => {
    const addReplyToComment = (comments) => {
      return comments.map(comment => {
        if (comment._id === parentId) {
          const replies = comment.replies ? [...comment.replies, newReply] : [newReply];
          return {
            ...comment,
            replies,
            replyCount: comment.replyCount + 1
          };
        }
        // If comment has replies, recursively check them
        if (comment.replies && comment.replies.length > 0) {
          return { ...comment, replies: addReplyToComment(comment.replies) };
        }
        return comment;
      });
    };
    
    setComments(prevComments => addReplyToComment(prevComments));
    
    // Update question comment count
    setQuestion(prev => ({ ...prev, commentCount: prev.commentCount + 1 }));
  };

  const handleLoadReplies = (parentId, replies) => {
    const updateCommentReplies = (comments) => {
      return comments.map(comment => {
        if (comment._id === parentId) {
          if (replies === null) {
            // Hide replies
            return { ...comment, replies: undefined };
          } else {
            // Show replies
            return { ...comment, replies };
          }
        }
        // If comment has replies, recursively check them
        if (comment.replies && comment.replies.length > 0) {
          return { ...comment, replies: updateCommentReplies(comment.replies) };
        }
        return comment;
      });
    };
    
    setComments(prevComments => updateCommentReplies(prevComments));
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getScoreColor = (upvotes, downvotes) => {
    const score = upvotes - downvotes;
    if (score > 0) return 'text-green-600 dark:text-green-400';
    if (score < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading question...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Question not found
            </h1>
            <button
              onClick={() => navigate('/forum')}
              className="btn-primary"
            >
              Back to Forum
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-900 py-8 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/forum')}
          className="flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Forum
        </button>

        {/* Question */}
        <div className="card mb-8">
          <div className="flex items-start space-x-4">
            {/* Vote Section */}
            <div className="flex flex-col items-center space-y-2 min-w-0">
              <button
                onClick={() => handleVote(question._id, 'upvote', 'Question')}
                className={`p-2 rounded transition-colors ${
                  question.userVote === 'upvote'
                    ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900 hover:text-green-600 dark:hover:text-green-400'
                }`}
              >
                <ThumbsUp className="w-6 h-6" />
              </button>
              <span className={`text-lg font-bold ${getScoreColor(question.votes.upvotes, question.votes.downvotes)}`}>
                {question.votes.upvotes - question.votes.downvotes}
              </span>
              <button
                onClick={() => handleVote(question._id, 'downvote', 'Question')}
                className={`p-2 rounded transition-colors ${
                  question.userVote === 'downvote'
                    ? 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-400'
                }`}
              >
                <ThumbsDown className="w-6 h-6" />
              </button>
            </div>

            {/* Question Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-4">
                <span className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 rounded-full text-sm">
                  {question.category}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  by {question.author}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-500 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTimeAgo(question.createdAt)}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {question.title}
              </h1>

              {/* Show image if available */}
              {question.image && (
                <div className="mb-4">
                  <img
                    src={question.image}
                    alt="Question image"
                    className="max-w-full h-auto max-h-64 object-cover rounded-lg border dark:border-gray-600"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="prose prose-gray dark:prose-invert max-w-none mb-4">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {question.content}
                </p>
              </div>

              {/* Tags */}
              {question.tags && question.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {question.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  {question.commentCount} comments
                </span>
                <span className="flex items-center">
                  <Eye className="w-4 h-4 mr-1" />
                  {question.viewCount} views
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Comment Form - Smaller Size */}
        <div className="card mb-6">
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-3">
            Add a Comment
          </h3>
          <form onSubmit={handleComment}>
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              className="w-full input-field mb-3 text-sm dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
              required
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingComment}
                className="btn-primary text-sm px-4 py-2"
              >
                {submittingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
        </div>

        {/* Comments */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {comments.length} Comments
          </h3>
          
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            comments.map((comment) => (
              <CommentTree
                key={comment._id}
                comment={comment}
                onVote={handleVote}
                onReply={handleReply}
                onLoadReplies={handleLoadReplies}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionDetail;