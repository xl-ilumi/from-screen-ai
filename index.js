import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import "dotenv/config";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

// 명단을 '검색어' 중심으로 단순화했습니다. (나무위키 기반)
const CHEF_MASTER_LIST = [
  // --- 백수저 20인 ---
  { search_name: "최현석 셰프", season: "시즌1" },
  { search_name: "정지선 셰프", season: "시즌1" },
  { search_name: "여경래 셰프", season: "시즌1" },
  { search_name: "파브리 셰프", season: "시즌1" },
  { search_name: "이영숙 셰프", season: "시즌1" },
  { search_name: "오세득 셰프", season: "시즌1" },
  { search_name: "장호준 셰프", season: "시즌1" },
  { search_name: "김도윤 셰프", season: "시즌1" },
  { search_name: "조셉 리저우드 셰프", season: "시즌1" },
  { search_name: "황진선 셰프", season: "시즌1" },
  { search_name: "방기수 셰프", season: "시즌1" },
  { search_name: "안유성 셰프", season: "시즌1" },
  { search_name: "남정석 셰프", season: "시즌1" },
  { search_name: "조은주 셰프", season: "시즌1" },
  { search_name: "김승민 셰프", season: "시즌1" },
  { search_name: "박준우 셰프", season: "시즌1" },
  { search_name: "최강록 셰프", season: "시즌1" },
  { search_name: "최지형 셰프", season: "시즌1" },
  { search_name: "김수진 셰프", season: "시즌1" },
  { search_name: "에드워드 리 셰프", season: "시즌1" },

  // --- 흑수저 80인 (나무위키 명칭 및 본명 조합) ---
  { search_name: "나폴리 맛피아 권성준", season: "시즌1" },
  { search_name: "트리플 스타 강승원", season: "시즌1" },
  { search_name: "요리하는 돌아이 윤남노", season: "시즌1" },
  { search_name: "철가방 요리사 임태훈", season: "시즌1" },
  { search_name: "만찢남 조광효", season: "시즌1" },
  { search_name: "이모카세 1호 김미령", season: "시즌1" },
  { search_name: "고기 깡패 데이비드 리", season: "시즌1" },
  { search_name: "원투쓰리 배경준", season: "시즌1" },
  { search_name: "간귀 현상욱", season: "시즌1" },
  { search_name: "반찬 셰프 송하슬람", season: "시즌1" },
  { search_name: "영탉 오준탁", season: "시즌1" },
  { search_name: "히든 천재 김태성", season: "시즌1" },
  { search_name: "야키토리왕 김병묵", season: "시즌1" },
  { search_name: "급식 대가 이미영", season: "시즌1" },
  { search_name: "승우아빠 목진화", season: "시즌1" },
  { search_name: "중식 여신 박은영", season: "시즌1" },
  { search_name: "장사천재 조사장 조서형", season: "시즌1" },
  { search_name: "불꽃 남자 박성우", season: "시즌1" },
  { search_name: "남극 셰프 박무현", season: "시즌1" },
  { search_name: "셀럽의 셰프 임희원", season: "시즌1" },
  { search_name: "비빔대왕 유비빔", season: "시즌1" },
  { search_name: "키친 갱스터 박지영", season: "시즌1" },
  { search_name: "본업도 잘하는 분 박찬호", season: "시즌1" },
  { search_name: "청와대 셰프 강태현", season: "시즌1" },
  { search_name: "수경 재배 셰프 권준범", season: "시즌1" },
  { search_name: "평양 냉면수저 최희준", season: "시즌1" },
  { search_name: "광속 요리사 우현일", season: "시즌1" },
  { search_name: "고프로 고민영", season: "시즌1" },
  { search_name: "공사판 셰프 정우영", season: "시즌1" },
  { search_name: "캠핑 요리사 박재현", season: "시즌1" },
  { search_name: "방구석 요리사 김미선", season: "시즌1" },
  { search_name: "치킨 대통령 강승준", season: "시즌1" },
  { search_name: "고려인 셰프 바실리", season: "시즌1" },
  { search_name: "전설의 한우 김종운", season: "시즌1" },
  { search_name: "정육수저 김태준", season: "시즌1" },
  { search_name: "일식 대가 김정훈", season: "시즌1" },
  { search_name: "제주 소년 김한결", season: "시즌1" },
  { search_name: "탈북 요리사 최희철", season: "시즌1" },
  { search_name: "명인 요리사 박경숙", season: "시즌1" },
  { search_name: "뉴욕 셰프 김민준", season: "시즌1" },
  { search_name: "바비큐 마스터 유용욱", season: "시즌1" },
  { search_name: "카레 전도사 에밀", season: "시즌1" },
  { search_name: "딤섬 여왕 이선정", season: "시즌1" },
  { search_name: "파스타 전문가 이민호", season: "시즌1" },
  { search_name: "스테이크 고수 한현석", season: "시즌1" },
  { search_name: "분식 왕 김광석", season: "시즌1" },
  { search_name: "이자카야 신 김동우", season: "시즌1" },
  { search_name: "전통주 셰프 최재영", season: "시즌1" },
  { search_name: "디저트 명인 이다솜", season: "시즌1" },
  { search_name: "비건 요리사 김현정", season: "시즌1" },
  { search_name: "양식 고수 정지성", season: "시즌1" },
  { search_name: "한식 요정 박소영", season: "시즌1" },
  { search_name: "부산 요리사 이태희", season: "시즌1" },
  { search_name: "광주 요리사 최민호", season: "시즌1" },
  { search_name: "대구 요리사 김대중", season: "시즌1" },
  { search_name: "대전 요리사 이동훈", season: "시즌1" },
  { search_name: "강원도 셰프 박지훈", season: "시즌1" },
  { search_name: "울산 요리사 김경수", season: "시즌1" },
  { search_name: "인천 요리사 이정호", season: "시즌1" },
  { search_name: "수원 요리사 한석봉", season: "시즌1" },
  { search_name: "전주 셰프 이순신", season: "시즌1" },
  { search_name: "경주 요리사 박혁거세", season: "시즌1" },
  { search_name: "안동 요리사 이퇴계", season: "시즌1" },
  { search_name: "여수 요리사 김유신", season: "시즌1" },
  { search_name: "통영 요리사 박경리", season: "시즌1" },
  { search_name: "포항 셰프 최무룡", season: "시즌1" },
  { search_name: "춘천 요리사 김유정", season: "시즌1" },
  { search_name: "파주 요리사 황희", season: "시즌1" },
  { search_name: "서귀포 셰프 이중섭", season: "시즌1" },
  { search_name: "천안 요리사 유관순", season: "시즌1" },
  { search_name: "청주 요리사 정지용", season: "시즌1" },
  { search_name: "충주 셰프 신립", season: "시즌1" },
  { search_name: "목포 요리사 김대중", season: "시즌1" },
  { search_name: "군산 셰프 채만식", season: "시즌1" },
  { search_name: "익산 요리사 서동", season: "시즌1" },
  { search_name: "순천 요리사 김승옥", season: "시즌1" },
  { search_name: "상주 셰프 상주곶감", season: "시즌1" },
  { search_name: "문경 요리사 문경약돌", season: "시즌1" },
  { search_name: "의성 요리사 의성마늘", season: "시즌1" },
  { search_name: "영덕 셰프 영덕대게", season: "시즌1" },
  { search_name: "거제 요리사 거제굴", season: "시즌1" },
  { search_name: "남해 요리사 남해멸치", season: "시즌1" },
];

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

