import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator,
  ShoppingBag,
  Star,
  MessageCircle,
  ArrowRight,
  GraduationCap,
  Users,
  Shield,
  Zap,
  HelpCircle,
  ChevronDown,
  BookOpen
} from 'lucide-react';

const Home = () => {
  const features = useMemo(() => [
    {
      name: 'GPA Calculator',
      description: 'Calculate your GPA and CGPA with support for both 10-point and 4-point grading systems.',
      icon: Calculator,
      href: '/gpa',
      color: 'bg-blue-500',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      name: 'Student Marketplace',
      description: 'Buy and sell books, notes, gadgets, and more within your campus community.',
      icon: ShoppingBag,
      href: '/marketplace',
      color: 'bg-purple-500',
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      name: 'Faculty Reviews',
      description: 'Read and write anonymous reviews for faculty members with ratings and feedback.',
      icon: Star,
      href: '/reviews',
      color: 'bg-yellow-500',
      gradient: 'from-yellow-500 to-yellow-600'
    },
  ], []);

  const benefits = useMemo(() => [
    {
      icon: GraduationCap,
      title: 'Academic Excellence',
      description: 'Track your academic performance with our advanced GPA calculator'
    },
    {
      icon: Users,
      title: 'Community Driven',
      description: 'Connect with fellow students through marketplace and reviews'
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'Anonymous interactions ensure your privacy and freedom of expression'
    },
    {
      icon: Zap,
      title: 'Instant Results',
      description: 'Get immediate results for all calculations and summaries'
    }
  ], []);

  const faqs = [
    {
      question: "How accurate is the GPA calculator for VIT students?",
      answer: "Our GPA calculator is specifically designed for VIT's grading system and supports both 10-point and 4-point scales. It follows the official VIT grading criteria and has been tested by thousands of students. The calculator automatically converts grades to grade points and provides accurate CGPA calculations for all semesters."
    },
    {
      question: "Is my data safe when using the anonymous features?",
      answer: "Absolutely! We prioritize your privacy and security. All anonymous features (reviews, forum) use IP-based username generation without storing personal information. We don't track your browsing habits, and all sensitive data is encrypted. Your real identity remains completely private while using our platform."
    },
    {
      question: "Can I sell my course books and materials on the marketplace?",
      answer: "Yes! Our student marketplace is perfect for buying and selling textbooks, notes, electronics, and other academic materials. Simply create a listing with photos and descriptions. All transactions happen directly between students, and we provide a safe platform for communication and coordination of meetups on campus."
    }
  ];

  const [expandedFaq, setExpandedFaq] = useState(null);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalReviews: 0,
    totalUsers: 0
  });

  const toggleFaq = useCallback((index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  }, [expandedFaq]);

  useEffect(() => {
    // Simulate fetching stats (in a real app, this would be an API call)
    const fetchStats = async () => {
      try {
        // For demo purposes, using mock data
        // In production, replace with actual API calls
        setStats({
          totalQuestions: 1247,
          totalReviews: 856,
          totalUsers: 3200
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
  <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-900 transition-colors duration-200 particles-bg smooth-scroll">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white min-h-screen flex items-center">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-300/20 rounded-full blur-3xl animate-float" style={{animationDelay: '4s'}}></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="text-center">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-md rounded-full px-6 py-2 mb-8 border border-white/20">
              <span className="text-sm font-medium">✨ Welcome to the future of campus life</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-8 animate-fade-in hover-lift">
              Welcome to{' '}
              <span className="block bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent animate-pulse-glow">
                Campus Connect
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-12 text-white/90 max-w-4xl mx-auto animate-slide-up-fade leading-relaxed">
              Your comprehensive campus platform for academic tools, community engagement,
              and student life enhancement. Join thousands of students already connected.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center animate-bounce-in-up">
              <Link
                to="/gpa"
                className="btn-modern-primary text-lg px-10 py-4 hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-purple-500/25"
              >
                🚀 Get Started Free
              </Link>
              <Link
                to="/marketplace"
                className="btn-modern-outline text-lg px-10 py-4 hover:scale-105 transition-all duration-300 bg-white/10 backdrop-blur-md border-2 border-white/30 hover:bg-white hover:text-purple-600"
              >
                ✨ Explore Features
              </Link>
            </div>
            <div className="mt-16 flex items-center justify-center space-x-8 text-white/80">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm">3,200+ Active Students</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm">856+ Faculty Reviews</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-400 rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm">1,247+ Questions Answered</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-br from-white via-gray-50 to-white dark:from-dark-bg-800 dark:via-dark-bg-900 dark:to-dark-bg-800 transition-colors duration-200 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 via-purple-50/30 to-pink-50/30 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-pink-900/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Community Impact
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              See how Campus Connect is helping students across the university
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center animate-fade-in-up hover-3d card-enhanced p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                  <BookOpen className="w-8 h-8 text-white animate-float" />
                </div>
                <div>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white gradient-text-animated">{stats.totalQuestions.toLocaleString()}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Questions Asked</div>
                </div>
              </div>
              <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full animate-pulse" style={{width: '85%'}}></div>
              </div>
            </div>
            <div className="text-center animate-fade-in-up stagger-2 hover-3d card-enhanced p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                  <Star className="w-8 h-8 text-white animate-pulse-glow" />
                </div>
                <div>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white gradient-text-animated">{stats.totalReviews.toLocaleString()}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Faculty Reviews</div>
                </div>
              </div>
              <div className="w-full bg-yellow-100 dark:bg-yellow-900/30 rounded-full h-2">
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full animate-pulse" style={{width: '92%'}}></div>
              </div>
            </div>
            <div className="text-center animate-fade-in-up stagger-3 hover-3d card-enhanced p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                  <Users className="w-8 h-8 text-white animate-wiggle" />
                </div>
                <div>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white gradient-text-animated">{stats.totalUsers.toLocaleString()}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Active Students</div>
                </div>
              </div>
              <div className="w-full bg-green-100 dark:bg-green-900/30 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-500 to-teal-500 h-2 rounded-full animate-pulse" style={{width: '78%'}}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
  <section className="py-20 bg-white dark:bg-dark-bg-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 dark:text-dark-text-secondary max-w-3xl mx-auto">
              From academic tools to community features, Campus Connect has everything 
              to enhance your university experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.name}
                  to={feature.href}
                  className={`group card-enhanced animate-fade-in-up hover-3d interactive-scale hover-magnetic stagger-${index + 1}`}
                >
                  <div className="flex items-center mb-4">
                    <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 animate-elastic`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary group-hover:text-primary-600 transition-colors duration-200 gradient-text-animated">
                      {feature.name}
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-dark-text-secondary mb-4 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors duration-200">
                    {feature.description}
                  </p>
                  <div className="flex items-center text-primary-600 dark:text-dark-primary-400 font-medium group-hover:text-primary-700 group-hover:dark:text-dark-primary-400 transition-all duration-200">
                    <span>Learn more</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 group-hover:scale-110 transition-all duration-200 animate-slide-in-right" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
  <section className="py-20 bg-gray-50 dark:bg-dark-bg-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">
              Why Choose Campus Connect?
            </h2>
            <p className="text-xl text-gray-600 dark:text-dark-text-secondary max-w-3xl mx-auto">
              Built specifically for students, by students, with privacy and ease of use in mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="text-center animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 dark:text-dark-text-secondary">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-dark-bg-800 dark:via-dark-bg-900 dark:to-dark-bg-800 transition-colors duration-200 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/20 via-purple-50/20 to-pink-50/20 dark:from-indigo-900/10 dark:via-purple-900/10 dark:to-pink-900/10"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-center">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                <HelpCircle className="w-6 h-6 text-white" />
              </div>
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Got questions? We've got answers. Here are some common questions from our campus community.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="card-enhanced rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between text-left focus:outline-none focus:ring-4 focus:ring-indigo-300 focus:ring-opacity-50 rounded-lg p-2 -m-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors duration-200"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-4 leading-tight">
                    {faq.question}
                  </h3>
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                    <ChevronDown
                      className={`w-4 h-4 text-white transition-transform duration-300 ${
                        expandedFaq === index ? 'transform rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>
                <div className={`mt-4 overflow-hidden transition-all duration-500 ease-in-out ${
                  expandedFaq === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 mt-4">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-8 shadow-xl">
              <h3 className="text-2xl font-bold text-white mb-4">Still have questions?</h3>
              <p className="text-indigo-100 mb-6 text-lg">
                Feel free to reach out to our vibrant community!
              </p>
              <Link
                to="/forum"
                className="btn-modern-primary inline-flex items-center text-lg px-8 py-4 hover:scale-105 transition-transform duration-300"
              >
                <MessageCircle className="w-5 h-5 mr-3" />
                Ask in Forum
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home; 