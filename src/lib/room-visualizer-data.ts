export type PaintCategory = "Interior" | "Exterior" | "Wood" | "Metal";
export type PaintBrand = "Asian Paints" | "Berger" | "Nerolac" | "Indigo" | "Birla White" | "Dr Fixit";

export type ColorSwatch = {
  id: string;
  name: string;
  hex: string;
  category: PaintCategory;
  brand: PaintBrand;
};

export const PAINT_CATEGORIES: PaintCategory[] = [];
export const PAINT_BRANDS: PaintBrand[] = [];
export const COLOR_SWATCHES: ColorSwatch[] = [];
export const FAVORITE_COLOR_IDS: string[] = [];
export const RECENT_COLOR_IDS: string[] = [];
