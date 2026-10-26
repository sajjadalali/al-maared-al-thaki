// Parallel-market rate (Baghdad exchanges, Oct 2026), not the official 1,510:
// cars are priced in dollars at the market rate, so this is what buyers use to
// compare prices and state budgets in dollars.
export const USD_TO_IQD = 1685;

// One formatter for the whole app: creating an Intl.NumberFormat is costly and
// every card formats a price and a mileage.
const numberFormat = new Intl.NumberFormat("en-US");

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatIQD(price: number): string {
  return `${formatNumber(price)} د.ع`;
}

export function formatMileage(value: number): string {
  return `${formatNumber(value)} كم`;
}

/** "زيرو" for a brand-new car, as Iraqi showrooms say it, otherwise the distance. */
export function formatCarMileage(value: number): string {
  return value === 0 ? "زيرو" : formatMileage(value);
}

export function originLabel(origin: string): string {
  return origin === "وكالة" ? "وكالة" : `وارد ${origin}`;
}

const DRIVETRAIN_LABELS: Record<string, string> = {
  أمامي: "دفع أمامي",
  خلفي: "دفع خلفي",
  رباعي: "دفع رباعي 4WD",
  كلي: "دفع كلي AWD",
};

export function drivetrainLabel(drivetrain: string): string {
  return DRIVETRAIN_LABELS[drivetrain] ?? drivetrain;
}

/** "≈ 24,500 $", rounded to the nearest hundred dollars. */
export function formatUSD(priceIQD: number): string {
  return `≈ ${formatNumber(Math.round(priceIQD / USD_TO_IQD / 100) * 100)} $`;
}
