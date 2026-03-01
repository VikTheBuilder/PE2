import React, { useState, useEffect, useCallback } from 'react';
import {
  FiServer, FiPlay, FiSquare, FiTrash2, FiPlus, FiCpu,
  FiHardDrive, FiGlobe, FiClock, FiRefreshCw, FiAlertCircle
} from 'react-icons/fi';
import { computeAPI } from '../services/api';
import './ComputeManager.css';

function ComputeManager() {
  const [instances, setInstances] = useState([]);
  const [selectedInstances, setSelectedInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [terminatingId, setTerminatingId] = useState(null);
  const [error, setError] = useState('');

  // ── Fetch instances ──────────────────────────────
  const fetchInstances = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setError('');

      const data = await computeAPI.fetchInstances();
      setInstances(data.instances || []);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to load instances';
      setError(msg);
      console.error('Fetch instances error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  // ── Launch ───────────────────────────────────────
  const handleLaunch = async () => {
    const name = window.prompt('Enter a name for the new instance:', `instance-${Date.now()}`);
    if (!name) return;

    try {
      setLaunching(true);
      setError('');
      await computeAPI.launchInstance(name.trim());
      await fetchInstances(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to launch instance';
      setError(msg);
    } finally {
      setLaunching(false);
    }
  };

  // ── Terminate ────────────────────────────────────
  const handleTerminate = async (instanceId) => {
    if (!window.confirm(`Terminate instance ${instanceId}? This cannot be undone.`)) return;

    try {
      setTerminatingId(instanceId);
      setError('');
      await computeAPI.terminateInstance(instanceId);
      setSelectedInstances((prev) => prev.filter((x) => x !== instanceId));
      await fetchInstances(true);
    } catch (err) {
      const status = err.response?.status;
      const msg =
        status === 403
          ? 'Access denied — this instance does not belong to your account.'
          : err.response?.data?.error || 'Failed to terminate instance';
      setError(msg);
    } finally {
      setTerminatingId(null);
    }
  };

  // ── Helpers ──────────────────────────────────────
  const getStateBadge = (stateObj) => {
    const state = typeof stateObj === 'string' ? stateObj : stateObj?.Name || 'unknown';
    const map = {
      running: { label: 'Running', cls: 'state-running' },
      stopped: { label: 'Stopped', cls: 'state-stopped' },
      pending: { label: 'Pending', cls: 'state-pending' },
      terminated: { label: 'Terminated', cls: 'state-terminated' },
      'shutting-down': { label: 'Shutting Down', cls: 'state-terminated' },
      stopping: { label: 'Stopping', cls: 'state-pending' },
    };
    const s = map[state] || { label: state, cls: '' };
    return <span className={`compute-state-badge ${s.cls}`}>{s.label}</span>;
  };

  const getTagValue = (tags, key) =>
    (tags || []).find((t) => t.Key === key)?.Value || '—';

  const getInstanceId = (inst) => inst.InstanceId || inst.id;
  const getInstanceName = (inst) => getTagValue(inst.Tags, 'Name') || inst.name || '—';
  const getInstanceType = (inst) => inst.InstanceType || inst.type || 't2.micro';
  const getPublicIp = (inst) => inst.PublicIpAddress || inst.publicIp || '—';
  const getState = (inst) => {
    if (typeof inst.State === 'object') return inst.State?.Name || 'unknown';
    return inst.state || inst.State || 'unknown';
  };
  const getLaunchTime = (inst) => inst.LaunchTime || inst.launchTime || null;

  const toggleSelect = (id) => {
    setSelectedInstances((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const timeSince = (iso) => {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    const hrs = Math.floor(diff / 3600000);
    return hrs > 0 ? `${hrs}h ago` : 'just now';
  };

  // ── Computed stats ───────────────────────────────
  const runningCount = instances.filter((i) => getState(i) === 'running').length;
  const stoppedCount = instances.filter((i) => getState(i) === 'stopped').length;

  // ── Loading skeleton ─────────────────────────────
  if (loading) {
    return (
      <div className="compute-page">
        <div className="compute-header">
          <div className="compute-header-left">
            <FiServer className="compute-header-icon" />
            <div>
              <h1>Compute Manager</h1>
              <p className="compute-subtitle">EC2 Instance Management</p>
            </div>
          </div>
        </div>
        <div className="compute-loading">
          <div className="loading-spinner" />
          <p>Loading instances…</p>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────
  return (
    <div className="compute-page">
      {/* Header */}
      <div className="compute-header">
        <div className="compute-header-left">
          <FiServer className="compute-header-icon" />
          <div>
            <h1>Compute Manager</h1>
            <p className="compute-subtitle">EC2 Instance Management</p>
          </div>
        </div>
        <div className="compute-header-actions">
          <button
            className={`btn btn-secondary btn-sm ${refreshing ? 'spinning' : ''}`}
            onClick={() => fetchInstances(true)}
            disabled={refreshing}
            title="Refresh"
          >
            <FiRefreshCw /> {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleLaunch}
            disabled={launching}
          >
            <FiPlus /> {launching ? 'Launching…' : 'Launch Instance'}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="compute-error-banner">
          <FiAlertCircle />
          <span>{error}</span>
          <button className="btn-dismiss" onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Stats Row */}
      <div className="compute-stats-row">
        <div className="compute-stat-card">
          <FiServer className="stat-icon" />
          <div>
            <span className="stat-value">{instances.length}</span>
            <span className="stat-label">Total Instances</span>
          </div>
        </div>
        <div className="compute-stat-card">
          <FiPlay className="stat-icon running-icon" />
          <div>
            <span className="stat-value">{runningCount}</span>
            <span className="stat-label">Running</span>
          </div>
        </div>
        <div className="compute-stat-card">
          <FiSquare className="stat-icon stopped-icon" />
          <div>
            <span className="stat-value">{stoppedCount}</span>
            <span className="stat-label">Stopped</span>
          </div>
        </div>
        <div className="compute-stat-card">
          <FiCpu className="stat-icon" />
          <div>
            <span className="stat-value">{instances.length}</span>
            <span className="stat-label">Allocated</span>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedInstances.length > 0 && (
        <div className="compute-bulk-bar">
          <span>{selectedInstances.length} selected</span>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => selectedInstances.forEach((id) => handleTerminate(id))}
          >
            <FiTrash2 /> Terminate Selected
          </button>
        </div>
      )}

      {/* Instance List */}
      <div className="compute-instances">
        {instances.length === 0 ? (
          <div className="compute-empty-state">
            <FiServer className="empty-icon" />
            <h3>No Instances</h3>
            <p>Launch your first EC2 instance to get started.</p>
            <button className="btn btn-primary btn-sm" onClick={handleLaunch} disabled={launching}>
              <FiPlus /> Launch Instance
            </button>
          </div>
        ) : (
          instances.map((inst) => {
            const id = getInstanceId(inst);
            const state = getState(inst);
            const isTerminating = terminatingId === id;
            return (
              <div
                key={id}
                className={`compute-instance-card ${selectedInstances.includes(id) ? 'selected' : ''} ${isTerminating ? 'terminating' : ''}`}
              >
                <div className="instance-select">
                  <input
                    type="checkbox"
                    checked={selectedInstances.includes(id)}
                    onChange={() => toggleSelect(id)}
                  />
                </div>

                <div className="instance-info-main">
                  <div className="instance-name-row">
                    <span className="instance-name">{getInstanceName(inst)}</span>
                    {getStateBadge(inst.State || state)}
                  </div>
                  <span className="instance-id">{id}</span>
                </div>

                <div className="instance-specs">
                  <div className="spec-item">
                    <FiCpu size={14} />
                    <span>{getInstanceType(inst)}</span>
                  </div>
                  <div className="spec-item">
                    <FiGlobe size={14} />
                    <span>{getPublicIp(inst)}</span>
                  </div>
                  <div className="spec-item">
                    <FiClock size={14} />
                    <span>{timeSince(getLaunchTime(inst))}</span>
                  </div>
                </div>

                <div className="instance-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    title="Terminate instance"
                    onClick={() => handleTerminate(id)}
                    disabled={isTerminating || state === 'terminated' || state === 'shutting-down'}
                  >
                    {isTerminating ? <FiRefreshCw className="spin" /> : <FiTrash2 />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ComputeManager;
