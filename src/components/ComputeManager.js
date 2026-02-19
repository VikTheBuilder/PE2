import React, { useState } from 'react';
import { FiServer, FiPlay, FiSquare, FiTrash2, FiPlus, FiCpu, FiHardDrive, FiGlobe, FiClock, FiRefreshCw } from 'react-icons/fi';
import './ComputeManager.css';

const MOCK_INSTANCES = [
  {
    id: 'i-0a1b2c3d4e5f60001',
    name: 'prod-web-server',
    type: 't3.medium',
    state: 'running',
    publicIp: '54.210.123.45',
    privateIp: '10.0.1.15',
    launchTime: '2025-12-15T08:30:00Z',
    az: 'us-east-1a',
    vcpus: 2,
    memory: '4 GiB',
    storage: '20 GB EBS',
  },
  {
    id: 'i-0a1b2c3d4e5f60002',
    name: 'staging-api',
    type: 't3.small',
    state: 'stopped',
    publicIp: '—',
    privateIp: '10.0.2.22',
    launchTime: '2026-01-03T14:12:00Z',
    az: 'us-east-1b',
    vcpus: 2,
    memory: '2 GiB',
    storage: '10 GB EBS',
  },
  {
    id: 'i-0a1b2c3d4e5f60003',
    name: 'ml-training-node',
    type: 'p3.2xlarge',
    state: 'running',
    publicIp: '3.92.54.77',
    privateIp: '10.0.3.8',
    launchTime: '2026-02-10T20:45:00Z',
    az: 'us-east-1c',
    vcpus: 8,
    memory: '61 GiB',
    storage: '100 GB EBS',
  },
  {
    id: 'i-0a1b2c3d4e5f60004',
    name: 'dev-sandbox',
    type: 't3.micro',
    state: 'pending',
    publicIp: '—',
    privateIp: '10.0.1.42',
    launchTime: '2026-02-19T12:00:00Z',
    az: 'us-east-1a',
    vcpus: 2,
    memory: '1 GiB',
    storage: '8 GB EBS',
  },
];

function ComputeManager() {
  const [instances] = useState(MOCK_INSTANCES);
  const [selectedInstances, setSelectedInstances] = useState([]);

  const getStateBadge = (state) => {
    const map = {
      running:    { label: 'Running',    cls: 'state-running' },
      stopped:    { label: 'Stopped',    cls: 'state-stopped' },
      pending:    { label: 'Pending',    cls: 'state-pending' },
      terminated: { label: 'Terminated', cls: 'state-terminated' },
    };
    const s = map[state] || { label: state, cls: '' };
    return <span className={`compute-state-badge ${s.cls}`}>{s.label}</span>;
  };

  const toggleSelect = (id) => {
    setSelectedInstances((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const timeSince = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    const hrs = Math.floor(diff / 3600000);
    return hrs > 0 ? `${hrs}h ago` : 'just now';
  };

  const runningCount  = instances.filter((i) => i.state === 'running').length;
  const stoppedCount  = instances.filter((i) => i.state === 'stopped').length;
  const totalVcpus    = instances.reduce((s, i) => s + i.vcpus, 0);

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
          <button className="btn btn-secondary btn-sm" title="Refresh">
            <FiRefreshCw /> Refresh
          </button>
          <button className="btn btn-primary btn-sm">
            <FiPlus /> Launch Instance
          </button>
        </div>
      </div>

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
            <span className="stat-value">{totalVcpus}</span>
            <span className="stat-label">Total vCPUs</span>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedInstances.length > 0 && (
        <div className="compute-bulk-bar">
          <span>{selectedInstances.length} selected</span>
          <button className="btn btn-outline btn-sm"><FiPlay /> Start</button>
          <button className="btn btn-outline btn-sm"><FiSquare /> Stop</button>
          <button className="btn btn-danger btn-sm"><FiTrash2 /> Terminate</button>
        </div>
      )}

      {/* Instance List */}
      <div className="compute-instances">
        {instances.map((inst) => (
          <div
            key={inst.id}
            className={`compute-instance-card ${selectedInstances.includes(inst.id) ? 'selected' : ''}`}
          >
            <div className="instance-select">
              <input
                type="checkbox"
                checked={selectedInstances.includes(inst.id)}
                onChange={() => toggleSelect(inst.id)}
              />
            </div>

            <div className="instance-info-main">
              <div className="instance-name-row">
                <span className="instance-name">{inst.name}</span>
                {getStateBadge(inst.state)}
              </div>
              <span className="instance-id">{inst.id}</span>
            </div>

            <div className="instance-specs">
              <div className="spec-item">
                <FiCpu size={14} />
                <span>{inst.type}</span>
              </div>
              <div className="spec-item">
                <FiHardDrive size={14} />
                <span>{inst.memory} — {inst.storage}</span>
              </div>
              <div className="spec-item">
                <FiGlobe size={14} />
                <span>{inst.publicIp}</span>
              </div>
              <div className="spec-item">
                <FiClock size={14} />
                <span>{timeSince(inst.launchTime)}</span>
              </div>
            </div>

            <div className="instance-actions">
              {inst.state === 'running' ? (
                <button className="btn btn-outline btn-sm" title="Stop instance">
                  <FiSquare />
                </button>
              ) : inst.state === 'stopped' ? (
                <button className="btn btn-outline btn-sm" title="Start instance">
                  <FiPlay />
                </button>
              ) : null}
              <button className="btn btn-ghost btn-sm" title="Terminate instance">
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="compute-placeholder-note">
        <FiServer />
        <span>Connect your AWS credentials to manage live EC2 instances.</span>
      </div>
    </div>
  );
}

export default ComputeManager;
