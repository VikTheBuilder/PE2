import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiCloud } from 'react-icons/fi';
import { authAPI } from '../services/api';
import './Auth.css';
import '../styles/animations.css';
import LoadingScreen from './LoadingScreen';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  const formRef = useRef(null);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => {
      setIsVisible(true);
      
      // Trigger stagger animations
      const staggerContainers = document.querySelectorAll('.stagger-container');
      staggerContainers.forEach((container) => {
        container.classList.add('visible');
        const children = container.querySelectorAll('.stagger-fade-up');
        children.forEach((child, index) => {
          setTimeout(() => {
            child.classList.add('stagger-visible');
          }, index * 100);
        });
      });
    }, 100);

    const handleMouseMove = (e) => {
      const container = document.querySelector('.auth-container');
      if (container) {
        const rect = container.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / container.clientWidth) * 100;
        const y = ((e.clientY - rect.top) / container.clientHeight) * 100;
        container.style.setProperty('--mouse-x', `${x}%`);
        container.style.setProperty('--mouse-y', `${y}%`);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login(formData);
      // brief loading animation before navigating
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setTimeout(() => { setLoading(false); navigate('/dashboard'); }, 800);
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className={`auth-container ${isVisible ? 'visible' : ''}`}>
      <button 
        onClick={() => navigate('/')} 
        className="back-button animate-on-scroll-slide-left"
      >
        ← Back
      </button>
      {loading && <LoadingScreen message="Preparing your SkyCrate..." />}
      <div className={`auth-card auth-card-entrance ${isVisible ? 'visible' : ''}`}>
        <div className="auth-header stagger-container">
          <div className="auth-logo stagger-fade-up">
            <FiCloud />
            <span>SkyCrate</span>
          </div>
          <h1 className="stagger-fade-up">Welcome back</h1>
          <p className="stagger-fade-up">Sign in to access your cloud storage</p>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="auth-form stagger-container">
          {error && (
            <div className="error-message error-slide-in">
              {error}
            </div>
          )}

          <div className="form-group stagger-fade-up">
            <div className="input-wrapper form-input-animated">
              <FiMail className="input-icon" />
              <input
                type="email"
                name="email"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
                required
                className="smooth-input"
              />
            </div>
          </div>

          <div className="form-group stagger-fade-up">
            <div className="input-wrapper form-input-animated">
              <FiLock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                className="smooth-input"
              />
              <button
                type="button"
                className="password-toggle interactive-scale"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEyeOff />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`auth-button btn-animated stagger-fade-up ${loading ? 'btn-loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer stagger-fade-up">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="auth-link interactive-glow">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;