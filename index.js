import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

async function runVerifiedAITeam() {
  console.log("🚀 [System] 시즌별 데이터 수집 및 ID 검증 프로세스 시작...");

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `너는 대한민국 식당 정보 검증 전문가야.
          1. 실존 여부 확인: 2024년 이후 방송된 식당만 찾아.
          2. 시즌 구분: 해당 식당이 '흑백요리사 시즌1' 출연진인지 '흑백요리사 시즌2' 출연진인지 명확히 판별해.
          3. 소스 이름 통일: 소스 이름은 반드시 '흑백요리사 시즌1' 또는 '흑백요리사 시즌2' 중 하나로 지정해.
          4. 형식 엄수: JSON 규격을 지키고 sources.type은 'TV'로 설정해.`,
        },
        {
          role: "user",
          content:
            "흑백요리사 시즌1 또는 시즌2 출연진의 실제 운영 중인 유명 식당 1곳의 정보를 생성해줘.",
        },
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const rawContent = chatCompletion.choices[0].message.content;
    const { restaurant, source } = JSON.parse(rawContent);

    console.log(
      `🔍 [Debug] AI 선정: ${restaurant.name} (출연: ${source.name})`,
    );

    // 1. 소스(시즌 정보) ID 가져오기 또는 생성
    // 이름이 정확히 일치하는 기존 소스가 있는지 먼저 확인합니다.
    const { data: srcData, error: srcErr } = await supabase
      .from("sources")
      .upsert({ name: source.name, type: source.type }, { onConflict: "name" })
      .select("id, name")
      .single();

    if (srcErr)
      return console.error("❌ [Error] 소스 처리 실패:", srcErr.message);
    console.log(
      `✅ [Step 1] 소스 확인 완료: ${srcData.name} (ID: ${srcData.id})`,
    );

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
      .select("id, name")
      .single();

    if (resErr)
      return console.error("❌ [Error] 식당 저장 실패:", resErr.message);
    console.log(
      `✅ [Step 2] 식당 확인 완료: ${resData.name} (ID: ${resData.id})`,
    );

    // 3. 출연 정보(Appearances) 연결
    // 위에서 가져온 resData.id와 srcData.id를 사용하여 관계를 맺습니다.
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
        `🎊 [Success] ${resData.name} 데이터가 ${srcData.name}에 성공적으로 연결되었습니다.`,
      );
    }
  } catch (err) {
    console.error("🚨 [Critical Error]:", err.message);
  }
}

runVerifiedAITeam();
