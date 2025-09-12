import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Star,
  Calendar,
  Plus,
  Search,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { facultyData } from "../components/facultyData";

const Reviews = () => {
  const [facultyReviews, setFacultyReviews] = useState([]);
  const [allFaculty] = useState(facultyData);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFaculty] = useState("");
  const [sortBy] = useState("rating-high");
  const [selectedFacultyDetails, setSelectedFacultyDetails] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    facultyName: "",
    rating: 5,
    review: "",
    subject: "",
    semester: "",
  });

  // Advanced search state for faculty selection in form
  const [facultySearchTerm, setFacultySearchTerm] = useState("");
  const [showFacultyDropdown, setShowFacultyDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Advanced search state for main search bar
  const [showMainSearchDropdown, setShowMainSearchDropdown] = useState(false);
  const mainSearchRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowFacultyDropdown(false);
      }
      if (mainSearchRef.current && !mainSearchRef.current.contains(event.target)) {
        setShowMainSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("aggregate", "true");

      // Add search term if provided
      if (searchTerm) params.append("faculty", searchTerm);

      // Add selected faculty if provided
      if (selectedFaculty) params.append("faculty", selectedFaculty);

      // Add sort parameter
      if (sortBy) params.append("sort", sortBy);

      const response = await axios.get(`/api/reviews?${params}`);
      setFacultyReviews(response.data.facultyReviews || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to fetch reviews");
      setFacultyReviews([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedFaculty, sortBy]);

  // Memoize filtered faculty lists to avoid recalculation on every render
  const filteredFacultyForForm = useMemo(() =>
    allFaculty.filter((facultyName) =>
      facultyName.toLowerCase().includes(facultySearchTerm.toLowerCase())
    ), [allFaculty, facultySearchTerm]
  );

  const filteredFacultyForMainSearch = useMemo(() =>
    allFaculty.filter((facultyName) =>
      facultyName.toLowerCase().includes(searchTerm.toLowerCase())
    ), [allFaculty, searchTerm]
  );

  useEffect(() => {
    fetchReviews();
  }, [searchTerm, selectedFaculty, sortBy, fetchReviews]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.facultyName || !formData.review) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // Clean the form data to ensure only valid fields are sent
      const cleanFormData = {
        facultyName: formData.facultyName.trim(),
        rating: parseInt(formData.rating),
        review: formData.review.trim(),
        subject: formData.subject ? formData.subject.trim() : "",
        semester: formData.semester ? formData.semester.trim() : "",
      };

      await axios.post("/api/reviews", cleanFormData);
      toast.success("Review submitted successfully!");
      setShowForm(false);
      resetForm();
      
      // Refresh faculty details if we're viewing a specific faculty
      if (selectedFacultyDetails && cleanFormData.facultyName === selectedFacultyDetails.facultyName) {
        handleFacultyClick(selectedFacultyDetails.facultyName);
      } else {
        fetchReviews();
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error(error.response?.data?.message || "Failed to submit review");
    }
  };


  const resetForm = () => {
    setFormData({
      facultyName: "",
      rating: 5,
      review: "",
      subject: "",
      semester: "",
    });
    setFacultySearchTerm("");
    setShowFacultyDropdown(false);
  };

  const handleFacultySelect = (facultyName) => {
    setFormData({ ...formData, facultyName });
    setFacultySearchTerm(facultyName);
    setShowFacultyDropdown(false);
  };

  const handleFacultySearchChange = (e) => {
    const value = e.target.value;
    setFacultySearchTerm(value);
    setFormData({ ...formData, facultyName: value });
    setShowFacultyDropdown(true);
  };

  // Handlers for main search bar
  const handleMainSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowMainSearchDropdown(true);
  };

  const handleMainSearchSelect = (facultyName) => {
    setSearchTerm(facultyName);
    setShowMainSearchDropdown(false);
  };

  const handleMainSearchFocus = () => {
    if (searchTerm) {
      setShowMainSearchDropdown(true);
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };


  const handleFacultyClick = async (facultyName) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/reviews/faculty/${encodeURIComponent(facultyName)}`
      );
      setSelectedFacultyDetails(response.data);
    } catch (error) {
      console.error("Error fetching faculty details:", error);
      toast.error("Failed to fetch faculty details");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToAll = () => {
    setSelectedFacultyDetails(null);
  };

  // Removed duplicate filter - using memoized version above

  return (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-dark-bg-900 dark:via-dark-bg-800 dark:to-dark-bg-900 py-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 rounded-3xl blur-3xl"></div>
          <div className="relative bg-white/80 dark:bg-dark-bg-800/80 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-dark-bg-700/50">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                Faculty Reviews
              </h1>
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Read and write anonymous reviews for faculty members with ratings
              and feedback
            </p>
            <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse"></div>
                <span>Anonymous reviews</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-orange-400 rounded-full mr-2 animate-pulse"></div>
                <span>Star ratings</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse"></div>
                <span>Community driven</span>
              </div>
            </div>
          </div>
        </div>


        {/* Faculty Details View */}
        {selectedFacultyDetails ? (
          <div className="card mb-6">
            <div
              className="flex items-center mb-4 cursor-pointer text-blue-600 hover:text-blue-800"
              onClick={handleBackToAll}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span>Back to all faculty</span>
            </div>

            <div className="border-b border-gray-200 pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {selectedFacultyDetails.facultyName}
                  </h2>
                  <div className="flex items-center">
                    <div className="flex items-center">
                      {renderStars(selectedFacultyDetails.averageRating)}
                      <span className="ml-2 text-lg font-semibold">
                        {selectedFacultyDetails.averageRating}/5
                      </span>
                    </div>
                    <span className="mx-4 text-gray-300">•</span>
                    <span className="text-gray-600 dark:text-white">
                      {selectedFacultyDetails.total}{" "}
                      {selectedFacultyDetails.total === 1 ? "review" : "reviews"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFormData({
                      ...formData,
                      facultyName: selectedFacultyDetails.facultyName
                    });
                    setFacultySearchTerm(selectedFacultyDetails.facultyName);
                    setShowForm(true);
                  }}
                  className="btn-primary flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Review
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {selectedFacultyDetails.reviews &&
                selectedFacultyDetails.reviews.map((review) => (
                  <div key={review.id} className="card card-hover relative dark:bg-dark-bg-700">
                  <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          {renderStars(review.rating)}
                          <span className="ml-2 text-sm text-gray-600 dark:text-white">
                            {review.rating}/5
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center text-sm text-gray-500 dark:text-white">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(review.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-gray-700 dark:text-white leading-relaxed">
                          {review.review}
                        </p>
                      </div>

                      {/* Additional Info */}
                      {(review.subject || review.semester) && (
                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-white">
                            {review.subject && (
                              <span className="px-2 py-1 bg-gray-100 dark:bg-dark-bg-800 rounded-full">
                                {review.subject}
                              </span>
                            )}
                            {review.semester && (
                              <span className="px-2 py-1 bg-gray-100 dark:bg-dark-bg-800 rounded-full">
                                {review.semester}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <>
            {/* Controls */}
            <div className="card mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Advanced Search */}
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  <div className="relative flex-1 min-w-0" ref={mainSearchRef}>
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search faculty..."
                      value={searchTerm}
                      onChange={handleMainSearchChange}
                      onFocus={handleMainSearchFocus}
                      className="input-field pl-10 dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400 w-full text-base"
                      style={{ minWidth: 0 }}
                    />
                    
                    {/* Main Search Dropdown */}
                    {showMainSearchDropdown && filteredFacultyForMainSearch.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-dark-bg-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredFacultyForMainSearch.slice(0, 10).map((facultyName) => (
                          <div
                            key={facultyName}
                            onClick={() => handleMainSearchSelect(facultyName)}
                            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-dark-bg-600 cursor-pointer text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                          >
                            <div className="font-medium">{facultyName}</div>
                          </div>
                        ))}
                        {filteredFacultyForMainSearch.length > 10 && (
                          <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                            +{filteredFacultyForMainSearch.length - 10} more results...
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* No results message for main search */}
                    {showMainSearchDropdown && searchTerm && filteredFacultyForMainSearch.length === 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-dark-bg-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                        <div className="px-4 py-2 text-gray-500 dark:text-gray-400 text-center">
                          No faculty found matching "{searchTerm}"
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Review Button */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl blur-lg opacity-50"></div>
                  <button
                    onClick={() => setShowForm(true)}
                    className="relative btn-modern-success flex items-center text-lg py-4 px-6 shadow-2xl hover:shadow-yellow-500/25 transform hover:scale-105 transition-all duration-300"
                  >
                    <Plus className="w-5 h-5 mr-3 animate-bounce-in" />
                    Write Review
                  </button>
                </div>
              </div>
            </div>

            {/* Reviews Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading reviews...</p>
              </div>
            ) : !facultyReviews || facultyReviews.length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No reviews found
                </h3>
                <p className="text-gray-600">Be the first to write a review!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {facultyReviews.map((faculty, index) => (
                  <div
                    key={faculty.facultyName}
                    className={`card-enhanced hover-3d interactive-scale animate-fade-in-up stagger-${(index % 5) + 1} cursor-pointer relative overflow-hidden group`}
                    onClick={() => handleFacultyClick(faculty.facultyName)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-orange-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative space-y-6">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            {faculty.facultyName}
                          </h3>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/20 px-3 py-1 rounded-lg">
                              {renderStars(faculty.averageRating)}
                              <span className="ml-2 text-sm font-semibold text-gray-800 dark:text-yellow-300">
                                {faculty.averageRating}/5
                              </span>
                            </div>
                            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 px-3 py-1 rounded-lg">
                              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                {faculty.reviewCount} {faculty.reviewCount === 1 ? "review" : "reviews"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Reviews Preview */}
                      <div className="space-y-3">
                        {faculty.reviews &&
                          faculty.reviews.slice(0, 2).map((review, index) => (
                            <div
                              key={index}
                              className="bg-gray-50 dark:bg-dark-bg-700 p-3 rounded-lg"
                            >
                              <p className="text-gray-700 dark:text-white text-sm leading-relaxed">
                                {review.review}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center">
                                  {renderStars(review.rating)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-white">
                                  {formatDate(review.createdAt)}
                                </div>
                              </div>
                            </div>
                          ))}
                        {faculty.reviews && faculty.reviews.length > 2 && (
                          <div className="text-center text-sm text-gray-500 dark:text-white">
                            +{faculty.reviews.length - 2} more reviews
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Submit Review Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-dark-bg-900 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto transition-colors duration-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Write a Review
                  </h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                      Faculty Name *
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={facultySearchTerm}
                        onChange={handleFacultySearchChange}
                        onFocus={() => setShowFacultyDropdown(true)}
                        placeholder="Search for faculty member..."
                        className="input-field pl-10 dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                        required
                      />
                    </div>
                    
                    {/* Advanced Search Dropdown */}
                    {showFacultyDropdown && filteredFacultyForForm.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-bg-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredFacultyForForm.slice(0, 10).map((facultyName) => (
                          <div
                            key={facultyName}
                            onClick={() => handleFacultySelect(facultyName)}
                            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-dark-bg-600 cursor-pointer text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                          >
                            <div className="font-medium">{facultyName}</div>
                          </div>
                        ))}
                        {filteredFacultyForForm.length > 10 && (
                          <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                            +{filteredFacultyForForm.length - 10} more results...
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* No results message */}
                    {showFacultyDropdown && facultySearchTerm && filteredFacultyForForm.length === 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-bg-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                        <div className="px-4 py-2 text-gray-500 dark:text-gray-400 text-center">
                          No faculty found matching "{facultySearchTerm}"
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                      Rating *
                    </label>
                    <div className="flex items-center space-x-2">
                      {Array.from({ length: 5 }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, rating: i + 1 })
                          }
                          className="focus:outline-none"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              i < formData.rating
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-sm text-gray-600 dark:text-white">
                        {formData.rating}/5
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                      Review *
                    </label>
                    <textarea
                      value={formData.review}
                      onChange={(e) =>
                        setFormData({ ...formData, review: e.target.value })
                      }
                      placeholder="Share your experience with this faculty member..."
                      rows="4"
                      className="input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                        Subject (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.subject}
                        onChange={(e) =>
                          setFormData({ ...formData, subject: e.target.value })
                        }
                        placeholder="e.g., Mathematics"
                        className="input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                        Semester (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.semester}
                        onChange={(e) =>
                          setFormData({ ...formData, semester: e.target.value })
                        }
                        placeholder="e.g., Fall 2024"
                        className="input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 btn-secondary dark:bg-dark-bg-700 dark:text-white"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 btn-primary">
                      Submit Review
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

export default Reviews;
