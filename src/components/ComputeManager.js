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

  // ── Mock system logs ─────────────────────────────
  const systemLogs = [
    { level: 'INFO', msg: `Instance i-${Math.random().toString(36).substr(2, 12)} started successfully`, time: new Date().toISOString().replace('T', ' ').substr(0, 19) },
    { level: 'WARN', msg: `High CPU usage on instance i-${Math.random().toString(36).substr(2, 12)} (92%)`, time: new Date(Date.now() - 60000).toISOString().replace('T', ' ').substr(0, 19) },
    { level: 'ERROR', msg: `Failed to attach volume vol-${Math.random().toString(36).substr(2, 8)}: timeout`, time: new Date(Date.now() - 120000).toISOString().replace('T', ' ').substr(0, 19) },
    { level: 'INFO', msg: `User 'admin' initiated 'Reboot' on db-cluster-prod`, time: new Date(Date.now() - 180000).toISOString().replace('T', ' ').substr(0, 19) },
    { level: 'INFO', msg: `Security policy 'Strict-v4' updated on firewall`, time: new Date(Date.now() - 300000).toISOString().replace('T', ' ').substr(0, 19) },
  ];

  const healthPercent = 98;

  // ── Main render ──────────────────────────────────
  return (
    <div className="compute-page">
      {/* Title */}
      <div className="compute-title-block">
        <h1 className="compute-main-title">Compute Manager</h1>
        <p className="compute-main-sub">Real-Time Instance Orchestration</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="compute-error-banner">
          <FiAlertCircle />
          <span>{error}</span>
          <button className="btn-dismiss" onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Stats Row — large number cards */}
      <div className="compute-stats-row">
        <div className="compute-stat-card stat-running">
          <div className="stat-card-top">
            <span className="stat-card-label">RUNNING</span>
            <FiPlay className="stat-card-icon" />
          </div>
          <span className="stat-big-number">{String(runningCount).padStart(2, '0')}</span>
          <div className="stat-bar-track"><div className="stat-bar-fill running-fill" style={{ width: instances.length ? `${(runningCount / Math.max(instances.length, 1)) * 100}%` : '0%' }} /></div>
        </div>
        <div className="compute-stat-card stat-stopped">
          <div className="stat-card-top">
            <span className="stat-card-label">STOPPED</span>
            <FiSquare className="stat-card-icon" />
          </div>
          <span className="stat-big-number">{String(stoppedCount).padStart(2, '0')}</span>
          <div className="stat-bar-track"><div className="stat-bar-fill stopped-fill" style={{ width: instances.length ? `${(stoppedCount / Math.max(instances.length, 1)) * 100}%` : '0%' }} /></div>
        </div>
        <div className="compute-stat-card stat-total">
          <div className="stat-card-top">
            <span className="stat-card-label">TOTAL INSTANCES</span>
            <FiServer className="stat-card-icon" />
          </div>
          <span className="stat-big-number">{String(instances.length).padStart(2, '0')}</span>
          <div className="stat-bar-track"><div className="stat-bar-fill total-fill" style={{ width: '100%' }} /></div>
        </div>
      </div>

      {/* Two‑column layout: Instance List (left) & System panels (right) */}
      <div className="compute-two-col">
        {/* Left: Instance List */}
        <div className="compute-left-col">
          <div className="instance-list-card">
            <div className="instance-list-header">
              <h2><FiServer size={18} /> Instance List</h2>
              <div className="instance-list-actions">
                <button
                  className={`btn btn-secondary btn-sm ${refreshing ? 'spinning' : ''}`}
                  onClick={() => fetchInstances(true)}
                  disabled={refreshing}
                >
                  <FiRefreshCw /> Refresh
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleLaunch} disabled={launching}>
                  <FiPlus /> Launch Instance
                </button>
              </div>
            </div>

            {/* Bulk */}
            {selectedInstances.length > 0 && (
              <div className="compute-bulk-bar">
                <span>{selectedInstances.length} selected</span>
                <button className="btn btn-danger btn-sm" onClick={() => selectedInstances.forEach(id => handleTerminate(id))}>
                  <FiTrash2 /> Terminate Selected
                </button>
              </div>
            )}

            {/* Table */}
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
              <div className="instance-table">
                <div className="table-head">
                  <span>INSTANCE NAME</span>
                  <span>STATUS</span>
                  <span>TYPE</span>
                  <span>REGION</span>
                  <span>IP ADDRESS</span>
                  <span>ACTIONS</span>
                </div>
                {instances.map((inst) => {
                  const id = getInstanceId(inst);
                  const state = getState(inst);
                  const isTerminating = terminatingId === id;
                  return (
                    <div key={id} className={`table-row ${selectedInstances.includes(id) ? 'selected' : ''}`}>
                      <span className="cell-name">
                        <input type="checkbox" checked={selectedInstances.includes(id)} onChange={() => toggleSelect(id)} />
                        <span>{getInstanceName(inst)}</span>
                      </span>
                      <span className="cell-status">{getStateBadge(inst.State || state)}</span>
                      <span className="cell-mono">{getInstanceType(inst)}</span>
                      <span className="cell-mono">{inst.Placement?.AvailabilityZone || '—'}</span>
                      <span className="cell-mono">{getPublicIp(inst)}</span>
                      <span className="cell-actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Terminate"
                          onClick={() => handleTerminate(id)}
                          disabled={isTerminating || state === 'terminated' || state === 'shutting-down'}
                        >
                          {isTerminating ? <FiRefreshCw className="spin" /> : <FiTrash2 />}
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Launch New Instance CTA */}
          <div className="launch-cta-card">
            <div className="launch-cta-icon">🚀</div>
            <h3>Launch New Instance</h3>
            <p>Spin up highly optimized compute resources in seconds</p>
            <div className="launch-cta-bar"><div className="launch-cta-progress" /></div>
          </div>
        </div>

        {/* Right: System Health + Logs */}
        <div className="compute-right-col">
          {/* System Health Gauge */}
          <div className="system-health-card">
            <div className="health-header">
              <h3>⚡ System Health</h3>
              <span className="health-live-dot" />
            </div>
            <div className="health-gauge">
              <svg viewBox="0 0 120 120" className="gauge-svg">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(45, 212, 191, 0.10)" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke="url(#gaugeGrad)" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(healthPercent / 100) * 327} 327`}
                  transform="rotate(-90 60 60)"
                />
                <defs>
                  <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#2DD4BF" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="gauge-center">
                <span className="gauge-value">{healthPercent}%</span>
                <span className="gauge-label">STATUS: OPTIMAL</span>
              </div>
            </div>
            <div className="health-metrics">
              <div className="health-metric">
                <span>CPU LOAD</span>
                <div className="metric-bar"><div className="metric-fill" style={{ width: '12%', background: '#2DD4BF' }} /><span>12%</span></div>
              </div>
              <div className="health-metric">
                <span>MEMORY USAGE</span>
                <div className="metric-bar"><div className="metric-fill" style={{ width: '42%', background: '#3B82F6' }} /><span>4.2GB</span></div>
              </div>
            </div>
          </div>

          {/* System Logs */}
          <div className="system-logs-card">
            <div className="logs-header">
              <h3>System Logs</h3>
              <span className="logs-live"><span className="live-dot" /> LIVE</span>
            </div>
            <div className="logs-list">
              {systemLogs.map((log, i) => (
                <div key={i} className={`log-entry log-${log.level.toLowerCase()}`}>
                  <span className="log-level">{log.level}:</span>
                  <span className="log-msg">{log.msg}</span>
                  <span className="log-time">{log.time}</span>
                </div>
              ))}
            </div>
            <div className="logs-search">
              <FiServer size={14} />
              <input type="text" placeholder="Search logs..." readOnly />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="compute-footer">
        VAULTIFY CLOUD SERVICES © {new Date().getFullYear()} | POWERED BY AURORA ENGINE
      </div>
    </div>
  );
}

export default ComputeManager;
