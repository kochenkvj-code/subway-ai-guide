// Comparison-page estimates only: Vertex AI Gemini global Standard, USD per 1M tokens.
// Sources: https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing
// Gemini 3.8 Flash introductory rates apply through 2026-12-31.
// The KRW rate is an editable approximation, NOT a live FX quote or billing SKU.
export const DEFAULT_USD_KRW=1340;
export const V2_MODEL_PRICES={
  'gemini-3.5-flash-lite':{input:0.30,output:2.50,cached:0.03},
  'gemini-3.5-flash':{input:1.50,output:9.00,cached:0.15},
  'gemini-3.8-flash':{input:0.75,output:3.75,cached:0.075},
};
export const GROUNDING_USD_PER_SEARCH=0.014;
const count=v=>Number.isFinite(v)&&v>=0?v:0;
export function estimateV2ComparisonCost(result,usdKrw=DEFAULT_USD_KRW){
  const d=result?.diagnostics;
  const price=V2_MODEL_PRICES[d?.model];
  if(!price||!Number.isFinite(d?.inputTokens)||!Number.isFinite(d?.outputTokens)||!Number.isFinite(usdKrw)||usdKrw<=0)return null;
  const usage=d.usageMetadata||{};
  const input=count(d.inputTokens);
  const cache=Math.min(input,count(usage.cachedContentTokenCount));
  // Google Search grounding tool results are supplied to the model without input-token charges.
  // Do not add toolUsePromptTokenCount to paid prompt tokens.
  const answer=count(d.outputTokens);
  const thoughts=count(d.thoughtsTokens);
  const inputUsd=((input-cache)*price.input+cache*price.cached)/1_000_000;
  const outputUsd=(answer+thoughts)*price.output/1_000_000;
  const modelUsd=inputUsd+outputUsd;
  const searchQueries=Array.isArray(result.googleSearchQueries)?result.googleSearchQueries:[];
  const searchCount=new Set(searchQueries.filter(q=>typeof q==='string').map(q=>q.trim()).filter(Boolean)).size;
  const groundingIfBilledUsd=searchCount*GROUNDING_USD_PER_SEARCH;
  return {
    modelUsd,modelKrw:modelUsd*usdKrw,
    inputUsd,outputUsd,
    searchCount,groundingIfBilledUsd,groundingIfBilledKrw:groundingIfBilledUsd*usdKrw,
    totalIfSearchBilledKrw:(modelUsd+groundingIfBilledUsd)*usdKrw,
    thoughtsReported:Number.isFinite(d.thoughtsTokens),
  };
}
