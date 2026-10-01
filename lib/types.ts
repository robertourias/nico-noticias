export type MarketItem = {
  id: string;
  label: string;
  value: string | null;
  change: number | null;
};

export type Markets = {
  asOf: string | null;
  items: MarketItem[];
};

export type Weather = {
  date: string;
  condition: string | null;
  min: number | null;
  max: number | null;
  rainChance: number | null;
  rainMm: number | null;
  uv: number | null;
  source: string | null;
  url: string | null;
};

export type NewsItem = {
  title: string;
  summary: string;
  source: string;
  url: string;
  time?: string | null;
};

export type Category = {
  id: string;
  label: string;
  items: NewsItem[];
};

export type NewsData = {
  updatedAt: string | null;
  markets: Markets | null;
  weather: Weather | null;
  categories: Category[];
};
