import React, { useState, useEffect } from 'react';
import styles from './TabBar.module.scss';

interface TabBarProps {
  tabs: string[];
  active?: string;
  onChange?: (active: string) => void;
}

const TabBar: React.FC<TabBarProps> = ({ tabs, active: controlledActive, onChange }) => {
  const isControlled = controlledActive !== undefined;
  const [internalActive, setInternalActive] = useState(tabs[0]);

  const active = controlledActive ?? internalActive;

  useEffect(() => {
    // controlled: зеркалим active, чтобы не было рассинхронизации/мигания.
    if (isControlled) {
      setInternalActive(controlledActive ?? tabs[0]);
      return;
    }
    // uncontrolled: если набор табов поменялся, а активный исчез — сбрасываем на первый.
    if (!tabs.includes(internalActive)) {
      setInternalActive(tabs[0]);
    }
  }, [isControlled, controlledActive, tabs, internalActive]);

  const handleClick = (tab: string) => {
    if (!isControlled) setInternalActive(tab);
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
