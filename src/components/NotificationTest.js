import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationTest = () => {
  const { showSuccess, showError, showWarning, showInfo, showProgress, updateNotification } = useNotifications();

  const testSuccess = () => {
    showSuccess('Success!', 'This is a success notification');
  };

  const testError = () => {
    showError('Error!', 'This is an error notification');
  };

  const testWarning = () => {
    showWarning('Warning!', 'This is a warning notification');
  };

  const testInfo = () => {
    showInfo('Info', 'This is an info notification');
  };

  const testProgress = () => {
    const notificationId = showProgress('Processing', 'Starting process...', {
      progress: { current: 0, total: 100 }
    });

    let current = 0;
    const interval = setInterval(() => {
      current += 10;
      updateNotification(notificationId, {
        message: `Processing... ${current}%`,
        progress: { current, total: 100 }
      });

      if (current >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          updateNotification(notificationId, {
            type: 'success',
            title: 'Complete!',
            message: 'Process completed successfully',
            progress: null,
            duration: 3000
          });
        }, 500);
      }
    }, 200);
  };

  const testDeletion = () => {
    const files = ['file1.txt', 'file2.jpg', 'file3.pdf'];
    const notificationId = showProgress('Deleting files', `Deleting ${files.length} files...`, {
      progress: { current: 0, total: files.length }
    });

    files.forEach((file, index) => {
      setTimeout(() => {
        updateNotification(notificationId, {
          message: `Deleting ${files.length} files... (${index + 1}/${files.length})`,
          progress: { current: index + 1, total: files.length }
        });

        if (index === files.length - 1) {
          setTimeout(() => {
            updateNotification(notificationId, {
              type: 'success',
              title: 'Deletion completed',
              message: `Successfully deleted ${files.length} files`,
              progress: null,
              duration: 3000
            });
          }, 500);
        }
      }, (index + 1) * 800);
    });
  };

  return (
    <div style={{ padding: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
      <button onClick={testSuccess}>Test Success</button>
      <button onClick={testError}>Test Error</button>
      <button onClick={testWarning}>Test Warning</button>
      <button onClick={testInfo}>Test Info</button>
      <button onClick={testProgress}>Test Progress</button>
      <button onClick={testDeletion}>Test Deletion Progress</button>
    </div>
  );
};

export default NotificationTest;