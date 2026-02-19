import React, { useState, useEffect, useCallback } from 'react';
import {
  FiClock,
  FiDownload,
  FiRotateCcw,
  FiTrash2,
  FiEdit3,
  FiCheck,
  FiX,
  FiDollarSign,
  FiDatabase,
  FiZap,
  FiInfo
} from 'react-icons/fi';
import { useNotifications } from '../contexts/NotificationContext';
// import { fileAPI } from '../services/api'; // Removed unused import
import './VersionHistory.css';

const VersionHistory = ({ fileId, fileName, onClose, onVersionRestore }) => {
  const { showSuccess, showError } = useNotifications();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [optimizing, setOptimizing] = useState(false);

  const fetchVersionHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/files/${fileId}/versions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch version history');
      }
      
      const data = await response.json();
      setVersions(data.versions || []);
    } catch (error) {
      console.error('Error fetching version history:', error);
      setError('Failed to load version history');
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    if (fileId) {
      fetchVersionHistory();
    }
  }, [fileId, fetchVersionHistory]);



  const handleRestoreVersion = async (versionId, versionNumber) => {
    if (!window.confirm(`Restore version ${versionNumber}? This will make it the current active version.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/versions/${fileId}/versions/${versionId}/restore`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to restore version');
      }

      await fetchVersionHistory();
      if (onVersionRestore) {
        onVersionRestore();
      }
    } catch (error) {
      console.error('Error restoring version:', error);
      showError('Restore failed', 'Failed to restore version. Please try again.');
    }
  };

  const handleDeleteVersion = async (versionId, versionNumber) => {
    if (!window.confirm(`Delete version ${versionNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/versions/${fileId}/versions/${versionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete version');
      }

      await fetchVersionHistory();
    } catch (error) {
      console.error('Error deleting version:', error);
      showError('Delete failed', error.message);
    }
  };

  const handleDownloadVersion = async (versionId, versionNumber) => {
    try {
      const response = await fetch(`/api/versions/${fileId}/versions/${versionId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const data = await response.json();

      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = `${data.fileName} (v${versionNumber})`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading version:', error);
      showError('Download failed', 'Failed to download version. Please try again.');
    }
  };

  const handleUpdateComment = async (versionId) => {
    try {
      const response = await fetch(`/api/versions/${fileId}/versions/${versionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comment: newComment })
      });

      if (!response.ok) {
        throw new Error('Failed to update comment');
      }

      await fetchVersionHistory();
      setEditingComment(null);
      setNewComment('');
    } catch (error) {
      console.error('Error updating comment:', error);
      showError('Update failed', 'Failed to update comment. Please try again.');
    }
  };

  const handleOptimizeVersions = async () => {
    if (!window.confirm('Optimize old versions by moving them to cheaper storage? This will reduce costs but may increase retrieval time for old versions.')) {
      return;
    }

    try {
      setOptimizing(true);
      const response = await fetch(`/api/versions/${fileId}/versions/optimize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          daysThreshold: 30,
          targetStorageClass: 'STANDARD_IA',
          skipActiveVersion: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to optimize versions');
      }

      const result = await response.json();
      showSuccess(
        'Optimization completed',
        `Optimized ${result.optimizedCount} versions. Estimated monthly savings: $${result.totalSavings.toFixed(4)}`
      );
      await fetchVersionHistory();
    } catch (error) {
      console.error('Error optimizing versions:', error);
      showError('Optimization failed', 'Failed to optimize versions. Please try again.');
    } finally {
      setOptimizing(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStorageClassColor = (storageClass) => {
    const colors = {
      'INTELLIGENT_TIERING': '#7C3AED',
      'STANDARD': '#3B82F6',
      'STANDARD_IA': '#10B981',
      'ONEZONE_IA': '#F59E0B',
      'GLACIER_IR': '#8B5CF6',
      'GLACIER': '#EC4899',
      'DEEP_ARCHIVE': '#6B7280'
    };
    return colors[storageClass] || '#6B7280';
  };

  const getStorageClassInfo = (storageClass) => {
    const storageClasses = {
      'INTELLIGENT_TIERING': {
        name: '🤖 Intelligent Tiering',
        description: 'AWS automatically moves your files between storage tiers based on access patterns to optimize costs while maintaining instant access when needed.'
      },
      'STANDARD': {
        name: '⚡ Lightning Fast',
        description: 'Perfect for files you access daily'
      },
      'STANDARD_IA': {
        name: '💎 Smart Saver',
        description: 'Great for large files, smart optimization'
      },
      'ONEZONE_IA': {
        name: '🎯 Budget Smart',
        description: 'Most affordable for non-critical files'
      },
      'GLACIER_IR': {
        name: '🏔️ Archive Pro',
        description: 'Ultra-low cost with instant access'
      },
      'GLACIER': {
        name: '🧊 Deep Freeze',
        description: 'Long-term storage, massive savings'
      },
      'DEEP_ARCHIVE': {
        name: '🏛️ Vault Keeper',
        description: 'Ultimate long-term storage'
      }
    };
    return storageClasses[storageClass] || { name: storageClass, description: '' };
  };

  if (loading) {
    return (
      <div className="version-history-modal">
        <div className="version-history-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading version history...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="version-history-modal">
        <div className="version-history-content">
          <div className="error-container">
            <p>{error}</p>
            <button onClick={onClose} className="btn btn-primary">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="version-history-modal">
      <div className="version-history-content">
        <div className="version-history-header">
          <div className="header-info">
            <h2>📄 Version History</h2>
            <p className="file-name">{fileName}</p>
            <div className="version-stats">
              <span>{versions.totalVersions} versions</span>
              <span>•</span>
              <span>{formatFileSize(versions.totalSize)} total</span>
              <span>•</span>
              <span>${versions.totalMonthlyCost?.toFixed(4)}/month</span>
            </div>
          </div>
          <div className="header-actions">
            <button
              onClick={handleOptimizeVersions}
              disabled={optimizing}
              className="btn btn-secondary"
              title="Move old versions to cheaper storage"
            >
              <FiZap />
              {optimizing ? 'Optimizing...' : 'Optimize Storage'}
            </button>
            <button onClick={onClose} className="btn btn-ghost">
              <FiX />
            </button>
          </div>
        </div>

        <div className="version-timeline">
          {versions.versions?.map((version, index) => (
            <div
              key={version.versionId}
              className={`version-item ${version.isActive ? 'active' : ''}`}
            >
              <div className="version-indicator">
                <div className="version-number">v{version.versionNumber}</div>
                {version.isActive && <div className="current-badge">Current</div>}
              </div>

              <div className="version-content">
                <div className="version-header">
                  <div className="version-info">
                    <span className="version-date">
                      <FiClock />
                      {formatDate(version.uploadDate)}
                    </span>
                    <span className="version-size">{formatFileSize(version.fileSize)}</span>
                    <div
                      className="storage-class-badge"
                      style={{
                        backgroundColor: getStorageClassColor(version.storageClass) + '20',
                        color: getStorageClassColor(version.storageClass)
                      }}
                      title={getStorageClassInfo(version.storageClass).description}
                    >
                      <FiDatabase />
                      {getStorageClassInfo(version.storageClass).name}
                    </div>
                    <span className="version-cost">
                      <FiDollarSign />
                      ${version.monthlyCost?.toFixed(4)}/month
                    </span>
                  </div>

                  <div className="version-actions">
                    {!version.isActive && (
                      <>
                        <button
                          onClick={() => handleRestoreVersion(version.versionId, version.versionNumber)}
                          className="action-btn restore-btn"
                          title="Restore this version"
                        >
                          <FiRotateCcw />
                        </button>
                        <button
                          onClick={() => handleDeleteVersion(version.versionId, version.versionNumber)}
                          className="action-btn delete-btn"
                          title="Delete this version"
                        >
                          <FiTrash2 />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDownloadVersion(version.versionId, version.versionNumber)}
                      className="action-btn download-btn"
                      title="Download this version"
                    >
                      <FiDownload />
                    </button>
                  </div>
                </div>

                <div className="version-comment">
                  {editingComment === version.versionId ? (
                    <div className="comment-edit">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment for this version..."
                        className="comment-input"
                      />
                      <div className="comment-actions">
                        <button
                          onClick={() => handleUpdateComment(version.versionId)}
                          className="btn btn-sm btn-primary"
                        >
                          <FiCheck />
                        </button>
                        <button
                          onClick={() => {
                            setEditingComment(null);
                            setNewComment('');
                          }}
                          className="btn btn-sm btn-ghost"
                        >
                          <FiX />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="comment-display">
                      <span className="comment-text">
                        {version.comment || 'No comment'}
                      </span>
                      <button
                        onClick={() => {
                          setEditingComment(version.versionId);
                          setNewComment(version.comment || '');
                        }}
                        className="edit-comment-btn"
                        title="Edit comment"
                      >
                        <FiEdit3 />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {versions.costBreakdown && (
          <div className="cost-breakdown">
            <h3>💰 Cost Breakdown</h3>
            <div className="breakdown-grid">
              {Object.entries(versions.costBreakdown).map(([storageClass, data]) => (
                <div key={storageClass} className="breakdown-item">
                  <div
                    className="storage-class-indicator"
                    style={{ backgroundColor: getStorageClassColor(storageClass) }}
                  ></div>
                  <div className="breakdown-info">
                    <span className="storage-class-name">{data.info.name}</span>
                    <span className="breakdown-stats">
                      {data.count} versions • {formatFileSize(data.totalSize)} • ${data.totalCost.toFixed(4)}/month
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="version-help">
          <FiInfo />
          <span>
            Versions older than 30 days can be moved to cheaper storage to reduce costs.
            Only the current version affects file sharing and downloads.
          </span>
        </div>
      </div>
    </div>
  );
};

export default VersionHistory;