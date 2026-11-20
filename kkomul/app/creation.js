// 만든 동화·노래 보기, 하드북 주문
import { sb, guardConfig, requireUser, h, $, toast, fmtDate, photoUrls, busy } from './lib.js';

if (!guardConfig()) await new Promise(() => {}); // 설정 전에는 여기서 멈춤
await requireUser();

const id = new URLSearchParams(location.search).get('id');
const root = $('#creation');
let creation = null;

async function load() {
  const { data, error } = await sb.from('creations')
    .select('*, records(title, record_date, photo_paths), children(name)')
    .eq('id', id).maybeSingle();
  if (error || !data) {
    root.replaceChildren(h('div', { class: 'empty' },
      h('b', {}, '작품을 찾을 수 없어요'),
      h('a', { class: 'btn btn--ghost btn--sm', href: 'index.html' }, '앨범으로')));
    return;
  }
  creation = data;
  if (data.status === 'pending') return renderPending();
  if (data.status === 'failed') return renderFailed();
  await renderReady();
}

let polls = 0;
function renderPending() {
  root.replaceChildren(h('div', { class: 'empty' },
    h('b', {}, '아직 만들고 있어요'),
    h('p', { class: 'muted' }, '잠시 뒤에 자동으로 보여 드려요.')));
  if (polls++ < 40) setTimeout(load, 3000);
}

function renderFailed() {
  root.replaceChildren(h('div', { class: 'empty' },
    h('b', {}, '만들지 못했어요'),
    h('p', { class: 'muted' }, creation.error ?? '잠시 뒤 다시 시도해 주세요.'),
    h('p', { class: 'muted' }, '실패한 작품은 횟수에서 빠져요.'),
    h('a', { class: 'btn btn--ghost btn--sm', href: 'index.html', style: 'margin-top:12px' }, '앨범으로')));
}

async function renderReady() {
  const c = creation;
  const rec = c.records;
  const isStory = c.kind === 'story';
  const photo = rec?.photo_paths?.[0];
  const urls = photo ? await photoUrls([photo]) : {};
  document.title = `${c.title} — 꼬물상자`;

  const body = isStory
    ? h('div', { class: 'story-pages' }, ...(c.content?.pages ?? []).map((p, i) =>
        h('section', { class: 'story-page', 'aria-label': `${i + 1}쪽` },
          h('p', {}, p.text),
          h('span', { class: 'story-page__num', 'aria-hidden': 'true' }, `${i + 1}`))))
    : h('ol', { class: 'song-lines' }, ...(c.content?.lines ?? []).map((l) => h('li', {}, l)));

  root.replaceChildren(
    h('p', { class: 'creation__type' }, isStory ? '동화' : `노래${c.content?.mood ? ` · ${c.content.mood}` : ''}`),
    h('h1', { class: 'creation__title' }, c.title),
    h('p', { class: 'muted' },
      `${c.children?.name ?? ''}의 ${rec ? `${fmtDate(rec.record_date)} 「${rec.title}」` : ''} 기록으로 만들었어요`),
    urls[photo] && h('img', { class: 'creation__photo', src: urls[photo], alt: `${rec.title} 사진` }),
    body,
    !isStory && h('p', { class: 'muted', style: 'margin-top:12px' }, '지금은 가사만 보여 드려요. 음원은 다음 단계에서 붙여요.'),
    h('div', { class: 'creation__actions' },
      h('a', { class: 'btn btn--ghost btn--sm', href: 'index.html' }, '← 앨범으로'),
      isStory && h('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: openOrder }, '하드북으로 받기 · 35,000원'),
      h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: copyText }, '글 복사'),
    ),
  );
}

async function copyText() {
  const c = creation;
  const text = [c.title, '', ...(c.kind === 'story' ? (c.content?.pages ?? []).map((p) => p.text) : (c.content?.lines ?? []))].join('\n');
  try { await navigator.clipboard.writeText(text); toast('복사했어요'); }
  catch { toast('복사하지 못했어요. 글을 길게 눌러 복사해 주세요.', 'error'); }
}

function openOrder() {
  const f = $('#order-form');
  f.reset();
  f.cover_name.value = creation.children?.name ?? '';
  $('#order-dialog').showModal();
}

$('#order-form').addEventListener('submit', async (e) => {
  if (e.submitter?.value !== 'save') return;
  e.preventDefault();
  if (!e.target.reportValidity()) return;
  const f = new FormData(e.target);
  await busy(e.submitter, '접수하는 중…', async () => {
    const { error } = await sb.from('book_orders').insert({
      creation_id: creation.id,
      cover_name: String(f.get('cover_name')).trim(),
      recipient: String(f.get('recipient')).trim(),
      phone: String(f.get('phone')).trim(),
      address: String(f.get('address')).trim(),
    });
    if (error) return toast(`접수하지 못했어요: ${error.message}`, 'error');
    $('#order-dialog').close();
    toast('하드북 주문을 접수했어요. 이용권 화면에서 확인할 수 있어요.');
  });
});

if (!id) location.replace('index.html');
else load();
