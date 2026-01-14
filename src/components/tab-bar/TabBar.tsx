import React, { useState, useEffect } from 'react';
import styles from './TabBar.module.scss';

interface TabBarProps {
  tabs: string[];
  active?: string;
  onChange?: (active: string) => void;
}

const TabBar: React.FC<TabBarProps> = ({ tabs, active: controlledActive, onChange }) => {
  const [internalActive, setInternalActive] = useState(tabs[0]);

  const active = controlledActive ?? internalActive;

  useEffect(() => {
    // если извне пришло новое значение active — обновим внутреннее
    if (controlledActive) setInternalActive(controlledActive);
  }, [controlledActive]);

  const handleClick = (tab: string) => {
    setInternalActive(tab);
    onChange?.(tab);
  };

  return (
    <div className={styles.wrapper}>
      {tabs.map(tab => (
        <button
          key={tab}
          className={`${styles.tab} ${active === tab ? styles.active : ''}`}
          onClick={() => handleClick(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default TabBar;
