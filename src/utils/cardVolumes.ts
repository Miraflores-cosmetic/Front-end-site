/** 1–3 объёма полностью; 4+ → «a · b · c · +N». */
export function formatVolumesSubtitle(volumes: string[]): string {
  if (volumes.length === 0) return '';
  if (volumes.length <= 3) return volumes.join(' · ');
  const shown = volumes.slice(0, 3);
  return `${shown.join(' · ')} · +${volumes.length - 3}`;
}
