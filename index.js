import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

async function runVerifiedAITeam() {
  console.log("🚀 [System] 데이터 수집 및 검증 프로세스 시작...");

  try {
    // 1. AI에게 데이터 요청
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `너는 대한민국 식당 정보 검증 전문가야. 다음 원칙을 지켜:
          1. 실존 여부 확인: 2024년 이후 방송된 식당만 찾아.
          2. 할루시네이션 금지: '온앤온', '온정' 등 가짜 데이터는 절대 제외.
          3. 형식 엄수: JSON 규격을 지키고 sources.type은 'YOUTUBE' 또는 'TV'로만 응답해.`,
        },
        {
          role: "user",
          content:
            "흑백요리사 출연진의 실제 운영 중인 유명 식당 1곳의 상세 정보를 생성해줘.",
        },
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    // [DEBUG] AI가 내뱉은 날것의 응답 확인
    const rawContent = chatCompletion.choices[0].message.content;
    console.log("🤖 [AI Raw Response]:", rawContent);

    const { restaurant, source } = JSON.parse(rawContent);

    // [DEBUG] 파싱된 식당 및 소스 정보 확인
    console.log("-----------------------------------------");
    console.log(`식당명: ${restaurant.name}`);
    console.log(`주소: ${restaurant.address}`);
    console.log(`카테고리: ${restaurant.category}`);
    console.log(`방송정보: ${source.name} (${source.type})`);
    console.log("-----------------------------------------");

    // 2. 식당 저장
    const { data: resData, error: resErr } = await supabase
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

    if (resErr) {
      console.error("❌ [Error] 식당 저장 실패:", resErr.message);
      return;
    }
    console.log(`✅ [Step 1] 식당(${restaurant.name}) DB 저장/업데이트 완료`);

    // 3. 소스 저장
    const { data: srcData, error: srcErr } = await supabase
      .from("sources")
      .upsert({ name: source.name, type: source.type }, { onConflict: "name" })
      .select()
      .single();

    if (srcErr) {
      console.error("❌ [Error] 소스 저장 실패:", srcErr.message);
      return;
    }
    console.log(`✅ [Step 2] 소스(${source.name}) DB 저장/업데이트 완료`);

    // 4. 출연 정보 연결
    if (resData && srcData) {
      const { error: appErr } = await supabase.from("appearances").upsert(
        {
          restaurant_id: resData.id,
          source_id: srcData.id,
          title: source.video_title,
          video_url: source.video_url,
          thumbnail_url: source.thumbnail_url,
          vod_url: source.vod_url,
        },
        { onConflict: "video_url" },
      );

      if (appErr) {
        console.error("❌ [Error] 출연 정보 연결 실패:", appErr.message);
      } else {
        console.log(
          "🎊 [Success] 모든 데이터가 성공적으로 관계형으로 연결되었습니다.",
        );
      }
    }
  } catch (err) {
    console.error("🚨 [Critical Error] 예기치 못한 에러 발생:", err.message);
  }
}

runVerifiedAITeam();
