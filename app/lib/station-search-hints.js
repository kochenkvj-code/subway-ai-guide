// Search leads only: never evidence that a requested facility exists/operates.
// Jongno mall relationship: https://www.sisul.or.kr/open_content/undershop/guide/jongno/jongo.jsp
// Dongmyo counterparts: distinct 0159/2637 entries in the common station master.
const hints={
 '0154':['종오지하쇼핑센터','종로5가지하도상가'],
 '0159':['6호선 동묘앞역','동묘앞역 환승통로'],
 '2637':['1호선 동묘앞역','동묘앞역 환승통로'],
};
export function stationSearchHints(code){return [...(hints[code]||[])];}
