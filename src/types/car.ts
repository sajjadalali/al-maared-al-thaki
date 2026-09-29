export type CarCondition = "جديدة" | "مستعملة";

export type CarStatus = "متوفرة" | "محجوزة" | "مباعة";

export type Transmission = "أوتوماتيك" | "يدوي";

export type FuelType = "بنزين" | "ديزل" | "هايبرد" | "كهربائي";

export type BodyType =
  | "سيدان"
  | "SUV"
  | "هاتشباك"
  | "دفع رباعي"
  | "شاحنة"
  | "كوبيه";

export interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  currency: "IQD";
  condition: CarCondition;
  bodyType: BodyType;
  mileage: number;
  transmission: Transmission;
  fuel: FuelType;
  engine: string;
  seats: number;
  color: string;
  city: string;
  status: CarStatus;
  featured: boolean;
  tags?: string[];
  description: string;
  images: string[];
  features: string[];
}

export interface CarFilters {
  query?: string;
  brand?: string;
  bodyType?: string;
  condition?: CarCondition;
  city?: string;
  fuel?: FuelType;
  transmission?: Transmission;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  featured?: boolean;
  status?: CarStatus;
}
