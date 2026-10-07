import { getVercelOidcToken } from "@vercel/oidc";
import { ExternalAccountClient } from "google-auth-library";

export const runtime = "nodejs";

const STATION = {
  ko: "종로5가역",
  en: "Jongno 5-ga Station",
  ja: "鍾路5街駅",
  zh: "钟路5街站",
};

const LANGUAGE = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
};

export async function POST(request) {
  try {
    const { question, lang = "ko" } = await request.json();

    if (!question?.trim()) {
      return utf8Json(
        {
          ok: false,
          error: "질문이 비어 있습니다.",
        },
        400
      );
    }

    const projectId = process.env.GCP_PROJECT_ID;
    const projectNumber = process.env.GCP_PROJECT_NUMBER;
    const serviceAccount = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
    const poolId = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
    const providerId = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;

    if (
      !projectId ||
      !projectNumber ||
      !serviceAccount ||
      !poolId ||
      !providerId
    ) {
      return utf8Json(
        {
          ok: false,
          stage: "environment",
          error: "GCP 환경변수가 누락되었습니다.",
        },
        500
      );
    }

    const authClient = ExternalAccountClient.fromJSON({
      type: "external_account",

      audience:
        `//iam.googleapis.com/projects/${projectNumber}` +
        `/locations/global/workloadIdentityPools/${poolId}` +
        `/providers/${providerId}`,

      subject_token_type:
        "urn:ietf:params:oauth:token-type:jwt",

      token_url:
        "https://sts.googleapis.com/v1/token",

      service_account_impersonation_url:
        `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/` +
        `${serviceAccount}:generateAccessToken`,

      // 중요: google-auth-library가 supplier에 넘기는 인자를
      // getVercelOidcToken으로 전달하지 않도록 래퍼를 사용합니다.
      subject_token_supplier: {
        getSubjectToken: async () => {
          return await getVercelOidcToken();
        },
      },
    });

    if (!authClient) {
      throw new Error("Google 인증 클라이언트를 만들 수 없습니다.");
    }

    authClient.scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ];

    const tokenResult = await authClient.getAccessToken();
    const accessToken = tokenResult?.token;

    if (!accessToken) {
      throw new Error("Google Access Token 발급 실패");
    }

    const model = "gemini-3.5-flash-lite";

    const url =
      `https://aiplatform.googleapis.com/v1/projects/${projectId}` +
      `/locations/global/publishers/google/models/${model}:generateContent`;

    const station = STATION[lang] || STATION.ko;
    const responseLanguage = LANGUAGE[lang] || LANGUAGE.ko;

    const prompt = `
You are a passenger information assistant for ${station}, a subway station in Seoul, South Korea.

The passenger asked:
"${question.trim()}"

Use Google Search grounding to verify the answer using current public information.

Rules:
- Interpret the question specifically in the context of ${station}.
- Prefer official sources such as Seoul Metro, Seoul Metropolitan Government, Seoul Open Data, government agencies, and official transportation operators.
- If official information is not available, you may use other public web sources, but do not present uncertain information as certain.
- Never invent a facility, location, operating rule, fare, or service.
- If sources conflict or the answer cannot be verified, clearly say that confirmation with station staff is recommended.
- Keep the answer concise and practical for a passenger standing in a station.
- Do not explain your search process.
- Answer in ${responseLanguage}.
- Normally use 2 to 5 short sentences.
`;

    const googleResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        tools: [
          {
            googleSearch: {},
          },
        ],
        generationConfig: {
          maxOutputTokens: 350,
        },
      }),
    });

    const buffer = await googleResponse.arrayBuffer();
    const responseText = new TextDecoder("utf-8").decode(buffer);

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      return utf8Json(
        {
          ok: false,
          stage: "gemini-parse",
          error: "Google 응답을 JSON으로 해석하지 못했습니다.",
          raw: responseText.slice(0, 1000),
        },
        500
      );
    }

    if (!googleResponse.ok) {
      return utf8Json(
        {
          ok: false,
          stage: "gemini",
          status: googleResponse.status,
          error: data,
        },
        500
      );
    }

    const candidate = data.candidates?.[0];

    const answer =
      candidate?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() || "답변을 찾지 못했습니다.";

    const grounding = candidate?.groundingMetadata;

    const sources =
      grounding?.groundingChunks
        ?.filter((chunk) => chunk.web)
        .map((chunk) => ({
          title: chunk.web.title || "",
          url: chunk.web.uri || "",
          domain: chunk.web.domain || "",
        }))
        .filter((source) => source.url) || [];

    return utf8Json({
      ok: true,
      answer,
      googleSearchQueries:
        grounding?.webSearchQueries || [],
      sources,
      groundingSupports:
        grounding?.groundingSupports || [],
      searchSuggestion:
        grounding?.searchEntryPoint?.renderedContent || null,
    });
  } catch (error) {
    return utf8Json(
      {
        ok: false,
        stage: "authentication/server",
        error: error?.message || String(error),
      },
      500
    );
  }
}

function utf8Json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
