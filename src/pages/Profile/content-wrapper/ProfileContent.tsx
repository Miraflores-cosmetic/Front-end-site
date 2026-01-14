import React from 'react';
import styles from './ProfileContent.module.scss';
import { TabId } from '../side-bar/SideBar';

interface ProfileMainProps {
  activeTab?: TabId;
  renderContent: () => React.ReactNode;
}

const ProfileContent: React.FC<ProfileMainProps> = ({ renderContent }) => {
  return <main className={styles.main}>{renderContent()}</main>;
};

export default ProfileContent;
