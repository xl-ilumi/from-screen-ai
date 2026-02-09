# From Screen AI

이 프로젝트는 '흑백요리사' 프로그램에 출연한 셰프들의 식당 정보를 AI를 이용해 수집하고 큐레이션하는 도구입니다.

## 🛠 필수 준비물

실행을 위해 다음 플랫폼의 API 키가 필요합니다:

1.  **Supabase**: 데이터베이스 저장소
    - `SUPABASE_URL`, `SUPABASE_KEY`
2.  **Groq**: Llama 3 모델을 이용한 데이터 정제 및 문구 생성
    - `GROQ_API_KEY`
3.  **Serper**: Google 검색 결과 수집
    - `SERPER_API_KEY`

## 🚀 로컬 실행 방법

### 1. 의존성 설치

터미널에서 아래 명령어를 실행하여 필요한 패키지를 설치합니다.

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 본인의 API 키를 입력합니다.

```bash
cp .env.example .env
```

_(이미 `.env` 파일이 있다면 해당 파일의 내용을 수정해 주세요.)_

### 3. 프로젝트 실행

```bash
npm start
```

## 📊 데이터베이스 구조 (Supabase)

스크립트가 정상적으로 동작하려면 Supabase에 아래 테이블들이 생성되어 있어야 합니다:

### 1. `restaurants` 테이블

| Column        | Type          | Note         |
| :------------ | :------------ | :----------- |
| `id`          | uuid (PK)     | 자동 생성    |
| `name`        | text (Unique) | 식당 이름    |
| `category`    | text          | 업종         |
| `address`     | text          | 주소         |
| `location`    | geography     | 위치 (POINT) |
| `is_approved` | boolean       | 승인 여부    |

### 2. `sources` 테이블

| Column | Type          | Note                             |
| :----- | :------------ | :------------------------------- |
| `id`   | uuid (PK)     | 자동 생성                        |
| `name` | text (Unique) | 소스 이름 (예: 흑백요리사 시즌1) |
| `type` | text          | 타입 (예: TV)                    |

### 3. `appearances` 테이블

| Column          | Type          | Note                       |
| :-------------- | :------------ | :------------------------- |
| `id`            | uuid (PK)     | 자동 생성                  |
| `restaurant_id` | uuid (FK)     | `restaurants.id`           |
| `source_id`     | uuid (FK)     | `sources.id`               |
| `video_url`     | text (Unique) | 관련 링크 (Naver Place 등) |
| `title`         | text          | 큐레이션 문구              |
