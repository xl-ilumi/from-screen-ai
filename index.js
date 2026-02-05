import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

// 환경 변수 설정
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

async function runAITeam() {
  // 1. AI에게 정보 수집 요청 (Llama 3 모델 사용)
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "너는 흑백요리사 식당 정보를 수집하는 에이전트야. 반드시 JSON 형식으로 답변해.",
      },
      {
        role: "user",
        content: "최근 방송된 흑백요리사 식당 1곳과 관련 유튜브 URL을 찾아줘.",
      },
    ],
    model: "llama-3.3-70b-versatile", // Groq에서 제공하는 고성능 모델
    response_format: { type: "json_object" },
  });

  const data = JSON.parse(chatCompletion.choices[0].message.content);

  // 2. 데이터베이스 저장 (이미지 스키마 기준)
  // restaurants 테이블 저장 (이름 중복 시 업데이트)
  const { data: restaurant } = await supabase
    .from("restaurants")
    .upsert({ name: data.name, address: data.address }, { onConflict: "name" })
    .select()
    .single();

  if (restaurant) {
    console.log(`✅ ${restaurant.name} 정보 저장 완료!`);
  }
}

runAITeam();
