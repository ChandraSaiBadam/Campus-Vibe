import React from 'react';
import { GraduationCap, Github, Mail, Heart } from 'lucide-react';

const Footer = () => {
  return (
  <footer className="bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-dark-bg-900 dark:via-dark-bg-800 dark:to-dark-bg-900 border-t border-white/20 dark:border-dark-bg-700/50 mt-auto transition-colors duration-200 relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/30 via-purple-50/30 to-pink-50/30 dark:from-indigo-900/10 dark:via-purple-900/10 dark:to-pink-900/10"></div>
   <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Campus Connect</span>
            </div>
            <p className="text-gray-600 dark:text-dark-text-secondary mb-4 max-w-md">
              A comprehensive campus platform designed to enhance student life with GPA calculation,
              marketplace, faculty reviews, and forum features.
            </p>
            <div className="flex space-x-4">
              <a
                href="mailto:contact@campusconnect.com"
                className="text-gray-400 hover:text-primary-600 transition-colors duration-200"
                aria-label="Email Campus Connect"
              >
                <Mail className="w-5 h-5" />
              </a>
              <a
                href="https://github.com/campusconnect"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary-600 transition-colors duration-200"
                aria-label="Campus Connect GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-text-primary uppercase tracking-wider mb-4">
              Features
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="/gpa" className="text-gray-600 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-dark-primary-400 transition-colors duration-200" aria-label="GPA Calculator">
                  GPA Calculator
                </a>
              </li>
              <li>
                <a href="/marketplace" className="text-gray-600 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-dark-primary-400 transition-colors duration-200" aria-label="Student Marketplace">
                  Student Marketplace
                </a>
              </li>
              <li>
                <a href="/reviews" className="text-gray-600 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-dark-primary-400 transition-colors duration-200" aria-label="Faculty Reviews">
                  Faculty Reviews
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-text-primary uppercase tracking-wider mb-4">
              Support
            </h3>
            <ul className="space-y-2">
              <li>
                <button type="button" className="text-gray-600 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-dark-primary-400 transition-colors duration-200" aria-label="Help Center">
                  Help Center
                </button>
              </li>
              <li>
                <button type="button" className="text-gray-600 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-dark-primary-400 transition-colors duration-200" aria-label="Privacy Policy">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button type="button" className="text-gray-600 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-dark-primary-400 transition-colors duration-200" aria-label="Terms of Service">
                  Terms of Service
                </button>
              </li>
              <li>
                <button type="button" className="text-gray-600 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-dark-primary-400 transition-colors duration-200" aria-label="Contact Us">
                  Contact Us
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-dark-bg-700">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 dark:text-dark-text-secondary text-sm">
              © 2024 Campus Connect. All rights reserved.
            </p>
            <p className="text-gray-500 dark:text-dark-text-secondary text-sm flex items-center mt-2 md:mt-0">
              Made with <Heart className="w-4 h-4 mx-1 text-red-500" /> for students
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 