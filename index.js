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
    // 네이버 플레이스 링크나 주소 정보가 포함된 상위 검색결과 전달
    return JSON.stringify(response.data.organic.slice(0, 5));
  } catch (e) {
    return null;
  }
}

async function runNaverPlaceValidator() {
  console.log("🚀 [Team] 네이버 플레이스 실시간 영업 검증 모드 가동");

  const { data: existing } = await supabase.from("restaurants").select("name");
  const skipList = existing?.map((r) => r.name).join(", ") || "없음";

  for (let i = 1; i <= 5; i++) {
    try {
      // 1. 후보 선정 (흑백요리사 실존 셰프)
      const collector = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              '너는 흑백요리사 출연진 전문가야. 실제 출연이 확인된 유명 셰프 1명을 선정해. 형식: {"chef": "이름", "restaurant": "식당명"}',
          },
          {
            role: "user",
            content: `미등록 실존 출연자 1명 선정. 제외: [${skipList}]`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      const { chef, restaurant: hint } = JSON.parse(
        collector.choices[0].message.content,
      );

      // 2. 검색 쿼리를 '네이버 플레이스'로 타겟팅
      const searchResult = await getSearchData(
        `${hint} 네이버 플레이스 영업시간 주소`,
      );
      if (!searchResult) continue;

      // 3. 네이버 플레이스 정보 기반 엄격 검증
      const validator = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `너는 네이버 플레이스 데이터 검증관이야. 
          - 검색 결과에서 'map.naver.com' 링크나 실제 도로명 주소가 명확히 확인되는지 봐.
          - 특히 '영업 중', '영업 종료', '라스트오더' 등 실시간 영업 정보가 감지되면 실존 식당으로 간주하고 95점을 줘.
          - 블로그 후기만 있고 플레이스 정보가 없으면 0점을 줘.`,
          },
          {
            role: "user",
            content: `검색 데이터: ${searchResult}. 식당명: ${hint}. 네이버 플레이스 기준으로 영업 중인지 확인해서 JSON 생성해.`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(validator.choices[0].message.content);
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
            `✅ [Pass] 네이버 플레이스 검증 완료: ${restaurant.name}`,
          );
        }
      } else {
        console.warn(
          `⚠️ [Rejected] ${hint}: 네이버 플레이스 정보 불충분 (점수: ${result.confidence_score})`,
        );
      }
    } catch (err) {
      console.error(`❌ [Error]:`, err.message);
    }
  }
}

runNaverPlaceValidator();
