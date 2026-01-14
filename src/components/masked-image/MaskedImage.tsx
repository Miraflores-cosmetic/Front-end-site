import React from 'react';
import styles from './MaskedImage.module.scss';

interface MaskedImageProps {
  src: string;
}

const MaskedImage: React.FC<MaskedImageProps> = ({ src}) => {
  return (
    <svg
      className={styles.userImage}
      width='56'
      height='58'
      viewBox='0 0 56 58'
      xmlns='http://www.w3.org/2000/svg'
    >
      <defs>
        <pattern id='articleMaskPattern' patternUnits='objectBoundingBox' width='1' height='1'>
          <image href={src} width='640' height='640' preserveAspectRatio='none' />
        </pattern>
      </defs>

      <path
        d='M35.6791 2.33562C43.7658 5.0629 50.6589 10.5718 53.8988 18.4671C57.161 26.4164 56.6139 35.4682 52.3329 42.9184C48.0925 50.2978 40.4936 54.8048 32.1256 56.3585C23.4657 57.9664 14.0567 57.1591 7.53826 51.2354C1.01673 45.3089 -0.38735 36.039 0.0829639 27.2394C0.561833 18.2798 2.72767 8.83218 10.0795 3.68869C17.4459 -1.46502 27.1603 -0.537418 35.6791 2.33562Z'
        fill='url(#articleMaskPattern)'
      />
    </svg>
  );
};

export default MaskedImage;
