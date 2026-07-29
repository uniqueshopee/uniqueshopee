import type { Metadata } from "next";
import { SearchExperience } from "@/components/search/search-experience";
import { getLiveSearchData } from "@/lib/catalog";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  return {
    title: query ? `Search results for "${query}" | UniqueShopee` : "Search | UniqueShopee",
    description: query
      ? `Search results for ${query} across UniqueShopee's premium Paint and Plumbing catalog.`
      : "Search UniqueShopee's premium Paint and Plumbing catalog.",
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const liveSearch = await getLiveSearchData();

  return (
    <main>
      <SearchExperience
        initialQuery={typeof q === "string" ? q.trim() : ""}
        products={liveSearch.products}
        brands={liveSearch.brands}
        categories={liveSearch.categories}
      />
    </main>
  );
}
