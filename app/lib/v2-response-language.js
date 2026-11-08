// Shared by V2 chat and place wayfinding only. Search queries and machine
// metadata have their own rules; this policy governs passenger-facing prose.
const languages={ko:'한국어',en:'English',ja:'日本語',zh:'简体中文'};
export function passengerSystemRule(lang){
 const selected=languages[lang]||languages.ko;
 return `Write the entire passenger-facing answer ONLY in ${selected}, including every paragraph and all station/place names. The input, history and search languages MUST NOT change the selected language. Do not produce bilingual explanations, Korean originals in parentheses, or hybrid-script names. Machine metadata follows its explicit field rules separately.`;
}
export function passengerLanguageRule(lang){
 const selected=languages[lang]||languages.ko;
 return `MANDATORY PASSENGER-FACING LANGUAGE: ${selected}.
- Every explanatory sentence, heading, bullet and walking instruction must be in ${selected}. A Korean question or previous Korean conversation does not request a Korean answer.
- You may search in Korean to verify facts. Search snippets are reference data: rewrite their information naturally in ${selected}; never copy Korean sentences into a foreign-language answer.
- Use established station and place names in ${selected}. Do not repeat the Korean input, append Korean originals in parentheses, alternate Korean and translated paragraphs, or construct names by mixing Korean syllables with Japanese/Chinese characters. Do not invent an unverified translated name.
- Before finishing, silently check ALL paragraphs for the selected language and rewrite accidental Korean explanations in this same response. Do not announce translation or add another response.
- Preserve verified facts, grounding, station/line identity and uncertainty. This language policy does not authorize guessing locations, exits, times or other missing information.
- This policy applies to passenger-facing prose only. Reserved machine metadata uses its separately specified literal values.`;
}
