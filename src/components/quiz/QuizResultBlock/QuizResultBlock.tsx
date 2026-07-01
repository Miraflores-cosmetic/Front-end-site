import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuizRichText } from '@/components/quiz/QuizRichText/QuizRichText';
import { QuizMedia } from '@/components/quiz/QuizMedia/QuizMedia';
import type { ResolvedContentBlock } from '@/types/quizContent';
import styles from './QuizResultBlock.module.scss';

interface QuizResultBlockProps {
  block: ResolvedContentBlock;
}

export const QuizResultBlock: React.FC<QuizResultBlockProps> = ({ block }) => {
  return (
    <motion.li
      className={styles.block}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      layout
    >
      {block.texts.map((text) => (
        <QuizRichText key={text.key} html={text.html} />
      ))}
      {block.media.map((media) => (
        <QuizMedia
          key={media.key}
          url={media.url}
          mediaType={media.mediaType}
          title={media.key}
        />
      ))}
    </motion.li>
  );
};
