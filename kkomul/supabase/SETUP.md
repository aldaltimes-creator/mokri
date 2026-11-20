# 꼬물상자 Supabase 연결 방법

앱 화면(`app/`)은 Supabase로 로그인하고 데이터를 저장해요. 아래 순서대로 한 번만 설정하면 됩니다.

## 1. Supabase 프로젝트 만들기
1. https://supabase.com 에 가입하고 **New project**를 만듭니다.
2. 지역(Region)은 **Northeast Asia (Seoul)**을 고르면 빠릅니다.

## 2. 데이터베이스 만들기
1. 대시보드 왼쪽 **SQL Editor** → **New query**
2. 이 폴더의 [`schema.sql`](schema.sql) 내용을 통째로 붙여 넣고 **Run**
3. 만들어지는 것
   - 테이블: `plans`(요금제), `children`(아이), `records`(앨범 기록), `moments`(이달의 순간), `subscriptions`(이용권), `creations`(동화·노래), `book_orders`(하드북 주문)
   - 모든 테이블에 행 단위 보안(RLS)이 켜져 있어서 **자기 데이터만** 읽고 쓸 수 있어요.
   - 사진 저장소 `record-photos`(비공개)
   - 남은 횟수를 세고 한 번만 차감하는 함수 `credit_status`, `start_creation`, `finish_creation`, `activate_plan`

## 3. 로그인 설정
1. **Authentication → Providers → Email**이 켜져 있는지 확인합니다.
2. **Authentication → URL Configuration**
   - **Site URL**: `https://aldaltimes-creator.github.io/kkomul/app/index.html`
   - **Redirect URLs**에 아래 두 개를 추가합니다.
     - `https://aldaltimes-creator.github.io/kkomul/app/*`
     - `http://localhost:5181/kkomul/app/*` (내 컴퓨터에서 시험할 때)
3. 시험하는 동안 가입 확인 메일이 번거로우면 **Providers → Email → Confirm email**을 잠시 꺼 둘 수 있어요. 서비스를 열기 전에는 다시 켜 주세요.

## 4. 앱에 연결 정보 넣기
**Project Settings → API**에서 두 값을 복사해 [`app/config.js`](../app/config.js)에 넣습니다.

```js
export const SUPABASE_URL = 'https://xxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';   // anon public 키
```

> anon 키는 브라우저에 공개돼도 괜찮은 키예요(RLS가 데이터를 지켜요). **service_role 키는 절대 넣지 마세요.**

## 5. 동화·노래를 만드는 AI 함수 올리기
동화와 노래는 Supabase Edge Function [`functions/generate`](functions/generate/index.ts)가 Claude API로 만들어요.

1. Supabase CLI 설치: https://supabase.com/docs/guides/cli
2. 터미널에서 `kkomul` 폴더로 이동한 뒤

```bash
supabase login
```

```bash
supabase link --project-ref 프로젝트ID
```

```bash
supabase secrets set ANTHROPIC_API_KEY=여기에_Anthropic_API_키
```

```bash
supabase functions deploy generate
```

- Anthropic API 키는 https://console.anthropic.com 에서 만들어요. 이 키는 **Supabase 비밀값으로만** 넣고, 코드나 `config.js`에는 넣지 마세요.
- 사용 모델은 `claude-opus-5-5`이고, 안전 분류기가 거절하면 서버 쪽 대체 모델로 다시 시도하도록(`fallbacks: "default"`) 켜 두었어요.
- 이 함수는 로그인한 사용자 권한으로 DB를 써요. 그래서 남은 횟수 확인(`start_creation`)을 건너뛰고 AI를 부를 수 없어요.

## 6. 써 보기
1. `http://localhost:5181/kkomul/app/login.html` (또는 GitHub Pages 주소의 `/app/login.html`)에서 가입
2. 아이 소개 → 오늘 기록하기(사진 포함)
3. **이용권** 메뉴에서 이용권을 ‘시험용으로 켜기’
4. 기록 카드의 **동화로 만들기 / 노래로 만들기**
5. 만든 동화에서 **하드북으로 받기** → 이용권 화면에 주문이 쌓여요

## 아직 연결하지 않은 것 (다음 단계)
- **결제**: 지금은 이용권을 ‘시험용’으로 바로 켜요(`subscriptions.is_demo = true`). 결제(토스페이먼츠 등)를 붙이면 결제 완료 웹훅에서만 `activate_plan`을 부르도록 바꿔야 해요.
- **노래 음원**: 지금은 가사만 만들어요.
- **체험권 기록 자동 삭제**: `schema.sql` 맨 아래 `purge_expired_trial_records()`와 pg_cron 예약 줄을 참고하세요(기본은 꺼짐).
- **아이 여러 명**: DB는 지원하지만 화면은 첫 번째 아이만 보여 줘요.
- **카카오 로그인**: Authentication → Providers에서 Kakao를 켜고 로그인 버튼을 추가하면 돼요.
