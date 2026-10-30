// UI category identifiers remain stable across TourAPI language services.
// Foreign TourAPI contentTypeIds differ from the Korean service identifiers.
const koreanTypes={'12':'12','14':'14','15':'15','25':'25','28':'28','32':'32','38':'38','39':'39'};
const foreignTypes={'12':'76','14':'78','15':'85','28':'75','32':'80','38':'79','39':'82'};
export const TOUR_SERVICES={
  ko:{service:'KorService2',keyName:'TOUR_API_KEY',types:koreanTypes},
  en:{service:'EngService2',keyName:'TOUR_API_KEY_EN',types:foreignTypes},
  ja:{service:'JpnService2',keyName:'TOUR_API_KEY_JA',types:foreignTypes},
  zh:{service:'ChsService2',keyName:'TOUR_API_KEY_ZH',types:foreignTypes},
};
export function canonicalTourType(language,type){
  return Object.entries(TOUR_SERVICES[language].types).find(([,code])=>code===String(type))?.[0]||'';
}
