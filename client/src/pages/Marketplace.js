import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  MapPin,
  Phone,
  Mail,
  Trash2,
  Edit,
  ShoppingBag,
  BookOpen,
  Monitor,
  Package,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

const Marketplace = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPostForm, setShowPostForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [categories, setCategories] = useState([]);
  const [expandedItem, setExpandedItem] = useState(null);
  const [isPosting, setIsPosting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "Books",
    contact: "",
    email: "",
    image: null,
  });

  const categoryIcons = {
    Books: BookOpen,
    Notes: BookOpen,
    Gadgets: Monitor,
    Other: Package,
  };

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, [searchTerm, selectedCategory, sortBy]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (selectedCategory !== "all")
        params.append("category", selectedCategory);
      if (sortBy) params.append("sort", sortBy);

      const response = await axios.get(`/api/marketplace?${params}`);
      setItems(response.data.items);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("Failed to fetch items");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get("/api/marketplace/categories");
      setCategories(response.data.categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isPosting) return;
    setIsPosting(true);

    if (
      !formData.title ||
      !formData.description ||
      !formData.price ||
      !formData.contact ||
      !formData.email
    ) {
      toast.error("Please fill in all required fields");
      setIsPosting(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      setIsPosting(false);
      return;
    }

    try {
      const submitData = new FormData();
      submitData.append("title", formData.title);
      submitData.append("description", formData.description);
      submitData.append("price", formData.price);
      submitData.append("category", formData.category);
      submitData.append("contact", formData.contact);
      submitData.append("email", formData.email);
      if (formData.image) {
        submitData.append("image", formData.image);
      }

      const response = await axios.post("/api/marketplace", submitData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Item posted successfully!");
      setShowPostForm(false);
      resetForm();
      fetchItems();
    } catch (error) {
      console.error("Error posting item:", error);
      toast.error(error.response?.data?.message || "Failed to post item");
    }
    setIsPosting(false);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      price: "",
      category: "Books",
      contact: "",
      email: "",
      image: null,
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB
        toast.error("Image size must be less than 5MB");
        return;
      }
      setFormData({ ...formData, image: file });
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Function to get image URL for an item
  const getImageUrl = (itemId) => {
    return `/api/marketplace/image/${itemId}`;
  };

  // Expanded product modal component
  const ProductModal = ({ item, onClose }) => {
    if (!item) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in-up">
        <div className="bg-white dark:bg-dark-bg-900 rounded-lg max-w-lg w-full overflow-y-auto max-h-[90vh] shadow-lg animate-elastic glass">
          <div className="relative">
            <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-white text-2xl hover-ripple rounded-full p-1 transition-all duration-300">×</button>
            {item.imageUrl || getImageUrl(item.id) ? (
              <img src={item.imageUrl ? item.imageUrl : getImageUrl(item.id)} alt={item.title} className="w-full max-h-64 object-contain rounded-t-lg mx-auto hover:scale-105 transition-transform duration-300" />
            ) : (
              <div className="w-full h-64 bg-gray-200 dark:bg-dark-bg-700 flex items-center justify-center rounded-t-lg glass">
                <span className="text-gray-400 dark:text-gray-500 animate-pulse-glow">No Image</span>
              </div>
            )}
          </div>
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white gradient-text-animated">{item.title}</h2>
            <p className="text-lg text-gray-700 dark:text-white mb-4">{item.description}</p>
            <div className="mb-2 animate-fade-in-up stagger-1">
              <span className="font-semibold text-gray-900 dark:text-white">Price: </span>
              <span className="text-primary-600 animate-pulse-glow">{formatPrice(item.price)}</span>
            </div>
            <div className="mb-2 animate-fade-in-up stagger-2">
              <span className="font-semibold text-gray-900 dark:text-white">Category: </span>
              <span className="text-gray-700 dark:text-white">{item.category}</span>
            </div>
            <div className="bg-primary-50 dark:bg-dark-bg-700 p-4 rounded-lg text-center animate-fade-in-up stagger-3 hover-3d">
              <span className="text-primary-700 dark:text-white font-semibold">Contact the seller to purchase</span>
              <div className="mt-2 text-gray-900 dark:text-white">{item.contact}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
  <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-900 py-8 transition-colors duration-200 particles-bg smooth-scroll">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 relative animate-fade-in-up">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 rounded-3xl blur-3xl"></div>
          <div className="relative bg-white/80 dark:bg-dark-bg-800/80 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-dark-bg-700/50">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                <ShoppingBag className="w-8 h-8 text-white animate-float" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Student Marketplace
              </h1>
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed animate-slide-up-fade">
              Buy and sell books, notes, gadgets, and more within your campus
              community
            </p>
            <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <span>Secure transactions</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
                <span>Campus only</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-2 animate-pulse"></div>
                <span>Student community</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="card-enhanced mb-6 animate-fade-in-up stagger-1 hover-3d">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 min-w-0 animate-fade-in-up stagger-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 animate-pulse-glow" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10 dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400 w-full text-base hover-ripple focus:ring-2 focus:ring-primary-500 transition-all duration-300"
                  style={{ minWidth: 0 }}
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400 w-32 sm:w-40 animate-fade-in-up stagger-2 hover-ripple focus:ring-2 focus:ring-primary-500 transition-all duration-300"
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value} className="dark:bg-dark-bg-700 dark:text-white">
                    {category.label}
                  </option>
                ))}
              </select>

              {/* Removed sortBy dropdown */}
            </div>

            {/* Post Button */}
            <button
              onClick={() => setShowPostForm(true)}
              className="btn-gradient flex items-center animate-fade-in-up stagger-3 hover-ripple interactive-scale hover-glow"
            >
              <Plus className="w-4 h-4 mr-2 animate-bounce-in" />
              Post Item
            </button>
          </div>
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="text-center py-12 animate-fade-in-up">
            <div className="loading-spinner-enhanced mx-auto"></div>
            <p className="mt-4 text-gray-600 animate-pulse-glow">Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 animate-fade-in-up">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-float" />
            <h3 className="text-lg font-medium text-gray-900 mb-2 gradient-text-animated">
              No items found
            </h3>
            <p className="text-gray-600 animate-slide-up-fade">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`card-enhanced hover-3d interactive-scale animate-fade-in-up stagger-${(index % 5) + 1} cursor-pointer relative overflow-hidden group`}
                  onClick={() => setExpandedItem(item)}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative">
                    {/* Product image */}
                    {item.imageUrl || getImageUrl(item.id) ? (
                      <div className="relative overflow-hidden rounded-t-xl mb-4">
                        <img
                          src={item.imageUrl ? item.imageUrl : getImageUrl(item.id)}
                          alt={item.title}
                          className="w-full h-48 object-cover hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-dark-bg-700 dark:to-dark-bg-800 flex items-center justify-center rounded-t-xl mb-4 glass">
                        <div className="text-center">
                          <Package className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2 animate-float" />
                          <span className="text-gray-400 dark:text-gray-500 text-sm">No Image</span>
                        </div>
                      </div>
                    )}

                    <div className="px-4 pb-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate flex-1 mr-2">
                          {item.title}
                        </h3>
                        <div className="bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900/20 dark:to-blue-900/20 px-3 py-1 rounded-lg">
                          <span className="text-lg font-bold text-green-700 dark:text-green-300">
                            {formatPrice(item.price)}
                          </span>
                        </div>
                      </div>

                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span className="bg-gray-100 dark:bg-dark-bg-700 px-2 py-1 rounded-full">
                          {item.category}
                        </span>
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></span>
                          Available
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
            ))}
          </div>
        )}

        {/* Post Item Modal */}
        {showPostForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in-up">
            <div className="bg-white dark:bg-dark-bg-900 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto transition-all duration-300 animate-elastic glass">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white gradient-text-animated">
                    Post New Item
                  </h2>
                  <button
                    onClick={() => setShowPostForm(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-white hover-ripple rounded-full p-1 transition-all duration-300"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="animate-fade-in-up stagger-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="e.g., Calculus Textbook"
                      className="input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400 hover-ripple focus:ring-2 focus:ring-primary-500 transition-all duration-300"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Describe your item..."
                      rows="3"
                      className="input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                        Price *
                      </label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                        Category *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                        className="input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                        required
                      >
                        <option value="Books">Books</option>
                        <option value="Notes">Notes</option>
                        <option value="Gadgets">Gadgets</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                      Contact Information *
                    </label>
                    <input
                      type="text"
                      value={formData.contact}
                      onChange={(e) =>
                        setFormData({ ...formData, contact: e.target.value })
                      }
                      placeholder="Phone, email, or social media"
                      className="input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                      <Mail className="w-4 h-4 inline mr-1" />
                      Email Address * (for deletion key)
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="your.email@gmail.com"
                      className="input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      📧 We'll send you a delete key to remove your listing later
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                      Image (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4 animate-fade-in-up stagger-5">
                    <button
                      type="button"
                      onClick={() => setShowPostForm(false)}
                      className="flex-1 btn-secondary dark:bg-dark-bg-700 dark:text-white hover-ripple interactive-scale hover-lift"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 btn-gradient hover-ripple interactive-scale hover-glow"
                      disabled={isPosting}
                    >
                      {isPosting ? 'Posting...' : 'Post Item'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Expanded Product Modal */}
        {expandedItem && (
          <ProductModal item={expandedItem} onClose={() => setExpandedItem(null)} />
        )}
      </div>
    </div>
  );
};

export default Marketplace;
