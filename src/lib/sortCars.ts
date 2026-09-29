export function sortCars<T extends { price: number; year: number; mileage: number; featured: boolean }>(
  cars: T[],
  sort: string
): T[] {
  const copy = [...cars];
  switch (sort) {
    case "newest":
      return copy.sort((a, b) => b.year - a.year);
    case "price-asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price-desc":
      return copy.sort((a, b) => b.price - a.price);
    case "mileage-asc":
      return copy.sort((a, b) => a.mileage - b.mileage);
    default:
      return copy.sort((a, b) => Number(b.featured) - Number(a.featured));
  }
}
