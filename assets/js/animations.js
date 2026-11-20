// =============================================================================
// MOKRI 사이트 전체 모션
// GSAP 3.13 (ScrollTrigger · SplitText · CustomEase) + Lenis 1.1.13
//
// 조절하기 쉬운 수치는 모두 아래 MOTION 객체에 모아 두었습니다.
// =============================================================================
(function () {
  'use strict';

  const root = document.documentElement;
  const libsReady = window.gsap && window.ScrollTrigger && window.SplitText && window.CustomEase && window.Lenis;

  // 라이브러리를 못 불러왔거나 "동작 줄이기" 설정이면 → 애니메이션 없이 그대로 보여줌
  // (head의 인라인 스크립트가 붙인 js-motion 클래스를 떼면 숨겨 둔 요소가 모두 보임)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!libsReady || reduceMotion) {
    root.classList.remove('js-motion');
    document.querySelector('.loader')?.remove();
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);

  // ---------------------------------------------------------------------------
  // 수치 모음 (속도 · 이징)
  // ---------------------------------------------------------------------------
  const MOTION = {
    loader: {
      minTime: 1.2,        // 로더 최소 노출 시간(초)
      maxTime: 6,          // 이미지가 늦어도 이 시간이 지나면 100%로 진행
      follow: 0.08,        // 카운터가 실제 로딩률을 따라가는 속도(0~1, 클수록 빠름)
      exitDuration: 1.2,   // 위로 슬라이드되며 사라지는 시간
    },
    hero: {
      charDuration: 1.2, charStagger: 0.03, // 큰 제목 글자
      subDelay: 0.2, subDuration: 1.2, subStagger: 0.08, // 서브라인 줄
      bgFrom: 1.15, bgDuration: 2.4,        // 배경 이미지 줌아웃
    },
    reveal: { start: 'top 85%', duration: 1, stagger: 0.08, from: 110 }, // 줄 단위 리빌
    stroke: { start: 'top 85%', duration: 1.4 },                        // 구분선
    parallax: { amount: 7, scale: 1.16 },                               // 이미지 패럴랙스(%)
    lenis: { duration: 1.2 },                                           // 부드러운 스크롤 길이(초)
    marquee: {
      speed: 0.6,          // 기본 흐름 속도(px/프레임, 60fps 기준)
      scrollBoost: 0.25,   // 페이지 스크롤 속도가 마퀴에 더해지는 비율
      friction: 0.94,      // 드래그를 놓은 뒤 관성 감속(1에 가까울수록 오래 미끄러짐)
      returnEase: 0.05,    // 자동 흐름 속도로 돌아오는 빠르기
    },
  };

  CustomEase.create('mokriInOut', '0.65,0,0.35,1');
  const EASE_OUT = 'power4.out';

  // ---------------------------------------------------------------------------
  // 1. 부드러운 스크롤 (Lenis ↔ ScrollTrigger 동기화)
  // ---------------------------------------------------------------------------
  const lenis = new Lenis({
    duration: MOTION.lenis.duration,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // 같은 페이지 앵커(#signup 등)도 Lenis로 이동
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href*="#"]');
    if (!link) return;
    const url = new URL(link.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const target = document.querySelector(url.hash);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -24 });
    history.replaceState(null, '', url.hash);
  });

  // ---------------------------------------------------------------------------
  // 2. 페이지 로더 (홈에만 있음) — 실제 이미지 로딩률을 따라 0 → 100%
  // ---------------------------------------------------------------------------
  function runLoader() {
    const loader = document.querySelector('.loader');
    if (!loader) return Promise.resolve();

    const countEl = loader.querySelector('[data-loader-count]');
    const barEl = loader.querySelector('[data-loader-bar]');
    lenis.stop();
    window.scrollTo(0, 0);

    const imgs = [...document.images];
    let loaded = 0;
    const done = () => { loaded += 1; };
    imgs.forEach((img) => {
      if (img.complete) done();
      else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
    });

    const start = performance.now();
    const state = { value: 0 };

    return new Promise((resolve) => {
      const tick = () => {
        const elapsed = (performance.now() - start) / 1000;
        const real = imgs.length ? (loaded / imgs.length) * 100 : 100;
        const timeCap = Math.min(100, (elapsed / MOTION.loader.minTime) * 100); // 너무 빨리 끝나지 않게
        const target = elapsed > MOTION.loader.maxTime ? 100 : Math.min(real, timeCap);
        state.value += (target - state.value) * MOTION.loader.follow;
        if (target === 100 && state.value > 99.5) state.value = 100;

        countEl.textContent = Math.round(state.value);
        gsap.set(barEl, { scaleX: state.value / 100 });

        if (state.value === 100) {
          gsap.ticker.remove(tick);
          // 100%가 되면 배경이 위로 슬라이드되며 사라짐
          gsap.timeline({
            onComplete: () => { loader.remove(); lenis.start(); },
          })
            .to(loader.querySelector('.loader__inner'), { autoAlpha: 0, y: -24, duration: 0.5, ease: 'power2.in' })
            .to(loader, { yPercent: -100, duration: MOTION.loader.exitDuration, ease: 'mokriInOut' }, '-=0.1')
            .add(resolve, `-=${MOTION.loader.exitDuration * 0.45}`); // 막이 걷히는 도중에 히어로 시작
        }
      };
      gsap.ticker.add(tick);
    });
  }

  // ---------------------------------------------------------------------------
  // 3. 히어로 등장 — 큰 제목은 글자 단위, 서브라인은 줄 단위로 마스크 안에서 올라옴
  // ---------------------------------------------------------------------------
  function heroIntro() {
    const word = document.querySelector('.hero__word');
    if (!word) return;
    const subs = gsap.utils.toArray('.hero__sub');
    const bg = document.querySelector('.hero__img img');
    const H = MOTION.hero;

    const tl = gsap.timeline();
    if (bg) tl.fromTo(bg, { scale: H.bgFrom }, { scale: 1, duration: H.bgDuration, ease: 'power2.out' }, 0);

    SplitText.create(word, {
      type: 'chars', mask: 'chars', charsClass: 'char',
      onSplit(self) {
        gsap.set(word, { visibility: 'visible' });
        return tl.from(self.chars, {
          yPercent: 100, duration: H.charDuration, stagger: H.charStagger, ease: EASE_OUT,
        }, 0.1);
      },
    });

    subs.forEach((el, i) => {
      SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true,
        onSplit(self) {
          gsap.set(el, { visibility: 'visible' });
          return gsap.from(self.lines, {
            yPercent: 100, duration: H.subDuration, stagger: H.subStagger, ease: EASE_OUT,
            delay: 0.1 + H.subDelay + i * 0.1,
          });
        },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 4. 스크롤 텍스트 리빌 — .js-reveal 을 줄 단위로 나눠 마스크 안에서 올림
  //    autoSplit: 창 크기가 바뀌면 다시 분할하고, 진행 상태는 새 애니메이션에 이어짐
  // ---------------------------------------------------------------------------
  function textReveals() {
    const R = MOTION.reveal;
    gsap.utils.toArray('.js-reveal').forEach((el) => {
      SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true,
        onSplit(self) {
          gsap.set(el, { visibility: 'visible' });
          return gsap.from(self.lines, {
            yPercent: R.from, duration: R.duration, stagger: R.stagger, ease: EASE_OUT,
            scrollTrigger: { trigger: el, start: R.start, once: true },
          });
        },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 5. 구분선 드로잉 — .stroke 가 왼쪽에서 오른쪽으로 그려짐
  // ---------------------------------------------------------------------------
  function strokes() {
    gsap.utils.toArray('.stroke').forEach((line) => {
      gsap.fromTo(line, { scaleX: 0 }, {
        scaleX: 1, duration: MOTION.stroke.duration, ease: 'mokriInOut',
        scrollTrigger: { trigger: line, start: MOTION.stroke.start, once: true },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 6. 패럴랙스 — 이미지가 프레임 안에서, 큰 제목은 옆으로, 배경은 느리게
  // ---------------------------------------------------------------------------
  function parallax() {
    const P = MOTION.parallax;
    gsap.utils.toArray('.parallax-frame').forEach((frame) => {
      const img = frame.querySelector('img');
      if (!img) return;
      gsap.fromTo(img, { yPercent: -P.amount, scale: P.scale }, {
        yPercent: P.amount, scale: P.scale, ease: 'none',
        scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    gsap.utils.toArray('.spin__title').forEach((title) => {
      gsap.fromTo(title, { xPercent: 6 }, {
        xPercent: -6, ease: 'none',
        scrollTrigger: { trigger: title.closest('.spin'), start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    const backdrop = document.querySelector('.home__backdrop');
    if (backdrop) {
      gsap.to(backdrop, {
        y: 500, ease: 'none',
        scrollTrigger: { trigger: '.home', start: 'top top', end: '+=1400', scrub: true },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 7. 드래그 가능한 무한 마퀴
  //    - 카드 묶음을 복제해 끊김 없이 왼쪽으로 흐름
  //    - 마우스·터치 드래그 → 놓으면 관성 감속 → 자동 흐름으로 복귀
  //    - 페이지를 위로 스크롤하면 방향이 반대로, 빠르게 스크롤하면 빨라짐
  // ---------------------------------------------------------------------------
  function marquees() {
    const M = MOTION.marquee;
    gsap.utils.toArray('[data-marquee]').forEach((viewport) => {
      const track = viewport.querySelector('.marquee__track');
      const group = track.querySelector('.marquee__group');

      // 화면 폭을 넉넉히 채울 만큼 묶음을 복제 (복제본은 스크린리더에서 숨김)
      const fill = () => {
        track.querySelectorAll('.marquee__group[aria-hidden]').forEach((g) => g.remove());
        const copies = Math.max(1, Math.ceil((viewport.offsetWidth * 2) / group.offsetWidth));
        for (let i = 0; i < copies; i++) {
          const clone = group.cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          track.appendChild(clone);
        }
      };
      fill();

      let groupW = group.offsetWidth;
      let x = 0;
      let direction = 1;          // 1 = 왼쪽으로, -1 = 오른쪽으로
      let velocity = -M.speed;    // 현재 프레임 이동량(px)
      let dragging = false;
      let lastX = 0;
      let dragV = 0;
      let moved = 0;
      let scrollBoost = 0;
      const setX = gsap.quickSetter(track, 'x', 'px');

      lenis.on('scroll', (e) => {
        if (e.direction) direction = e.direction; // 아래로 스크롤 1, 위로 -1
        scrollBoost = Math.abs(e.velocity) * M.scrollBoost;
      });

      gsap.ticker.add((time, delta) => {
        const f = delta / (1000 / 60); // 프레임레이트 보정
        if (!dragging) {
          const auto = -(M.speed + scrollBoost) * direction;
          dragV *= Math.pow(M.friction, f);                     // 관성 감속
          velocity += (auto - velocity) * M.returnEase * f;     // 자동 흐름으로 복귀
          x += (Math.abs(dragV) > 0.1 ? dragV : velocity) * f;
          if (Math.abs(dragV) <= 0.1) dragV = 0;
          scrollBoost *= 0.9;
        }
        x = gsap.utils.wrap(-groupW, 0, x); // 한 묶음 폭만큼 지나가면 처음으로 → 끊김 없음
        setX(x);
      });

      viewport.addEventListener('pointerdown', (e) => {
        dragging = true; moved = 0; lastX = e.clientX; dragV = 0;
        viewport.classList.add('is-dragging');
        viewport.setPointerCapture(e.pointerId);
      });
      viewport.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        moved += Math.abs(dx);
        x += dx;
        dragV = dx;               // 마지막 이동량을 관성 속도로 사용
        velocity = dx;
      });
      const release = () => {
        if (!dragging) return;
        dragging = false;
        viewport.classList.remove('is-dragging');
        if (dragV) direction = dragV < 0 ? 1 : -1; // 던진 방향으로 계속 흐름
      };
      viewport.addEventListener('pointerup', release);
      viewport.addEventListener('pointercancel', release);
      // 드래그한 직후의 클릭은 무시
      viewport.addEventListener('click', (e) => { if (moved > 5) e.preventDefault(); }, true);

      let refillTimer;
      window.addEventListener('resize', () => {
        clearTimeout(refillTimer);
        refillTimer = setTimeout(() => { fill(); groupW = group.offsetWidth; }, 200);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 시작 순서: 폰트 로드 → (로더) → 히어로 → 스크롤 애니메이션
  // ---------------------------------------------------------------------------
  document.fonts.ready.then(async () => {
    parallax();
    strokes();
    marquees();
    await runLoader();
    heroIntro();
    textReveals();
    ScrollTrigger.refresh();

    // 다른 페이지에서 index.html#signup 처럼 들어온 경우
    const target = location.hash && document.querySelector(location.hash);
    if (target) lenis.scrollTo(target, { offset: -24, immediate: true });
  });

  // 창 크기가 바뀌면 위치 다시 계산 (SplitText는 autoSplit으로 자동 재분할)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 250);
  });
})();
