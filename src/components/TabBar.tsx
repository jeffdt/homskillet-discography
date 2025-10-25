import React from 'react';
import { TabType } from '../types/app';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="mobile-tab-bar">
      <button
        className={`tab ${activeTab === 'browser' ? 'tab-selected' : ''}`}
        onClick={() => onTabChange('browser')}
      >
        Browser
      </button>
      <button
        className={`tab ${activeTab === 'settings' ? 'tab-selected' : ''}`}
        onClick={() => onTabChange('settings')}
      >
        Settings
      </button>
      <button
        className={`tab ${activeTab === 'visualizer' ? 'tab-selected' : ''}`}
        onClick={() => onTabChange('visualizer')}
      >
        Visualizer
      </button>
    </div>
  );
};

export default TabBar;
