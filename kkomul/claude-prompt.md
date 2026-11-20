Implement 「꼬물상자」 랜딩 페이지를 정적 HTML/CSS/JS(빌드 도구 없음)로 만들어 줘.

## 서비스
부모가 아이 정보(이름, 나이, 좋아하는 것)를 입력하면 AI가 아이가 주인공인 노래·그림·동화를 만들어 주고, 올린 사진과 아이 그림은 매달 앨범과 영상으로 엮어 주는 구독 서비스.
- 샘플 주인공: 이안이(22개월 남자아이, 검은 머리)
- 친구 캐릭터: 빨간 소방차 「빵빵이」(눈·볼·웃는 입, 노란 경광등)

## 파일 구조
- index.html
- assets/style.css
- assets/main.js: 헤더, 탭, 노래 플레이어, 동화 넘김
- assets/motion.js: GSAP 애니메이션
- assets/img/: 이미지 (아래 목록)

## 디자인: 컨셉 「포근한 그림책」
- 폰트
  - 제목·동화 문장: Gowun Batang (Google Fonts)
  - 본문·UI: Pretendard (jsDelivr CDN v1.3.9)
- 색상 토큰 (:root)
  - --coral #E07A5F, --coral-btn #B95440, --coral-btn-hover #A3472F
  - --sage #81B29A, --sage-soft #DCEBE2
  - --mustard #F2CC8F, --mustard-soft #FBEBD0
  - --bg #FBF6EE, --bg-tint #F5ECDF, --surface #FFFDF9
  - --ink #3D2F2A, --ink-sub #6E625A, --line #EADFD3
- 배경: SVG data-URI 종이 질감
- 모서리: 카드 20px. 그림책처럼 따뜻하고 부드러운 그림자
- 반응형 기준: 960px, 720px. 모바일 375px에서 가로 스크롤이 생기면 안 됨

## 섹션 순서
1. **헤더**
   - 화면 위에 고정(fixed), 높이 68px
   - 로고 SVG(상자), 메뉴: 서비스 소개 / 미리보기 / 월간 앨범 / 자주 묻는 질문
   - 로그인, 시작하기 버튼
   - 스크롤하면 아래 구분선 표시
2. **히어로**
   - 제목 "이번 이야기의 / 주인공은 우리 아이예요". "우리 아이"는 강조색, 줄바꿈 금지
   - 설명, 버튼 2개(무료로 동화 만들어 보기 / 샘플 먼저 볼게요), 안내 문구
   - 오른쪽에 -2도 기울어진 그림책 카드(hero-ian-bbangbbang.jpg)
   - 떠다니는 칩 2개: "♪ 이안이의 잠자리 노래", "11월 앨범이 도착했어요"
3. **#how 세 걸음:** 아이 소개하기 → 이야기 만들기 → 매달 앨범 받기 (번호 + 선 아이콘)
4. **#samples 미리보기**
   - 설명: "22개월 이안이 · 소방차와 빨간색을 좋아해요 · 요즘 양치를 싫어해요"
   - 접근성 탭 3개(노래/동화/앨범): role=tab, 화살표 키 이동
   - **노래 탭:** 커버 이미지, 제목 「반짝반짝 이안이 꿈나라」
     - 가짜 플레이어(음원 없음): 24초 진행 바, 가사 4줄 차례로 하이라이트
     - 재생 중에는 커버가 숨 쉬듯 커졌다 작아짐
   - **동화 탭:** 「빵빵이와 반짝반짝 양치 출동」 3쪽, 이전/다음 버튼과 "1 / 3" 표시
     1. 이안이는 이 닦기가 싫었어요. "싫어, 싫어!"
     2. 그때 빵빵이가 삐뽀삐뽀 출동! "이안아, 나랑 같이 쓱싹쓱싹 하자!"
     3. 반짝반짝 깨끗한 이로 이안이와 빵빵이는 꿈나라로 떠났답니다.
   - **앨범 탭:**
     - 3:4 표지(album-cover.jpg 배경): "2026. 11 / 이안이의 스물두 번째 달", 아래 폴라로이드 3장
     - 오른쪽 목록: 사진 24장 / 아이 그림 5장 / 아이의 말 3개 / 이달의 노래·동화
