import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Clock,
  Tag,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Upload,
  X,
  Image,
  Share2
} from 'lucide-react';
import toast from 'react-hot-toast';

const Forum = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('hot');
  const [category, setCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [categories, setCategories] = useState([]);
  const [trendingTags, setTrendingTags] = useState([]);

  // Form state for creating questions
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'General',
    tags: ''
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        sort: sortBy,
        ...(category !== 'all' && { category }),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm })
      });

      const response = await fetch(`http://localhost:3001/api/forum/questions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch questions');

      const data = await response.json();
      setQuestions(data.questions);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortBy, category, debouncedSearchTerm]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchQuestions();
    fetchCategories();
    fetchTrendingTags();
  }, [fetchQuestions]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/forum/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      
      const data = await response.json();
      setCategories(data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTrendingTags = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/forum/tags/trending');
      if (!response.ok) throw new Error('Failed to fetch trending tags');
      
      const data = await response.json();
      setTrendingTags(data.tags.slice(0, 10));
    } catch (error) {
      console.error('Error fetching trending tags:', error);
    }
  };

  const handleVote = async (questionId, voteType) => {
    try {
      const response = await fetch('http://localhost:3001/api/forum/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetId: questionId,
          targetType: 'Question',
          voteType
        }),
      });

      if (!response.ok) throw new Error('Failed to vote');
      
      const data = await response.json();
      
      // Update the question in the local state
      setQuestions(prevQuestions =>
        prevQuestions.map(q =>
          q._id === questionId
            ? { ...q, votes: data.votes }
            : q
        )
      );

      toast.success(`Vote ${data.action} successfully`);
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (1MB = 1024 * 1024 bytes)
    if (file.size > 1024 * 1024) {
      toast.error('Image size must be less than 1MB');
      e.target.value = ''; // Clear the input
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      e.target.value = ''; // Clear the input
      return;
    }

    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    // Clear file input
    const fileInput = document.getElementById('image-upload');
    if (fileInput) fileInput.value = '';
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('http://localhost:3001/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload image');
      
      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    try {
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      let imageUrl = null;
      
      // Upload image if selected
      if (selectedImage) {
        setUploadingImage(true);
        try {
          imageUrl = await uploadImage(selectedImage);
        } catch (error) {
          toast.error('Failed to upload image');
          setUploadingImage(false);
          return;
        }
        setUploadingImage(false);
      }

      const response = await fetch('http://localhost:3001/api/forum/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          category: formData.category,
          tags: tagsArray,
          image: imageUrl
        }),
      });

      if (!response.ok) throw new Error('Failed to create question');
      
      const data = await response.json();
      
      // Reset form
      setFormData({ title: '', content: '', category: 'General', tags: '' });
      setSelectedImage(null);
      setImagePreview(null);
      setShowCreateForm(false);
      fetchQuestions(); // Refresh questions list
      toast.success('Question posted successfully!');
    } catch (error) {
      console.error('Error creating question:', error);
      toast.error('Failed to create question');
    }
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

  const handleQuestionClick = async (questionId) => {
    try {
      // Increment view count
      await fetch(`http://localhost:3001/api/forum/questions/${questionId}/view`, {
        method: 'POST',
      });

      // Navigate to question detail
      navigate(`/forum/question/${questionId}`);
    } catch (error) {
      console.error('Error incrementing view count:', error);
      // Still navigate even if view count fails
      navigate(`/forum/question/${questionId}`);
    }
  };

  const handleShareQuestion = async (questionId, e) => {
    e.preventDefault();
    e.stopPropagation();

    const questionUrl = `${window.location.origin}/forum/question/${questionId}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this question on Campus Connect',
          url: questionUrl,
        });
      } else {
        await navigator.clipboard.writeText(questionUrl);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(questionUrl);
        toast.success('Link copied to clipboard!');
      } catch (fallbackError) {
        console.error('Error sharing:', error);
        toast.error('Failed to share link');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-dark-bg-900 dark:via-dark-bg-800 dark:to-dark-bg-900 py-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-3xl"></div>
          <div className="relative bg-white/80 dark:bg-dark-bg-800/80 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-dark-bg-700/50">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Campus Q&A Forum
              </h1>
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Ask questions, share knowledge, and connect with your campus community
            </p>
            <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <span>Real-time discussions</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
                <span>Anonymous posting</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-2 animate-pulse"></div>
                <span>Expert answers</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Ask Question Button */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur-lg opacity-50"></div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="relative w-full btn-modern-primary flex items-center justify-center text-lg py-4 px-6 shadow-2xl hover:shadow-indigo-500/25 transform hover:scale-105 transition-all duration-300"
              >
                <Plus className="w-6 h-6 mr-3 animate-bounce-in" />
                Ask Question
              </button>
            </div>

            {/* Filters */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filters
              </h3>
              
              {/* Sort Options */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sort by
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                >
                  <option value="hot">🔥 Hot</option>
                  <option value="new">🕐 New</option>
                  <option value="top">⬆️ Top</option>
                  <option value="controversial">⚡ Controversial</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Trending Tags */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Trending Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {trendingTags.map((tag) => (
                  <button
                    key={tag.tag}
                    onClick={() => setSearchTerm(tag.tag)}
                    className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 rounded-full text-xs hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {tag.tag}
                    <span className="ml-1 text-primary-600 dark:text-primary-400">
                      ({tag.count})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Questions List */}
            {loading ? (
              <div className="space-y-4">
                {/* Loading Skeletons */}
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="card animate-pulse">
                    <div className="flex items-start space-x-4">
                      {/* Vote Section Skeleton */}
                      <div className="flex flex-col items-center space-y-1 min-w-0">
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="w-6 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>

                      {/* Question Content Skeleton */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                          <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>

                        <div className="w-3/4 h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                        <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                        <div className="w-2/3 h-4 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>

                        {/* Tags Skeleton */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                          <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                        </div>

                        {/* Stats Skeleton */}
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : questions.length === 0 ? (
              <div className="card text-center py-8">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No questions found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Be the first to ask a question in this community!
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn-primary"
                >
                  Ask the First Question
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div key={question._id} className={`card-enhanced hover-3d interactive-scale animate-fade-in-up stagger-${(index % 5) + 1} relative overflow-hidden group`}>
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-start space-x-6">
                      {/* Vote Section */}
                      <div className="flex flex-col items-center space-y-2 min-w-0 bg-gradient-to-b from-gray-50 to-white dark:from-dark-bg-700 dark:to-dark-bg-800 p-4 rounded-2xl shadow-sm">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleVote(question._id, 'upvote');
                          }}
                          className={`w-10 h-10 rounded-xl transition-all duration-200 flex items-center justify-center ${
                            question.userVote === 'upvote'
                              ? 'text-white bg-gradient-to-br from-green-500 to-green-600 shadow-lg transform scale-110'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-green-100 hover:to-green-200 dark:hover:from-green-900 dark:hover:to-green-800 hover:text-green-600 dark:hover:text-green-400 hover:shadow-md hover:scale-105'
                          }`}
                        >
                          <ThumbsUp className="w-5 h-5" />
                        </button>
                        <span className={`text-lg font-bold ${getScoreColor(question.votes.upvotes, question.votes.downvotes)}`}>
                          {question.votes.upvotes - question.votes.downvotes}
                        </span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleVote(question._id, 'downvote');
                          }}
                          className={`w-10 h-10 rounded-xl transition-all duration-200 flex items-center justify-center ${
                            question.userVote === 'downvote'
                              ? 'text-white bg-gradient-to-br from-red-500 to-red-600 shadow-lg transform scale-110'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-red-100 hover:to-red-200 dark:hover:from-red-900 dark:hover:to-red-800 hover:text-red-600 dark:hover:text-red-400 hover:shadow-md hover:scale-105'
                          }`}
                        >
                          <ThumbsDown className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Question Content */}
                      <div
                        onClick={() => handleQuestionClick(question._id)}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="flex items-center space-x-3 mb-4">
                          <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 dark:from-indigo-900 dark:to-purple-900 dark:text-indigo-200 rounded-full text-xs font-medium shadow-sm">
                            {question.category}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                            <div className="w-6 h-6 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mr-2">
                              <span className="text-xs text-white font-bold">{question.author.charAt(0).toUpperCase()}</span>
                            </div>
                            {question.author}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-500 flex items-center bg-gray-100 dark:bg-dark-bg-700 px-2 py-1 rounded-lg">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTimeAgo(question.createdAt)}
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200 leading-tight">
                          {question.title}
                        </h3>

                        {/* Show image if available */}
                        {question.image && (
                          <div className="mb-3">
                            <img
                              src={question.image}
                              alt="Question image"
                              className="max-w-full h-auto max-h-48 object-cover rounded-lg border dark:border-gray-600"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                          {question.content}
                        </p>

                        {/* Tags */}
                        {question.tags && question.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {question.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex items-center space-x-6 text-sm">
                            <div className="flex items-center bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg">
                              <MessageSquare className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                              <span className="text-blue-700 dark:text-blue-300 font-medium">{question.commentCount || 0}</span>
                              <span className="text-blue-600 dark:text-blue-400 ml-1">comments</span>
                            </div>
                            <div className="flex items-center bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-lg">
                              <Eye className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                              <span className="text-green-700 dark:text-green-300 font-medium">{question.viewCount || 0}</span>
                              <span className="text-green-600 dark:text-green-400 ml-1">views</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleShareQuestion(question._id, e)}
                            className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:scale-105"
                            title="Share question"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 bg-white dark:bg-dark-bg-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-md text-sm font-medium ${
                          currentPage === page
                            ? 'bg-primary-600 text-white'
                            : 'bg-white dark:bg-dark-bg-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg-600'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 bg-white dark:bg-dark-bg-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Question Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-dark-bg-800 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Ask a Question
                </h2>
                
                <form onSubmit={handleCreateQuestion} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="What's your question?"
                      className="w-full input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Content *
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Provide more details about your question..."
                      rows={6}
                      className="w-full input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="e.g., javascript, react, web-development"
                      className="w-full input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Image (optional, max 1MB)
                    </label>
                    <div className="mt-1">
                      {!imagePreview ? (
                        <div className="flex items-center justify-center w-full">
                          <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
                              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                PNG, JPG, JPEG (MAX. 1MB)
                              </p>
                            </div>
                            <input
                              id="image-upload"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleImageChange}
                            />
                          </label>
                        </div>
                      ) : (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="max-w-full h-auto max-h-48 object-cover rounded-lg border dark:border-gray-600"
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={uploadingImage}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingImage ? 'Uploading Image...' : 'Post Question'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Forum;