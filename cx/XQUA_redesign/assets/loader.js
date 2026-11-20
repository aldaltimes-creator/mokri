/* 첫 진입 로딩 (GSAP 필요)
   1) 퍼센트가 0→100%로 올라가는 동안 가는 선이 아래 가운데에서 양쪽으로 올라가 프레임을 완성
   2) 파란 브래킷이 찍히고 민트 체크가 그려짐
   3) 프레임 안쪽 창문이 열리며 화면 전체로 커지고 사이트가 드러남
   클릭하거나 아무 키나 누르면 바로 끝으로 건너뜀. */
(function () {
  var loader = document.getElementById('cx-loader');
  if (!loader) return;
  var root = document.documentElement;

  function finish() {
    root.classList.remove('cx-loading');
    if (loader.isConnected) loader.remove();
  }

  // GSAP이 없거나 '동작 줄이기' 사용자 → 짧게 페이드만
  if (!window.gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    loader.style.transition = 'opacity .4s';
    requestAnimationFrame(function () { loader.style.opacity = '0'; });
    setTimeout(finish, 450);
    return;
  }

  root.classList.add('cx-loading');

  var lines = loader.querySelectorAll('.ln');
  var brackets = loader.querySelector('.br');
  var check = loader.querySelector('.chk');
  var frame = loader.querySelector('.cx-frame');
  var win = loader.querySelector('.cx-window');
  var pct = loader.querySelector('.cx-loader__pct');

  // 선 그리기 준비: 선 길이만큼 점선 간격을 두고 밀어 둠
  [].forEach.call(loader.querySelectorAll('path'), function (p) {
    var len = p.getTotalLength();
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
  });
  gsap.set(brackets, { autoAlpha: 0 });

  var counter = { v: 0 };
  var tl = gsap.timeline({ onComplete: finish });

  tl.to(counter, {
      v: 100, duration: 2.4, ease: 'power2.inOut',
      onUpdate: function () { pct.textContent = Math.round(counter.v) + '%'; }
    }, 0)
    .to(lines, { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut' }, 0)
    .to(brackets, { autoAlpha: 1, strokeDashoffset: 0, duration: 0.5, ease: 'power3.out' }, '-=0.25')
    .to(check, { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out' }, '-=0.15')
    .to('.cx-loader__text, .cx-loader__brand', { autoAlpha: 0, y: 8, duration: 0.3 }, '+=0.15')
    // 창문이 프레임 크기로 열리고 → 화면 전체로 커짐. 이 순간부터 페이지 등장 애니메이션 시작
    .add(function () { root.classList.remove('cx-loading'); }, '<')
    .to(win, {
      width: function () { return frame.getBoundingClientRect().width * 0.9; },
      height: function () { return frame.getBoundingClientRect().height * 0.9; },
      duration: 0.5, ease: 'power3.inOut'
    }, '<')
    .to(check, { autoAlpha: 0, duration: 0.25 }, '<0.2')
    .to(win, {
      width: function () { return window.innerWidth * 1.02; },
      height: function () { return window.innerHeight * 1.02; },
      duration: 1.1, ease: 'expo.inOut'
    })
    .to(frame, { scale: 3.2, autoAlpha: 0, duration: 1.1, ease: 'expo.inOut' }, '<');

  function skip() { if (tl.progress() < 1) tl.progress(1); }
  loader.addEventListener('click', skip);
  window.addEventListener('keydown', skip, { once: true });
})();
