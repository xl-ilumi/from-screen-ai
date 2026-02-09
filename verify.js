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
    console.warn(
      `⚠️ [Serper Error] 검색 데이터를 가져오는 데 실패했습니다: ${e.message}`,
    );
    return null;
  }
}

async function verifyExistingData() {
  console.log("🔍 [Verifier] 기존 데이터 검증 엔진 가동");

  // 1. 검증이 필요한 데이터 가져오기 (승인된 데이터 중 최신 순 또는 랜덤)
  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("is_approved", true)
    .limit(10);

  if (error || !restaurants) {
    console.error("❌ [Error] 데이터를 불러올 수 없습니다:", error?.message);
    return;
  }

  for (const res of restaurants) {
    try {
      console.log(`\n🧐 [Checking] ${res.name} (현재 주소: ${res.address})`);

      const query = `${res.name} ${res.address} 영업정보 도로명주소`;
      const searchResult = await getSearchData(query);
      if (!searchResult) continue;

      const checker = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `너는 데이터 무결성을 검사하는 전문 검증가야. 반드시 JSON으로 답해.
            [검증 기준]
            1. name: 식당 이름에서 '흑백요리사', '셰프' 같은 태그가 빠진 순수 공식 명칭인가?
            2. address: 시/도 명칭만 있는 게 아니라 상세 도로명 주소인가?
            3. is_open: 현재 영업 중인 식당인가? (검색 결과 기반)
            
            [출력 JSON 스키마]
            {
              "is_valid": true/false (이름과 주소가 모두 적절한 경우만 true),
              "corrected_data": {
                "name": "수정된 공식 이름",
                "address": "수정된 상세 주소"
              },
              "is_open": true/false,
              "reason": "부적절하거나 수정이 필요한 이유"
            }`,
          },
          {
            role: "user",
            content: `식당명: ${res.name}, 주소: ${res.address}. 검색결과: ${searchResult}`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(checker.choices[0].message.content);
      const usage = checker.usage;
      console.log(
        `📊 [Tokens] Input: ${usage.prompt_tokens}, Output: ${usage.completion_tokens}, Total: ${usage.total_tokens}`,
      );

      if (!result.is_valid || !result.is_open) {
        console.warn(`⚠️ [Issue Found] ${res.name}: ${result.reason}`);

        // 데이터 업데이트
        const updateData = {
          name: result.corrected_data?.name || res.name,
          address: result.corrected_data?.address || res.address,
          is_approved: result.is_open && result.is_valid, // 둘 다 만족해야 승인 유지
        };

        const { error: updateError } = await supabase
          .from("restaurants")
          .update(updateData)
          .eq("id", res.id);

        if (!updateError) {
          console.log(`✅ [Updated] 데이터가 정정되거나 비활성화되었습니다.`);
        }
      } else {
        console.log(`✨ [Verified] 데이터가 정확합니다.`);
      }
    } catch (err) {
      console.error(`❌ [Error at ${res.name}]:`, err.message);
    }
  }
}

verifyExistingData();
