// 꼬물상자 랜딩 — 탭, 샘플 노래 재생, 동화 넘김
(() => {
  // 헤더 스크롤 구분선
  const top = document.querySelector('.top');
  const onScroll = () => top.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // 탭 (화살표 키 이동 지원): 탭 묶음(tablist)마다 따로 동작
  document.querySelectorAll('[role="tablist"]').forEach((list) => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const select = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (list.contains(document.getElementById('tab-song')) && tab.id !== 'tab-song') stopSong();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (e) => {
        const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!dir) return;
        const next = tabs[(i + dir + tabs.length) % tabs.length];
        next.focus();
        select(next);
      });
    });
  });

  // 샘플 노래: 음원 없이 가사 하이라이트와 진행 바만 재현
  const player = document.querySelector('.player');
  const playBtn = player.querySelector('[data-play]');
  const bar = player.querySelector('[data-progress]');
  const time = player.querySelector('[data-time]');
  const lines = [...player.querySelectorAll('[data-lyrics] li')];
  const DURATION = 24;
  let elapsed = 0;
  let timer = null;

  const fmt = (s) => `0:${String(Math.floor(s)).padStart(2, '0')}`;
  const render = () => {
    bar.style.width = `${(elapsed / DURATION) * 100}%`;
    time.textContent = `${fmt(elapsed)} / ${fmt(DURATION)}`;
    const idx = Math.min(lines.length - 1, Math.floor((elapsed / DURATION) * lines.length));
    lines.forEach((li, i) => li.classList.toggle('is-on', elapsed > 0 && i === idx));
  };
  function stopSong() {
    clearInterval(timer);
    timer = null;
    player.classList.remove('is-playing');
    playBtn.setAttribute('aria-label', '재생');
  }
  playBtn.addEventListener('click', () => {
    if (timer) return stopSong();
    if (elapsed >= DURATION) elapsed = 0;
    player.classList.add('is-playing');
    playBtn.setAttribute('aria-label', '일시정지');
    timer = setInterval(() => {
      elapsed = Math.min(DURATION, elapsed + 0.25);
      render();
      if (elapsed >= DURATION) stopSong();
    }, 250);
  });
  render();

  // 쪽 넘김 (동화, 웹 앨범): [data-pager] 안의 [data-page]를 한 장씩 보여 줌
  document.querySelectorAll('[data-pager]').forEach((root) => {
    const pages = [...root.querySelectorAll('[data-page]')];
    const prev = root.querySelector('[data-prev]');
    const next = root.querySelector('[data-next]');
    const count = root.querySelector('[data-count]');
    let page = 0;
    const go = (n) => {
      page = Math.max(0, Math.min(pages.length - 1, n));
      pages.forEach((p, i) => p.classList.toggle('is-active', i === page));
      count.textContent = `${page + 1} / ${pages.length}`;
      prev.disabled = page === 0;
      next.disabled = page === pages.length - 1;
    };
    prev.addEventListener('click', () => go(page - 1));
    next.addEventListener('click', () => go(page + 1));
    go(0);
  });

  // 앨범 샘플: 웹 앨범 / 실물 책 전환
  const viewBtns = [...document.querySelectorAll('[data-view]')];
  viewBtns.forEach((btn) => btn.addEventListener('click', () => {
    viewBtns.forEach((b) => b.setAttribute('aria-pressed', b === btn));
    document.querySelectorAll('[data-album-view]').forEach((v) => {
      v.hidden = v.dataset.albumView !== btn.dataset.view;
    });
  }));
})();
