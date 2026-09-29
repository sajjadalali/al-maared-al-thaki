export function formatIQD(price: number): string {
  return `${new Intl.NumberFormat("en-US").format(price)} د.ع`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatMileage(value: number): string {
  return `${formatNumber(value)} كم`;
}