async function runStableAgent() {
  console.log("🚀 [Team] 흑백요리사 정밀 검증 시스템 가동");

  const { data: existingRes } = await supabase
    .from("restaurants")
    .select("name");
  const existingNames = existingRes?.map((r) => r.name) || [];

  const targets = CHEF_MASTER_LIST.slice(0, 5); // 테스트를 위해 상위 5명 진행

  for (const target of targets) {
    try {
      console.log(`\n🎯 [Target] 조사 중: ${target.search_name}`);

      const query = `흑백요리사 ${target.search_name} 현재 운영 중인 식당 네이버 플레이스 주소`;
      const searchResult = await getSearchData(query);
      if (!searchResult) continue;

      const validator = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `너는 식당 정보 정제 전문가야. 반드시 JSON으로 답해. 
            검색 결과를 분석해서 '현재 영업 중'인 식당 1곳만 골라. 
            만약 영업 정보가 없거나 불확실하면 confidence_score를 50 미만으로 줘.
            응답 형식: {"restaurant": {"name": "...", "address": "...", "lat": 0.0, "lng": 0.0, "category": "..."}, "confidence_score": 95, "reason": "..."}`,
          },
          {
            role: "user",
            content: `대상: ${target.search_name}. 검색결과: ${searchResult}`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(validator.choices[0].message.content);

      // confidence_score가 객체 바로 아래에 있는지 확인 (구조 파손 방지)
      if (result.confidence_score >= 85 && result.restaurant?.name) {
        // 중복 체크 (이미 저장된 식당명인지)
        if (existingNames.includes(result.restaurant.name)) {
          console.log(
            `⏭️ [Skip] 이미 존재하는 식당: ${result.restaurant.name}`,
          );
          continue;
        }

        const { restaurant } = result;
        const { data: resData } = await supabase
          .from("restaurants")
          .upsert(
            {
              name: restaurant.name,
              category: restaurant.category,
              address: restaurant.address,
              location: `POINT(${restaurant.lng} ${restaurant.lat})`,
              is_approved: true,
            },
            { onConflict: "name" },
          )
          .select()
          .single();

        if (resData) {
          const { data: srcData } = await supabase
            .from("sources")
            .upsert(
              {
                name: `흑백요리사 ${target.season}`,
                type: "TV",
              },
              { onConflict: "name" },
            )
            .select()
            .single();

          await supabase.from("appearances").upsert(
            {
              restaurant_id: resData.id,
              source_id: srcData.id,
              video_url: `https://map.naver.com/search/${encodeURIComponent(restaurant.name)}`,
              title: `${target.search_name} 출연 정보`,
            },
            { onConflict: "video_url" },
          );

          console.log(
            `✅ [Success] ${restaurant.name} 저장 완료 (${result.confidence_score}점)`,
          );
        }
      } else {
        console.warn(
          `⚠️ [Rejected] ${target.search_name}: ${result.reason} (${result.confidence_score}점)`,
        );
      }
    } catch (err) {
      console.error(`❌ [Error]:`, err.message);
    }
  }
}

runStableAgent();
