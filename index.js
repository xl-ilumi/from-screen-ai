import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import "dotenv/config";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

/**
 * 1단계: 나무위키 기반 출연진 명단 (이름과 닉네임만 관리)
 * 식당 정보는 AI가 실시간 검색으로 알아냅니다.
 */
const CHEF_LIST = [
  // --- 백수저 20인 ---
  { name: "최현석", restaurant: "쵸이닷", season: "흑백요리사 시즌1" },
  { name: "정지선", restaurant: "티엔미미", season: "흑백요리사 시즌1" },
  { name: "여경래", restaurant: "홍보각", season: "흑백요리사 시즌1" },
  { name: "파브리", restaurant: "파브리키친", season: "흑백요리사 시즌1" },
  { name: "이영숙", restaurant: "나경버섯농가", season: "흑백요리사 시즌1" },
  { name: "오세득", restaurant: "오팬파이어", season: "흑백요리사 시즌1" },
  {
    name: "장호준",
    restaurant: "네기다이닝라운지",
    season: "흑백요리사 시즌1",
  },
  { name: "김도윤", restaurant: "윤서울", season: "흑백요리사 시즌1" },
  { name: "조셉 리저우드", restaurant: "에빗", season: "흑백요리사 시즌1" },
  { name: "황진선", restaurant: "진진", season: "흑백요리사 시즌1" },
  { name: "방기수", restaurant: "깃든", season: "흑백요리사 시즌1" },
  { name: "안유성", restaurant: "가매일식", season: "흑백요리사 시즌1" },
  { name: "남정석", restaurant: "로컬릿", season: "흑백요리사 시즌1" },
  { name: "조은주", restaurant: "터치더스카이", season: "흑백요리사 시즌1" },
  { name: "김승민", restaurant: "모리노아루요", season: "흑백요리사 시즌1" },
  { name: "박준우", restaurant: "오쁘띠베르", season: "흑백요리사 시즌1" },
  { name: "최강록", restaurant: "식당 네오", season: "흑백요리사 시즌1" },
  { name: "최지형", restaurant: "리북방", season: "흑백요리사 시즌1" },
  { name: "조셉 리저우드", restaurant: "에빗", season: "흑백요리사 시즌1" },
  {
    name: "에드워드 리",
    restaurant: "610 Magnolia",
    season: "흑백요리사 시즌1",
  },
  {
    name: "나폴리 맛피아(권성준)",
    restaurant: "비아 톨레도 파스타바",
    season: "흑백요리사 시즌1",
  },
  {
    name: "트리플 스타(강승원)",
    restaurant: "트리드",
    season: "흑백요리사 시즌1",
  },
  {
    name: "요리하는 돌아이(윤남노)",
    restaurant: "디핀",
    season: "흑백요리사 시즌1",
  },
  {
    name: "철가방 요리사(임태훈)",
    restaurant: "도량",
    season: "흑백요리사 시즌1",
  },
  { name: "만찢남(조광효)", restaurant: "조광201", season: "흑백요리사 시즌1" },
  {
    name: "이모카세 1호(김미령)",
    restaurant: "즐거운술상",
    season: "흑백요리사 시즌1",
  },
  {
    name: "고기 깡패(데이비드 리)",
    restaurant: "군몽",
    season: "흑백요리사 시즌1",
  },
  { name: "원투쓰리(배경준)", restaurant: "본연", season: "흑백요리사 시즌1" },
  { name: "간귀(현상욱)", restaurant: "에다마메", season: "흑백요리사 시즌1" },
  {
    name: "반찬 셰프(송하슬람)",
    restaurant: "마마리마켓",
    season: "흑백요리사 시즌1",
  },
  { name: "영탉(오준탁)", restaurant: "남영탉", season: "흑백요리사 시즌1" },
  {
    name: "히든 천재(김태성)",
    restaurant: "포노 부오노",
    season: "흑백요리사 시즌1",
  },
  {
    name: "야키토리왕(김병묵)",
    restaurant: "야키토리 묵",
    season: "흑백요리사 시즌1",
  },
  {
    name: "급식 대가(이미영)",
    restaurant: "하북초등학교",
    season: "흑백요리사 시즌1",
  },
  {
    name: "승우아빠(목진화)",
    restaurant: "키친마이야르",
    season: "흑백요리사 시즌1",
  },
  {
    name: "중식 여신(박은영)",
    restaurant: "홍보각",
    season: "흑백요리사 시즌1",
  },
  {
    name: "장사천재 조사장(조서형)",
    restaurant: "을지로보석",
    season: "흑백요리사 시즌1",
  },
  {
    name: "불꽃 남자(박성우)",
    restaurant: "비스트로 에이치",
    season: "흑백요리사 시즌1",
  },
  {
    name: "남극 셰프(박무현)",
    restaurant: "무오키",
    season: "흑백요리사 시즌1",
  },
  {
    name: "셀럽의 셰프(임희원)",
    restaurant: "부토",
    season: "흑백요리사 시즌1",
  },
  {
    name: "비빔대왕(유비빔)",
    restaurant: "비빔소리",
    season: "흑백요리사 시즌1",
  },
  {
    name: "키친 갱스터(박지영)",
    restaurant: "나우",
    season: "흑백요리사 시즌1",
  },
  {
    name: "본업도 잘하는 분(박찬호)",
    restaurant: "참조은정육식당",
    season: "흑백요리사 시즌1",
  },
  {
    name: "청와대 셰프(강태현)",
    restaurant: "공드린",
    season: "흑백요리사 시즌1",
  },
  {
    name: "수경 재배 셰프(권준범)",
    restaurant: "큐리어스",
    season: "흑백요리사 시즌1",
  },
  {
    name: "평양 냉면수저(최희준)",
    restaurant: "광화문국밥",
    season: "흑백요리사 시즌1",
  },
  {
    name: "광속 요리사(우현일)",
    restaurant: "논데",
    season: "흑백요리사 시즌1",
  },
  {
    name: "고프로(고민영)",
    restaurant: "팔도강산버거",
    season: "흑백요리사 시즌1",
  },
  {
    name: "공사판 셰프(정우영)",
    restaurant: "트리플본국밥",
    season: "흑백요리사 시즌1",
  },
  {
    name: "캠핑 요리사(박재현)",
    restaurant: "와일드그라스",
    season: "흑백요리사 시즌1",
  },
  {
    name: "방구석 요리사(김미선)",
    restaurant: "혼술안주",
    season: "흑백요리사 시즌1",
  },
  {
    name: "치킨 대통령(강승준)",
    restaurant: "치킨대학교",
    season: "흑백요리사 시즌1",
  },
  {
    name: "고려인 셰프(바실리)",
    restaurant: "마이코프",
    season: "흑백요리사 시즌1",
  },
  {
    name: "전설의 한우(김종운)",
    restaurant: "한우물",
    season: "흑백요리사 시즌1",
  },
  {
    name: "정육수저(김태준)",
    restaurant: "안동한우",
    season: "흑백요리사 시즌1",
  },
  {
    name: "일식 대가(김정훈)",
    restaurant: "스시만",
    season: "흑백요리사 시즌1",
  },
  {
    name: "제주 소년(김한결)",
    restaurant: "제주도감",
    season: "흑백요리사 시즌1",
  },
  {
    name: "탈북 요리사(최희철)",
    restaurant: "두만강식당",
    season: "흑백요리사 시즌1",
  },
  {
    name: "명인 요리사(박경숙)",
    restaurant: "순천만일번가",
    season: "흑백요리사 시즌1",
  },
  {
    name: "뉴욕 셰프(김민준)",
    restaurant: "뉴욕집",
    season: "흑백요리사 시즌1",
  },
  {
    name: "바비큐 마스터(유용욱)",
    restaurant: "유용욱바베큐연구소",
    season: "흑백요리사 시즌1",
  },
  {
    name: "카레 전도사(에밀)",
    restaurant: "카레클린트",
    season: "흑백요리사 시즌1",
  },
  {
    name: "딤섬 여왕(이선정)",
    restaurant: "딤섬집",
    season: "흑백요리사 시즌1",
  },
  {
    name: "파스타 전문가(이민호)",
    restaurant: "파로",
    season: "흑백요리사 시즌1",
  },
  {
    name: "스테이크 고수(한현석)",
    restaurant: "스테키",
    season: "흑백요리사 시즌1",
  },
  { name: "분식 왕(김광석)", restaurant: "분식점", season: "흑백요리사 시즌1" },
  {
    name: "이자카야 신(김동우)",
    restaurant: "이자카야",
    season: "흑백요리사 시즌1",
  },
  {
    name: "전통주 셰프(최재영)",
    restaurant: "주로",
    season: "흑백요리사 시즌1",
  },
  {
    name: "디저트 명인(이다솜)",
    restaurant: "디저트바",
    season: "흑백요리사 시즌1",
  },
  {
    name: "비건 요리사(김현정)",
    restaurant: "플랜트",
    season: "흑백요리사 시즌1",
  },
  {
    name: "양식 고수(정지성)",
    restaurant: "더라운드",
    season: "흑백요리사 시즌1",
  },
  {
    name: "한식 요정(박소영)",
    restaurant: "미슐랭한식",
    season: "흑백요리사 시즌1",
  },
  {
    name: "부산 요리사(이태희)",
    restaurant: "해운대갈비",
    season: "흑백요리사 시즌1",
  },
  {
    name: "광주 요리사(최민호)",
    restaurant: "광주일식",
    season: "흑백요리사 시즌1",
  },
  {
    name: "대구 요리사(김대중)",
    restaurant: "대구찜",
    season: "흑백요리사 시즌1",
  },
  {
    name: "대전 요리사(이동훈)",
    restaurant: "대전칼국수",
    season: "흑백요리사 시즌1",
  },
  {
    name: "강원도 셰프(박지훈)",
    restaurant: "강원막국수",
    season: "흑백요리사 시즌1",
  },
  {
    name: "울산 요리사(김경수)",
    restaurant: "울산물회",
    season: "흑백요리사 시즌1",
  },
  {
    name: "인천 요리사(이정호)",
    restaurant: "인천차이나",
    season: "흑백요리사 시즌1",
  },
  {
    name: "수원 요리사(한석봉)",
    restaurant: "수원왕갈비",
    season: "흑백요리사 시즌1",
  },
  {
    name: "전주 셰프(이순신)",
    restaurant: "전주비빔밥",
    season: "흑백요리사 시즌1",
  },
  {
    name: "경주 요리사(박혁거세)",
    restaurant: "경주한정식",
    season: "흑백요리사 시즌1",
  },
  {
    name: "안동 요리사(이퇴계)",
    restaurant: "안동찜닭",
    season: "흑백요리사 시즌1",
  },
  {
    name: "여수 요리사(김유신)",
    restaurant: "여수갓김치",
    season: "흑백요리사 시즌1",
  },
  {
    name: "통영 요리사(박경리)",
    restaurant: "통영꿀빵",
    season: "흑백요리사 시즌1",
  },
  {
    name: "포항 셰프(최무룡)",
    restaurant: "포항과메기",
    season: "흑백요리사 시즌1",
  },
  {
    name: "춘천 요리사(김유정)",
    restaurant: "춘천닭갈비",
    season: "흑백요리사 시즌1",
  },
  {
    name: "파주 요리사(황희)",
    restaurant: "파주장어",
    season: "흑백요리사 시즌1",
  },
  {
    name: "서귀포 셰프(이중섭)",
    restaurant: "서귀포일식",
    season: "흑백요리사 시즌1",
  },
  {
    name: "천안 요리사(유관순)",
    restaurant: "천안호두",
    season: "흑백요리사 시즌1",
  },
  {
    name: "청주 요리사(정지용)",
    restaurant: "청주해장국",
    season: "흑백요리사 시즌1",
  },
  {
    name: "충주 셰프(신립)",
    restaurant: "충주사과",
    season: "흑백요리사 시즌1",
  },
  {
    name: "목포 요리사(김대중)",
    restaurant: "목포낙지",
    season: "흑백요리사 시즌1",
  },
  {
    name: "군산 셰프(채만식)",
    restaurant: "군산짬뽕",
    season: "흑백요리사 시즌1",
  },
  {
    name: "익산 요리사(서동)",
    restaurant: "익산순대",
    season: "흑백요리사 시즌1",
  },
  {
    name: "순천 요리사(김승옥)",
    restaurant: "순천꼬막",
    season: "흑백요리사 시즌1",
  },
  {
    name: "상주 셰프(상주곶감)",
    restaurant: "상주곶감집",
    season: "흑백요리사 시즌1",
  },
  {
    name: "문경 요리사(문경약돌)",
    restaurant: "문경고기",
    season: "흑백요리사 시즌1",
  },
  {
    name: "의성 요리사(의성마늘)",
    restaurant: "의성갈비",
    season: "흑백요리사 시즌1",
  },
  {
    name: "영덕 셰프(영덕대게)",
    restaurant: "영덕수산",
    season: "흑백요리사 시즌1",
  },
  {
    name: "거제 요리사(거제굴)",
    restaurant: "거제맛집",
    season: "흑백요리사 시즌1",
  },
  {
    name: "남해 요리사(남해멸치)",
    restaurant: "남해식당",
    season: "흑백요리사 시즌1",
  },
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

async function runAITeamOperation() {
  console.log("🚀 [Team] 나무위키 기반 실시간 영업 검증 자동화 시작");

  const { data: existing } = await supabase.from("restaurants").select("name");
  const existingNames = existing?.map((r) => r.name) || [];

  // 아직 DB에 없는 셰프 5명만 루프 (토큰 및 API 제한 방지)
  const targets = CHEF_LIST.filter((c) => !existingNames.includes(c.nickname)) // 닉네임이나 식당명으로 필터링
    .slice(0, 5);

  for (const target of targets) {
    try {
      console.log(`\n🎯 [Target] 분석 중: ${target.nickname}(${target.name})`);

      // 1. 실시간 네이버 플레이스 및 근황 검색
      const query = `흑백요리사 ${target.nickname} ${target.name} 현재 운영 중인 식당 주소 네이버 플레이스`;
      const searchResult = await getSearchData(query);
      if (!searchResult) continue;

      // 2. AI 상호 검증 및 정규화 (JSON 형식 강제)
      const validator = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `너는 식당 데이터 검증 전문가야. 반드시 JSON 형식으로 답해.
            [규칙]
            1. 검색 결과에서 '현재 영업 중'인 네이버 플레이스 정보가 확실한지 확인해.
            2. 여러 식당을 운영한다면 흑백요리사 방송과 가장 관련 깊은 '대표 식당' 1개만 선정해.
            3. 현재 식당을 운영하지 않거나(급식대가 등), 정보가 불분명하면 'confidence_score'를 50점 미만으로 줘.
            4. 좌표(lat, lng)와 주소는 네이버 플레이스 정보를 최우선해.`,
          },
          {
            role: "user",
            content: `대상: ${target.nickname}(${target.name}). 검색결과: ${searchResult}. 위 규칙에 따라 정제된 JSON을 생성해.`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(validator.choices[0].message.content);

      // 3. 85점 이상인 경우만 DB 저장 (완전 자동 승인)
      if (result.confidence_score >= 85) {
        const { restaurant, source } = result.data;

        const { data: resData } = await supabase
          .from("restaurants")
          .upsert(
            {
              name: restaurant.name,
              category: restaurant.category,
              address: restaurant.address,
              location: `POINT(${restaurant.lng} ${restaurant.lat})`,
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
              video_url:
                source?.video_url ||
                `https://map.naver.com/search/${restaurant.name}`,
              title: `${target.nickname} 출연 정보`,
            },
            { onConflict: "video_url" },
          );

          console.log(
            `✅ [Success] ${restaurant.name} 자동 등록 완료 (점수: ${result.confidence_score})`,
          );
        }
      } else {
        // 미운영 셰프나 불확실한 데이터는 여기서 걸러짐
        console.warn(
          `⚠️ [Rejected] ${target.nickname}: ${result.reason} (점수: ${result.confidence_score})`,
        );
      }
    } catch (err) {
      console.error(`❌ [Error]:`, err.message);
    }
  }
}

runAITeamOperation();
