import {loadAppModule} from './load-app-module.mjs';
export async function loadFacilityTranslator(){
 return (await loadAppModule('app/lib/facility-i18n.js')).translateFacilityText;
}
