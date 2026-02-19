import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiCloud } from 'react-icons/fi';
import { authAPI } from '../services/api';
import './Auth.css';
import '../styles/animations.css';

const Register = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [isVisible, setIsVisible] = useState(false);
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

  const checkPasswordStrength = (password) => {
    let strength = '';
    if (password.length === 0) {
      strength = '';
    } else if (password.length < 6) {
      strength = 'Weak';
    } else if (password.length < 10) {
      strength = 'Medium';
    } else {
      strength = 'Strong';
    }
    setPasswordStrength(strength);
  };

  const handleInputChange = (setter, value) => {
    setter(value);
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Registration timed out. Please try again.'));
      }, 10000); // 10 second timeout
    });

    try {
      // Race between the registration request and the timeout
      const response = await Promise.race([
        authAPI.register({
          username,
          email,
          password,
        }),
        timeoutPromise
      ]);

      if (response && response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        navigate('/dashboard');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Registration error:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message.includes('timed out')) {
        setError('Registration timed out. Server may be unavailable. Please try again.');
      } else if (err.message === 'Network Error') {
        setError('Cannot connect to server. Please check your internet connection.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
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
      <div className={`auth-card auth-card-entrance ${isVisible ? 'visible' : ''}`}>
        <div className="auth-header stagger-container">
          <div className="auth-logo stagger-fade-up">
            <FiCloud /> SkyCrate
          </div>
          <h1 className="stagger-fade-up">Register</h1>
          <p className="stagger-fade-up">Create your account to access your cloud storage</p>
        </div>
        <form ref={formRef} onSubmit={handleSubmit} className="auth-form stagger-container">
          <div className="form-group stagger-fade-up">
            <label htmlFor="username" className="form-label">Username</label>
            <div className="input-wrapper form-input-animated">
              <span className="input-icon"><FiUser /></span>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => handleInputChange(setUsername, e.target.value)}
                placeholder="Enter your username"
                required
                className="smooth-input"
              />
            </div>
          </div>
          <div className="form-group stagger-fade-up">
            <label htmlFor="email" className="form-label">Email</label>
            <div className="input-wrapper form-input-animated">
              <span className="input-icon"><FiMail /></span>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => handleInputChange(setEmail, e.target.value)}
                placeholder="Enter your email address"
                required
                className="smooth-input"
              />
            </div>
          </div>
          <div className="form-group stagger-fade-up">
            <label htmlFor="password" className="form-label">Password</label>
            <div className="input-wrapper form-input-animated">
              <span className="input-icon"><FiLock /></span>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => {
                  handleInputChange(setPassword, e.target.value);
                  checkPasswordStrength(e.target.value);
                }}
                placeholder="Enter your password"
                required
                className="smooth-input"
              />
              <button
                type="button"
                className="password-toggle interactive-scale"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {passwordStrength && (
              <p className={`password-strength ${passwordStrength.toLowerCase()} strength-indicator`}>
                Strength: {passwordStrength}
              </p>
            )}
          </div>
          <div className="form-group stagger-fade-up">
            <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
            <div className="input-wrapper form-input-animated">
              <span className="input-icon"><FiLock /></span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => handleInputChange(setConfirmPassword, e.target.value)}
                placeholder="Confirm your password"
                required
                className="smooth-input"
              />
              <button
                type="button"
                className="password-toggle interactive-scale"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>
          {error && (
            <div className="error-message error-slide-in">
              {error}
            </div>
          )}
          <button 
            type="submit" 
            className={`auth-button btn-animated stagger-fade-up ${loading ? 'btn-loading' : ''}`} 
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <div className="auth-footer stagger-fade-up">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link interactive-glow">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;