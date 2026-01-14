'use client'

import styles from '../Spinner.module.scss';

export const SpinnerLoader = () => {
  return (
  <div className={styles.spinnerContainer}>
  <div className={styles.spinner}></div>
  </div>)
};