import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors — TEMPORARILY BYPASSED for UI preview
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // All redirects disabled for UI preview
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  // Register user
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      if (!response.data || !response.data.token) {
        throw new Error('Invalid response from server');
      }
      return response.data;
    } catch (error) {
      // Add detailed error information
      console.error('Registration API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },

  // Login user
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // Get user profile
  getProfile: async () => {
    const response = await api.get('/user/profile');
    return response.data;
  },

  // Delete account and associated S3 bucket
  deleteAccount: async () => {
    const response = await api.delete('/auth/account');
    return response.data;
  },
};

// File management API
export const fileAPI = {
  // Get storage class recommendations
  getStorageRecommendations: async (fileName, fileType, fileSize) => {
    const response = await api.post('/storage/recommendations', {
      fileName,
      fileType,
      fileSize
    });
    return response.data;
  },

  // Upload file with optional storage class
  uploadFile: async (file, onUploadProgress, parentFolderId = null, storageClass = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (parentFolderId) {
      formData.append('parentFolderId', parentFolderId);
    }
    if (storageClass) {
      formData.append('storageClass', storageClass);
    }

    const response = await api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return response.data;
  },

  // Get user files
  getFiles: async (folderId = null) => {
    const params = folderId ? { folderId } : {};
    const response = await api.get('/files', { params });
    return response.data;
  },

  // Get storage statistics
  getStorageStats: async () => {
    const response = await api.get('/storage/stats');
    return response.data;
  },

  // Delete file
  deleteFile: async (fileId) => {
    const response = await api.delete(`/files/${fileId}`);
    return response.data;
  },

  // Bulk delete files/folders
  bulkDelete: async (fileIds) => {
    const response = await api.delete('/files/bulk', { data: { fileIds } });
    return response.data;
  },

  // Bulk delete with progress tracking
  bulkDeleteWithProgress: async (items, onProgress) => {
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemId = typeof item === 'string' ? item : item.id;
      const isFolder = typeof item === 'object' && item.isFolder;

      try {
        if (isFolder) {
          await api.delete(`/folders/${itemId}`);
        } else {
          await api.delete(`/files/${itemId}`);
        }
        results.push({ itemId, success: true, isFolder });
        successCount++;
      } catch (error) {
        results.push({
          itemId,
          success: false,
          error: error.response?.data?.error || error.message,
          isFolder
        });
        failureCount++;
      }

      // Report progress
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: items.length,
          successCount,
          failureCount,
          results
        });
      }
    }

    return {
      message: `Bulk delete completed: ${successCount} successful, ${failureCount} failed`,
      successCount,
      failureCount,
      results
    };
  },

  // Toggle star file
  toggleStar: async (fileId, isStarred) => {
    const response = await api.patch(`/files/${fileId}/star`, { isStarred });
    return response.data;
  },

  // Generate share URL
  generateShareUrl: async (fileId, expirySeconds) => {
    const response = await api.post('/shared-files', {
      fileId,
      expirySeconds
    });
    return { url: response.data.shareUrl };
  },

  // Change storage class for existing file
  changeStorageClass: async (fileId, storageClass) => {
    const response = await api.put(`/files/${fileId}/storage-class`, { storageClass });
    return response.data;
  },

  // Bulk change storage class for multiple files
  bulkChangeStorageClass: async (fileIds, storageClass) => {
    const response = await api.put('/files/bulk/storage-class', { fileIds, storageClass });
    return response.data;
  },

  // Get download URL for file
  getDownloadUrl: async (fileId) => {
    const response = await api.get(`/files/${fileId}/download`);
    return response.data.downloadUrl;
  },

  // Update AI tags for a file (triggers Rekognition for images, or accepts manual tags)
  tagFile: async (fileId, tags = null) => {
    const body = tags ? { tags } : {};
    const response = await api.post(`/files/${fileId}/tags`, body);
    return response.data;
  },

  // Get AI tags for a file
  getFileTags: async (fileId) => {
    const response = await api.get(`/files/${fileId}/tags`);
    return response.data;
  },
};

// Folder management API
export const folderAPI = {
  // Create folder
  createFolder: async (folderName, parentFolderId = null) => {
    const response = await api.post('/folders', { folderName, parentFolderId });
    return response.data;
  },

  // Get folders
  getFolders: async () => {
    const response = await api.get('/folders');
    return response.data;
  },

  // Delete folder
  deleteFolder: async (folderId) => {
    const response = await api.delete(`/folders/${folderId}`);
    return response.data;
  },
};

// Shared Files API
export const sharedFilesAPI = {
  // Get shared files
  getSharedFiles: async () => {
    const response = await api.get('/shared-files');
    return response.data;
  },

  // Share a file (generates AWS presigned URL)
  shareFile: async (fileId, expirySeconds = null) => {
    const response = await api.post('/shared-files', { fileId, expirySeconds });
    return response.data;
  },

  // Get shared file info
  getSharedFileInfo: async (fileId) => {
    const response = await api.get(`/shared-files/${fileId}/info`);
    return response.data;
  },

  // Remove shared file
  removeSharedFile: async (fileId) => {
    const response = await api.delete(`/shared-files/${fileId}`);
    return response.data;
  },

  // Clear expired shared files
  clearExpiredFiles: async () => {
    const response = await api.delete('/shared-files/expired');
    return response.data;
  },
};

// Billing API
export const billingAPI = {
  getBillingDetails: async () => {
    const response = await api.get('/billing/details');
    return response.data;
  },

  getBillingHistory: async () => {
    const response = await api.get('/billing/history');
    return response.data;
  },

  getCurrentUsage: async () => {
    const response = await api.get('/billing/usage');
    return response.data;
  },

  getCurrentBilling: async () => {
    const response = await api.get('/billing/current');
    return response.data;
  },


};


// Compute (EC2) API
export const computeAPI = {
  fetchInstances: async () => {
    const response = await api.get('/compute');
    return response.data;
  },

  launchInstance: async (instanceName) => {
    const response = await api.post('/compute/launch', { instanceName });
    return response.data;
  },

  terminateInstance: async (instanceId) => {
    const response = await api.delete(`/compute/${instanceId}`);
    return response.data;
  }
};


// Health check
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api; 