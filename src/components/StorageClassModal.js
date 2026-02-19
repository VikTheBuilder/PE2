import React, { useState, useEffect } from 'react';
import { 
  FiX, 
  FiCheck, 
  FiDollarSign, 
  FiClock, 
  FiInfo, 
  FiHardDrive,
  FiCloud,
  FiDatabase,
  FiArchive,
  FiBox,
  FiZap
} from 'react-icons/fi';
import { fileAPI } from '../services/api';
import './StorageClassModal.css';

const StorageClassModal = ({ 
  isOpen, 
  onClose,/*  */
  onSelect, 
  file,
  loading = false 
}) => {
  const [recommendations, setRecommendations] = useState(null);
  const [selectedStorageClass, setSelectedStorageClass] = useState(null);
  const [selectedStorageSize, setSelectedStorageSize] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [activeTab, setActiveTab] = useState('recommended'); // 'recommended' or 'all'

  // User-friendly storage classes with tiered pricing
  const STORAGE_PRICING = {
    INTELLIGENT_TIERING: {
      basePricePerGB: 0.0125,
      pricePerGB: 0.01625, // 30% margin
      displayName: '🤖 Intelligent Tiering',
      friendlyName: 'Intelligent Tiering Storage',
      description: 'AWS automatically moves files between tiers to save money',
      retrievalTime: 'Instant',
      minimumDuration: 'None',
      savingsVsStandard: 'Automatic optimization',
      margin: 30,
      icon: '🤖',
      color: '#7C3AED',
      tagline: 'Set it and forget it - AWS optimizes for you',
      recommended: true
    },
    STANDARD: {
      basePricePerGB: 0.023,
      pricePerGB: 0.029, // 25% margin
      displayName: '⚡ Lightning Fast',
      friendlyName: 'Lightning Fast Storage',
      description: 'Perfect for files you access daily - photos, documents, and active projects',
      retrievalTime: 'Instant',
      minimumDuration: 'None',
      savingsVsStandard: 0,
      margin: 25,
      icon: '⚡',
      color: '#3B82F6',
      tagline: 'For files you use every day'
    },
    STANDARD_IA: {
      basePricePerGB: 0.0125,
      pricePerGB: 0.017, // 35% margin
      displayName: '💎 Smart Saver',
      friendlyName: 'Smart Saver Storage',
      description: 'Great for large files you don\'t access often - smart optimization saves money',
      retrievalTime: 'Instant',
      minimumDuration: '30 days',
      savingsVsStandard: 46,
      margin: 35,
      icon: '💎',
      color: '#10B981',
      tagline: 'Perfect for large files'
    },
    ONEZONE_IA: {
      basePricePerGB: 0.01,
      pricePerGB: 0.014, // 40% margin
      displayName: '🎯 Budget Smart',
      friendlyName: 'Budget Smart Storage',
      description: 'Most affordable option for non-critical files with instant access',
      retrievalTime: 'Instant',
      minimumDuration: '30 days',
      savingsVsStandard: 57,
      margin: 40,
      icon: '🎯',
      color: '#F59E0B',
      tagline: 'Maximum savings'
    },
    GLACIER_IR: {
      basePricePerGB: 0.004,
      pricePerGB: 0.006, // 45% margin
      displayName: '🏔️ Archive Pro',
      friendlyName: 'Archive Pro Storage',
      description: 'Ultra-low cost archive with instant access - perfect for important backups',
      retrievalTime: 'Instant',
      minimumDuration: '90 days',
      savingsVsStandard: 83,
      margin: 45,
      icon: '🏔️',
      color: '#8B5CF6',
      tagline: 'Ultra-low cost backups'
    },
    GLACIER: {
      basePricePerGB: 0.0036,
      pricePerGB: 0.005, // 50% margin
      displayName: '🧊 Deep Freeze',
      friendlyName: 'Deep Freeze Storage',
      description: 'Long-term storage for files you rarely access - massive savings',
      retrievalTime: '1-5 minutes',
      minimumDuration: '90 days',
      savingsVsStandard: 84,
      margin: 50,
      icon: '🧊',
      color: '#EC4899',
      tagline: 'Long-term storage'
    },
    DEEP_ARCHIVE: {
      basePricePerGB: 0.00099,
      pricePerGB: 0.002, // 60% margin
      displayName: '🏛️ Vault Keeper',
      friendlyName: 'Vault Keeper Storage',
      description: 'Ultimate long-term storage - cheapest option for data you almost never need',
      retrievalTime: '12 hours',
      minimumDuration: '180 days',
      savingsVsStandard: 96,
      margin: 60,
      icon: '🏛️',
      color: '#6B7280',
      tagline: 'Digital safety deposit box'
    }
  };

  // Storage size options in GB
  const STORAGE_SIZE_OPTIONS = [
    { value: 1, label: '1 GB', description: 'Small files, documents' },
    { value: 5, label: '5 GB', description: 'Medium files, photos' },
    { value: 10, label: '10 GB', description: 'Large files, videos' },
    { value: 25, label: '25 GB', description: 'HD videos, datasets' },
    { value: 50, label: '50 GB', description: '4K videos, large datasets' },
    { value: 100, label: '100 GB', description: 'Enterprise datasets' },
    { value: 250, label: '250 GB', description: 'Large backups' },
    { value: 500, label: '500 GB', description: 'Enterprise backups' },
    { value: 1000, label: '1 TB', description: 'Large archives' }
  ];

  const fetchRecommendations = async () => {
    if (!file) return;
    
    setLoadingRecommendations(true);
    try {
      const data = await fileAPI.getStorageRecommendations(
        file.name,
        file.type,
        file.size
      );
      setRecommendations({
        ...data,
        recommendation: {
          ...data.recommendation,
          recommended: 'INTELLIGENT_TIERING',
          reason: 'Intelligent Tiering automatically optimizes costs based on access patterns'
        }
      });
      setSelectedStorageClass('INTELLIGENT_TIERING');
      
      // Set default storage size based on file size
      const fileSizeGB = file.size / (1024 * 1024 * 1024);
      const closestSize = STORAGE_SIZE_OPTIONS.reduce((prev, curr) => 
        Math.abs(curr.value - fileSizeGB) < Math.abs(prev.value - fileSizeGB) ? curr : prev
      );
      setSelectedStorageSize(closestSize.value);
    } catch (error) {
      console.error('Error fetching storage recommendations:', error);
      // Set default values if API fails - default to INTELLIGENT_TIERING
      setSelectedStorageClass('INTELLIGENT_TIERING');
      setSelectedStorageSize(1);
      setRecommendations({
        showRecommendations: true,
        recommendation: {
          recommended: 'INTELLIGENT_TIERING',
          reason: 'Intelligent Tiering automatically optimizes costs based on access patterns'
        }
      });
    } finally {
      setLoadingRecommendations(false);
    }
  };

  useEffect(() => {
    if (isOpen && file) {
      fetchRecommendations();
    }
  }, [isOpen, file]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = () => {
    if (selectedStorageClass && selectedStorageSize) {
      onSelect({
        storageClass: selectedStorageClass,
        storageSize: selectedStorageSize,
        estimatedMonthlyCost: calculateMonthlyCost(selectedStorageClass, selectedStorageSize)
      });
    }
  };

  const calculateMonthlyCost = (storageClass, sizeGB) => {
    const pricing = STORAGE_PRICING[storageClass];
    return pricing ? pricing.pricePerGB * sizeGB : 0;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatCost = (cost) => {
    if (cost < 0.001) return '<$0.001';
    if (cost < 1) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  };

  const getStorageClassIcon = (storageClass) => {
    switch (storageClass) {
      case 'INTELLIGENT_TIERING':
        return '🤖';
      case 'STANDARD':
        return '🔵';
      case 'STANDARD_IA':
        return '🟡';
      case 'ONEZONE_IA':
        return '🟠';
      case 'GLACIER_IR':
        return '🟢';
      case 'GLACIER':
        return '🟣';
      case 'DEEP_ARCHIVE':
        return '⚫';
      default:
        return '📁';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="storage-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Choose Storage Class & Size</h3>
          <button className="modal-close" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          {file && (
            <div className="file-info">
              <h4>File: {file.name}</h4>
              <p>Size: {formatFileSize(file.size)} • Type: {file.type}</p>
            </div>
          )}

          {/* Storage Size Selection */}
          <div className="storage-size-section">
            <h4>Select Storage Size</h4>
            <div className="storage-size-options">
              {STORAGE_SIZE_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={`storage-size-option ${
                    selectedStorageSize === option.value ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedStorageSize(option.value)}
                >
                  <div className="size-option-header">
                    <input
                      type="radio"
                      name="storageSize"
                      value={option.value}
                      checked={selectedStorageSize === option.value}
                      onChange={() => setSelectedStorageSize(option.value)}
                    />
                    <span className="size-label">{option.label}</span>
                    <span className="size-description">{option.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {loadingRecommendations ? (
            <div className="loading-recommendations">
              <div className="loading-spinner"></div>
              <p>Getting recommendations...</p>
            </div>
          ) : (
            <>
              {recommendations?.showRecommendations && (
                <div className={`recommendation-banner ${
                  recommendations.recommendation.recommended === 'INTELLIGENT_TIERING' ? 'intelligent-tiering' : ''
                }`}>
                  <FiInfo />
                  <div>
                    <strong>Recommended: {STORAGE_PRICING[recommendations.recommendation.recommended]?.displayName}</strong>
                    <p>{recommendations.recommendation.reason}</p>
                    {recommendations.recommendation.recommended === 'INTELLIGENT_TIERING' && (
                      <p className="intelligent-tiering-explanation">
                        <strong>How it works:</strong> AWS automatically moves files between tiers to save money
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="storage-classes">
                {Object.entries(STORAGE_PRICING).map(([storageClass, pricing]) => {
                  const monthlyCost = calculateMonthlyCost(storageClass, selectedStorageSize || 1);
                  const isSelected = selectedStorageClass === storageClass;
                  const isRecommended = recommendations?.recommendation?.recommended === storageClass;
                  
                  return (
                    <div
                      key={storageClass}
                      className={`storage-class-option ${
                        isSelected ? 'selected' : ''
                      } ${
                        isRecommended ? 'recommended' : ''
                      }`}
                      onClick={() => setSelectedStorageClass(storageClass)}
                    >
                      <div className="storage-class-header">
                        <div className="storage-class-name">
                          <input
                            type="radio"
                            name="storageClass"
                            value={storageClass}
                            checked={isSelected}
                            onChange={() => setSelectedStorageClass(storageClass)}
                          />
                          <span className="storage-icon">{getStorageClassIcon(storageClass)}</span>
                          <span className="name">{pricing.displayName}</span>
                          {isRecommended && (
                            <span className="recommended-badge">
                              <FiCheck /> Recommended
                            </span>
                          )}
                        </div>
                        <div className="storage-class-cost">
                          <FiDollarSign />
                          {formatCost(monthlyCost)}/month
                        </div>
                      </div>
                      
                      <div className="storage-class-details">
                        <p className="description">{pricing.description}</p>
                        <div className="storage-class-specs">
                          <span className="spec">
                            <FiClock /> {pricing.retrievalTime}
                          </span>
                          {pricing.minimumDuration !== 'None' && (
                            <span className="spec">
                              Min: {pricing.minimumDuration}
                            </span>
                          )}
                          {(pricing.savingsVsStandard > 0 || typeof pricing.savingsVsStandard === 'string') && (
                            <span className="savings">
                              {typeof pricing.savingsVsStandard === 'string' 
                                ? pricing.savingsVsStandard 
                                : `${pricing.savingsVsStandard}% savings`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cost Summary */}
              {selectedStorageClass && selectedStorageSize && (
                <div className="cost-summary">
                  <h4>Cost Summary</h4>
                  <div className="cost-breakdown">
                    <div className="cost-item">
                      <span>Storage Class:</span>
                      <span>{STORAGE_PRICING[selectedStorageClass].displayName}</span>
                    </div>
                    <div className="cost-item">
                      <span>Storage Size:</span>
                      <span>{selectedStorageSize} GB</span>
                    </div>
                    <div className="cost-item total">
                      <span>Monthly Cost:</span>
                      <span>{formatCost(calculateMonthlyCost(selectedStorageClass, selectedStorageSize))}</span>
                    </div>
                    <div className="cost-item">
                      <span>Annual Cost:</span>
                      <span>{formatCost(calculateMonthlyCost(selectedStorageClass, selectedStorageSize) * 12)}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSelect}
            disabled={!selectedStorageClass || !selectedStorageSize || loading}
          >
            {loading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StorageClassModal;