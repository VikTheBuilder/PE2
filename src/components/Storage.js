import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ShareModal from './ShareModal';
import {
  FiHardDrive,
  FiFile,
  FiFolder,
  FiImage,
  FiVideo,
  FiMusic,
  FiArchive,
  FiDownload,
  FiShare2,
  FiStar,
  FiSearch,
  FiPieChart,
  FiDollarSign,
  FiDatabase,
  FiGrid,
  FiList,
  FiMenu,
  FiZap
} from 'react-icons/fi';
import { fileAPI } from '../services/api';
import { useSharedFiles } from '../contexts/SharedFilesContext';
import './Storage.css';

const Storage = () => {
  const { sharedFiles: sharedFilesFromContext, isLoading: sharedLoading } = useSharedFiles();

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [activeSection, setActiveSection] = useState('all'); // 'all' or 'shared'

  // New: Add view mode toggle buttons handler
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStorageClass, setSelectedStorageClass] = useState('all');
  const [sortBy, setSortBy] = useState('size');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [storageStats, setStorageStats] = useState({
    totalStorage: 0,
    usedStorage: 0,
    fileCount: 0
  });
  const [showIntelligentTieringModal, setShowIntelligentTieringModal] = useState(false);
  const [fileToConvert, setFileToConvert] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [showBulkIntelligentTieringModal, setShowBulkIntelligentTieringModal] = useState(false);
  const [bulkOperationProgress, setBulkOperationProgress] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // TEMPORARILY BYPASSED — skip auth check for UI preview
    fetchStorageData();
  }, []);

  const fetchStorageData = async () => {
    try {
      setLoading(true);
      setError('');
      const filesData = await fileAPI.getFiles();
      const stats = await fileAPI.getStorageStats();
      setFiles(filesData);
      setStorageStats(stats);
    } catch (error) {
      console.error('Error fetching storage data:', error);
      setError('Failed to load storage data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType, isFolder = false) => {
    if (isFolder) return <FiFolder />;
    if (fileType.startsWith('image/')) return <FiImage />;
    if (fileType.startsWith('video/')) return <FiVideo />;
    if (fileType.startsWith('audio/')) return <FiMusic />;
    if (fileType.includes('zip') || fileType.includes('rar')) return <FiArchive />;
    return <FiFile />;
  };

  const getFileTypeDisplay = (fileType, isFolder = false) => {
    if (isFolder) return 'FOLDER';
    if (fileType.startsWith('image/')) return 'IMAGE';
    if (fileType.startsWith('video/')) return 'VIDEO';
    if (fileType.startsWith('audio/')) return 'AUDIO';
    if (fileType.includes('zip') || fileType.includes('rar')) return 'ARCHIVE';
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('word') || fileType.includes('document')) return 'DOCUMENT';
    if (fileType.includes('sheet') || fileType.includes('excel')) return 'SPREADSHEET';
    return 'FILE';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
  };

  const handleShareClick = (file) => {
    setSelectedFile(file);
    setIsShareModalOpen(true);
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setSearchQuery('');
    setSelectedStorageClass('all');
  };

  const currentFiles = activeSection === 'shared' ? sharedFilesFromContext : files;
  const currentLoading = activeSection === 'shared' ? sharedLoading : loading;

  const handleStarClick = async (file) => {
    try {
      const updatedFile = await fileAPI.toggleStar(file.id);
      setFiles(files.map(f => f.id === file.id ? updatedFile : f));
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  const handleDownload = async (file) => {
    try {
      const downloadUrl = await fileAPI.getDownloadUrl(file.id);
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleShareModalClose = () => {
    setIsShareModalOpen(false);
    setSelectedFile(null);
  };

  const handleIntelligentTieringClick = (file) => {
    setFileToConvert(file);
    setShowIntelligentTieringModal(true);
  };

  const handleIntelligentTieringConfirm = async () => {
    try {
      const result = await fileAPI.changeStorageClass(fileToConvert.id, 'INTELLIGENT_TIERING');

      // Update the file in the local state
      setFiles(files.map(f =>
        f.id === fileToConvert.id
          ? { ...f, storageClass: 'INTELLIGENT_TIERING', estimatedMonthlyCost: result.file.estimatedMonthlyCost }
          : f
      ));

      setShowIntelligentTieringModal(false);
      setFileToConvert(null);

      // Show success message (you could add a toast notification here)
      console.log('Successfully switched to Intelligent Tiering');
    } catch (error) {
      console.error('Error switching to intelligent tiering:', error);
      // Handle error (you could show an error toast here)
    }
  };

  const handleIntelligentTieringCancel = () => {
    setShowIntelligentTieringModal(false);
    setFileToConvert(null);
  };

  const handleFileSelection = (fileId, isSelected) => {
    const newSelectedFiles = new Set(selectedFiles);
    if (isSelected) {
      newSelectedFiles.add(fileId);
    } else {
      newSelectedFiles.delete(fileId);
    }
    setSelectedFiles(newSelectedFiles);
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === sortedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(sortedFiles.map(file => file.id)));
    }
  };

  const handleBulkIntelligentTieringClick = () => {
    if (selectedFiles.size === 0) return;
    setShowBulkIntelligentTieringModal(true);
  };

  const handleBulkIntelligentTieringConfirm = async () => {
    try {
      setBulkOperationProgress({ current: 0, total: selectedFiles.size });

      const fileIdsArray = Array.from(selectedFiles);
      const result = await fileAPI.bulkChangeStorageClass(fileIdsArray, 'INTELLIGENT_TIERING');

      // Update the files in the local state
      setFiles(files.map(f => {
        const updatedFile = result.results.find(r => r.fileId === f.id && r.success);
        if (updatedFile && updatedFile.file) {
          return updatedFile.file;
        }
        return f;
      }));

      setShowBulkIntelligentTieringModal(false);
      setSelectedFiles(new Set());
      setBulkOperationProgress(null);

      // Show success message
      console.log(`Successfully switched ${result.successCount} files to Intelligent Tiering`);
      if (result.failureCount > 0) {
        console.warn(`${result.failureCount} files failed to switch`);
      }

    } catch (error) {
      console.error('Error bulk switching to intelligent tiering:', error);
      setBulkOperationProgress(null);
    }
  };

  const handleBulkIntelligentTieringCancel = () => {
    setShowBulkIntelligentTieringModal(false);
    setBulkOperationProgress(null);
  };

  const openFolder = (folder) => {
    // Navigate to folder view or handle folder opening logic
    console.log('Opening folder:', folder.name);
    // You can implement navigation logic here, for example:
    // navigate(`/storage/folder/${folder.id}`);
  };

  const getEligibleFilesForIntelligentTiering = () => {
    return Array.from(selectedFiles)
      .map(fileId => sortedFiles.find(f => f.id === fileId))
      .filter(file => file && file.storageClass !== 'INTELLIGENT_TIERING');
  };

  const getStorageClassInfo = (storageClass) => {
    const storageClasses = {
      'INTELLIGENT_TIERING': {
        name: '🤖 Intelligent Tiering',
        friendlyName: 'Intelligent Tiering Storage',
        description: 'Automatically optimizes costs based on access patterns',
        baseCost: '$0.0125/GB/month',
        cost: '$0.016/GB/month',
        margin: '30%',
        color: '#7C3AED',
        icon: <FiDatabase />,
        emoji: '🤖'
      },
      'STANDARD': {
        name: '⚡ Lightning Fast',
        friendlyName: 'Lightning Fast Storage',
        description: 'Perfect for files you access daily',
        baseCost: '$0.023/GB/month',
        cost: '$0.029/GB/month',
        margin: '25%',
        color: '#3B82F6',
        icon: <FiDatabase />,
        emoji: '⚡'
      },
      'STANDARD_IA': {
        name: '💎 Smart Saver',
        friendlyName: 'Smart Saver Storage',
        description: 'Great for large files, smart optimization',
        baseCost: '$0.0125/GB/month',
        cost: '$0.017/GB/month',
        margin: '35%',
        color: '#10B981',
        icon: <FiDatabase />,
        emoji: '💎'
      },
      'ONEZONE_IA': {
        name: '🎯 Budget Smart',
        friendlyName: 'Budget Smart Storage',
        description: 'Most affordable for non-critical files',
        baseCost: '$0.01/GB/month',
        cost: '$0.014/GB/month',
        margin: '40%',
        color: '#F59E0B',
        icon: <FiDatabase />,
        emoji: '🎯'
      },
      'GLACIER_IR': {
        name: '🏔️ Archive Pro',
        friendlyName: 'Archive Pro Storage',
        description: 'Ultra-low cost with instant access',
        baseCost: '$0.004/GB/month',
        cost: '$0.006/GB/month',
        margin: '45%',
        color: '#8B5CF6',
        icon: <FiDatabase />,
        emoji: '🏔️'
      },
      'GLACIER': {
        name: '🧊 Deep Freeze',
        friendlyName: 'Deep Freeze Storage',
        description: 'Long-term storage, massive savings',
        baseCost: '$0.0036/GB/month',
        cost: '$0.005/GB/month',
        margin: '50%',
        color: '#EC4899',
        icon: <FiDatabase />,
        emoji: '🧊'
      },
      'DEEP_ARCHIVE': {
        name: '🏛️ Vault Keeper',
        friendlyName: 'Vault Keeper Storage',
        description: 'Ultimate long-term storage',
        baseCost: '$0.00099/GB/month',
        cost: '$0.002/GB/month',
        margin: '60%',
        color: '#6B7280',
        icon: <FiDatabase />,
        emoji: '🏛️'
      }
    };
    return storageClasses[storageClass] || storageClasses['STANDARD'];
  };

  // Generate AI Vision Tags based on file type for display purposes
  const getAiTags = (file) => {
    if (file.aiTags) return file.aiTags;
    if (file.rekognitionLabels) return file.rekognitionLabels;
    if (file.isFolder) return [];
    const type = (file.fileType || '').toLowerCase();
    if (type.startsWith('image')) return ['#Photo', '#Visual'];
    if (type.startsWith('video')) return ['#Video', '#Media'];
    if (type.startsWith('audio')) return ['#Audio', '#Sound'];
    if (type.includes('pdf') || type.includes('document') || type.includes('word')) return ['#Doc', '#Text'];
    if (type.includes('zip') || type.includes('rar') || type.includes('archive')) return ['#Archive'];
    if (type.includes('spreadsheet') || type.includes('excel')) return ['#Data', '#Sheet'];
    return ['#File'];
  };

  const filteredFiles = currentFiles.filter(file => {
    // Add null checks to prevent errors
    if (!file || !file.originalName) return false;

    const matchesSearch = file.originalName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStorageClass = selectedStorageClass === 'all' || file.storageClass === selectedStorageClass;
    return matchesSearch && matchesStorageClass;
  });

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    let aValue, bValue;

    switch (sortBy) {
      case 'size':
        aValue = a.fileSize;
        bValue = b.fileSize;
        break;
      case 'date':
        aValue = new Date(a.uploadDate);
        bValue = new Date(b.uploadDate);
        break;
      case 'name':
        aValue = a.originalName?.toLowerCase() || '';
        bValue = b.originalName?.toLowerCase() || '';
        break;
      default:
        aValue = a.fileSize;
        bValue = b.fileSize;
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const storageClassBreakdown = activeSection === 'shared'
    ? {} // No breakdown for shared section
    : files.reduce((acc, file) => {
      // Add null checks to prevent errors
      if (!file) return acc;

      const storageClass = file.storageClass || 'STANDARD';
      if (!acc[storageClass]) {
        acc[storageClass] = {
          count: 0,
          totalSize: 0,
          totalCost: 0,
          files: []
        };
      }
      acc[storageClass].count++;
      acc[storageClass].totalSize += (file.fileSize || 0);
      acc[storageClass].totalCost += (file.estimatedMonthlyCost || 0);
      acc[storageClass].files.push(file);
      return acc;
    }, {});

  const totalStorage = activeSection === 'shared'
    ? sharedFilesFromContext.reduce((sum, file) => sum + (file?.fileSize || 0), 0)
    : files.reduce((sum, file) => sum + (file?.fileSize || 0), 0);
  const totalMonthlyCost = activeSection === 'shared'
    ? sharedFilesFromContext.reduce((sum, file) => sum + (file?.estimatedMonthlyCost || 0), 0)
    : files.reduce((sum, file) => sum + (file?.estimatedMonthlyCost || 0), 0);

  return (
    <div className="storage-page">
      <div className="storage-sidebar">
        <div className="sidebar-header">
          <h2>Storage</h2>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeSection === 'all' ? 'active' : ''}`}
            onClick={() => handleSectionChange('all')}
          >
            <FiHardDrive />
            <span>All Files</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'shared' ? 'active' : ''}`}
            onClick={() => handleSectionChange('shared')}
          >
            <FiShare2 />
            <span>Shared Files</span>
            {sharedFilesFromContext.length > 0 && (
              <span className="badge">{sharedFilesFromContext.length}</span>
            )}
          </button>
        </nav>

        {/* Storage Overview Cards in Sidebar */}
        <div className="sidebar-overview">
          <div className="overview-card total-storage">
            <div className="card-icon storage-icon">
              <FiHardDrive />
            </div>
            <div className="card-content">
              <h3>Total Storage</h3>
              <div className="card-value">{formatFileSize(storageStats.usedStorage)}</div>
              <div className="card-subtitle">Used space of {formatFileSize(storageStats.totalStorage)}</div>
            </div>
          </div>

          <div className="overview-card total-files">
            <div className="card-icon">
              <FiFile />
            </div>
            <div className="card-content">
              <h3>Total Files</h3>
              <div className="card-value">{files?.length || 0}</div>
              <div className="card-subtitle">Files stored</div>
            </div>
          </div>

          <div className="overview-card monthly-cost">
            <div className="card-icon">
              <FiDollarSign />
            </div>
            <div className="card-content">
              <h3>Monthly Cost</h3>
              <div className="card-value">${totalMonthlyCost.toFixed(2)}</div>
              <div className="card-subtitle">Estimated monthly storage cost</div>
            </div>
          </div>

          <div className="overview-card storage-classes">
            <div className="card-icon">
              <FiPieChart />
            </div>
            <div className="card-content">
              <h3>Storage Classes</h3>
              <div className="card-value">{Object.keys(storageClassBreakdown).length}</div>
              <div className="card-subtitle">Active storage classes</div>
            </div>
          </div>
        </div>
      </div>

      <div className="storage-main">


        {currentLoading ? (
          <div className="storage-loading">
            <div className="loading-spinner"></div>
            <p>Loading storage information...</p>
          </div>
        ) : error ? (
          <div className="storage-error">{error}</div>
        ) : (
          <div className="storage-content">
            {/* Storage Class Breakdown - Only show if there are storage classes */}
            {Object.keys(storageClassBreakdown).length > 0 && (
              <div className="storage-breakdown">
                <h2>Storage Class Breakdown</h2>
                <div className="breakdown-grid">
                  {Object.entries(storageClassBreakdown).map(([storageClass, data]) => {
                    const classInfo = getStorageClassInfo(storageClass);
                    return (
                      <div key={storageClass} className="breakdown-card">
                        <div className="breakdown-header">
                          <div className="storage-class-icon" style={{ color: classInfo.color }}>
                            {classInfo.icon}
                          </div>
                          <div className="storage-class-info">
                            <h3>{classInfo.name}</h3>
                            <p>{classInfo.description}</p>
                            <span className="cost-info">{classInfo.cost}</span>
                          </div>
                        </div>
                        <div className="breakdown-stats">
                          <div className="stat">
                            <span className="stat-label">Files:</span>
                            <span className="stat-value">{data.count}</span>
                          </div>
                          <div className="stat">
                            <span className="stat-label">Size:</span>
                            <span className="stat-value">{formatFileSize(data.totalSize)}</span>
                          </div>
                          <div className="stat">
                            <span className="stat-label">Monthly Cost:</span>
                            <span className="stat-value">${data.totalCost.toFixed(2)}</span>
                          </div>
                        </div>
                        <button
                          className="view-files-btn"
                          onClick={() => setSelectedStorageClass(storageClass)}
                        >
                          View Files
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Files Section */}
            <div className="files-section">
              <div className="files-header">
                <div className="files-title">
                  <h2>
                    {activeSection === 'shared'
                      ? 'Shared Files'
                      : selectedStorageClass === 'all'
                        ? 'All Files'
                        : `${getStorageClassInfo(selectedStorageClass).name} Files`
                    }
                  </h2>
                  <span className="file-count">({sortedFiles.length} files)</span>
                </div>

                <div className="files-controls">
                  <div className="search-bar">
                    <FiSearch />
                    <input
                      type="text"
                      placeholder="Search by name or AI tags (#Nature, #Invoice)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="filter-controls">
                    <select
                      value={selectedStorageClass}
                      onChange={(e) => setSelectedStorageClass(e.target.value)}
                      className="storage-class-filter"
                    >
                      {activeSection === 'shared' ? null : (
                        <>
                          <option value="all">All Storage Classes</option>
                          {Object.keys(storageClassBreakdown).map(storageClass => (
                            <option key={storageClass} value={storageClass}>
                              {getStorageClassInfo(storageClass).name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="sort-by"
                    >
                      <option value="size">Sort by Size</option>
                      <option value="date">Sort by Date</option>
                      <option value="name">Sort by Name</option>
                    </select>

                    <button
                      className="sort-order-btn"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>
              </div>

              {/* View Mode Toggle Buttons */}
              <div className="view-mode-toggle">
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => handleViewModeChange('grid')}
                  title="Grid View"
                >
                  <FiGrid />
                </button>
                <button
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => handleViewModeChange('list')}
                  title="List View"
                >
                  <FiList />
                </button>
                <button
                  className={`view-btn ${viewMode === 'small' ? 'active' : ''}`}
                  onClick={() => handleViewModeChange('small')}
                  title="Small Icons View"
                >
                  <FiMenu />
                </button>
              </div>

              {/* Bulk Actions */}
              {sortedFiles.length > 0 && activeSection !== 'shared' && (
                <div className="bulk-actions">
                  <div className="bulk-selection">
                    <label className="bulk-select-all">
                      <input
                        type="checkbox"
                        checked={selectedFiles.size === sortedFiles.length && sortedFiles.length > 0}
                        onChange={handleSelectAll}
                      />
                      <span>Select All ({selectedFiles.size} selected)</span>
                    </label>
                  </div>

                  {selectedFiles.size > 0 && (
                    <div className="bulk-action-buttons">
                      {getEligibleFilesForIntelligentTiering().length > 0 && (
                        <button
                          className="bulk-action-btn intelligent-tiering-btn"
                          onClick={handleBulkIntelligentTieringClick}
                          title={`Enable Intelligent Tiering for ${getEligibleFilesForIntelligentTiering().length} files`}
                        >
                          <FiZap />
                          Enable Intelligent Tiering ({getEligibleFilesForIntelligentTiering().length})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {sortedFiles.length === 0 ? (
                <div className="empty-state">
                  <FiFile className="empty-icon" />
                  <h3>No files found</h3>
                  <p>
                    {selectedStorageClass === 'all'
                      ? 'No files match your search criteria'
                      : `No files found in ${getStorageClassInfo(selectedStorageClass).name} storage class`
                    }
                  </p>
                </div>
              ) : (
                <div className={`files-grid ${viewMode}`}>
                  {sortedFiles.map((file) => (
                    <div key={file.id} className={`file-item ${selectedFiles.has(file.id) ? 'selected' : ''}`}>
                      {activeSection !== 'shared' && (
                        <div className="file-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedFiles.has(file.id)}
                            onChange={(e) => handleFileSelection(file.id, e.target.checked)}
                          />
                        </div>
                      )}
                      <div className={`file-icon ${file.isFolder ? 'folder-icon' : ''}`}>
                        {getFileIcon(file.fileType, file.isFolder)}
                      </div>

                      <div className="file-info">
                        <div className="file-name">{file.isFolder ? file.name : file.originalName}</div>
                        {!file.isFolder && (
                          <div className="ai-tags-row">
                            {getAiTags(file).map((tag, idx) => (
                              <span key={idx} className="ai-tag-pill">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="file-right-section">
                        <div className="file-metadata">
                          <div className="file-size">
                            {file.isFolder ? '' : formatFileSize(file.fileSize)}
                          </div>
                          <div className="file-date">
                            {formatDate(file.uploadDate || file.createdDate)}
                          </div>
                        </div>

                        <div className="file-actions">
                          {!file.isFolder && (
                            <>
                              <button
                                className={`star-btn ${file.isStarred ? 'starred' : ''}`}
                                aria-label={`${file.isStarred ? 'Unstar' : 'Star'} ${file.originalName}`}
                                onClick={() => handleStarClick(file)}
                              >
                                <FiStar />
                              </button>
                              <button
                                className="action-btn"
                                onClick={() => handleDownload(file)}
                                aria-label={`Download ${file.originalName}`}
                                title="Download file"
                              >
                                <FiDownload />
                              </button>
                              <button
                                className="action-btn"
                                onClick={() => handleShareClick(file)}
                                aria-label={`Share ${file.originalName}`}
                                title="Share file"
                              >
                                <FiShare2 />
                              </button>
                            </>
                          )}
                          {file.isFolder && (
                            <>
                              <button
                                className="action-btn"
                                onClick={() => openFolder(file)}
                                aria-label={`Open ${file.name}`}
                                title="Open folder"
                              >
                                <FiFolder />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Share Modal */}
        {isShareModalOpen && (
          <ShareModal
            isOpen={isShareModalOpen}
            onClose={handleShareModalClose}
            fileDetails={selectedFile}
          />
        )}

        {/* Intelligent Tiering Confirmation Modal */}
        {showIntelligentTieringModal && fileToConvert && (
          <div className="modal-overlay">
            <div className="intelligent-tiering-modal">
              <div className="modal-header">
                <h3>🤖 Switch to Intelligent Tiering</h3>
              </div>
              <div className="modal-content">
                <p><strong>File:</strong> {fileToConvert.originalName}</p>
                <p><strong>Current Storage:</strong> {getStorageClassInfo(fileToConvert.storageClass).name}</p>

                <div className="benefits-section">
                  <h4>Benefits of Intelligent Tiering:</h4>
                  <ul>
                    <li>🤖 <strong>Automatic Optimization:</strong> AWS automatically moves your file between storage tiers based on access patterns</li>
                    <li>💰 <strong>Cost Savings:</strong> Save money without any manual work - the system optimizes costs for you</li>
                    <li>⚡ <strong>No Performance Impact:</strong> Files remain instantly accessible when you need them</li>
                    <li>🔄 <strong>Seamless Transitions:</strong> Files move between tiers automatically based on usage</li>
                  </ul>
                </div>

                <div className="cost-comparison">
                  <p><strong>How it works:</strong></p>
                  <p>AWS monitors your file access patterns and automatically moves files between different storage tiers (Frequent Access, Infrequent Access, Archive, etc.) to optimize costs while maintaining instant access when needed.</p>
                </div>
              </div>
              <div className="modal-actions">
                <button
                  className="btn-cancel"
                  onClick={handleIntelligentTieringCancel}
                >
                  Cancel
                </button>
                <button
                  className="btn-confirm"
                  onClick={handleIntelligentTieringConfirm}
                >
                  Switch to Intelligent Tiering
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Intelligent Tiering Confirmation Modal */}
        {showBulkIntelligentTieringModal && (
          <div className="modal-overlay">
            <div className="intelligent-tiering-modal bulk-modal">
              <div className="modal-header">
                <h3>🤖 Enable Intelligent Tiering for Multiple Files</h3>
              </div>
              <div className="modal-content">
                <p><strong>Selected Files:</strong> {getEligibleFilesForIntelligentTiering().length} files eligible for Intelligent Tiering</p>

                {bulkOperationProgress && (
                  <div className="progress-section">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${(bulkOperationProgress.current / bulkOperationProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    <p>Processing {bulkOperationProgress.current} of {bulkOperationProgress.total} files...</p>
                  </div>
                )}

                <div className="benefits-section">
                  <h4>Benefits of Intelligent Tiering:</h4>
                  <ul>
                    <li>🤖 <strong>Automatic Optimization:</strong> AWS automatically moves your files between storage tiers based on access patterns</li>
                    <li>💰 <strong>Cost Savings:</strong> Save money without any manual work - the system optimizes costs for you</li>
                    <li>⚡ <strong>No Performance Impact:</strong> Files remain instantly accessible when you need them</li>
                    <li>🔄 <strong>Seamless Transitions:</strong> Files move between tiers automatically based on usage</li>
                  </ul>
                </div>

                <div className="file-list-preview">
                  <h4>Files to be updated:</h4>
                  <div className="file-preview-list">
                    {getEligibleFilesForIntelligentTiering().slice(0, 5).map(file => (
                      <div key={file.id} className="file-preview-item">
                        <span className="file-name">{file.originalName}</span>
                        <span className="current-storage">{getStorageClassInfo(file.storageClass).name}</span>
                      </div>
                    ))}
                    {getEligibleFilesForIntelligentTiering().length > 5 && (
                      <div className="file-preview-item more">
                        <span>... and {getEligibleFilesForIntelligentTiering().length - 5} more files</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button
                  className="btn-cancel"
                  onClick={handleBulkIntelligentTieringCancel}
                  disabled={bulkOperationProgress !== null}
                >
                  Cancel
                </button>
                <button
                  className="btn-confirm"
                  onClick={handleBulkIntelligentTieringConfirm}
                  disabled={bulkOperationProgress !== null}
                >
                  {bulkOperationProgress ? 'Processing...' : 'Enable Intelligent Tiering'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Storage;
