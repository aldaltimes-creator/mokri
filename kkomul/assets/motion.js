// 꼬물상자 랜딩 — GSAP ScrollSmoother 부드러운 스크롤 + 스크롤 패럴랙스
(() => {
  const { gsap, ScrollTrigger, ScrollSmoother } = window;
  // CDN을 못 불러왔거나, 움직임 줄이기를 켠 사용자는 기본 스크롤 그대로 둡니다.
  if (!gsap || !ScrollTrigger || !ScrollSmoother) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
  document.documentElement.style.scrollBehavior = 'auto'; // CSS smooth와 충돌 방지

  const smoother = ScrollSmoother.create({
    wrapper: '#smooth-wrapper',
    content: '#smooth-content',
    smooth: 1.2,        // 스크롤이 따라붙는 시간(초)
    smoothTouch: 0.1,   // 터치 기기는 아주 살짝만
    effects: true,
  });

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => gsap.utils.toArray(sel, root);

  // ── 공통 도구 ───────────────────────────────────────────
  // 화면에 들어올 때 아래에서 떠오르기
  const reveal = (targets, trigger, vars = {}) => {
    if (!targets.length) return;
    gsap.from(targets, {
      y: 48, autoAlpha: 0, duration: 1, ease: 'power3.out', stagger: 0.12,
      ...vars,
      scrollTrigger: { trigger, start: 'top 85%', toggleActions: 'play none none none' },
    });
  };
  // 스크롤에 맞춰 깊이감 주기: depth가 클수록 앞으로 튀어나온 듯 빨리 움직임
  const parallax = (el, depth, trigger = el) => {
    gsap.fromTo(el,
      { y: () => depth * window.innerHeight * 0.12 },
      {
        y: () => -depth * window.innerHeight * 0.12, ease: 'none',
        scrollTrigger: { trigger, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
      });
  };

  // ── ① 히어로: 첫 등장 + 스크롤하면 층층이 갈라지기 ──────
  const intro = gsap.timeline({ defaults: { ease: 'power3.out', duration: 1 } });
  intro
    .from('.hero__text > *', { y: 40, autoAlpha: 0, stagger: 0.12 })
    .from('.book', { y: 70, autoAlpha: 0, scale: 0.94, rotate: -7, duration: 1.3 }, 0.15)
    .from('.chip-float', { autoAlpha: 0, scale: 0.7, stagger: 0.18, duration: 0.8, ease: 'back.out(2)' }, 0.8);

  const heroScroll = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
  gsap.to('.hero__text', { y: 140, autoAlpha: 0.2, ease: 'none', scrollTrigger: heroScroll });
  gsap.to('.hero__art', { y: -40, ease: 'none', scrollTrigger: heroScroll });
  gsap.to('.chip-float--1', { y: -120, ease: 'none', scrollTrigger: heroScroll });
  gsap.to('.chip-float--2', { y: -60, x: -20, ease: 'none', scrollTrigger: heroScroll });

  // ── 섹션 제목: 떠오르기 + 살짝 패럴랙스 ─────────────────
  $$('.section__head').forEach((head) => {
    reveal(head.children, head);
    parallax(head, 0.25, head.closest('section'));
  });

  // ── 힘들어하는 것 → 좋아하는 것: 카드는 차례로, 그림은 살짝 다른 깊이로 ──
  reveal($$('.use-tabs'), '.use-tabs', { y: 24 });
  reveal($$('#use-1 > .use-panel__title, #use-1 > .use-panel__lead'), '#use-1', { y: 24 });
  reveal($$('.worry'), '.worries', { stagger: 0.16 });
  // 그림 틀은 그대로 두고 안쪽 그림만 움직여 창문 너머로 보이는 듯한 깊이감
  $$('.worry__art > *, .usecase__art > *').forEach((pic) => {
    gsap.set(pic, { scale: 1.1 });
    gsap.fromTo(pic, { yPercent: -4 }, {
      yPercent: 4, ease: 'none',
      scrollTrigger: { trigger: pic.parentNode, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // ── ② 세 걸음: 카드는 차례로, 아이콘은 서로 다른 깊이로 ──
  reveal($$('.step'), '.steps', { stagger: 0.18 });
  // 단계 그림 속 작은 화면은 카드보다 살짝 늦게, 서로 다른 깊이로 떠오름
  $$('.mini').forEach((m, i) => parallax(m, 0.06 + i * 0.03, '.steps'));
  reveal($$('.how-nav'), '.how-nav', { y: 20 });
  // 2장(11월 예시)을 열 때 날짜 카드가 차례로 들어오게
  document.querySelector('.how-pager [data-next]')?.addEventListener('click', () => {
    gsap.from('.month-flow__list li', { y: 24, autoAlpha: 0, duration: 0.6, ease: 'power3.out', stagger: 0.08, clearProps: 'all' });
  });

  // ── ③ 샘플: 탭과 카드 ───────────────────────────────────
  reveal($$('.tabs, .samples__stage'), '.tabs', { stagger: 0.15 });

  // ── ④ 월간 앨범: 글은 떠오르고, 책은 스크롤에 맞춰 한 권씩 꽂힘 ──
  reveal($$('.album__text > *'), '.album__text', { stagger: 0.1 });
  const spineLift = [70, 120, 90, 160];
  $$('.spine').forEach((spine, i) => {
    gsap.fromTo(spine,
      { y: spineLift[i], autoAlpha: 0 },
      {
        y: 0, autoAlpha: 1, ease: 'none',
        scrollTrigger: { trigger: '.shelf', start: `top ${90 - i * 6}%`, end: 'center 55%', scrub: true },
      });
  });
  parallax('.shelf', 0.3, '#album');

  // ── ⑤ 정보 보호: 카드는 차례로, 아이콘은 둥실 ───────────
  reveal($$('.safe__item'), '.safe', { stagger: 0.15 });
  $$('.safe__item svg').forEach((icon, i) => parallax(icon, 0.3 + (i % 2) * 0.3, '.safe'));

  // ── 요금제: 카드가 차례로, 추천 카드는 살짝 늦게 ─────────
  reveal($$('.plan'), '.plans', { stagger: 0.14 });
  reveal($$('.addon'), '.addon', { y: 30 });

  // ── ⑥ FAQ ──────────────────────────────────────────────
  reveal($$('.faq details, .faq__more'), '.faq', { y: 30, stagger: 0.08 });

  // ── ⑦ 시작 유도: 상자가 펼쳐지고 동그라미가 반대로 흐름 ──
  gsap.fromTo('.cta__inner', { scale: 0.9, borderRadius: 48 }, {
    scale: 1, borderRadius: 28, ease: 'none',
    scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'top 45%', scrub: true },
  });
  parallax('.cta__blob--1', 1.4, '.cta');
  parallax('.cta__blob--2', -1.2, '.cta');
  reveal($$('.cta__inner > :not(.cta__blob)'), '.cta__inner', { stagger: 0.12 });

  // ── 메뉴의 # 링크: ScrollSmoother로 부드럽게 이동 ────────
  const HEADER = 80;
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute('href');
    if (hash.length < 2) return;
    const target = document.querySelector(hash);
    if (!target) return;
    e.preventDefault();
    smoother.scrollTo(target, true, `top ${HEADER}px`);
    history.pushState(null, '', hash);
    if (a.classList.contains('skip')) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  });

  // ── 높이가 바뀌는 순간 스크롤 위치 다시 계산 ─────────────
  const refresh = () => requestAnimationFrame(() => ScrollTrigger.refresh());
  const watch = new MutationObserver(refresh);
  $$('[role="tabpanel"], [data-album-view]').forEach((p) => watch.observe(p, { attributes: true, attributeFilter: ['hidden'] }));
  $$('[data-page]').forEach((p) => watch.observe(p, { attributes: true, attributeFilter: ['class'] }));
  $$('.faq details').forEach((d) => d.addEventListener('toggle', refresh));
  document.fonts?.ready.then(refresh);
  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
    // 주소에 #faq 같은 위치가 붙어 들어온 경우 그 자리로
    const start = location.hash && document.querySelector(location.hash);
    if (start) smoother.scrollTo(start, false, `top ${HEADER}px`);
  });
})();
