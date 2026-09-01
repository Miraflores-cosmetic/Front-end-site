import { useEffect, useState } from 'react';
import {
  getProgressBarCartModel,
  type ProgressBarCartModel,
} from '@/graphql/queries/pages.service';

const DEFAULT_MODEL: ProgressBarCartModel = {
  contentText: 'до бесплатной доставки до ПВЗ',
  threshold: 15780,
  successText: 'Бесплатная доставка до ПВЗ!',
};

export function useProgressBarCartModel(): ProgressBarCartModel {
  const [model, setModel] = useState<ProgressBarCartModel>(DEFAULT_MODEL);

  useEffect(() => {
    getProgressBarCartModel().then(setModel).catch(() => {});
  }, []);

  return model;
}
