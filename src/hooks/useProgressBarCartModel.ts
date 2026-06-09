import { useEffect, useState } from 'react';
import {
  getProgressBarCartModel,
  type ProgressBarCartModel,
} from '@/graphql/queries/pages.service';

const DEFAULT_MODEL: ProgressBarCartModel = {
  contentText: 'до бесплатной доставки',
  threshold: 15780,
  successText: 'Бесплатная доставка!',
};

export function useProgressBarCartModel(): ProgressBarCartModel {
  const [model, setModel] = useState<ProgressBarCartModel>(DEFAULT_MODEL);

  useEffect(() => {
    getProgressBarCartModel().then(setModel).catch(() => {});
  }, []);

  return model;
}
