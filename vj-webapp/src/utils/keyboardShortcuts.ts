/**
 * Keyboard Shortcuts Manager
 *
 * Provides a centralized system for managing keyboard shortcuts across the VJ webapp.
 * Features:
 * - Global keyboard event handling
 * - Shortcut conflict detection
 * - Input field awareness (prevents shortcuts when typing)
 * - Categorized shortcuts
 * - Customizable shortcuts (extensible)
 */

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  category: ShortcutCategory;
  action: () => void;
  preventDefault?: boolean;
  enabled?: boolean;
}

export type ShortcutCategory =
  | 'Playback'
  | 'Layers'
  | 'Effects'
  | 'Recording'
  | 'Navigation'
  | 'General'
  | 'MIDI';

export interface ShortcutConflict {
  key: string;
  shortcuts: KeyboardShortcut[];
}

/**
 * Keyboard Shortcuts Manager Class
 */
export class KeyboardShortcutsManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private enabled: boolean = true;

  /**
   * Register a new keyboard shortcut
   */
  register(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut);

    // Check for conflicts
    if (this.shortcuts.has(key)) {
      console.warn(`Shortcut conflict detected for key: ${key}`);
    }

    this.shortcuts.set(key, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(shortcut: Partial<KeyboardShortcut>): void {
    const key = this.getShortcutKey(shortcut as KeyboardShortcut);
    this.shortcuts.delete(key);
  }

  /**
   * Get all registered shortcuts
   */
  getAll(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by category
   */
  getByCategory(category: ShortcutCategory): KeyboardShortcut[] {
    return this.getAll().filter(s => s.category === category);
  }

  /**
   * Detect conflicts in registered shortcuts
   */
  detectConflicts(): ShortcutConflict[] {
    const conflicts: ShortcutConflict[] = [];
    const keyMap: Map<string, KeyboardShortcut[]> = new Map();

    // Group shortcuts by key combination
    this.shortcuts.forEach((shortcut, key) => {
      if (!keyMap.has(key)) {
        keyMap.set(key, []);
      }
      keyMap.get(key)!.push(shortcut);
    });

    // Find conflicts (multiple shortcuts for same key)
    keyMap.forEach((shortcuts, key) => {
      if (shortcuts.length > 1) {
        conflicts.push({ key, shortcuts });
      }
    });

    return conflicts;
  }

  /**
   * Handle keyboard event
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;

    // Ignore shortcuts when typing in input fields
    if (this.isTypingInInput(event)) return;

    const key = this.getEventKey(event);
    const shortcut = this.shortcuts.get(key);

    if (shortcut && (shortcut.enabled !== false)) {
      if (shortcut.preventDefault !== false) {
        event.preventDefault();
      }
      shortcut.action();
    }
  }

  /**
   * Enable/disable all shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if user is typing in an input field
   */
  private isTypingInInput(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();

    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      target.isContentEditable
    );
  }

  /**
   * Generate a unique key for a shortcut
   */
  private getShortcutKey(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];

    if (shortcut.ctrl) parts.push('ctrl');
    if (shortcut.shift) parts.push('shift');
    if (shortcut.alt) parts.push('alt');
    if (shortcut.meta) parts.push('meta');
    parts.push(shortcut.key.toLowerCase());

    return parts.join('+');
  }

  /**
   * Get shortcut key from keyboard event
   */
  private getEventKey(event: KeyboardEvent): string {
    const parts: string[] = [];

    if (event.ctrlKey) parts.push('ctrl');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    if (event.metaKey) parts.push('meta');
    parts.push(event.key.toLowerCase());

    return parts.join('+');
  }

  /**
   * Clear all shortcuts
   */
  clear(): void {
    this.shortcuts.clear();
  }
}

/**
 * Global instance of the keyboard shortcuts manager
 */
export const keyboardShortcutsManager = new KeyboardShortcutsManager();

/**
 * Format shortcut key for display
 */
export function formatShortcutKey(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (shortcut.ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.meta) parts.push(isMac ? '⌘' : 'Meta');

  // Format the key nicely
  let key = shortcut.key;
  if (key === ' ') key = 'Space';
  else if (key === 'arrowup') key = '↑';
  else if (key === 'arrowdown') key = '↓';
  else if (key === 'arrowleft') key = '←';
  else if (key === 'arrowright') key = '→';
  else if (key === 'delete') key = 'Delete';
  else if (key === 'backspace') key = 'Backspace';
  else if (key === 'escape') key = 'Esc';
  else if (key === '/') key = '/';
  else key = key.toUpperCase();

  parts.push(key);

  return parts.join('+');
}

/**
 * Get all shortcut categories
 */
export function getShortcutCategories(): ShortcutCategory[] {
  return ['Playback', 'Layers', 'Effects', 'Recording', 'Navigation', 'General', 'MIDI'];
}
