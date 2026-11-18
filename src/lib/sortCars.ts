// Cars that can be bought come first in every order (19 Nov: a reserved car
// sat among the available ones); within each group, the chosen order.
const STATUS_RANK: Record<string, number> = { "متوفرة": 0, "محجوزة": 1, "مباعة": 2 };

export function sortCars<T extends { price: number; year: number; mileage: number; featured: boolean; status?: string }>(
  cars: T[],
  sort: string
): T[] {
  const byChoice = (a: T, b: T): number => {
    switch (sort) {
      case "newest":
        return b.year - a.year;
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "mileage-asc":
        return a.mileage - b.mileage;
      default:
        return Number(b.featured) - Number(a.featured);
    }
  };
  const rank = (car: T) => STATUS_RANK[car.status ?? "متوفرة"] ?? 0;
  return [...cars].sort((a, b) => rank(a) - rank(b) || byChoice(a, b));
}
