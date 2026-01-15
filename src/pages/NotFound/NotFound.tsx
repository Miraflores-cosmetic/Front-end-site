import React from 'react';
import Header from '@/components/Header/Header';
import styles from './NotFound.module.scss';

export default function NotFound() {
    return (
        <>
            <Header />
            <main className={styles.notFoundContainer}>
                <h1>404</h1>
                <p>Страница не найдена</p>
            </main>
        </>
    );
}