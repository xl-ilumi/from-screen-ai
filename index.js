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
    return JSON.stringify(response.data.organic.slice(0, 5));
  } catch (e) {
    return null;
  }
}

async function runDualAgentWithConsoleLog() {
  console.log("🚀 [Team] AI 상호 검증 팀 가동 (저장 vs 로그 분리)");

  const { data: existing } = await supabase.from("restaurants").select("name");
  const skipList = existing?.map((r) => r.name).join(", ") || "없음";

  for (let i = 1; i <= 5; i++) {
    try {
      // [Agent 1: Collector] 후보 발굴
      const collector = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              '흑백요리사 출연진 리서처. JSON 형식: {"chef": "이름", "restaurant": "식당명"}',
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
      const searchResult = await getSearchData(
        `${chef} ${hint} 흑백요리사 출연 식당`,
      );
      if (!searchResult) continue;

      // [Agent 2: Validator] 비판적 검토
      const validator = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              '엄격한 데이터 검증관. 85점 미만은 반드시 사유 작성. JSON: {"data": {...}, "confidence_score": 점수, "reason": "이유"}',
          },
          {
            role: "user",
            content: `검색 데이터: ${searchResult}. 이 정보의 실존 여부를 점수로 매겨.`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      const {
        data: finalData,
        confidence_score,
        reason,
      } = JSON.parse(validator.choices[0].message.content);

      if (confidence_score >= 85) {
        // ✅ [Pass] DB 저장
        const { restaurant, source } = finalData;
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
              video_url: source.video_url,
              title: source.video_title,
            },
            { onConflict: "video_url" },
          );
          console.log(
            `✅ [Pass] ${restaurant.name} (${confidence_score}점) 저장 완료`,
          );
        }
      } else {
        // ⚠️ [Rejected] 콘솔에 상세 로그 출력
        console.log("--------------------------------------------------");
        console.warn(`⚠️ [Rejected] 대상: ${chef}`);
        console.warn(`📊 신뢰도 점수: ${confidence_score}점`);
        console.warn(`🧐 탈락 사유: ${reason}`);
        console.log("--------------------------------------------------");
      }
    } catch (err) {
      console.error(`❌ [Error] 시스템 에러:`, err.message);
    }
  }
}

runDualAgentWithConsoleLog();
