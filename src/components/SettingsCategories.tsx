import React, { memo } from 'react';

export type SettingsCategory = 'ui' | 'visualizer' | 'music';

interface SettingsCategoriesProps {
  activeCategory: SettingsCategory;
  onCategoryChange: (category: SettingsCategory) => void;
}

function SettingsCategories({ activeCategory, onCategoryChange }: SettingsCategoriesProps) {
  return (
    <div className="Settings-category-selector">
      <button
        className={`Settings-category-btn ${activeCategory === 'ui' ? 'active' : ''}`}
        onClick={() => onCategoryChange('ui')}
      >
        UI
      </button>
      <button
        className={`Settings-category-btn ${activeCategory === 'visualizer' ? 'active' : ''}`}
        onClick={() => onCategoryChange('visualizer')}
      >
        Visualizer
      </button>
      <button
        className={`Settings-category-btn ${activeCategory === 'music' ? 'active' : ''}`}
        onClick={() => onCategoryChange('music')}
      >
        Music
      </button>
    </div>
  );
}

export default memo(SettingsCategories);
