export type Category = {
  id: number;
  name: string;
  slug: string;
};

export type Item = {
  id: number;
  name: string;
  category: number;
  category_name: string;
  description: string;
  condition: "mint" | "near_mint" | "good" | "fair";
  price: string;
  stock: number;
  image: string | null;
  is_featured: boolean;
  created_at: string;
};

type MaybePaginated<T> = T[] | { results: T[] };

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function collection<T>(payload: MaybePaginated<T>): T[] {
  return Array.isArray(payload) ? payload : payload.results;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getCategories(): Promise<Category[]> {
  const payload = await getJson<MaybePaginated<Category>>("/api/categories/");
  return collection(payload);
}

export async function getItems(params: {
  category?: string;
  featured?: boolean;
  search?: string;
  ordering?: string;
}): Promise<Item[]> {
  const searchParams = new URLSearchParams();

  if (params.category) searchParams.set("category", params.category);
  if (params.featured) searchParams.set("featured", "true");
  if (params.search) searchParams.set("search", params.search);
  if (params.ordering) searchParams.set("ordering", params.ordering);

  const query = searchParams.toString();
  const payload = await getJson<MaybePaginated<Item>>(
    `/api/items/${query ? `?${query}` : ""}`
  );

  return collection(payload);
}

export function resolveAssetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  if (!API_BASE_URL) return path;
  return new URL(path, API_BASE_URL).toString();
}
