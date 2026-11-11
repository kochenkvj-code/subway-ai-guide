// Derive a coarse IP location label; never persist raw IP or coordinates.
function ringContains(ring, lon, lat) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function findSeoulDistrict(geo, lon, lat) {
  for (const feature of geo.features || []) {
    const geometry = feature.geometry;
    const polygons = geometry?.type === "Polygon" ? [geometry.coordinates] : geometry?.type === "MultiPolygon" ? geometry.coordinates : [];
    for (const polygon of polygons) {
      if (polygon?.[0] && ringContains(polygon[0], lon, lat) && !polygon.slice(1).some(ring => ringContains(ring, lon, lat))) {
        return feature.properties?.name || null;
      }
    }
  }
  return null;
}

export function estimateIpRegion(headers, seoulGeo) {
  const country = (headers.get("x-vercel-ip-country") || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return null;
  const subdivision = (headers.get("x-vercel-ip-country-region") || "").trim().toUpperCase();
  let city = headers.get("x-vercel-ip-city") || "";
  try { city = decodeURIComponent(city); } catch { city = ""; }
  city = city.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 64);
  const seoulCity = /^(seoul|서울|서울특별시)$/i.test(city);
  const koreanRegions = {
    "11":"서울특별시","26":"부산광역시","27":"대구광역시","28":"인천광역시",
    "29":"광주광역시","30":"대전광역시","31":"울산광역시","36":"세종특별자치시",
    "41":"경기도","42":"강원특별자치도","43":"충청북도","44":"충청남도",
    "45":"전북특별자치도","46":"전라남도","47":"경상북도","48":"경상남도","50":"제주특별자치도"
  };
  if (country === "KR") {
    if (subdivision === "11" || (!subdivision && seoulCity)) {
      const latText = headers.get("x-vercel-ip-latitude");
      const lonText = headers.get("x-vercel-ip-longitude");
      if (latText && lonText) {
        const lat = Number(latText), lon = Number(lonText);
        if (Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          const district = findSeoulDistrict(seoulGeo, lon, lat);
          if (district) return "서울특별시 " + district;
        }
      }
      return "서울특별시 · 구 미확인";
    }
    const province = koreanRegions[subdivision];
    if (province) {
      const redundantCity = /^(seoul|busan|daegu|incheon|gwangju|daejeon|ulsan|sejong|제주|jeju)$/i.test(city);
      return !city || redundantCity ? province : province + " · " + city;
    }
    return city || null;
  }
  return city || (subdivision || null);
}
