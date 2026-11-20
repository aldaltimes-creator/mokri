// 360° product viewer: auto-rotates, drag to turn, arrows / slider to step.
(function () {
  const FRAME_MS = 420;
  const PX_PER_FRAME = 36;

  document.querySelectorAll('[data-spin-root]').forEach((root) => {
    const stage = root.querySelector('[data-spin-stage]');
    const range = root.querySelector('[data-spin-range]');
    const count = root.querySelector('[data-spin-count]');
    const toggle = root.querySelector('[data-spin-toggle]');
    const total = Number(stage.dataset.count);
    const base = stage.dataset.frames;
    const altText = stage.dataset.alt;

    const imgs = [];
    for (let i = 1; i <= total; i++) {
      const img = document.createElement('img');
      img.src = base + String(i).padStart(2, '0') + '.webp';
      img.alt = '';
      img.draggable = false;
      stage.appendChild(img);
      imgs.push(img);
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let playing = !reduceMotion;
    let drag = null;

    const wrap = (n) => ((n % total) + total) % total;

    function render() {
      imgs.forEach((img, i) => {
        const on = i === frame;
        img.classList.toggle('is-active', on);
        img.alt = on ? `${altText} ${i + 1}/${total}` : '';
      });
      range.value = frame;
      count.textContent = String(frame + 1).padStart(2, '0') + ' / ' + total;
      toggle.textContent = playing ? '자동 회전 멈춤' : '자동 회전';
      toggle.setAttribute('aria-pressed', String(playing));
    }

    function go(n) {
      frame = wrap(n);
      playing = false;
      render();
    }

    root.querySelector('[data-spin-prev]').addEventListener('click', () => go(frame - 1));
    root.querySelector('[data-spin-next]').addEventListener('click', () => go(frame + 1));
    range.max = total - 1;
    range.addEventListener('input', () => go(Number(range.value)));
    toggle.addEventListener('click', () => { playing = !playing; render(); });

    stage.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, f: frame };
      playing = false;
      stage.classList.add('is-dragging');
      stage.setPointerCapture(e.pointerId);
      render();
    });
    stage.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const n = wrap(drag.f - Math.round((e.clientX - drag.x) / PX_PER_FRAME));
      if (n !== frame) { frame = n; render(); }
    });
    const end = () => { drag = null; stage.classList.remove('is-dragging'); };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);

    setInterval(() => {
      if (playing && !drag) { frame = wrap(frame + 1); render(); }
    }, FRAME_MS);

    render();
  });
})();
