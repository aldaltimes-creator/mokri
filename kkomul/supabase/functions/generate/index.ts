// 꼬물상자: 기록 하나로 동화 또는 노래 가사를 만드는 Supabase Edge Function
//
// 요청: POST { record_id: string, kind: "story" | "song" }  (Authorization: 로그인한 사용자의 토큰)
// 흐름: start_creation(남은 횟수 확인 + pending 행) → Claude 호출 → finish_creation(결과 저장)
// 필요한 비밀값: ANTHROPIC_API_KEY  (supabase secrets set ANTHROPIC_API_KEY=...)
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const anthropic = new Anthropic(); // ANTHROPIC_API_KEY 환경 변수를 읽어요

// 아이 나이(개월)를 대략 계산
function ageInMonths(birth: string | null): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  const n = new Date();
  return (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth());
}

const SYSTEM = `당신은 0~7세 아이를 위한 한국어 그림책 작가이자 동요 작사가입니다.
부모가 남긴 하루 기록을 바탕으로, 그 아이가 주인공인 짧은 동화나 노래 가사를 씁니다.

지켜 주세요:
- 아이 이름을 주인공으로 부르고, 아이가 좋아하는 것(캐릭터, 사물, 색)을 이야기의 친구나 도구로 등장시킵니다.
- 기록에 '요즘 힘들어하는 것'이 있으면, 아이가 좋아하는 것을 통해 그 일을 즐겁게 해 보고 싶어지도록 풀어냅니다. 겁주거나 혼내는 표현, 부끄럽게 만드는 표현은 쓰지 않습니다.
- 기록에 나온 실제 장소, 사람, 아이가 한 말을 자연스럽게 살립니다. 기록에 없는 가족 구성원이나 사건을 지어내지 않습니다.
- 아이 나이에 맞는 쉬운 낱말과 짧은 문장을 씁니다. 의성어·의태어를 즐겨 씁니다.
- 폭력, 공포, 위험한 행동을 따라 하게 만드는 내용은 넣지 않습니다.
- 부모가 소리 내어 읽어 주기 좋게, 리듬감 있게 씁니다.`;

const STORY_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "동화 제목, 20자 이내" },
    pages: {
      type: "array",
      description: "4~6쪽. 한 쪽에 1~3문장.",
      items: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "pages"],
  additionalProperties: false,
};

const SONG_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "노래 제목, 20자 이내" },
    mood: { type: "string", description: "분위기 한마디. 예: 신나게, 잔잔하게, 자장가" },
    lines: {
      type: "array",
      description: "가사 8줄. 반복되는 후렴을 넣어 따라 부르기 쉽게.",
      items: { type: "string" },
    },
  },
  required: ["title", "mood", "lines"],
  additionalProperties: false,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST만 받아요" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "로그인이 필요해요" }, 401);

  // 사용자 권한 그대로 DB를 쓰는 클라이언트 (RLS 적용)
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  let body: { record_id?: string; kind?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "요청 형식이 올바르지 않아요" }, 400);
  }
  const { record_id, kind } = body;
  if (!record_id || (kind !== "story" && kind !== "song")) {
    return json({ error: "record_id 와 kind(story|song)가 필요해요" }, 400);
  }

  // 1) 남은 횟수 확인 + pending 행 만들기
  const { data: creationId, error: startErr } = await supabase.rpc("start_creation", {
    p_record: record_id,
    p_kind: kind,
  });
  if (startErr) {
    if (startErr.message.includes("NO_PLAN")) return json({ error: "이용권이 없어요. 요금제를 먼저 골라 주세요.", code: "NO_PLAN" }, 402);
    if (startErr.message.includes("NO_CREDIT")) return json({ error: "이번 기간에 만들 수 있는 횟수를 모두 썼어요.", code: "NO_CREDIT" }, 402);
    return json({ error: startErr.message }, 400);
  }

  const fail = async (message: string, status = 502) => {
    await supabase.rpc("finish_creation", { p_id: creationId, p_title: null, p_content: null, p_error: message });
    return json({ error: message, creation_id: creationId }, status);
  };

  // 2) 기록과 아이 정보 읽기
  const { data: record, error: recErr } = await supabase
    .from("records")
    .select("record_date, title, happened, child_words, worry, children(name, birth_date, likes, family_call)")
    .eq("id", record_id)
    .single();
  if (recErr || !record) return fail("기록을 읽지 못했어요", 404);

  const child = record.children as unknown as {
    name: string; birth_date: string | null; likes: string[]; family_call: string | null;
  };
  const months = ageInMonths(child.birth_date);
  const brief = [
    `아이 이름: ${child.name}`,
    months !== null ? `나이: ${months}개월` : null,
    child.likes?.length ? `좋아하는 것: ${child.likes.join(", ")}` : null,
    child.family_call ? `가족 호칭: ${child.family_call}` : null,
    `기록 날짜: ${record.record_date}`,
    `기록 제목: ${record.title}`,
    `오늘 있었던 일: ${record.happened}`,
    record.child_words ? `아이가 한 말: ${record.child_words}` : null,
    record.worry ? `요즘 힘들어하는 것: ${record.worry}` : null,
  ].filter(Boolean).join("\n");

  const task = kind === "story"
    ? "이 기록으로 아이가 주인공인 그림책 동화를 4~6쪽으로 써 주세요."
    : "이 기록으로 아이가 주인공인 노래 가사를 8줄로 써 주세요. 아이가 따라 부르기 쉽게 반복되는 후렴을 넣어 주세요.";

  // 3) Claude 호출 (구조화된 JSON 출력, 거절 시 서버 측 대체 모델로 다시 시도)
  let parsed: { title: string; pages?: { text: string }[]; mood?: string; lines?: string[] };
  try {
    const response = await anthropic.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: kind === "story" ? STORY_SCHEMA : SONG_SCHEMA },
      },
      system: SYSTEM,
      messages: [{ role: "user", content: `${brief}\n\n${task}` }],
    });

    if (response.stop_reason === "refusal") return fail("이 기록으로는 만들 수 없어요. 내용을 조금 바꿔 다시 시도해 주세요.", 422);
    if (response.stop_reason === "max_tokens") return fail("글이 너무 길어져 멈췄어요. 다시 시도해 주세요.");

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    parsed = JSON.parse(text);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return fail("지금 요청이 많아요. 잠시 뒤 다시 시도해 주세요.", 429);
    if (err instanceof Anthropic.AuthenticationError) return fail("AI 키 설정을 확인해 주세요.", 500);
    if (err instanceof Anthropic.APIError) return fail(`AI 응답 오류 (${err.status})`);
    if (err instanceof SyntaxError) return fail("AI 응답을 읽지 못했어요. 다시 시도해 주세요.");
    return fail("만드는 중에 문제가 생겼어요.");
  }

  const content = kind === "story"
    ? { pages: (parsed.pages ?? []).slice(0, 8) }
    : { mood: parsed.mood ?? "", lines: (parsed.lines ?? []).slice(0, 12) };

  // 4) 결과 저장
  const { error: finErr } = await supabase.rpc("finish_creation", {
    p_id: creationId,
    p_title: (parsed.title ?? "").slice(0, 40),
    p_content: content,
    p_error: null,
  });
  if (finErr) return json({ error: finErr.message }, 500);

  return json({ creation_id: creationId });
});
