import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '../contexts/ThemeContext';
import Dashboard from '../components/Dashboard';
import Storage from '../components/Storage';
import DashboardBilling from '../components/DashboardBilling';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock components and contexts
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'test@example.com', name: 'Test User' },
    logout: jest.fn()
  })
}));

jest.mock('../contexts/NotificationContext', () => ({
  useNotification: () => ({
    addNotification: jest.fn()
  })
}));

jest.mock('../services/api', () => ({
  getFiles: jest.fn().mockResolvedValue([]),
  getStorageStats: jest.fn().mockResolvedValue({
    totalStorage: 1000000,
    totalFiles: 10,
    storageClasses: {}
  }),
  getBillingData: jest.fn().mockResolvedValue({
    currentCost: 10.50,
    projectedCost: 12.00,
    usage: []
  })
}));

// Helper function to render components with theme context
const renderWithTheme = (component, theme = 'monochromatic') => {
  const ThemeWrapper = ({ children }) => (
    <ThemeProvider>
      <div data-theme={theme}>
        {children}
      </div>
    </ThemeProvider>
  );
  
  return render(component, { wrapper: ThemeWrapper });
};

describe('Monochromatic Theme Accessibility', () => {
  describe('Focus Management', () => {
    test('should have proper focus indicators on all interactive elements', async () => {
      const user = userEvent.setup();
      renderWithTheme(<Dashboard />);
      
      // Test navigation items
      const navItems = screen.getAllByRole('button');
      for (const item of navItems) {
        await user.tab();
        if (document.activeElement === item) {
          expect(item).toHaveStyle('outline: 3px solid var(--primary)');
        }
      }
    });

    test('should maintain focus visibility during keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithTheme(<Dashboard />);
      
      // Simulate keyboard navigation
      await user.keyboard('{Tab}');
      const focusedElement = document.activeElement;
      
      expect(focusedElement).toHaveAttribute('tabindex');
      expect(focusedElement).toHaveStyle('outline-offset: 3px');
    });

    test('should provide skip links for keyboard users', () => {
      renderWithTheme(<Dashboard />);
      
      const skipLink = document.querySelector('.skip-link');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href');
    });

    test('should trap focus in modals', async () => {
      const user = userEvent.setup();
      renderWithTheme(<Storage />);
      
      // Open a modal (if available)
      const modalTrigger = screen.queryByRole('button', { name: /modal/i });
      if (modalTrigger) {
        await user.click(modalTrigger);
        
        const modal = screen.getByRole('dialog');
        expect(modal).toBeInTheDocument();
        
        // Test focus trap
        await user.keyboard('{Tab}');
        expect(document.activeElement).toBeInTheDocument();
      }
    });
  });

  describe('Color Contrast', () => {
    test('should meet WCAG AA contrast requirements', () => {
      renderWithTheme(<Dashboard />);
      
      // Check text elements have sufficient contrast
      const textElements = screen.getAllByText(/./);
      textElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;
        
        // Basic check - in monochromatic theme, text should be black or very dark
        expect(color).toMatch(/(rgb\(0,\s*0,\s*0\)|#000000|rgba\(0,\s*0,\s*0,\s*1\))/);
      });
    });

    test('should provide high contrast mode support', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      renderWithTheme(<Dashboard />);
      
      // In high contrast mode, borders should be more prominent
      const interactiveElements = screen.getAllByRole('button');
      interactiveElements.forEach(element => {
        expect(element).toHaveStyle('border: 2px solid #000000');
      });
    });
  });

  describe('Interactive States', () => {
    test('should provide clear hover states', async () => {
      const user = userEvent.setup();
      renderWithTheme(<Dashboard />);
      
      const button = screen.getAllByRole('button')[0];
      await user.hover(button);
      
      expect(button).toHaveStyle('transform: translateY(-1px)');
      expect(button).toHaveStyle('box-shadow: var(--shadow-md)');
    });

    test('should provide clear active states', async () => {
      const user = userEvent.setup();
      renderWithTheme(<Dashboard />);
      
      const button = screen.getAllByRole('button')[0];
      fireEvent.mouseDown(button);
      
      expect(button).toHaveStyle('transform: translateY(0)');
    });

    test('should handle disabled states properly', () => {
      renderWithTheme(
        <button disabled aria-disabled="true">
          Disabled Button
        </button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveStyle('cursor: not-allowed');
      expect(button).toHaveStyle('opacity: var(--opacity-disabled)');
    });

    test('should provide loading state feedback', () => {
      renderWithTheme(
        <button aria-busy="true">
          Loading Button
        </button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveStyle('color: transparent');
    });
  });

  describe('Touch Target Accessibility', () => {
    test('should meet minimum touch target size requirements', () => {
      renderWithTheme(<Dashboard />);
      
      const interactiveElements = [
        ...screen.getAllByRole('button'),
        ...screen.getAllByRole('link'),
        ...screen.getAllByRole('checkbox'),
      ];
      
      interactiveElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        const minWidth = parseInt(styles.minWidth);
        const minHeight = parseInt(styles.minHeight);
        
        expect(minWidth).toBeGreaterThanOrEqual(44);
        expect(minHeight).toBeGreaterThanOrEqual(44);
      });
    });

    test('should provide adequate spacing between touch targets', () => {
      renderWithTheme(<Dashboard />);
      
      const actionGroups = document.querySelectorAll('.file-actions, .billing-actions, .header-right');
      actionGroups.forEach(group => {
        const styles = window.getComputedStyle(group);
        const gap = parseInt(styles.gap);
        
        expect(gap).toBeGreaterThanOrEqual(12);
      });
    });
  });

  describe('Screen Reader Support', () => {
    test('should provide proper ARIA labels and roles', () => {
      renderWithTheme(<Dashboard />);
      
      // Check for navigation landmarks
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Check for proper button labels
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });

    test('should provide live regions for dynamic content', () => {
      renderWithTheme(<Dashboard />);
      
      const liveRegions = document.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThan(0);
    });

    test('should provide proper heading hierarchy', () => {
      renderWithTheme(<Dashboard />);
      
      const headings = screen.getAllByRole('heading');
      let previousLevel = 0;
      
      headings.forEach(heading => {
        const level = parseInt(heading.tagName.charAt(1));
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(6);
        
        // Heading levels should not skip more than one level
        if (previousLevel > 0) {
          expect(level - previousLevel).toBeLessThanOrEqual(1);
        }
        previousLevel = level;
      });
    });

    test('should provide descriptive error messages', async () => {
      renderWithTheme(
        <div>
          <input aria-invalid="true" aria-describedby="error-msg" />
          <div id="error-msg" role="alert">
            This field is required
          </div>
        </div>
      );
      
      const input = screen.getByRole('textbox');
      const errorMessage = screen.getByRole('alert');
      
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'error-msg');
      expect(errorMessage).toHaveTextContent('This field is required');
    });
  });

  describe('Keyboard Navigation', () => {
    test('should support full keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithTheme(<Dashboard />);
      
      // Test tab navigation
      await user.keyboard('{Tab}');
      expect(document.activeElement).toHaveAttribute('tabindex');
      
      // Test arrow key navigation (if applicable)
      const navItems = screen.getAllByRole('button');
      if (navItems.length > 1) {
        navItems[0].focus();
        await user.keyboard('{ArrowDown}');
        // Should move focus to next item or handle appropriately
      }
    });

    test('should support escape key to close modals', async () => {
      const user = userEvent.setup();
      renderWithTheme(<Storage />);
      
      // Open modal if available
      const modalTrigger = screen.queryByRole('button', { name: /modal/i });
      if (modalTrigger) {
        await user.click(modalTrigger);
        
        const modal = screen.getByRole('dialog');
        expect(modal).toBeInTheDocument();
        
        await user.keyboard('{Escape}');
        await waitFor(() => {
          expect(modal).not.toBeInTheDocument();
        });
      }
    });

    test('should support enter and space for button activation', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      renderWithTheme(
        <button onClick={handleClick}>
          Test Button
        </button>
      );
      
      const button = screen.getByRole('button');
      button.focus();
      
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Form Accessibility', () => {
    test('should provide proper form labels and validation', () => {
      renderWithTheme(
        <form>
          <label htmlFor="email">Email</label>
          <input 
            id="email" 
            type="email" 
            required 
            aria-describedby="email-error"
          />
          <div id="email-error" role="alert" aria-live="polite">
            Please enter a valid email
          </div>
        </form>
      );
      
      const input = screen.getByLabelText('Email');
      const errorMessage = screen.getByRole('alert');
      
      expect(input).toHaveAttribute('required');
      expect(input).toHaveAttribute('aria-describedby', 'email-error');
      expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    });

    test('should provide fieldset grouping for related inputs', () => {
      renderWithTheme(
        <fieldset>
          <legend>Personal Information</legend>
          <input type="text" placeholder="First Name" />
          <input type="text" placeholder="Last Name" />
        </fieldset>
      );
      
      const fieldset = screen.getByRole('group');
      const legend = screen.getByText('Personal Information');
      
      expect(fieldset).toBeInTheDocument();
      expect(legend).toBeInTheDocument();
    });
  });

  describe('Reduced Motion Support', () => {
    test('should respect prefers-reduced-motion', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      renderWithTheme(<Dashboard />);
      
      const animatedElements = document.querySelectorAll('*');
      animatedElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        expect(styles.animationDuration).toBe('0.01ms');
        expect(styles.transitionDuration).toBe('0.01ms');
      });
    });
  });

  describe('Axe Accessibility Testing', () => {
    test('Dashboard should have no accessibility violations', async () => {
      const { container } = renderWithTheme(<Dashboard />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('Storage component should have no accessibility violations', async () => {
      const { container } = renderWithTheme(<Storage />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('DashboardBilling should have no accessibility violations', async () => {
      const { container } = renderWithTheme(<DashboardBilling />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Theme-Specific Accessibility', () => {
    test('should maintain accessibility across theme changes', async () => {
      const user = userEvent.setup();
      renderWithTheme(<Dashboard />, 'light');
      
      // Change to monochromatic theme
      const themeToggle = screen.getByRole('button', { name: /theme/i });
      await user.click(themeToggle);
      
      // Verify accessibility is maintained
      const { container } = renderWithTheme(<Dashboard />, 'monochromatic');
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should provide consistent focus indicators across themes', () => {
      const { rerender } = renderWithTheme(<Dashboard />, 'light');
      
      let button = screen.getAllByRole('button')[0];
      button.focus();
      
      // Check light theme focus
      expect(button).toHaveStyle('outline: 2px solid var(--border-focus)');
      
      // Switch to monochromatic theme
      rerender(
        <div data-theme="monochromatic">
          <Dashboard />
        </div>
      );
      
      button = screen.getAllByRole('button')[0];
      button.focus();
      
      // Check monochromatic theme focus
      expect(button).toHaveStyle('outline: 3px solid var(--primary)');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should provide accessible error states', () => {
      renderWithTheme(
        <div className="error-state" role="alert">
          <h3>Error Loading Data</h3>
          <p>Please try again later or contact support.</p>
          <button>Retry</button>
        </div>
      );
      
      const errorAlert = screen.getByRole('alert');
      const retryButton = screen.getByRole('button', { name: 'Retry' });
      
      expect(errorAlert).toBeInTheDocument();
      expect(retryButton).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent('Error Loading Data');
    });

    test('should provide accessible loading states', () => {
      renderWithTheme(
        <div aria-busy="true" aria-describedby="loading-msg">
          <div id="loading-msg" className="sr-only">
            Loading content, please wait
          </div>
          <div className="loading-spinner" role="status" aria-label="Loading"></div>
        </div>
      );
      
      const loadingContainer = screen.getByLabelText('Loading content, please wait');
      const spinner = screen.getByRole('status');
      
      expect(loadingContainer).toHaveAttribute('aria-busy', 'true');
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });
  });
});

describe('Accessibility Utilities', () => {
  test('should provide screen reader only content', () => {
    renderWithTheme(
      <div>
        <span className="sr-only">Screen reader only text</span>
        <span>Visible text</span>
      </div>
    );
    
    const srOnlyText = document.querySelector('.sr-only');
    expect(srOnlyText).toHaveStyle('position: absolute');
    expect(srOnlyText).toHaveStyle('width: 1px');
    expect(srOnlyText).toHaveStyle('height: 1px');
  });

  test('should provide focusable screen reader content', () => {
    renderWithTheme(
      <a href="#" className="sr-only-focusable">
        Skip to main content
      </a>
    );
    
    const skipLink = screen.getByRole('link');
    skipLink.focus();
    
    expect(skipLink).toHaveStyle('position: static');
  });
});