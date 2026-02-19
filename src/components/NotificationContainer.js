import React from 'react';
import { 
  FiCheckCircle, 
  FiXCircle, 
  FiAlertTriangle, 
  FiInfo, 
  FiX,
  FiLoader
} from 'react-icons/fi';
import { useNotifications } from '../contexts/NotificationContext';
import './NotificationContainer.css';

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotifications();

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <FiCheckCircle />;
      case 'error':
        return <FiXCircle />;
      case 'warning':
        return <FiAlertTriangle />;
      case 'progress':
        return <FiLoader className="spinning" />;
      default:
        return <FiInfo />;
    }
  };

  const getProgressBar = (notification) => {
    if (notification.type !== 'progress' || !notification.progress) return null;

    const { current, total } = notification.progress;
    const percentage = Math.min(100, Math.max(0, (current / total) * 100));

    return (
      <div className="notification-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="progress-text">
          {current} of {total} ({Math.round(percentage)}%)
        </div>
      </div>
    );
  };

  if (notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
        >
          <div className="notification-content">
            <div className="notification-header">
              <div className="notification-icon">
                {getIcon(notification.type)}
              </div>
              <div className="notification-text">
                {notification.title && (
                  <div className="notification-title">{notification.title}</div>
                )}
                {notification.message && (
                  <div className="notification-message">{notification.message}</div>
                )}
              </div>
              <button
                className="notification-close"
                onClick={() => removeNotification(notification.id)}
                aria-label="Close notification"
              >
                <FiX />
              </button>
            </div>
            
            {getProgressBar(notification)}
            
            {notification.actions && notification.actions.length > 0 && (
              <div className="notification-actions">
                {notification.actions.map((action, index) => (
                  <button
                    key={index}
                    className={`notification-action ${action.variant || 'secondary'}`}
                    onClick={() => {
                      action.onClick();
                      if (action.dismissOnClick !== false) {
                        removeNotification(notification.id);
                      }
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;