5. **#album 월간 앨범**
   - 왼쪽: 설명 + 체크 목록 4개 (디지털 포토북, 추억 영상, 며칠간 직접 편집, 가족과 함께)
   - 오른쪽: 책장에 꽂힌 8월~11월 책등 4권(세로 글씨)
6. **정보 보호:** 카드 3장 (기본은 비공개, 사진은 학습에 쓰지 않아요, 아이에게 맞는 내용만)
7. **#faq:** `<details>` 5개
8. **#start 시작 유도:** 머스터드 박스, 장식 원 2개(span)
9. **푸터**

## 이미지 (assets/img/, JPG 품질 82)
| 파일 | 크기 | 쓰는 곳 |
|---|---|---|
| hero-ian-bbangbbang.jpg | 1600×1132 | 히어로 |
| story-1-no-brushing.jpg | 1600×1000 | 동화 1쪽 |
| story-2-bbangbbang.jpg | 1600×1000 | 동화 2쪽 |
| story-3-dreamland.jpg | 1600×1000 | 동화 3쪽 |
| song-cover.jpg | 600×600 | 노래 커버 |
| album-cover.jpg | 600×800 | 앨범 표지 |
| album-playground.jpg | 600×600 | 폴라로이드 ① |
| album-firestation.jpg | 600×600 | 폴라로이드 ② |
| album-crayon.jpg | 600×600 | 폴라로이드 ③ |
| og-image.jpg | 1200×630 | 공유 미리보기 |

- 모든 img에 width/height 속성을 넣고, CSS에서는 `height:auto` + `aspect-ratio` + `object-fit:cover`로 맞춤
- 내용이 있는 이미지에는 한국어 alt를 달 것

## 애니메이션 (GSAP 3.13.0, jsDelivr)
- gsap, ScrollTrigger, ScrollSmoother를 불러옴
- 구조: `<header>`는 밖에 두고, `<main>`과 `<footer>`를 `#smooth-wrapper > #smooth-content`로 감쌈. #smooth-content에 padding-top 68px
- `ScrollSmoother.create({ smooth: 1.2, smoothTouch: 0.1, effects: true })`
- **히어로:** 첫 등장 타임라인(문구 차례로, 책 기울며 확대, 칩 튀어나옴). 스크롤하면 문구는 내려가며 흐려지고, 그림과 칩은 서로 다른 속도로 위로 이동(scrub)
- **각 섹션 제목:** 아래에서 떠오르기 + 약한 패럴랙스
- **세 걸음:** 카드 차례로 등장, 아이콘마다 다른 깊이
- **월간 앨범:** 책등 4권이 스크롤에 맞춰 아래에서 올라와 꽂힘(scrub)
- **정보 보호 · FAQ:** 차례로 등장
- **시작 유도:** 박스 scale 0.9→1(scrub), 장식 원은 서로 반대 방향 패럴랙스
- **#링크:** `smoother.scrollTo(target, true, "top 80px")`로 이동, 건너뛰기 링크는 포커스도 옮김
- 탭 전환·FAQ 열기·폰트 로드 후 `ScrollTrigger.refresh()`
- 떠다니는 칩의 CSS 애니메이션은 `transform` 대신 `translate` 속성을 써서 GSAP 변형과 충돌하지 않게
- `prefers-reduced-motion`이거나 GSAP를 불러오지 못하면 애니메이션 없이 기본 스크롤

## 메타 태그
- title: "꼬물상자 — 우리 아이가 주인공인 노래·그림·동화"
- description, og:title, og:description, og:type
- og:image: https://aldaltimes-creator.github.io/kkomul/assets/img/og-image.jpg
- twitter:card: summary_large_image

## 확인
- 데스크톱과 375px 모바일에서 가로 스크롤 없음
- 깨진 이미지 없음
- 탭, 노래 플레이어, 동화 넘김, 메뉴 이동이 모두 동작
- 콘솔 에러 없음
