import React, { useState } from 'react';
import styles from './ImageWithFallback.module.scss';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  placeholder?: string;
}

// SVG placeholder для битых изображений
const defaultPlaceholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='100%25' height='100%25' fill='%23F6F5EF'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236E6D67' font-family='Avenir Next, sans-serif' font-size='16'%3EИзображение недоступно%3C/text%3E%3C/svg%3E";

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  fallbackSrc,
  placeholder,
  ...rest
}) => {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      // Если есть fallbackSrc, используем его
      if (fallbackSrc) {
        setImgSrc(fallbackSrc);
      } else {
        // Иначе показываем placeholder
        setImgSrc(placeholder || defaultPlaceholder);
      }
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={`${styles.image} ${className}`}
      onError={handleError}
      {...rest}
    />
  );
};
