export interface PoiCategory {
  id: string;
  label: string;
  categoryIds: number[];
}

export const POI_CATEGORIES: PoiCategory[] = [
  { id: "coffee", label: "Coffee", categoryIds: [448, 564, 435] },
  { id: "grocery", label: "Grocery", categoryIds: [475, 472] },
  { id: "gas", label: "Gas", categoryIds: [596, 597] },
  { id: "restaurant", label: "Restaurant", categoryIds: [570, 566, 567] },
  { id: "pharmacy", label: "Pharmacy", categoryIds: [495, 436] },
  { id: "fast_food", label: "Fast food", categoryIds: [566] },
];
