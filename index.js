import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import "dotenv/config";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

async function getSearchData(query) {
  try {
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
    return JSON.stringify(response.data.organic.slice(0, 3));
  } catch (e) {
    return "검색 결과 없음";
  }
}

async function runAIAgentLoop() {
  console.log("🚀 [System] 흑백요리사 전수 조사 및 실시간 검증 루프 시작...");

  const { data: existing } = await supabase.from("restaurants").select("name");
  const skipList = existing?.map((r) => r.name).join(", ") || "없음";

  for (let i = 1; i <= 5; i++) {
    console.log(`\n🔄 [Batch ${i}/5] 리서치 단계...`);

    try {
      // 1단계: 명확한 JSON 타겟 선정 (설명 금지 강제)
      const planner = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              '너는 흑백요리사 출연진 데이터 전문가야. 반드시 JSON으로만 답해. 형식: {"target": "셰프이름 식당이름"}',
          },
          {
            role: "user",
            content: `흑백요리사 시즌 1, 2 출연자 중 실존 식당을 운영하는 1명을 뽑아줘. 제외: [${skipList}]`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" }, // JSON 모드 강제
      });

      const targetJson = JSON.parse(planner.choices[0].message.content);
      const targetQuery = targetJson.target;
      console.log(`🎯 [Target] 선정된 대상: ${targetQuery}`);

      // 2단계: 실시간 검색
      const searchResult = await getSearchData(
        `${targetQuery} 주소 메뉴 영업시간`,
      );

      // 3단계: 최종 데이터 정제 및 검증
      const finalCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `너는 제공된 검색 데이터를 DB 스키마에 맞게 정제하는 전문가야. 
            반드시 다음 JSON 형식을 엄격히 지켜. 설명이나 인사말은 절대 금지야.
            {
              "restaurant": { "name": "...", "category": "...", "address": "...", "lng": 0.0, "lat": 0.0, "image_url": "...", "menu_info": {}, "opening_hours": {} },
              "source": { "name": "흑백요리사 시즌1 또는 시즌2", "type": "TV", "video_url": "...", "video_title": "...", "thumbnail_url": "...", "vod_url": "..." }
            }`,
          },
          {
            role: "user",
            content: `검색 데이터: ${searchResult}. 이 정보를 바탕으로 실존 여부를 검증하여 JSON을 생성해.`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      const finalData = JSON.parse(finalCompletion.choices[0].message.content);
      const { restaurant, source } = finalData;

      // 4단계: DB 저장
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
            video_url:
              source.video_url || `https://generated-url-${Date.now()}`,
            title: source.video_title || `${restaurant.name} 출연 영상`,
          },
          { onConflict: "video_url" },
        );
        console.log(`✅ [Success] ${restaurant.name} 저장 완료!`);
      }
    } catch (err) {
      console.error(`❌ [Error] ${i}번째 실패:`, err.message);
    }
  }
}

runAIAgentLoop();
