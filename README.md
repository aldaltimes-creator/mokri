# 목리 MOKRI — 한국 원목 가구 브랜드 사이트

정적 HTML/CSS/JS 사이트입니다. 빌드 과정 없이 GitHub Pages로 바로 배포됩니다.

## 페이지

| 파일 | 내용 |
| --- | --- |
| `index.html` | 홈 |
| `brand.html` | 브랜드 |
| `collection.html` | 컬렉션 |
| `craft.html` | 크래프트 |
| `showroom.html` | 쇼룸 |
| `journal.html` | 목리 노트 |
| `product-landing.html` | 제품 소개 랜딩 (스크롤 애니메이션) |

## 사용 라이브러리 (CDN)

- GSAP 3.13 + ScrollTrigger
- Lenis 1.1.13 (부드러운 스크롤)
- SplitType 0.3.4 (`product-landing.html`)

## 로컬 미리보기

아무 정적 서버로 폴더를 열면 됩니다. 예: VS Code Live Server.

## 랜딩 애니메이션 수치 조절

`product-landing.html` 하단 `<script>`의 `CONFIG` 객체에서 조절합니다.
