// Approximate market rate, used to show a price in dollars (how most buyers in
// Iraq compare cars) and to read budgets stated in dollars.
export const USD_TO_IQD = 1450;

export function formatIQD(price: number): string {
  return `${new Intl.NumberFormat("en-US").format(price)} د.ع`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
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
