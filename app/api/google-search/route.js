import { getVercelOidcToken } from "@vercel/oidc";
import { ExternalAccountClient } from "google-auth-library";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATION = {
  ko: "종로5가역", en: "Jongno 5-ga Station", ja: "鍾路5街駅", zh: "钟路5街站",
};
const LANGUAGE = {
  ko: "한국어", en: "English", ja: "日本語", zh: "简体中文",
};

// Only these three server-defined configurations are available in the lab.
// Ordinary /api/google-search requests keep their original v3 behavior.
const LAB_VARIANTS = {
  baseline: { label: "기존 Lite + 기존 지시문", model: "gemini-3.5-flash-lite", prompt: "legacy" },
  improvedLite: { label: "Lite + 위치검색 개선 지시문", model: "gemini-3.5-flash-lite", prompt: "local" },
  improvedFlash: { label: "Flash LOW · 기존 개선 지시문", model: "gemini-3.5-flash", prompt: "local", thinking: "LOW", maxOutputTokens: 1600 },
  flashMinimal: { label: "Flash MINIMAL · 같은 지시문", model: "gemini-3.5-flash", prompt: "local", thinking: "MINIMAL", maxOutputTokens: 1600 },
  flashConcise: { label: "Flash MINIMAL · 간결한 위치 안내", model: "gemini-3.5-flash", prompt: "concise", thinking: "MINIMAL", maxOutputTokens: 1200 },
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function allowTest(request) {
  const expected = process.env.SEARCH_LAB_KEY || "";
  const supplied = request.headers.get("x-search-lab-key") || "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

function legacyPrompt(question, lang) {
  const station = STATION[lang];
  return `
You are a passenger information assistant for ${station}, a subway station in Seoul, South Korea.

The passenger asked:
"${question}"

Use Google Search grounding to verify the answer using current public information.

Rules:
- Interpret the question specifically in the context of ${station}.
- Prefer official sources such as Seoul Metro, Seoul Metropolitan Government, Seoul Open Data, government agencies, and official transportation operators.
- If official information is not available, you may use other public web sources, but do not present uncertain information as certain.
- Never invent a facility, location, operating rule, fare, or service.
- If sources conflict or the answer cannot be verified, clearly say that confirmation with station staff is recommended.
- Keep the answer concise and practical for a passenger standing in a station.
- Do not explain your search process.
- Answer in ${LANGUAGE[lang]}.
- Normally use 2 to 5 short sentences.
`;
}

function improvedPrompt(question, lang) {
  return `
You provide dependable, current, practical local guidance to travelers at Jongno 5-ga Station (종로5가역, 서울 지하철 1호선), Seoul.

The traveler asks: "${question}"

SEARCH / REASONING REQUIREMENTS:
1. Use Google Search grounding to look up relevant public information before making a factual claim about the location, presence or absence, entrances, or opening hours of any facility, business or service. Do not rely on memory alone for these claims.
2. Interpret "at / near the station" broadly enough to distinguish: (A) inside subway station, (B) in connected underground arcade (e.g. 종로5가 지하도상가 / 종오지하쇼핑센터) and (C) nearby street-level venues around 종로5가역 / 광장시장. A service absent from (A) may still exist in (B) or (C). Never claim "none nearby" merely because none was confirmed inside the paid/unpaid station area.
3. For a specific facility or service, search using useful Korean place names and synonyms as appropriate, e.g. "종로5가역 환전소", "광장시장 환전", "종로5가 지하도상가 수유실", "종오지하쇼핑센터 수유실". These are search hints, not verified facts. Only search what is relevant to the actual question.
4. Prefer official operator/business pages for rules, operations, or precise locations, and corroborated public place/business pages for commercial amenities. Do not limit local business discovery to public-agency websites.
5. When results identify facilities, name the most relevant 1–3 places, with an actionable approximate location or direction ONLY if supported. Be clear whether each facility is inside station, in the underground arcade, or nearby. Avoid invented station exit numbers, hours, prices, or phone numbers.
6. If reliable evidence is missing, say "I could not verify the location from the available results" in the requested language, NOT "there is no such facility". Never turn lack of evidence into evidence of nonexistence.
7. Cite sources through grounding as available and keep the answer passenger-friendly, about 3–6 short sentences or a few very short bullets. Do not describe your internal process. Answer ONLY in ${LANGUAGE[lang]}.
8. For questions unrelated to local amenities, remain helpful about the station and public transportation, verifying current operating rules via search when necessary.
`;
}

// Variant C: keep the same grounding and correctness rules but cut unnecessary prose.
// Do not suppress searches or assume nearby places do not exist.
function conciseLocalPrompt(question, lang) {
  return `
You are a Seoul subway passenger's concise local search guide near 종로5가역 (Jongno 5-ga Station, Line 1).
Passenger question: "${question}"

Use Google Search grounding to verify place names and directions before giving factual answers.
"Near the station" includes inside the station, connected underground shopping areas (종오지하쇼핑센터/종로5가 지하도상가), and nearby streets/광장시장. Do not treat "not inside station" as "none nearby".
Search relevant Korean terms and local synonyms. Don't prefer public agency sites for commercial shops; prefer reliable business/place sources and official sources for transportation rules.
Give the most useful 1-2 verified options with location or station exit only when supported by sources. If results lack proof, say you could not confirm, never claim nonexistence. Don't invent exact directions, hours, or facilities. If options have different types of location (station / connected arcade / outside), distinguish them.

Answer ONLY in ${LANGUAGE[lang]}, with 2-4 short passenger-friendly sentences, no headings, generic disclaimers, internal process, or markdown emphasis. Prioritize place name and actionable location.
`;
}

// Standard global on-demand model-only pricing, USD / 1,000,000 tokens.
// Google Search grounding is a separate charge (5k grounded queries/month free across Gemini 3 models,
// then $14 per 1000 queries), and is intentionally NOT included in this estimate.
const MODEL_PRICE_USD_PER_M = {
  "gemini-3.5-flash-lite": { input: 0.30, output: 2.50 },
  "gemini-3.5-flash": { input: 1.50, output: 9.00 },
};
function estimateTokenCost(model, usage) {
  const price = MODEL_PRICE_USD_PER_M[model];
  if (!price || typeof usage?.promptTokenCount !== "number" || typeof usage?.candidatesTokenCount !== "number") return null;
  const promptTokens = usage.promptTokenCount;
  const responseTokens = usage.candidatesTokenCount;
  const thinkingTokens = typeof usage.thoughtsTokenCount === "number" ? usage.thoughtsTokenCount : 0;
  return {
    inputTokens: promptTokens,
    outputTokens: responseTokens,
    thinkingTokens,
    // Price may differ if caching, discounts, new model routing, or regional prices apply.
    estimatedModelUsd: Number(((promptTokens * price.input + (responseTokens + thinkingTokens) * price.output) / 1_000_000).toFixed(8)),
    priceInputUsdPerM: price.input,
    priceOutputUsdPerM: price.output,
  };
}

async function getGoogleAccessToken() {
  const projectNumber = process.env.GCP_PROJECT_NUMBER;
  const serviceAccount = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
  const poolId = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
  const providerId = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;
  if (!process.env.GCP_PROJECT_ID || !projectNumber || !serviceAccount || !poolId || !providerId) {
    throw new Error("GCP 환경변수가 누락되었습니다.");
  }
  const client = ExternalAccountClient.fromJSON({
    type: "external_account",
    audience:
      `//iam.googleapis.com/projects/${projectNumber}` +
      `/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url:
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}:generateAccessToken`,
    subject_token_supplier: { getSubjectToken: async () => await getVercelOidcToken() },
  });
  if (!client) throw new Error("Google 인증 클라이언트 생성에 실패했습니다.");
  client.scopes = ["https://www.googleapis.com/auth/cloud-platform"];
  const tokenResult = await client.getAccessToken();
  if (!tokenResult?.token) throw new Error("Google Access Token 발급에 실패했습니다.");
  return tokenResult.token;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.question !== "string" || !body.question.trim()) {
      return json({ ok: false, error: "질문을 입력해 주세요." }, 400);
    }
    const question = body.question.trim();
    if (question.length > 500) {
      return json({ ok: false, error: "질문은 500자 이내로 입력해 주세요." }, 400);
    }
    const lang = Object.prototype.hasOwnProperty.call(STATION, body.lang) ? body.lang : "ko";
    // mode is opt-in, restricted to requests with the separately configured server-side test key.
    const labMode = typeof body.labMode === "string" ? body.labMode : null;
    if (labMode !== null && !Object.prototype.hasOwnProperty.call(LAB_VARIANTS, labMode)) {
      return json({ ok: false, error: "알 수 없는 테스트 방식입니다." }, 400);
    }
    if (labMode && !allowTest(request)) {
      return json({ ok: false, error: "테스트 인증에 실패했습니다. Vercel의 SEARCH_LAB_KEY 설정과 입력값을 확인해 주세요." }, 403);
    }

    const config = labMode ? LAB_VARIANTS[labMode] : LAB_VARIANTS.baseline;
    const requestStart = Date.now();
    const accessToken = await getGoogleAccessToken();
    const model = config.model;
    const url = `https://aiplatform.googleapis.com/v1/projects/${encodeURIComponent(process.env.GCP_PROJECT_ID)}` +
      `/locations/global/publishers/google/models/${model}:generateContent`;
    const prompt = config.prompt === "concise" ? conciseLocalPrompt(question, lang)
      : config.prompt === "local" ? improvedPrompt(question, lang)
        : legacyPrompt(question, lang);
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=utf-8",
          Accept: "application/json",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }],
          generationConfig: config.thinking
            ? { maxOutputTokens: config.maxOutputTokens, thinkingConfig: { thinkingLevel: config.thinking } }
            : { maxOutputTokens: 350 },
        }),
        signal: controller.signal,
        cache: "no-store",
      });
    } finally {
      clearTimeout(timer);
    }
    const durationMs = Date.now() - start;
    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return json({ ok: false, error: "Google API 응답을 해석하지 못했습니다.", stage: "parse", model }, 502);
    }
    if (!response.ok) {
      // No bearer tokens, full response bodies, or service-account configuration are returned.
      const reason = data?.error?.message || "Gemini 요청이 실패했습니다.";
      return json({ ok: false, error: reason.slice(0, 300), status: response.status, stage: "gemini", model }, 502);
    }

    const candidate = data.candidates?.[0];
    const answer = candidate?.content?.parts?.filter((part) => !part.thought).map((part) => part.text || "").join("").trim() ||
      "답변을 생성하지 못했습니다.";
    const grounding = candidate?.groundingMetadata || {};
    const sources = (grounding.groundingChunks || [])
      .filter((chunk) => chunk.web?.uri)
      .map((chunk) => ({
        title: chunk.web.title || "검색 결과",
        url: chunk.web.uri,
        domain: chunk.web.domain || "",
      }));

    return json({
      ok: true, answer, sources,
      googleSearchQueries: grounding.webSearchQueries || [],
      groundingSupports: grounding.groundingSupports || [],
      searchSuggestion: grounding.searchEntryPoint?.renderedContent || null,
      ...(labMode ? {
        lab: {
          mode: labMode, label: config.label, model, durationMs,
          totalDurationMs: Date.now() - requestStart,
          thinkingLevel: config.thinking || "default",
          tokenCost: estimateTokenCost(model, data.usageMetadata),
          // Search fees and any taxes/credits are excluded. Search query count is diagnostic, not a bill.
          searched: (grounding.webSearchQueries || []).length > 0,
          sourceCount: sources.length,
          supportCount: (grounding.groundingSupports || []).length,
          usage: data.usageMetadata || null,
          finishReason: candidate?.finishReason || null,
        },
      } : {}),
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      return json({ ok: false, stage: "timeout", error: "응답 대기 시간(45초)을 초과했습니다." }, 504);
    }
    // Preserve a useful error for diagnosis without returning auth tokens / full SDK internals.
    console.error("[subway-search]", error?.name || "Error");
    return json({ ok: false, stage: "server", error: "서버 또는 Google 인증 오류가 발생했습니다. Vercel 로그를 확인해 주세요." }, 500);
  }
}
