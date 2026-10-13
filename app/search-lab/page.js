import SearchLabClient from "./SearchLabClient";

// Keep the route itself a small, unambiguous Server Component.
// This avoids prerendering the private search-comparison UI.
export const dynamic = "force-dynamic";

export default function SearchLabPage() {
  return <SearchLabClient />;
}
