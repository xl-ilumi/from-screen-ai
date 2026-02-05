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
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `너는 식당 정보를 수집하는 에이전트야. 
        반드시 아래 JSON 형식을 지켜서 답변해:
        {
          "name": "식당이름",
          "address": "식당주소"
        }`,
      },
      {
        role: "user",
        content:
          "흑백요리사에 출연한 셰프의 식당 1곳을 추천하고 주소를 알려줘.",
      },
    ],
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
  });

  // AI가 보낸 원본 텍스트 확인 (디버깅용)
  const rawContent = chatCompletion.choices[0].message.content;
  console.log("🤖 AI 원본 응답:", rawContent);

  const data = JSON.parse(rawContent);

  console.log("-----------------------------------------");
  console.log("🔍 추출된 데이터:");
  console.log(`식당명: ${data.name}`);
  console.log(`주소: ${data.address}`);
  console.log("-----------------------------------------");

  // 데이터가 정상일 때만 DB 저장 시도
  if (!data.name || !data.address) {
    console.error("❌ AI가 유효한 데이터를 생성하지 못했습니다.");
    return;
  }

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .upsert({ name: data.name, address: data.address }, { onConflict: "name" })
    .select()
    .single();

  if (error) {
    console.error("❌ 데이터 저장 중 에러 발생:", error.message);
  } else if (restaurant) {
    console.log(`✅ ${restaurant.name} 정보 저장 완료!`);
  }
}

runAITeam();
