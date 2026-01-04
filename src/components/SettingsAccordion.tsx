import React, { memo } from 'react';
import { SettingsCategory } from './SettingsCategories';

interface SettingsAccordionProps {
  category: SettingsCategory;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function SettingsAccordion({ category, expanded, onToggle, children }: SettingsAccordionProps) {
  const categoryLabels: Record<SettingsCategory, string> = {
    ui: 'UI',
    visualizer: 'Visualizer',
    music: 'Music',
  };

  return (
    <div className={`Settings-accordion ${expanded ? 'expanded' : ''}`}>
      <div className="Settings-accordion-header" onClick={onToggle}>
        <span>{categoryLabels[category]}</span>
        <span>{expanded ? '▼' : '▸'}</span>
      </div>
      {expanded && <div className="Settings-accordion-content">{children}</div>}
    </div>
  );
}

export default memo(SettingsAccordion);
