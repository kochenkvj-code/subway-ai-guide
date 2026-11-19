// Static Seoul Metro statistical categories; used by server-side code and regression tests.
import source from '../data/timetable-crowding.json';
import {createCrowdingModel,crowdingColors,crowdingGradient} from './timetable-lab-crowding-view';
export {crowdingColors,crowdingGradient};
export const {timetableCrowding,crowdingHalves,crowdingThresholds,crowdingSourceDate}=createCrowdingModel(source);
