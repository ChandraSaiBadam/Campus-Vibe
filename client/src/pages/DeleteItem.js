import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Trash2, CheckCircle, XCircle, ArrowLeft, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const DeleteItem = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState('');

  const itemId = searchParams.get('id');
  const deleteToken = searchParams.get('token');

  useEffect(() => {
    if (!itemId || !deleteToken) {
      setError('Invalid deletion link. Please use the link from your email.');
    }
  }, [itemId, deleteToken]);

  const handleDelete = async () => {
    if (!itemId || !deleteToken) {
      toast.error('Invalid deletion parameters');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.delete(`/api/marketplace/${itemId}?token=${deleteToken}`);
      
      if (response.data.success) {
        setDeleted(true);
        toast.success('Item deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete item';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const goBackToMarketplace = () => {
    navigate('/marketplace');
  };

  if (!itemId || !deleteToken) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-900 py-8 transition-colors duration-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Invalid Deletion Link
            </h1>
            <p className="text-gray-600 dark:text-white mb-6">
              The deletion link you used is invalid or expired. Please use the link from your email.
            </p>
            <button
              onClick={goBackToMarketplace}
              className="btn-primary flex items-center mx-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (deleted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-900 py-8 transition-colors duration-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Item Deleted Successfully!
            </h1>
            <p className="text-gray-600 dark:text-white mb-6">
              Your item has been removed from the marketplace. A confirmation email has been sent.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={goBackToMarketplace}
                className="btn-primary flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Marketplace
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-900 py-8 transition-colors duration-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Deletion Failed
            </h1>
            <p className="text-gray-600 dark:text-white mb-6">
              {error}
            </p>
            <button
              onClick={goBackToMarketplace}
              className="btn-primary flex items-center mx-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-900 py-8 transition-colors duration-200">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card text-center">
          <div className="flex items-center justify-center mb-6">
            <Trash2 className="w-8 h-8 text-red-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Delete Marketplace Item
            </h1>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-2">
              <Mail className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
              <span className="font-semibold text-yellow-800 dark:text-yellow-200">
                Email-Based Deletion
              </span>
            </div>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">
              You're about to delete your marketplace item using the deletion link from your email.
              This action cannot be undone.
            </p>
          </div>

          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
              ⚠️ Warning
            </h3>
            <p className="text-red-700 dark:text-red-300 text-sm">
              Once you delete your item, it will be permanently removed from the marketplace
              and cannot be recovered. Are you sure you want to proceed?
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={goBackToMarketplace}
              className="btn-secondary flex items-center justify-center dark:bg-dark-bg-700 dark:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel & Go Back
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="btn-danger flex items-center justify-center bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Item
                </>
              )}
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This deletion link was sent to your email when you posted the item.
              <br />
              If you didn't request this deletion, you can safely ignore this page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteItem;
