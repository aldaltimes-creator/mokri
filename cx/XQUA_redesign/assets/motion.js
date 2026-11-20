/* XQUA 사이트 모션: GSAP ScrollSmoother로 부드러운 스크롤 + 스크롤 기반 패럴랙스.
   - 사용 라이브러리: GSAP 3.13 (gsap, ScrollTrigger, ScrollSmoother)
   - '동작 줄이기' 설정 사용자에게는 아무 효과도 적용하지 않고 기본 스크롤을 유지합니다. */
(function () {
  if (!window.gsap || !window.ScrollTrigger || !window.ScrollSmoother) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var hasSplit = !!window.SplitText;
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
  if (hasSplit) gsap.registerPlugin(SplitText);
  document.documentElement.classList.add('has-smoother');

  var HEADER = 68;
  var $ = function (s, root) { return (root || document).querySelector(s); };
  var $$ = function (s, root) { return gsap.utils.toArray(s, root); };
  var cols = window.matchMedia('(min-width: 961px)').matches ? 4
           : window.matchMedia('(min-width: 601px)').matches ? 2 : 1;

  /* ---------- 1. 카드 그리드: 열마다 다른 지연(lag)으로 패럴랙스 ---------- */
  function lagGrid(selector, perRow, step) {
    var n = Math.min(perRow, cols);
    $$(selector).forEach(function (el, i) {
      el.setAttribute('data-lag', (0.06 + (i % n) * step).toFixed(2));
    });
  }
  lagGrid('.step', 4, 0.06);
  lagGrid('.member', 4, 0.06);
  lagGrid('.metric', 4, 0.05);
  lagGrid('.three > .card, .tone-grid > .card', 3, 0.07);
  lagGrid('.swatches > .sw', 6, 0.04);

  /* ---------- 2. ScrollSmoother ---------- */
  var smoother = ScrollSmoother.create({
    wrapper: '#smooth-wrapper',
    content: '#smooth-content',
    smooth: 1.2,          // 스크롤이 따라오는 시간(초)
    effects: true,        // data-speed / data-lag 사용
    smoothTouch: 0.1
  });

  // 페이지 안 링크(#services 등)는 고정 헤더 높이만큼 띄워서 부드럽게 이동
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    var target = id.length > 1 && document.getElementById(id.slice(1));
    if (!target) return;
    e.preventDefault();
    smoother.scrollTo(target, true, 'top ' + HEADER + 'px');
    history.replaceState(null, '', id);
  });

  /* ---------- 3. 히어로: 첫 등장 + 스크롤 패럴랙스 ---------- */
  var hero = $('.hero') || $('.guide-hero');
  if (hero) {
    var intro = gsap.timeline({ paused: true, defaults: { ease: 'power3.out', duration: 1 } });
    intro.from($$('.eyebrow, h1, .lead, .cta, .toc a', hero), { y: 40, autoAlpha: 0, stagger: 0.09 });
    if ($('.panel', hero)) {
      intro.from($('.panel', hero), { autoAlpha: 0, scale: 0.94, duration: 1.1 }, '-=0.8')
           .from($$('.kpi, .row', hero), { autoAlpha: 0, y: 16, stagger: 0.06, duration: 0.6 }, '-=0.6');
    }

    // 로딩 화면이 걷힐 때 시작 (로딩 화면이 없으면 바로 시작)
    var root = document.documentElement;
    if (root.classList.contains('cx-loading')) {
      var mo = new MutationObserver(function () {
        if (!root.classList.contains('cx-loading')) { mo.disconnect(); intro.play(); }
      });
      mo.observe(root, { attributes: true, attributeFilter: ['class'] });
      setTimeout(function () { mo.disconnect(); intro.play(); }, 7000);
    } else {
      intro.play();
    }

    var scrub = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
    // 배경 그리드는 느리게, 글은 빠르게 올라가며 흐려짐, 대시보드는 한 박자 늦게 → 깊이감
    if ($('.grid-bg', hero)) gsap.to($('.grid-bg', hero), { yPercent: 35, ease: 'none', scrollTrigger: scrub });
    var copy = $('.hero-copy', hero) || $('.wrap', hero);
    gsap.to(copy, { y: -90, autoAlpha: 0.2, ease: 'none', scrollTrigger: scrub });
    if ($('.panel', hero)) gsap.to($('.panel', hero), { y: 80, ease: 'none', scrollTrigger: scrub });
  }

  /* ---------- 4. 섹션 제목: 제목은 줄 단위로 아래에서 굴러 올라오고, 나머지는 차례로 등장 ---------- */
  $$('.sec-head').forEach(function (head) {
    var title = hasSplit && $('h2', head);
    var rest = $$(head.children).filter(function (el) { return el !== title; });
    gsap.from(rest, {
      y: 44, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: head, start: 'top 85%' }
    });
    if (title) {
      SplitText.create(title, {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: function (self) {
          return gsap.from(self.lines, {
            yPercent: 110, duration: 1, ease: 'power4.out', stagger: 0.12,
            scrollTrigger: { trigger: head, start: 'top 85%' }
          });
        }
      });
    }
  });

  /* ---------- 4-1. 글자 롤링: 기존 글자는 위로, 새 글자는 아래에서 (슬롯머신처럼) ---------- */
  function rollText(el, text, dir) {
    // 빠르게 넘길 때 아직 빠져나가는 중인 글자가 쌓이지 않도록, 가장 최근 것만 남기고 정리
    var all = $$('.r-cur', el);
    var old = all[all.length - 1];
    all.slice(0, -1).forEach(function (e) { gsap.killTweensOf(e.children); e.remove(); });
    if (old) gsap.set(old, { position: 'relative' });
    if (old && old.textContent === text) return;
    var next = document.createElement('span');
    next.className = 'r-cur';
    next.textContent = text;
    el.appendChild(next);
    gsap.set(next, { position: 'absolute', left: 0, top: 0 });
    var sn = new SplitText(next, { type: 'chars' });
    gsap.fromTo(sn.chars, { yPercent: 110 * dir }, { yPercent: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out' });
    if (!old) return;
    gsap.killTweensOf(old);
    var so = new SplitText(old, { type: 'chars' });
    gsap.to(so.chars, {
      yPercent: -110 * dir, duration: 0.6, stagger: 0.05, ease: 'power3.out',
      onComplete: function () { old.remove(); gsap.set(next, { position: 'relative' }); }
    });
  }

  /* ---------- 4-2. 업무 소개: 화면에 고정하고 스크롤로 한 장씩 넘기기 ---------- */
  var svcSec = $('#services');
  var slides = svcSec ? $$('.svc', svcSec) : [];
  if (hasSplit && slides.length > 1) {
    svcSec.classList.add('is-slider');
    var stage = $('.services', svcSec);
    var num = $('#svc-num');
    var bars = $$('.svc-progress i', svcSec);
    var count = slides.length;
    var current = 0;

    // 카드 높이에 맞춰 무대 높이 지정 (카드는 겹쳐 있으므로)
    function fitStage() {
      stage.style.height = Math.max.apply(null, slides.map(function (s) { return s.offsetHeight; })) + 'px';
    }
    fitStage();
    ScrollTrigger.addEventListener('refreshInit', fitStage);

    var titles = slides.map(function (s) { return new SplitText($('h3', s), { type: 'chars', mask: 'chars' }); });

    gsap.set(slides, { transformOrigin: '50% 100%' });
    gsap.set(slides.slice(1), { autoAlpha: 0, yPercent: 45, rotation: 5, rotationX: -18 });

    // 카드 i가 기울며 위로 빠지고, 카드 i+1이 아래에서 세워지며 들어옴
    var deck = gsap.timeline({ defaults: { ease: 'none', duration: 1 } });
    for (var i = 0; i < count - 1; i++) {
      deck.to(slides[i], { yPercent: -35, rotation: -6, rotationX: 22, scale: 0.88, autoAlpha: 0 }, i)
          .to(slides[i + 1], { yPercent: 0, rotation: 0, rotationX: 0, autoAlpha: 1 }, i);
    }

    function setActive(idx, dir) {
      if (idx === current) return;
      current = idx;
      rollText(num, String(idx + 1).padStart(2, '0'), dir);
      bars.forEach(function (b, k) { b.classList.toggle('on', k <= idx); });
      gsap.fromTo(titles[idx].chars, { yPercent: 110 * dir }, { yPercent: 0, duration: 0.7, stagger: 0.03, ease: 'power3.out', overwrite: true });
    }
    bars[0].classList.add('on');

    ScrollTrigger.create({
      trigger: svcSec,
      start: 'top ' + HEADER + 'px',
      end: function () { return '+=' + (count - 1) * window.innerHeight * 0.9; },
      pin: true,
      scrub: 0.6,
      animation: deck,
      snap: { snapTo: 1 / (count - 1), duration: { min: 0.2, max: 0.6 }, delay: 0.05, ease: 'power2.inOut' },
      onUpdate: function (self) { setActive(Math.round(self.progress * (count - 1)), self.direction || 1); }
    });
  }

  /* ---------- 4-3. 메뉴 링크: 마우스를 올리면 글자가 위로 굴러감 ---------- */
  $$('.nav a').forEach(function (a) {
    var label = a.textContent;
    a.classList.add('roll-link');
    a.innerHTML = '<span data-text="' + label.replace(/"/g, '&quot;') + '">' + label + '</span>';
  });

  /* ---------- 5. 카드류: 묶어서 순서대로 등장 (위치는 lag가 담당하므로 크기·투명도만) ---------- */
  var cards = '.step, .member, .metric, .card, .sw, .grade, .logo-stage, .misuse > div, .type-row';
  gsap.set(cards, { autoAlpha: 0, scale: 0.94 });
  ScrollTrigger.batch(cards, {
    start: 'top 90%', once: true,
    onEnter: function (batch) {
      gsap.to(batch, { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'power3.out', stagger: 0.08, overwrite: 'auto' });
    }
  });

  /* ---------- 6. 흐르는 띠: 스크롤 방향으로 밀림 ---------- */
  if ($('.strip-move')) {
    gsap.fromTo('.strip-move', { x: 0 }, {
      x: -260, ease: 'none',
      scrollTrigger: { trigger: '.strip', start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }

  /* ---------- 7. 품질 기준: 탭과 타임라인 ---------- */
  if ($('.std-tabs')) {
    gsap.from('.std-tabs', { y: 30, autoAlpha: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.std-tabs', start: 'top 88%' } });
    gsap.from('#std-general .tl-box, #std-general .tl-launch', {
      y: 50, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: '#std-general .timeline', start: 'top 85%' }
    });
    // 탭을 바꾸면 페이지 높이가 바뀌므로 위치 다시 계산
    $$('.std-tabs [role="tab"]').forEach(function (t) {
      t.addEventListener('click', function () { requestAnimationFrame(function () { ScrollTrigger.refresh(); }); });
    });
  }

  /* ---------- 8. 성과 숫자: 카운트업 ---------- */
  $$('.metric b').forEach(function (b) {
    var m = b.textContent.match(/^([^\d]*)(\d+(?:\.\d+)?)(.*)$/);
    if (!m) return;
    var end = parseFloat(m[2]);
    var dec = (m[2].split('.')[1] || '').length;
    var o = { v: 0 };
    b.textContent = m[1] + (0).toFixed(dec) + m[3];
    gsap.to(o, {
      v: end, duration: 1.6, ease: 'power2.out',
      scrollTrigger: { trigger: b, start: 'top 90%', once: true },
      onUpdate: function () { b.textContent = m[1] + o.v.toFixed(dec) + m[3]; }
    });
  });

  /* ---------- 9. 검증 배지: 오른쪽에서 차례로 ---------- */
  if ($('.badge-list')) {
    gsap.from('.badge-item', {
      x: cols === 1 ? 0 : 60, y: cols === 1 ? 40 : 0, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: '.badge-list', start: 'top 85%' }
    });
  }
  if ($('.badge-stage')) {
    gsap.from('.badge-stage .vbadge', {
      y: 30, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: '.badge-stage', start: 'top 85%' }
    });
  }

  /* ---------- 10. 마지막 CTA: 큰 심볼이 회전하며 커짐 ---------- */
  if ($('.big-mark')) {
    gsap.fromTo('.big-mark', { rotate: -18, scale: 0.8 }, {
      rotate: 18, scale: 1.2, ease: 'none',
      scrollTrigger: { trigger: '.cta-sec', start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }

  // 웹폰트가 늦게 적용되면 높이가 바뀌므로 다시 계산
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });

  // 다른 페이지에서 #앵커로 들어온 경우
  if (location.hash.length > 1 && document.getElementById(location.hash.slice(1))) {
    setTimeout(function () { smoother.scrollTo(document.getElementById(location.hash.slice(1)), false, 'top ' + HEADER + 'px'); }, 60);
  }
})();
