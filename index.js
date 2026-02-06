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
    // 상위 5개 결과 전달 (네이버 플레이스 정보 포함 확률 높임)
    return JSON.stringify(response.data.organic.slice(0, 5));
  } catch (e) {
    return null;
  }
}

async function runNaverPlaceAgent() {
  console.log("🚀 [Team] 네이버 플레이스 기반 실시간 영업 검증 시작...");

  const { data: existing } = await supabase.from("restaurants").select("name");
  const skipList = existing?.map((r) => r.name).join(", ") || "없음";

  for (let i = 1; i <= 5; i++) {
    try {
      // 1. 후보 선정 (JSON 키워드 포함)
      const collector = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "너는 흑백요리사 출연진 전문가야. 실제 출연 셰프 1명을 선정하여 반드시 JSON 형식으로 출력해.",
          },
          {
            role: "user",
            content: `미등록 실존 출연자 1명 선정(제외: [${skipList}]). 형식: {"chef": "이름", "restaurant": "식당명"}`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      const { chef, restaurant: hint } = JSON.parse(
        collector.choices[0].message.content,
      );
      console.log(`🎯 [Target] 검증 대상: ${chef} (${hint})`);

      // 2. 네이버 플레이스 타겟 검색
      const searchResult = await getSearchData(
        `${hint} 네이버 플레이스 영업중`,
      );
      if (!searchResult) continue;

      // 3. 네이버 플레이스 기반 엄격 검증 (JSON 키워드 포함)
      const validator = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `너는 네이버 플레이스 검증관이야. 
          - 검색 결과에서 'map.naver.com' 링크와 실제 영업 상태(영업 중, 라스트오더 등)를 확인해.
          - 실존하고 영업 중임이 확실하면 95점 이상을 줘.
          - 모든 출력은 반드시 JSON 형식을 따라야 해.`,
          },
          {
            role: "user",
            content: `검색 데이터: ${searchResult}. 식당명: ${hint}. 위 정보를 바탕으로 다음 JSON을 생성해:
          { "data": { "restaurant": { "name": "...", "address": "...", "lng": 0.0, "lat": 0.0, "category": "...", "menu_info": {}, "opening_hours": {} }, "source": { "name": "흑백요리사 시즌1 또는 2", "video_url": "..." } }, "confidence_score": 점수, "reason": "이유" }`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(validator.choices[0].message.content);

      // [Decision] 네이버 플레이스 신뢰도 90점 이상만 통과
      if (result.confidence_score >= 90) {
        const { restaurant, source } = result.data;

        const { data: resData } = await supabase
          .from("restaurants")
          .upsert(
            {
              name: restaurant.name,
              category: restaurant.category,
              address: restaurant.address,
              location: `POINT(${restaurant.lng} ${restaurant.lat})`,
              image_url: restaurant.image_url,
              menu_info: restaurant.menu_info,
              opening_hours: restaurant.opening_hours,
              is_approved: true,
            },
            { onConflict: "name" },
          )
          .select()
          .single();

        if (resData) {
          const { data: srcData } = await supabase
            .from("sources")
            .upsert({ name: source.name, type: "TV" }, { onConflict: "name" })
            .select()
            .single();
          await supabase.from("appearances").upsert(
            {
              restaurant_id: resData.id,
              source_id: srcData.id,
              video_url:
                source.video_url ||
                `https://map.naver.com/search/${restaurant.name}`,
              title: source.video_title || `${restaurant.name} 출연 정보`,
            },
            { onConflict: "video_url" },
          );

          console.log(
            `✅ [Pass] 네이버 플레이스 실시간 영업 확인: ${restaurant.name}`,
          );
        }
      } else {
        console.warn(
          `⚠️ [Rejected] ${hint} (점수: ${result.confidence_score}): ${result.reason}`,
        );
      }
    } catch (err) {
      console.error(`❌ [Error]:`, err.message);
    }
  }
}

runNaverPlaceAgent();
