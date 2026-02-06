import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import "dotenv/config";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

// Google 검색 API (Serper) 호출 함수
async function getSearchData(query) {
  const response = await axios.post(
    "https://google.serper.dev/search",
    { q: query, gl: "kr", hl: "ko" },
    {
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
    },
  );
  return JSON.stringify(response.data.organic.slice(0, 3)); // 상위 3개 결과만 추출
}

async function runAIAgentLoop() {
  console.log("🚀 [System] 5인 루프 리서치 및 실시간 검증 시작...");

  // 1. 이미 DB에 등록된 식당 이름을 가져와 중복 수집 방지
  const { data: existing } = await supabase.from("restaurants").select("name");
  const skipList = existing?.map((r) => r.name).join(", ") || "없음";

  for (let i = 1; i <= 5; i++) {
    console.log(`\n🔄 [Batch ${i}/5] 리서치 진행 중...`);

    try {
      // 2. AI에게 특정 셰프 1명 선정 요청 (이미 있는 곳은 제외)
      const planner = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: `흑백요리사 시즌1, 2 출연진 중 다음 식당을 제외하고 실존하는 유명 식당 1곳과 셰프 이름을 선정해줘. 제외 리스트: [${skipList}]`,
          },
        ],
        model: "llama-3.3-70b-versatile",
      });
      const target = planner.choices[0].message.content;

      // 3. 실제 Google 검색 수행 (할루시네이션 방지 교차 검증)
      const searchResult = await getSearchData(`${target} 식당 주소 영업시간`);
      console.log(`🌐 [Search] ${target} 검색 데이터 확보 완료`);

      // 4. 검색 데이터를 바탕으로 최종 JSON 생성
      const finalCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "너는 제공된 검색 데이터를 바탕으로 식당 정보를 정제하는 전문가야. 검색 결과에 없는 가짜 정보는 절대 지어내지 마.",
          },
          {
            role: "user",
            content: `검색 데이터: ${searchResult}. 이 데이터를 바탕으로 다음 스키마에 맞춰 JSON을 작성해. 소스명은 '흑백요리사 시즌1' 또는 '흑백요리사 시즌2'로 명시해.`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      const { restaurant, source } = JSON.parse(
        finalCompletion.choices[0].message.content,
      );

      // 5. DB 저장 (기존과 동일한 UPSERT 로직)
      const { data: srcData } = await supabase
        .from("sources")
        .upsert({ name: source.name, type: "TV" }, { onConflict: "name" })
        .select()
        .single();
      const { data: resData } = await supabase
        .from("restaurants")
        .upsert(
          {
            name: restaurant.name,
            category: restaurant.category,
            address: restaurant.address,
            location: `POINT(${restaurant.lng} ${restaurant.lat})`,
            menu_info: restaurant.menu_info,
            opening_hours: restaurant.opening_hours,
            image_url: restaurant.image_url,
          },
          { onConflict: "name" },
        )
        .select()
        .single();

      if (resData && srcData) {
        await supabase.from("appearances").upsert(
          {
            restaurant_id: resData.id,
            source_id: srcData.id,
            video_url: source.video_url,
            title: source.video_title,
          },
          { onConflict: "video_url" },
        );
        console.log(
          `✅ [Success] ${i}번째 데이터 저장 완료: ${restaurant.name}`,
        );
      }
    } catch (err) {
      console.error(`❌ [Error] ${i}번째 루프 실패:`, err.message);
    }
  }
}

runAIAgentLoop();
