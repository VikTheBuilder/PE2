import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import Storage from './Storage';
import {
  FiUpload,
  FiImage,
  FiVideo,
  FiMusic,
  FiArchive,
  FiTrash2,
  FiDownload,
  FiShare2,
  FiHome,
  FiFolder,
  FiStar,

  FiUser,
  FiSearch,
  FiGrid,
  FiList,
  FiMenu,
  FiX,
  FiLogOut,
  FiFolderPlus,

  FiHardDrive,
  FiSun,
  FiMoon,
  FiDollarSign,
  FiFile,
  FiServer,
  FiTag,
  FiClock
} from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import { useSharedFiles } from '../contexts/SharedFilesContext';
import { useNotifications } from '../contexts/NotificationContext';
import { fileAPI, folderAPI, authAPI } from '../services/api';
import StorageClassModal from './StorageClassModal';
import ShareModal from './ShareModal';
import DashboardBilling from './DashboardBilling';
import ComputeManager from './ComputeManager';
import VersionHistory from './VersionHistory';
import NotificationTest from './NotificationTest';
import AITagsView from './AITagsView';
import './Dashboard.css';
import '../styles/animations.css';

const Dashboard = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth <= 1200);
  const [viewMode, setViewMode] = useState('grid');
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth <= 1200);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [activeTab, setActiveTab] = useState('all'); // Will be used for file filtering
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [currentView, setCurrentView] = useState('files'); // 'files' or 'starred'
  const [showStorageClassModal, setShowStorageClassModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedFileForShare, setSelectedFileForShare] = useState(null);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [selectedFileForVersions, setSelectedFileForVersions] = useState(null);
  const navigate = useNavigate();
  const { toggleTheme, isDark } = useTheme();
  const { sharedFiles, addSharedFile, updateSharedFileUrl, removeSharedFile, isLoading: sharedFilesLoading, clearSharedFilesCache } = useSharedFiles();
  const { showSuccess, showError, showWarning, showProgress, updateNotification, removeNotification } = useNotifications();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      // TEMPORARILY BYPASSED — use demo user for UI preview
      setUser({ username: 'DemoUser', email: 'demo@vaultify.io' });
      fetchFiles();
      return;
    }

    setUser(JSON.parse(userData));
    fetchFiles();

    // Initialize animations
    const timer = setTimeout(() => {
      setIsVisible(true);
      initializeAnimations();
    }, 100);

    return () => clearTimeout(timer);
  }, [navigate]);

  const initializeAnimations = () => {
    // Initialize Intersection Observer for scroll animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');

          // Handle stagger animations
          if (entry.target.classList.contains('stagger-container')) {
            const children = entry.target.querySelectorAll('.dashboard-card-reveal, .file-item-reveal, .stagger-fade-up');
            children.forEach((child, index) => {
              setTimeout(() => {
                child.classList.add('stagger-visible');
              }, index * 100);
            });
          }
        }
      });
    }, observerOptions);

    // Observe all animated elements
    const animatedElements = document.querySelectorAll(
      '.dashboard-section-reveal, .stagger-container, .animate-on-scroll'
    );

    animatedElements.forEach((el) => {
      observerRef.current.observe(el);
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  };

  const fetchFiles = async (folderId = null) => {
    try {
      setLoading(true);
      const filesData = await fileAPI.getFiles(folderId);
      setFiles(filesData);

      // Trigger file grid animations after files are loaded
      setTimeout(() => {
        const fileItems = document.querySelectorAll('.file-item-reveal');
        fileItems.forEach((item, index) => {
          setTimeout(() => {
            item.classList.add('stagger-visible');
          }, index * 50);
        });
      }, 100);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 1) {
      // Single file - show storage class selection modal
      setPendingFiles(acceptedFiles);
      setShowStorageClassModal(true);
    } else if (acceptedFiles.length > 1) {
      // Multiple files - upload with default storage class
      await uploadFiles(acceptedFiles);
    }
  };

  const handleShareClick = (file) => {
    setSelectedFileForShare(file);
    setIsShareModalOpen(true);
  };

  const handleShareModalClose = () => {
    setIsShareModalOpen(false);
    setSelectedFileForShare(null);
  };

  const handleVersionHistoryClick = (file) => {
    setSelectedFileForVersions(file);
    setIsVersionHistoryOpen(true);
  };

  const handleVersionHistoryClose = () => {
    setIsVersionHistoryOpen(false);
    setSelectedFileForVersions(null);
  };

  const handleVersionRestore = () => {
    // Refresh files after version restore
    fetchFiles(currentFolderId);
  };

  const uploadFiles = async (filesToUpload, storageClass = null) => {
    setUploading(true);

    try {
      for (const file of filesToUpload) {
        const onUploadProgress = () => {
          // Progress tracking to be implemented
        };

        const response = await fileAPI.uploadFile(file, onUploadProgress, currentFolderId, storageClass);

        setFiles(prev => {
          if (response.isNewVersion) {
            // Replace the existing file with the updated version details
            return prev.map(f => f.id === response.file.id ? response.file : f);
          }
          // Add new file to top of list
          return [response.file, ...prev];
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      showError('Upload failed', 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleStorageClassSelect = async (storageSelection) => {
    setShowStorageClassModal(false);
    // Extract storage class from the new selection format
    const storageClass = storageSelection.storageClass;
    await uploadFiles(pendingFiles, storageClass);
    setPendingFiles([]);
  };

  const handleStorageClassCancel = () => {
    setShowStorageClassModal(false);
    setPendingFiles([]);
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <FiImage />;
    if (fileType.startsWith('video/')) return <FiVideo />;
    if (fileType.startsWith('audio/')) return <FiMusic />;
    if (fileType.includes('zip') || fileType.includes('rar')) return <FiArchive />;
    return <FiFile />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    try {
      if (!date) return 'Unknown date';
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'Invalid date';
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(d);
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  const removeFile = async (fileId) => {
    const item = files.find(f => f.id === fileId);
    if (!item) {
      showError('Error', 'Item not found.');
      return;
    }

    const itemName = item.isFolder ? item.name : item.originalName;
    const itemType = item.isFolder ? 'folder' : 'file';

    // Show progress notification
    const notificationId = showProgress(
      `Deleting ${itemType}`,
      `Deleting "${itemName}"...`,
      { progress: { current: 0, total: 1 } }
    );

    try {
      if (item.isFolder) {
        await folderAPI.deleteFolder(fileId);
      } else {
        await fileAPI.deleteFile(fileId);
      }

      // Update progress to complete
      updateNotification(notificationId, {
        progress: { current: 1, total: 1 }
      });

      // Update local state
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setSelectedFiles(prev => prev.filter(id => id !== fileId));

      // Show success notification
      removeNotification(notificationId);
      showSuccess(
        'Deleted successfully',
        `"${itemName}" has been deleted.`
      );

      // Refresh file list to ensure consistency
      await fetchFiles(currentFolderId);

    } catch (error) {
      console.error('Delete error:', error);
      removeNotification(notificationId);

      if (error.response?.status === 400 && error.response?.data?.error?.includes('contents')) {
        showError(
          'Cannot delete folder',
          'Cannot delete folder with contents. Please empty the folder first.'
        );
      } else {
        showError(
          'Delete failed',
          `Failed to delete "${itemName}". Please try again.`
        );
      }
    }
  };

  const toggleStar = async (fileId, currentStarred) => {
    try {
      const response = await fileAPI.toggleStar(fileId, currentStarred);
      setFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, isStarred: response.isStarred } : f
      ));
    } catch (error) {
      console.error('Star error:', error);
      showError('Update failed', 'Failed to update file star status.');
    }
  };

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  // Bulk actions
  const bulkDownload = () => {
    selectedFiles.forEach((id) => {
      const f = files.find((x) => x.id === id);
      if (f && !f.isFolder) {
        downloadFile(f);
      }
    });

    const folderCount = selectedFiles.filter(id => {
      const f = files.find(x => x.id === id);
      return f?.isFolder;
    }).length;

    if (folderCount > 0) {
      showWarning(
        'Download limitation',
        `${folderCount} folder(s) cannot be downloaded. Only files were downloaded.`
      );
    }
  };

  const bulkShare = async () => {
    const shareableFiles = selectedFiles
      .map((id) => files.find((x) => x.id === id))
      .filter(Boolean)
      .filter(f => !f.isFolder); // Only share files, not folders

    const urls = shareableFiles.map((f) => f.url).join('\n');

    if (urls) {
      await navigator.clipboard.writeText(urls);
      showSuccess(
        'Links copied',
        `Copied ${shareableFiles.length} file link(s) to clipboard!`
      );
    } else {
      showWarning(
        'No files to share',
        'No files selected for sharing. Folders cannot be shared directly.'
      );
    }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedFiles.length} selected item(s)?`)) return;

    const totalItems = selectedFiles.length;

    // Show progress notification
    const notificationId = showProgress(
      'Deleting files',
      `Deleting ${totalItems} item(s)...`,
      {
        progress: { current: 0, total: totalItems },
        actions: [
          {
            label: 'Cancel',
            variant: 'secondary',
            onClick: () => {
              // Note: In a real implementation, you'd want to implement cancellation logic
              removeNotification(notificationId);
              showWarning('Deletion cancelled', 'Some items may have already been deleted.');
            }
          }
        ]
      }
    );

    try {
      console.log('Starting bulk delete for:', selectedFiles);

      // Get the full items for bulk delete (needed to determine if folder or file)
      const selectedItems = selectedFiles.map(fileId => files.find(f => f.id === fileId)).filter(Boolean);

      // Use the new bulk delete API with progress tracking
      const response = await fileAPI.bulkDeleteWithProgress(selectedItems, (progress) => {
        updateNotification(notificationId, {
          message: `Deleting ${totalItems} item(s)... (${progress.current}/${progress.total})`,
          progress: {
            current: progress.current,
            total: progress.total
          }
        });
      });

      console.log('Bulk delete response:', response);

      // Remove progress notification
      removeNotification(notificationId);

      // Show result notification
      if (response.failureCount > 0) {
        const failedItems = response.results.filter(r => !r.success);
        const errorMessages = failedItems.slice(0, 3).map(item => item.error).join(', ');
        const moreErrors = failedItems.length > 3 ? ` and ${failedItems.length - 3} more...` : '';

        showWarning(
          'Partial deletion completed',
          `${response.successCount} item(s) deleted successfully. ${response.failureCount} item(s) failed: ${errorMessages}${moreErrors}`,
          { duration: 10000 }
        );
      } else {
        showSuccess(
          'Deletion completed',
          `Successfully deleted ${response.successCount} item(s).`
        );
      }

      // Clear selection
      setSelectedFiles([]);

      // Refresh the file list to ensure consistency
      await fetchFiles(currentFolderId);

    } catch (error) {
      console.error('Bulk delete error:', error);
      removeNotification(notificationId);
      showError(
        'Bulk deletion failed',
        'Failed to delete items. Please try again.'
      );
      // Clear selection even on error to prevent stuck state
      setSelectedFiles([]);
    }
  };

  const handleLogout = () => {
    // Clear shared files cache before logout
    clearSharedFilesCache();

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await authAPI.deleteAccount();

      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Show success message
      showSuccess(
        'Account deleted',
        'Account and all data deleted successfully. You will be redirected to the registration page.'
      );

      // Redirect to register page
      navigate('/register');
    } catch (error) {
      console.error('Delete account error:', error);

      // Provide more specific error messages
      let errorMessage = 'Failed to delete account. Please try again.';

      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred while deleting account. Please contact support if this persists.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. Please log in again and try again.';
      } else if (!navigator.onLine) {
        errorMessage = 'No internet connection. Please check your connection and try again.';
      }

      showError('Account deletion failed', errorMessage);

      // If it's an auth error, redirect to login
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    } finally {
      setDeletingAccount(false);
      setShowDeleteAccountModal(false);
    }
  };

  const downloadFile = (file) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      showWarning('Invalid name', 'Please enter a folder name');
      return;
    }

    try {
      const response = await folderAPI.createFolder(newFolderName.trim(), currentFolderId);
      setFiles(prev => [response.folder, ...prev]);
      setNewFolderName('');
      setShowCreateFolder(false);
      showSuccess('Folder created', `"${newFolderName.trim()}" has been created successfully.`);
    } catch (error) {
      console.error('Create folder error:', error);
      showError(
        'Folder creation failed',
        error.response?.data?.error || 'Failed to create folder'
      );
    }
  };

  const openFolder = (folder) => {
    setCurrentFolderId(folder.id);
    setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }]);
    fetchFiles(folder.id);
  };

  const navigateToFolder = (folderId, index) => {
    if (folderId === null) {
      // Navigate to root
      setCurrentFolderId(null);
      setFolderPath([]);
      fetchFiles(null);
    } else {
      // Navigate to specific folder
      setCurrentFolderId(folderId);
      setFolderPath(prev => prev.slice(0, index + 1));
      fetchFiles(folderId);
    }
  };

  const getItemIcon = (item) => {
    if (item.isFolder) return <FiFolder />;
    return getFileIcon(item.fileType);
  };

  const filteredFiles = useMemo(() => {
    let filtered = files;

    // Filter by current view (starred or all files)
    if (currentView === 'starred') {
      filtered = files.filter(item => item.isStarred);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item => {
        const name = item.isFolder ? item.name : item.originalName;
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    return filtered;
  }, [files, searchQuery, currentView]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp'],
      'video/*': ['.mp4', '.avi', '.mov', '.wmv'],
      'audio/*': ['.mp3', '.wav', '.flac', '.aac'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar']
    }
  });

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div
            className="sidebar-logo"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <FiFolder className={`logo-icon ${sidebarCollapsed ? 'rotate' : ''}`} />
            <span className={`logo-text ${!sidebarCollapsed ? 'slide-in' : ''}`}>Vaultify</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link to="/" className="nav-item">
            <FiHome />
            <span>Home</span>
          </Link>
          <div
            className={`nav-item ${currentView === 'files' ? 'active' : ''}`}
            onClick={() => setCurrentView('files')}
          >
            <FiFolder />
            <span>My Files</span>
          </div>
          <div
            className={`nav-item ${currentView === 'starred' ? 'active' : ''}`}
            onClick={() => setCurrentView('starred')}
          >
            <FiStar />
            <span>Starred</span>
          </div>
          <div
            className={`nav-item ${currentView === 'shared' ? 'active' : ''}`}
            onClick={() => setCurrentView('shared')}
          >
            <FiShare2 />
            <span>Shared</span>
          </div>
          <div
            className={`nav-item ${currentView === 'filetypes' ? 'active' : ''}`}
            onClick={() => setCurrentView('filetypes')}
          >
            <FiGrid />
            <span>File Types</span>
          </div>

          <div
            className={`nav-item ${currentView === 'storage' ? 'active' : ''}`}
            onClick={() => setCurrentView('storage')}
          >
            <FiHardDrive />
            <span>Storage</span>
          </div>
          <div
            className={`nav-item ${currentView === 'billing' ? 'active' : ''}`}
            onClick={() => setCurrentView('billing')}
          >
            <FiDollarSign />
            <span>Pricing & Bill</span>
          </div>
          <div
            className={`nav-item ${currentView === 'compute' ? 'active' : ''}`}
            onClick={() => setCurrentView('compute')}
          >
            <FiServer />
            <span>Compute</span>
          </div>
          <div
            className={`nav-item ${currentView === 'aitags' ? 'active' : ''}`}
            onClick={() => setCurrentView('aitags')}
          >
            <FiTag />
            <span>AI Tags</span>
          </div>

        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              <FiUser />
            </div>
            <div className="user-details">
              <div className="user-name">{user?.username || 'User'}</div>
              <div className="user-email">{user?.email || 'user@example.com'}</div>
            </div>
          </div>
          <div className="sidebar-actions">
            <button className="logout-btn" onClick={handleLogout}>
              <FiLogOut />
              <span>Logout</span>
            </button>
            <button className="delete-account-btn" onClick={() => setShowDeleteAccountModal(true)}>
              <FiTrash2 />
              <span>Delete Account</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(true)}
            >
              <FiMenu />
            </button>
            <div className="search-bar">
              <FiSearch />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="header-right">
            <div className="view-toggle">
              <button
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <FiGrid />
              </button>
              <button
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <FiList />
              </button>
            </div>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            >
              {isDark ? <FiSun /> : <FiMoon />}
            </button>
            {currentView === 'files' && (
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateFolder(true)}
              >
                <FiFolderPlus />
                New Folder
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="content-area">
          {currentView === 'storage' ? (
            <Storage />
          ) : currentView === 'billing' ? (
            <div>
              <DashboardBilling />
              <div style={{ marginTop: '20px', padding: '20px', border: '1px solid var(--border-light)', borderRadius: '8px' }}>
                <h3>Notification System Test</h3>
                <NotificationTest />
              </div>
            </div>
          ) : currentView === 'compute' ? (
            <ComputeManager />
          ) : currentView === 'aitags' ? (
            <AITagsView />
          ) : currentView === 'shared' ? (
            <div className="shared-files-view">
              <div className="files-header">
                <div className="files-title">
                  <h2>Shared Files</h2>
                  <span className="file-count">({sharedFiles.length} items)</span>
                </div>
                <div className="files-controls">
                  <div className="view-mode-toggle">
                    <button
                      className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                      onClick={() => setViewMode('grid')}
                      title="Grid View"
                    >
                      <FiGrid />
                    </button>
                    <button
                      className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                      onClick={() => setViewMode('list')}
                      title="List View"
                    >
                      <FiList />
                    </button>
                    <button
                      className={`view-btn ${viewMode === 'small' ? 'active' : ''}`}
                      onClick={() => setViewMode('small')}
                      title="Small Icons View"
                    >
                      <FiMenu />
                    </button>
                  </div>
                </div>
              </div>

              {sharedFilesLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading shared files...</p>
                </div>
              ) : sharedFiles.length === 0 ? (
                <div className="empty-state">
                  <FiShare2 className="empty-icon" />
                  <h3>No shared files</h3>
                  <p>Files you share will appear here</p>
                </div>
              ) : (
                <div className={`files-grid ${viewMode}`}>
                  {sharedFiles.map((file) => (
                    <div key={file.id} className="file-item shared-file-item">
                      <div className="file-icon">
                        {getFileIcon(file.fileType)}
                      </div>
                      <div className="file-info">
                        <div className="file-name">{file.originalName}</div>
                        <div className="file-meta">
                          <div className="file-details">
                            <span className="file-type">{file.fileType}</span>
                            <span className="file-size">{formatFileSize(file.fileSize)}</span>
                            <span className="shared-date">Shared {formatDate(file.sharedAt)}</span>
                          </div>
                          <div className="file-actions">
                            {file.shareUrl && (
                              <button
                                className="action-btn"
                                onClick={() => window.open(file.shareUrl, '_blank')}
                                title="Open share link"
                              >
                                <FiShare2 />
                              </button>
                            )}
                            <button
                              className="action-btn"
                              onClick={() => downloadFile(file)}
                              title="Download file"
                            >
                              <FiDownload />
                            </button>
                            <button
                              className="action-btn"
                              onClick={() => removeSharedFile(file.id)}
                              title="Remove from shared"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>
                        <div className="expiry-info">
                          {file.expiryTimestamp ? (
                            Date.now() < file.expiryTimestamp ? (
                              <span className="time-left">
                                Expires in {Math.floor((file.expiryTimestamp - Date.now()) / (1000 * 60 * 60))}h {Math.floor(((file.expiryTimestamp - Date.now()) % (1000 * 60 * 60)) / (1000 * 60))}m
                              </span>
                            ) : (
                              <span className="expired">Expired</span>
                            )
                          ) : (
                            <span className="no-expiry">No expiration</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : currentView === 'filetypes' ? (
            <div className="filetypes-view">
              <div className="files-header">
                <div className="files-title">
                  <h2>File Types</h2>
                  <span className="file-count">({files.filter(f => !f.isFolder).length} files)</span>
                </div>
              </div>

              {files.filter(f => !f.isFolder).length === 0 ? (
                <div className="empty-state">
                  <FiGrid className="empty-icon" />
                  <h3>No files uploaded</h3>
                  <p>Upload files to see them organized by type</p>
                </div>
              ) : (
                <div className="filetypes-container">
                  {(() => {
                    // Group files by type
                    const fileGroups = {};
                    files.filter(f => !f.isFolder).forEach(file => {
                      const extension = file.originalName.split('.').pop()?.toLowerCase() || 'unknown';
                      let category = 'Other';

                      // Categorize files
                      if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
                        category = 'Images';
                      } else if (['mp4', 'avi', 'mov', 'wmv', 'mkv', 'flv'].includes(extension)) {
                        category = 'Videos';
                      } else if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(extension)) {
                        category = 'Audio';
                      } else if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension)) {
                        category = 'Documents';
                      } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
                        category = 'Archives';
                      } else if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'sass', 'php', 'py', 'java', 'cpp', 'c', 'cs'].includes(extension)) {
                        category = 'Code';
                      }

                      if (!fileGroups[category]) {
                        fileGroups[category] = [];
                      }
                      fileGroups[category].push(file);
                    });

                    return Object.entries(fileGroups).map(([category, categoryFiles]) => (
                      <div key={category} className="file-category">
                        <div className="category-header">
                          <h3>{category}</h3>
                          <span className="category-count">({categoryFiles.length} files)</span>
                        </div>
                        <div className="files-grid grid">
                          {categoryFiles.map((file) => (
                            <div
                              key={file.id}
                              className={`file-item ${selectedFiles.includes(file.id) ? 'selected' : ''}`}
                              onClick={() => toggleFileSelection(file.id)}
                            >
                              <div className="file-checkbox">
                                <input
                                  type="checkbox"
                                  checked={selectedFiles.includes(file.id)}
                                  onChange={() => toggleFileSelection(file.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>

                              <div className="file-icon">
                                {getFileIcon(file.fileType)}
                              </div>

                              <div className="file-info">
                                <div className="file-name">
                                  {file.originalName}
                                  {file.totalVersions > 1 && (
                                    <span className="version-badge" title={`${file.totalVersions} versions`}>
                                      v{file.currentVersion}
                                    </span>
                                  )}
                                </div>
                                <div className="file-meta">
                                  <div className="file-details">
                                    <span className="file-type">{file.fileType}</span>
                                    <span className="file-size">{formatFileSize(file.fileSize)}</span>
                                    <span className="file-date">{formatDate(file.uploadDate)}</span>
                                  </div>
                                  <div className="file-actions" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      className="action-btn"
                                      onClick={() => handleShareClick(file)}
                                      title="Share file"
                                    >
                                      <FiShare2 />
                                    </button>
                                    {!file.isFolder && (
                                      <button
                                        className="action-btn"
                                        onClick={() => handleVersionHistoryClick(file)}
                                        title="Version history"
                                      >
                                        <FiClock />
                                      </button>
                                    )}
                                    <button
                                      className="action-btn"
                                      onClick={() => downloadFile(file)}
                                      title="Download file"
                                    >
                                      <FiDownload />
                                    </button>
                                    <button
                                      className={`star-btn ${file.isStarred ? 'starred' : ''}`}
                                      aria-label={`${file.isStarred ? 'Unstar' : 'Star'} ${file.originalName}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleStar(file.id, file.isStarred);
                                      }}
                                    >
                                      <FiStar />
                                    </button>
                                    <button
                                      className="action-btn"
                                      aria-label={`Delete ${file.originalName}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeFile(file.id);
                                      }}
                                    >
                                      <FiTrash2 />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Files and other content */}
              {currentView === 'files' && folderPath.length > 0 && (
                <div className="breadcrumb">
                  <button
                    className="breadcrumb-item"
                    onClick={() => navigateToFolder(null, -1)}
                  >
                    <FiHome /> Home
                  </button>
                  {folderPath.map((folder, index) => (
                    <React.Fragment key={folder.id}>
                      <span className="breadcrumb-separator">/</span>
                      <button
                        className="breadcrumb-item"
                        onClick={() => navigateToFolder(folder.id, index)}
                      >
                        {folder.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Upload Area - Only show in files view */}
              {currentView === 'files' && (
                <div className="upload-section">
                  <div
                    {...getRootProps()}
                    className={`upload-area ${isDragActive ? 'active' : ''}`}
                  >
                    <input {...getInputProps()} />
                    <FiUpload className="upload-icon" />
                    {isDragActive ? (
                      <p>Drop files here to upload</p>
                    ) : (
                      <div>
                        <p>Drag and drop files here, or click to select files</p>
                        <button className="btn btn-secondary">Choose Files</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Files Section */}
              <div className="files-section">
                <div className="files-header">
                  <div className="files-title">
                    <h2>{currentView === 'starred' ? 'Starred Files' : 'My Files'}</h2>
                    <span className="file-count">({filteredFiles.length} items)</span>
                  </div>
                  <div className="files-actions">
                    {selectedFiles.length > 0 && (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={bulkDownload}>
                          <FiDownload />
                          Download ({selectedFiles.length})
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={bulkShare}>
                          <FiShare2 />
                          Share ({selectedFiles.length})
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={bulkDelete}>
                          <FiTrash2 />
                          Delete ({selectedFiles.length})
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {currentView === 'starred' && filteredFiles.length === 0 ? (
                  <div className="empty-state">
                    <FiStar className="empty-icon" />
                    <h3>No starred files</h3>
                    <p>Star your favorite files to see them here</p>
                  </div>
                ) : files.length === 0 ? (
                  <div className="empty-state">
                    <FiFolder className="empty-icon" />
                    <h3>No files yet</h3>
                    <p>Upload your first file or create a folder to get started</p>
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="empty-state">
                    <FiSearch className="empty-icon" />
                    <h3>No files found</h3>
                    <p>Try adjusting your search terms</p>
                  </div>
                ) : (
                  <div className={`files-grid ${viewMode}`}>
                    {filteredFiles.map((item) => {
                      return (
                        <div
                          key={item.id}
                          className={`file-item ${selectedFiles.includes(item.id) ? 'selected' : ''} ${item.isFolder ? 'folder-item' : ''}`}
                          onClick={() => item.isFolder ? openFolder(item) : toggleFileSelection(item.id)}
                          onDoubleClick={() => item.isFolder ? openFolder(item) : null}
                        >
                          <div className="file-checkbox">
                            <input
                              type="checkbox"
                              checked={selectedFiles.includes(item.id)}
                              onChange={() => toggleFileSelection(item.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>

                          <div className="file-icon">
                            {getItemIcon(item)}
                          </div>

                          <div className="file-info">
                            <div className="file-name">
                              {item.isFolder ? item.name : item.originalName}
                              {!item.isFolder && item.totalVersions > 1 && (
                                <span className="version-badge" title={`${item.totalVersions} versions`}>
                                  v{item.currentVersion}
                                </span>
                              )}
                            </div>
                            <div className="file-meta">
                              {item.isFolder ? (
                                <span className="file-type">Folder</span>
                              ) : (
                                <>
                                  <div className="file-details">
                                    <span className="file-type">{item.fileType}</span>
                                    <span className="file-size">{formatFileSize(item.fileSize)}</span>
                                    <span className="file-date">{formatDate(item.uploadDate)}</span>
                                  </div>
                                  <div className="file-actions" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      className="action-btn"
                                      onClick={() => handleShareClick(item)}
                                      title="Share file"
                                    >
                                      <FiShare2 />
                                    </button>
                                    <button
                                      className="action-btn"
                                      onClick={() => handleVersionHistoryClick(item)}
                                      title="Version history"
                                    >
                                      <FiClock />
                                    </button>
                                    <button
                                      className="action-btn"
                                      onClick={() => downloadFile(item)}
                                      title="Download file"
                                    >
                                      <FiDownload />
                                    </button>
                                    <button
                                      className={`star-btn ${item.isStarred ? 'starred' : ''}`}
                                      aria-label={`${item.isStarred ? 'Unstar' : 'Star'} ${item.originalName}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleStar(item.id, item.isStarred);
                                      }}
                                    >
                                      <FiStar />
                                    </button>
                                    <button
                                      className="action-btn"
                                      aria-label={`Delete ${item.originalName}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeFile(item.id);
                                      }}
                                    >
                                      <FiTrash2 />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Upload Progress Indicator */}
        {uploading && (
          <div className="upload-progress-indicator">
            <div className="upload-progress-content">
              <div className="upload-spinner"></div>
              <span>Uploading files...</span>
            </div>
          </div>
        )}
      </main>

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="modal-overlay" onClick={() => setShowCreateFolder(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Folder</h3>
              <button
                className="modal-close"
                onClick={() => setShowCreateFolder(false)}
              >
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="folderName">Folder Name</label>
                <input
                  id="folderName"
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  onKeyPress={(e) => e.key === 'Enter' && createFolder()}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowCreateFolder(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={createFolder}
                disabled={!newFolderName.trim()}
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Storage Class Selection Modal */}
      <StorageClassModal
        isOpen={showStorageClassModal}
        onClose={handleStorageClassCancel}
        onSelect={handleStorageClassSelect}
        file={pendingFiles[0]}
        loading={uploading}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={handleShareModalClose}
        fileDetails={selectedFileForShare}
        onAddSharedFile={addSharedFile}
        onUpdateSharedFileUrl={updateSharedFileUrl}
        existingSharedFiles={sharedFiles}
      />

      {/* Version History Modal */}
      {isVersionHistoryOpen && selectedFileForVersions && (
        <VersionHistory
          fileId={selectedFileForVersions.id}
          fileName={selectedFileForVersions.originalName}
          onClose={handleVersionHistoryClose}
          onVersionRestore={handleVersionRestore}
        />
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteAccountModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteAccountModal(false)}>
          <div className="modal delete-account-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Account</h3>
              <button
                className="modal-close"
                onClick={() => setShowDeleteAccountModal(false)}
              >
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-message">
                <div className="warning-icon">⚠️</div>
                <h4>This action cannot be undone!</h4>
                <p>
                  Deleting your account will permanently remove:
                </p>
                <ul>
                  <li>All your files and folders</li>
                  <li>Your S3 storage bucket</li>
                  <li>Account settings and preferences</li>
                  <li>All associated data</li>
                </ul>
                <p className="warning-note">
                  <strong>Warning:</strong> This process is irreversible and will result in the complete loss of all your data.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteAccountModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? 'Deleting...' : 'Delete Account Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;