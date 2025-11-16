import React, { useState, useMemo } from 'react';
import {
  keyboardShortcutsManager,
  formatShortcutKey,
  getShortcutCategories,
  type ShortcutCategory,
} from '../utils/keyboardShortcuts';
import styles from './KeyboardShortcutsHelp.module.css';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Keyboard Shortcuts Help Modal
 *
 * Displays a categorized, searchable list of all available keyboard shortcuts
 * Features:
 * - Categorized shortcuts by function
 * - Search/filter functionality
 * - Visual keyboard key display
 * - Responsive design
 */
export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory | 'All'>('All');

  // Get all shortcuts from the manager
  const allShortcuts = keyboardShortcutsManager.getAll();
  const categories = getShortcutCategories();

  // Filter shortcuts based on search and category
  const filteredShortcuts = useMemo(() => {
    let filtered = allShortcuts;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter((s) => s.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.description.toLowerCase().includes(query) ||
          formatShortcutKey(s).toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allShortcuts, selectedCategory, searchQuery]);

  // Group shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const groups: Map<ShortcutCategory, typeof allShortcuts> = new Map();

    filteredShortcuts.forEach((shortcut) => {
      if (!groups.has(shortcut.category)) {
        groups.set(shortcut.category, []);
      }
      groups.get(shortcut.category)!.push(shortcut);
    });

    return groups;
  }, [filteredShortcuts]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Keyboard Shortcuts</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className={styles.toolbar}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />

          <div className={styles.categoryFilters}>
            <button
              className={`${styles.categoryButton} ${
                selectedCategory === 'All' ? styles.active : ''
              }`}
              onClick={() => setSelectedCategory('All')}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                className={`${styles.categoryButton} ${
                  selectedCategory === category ? styles.active : ''
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.content}>
          {filteredShortcuts.length === 0 ? (
            <div className={styles.noResults}>
              No shortcuts found matching your search.
            </div>
          ) : (
            <div className={styles.shortcuts}>
              {Array.from(groupedShortcuts.entries()).map(([category, shortcuts]) => (
                <div key={category} className={styles.category}>
                  <h3 className={styles.categoryTitle}>{category}</h3>
                  <div className={styles.shortcutList}>
                    {shortcuts.map((shortcut, index) => (
                      <div key={index} className={styles.shortcutItem}>
                        <div className={styles.shortcutKey}>
                          <kbd className={styles.kbd}>{formatShortcutKey(shortcut)}</kbd>
                        </div>
                        <div className={styles.shortcutDescription}>
                          {shortcut.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Press <kbd className={styles.kbd}>/</kbd> to toggle this help,{' '}
            <kbd className={styles.kbd}>Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
};
