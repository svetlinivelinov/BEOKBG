export interface ProductBase {
  id: string;
  model: string;
  category: string;
  application: 'electric' | 'water' | 'gas-boiler';
  image: string | null;
  sourceUrls: string[];
  sourceNote: string;
}

export interface ProductContent {
  name: string;
  description: string;
  keyFeatures: string[];
  technicalData: string[];
}

export interface Product extends ProductBase, ProductContent {}
