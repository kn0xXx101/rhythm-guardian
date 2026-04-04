import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: () => void;
  description?: string;
}

/**
 * Custom hook for managing global keyboard shortcuts
 *
 * @param shortcuts Array of keyboard shortcut configurations
 * @param enabled Whether shortcuts are enabled (default: true)
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts when typing in inputs, textareas, or contenteditable elements
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        (target.closest('[role="textbox"]') && target.tagName !== 'BODY')
      ) {
        // Allow Escape and Ctrl/Cmd + K even in inputs
        if (event.key === 'Escape' || (event.key === 'k' && (event.ctrlKey || event.metaKey))) {
          // Continue to check shortcuts
        } else {
          return;
        }
      }

      // Check each shortcut
      for (const shortcut of shortcuts) {
        const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatches =
          shortcut.ctrlKey === undefined ? !event.ctrlKey : shortcut.ctrlKey === event.ctrlKey;
        const metaMatches =
          shortcut.metaKey === undefined ? !event.metaKey : shortcut.metaKey === event.metaKey;
        const shiftMatches =
          shortcut.shiftKey === undefined ? !event.shiftKey : shortcut.shiftKey === event.shiftKey;
        const altMatches =
          shortcut.altKey === undefined ? !event.altKey : shortcut.altKey === event.altKey;

        if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

/**
 * Pre-configured keyboard shortcuts hook for common navigation
 */
export function useGlobalKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: '/',
      handler: () => {
        // Focus search if available, otherwise navigate to search page
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[placeholder*="Search" i], input[aria-label*="search" i]'
        );
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        } else if (location.pathname !== '/search' && location.pathname !== '/hirer/search') {
          navigate('/search');
        }
      },
      description: 'Focus search or navigate to search page',
    },
    {
      key: 'k',
      ctrlKey: true,
      handler: () => {
        // Focus search (Cmd/Ctrl+K is a common search shortcut)
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[placeholder*="Search" i], input[aria-label*="search" i]'
        );
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      },
      description: 'Focus search (Ctrl+K / Cmd+K)',
    },
    {
      key: 'Escape',
      handler: () => {
        // Close modals, dropdowns, or navigate back
        const activeModal = document.querySelector('[role="dialog"][data-state="open"]');
        if (activeModal) {
          const closeButton = activeModal.querySelector<HTMLButtonElement>(
            'button[aria-label*="close" i], button[aria-label*="Close"]'
          );
          if (closeButton) {
            closeButton.click();
            return;
          }
        }

        // If in search, clear and blur
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement?.tagName === 'INPUT' && activeElement.getAttribute('type') === 'search') {
          (activeElement as HTMLInputElement).value = '';
          activeElement.blur();
          return;
        }

        // Navigate back if possible
        if (window.history.length > 1) {
          navigate(-1);
        }
      },
      description: 'Close modals/dropdowns or go back',
    },
  ];

  useKeyboardShortcuts(shortcuts);
}
