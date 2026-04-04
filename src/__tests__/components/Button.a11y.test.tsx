import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Accessibility', () => {
  it('should render accessible button with text', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('should have accessible label when using icon only', () => {
    render(
      <Button aria-label="Close dialog">
        <span aria-hidden="true">×</span>
      </Button>
    );
    const button = screen.getByRole('button', { name: /close dialog/i });
    expect(button).toBeInTheDocument();
  });

  it('should be keyboard accessible', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).not.toHaveAttribute('disabled');
  });
});

