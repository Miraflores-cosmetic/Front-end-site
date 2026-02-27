import React from 'react';
import { Link, LinkProps } from 'react-router-dom';

/**
 * Ссылка, которая по умолчанию открывается в новой вкладке.
 * Используется для всех навигационных ссылок, кроме карточки товара (ProductCard).
 */
const AppLink: React.FC<LinkProps> = (props) => (
  <Link {...props} target="_blank" rel="noopener noreferrer" />
);

export default AppLink;
