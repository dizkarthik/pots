import {
  Baby,
  Car,
  Dumbbell,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  type LucideIcon,
  PawPrint,
  PiggyBank,
  Pill,
  Plane,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Tv,
  Utensils,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";

export const POT_ICONS = {
  wallet: Wallet,
  house: House,
  "shopping-cart": ShoppingCart,
  utensils: Utensils,
  fuel: Fuel,
  car: Car,
  zap: Zap,
  wifi: Wifi,
  tv: Tv,
  dumbbell: Dumbbell,
  pill: Pill,
  "heart-pulse": HeartPulse,
  plane: Plane,
  "shopping-bag": ShoppingBag,
  shirt: Shirt,
  gift: Gift,
  "graduation-cap": GraduationCap,
  baby: Baby,
  "paw-print": PawPrint,
  "piggy-bank": PiggyBank,
} satisfies Record<string, LucideIcon>;

export type PotIconName = keyof typeof POT_ICONS;
export const POT_ICON_NAMES = Object.keys(POT_ICONS) as [PotIconName, ...PotIconName[]];

export function potIcon(name: string): LucideIcon {
  return POT_ICONS[name as PotIconName] ?? Wallet;
}

export const POT_COLORS = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "chart-6",
  "chart-7",
  "chart-8",
  "chart-9",
] as const;
export type PotColor = (typeof POT_COLORS)[number];

// Full class names so Tailwind can see them.
export const POT_COLOR_CLASSES: Record<PotColor, { swatch: string; tile: string }> = {
  "chart-1": { swatch: "bg-chart-1", tile: "bg-chart-1/15 text-chart-1-active" },
  "chart-2": { swatch: "bg-chart-2", tile: "bg-chart-2/15 text-chart-2-active" },
  "chart-3": { swatch: "bg-chart-3", tile: "bg-chart-3/15 text-chart-3-active" },
  "chart-4": { swatch: "bg-chart-4", tile: "bg-chart-4/15 text-chart-4-active" },
  "chart-5": { swatch: "bg-chart-5", tile: "bg-chart-5/15 text-chart-5-active" },
  "chart-6": { swatch: "bg-chart-6", tile: "bg-chart-6/15 text-chart-6-active" },
  "chart-7": { swatch: "bg-chart-7", tile: "bg-chart-7/15 text-chart-7-active" },
  "chart-8": { swatch: "bg-chart-8", tile: "bg-chart-8/15 text-chart-8-active" },
  "chart-9": { swatch: "bg-chart-9", tile: "bg-chart-9/15 text-chart-9-active" },
};

export function potColorClasses(color: string) {
  return POT_COLOR_CLASSES[color as PotColor] ?? POT_COLOR_CLASSES["chart-1"];
}

export const ACCOUNT_TYPES = ["savings", "current", "salary", "other"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  savings: "Savings",
  current: "Current",
  salary: "Salary",
  other: "Other",
};
