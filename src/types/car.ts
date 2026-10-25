export type CarCondition = "جديدة" | "مستعملة";

export type CarStatus = "متوفرة" | "محجوزة" | "مباعة";

export type Transmission = "أوتوماتيك" | "يدوي";

export type FuelType = "بنزين" | "ديزل" | "هايبرد" | "كهربائي";

/** Where the car was first sold: the Iraqi dealer ("وكالة") or an import market. */
export type CarOrigin = "وكالة" | "خليجي" | "أمريكي" | "كوري" | "كندي" | "أوروبي" | "صيني";

export type Drivetrain = "أمامي" | "خلفي" | "رباعي" | "كلي";

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
  /** Trim or grade, e.g. "GXR", "SE". */
  trim?: string;
  year: number;
  price: number;
  currency: "IQD";
  condition: CarCondition;
  origin?: CarOrigin;
  bodyType: BodyType;
  mileage: number;
  transmission: Transmission;
  fuel: FuelType;
  engine: string;
  cylinders?: number;
  horsepower?: number;
  drivetrain?: Drivetrain;
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
  origin?: CarOrigin;
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
