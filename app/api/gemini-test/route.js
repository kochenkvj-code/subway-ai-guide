import { getVercelOidcToken } from "@vercel/oidc";
import { ExternalAccountClient } from "google-auth-library";

export const runtime = "nodejs";

export async function GET() {
  try {
    const projectId = process.env.GCP_PROJECT_ID;
    const projectNumber = process.env.GCP_PROJECT_NUMBER;
    const serviceAccount = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
    const poolId = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
    const providerId =
      process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;

    if (
      !projectId ||
      !projectNumber ||
      !serviceAccount ||
      !poolId ||
      !providerId
    ) {
      return Response.json(
        {
          ok: false,
          stage: "environment",
          error: "GCP 환경변수가 누락되었습니다.",
        },
        { status: 500 }
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

    const url =
      `https://aiplatform.googleapis.com/v1/projects/${projectId}` +
      `/locations/global/publishers/google/models/` +
      `gemini-3.5-flash-lite:generateContent`;

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
            parts: [
              {
                text:
                  "종로5가역 수유실은 어디에 있나요? " +
                  "Google 검색을 이용해서 확인한 뒤 " +
                  "승객에게 3문장 이내로 간단하게 안내하세요. " +
                  "확실하지 않은 정보는 추측하지 마세요.",
              },
            ],
          },
        ],

        tools: [
          {
            googleSearch: {},
          },
        ],

        generationConfig: {
          maxOutputTokens: 300,
        },
      }),
    });

    const buffer = await googleResponse.arrayBuffer();
    const responseText = new TextDecoder("utf-8").decode(buffer);
    const data = JSON.parse(responseText);

    if (!googleResponse.ok) {
      return Response.json(
        {
          ok: false,
          stage: "gemini",
          status: googleResponse.status,
          details: data,
        },
        { status: 500 }
      );
    }

    const candidate = data.candidates?.[0];

    const answer =
      candidate?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() || "답변을 찾지 못했습니다.";

    const grounding = candidate?.groundingMetadata;

    return new Response(
      JSON.stringify({
        ok: true,
        answer,
        googleSearchQueries:
          grounding?.webSearchQueries || [],
        sources:
          grounding?.groundingChunks || [],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        stage: "authentication/server",
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
