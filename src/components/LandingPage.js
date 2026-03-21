import React from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiSun,
  FiMoon,
  FiPlay,
} from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import './LandingPage.css';

const LandingPage = () => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <div className="landing-page">
      {/* Ambient Background Effects */}
      <div className="aurora-ambient">
        <div className="aurora-blob aurora-blob-purple" />
        <div className="aurora-blob aurora-blob-teal" />
      </div>

      {/* Navigation */}
      <header className="landing-nav">
        <div className="nav-inner">
          <Link to="/" className="nav-logo">
            <span className="nav-logo-icon">☁</span>
            <span className="nav-logo-text">Vaultify</span>
          </Link>
          <nav className="nav-links">
            <a href="#features">Products</a>
            <a href="#features">Solutions</a>
            <a href="#stats">Pricing</a>
            <a href="#cta">Docs</a>
          </nav>
          <div className="nav-actions">
            <button className="nav-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {isDark ? <FiSun /> : <FiMoon />}
            </button>
            <Link to="/login" className="nav-btn-secondary">Log In</Link>
            <Link to="/register" className="nav-btn-primary">Launch Console</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              <span>v2.0 Aurora Live</span>
            </div>
            <h1 className="hero-title">
              Infinite Storage. <br />
              <span className="hero-title-gradient">Zero Gravity.</span>
            </h1>
            <p className="hero-desc">
              Manage your cloud compute and storage clusters with the precision of Vaultify. Scalable, secure, and spectacularly fast.
            </p>
            <div className="hero-buttons">
              <Link to="/register" className="hero-btn-primary">
                Start Building <FiArrowRight />
              </Link>
              <button className="hero-btn-secondary">
                <FiPlay className="hero-play-icon" /> Watch Demo
              </button>
            </div>
            <div className="hero-trust">
              <div className="hero-avatars">
                <div className="hero-avatar" />
                <div className="hero-avatar" />
                <div className="hero-avatar" />
              </div>
              <p>Trusted by 10,000+ developers</p>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="hero-visual">
            <div className="hero-visual-bg" />
            <div className="hero-floating-card">
              <div className="floating-card-header">
                <div className="floating-card-label">
                  <span className="floating-icon">⬡</span>
                  <span className="floating-mono">cluster-us-east-1</span>
                </div>
                <span className="floating-status">OPERATIONAL</span>
              </div>
              <div className="floating-metrics">
                <div className="floating-metric">
                  <div className="metric-row"><span>CPU Usage</span><span>42%</span></div>
                  <div className="metric-bar"><div className="metric-fill green" style={{ width: '42%' }} /></div>
                </div>
                <div className="floating-metric">
                  <div className="metric-row"><span>Memory</span><span>12.4 GB / 32 GB</span></div>
                  <div className="metric-bar"><div className="metric-fill blue" style={{ width: '38%' }} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo Strip */}
      <div className="logo-strip">
        <p className="logo-strip-label">Powering next-gen tech</p>
        <div className="logo-strip-logos">
          <span>◆ ACME Corp</span>
          <span>🚀 StarSystem</span>
          <span>⬡ BlockChainz</span>
          <span>⚡ EnergyX</span>
          <span>💧 FlowState</span>
        </div>
      </div>

      {/* Features Grid */}
      <section className="features-section" id="features">
        <div className="features-header">
          <h2>The Aurora Architecture</h2>
          <p>Engineered for speed. Experience the next generation of cloud infrastructure with our global edge network.</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon green">🌐</div>
            <h3>Global Edge Network</h3>
            <p>Deploy your data to 35+ regions instantly with our low-latency edge network. We route traffic to the nearest node automatically.</p>
            <a href="#" className="feature-link green">View Map <FiArrowRight /></a>
          </div>
          <div className="feature-card">
            <div className="feature-icon teal">⚡</div>
            <h3>Instant Snapshots</h3>
            <p>Capture the state of your entire infrastructure in milliseconds. Rollback or fork your database with zero downtime.</p>
            <a href="#" className="feature-link teal">Learn more <FiArrowRight /></a>
          </div>
          <div className="feature-card">
            <div className="feature-icon purple">📦</div>
            <h3>S3 Compatible</h3>
            <p>Seamlessly integrate with your existing tools using our S3-compatible API. Drop-in replacement for your current storage.</p>
            <a href="#" className="feature-link purple">Read Docs <FiArrowRight /></a>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section" id="stats">
        <div className="stats-inner">
          <div className="stats-content">
            <h2>Built for scale,<br />designed for reliability.</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number green">99.99%</span>
                <span className="stat-label">Uptime SLA Guarantee</span>
              </div>
              <div className="stat-item">
                <span className="stat-number teal">&lt;50ms</span>
                <span className="stat-label">Global Latency</span>
              </div>
              <div className="stat-item">
                <span className="stat-number purple">12TB+</span>
                <span className="stat-label">Daily Data Ingest</span>
              </div>
              <div className="stat-item">
                <span className="stat-number white">24/7</span>
                <span className="stat-label">Expert Support</span>
              </div>
            </div>
            <a href="#" className="stats-link">Check System Status ↗</a>
          </div>
          <div className="stats-visual">
            <div className="stats-globe" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section" id="cta">
        <div className="cta-card">
          <div className="cta-glow green-glow" />
          <div className="cta-glow purple-glow" />
          <div className="cta-content">
            <h2>Start free, scale indefinitely.</h2>
            <p>Join thousands of developers building the future on Vaultify. No credit card required for the hobby tier.</p>
            <div className="cta-buttons">
              <Link to="/register" className="cta-btn-primary">Create Free Account</Link>
              <button className="cta-btn-secondary">Contact Sales</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo">
                <span>☁</span>
                <span>Vaultify</span>
              </div>
              <p>The developer-first cloud platform designed for performance, reliability, and ease of use.</p>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <ul><li><a href="#">Compute</a></li><li><a href="#">Storage</a></li><li><a href="#">Networking</a></li><li><a href="#">Databases</a></li></ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul><li><a href="#">About</a></li><li><a href="#">Blog</a></li><li><a href="#">Careers</a></li><li><a href="#">Contact</a></li></ul>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <ul><li><a href="#">Privacy</a></li><li><a href="#">Terms</a></li><li><a href="#">Status</a></li></ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} Vaultify Inc. All rights reserved.</p>
            <div className="footer-status">
              <span className="status-dot" />
              <span>All Systems Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;