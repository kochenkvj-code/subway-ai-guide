import SearchLabClient from "./SearchLabClient";

// Keep the route itself a small, unambiguous Server Component.
// This avoids prerendering the private search-comparison UI.
export const dynamic = "force-dynamic";

export default function SearchLabPage() {
  return <><p style={{maxWidth:1000,margin:"16px auto",padding:"0 18px"}}><a href="/search-lab/v2-comparison">V2 모델·토큰 비교 페이지 →</a></p><SearchLabClient /></>;
}
