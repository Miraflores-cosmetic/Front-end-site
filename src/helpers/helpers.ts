export function getHeaderStyle(pathname: string, isMobile: boolean) {
  return {
    // убрал paddingRight
  };
}

export function formatCurrency(value: number | string): string {
  const num = Number(value);

  if (isNaN(num)) return String(value);

  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
