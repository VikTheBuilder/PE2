import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock matchMedia
const matchMediaMock = jest.fn();
global.matchMedia = matchMediaMock;

// Test component to interact with theme context
const TestComponent = () => {
  const { 
    theme, 
    toggleTheme, 
    setMonochromaticTheme, 
    setLightTheme, 
    setDarkTheme,
    isMonochromatic,
    isLight,
    isDark
  } = useTheme();

  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <div data-testid="is-monochromatic">{isMonochromatic.toString()}</div>
      <div data-testid="is-light">{isLight.toString()}</div>
      <div data-testid="is-dark">{isDark.toString()}</div>
      <button data-testid="toggle-theme" onClick={toggleTheme}>
        Toggle Theme
      </button>
      <button data-testid="set-monochromatic" onClick={setMonochromaticTheme}>
        Set Monochromatic
      </button>
      <button data-testid="set-light" onClick={setLightTheme}>
        Set Light
      </button>
      <button data-testid="set-dark" onClick={setDarkTheme}>
        Set Dark
      </button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    matchMediaMock.mockClear();
    
    // Reset document attribute
    document.documentElement.removeAttribute('data-theme');
  });

  describe('Default Theme Configuration (Requirement 3.1)', () => {
    test('should default to monochromatic theme when no saved preference exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      matchMediaMock.mockReturnValue({ matches: false });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('monochromatic');
      expect(screen.getByTestId('is-monochromatic')).toHaveTextContent('true');
      expect(document.documentElement.getAttribute('data-theme')).toBe('monochromatic');
    });

    test('should respect saved theme preference from localStorage (Requirement 3.4)', () => {
      localStorageMock.getItem.mockReturnValue('light');

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      expect(screen.getByTestId('is-light')).toHaveTextContent('true');
    });

    test('should respect OS dark mode preference when no saved preference (Requirement 3.5)', () => {
      localStorageMock.getItem.mockReturnValue(null);
      matchMediaMock.mockReturnValue({ matches: true });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('true');
    });
  });

  describe('Theme Switching (Requirement 3.2)', () => {
    test('should cycle through themes in correct order: monochromatic -> light -> dark -> monochromatic', () => {
      localStorageMock.getItem.mockReturnValue('monochromatic');

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Start with monochromatic
      expect(screen.getByTestId('current-theme')).toHaveTextContent('monochromatic');

      // Toggle to light
      fireEvent.click(screen.getByTestId('toggle-theme'));
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');

      // Toggle to dark
      fireEvent.click(screen.getByTestId('toggle-theme'));
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');

      // Toggle back to monochromatic
      fireEvent.click(screen.getByTestId('toggle-theme'));
      expect(screen.getByTestId('current-theme')).toHaveTextContent('monochromatic');
    });

    test('should allow direct theme setting', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Set to light theme
      fireEvent.click(screen.getByTestId('set-light'));
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');

      // Set to dark theme
      fireEvent.click(screen.getByTestId('set-dark'));
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');

      // Set to monochromatic theme
      fireEvent.click(screen.getByTestId('set-monochromatic'));
      expect(screen.getByTestId('current-theme')).toHaveTextContent('monochromatic');
    });
  });

  describe('Theme Persistence (Requirement 3.3)', () => {
    test('should save theme changes to localStorage', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByTestId('set-light'));
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
    });

    test('should update document data-theme attribute', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByTestId('set-dark'));
      
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('Theme State Helpers', () => {
    test('should provide correct boolean helpers for theme state', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Test monochromatic state
      fireEvent.click(screen.getByTestId('set-monochromatic'));
      expect(screen.getByTestId('is-monochromatic')).toHaveTextContent('true');
      expect(screen.getByTestId('is-light')).toHaveTextContent('false');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('false');

      // Test light state
      fireEvent.click(screen.getByTestId('set-light'));
      expect(screen.getByTestId('is-monochromatic')).toHaveTextContent('false');
      expect(screen.getByTestId('is-light')).toHaveTextContent('true');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('false');

      // Test dark state
      fireEvent.click(screen.getByTestId('set-dark'));
      expect(screen.getByTestId('is-monochromatic')).toHaveTextContent('false');
      expect(screen.getByTestId('is-light')).toHaveTextContent('false');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('true');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid saved theme gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-theme');
      matchMediaMock.mockReturnValue({ matches: false });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Should default to monochromatic when invalid theme is saved
      expect(screen.getByTestId('current-theme')).toHaveTextContent('monochromatic');
    });

    test('should handle missing matchMedia gracefully', () => {
      localStorageMock.getItem.mockReturnValue(null);
      global.matchMedia = undefined;

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Should default to monochromatic when matchMedia is not available
      expect(screen.getByTestId('current-theme')).toHaveTextContent('monochromatic');
    });
  });
});