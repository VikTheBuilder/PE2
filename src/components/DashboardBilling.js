import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiDownload, 
  FiBox, 
  FiActivity,
  FiUpload,
  FiGlobe,
  FiDatabase,
  FiArchive,
  FiClock,
  FiTrendingUp,
  FiInfo
} from 'react-icons/fi';
import './DashboardBilling.css';

// Import safe utilities
import { formatStorageSize, formatCurrency, formatNumber } from '../utils/safeFormatters';
import { 
  validateUsageResponse, 
  validateCurrentResponse, 
  validateHistoryResponse,
  DEFAULT_USAGE_METRICS 
} from '../utils/dataValidators';
import { errorRecoveryManager, executeWithRetry } from '../utils/errorRecovery';
import { billingStateManager } from '../utils/stateManager';
import { billingAPI } from '../services/api';

// Error Boundary Component for catching React errors
class BillingErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Billing component error:', error, errorInfo);
    
    // Log error with recovery manager
    const recoveryAction = errorRecoveryManager.handleError(error, 'billing-component');
    
    this.setState({
      error: error,
      errorInfo: errorInfo,
      recoveryAction: recoveryAction
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="dashboard-billing">
          <div className="error-state">
            <h3>Something went wrong with the billing dashboard</h3>
            <p>{this.state.recoveryAction?.userMessage || 'An unexpected error occurred.'}</p>
            <div className="error-actions">
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  window.location.reload();
                }}
              >
                Reload Dashboard
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <pre>{this.state.error && this.state.error.toString()}</pre>
                <pre>{this.state.errorInfo.componentStack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const DashboardBilling = () => {
  const [billingHistory, setBillingHistory] = useState([]);
  const [usageMetrics, setUsageMetrics] = useState(null);
  const [currentCosts, setCurrentCosts] = useState(null);
  const [showPricing, setShowPricing] = useState(false);
  const [pricingStructure, setPricingStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastValidData, setLastValidData] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [stateValidation, setStateValidation] = useState({ isValid: true, warnings: [] });



  // Validate and set usage metrics with error recovery
  const setValidatedUsageMetrics = (data) => {
    try {
      const validatedData = validateUsageResponse(data);
      setUsageMetrics(validatedData);
      
      // Store as last valid data for recovery
      setLastValidData(prev => ({
        ...prev,
        usageMetrics: validatedData
      }));
      
      return validatedData;
    } catch (validationError) {
      console.error('Usage data validation failed:', validationError);
      const recoveryAction = errorRecoveryManager.handleError(validationError, 'usage-metrics');
      
      // Use fallback data if validation fails
      const fallbackData = recoveryAction.fallbackData;
      setUsageMetrics(fallbackData);
      return fallbackData;
    }
  };

  // Validate and set current costs with error recovery
  const setValidatedCurrentCosts = (data) => {
    try {
      const validatedData = validateCurrentResponse(data);
      setCurrentCosts(validatedData);
      
      // Store as last valid data for recovery
      setLastValidData(prev => ({
        ...prev,
        currentCosts: validatedData
      }));
      
      return validatedData;
    } catch (validationError) {
      console.error('Current costs validation failed:', validationError);
      const recoveryAction = errorRecoveryManager.handleError(validationError, 'current-billing');
      
      // Use fallback data if validation fails
      const fallbackData = recoveryAction.fallbackData;
      setCurrentCosts(fallbackData);
      return fallbackData;
    }
  };

  // Validate and set billing history with error recovery
  const setValidatedBillingHistory = (data) => {
    try {
      const validatedData = validateHistoryResponse(data);
      setBillingHistory(validatedData);
      
      // Store as last valid data for recovery
      setLastValidData(prev => ({
        ...prev,
        billingHistory: validatedData
      }));
      
      return validatedData;
    } catch (validationError) {
      console.error('Billing history validation failed:', validationError);
      const recoveryAction = errorRecoveryManager.handleError(validationError, 'billing-history');
      
      // Use fallback data if validation fails
      const fallbackData = recoveryAction.fallbackData;
      setBillingHistory(fallbackData);
      return fallbackData;
    }
  };

  // Validate entire component state before rendering
  const validateComponentState = useCallback(() => {
    const currentState = {
      usageMetrics,
      currentCosts,
      billingHistory,
      loading,
      error,
      lastValidData,
      retryCount,
      showPricing,
      pricingStructure
    };

    const validation = billingStateManager.validateState(currentState);
    setStateValidation(validation);

    // If state is invalid, attempt recovery
    if (!validation.isValid) {
      console.warn('Component state validation failed:', validation.errors);
      
      const recovery = billingStateManager.recoverFromCorruption(currentState, 'dashboard-billing');
      
      if (recovery.recoveredState) {
        console.log('State recovery actions:', recovery.actionsToken);
        
        // Apply recovered state
        if (recovery.recoveredState.usageMetrics !== usageMetrics) {
          setUsageMetrics(recovery.recoveredState.usageMetrics);
        }
        if (recovery.recoveredState.currentCosts !== currentCosts) {
          setCurrentCosts(recovery.recoveredState.currentCosts);
        }
        if (recovery.recoveredState.billingHistory !== billingHistory) {
          setBillingHistory(recovery.recoveredState.billingHistory);
        }
        if (recovery.recoveredState.loading !== loading) {
          setLoading(recovery.recoveredState.loading);
        }
        if (recovery.recoveredState.error !== error) {
          setError(recovery.recoveredState.error);
        }
        
        // Update validation state
        setStateValidation({ 
          isValid: true, 
          warnings: [`State recovered: ${recovery.actionsToken.join(', ')}`],
          recoveryUsed: true
        });
      }
    } else if (validation.warnings.length > 0) {
      // Apply sanitized state if there were warnings
      if (validation.sanitizedState.usageMetrics !== usageMetrics) {
        setUsageMetrics(validation.sanitizedState.usageMetrics);
      }
      if (validation.sanitizedState.currentCosts !== currentCosts) {
        setCurrentCosts(validation.sanitizedState.currentCosts);
      }
      if (validation.sanitizedState.billingHistory !== billingHistory) {
        setBillingHistory(validation.sanitizedState.billingHistory);
      }
      if (validation.sanitizedState.loading !== loading) {
        setLoading(validation.sanitizedState.loading);
      }
      if (validation.sanitizedState.error !== error) {
        setError(validation.sanitizedState.error);
      }
    }

    return validation;
  }, [usageMetrics, currentCosts, billingHistory, loading, error, lastValidData, retryCount, showPricing, pricingStructure]);

  // Persist last known good state
  const persistCurrentState = useCallback(() => {
    const validation = validateComponentState();
    
    if (validation.isValid && usageMetrics && !loading && !error) {
      const stateToStore = {
        usageMetrics,
        currentCosts,
        billingHistory,
        pricingStructure
      };
      
      billingStateManager.persistLastGoodState(stateToStore);
      console.log('Current state persisted as last good state');
    }
  }, [usageMetrics, currentCosts, billingHistory, pricingStructure, loading, error, validateComponentState]);

  // Attempt to restore from last good state
  const restoreFromLastGoodState = useCallback(() => {
    const lastGoodState = billingStateManager.getLastGoodState();
    
    if (lastGoodState) {
      console.log('Restoring from last good state...');
      
      setUsageMetrics(lastGoodState.usageMetrics);
      setCurrentCosts(lastGoodState.currentCosts);
      setBillingHistory(lastGoodState.billingHistory);
      setPricingStructure(lastGoodState.pricingStructure);
      
      setError({
        message: 'Showing last known data. Some information may be outdated.',
        type: 'stale-data',
        recoverable: true,
        canRetry: true,
        partialData: true
      });
      
      return true;
    }
    
    return false;
  }, []);

  // Enhanced error state creation
  const createEnhancedError = useCallback((error, context, isPartialData = false) => {
    const enhancedError = billingStateManager.createErrorState(error, context, retryCount);
    enhancedError.partialData = isPartialData;
    return enhancedError;
  }, [retryCount]);

  // Enhanced API call with retry logic and validation
  const enhancedApiCall = async (endpoint, context) => {
    return executeWithRetry(async () => {
      const response = await billingAPI[endpoint]();
      return response;
    });
  };

  // Fetch real billing data with comprehensive error handling
  const fetchBillingData = async () => {
    try {
      // Create enhanced loading state
      const loadingState = billingStateManager.createLoadingState(true, 'fetching billing data', 0);
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching billing data with enhanced error handling...');
      
      const results = {
        usage: null,
        current: null,
        history: null,
        errors: []
      };

      // Fetch usage data with validation and retry
      try {
        const usageData = await enhancedApiCall('getCurrentUsage', 'usage-metrics');
        console.log('📊 Usage data received:', usageData);
        results.usage = validateUsageResponse(usageData);
        setValidatedUsageMetrics(results.usage);
        
        // Set pricing structure from validated data
        const validatedPricing = results.usage?.pricing || {};
        setPricingStructure(validatedPricing);
      } catch (usageError) {
        console.error('Failed to fetch usage data:', usageError);
        const recoveryAction = errorRecoveryManager.handleError(usageError, 'usage-metrics');
        results.usage = recoveryAction.fallbackData;
        setUsageMetrics(recoveryAction.fallbackData);
        results.errors.push({
          type: 'usage',
          error: usageError.message,
          recoveryAction
        });
        
        // Set fallback pricing structure
        setPricingStructure({
          storage: {
            standard: { name: 'Standard Storage', price: 0.03, description: 'Frequently accessed data' },
            ia: { name: 'Infrequent Access (IA)', price: 0.018, description: 'Less frequently accessed data' },
            archive_instant: { name: 'Archive Instant Retrieval', price: 0.006, description: 'Rarely accessed, instant retrieval' },
            flexible_archive: { name: 'Flexible Archive', price: 0.005, description: 'Minutes to hours retrieval' },
            deep_archive: { name: 'Deep Archive', price: 0.002, description: 'Up to 12 hours retrieval' }
          },
          requests: {
            uploads: { name: 'Uploads & Data Management', price: 0.05, unit: '1,000 requests' },
            downloads: { name: 'Downloads & Data Retrieval', price: 0.004, unit: '1,000 requests' }
          },
          transfer: {
            out: { name: 'Data Transfer Out', price: 0.10, freeAllowance: 10, description: 'First 10 GB free monthly' }
          },
          retrieval: {
            flexible_archive: { name: 'Flexible Archive Retrieval', price: 0.04 },
            deep_archive: { name: 'Deep Archive Retrieval', price: 0.03 }
          }
        });
      }

      // Fetch current billing data with validation and retry
      try {
        console.log('💰 Fetching current billing data...');
        const currentData = await enhancedApiCall('getCurrentBilling', 'current-billing');
        console.log('💰 Current data received:', currentData);
        results.current = validateCurrentResponse(currentData);
        setValidatedCurrentCosts(results.current);
      } catch (currentError) {
        console.error('Failed to fetch current costs:', currentError);
        const recoveryAction = errorRecoveryManager.handleError(currentError, 'current-billing');
        results.current = recoveryAction.fallbackData;
        setCurrentCosts(recoveryAction.fallbackData);
        results.errors.push({
          type: 'current',
          error: currentError.message,
          recoveryAction
        });
      }

      // Fetch billing history with validation and retry
      try {
        console.log('📈 Fetching billing history...');
        const historyData = await enhancedApiCall('getBillingHistory', 'billing-history');
        console.log('📈 History data received:', historyData);
        results.history = validateHistoryResponse(historyData);
        setValidatedBillingHistory(results.history);
      } catch (historyError) {
        console.error('Failed to fetch billing history:', historyError);
        const recoveryAction = errorRecoveryManager.handleError(historyError, 'billing-history');
        results.history = recoveryAction.fallbackData;
        setBillingHistory(recoveryAction.fallbackData);
        results.errors.push({
          type: 'history',
          error: historyError.message,
          recoveryAction
        });
      }

      // Handle any errors that occurred during fetching
      if (results.errors && results.errors.length > 0) {
        console.warn('Some billing data could not be loaded:', results.errors);
        
        // Set error state if critical data is missing
        const criticalErrors = results.errors.filter(err => 
          err.type === 'usage' && !results.usage
        );
        
        if (criticalErrors.length > 0) {
          const primaryError = criticalErrors[0];
          const enhancedError = createEnhancedError(
            new Error(primaryError.error), 
            'critical-data-fetch', 
            true
          );
          setError(enhancedError);
        }
      }

      // Reset retry count on successful fetch
      setRetryCount(0);

    } catch (error) {
      console.error('Error in enhanced billing data fetch:', error);
      
      // Create enhanced error state
      const enhancedError = createEnhancedError(error, 'billing-data-fetch');
      setError(enhancedError);

      // Try to restore from last good state first
      const restored = restoreFromLastGoodState();
      
      if (!restored) {
        // Try to restore from last valid data if available
        if (lastValidData && Object.keys(lastValidData).length > 0) {
          console.log('Restoring from last valid data...');
          if (lastValidData.usageMetrics) setUsageMetrics(lastValidData.usageMetrics);
          if (lastValidData.currentCosts) setCurrentCosts(lastValidData.currentCosts);
          if (lastValidData.billingHistory) setBillingHistory(lastValidData.billingHistory);
        } else {
          // Use complete fallback data
          setUsageMetrics(DEFAULT_USAGE_METRICS);
          setCurrentCosts({ totalCost: 0, currency: 'USD', period: 'current' });
          setBillingHistory([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Retry function with backoff
  const retryFetch = async () => {
    setRetryCount(prev => prev + 1);
    await fetchBillingData();
  };

  // Validate state before each render
  useEffect(() => {
    validateComponentState();
  }, [validateComponentState]);

  // Persist good state when data is successfully loaded
  useEffect(() => {
    if (usageMetrics && !loading && !error) {
      persistCurrentState();
    }
  }, [usageMetrics, currentCosts, billingHistory, loading, error, persistCurrentState]);

  // Initial data fetch with state restoration attempt
  useEffect(() => {
    const initializeData = async () => {
      // Try to restore from last good state first
      const restored = restoreFromLastGoodState();
      
      if (restored) {
        // Still fetch fresh data in background
        setTimeout(() => {
          fetchBillingData();
        }, 100);
      } else {
        // No cached data, fetch immediately
        fetchBillingData();
      }
    };

    initializeData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Safe date formatting with fallback
  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Unknown date';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Unknown date';
    }
  };

  // Safe calculation of total usage with validation
  const calculateTotalUsage = () => {
    try {
      if (!usageMetrics || typeof usageMetrics !== 'object') return 0;
      
      const storageCost = usageMetrics.storage?.totalCost || 0;
      const requestsCost = usageMetrics.requests?.totalCost || 0;
      const transferCost = usageMetrics.transfer?.totalCost || 0;
      const retrievalCost = usageMetrics.retrieval?.totalCost || 0;
      
      // Validate all costs are numbers
      const costs = [storageCost, requestsCost, transferCost, retrievalCost];
      const validCosts = costs.filter(cost => 
        typeof cost === 'number' && !isNaN(cost) && isFinite(cost)
      );
      
      return validCosts.reduce((total, cost) => total + cost, 0);
    } catch (error) {
      console.error('Error calculating total usage:', error);
      return 0;
    }
  };

  // Safe property access helper
  const safeGet = (obj, path, defaultValue = null) => {
    try {
      return path.split('.').reduce((current, key) => {
        return current && typeof current === 'object' ? current[key] : defaultValue;
      }, obj) ?? defaultValue;
    } catch (error) {
      console.error('Safe property access error:', error);
      return defaultValue;
    }
  };

  if (loading) {
    return (
      <div className="dashboard-billing">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading billing data...</p>
        </div>
      </div>
    );
  }

  if (error && !error.partialData) {
    return (
      <div className="dashboard-billing">
        <div className="error-state">
          <h3>Unable to Load Billing Data</h3>
          <p>{error.message || 'An unexpected error occurred while loading billing data.'}</p>
          
          {error.canRetry && (
            <div className="error-actions">
              <button className="btn btn-primary" onClick={retryFetch}>
                Retry ({retryCount}/3)
              </button>
              <p className="retry-info">
                {retryCount > 0 && `Attempt ${retryCount} of 3`}
              </p>
            </div>
          )}
          
          {!error.canRetry && error.recoverable && (
            <div className="error-actions">
              <button className="btn btn-outline" onClick={() => window.location.reload()}>
                Refresh Page
              </button>
            </div>
          )}
          
          {lastValidData && Object.keys(lastValidData).length > 0 && (
            <div className="stale-data-notice">
              <p>Showing last known data. Some information may be outdated.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!usageMetrics) {
    return (
      <div className="dashboard-billing">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading usage data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-billing">
      {/* Partial Error Notification */}
      {error && error.partialData && (
        <div className="partial-error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <div className="error-text">
              <strong>Some data could not be loaded</strong>
              <p>{error.message}</p>
            </div>
            {error.canRetry && (
              <button className="btn btn-sm btn-outline" onClick={retryFetch}>
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* State Validation Warnings */}
      {stateValidation.warnings && stateValidation.warnings.length > 0 && (
        <div className="state-warning-banner">
          <div className="warning-content">
            <span className="warning-icon">ℹ️</span>
            <div className="warning-text">
              <strong>Data Quality Notice</strong>
              <ul>
                {stateValidation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
            {stateValidation.recoveryUsed && (
              <div className="recovery-notice">
                Data has been automatically recovered and may be from a previous session.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Billing Overview Header */}
      <div className="billing-header">
        <div className="current-plan-info">
          <h2>Pay-As-You-Go Billing</h2>
          <div className="plan-badge">Usage-Based</div>
          <div className="billing-cycle">
            Current month charges
            {pricingStructure && pricingStructure.margin && (
              <span className="margin-info"> • {pricingStructure.margin}% service margin</span>
            )}
          </div>
        </div>
        <div className="billing-actions">
          <button
            className="btn btn-outline"
            onClick={() => setShowPricing(!showPricing)}
          >
            <FiInfo /> View Pricing
          </button>
          <button className="btn btn-primary" onClick={fetchBillingData}>
            <FiDownload /> Refresh Data
          </button>
        </div>
      </div>

      {/* Current Costs Summary */}
      {currentCosts && (
        <div className="cost-summary">
          <h3>Cost Overview</h3>
          <div className="cost-cards">
            <div className="cost-card primary">
              <div className="cost-header">
                <FiTrendingUp />
                <span>Month to Date</span>
              </div>
              <div className="cost-amount">
                {formatCurrency(safeGet(currentCosts, 'monthToDate', 0))}
              </div>
              <div className="cost-detail">As of today</div>
            </div>
            
            <div className="cost-card">
              <div className="cost-header">
                <FiClock />
                <span>Projected Month End</span>
              </div>
              <div className="cost-amount">
                {formatCurrency(safeGet(currentCosts, 'projectedMonthEnd', 0))}
              </div>
              <div className="cost-detail">
                {safeGet(currentCosts, 'trend') === 'up' ? '↗️' : safeGet(currentCosts, 'trend') === 'down' ? '↘️' : '➡️'} 
                vs last month
              </div>
            </div>
            
            <div className="cost-card">
              <div className="cost-header">
                <FiActivity />
                <span>Last Month</span>
              </div>
              <div className="cost-amount">
                {formatCurrency(safeGet(currentCosts, 'lastMonth', 0))}
              </div>
              <div className="cost-detail">Previous billing cycle</div>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Structure Modal */}
      {showPricing && pricingStructure && (
        <div className="pricing-modal">
          <div className="pricing-content">
            <div className="pricing-header">
              <h3>SkyCrate Pay-As-You-Go Pricing</h3>
              {pricingStructure.margin && (
                <div className="margin-notice">
                  Includes {pricingStructure.margin}% service margin over AWS costs
                </div>
              )}
              <button
                className="close-btn"
                onClick={() => setShowPricing(false)}
              >×</button>
            </div>
            
            <div className="pricing-sections">
              <div className="pricing-section">
                <h4><FiBox /> Storage Costs (per GB/month)</h4>
                {Object.entries(pricingStructure?.storage || {}).map(([key, storage]) => (
                  <div key={key} className="pricing-item">
                    <div className="pricing-name">
                      <strong>{safeGet(storage, 'name', key)}</strong>
                      <span className="pricing-desc">{safeGet(storage, 'description', '')}</span>
                    </div>
                    <div className="pricing-price">{formatCurrency(safeGet(storage, 'price', 0))}</div>
                  </div>
                ))}
              </div>

              <div className="pricing-section">
                <h4><FiUpload /> Request Costs</h4>
                {Object.entries(pricingStructure?.requests || {}).map(([key, request]) => (
                  <div key={key} className="pricing-item">
                    <div className="pricing-name">
                      <strong>{safeGet(request, 'name', key)}</strong>
                    </div>
                    <div className="pricing-price">{formatCurrency(safeGet(request, 'price', 0))} per {safeGet(request, 'unit', 'unit')}</div>
                  </div>
                ))}
              </div>

              <div className="pricing-section">
                <h4><FiGlobe /> Data Transfer</h4>
                <div className="pricing-item">
                  <div className="pricing-name">
                    <strong>Data Transfer Out</strong>
                    <span className="pricing-desc">First 10 GB free monthly</span>
                  </div>
                  <div className="pricing-price">{formatCurrency(safeGet(pricingStructure, 'transfer.out.price', 0))} per GB</div>
                </div>
              </div>

              <div className="pricing-section">
                <h4><FiArchive /> Archive Retrieval</h4>
                {Object.entries(pricingStructure?.retrieval || {}).map(([key, retrieval]) => (
                  <div key={key} className="pricing-item">
                    <div className="pricing-name">
                      <strong>{safeGet(retrieval, 'name', key)}</strong>
                    </div>
                    <div className="pricing-price">{formatCurrency(safeGet(retrieval, 'price', 0))} per GB</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Usage Breakdown */}
      {usageMetrics && (
        <div className="usage-breakdown">
          <h3>Current Month Usage</h3>
          
          {/* Storage Usage */}
          <div className="usage-category">
            <div className="category-header">
              <FiDatabase />
              <div className="category-info">
                <h4>Storage by Class</h4>
                <span className="category-total">
                  {formatStorageSize(safeGet(usageMetrics, 'storage.totalUsed', 0))} • {formatCurrency(safeGet(usageMetrics, 'storage.totalCost', 0))}
                </span>
              </div>
            </div>
            <div className="usage-items">
              {Object.entries(safeGet(usageMetrics, 'storage.classes', {})).map(([key, storage]) => {
                // Map storage class keys to pricing structure
                const storageClassMap = {
                  'STANDARD': 'standard',
                  'STANDARD_IA': 'ia',
                  'GLACIER_IR': 'archive_instant',
                  'GLACIER': 'flexible_archive',
                  'DEEP_ARCHIVE': 'deep_archive'
                };
                
                const pricingKey = storageClassMap[key] || key.toLowerCase();
                const storageInfo = safeGet(pricingStructure, `storage.${pricingKey}`, {
                  name: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                });
                
                return (
                  <div key={key} className="usage-item">
                    <div className="usage-details">
                      <span className="usage-name">{safeGet(storageInfo, 'name', key)}</span>
                      <span className="usage-amount">{formatStorageSize(safeGet(storage, 'used', 0))}</span>
                    </div>
                    <div className="usage-cost">{formatCurrency(safeGet(storage, 'cost', 0))}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Request Usage */}
          <div className="usage-category">
            <div className="category-header">
              <FiActivity />
              <div className="category-info">
                <h4>API Requests</h4>
                <span className="category-total">
                  {formatNumber((safeGet(usageMetrics, 'requests.uploads.count', 0) + safeGet(usageMetrics, 'requests.downloads.count', 0)))} requests • {formatCurrency(safeGet(usageMetrics, 'requests.totalCost', 0))}
                </span>
              </div>
            </div>
            <div className="usage-items">
              <div className="usage-item">
                <div className="usage-details">
                  <span className="usage-name">Uploads & Management</span>
                  <span className="usage-amount">{formatNumber(safeGet(usageMetrics, 'requests.uploads.count', 0))} requests</span>
                </div>
                <div className="usage-cost">{formatCurrency(safeGet(usageMetrics, 'requests.uploads.cost', 0))}</div>
              </div>
              <div className="usage-item">
                <div className="usage-details">
                  <span className="usage-name">Downloads & Retrieval</span>
                  <span className="usage-amount">{formatNumber(safeGet(usageMetrics, 'requests.downloads.count', 0))} requests</span>
                </div>
                <div className="usage-cost">{formatCurrency(safeGet(usageMetrics, 'requests.downloads.cost', 0))}</div>
              </div>
            </div>
          </div>

          {/* Data Transfer */}
          <div className="usage-category">
            <div className="category-header">
              <FiGlobe />
              <div className="category-info">
                <h4>Data Transfer Out</h4>
                <span className="category-total">
                  {formatStorageSize(safeGet(usageMetrics, 'transfer.out.amount', 0))} • {formatCurrency(safeGet(usageMetrics, 'transfer.totalCost', 0))}
                </span>
              </div>
            </div>
            <div className="usage-items">
              <div className="usage-item">
                <div className="usage-details">
                  <span className="usage-name">Free Allowance Used</span>
                  <span className="usage-amount">{formatStorageSize(0)} of 10 GB</span>
                </div>
                <div className="usage-cost">{formatCurrency(0)}</div>
              </div>
              <div className="usage-item">
                <div className="usage-details">
                  <span className="usage-name">Billable Transfer</span>
                  <span className="usage-amount">{formatStorageSize(safeGet(usageMetrics, 'transfer.out.amount', 0))}</span>
                </div>
                <div className="usage-cost">{formatCurrency(safeGet(usageMetrics, 'transfer.out.cost', 0))}</div>
              </div>
            </div>
          </div>

          {/* Archive Retrieval */}
          <div className="usage-category">
            <div className="category-header">
              <FiArchive />
              <div className="category-info">
                <h4>Archive Retrieval</h4>
                <span className="category-total">
                  {formatStorageSize(safeGet(usageMetrics, 'retrieval.flexible_archive.amount', 0) + safeGet(usageMetrics, 'retrieval.deep_archive.amount', 0))} • {formatCurrency(safeGet(usageMetrics, 'retrieval.totalCost', 0))}
                </span>
              </div>
            </div>
            <div className="usage-items">
              <div className="usage-item">
                <div className="usage-details">
                  <span className="usage-name">Flexible Archive</span>
                  <span className="usage-amount">{formatStorageSize(safeGet(usageMetrics, 'retrieval.flexible_archive.amount', 0))}</span>
                </div>
                <div className="usage-cost">{formatCurrency(safeGet(usageMetrics, 'retrieval.flexible_archive.cost', 0))}</div>
              </div>
              <div className="usage-item">
                <div className="usage-details">
                  <span className="usage-name">Deep Archive</span>
                  <span className="usage-amount">{formatStorageSize(safeGet(usageMetrics, 'retrieval.deep_archive.amount', 0))}</span>
                </div>
                <div className="usage-cost">{formatCurrency(safeGet(usageMetrics, 'retrieval.deep_archive.cost', 0))}</div>
              </div>
            </div>
          </div>

          {/* Total Usage */}
          <div className="usage-total">
            <div className="total-label">Total Current Month Usage</div>
            <div className="total-amount">{formatCurrency(calculateTotalUsage())}</div>
          </div>
        </div>
      )}

      {/* Billing History */}
      <div className="billing-history">
        <h3>Billing History</h3>
        <div className="history-table">
          <div className="table-header">
            <div>Period</div>
            <div>Storage</div>
            <div>Requests</div>
            <div>Transfer</div>
            <div>Retrieval</div>
            <div>Total</div>
            <div>Status</div>
            <div>Actions</div>
          </div>
          {billingHistory.map((bill, index) => (
            <div key={safeGet(bill, 'id', index)} className="table-row">
              <div>
                <strong>{safeGet(bill, 'period', 'Unknown')}</strong>
                <div className="bill-date">{formatDate(safeGet(bill, 'date'))}</div>
              </div>
              <div>{formatCurrency(safeGet(bill, 'breakdown.storage', 0))}</div>
              <div>{formatCurrency(safeGet(bill, 'breakdown.requests', 0))}</div>
              <div>{formatCurrency(safeGet(bill, 'breakdown.transfer', 0))}</div>
              <div>{formatCurrency(safeGet(bill, 'breakdown.retrieval', 0))}</div>
              <div><strong>{formatCurrency(safeGet(bill, 'total', 0))}</strong></div>
              <div>
                <span className={`status-badge ${safeGet(bill, 'status', 'unknown')}`}>
                  {safeGet(bill, 'status', 'Unknown')}
                </span>
              </div>
              <div>
                <button className="btn btn-icon" title="Download Invoice">
                  <FiDownload />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost Optimization Tips */}
      <div className="cost-tips">
        <h3>Cost Optimization Tips</h3>
        <div className="tips-grid">
          <div className="tip-card">
            <FiDatabase />
            <h4>Optimize Storage Classes</h4>
            <p>Move infrequently accessed files to Archive storage classes to save up to 92% on storage costs.</p>
          </div>
          <div className="tip-card">
            <FiArchive />
            <h4>Archive Old Files</h4>
            <p>Use Deep Archive for files accessed once or twice per year to minimize long-term storage costs.</p>
          </div>
          <div className="tip-card">
            <FiGlobe />
            <h4>Monitor Data Transfer</h4>
            <p>Keep track of your data transfer usage to avoid unexpected charges beyond the 10 GB free tier.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrapped component with error boundary
const DashboardBillingWithErrorBoundary = () => (
  <BillingErrorBoundary>
    <DashboardBilling />
  </BillingErrorBoundary>
);

export default DashboardBillingWithErrorBoundary;
