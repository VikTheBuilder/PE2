import React, { useState, useEffect } from 'react';
import { FiCloud } from 'react-icons/fi';
import './LoadingScreen.css';

const LoadingScreen = ({ message = 'Loading your SkyCrate...' }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prevProgress => {
        const newProgress = prevProgress + 5;
        return newProgress >= 100 ? 100 : newProgress;
      });
    }, 200);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-logo" aria-hidden="true">
        <div className="orbits">
          {Array.from({ length: 16 }).map((_, i) => (
            <span className="orb" key={i} style={{ '--i': i }} />
          ))}
        </div>

        <FiCloud className="loading-cloud" />
        <div className="loading-box" />
      </div>
      <div className="loading-brand shiny">SkyCrate</div>
      <div className="loading-message">{message}</div>
      <div className="loading-progress">
        <div className="loading-progress-bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

export default LoadingScreen;


