export { getVolumeFromVariant } from '@/utils/getVolumeFromVariant';

export function sortMediaByOrder<
  T extends {
    url: string;
    alt?: string;
    id?: string;
    sortOrder?: number | null;
    mediaType?: string | null;
  },
>(media: T[]): T[] {
  return [...media].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}
