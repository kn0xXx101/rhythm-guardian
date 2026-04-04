# Keyboard Shortcuts

This document lists all available keyboard shortcuts in Rhythm Guardian.

## Global Shortcuts

These shortcuts work throughout the application:

### Navigation

- **`/` (Forward Slash)**: Focus search input or navigate to search page
- **`Ctrl+K` / `Cmd+K`**: Focus search input (common search shortcut)
- **`Escape`**:
  - Close active modals or dialogs
  - Clear search and blur input when in a search field
  - Navigate back in browser history if no modal is open

### Sidebar

- **`Ctrl+B` / `Cmd+B`**: Toggle sidebar collapse/expand (desktop only)

## Keyboard Navigation

### Skip Links

When you first load a page, press `Tab` to see skip links:

- **Skip to main content**: Jump directly to the main content area
- **Skip to navigation**: Jump directly to the navigation menu

### Focus Indicators

All interactive elements have visible focus indicators when navigated with keyboard:

- Buttons show a focus ring when focused
- Links show a focus ring when focused
- Form inputs show a focus ring when focused

### Tab Navigation

- Use `Tab` to move forward through interactive elements
- Use `Shift+Tab` to move backward through interactive elements
- Interactive elements include: links, buttons, form inputs, and any element with a `tabindex`

## Component-Specific Shortcuts

### Carousel

- **`Arrow Left`**: Navigate to previous slide
- **`Arrow Right`**: Navigate to next slide

### Data Tables

- **`Enter`**: Confirm edit in editable cells
- **`Escape`**: Cancel edit in editable cells

### Modals and Dialogs

- **`Escape`**: Close the modal/dialog
- **`Tab`**: Navigate between interactive elements within the modal
- Focus is trapped within the modal when open

## Best Practices

1. **Always provide keyboard alternatives** for mouse interactions
2. **Use semantic HTML** elements that are keyboard accessible by default
3. **Test with keyboard only** - unplug your mouse and navigate using only keyboard
4. **Ensure focus indicators** are visible and clear
5. **Maintain logical tab order** - elements should be focusable in a logical sequence

## Accessibility Standards

These keyboard shortcuts and navigation patterns follow:

- [WCAG 2.1 Level AA](https://www.w3.org/WAI/WCAG21/quickref/?currentsidebar=%23col_overview&levels=aaa) guidelines
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- Common web application keyboard shortcut conventions
