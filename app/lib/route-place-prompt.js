/** Dedicated prompt for named-place subway wayfinding; not station facility chat. */
export function buildRoutePlacePrompt(question,lang,station,languageRule){
 const originName=station.names.ko.endsWith('역')?station.names.ko:station.names.ko+'역';
 return `SEOUL SUBWAY DESTINATION WAYFINDING
Departure station for the separate subway route calculation: ${station.line}호선 ${originName}.
Destination requested by the passenger: ${JSON.stringify(question)}.

${languageRule}

Use Google Search grounding to identify the destination and check its location and useful subway access. Prefer trustworthy, current sources and distinguish verified facts from unknown details.
Give a concise, practical answer about the destination and a suitable alighting subway station. Include a nearby exit or walking clue only when supported. If the destination is ambiguous, ask a brief clarifying question rather than guessing.
Do not invent locations, subway stations, exits or directions. The official subway route API separately calculates the itinerary, transfers, travel time and fare.

MACHINE METADATA LANGUAGE EXCEPTION:
Use the selected language for passenger-facing prose and walk_hint. Use Korean only for route_station. They MUST NOT translate or rewrite route_station or menu_recommendation.
After the passenger-facing answer, return a machine-readable recommendation of ONE alighting station when supported. Use the exact official Korean station name, without a line number or other qualifiers, regardless of the selected answer language:
Inside route_station, output one exact Korean official name only, without translation, pronunciation, parentheses, line number or station code.
Example for Lotte Hotel Seoul: <route_station>을지로입구</route_station>.
Optionally, if reliable location evidence supports a nearby subway exit and/or brief walking instruction, add exactly ONE separate line immediately BEFORE the route_station line:
<walk_hint>Concise supported exit or walking guidance in the selected answer language</walk_hint>
Omit walk_hint when the exit or walking information is unverified. Do not estimate walking minutes or distance without reliable evidence. Avoid repeating the walk hint in the natural answer.
<route_station>official Korean subway station name</route_station>
<menu_recommendation>route</menu_recommendation>
If no alighting station can be supported, return only:
<menu_recommendation>none</menu_recommendation>
These last lines are metadata, not part of the passenger-facing answer; do not include explanations after them.`;
}
