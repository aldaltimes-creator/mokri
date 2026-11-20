// 우리 아이 앨범: 아이 소개, 달별 기록, 이달의 순간, 동화·노래 만들기
import {
  sb, guardConfig, requireUser, h, $, toast, ymd, monthStart, fmtDate, fmtMonth,
  ageLabel, photoUrls, creditStatus, busy,
} from './lib.js';

if (!guardConfig()) await new Promise(() => {}); // 설정 전에는 여기서 멈춤
const user = await requireUser();

const state = {
  child: null,
  month: monthStart(new Date()),
  credit: null,
  moment: null,
  pendingPhotos: [], // { file, url }
};

// ---------------------------------------------------------------- 아이
async function loadChild() {
  const { data, error } = await sb.from('children').select('*').order('created_at').limit(1);
  if (error) throw error;
  state.child = data[0] ?? null;
}

$('#child-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const likes = String(f.get('likes') ?? '').split(/[,，、]/).map((s) => s.trim()).filter(Boolean).slice(0, 8);
  const btn = e.target.querySelector('button[type=submit]');
  await busy(btn, '저장하는 중…', async () => {
    const { data, error } = await sb.from('children').insert({
      name: String(f.get('name')).trim(),
      birth_date: f.get('birth_date') || null,
      likes,
      family_call: String(f.get('family_call') ?? '').trim() || null,
    }).select().single();
    if (error) return toast(`저장하지 못했어요: ${error.message}`, 'error');
    state.child = data;
    await showDash();
  });
});

// ---------------------------------------------------------------- 이용권
function renderPlan() {
  const box = $('#plan-box');
  const c = state.credit;
  box.replaceChildren();
  box.classList.toggle('plan-box--none', !c);
  if (!c) {
    box.append(
      h('p', { class: 'plan-box__name' }, '이용권이 없어요'),
      h('p', { class: 'muted' }, '기록은 남길 수 있어요. 동화·노래를 만들려면 이용권을 골라 주세요.'),
      h('a', { class: 'btn btn--primary btn--sm', href: 'plans.html', style: 'margin-top:8px' }, '이용권 고르기'),
    );
  } else {
    const end = new Date(c.ends_at);
    box.append(
      h('p', { class: 'plan-box__name' }, c.plan_name),
      h('p', { class: 'plan-box__left' },
        h('span', {}, '동화 ', h('b', {}, `${c.stories_left}편`), ' 남음'),
        h('span', {}, '노래 ', h('b', {}, `${c.songs_left}곡`), ' 남음')),
      h('p', { class: 'muted' }, `${end.getMonth() + 1}월 ${end.getDate()}일까지`),
    );
  }
  const notice = $('#save-notice');
  notice.hidden = !(c && !c.saves_album);
  notice.textContent = '체험권은 앨범이 저장되지 않아요. 이용 기간이 끝나고 7일이 지나면 기록이 지워져요. 계속 모아 두려면 월간 구독으로 바꿔 주세요.';
}

// ---------------------------------------------------------------- 달 이동
const monthEnd = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
$('#prev-month').addEventListener('click', () => { state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1); loadMonth(); });
$('#next-month').addEventListener('click', () => { state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1); loadMonth(); });

// ---------------------------------------------------------------- 이달의 순간
function renderMoments() {
  const m = state.moment ?? {};
  const items = [['가장 좋아한 말', m.favorite_word], ['처음 한 말', m.first_word], ['처음 한 행동', m.first_action]];
  $('#moment-list').replaceChildren(...items.map(([label, v]) =>
    h('div', { class: 'moment-item' },
      h('dt', {}, label),
      h('dd', { class: v ? '' : 'is-empty' }, v ? (label.includes('말') ? `“${v}”` : v) : '아직 비어 있어요'))));
  $('#edit-moments').textContent = state.moment ? '고치기' : '적기';
}

$('#edit-moments').addEventListener('click', () => {
  const f = $('#moment-form');
  const m = state.moment ?? {};
  f.favorite_word.value = m.favorite_word ?? '';
  f.first_word.value = m.first_word ?? '';
  f.first_action.value = m.first_action ?? '';
  $('#moment-dialog-title').textContent = `${state.month.getMonth() + 1}월의 순간`;
  $('#moment-dialog').showModal();
});

$('#moment-form').addEventListener('submit', async (e) => {
  if (e.submitter?.value !== 'save') return;
  e.preventDefault();
  const f = new FormData(e.target);
  const row = {
    child_id: state.child.id,
    month: ymd(state.month),
    favorite_word: String(f.get('favorite_word')).trim() || null,
    first_word: String(f.get('first_word')).trim() || null,
    first_action: String(f.get('first_action')).trim() || null,
    updated_at: new Date().toISOString(),
  };
  await busy(e.submitter, '저장하는 중…', async () => {
    const { data, error } = await sb.from('moments').upsert(row, { onConflict: 'child_id,month' }).select().single();
    if (error) return toast(`저장하지 못했어요: ${error.message}`, 'error');
    state.moment = data;
    renderMoments();
    $('#moment-dialog').close();
    toast('이달의 순간을 남겼어요');
  });
});

// ---------------------------------------------------------------- 기록 목록
const KIND = { story: '동화', song: '노래' };

async function loadMonth() {
  $('#month-label').textContent = fmtMonth(state.month);
  $('#next-month').disabled = state.month >= monthStart(new Date());
  const list = $('#records');
  list.replaceChildren(h('p', { class: 'muted' }, '불러오는 중…'));

  const [recRes, momRes] = await Promise.all([
    sb.from('records').select('*')
      .eq('child_id', state.child.id)
      .gte('record_date', ymd(state.month)).lte('record_date', ymd(monthEnd(state.month)))
      .order('record_date', { ascending: false }).order('created_at', { ascending: false }),
    sb.from('moments').select('*').eq('child_id', state.child.id).eq('month', ymd(state.month)).maybeSingle(),
  ]);
  if (recRes.error) return list.replaceChildren(h('p', { class: 'muted' }, `불러오지 못했어요: ${recRes.error.message}`));
  state.moment = momRes.data ?? null;
  renderMoments();

  const records = recRes.data;
  if (!records.length) {
    list.replaceChildren(h('div', { class: 'empty' },
      h('b', {}, `${state.month.getMonth() + 1}월 기록이 아직 없어요`),
      h('p', { class: 'muted' }, '한 달에 3~4번, 사진과 그날 있었던 일을 남겨 보세요.')));
    return;
  }

  const ids = records.map((r) => r.id);
  const [{ data: creations }, urls] = await Promise.all([
    sb.from('creations').select('id, record_id, kind, status, title').in('record_id', ids).order('created_at'),
    photoUrls(records.map((r) => r.photo_paths[0]).filter(Boolean)),
  ]);
  list.replaceChildren(...records.map((r) => recordCard(r, urls, (creations ?? []).filter((c) => c.record_id === r.id))));
}

function recordCard(r, urls, made) {
  const cover = r.photo_paths[0] && urls[r.photo_paths[0]];
  const c = state.credit;
  const makeBtn = (kind) => {
    const left = c ? (kind === 'story' ? c.stories_left : c.songs_left) : 0;
    return h('button', {
      class: 'btn btn--ghost btn--sm', type: 'button', disabled: !c || left < 1,
      title: !c ? '이용권이 필요해요' : left < 1 ? `이번 기간 ${KIND[kind]}를 모두 만들었어요` : null,
      onclick: () => askMake(r, kind),
    }, `${KIND[kind]}로 만들기`);
  };

  return h('article', { class: 'card rec' },
    cover
      ? h('img', { class: 'rec__photo', src: cover, alt: `${r.title} 사진`, loading: 'lazy' })
      : h('div', { class: 'rec__photo rec__photo--empty' }, '사진 없음'),
    h('div', { class: 'rec__body' },
      h('p', { class: 'rec__date' }, `${fmtDate(r.record_date)}${r.photo_paths.length > 1 ? ` · 사진 ${r.photo_paths.length}장` : ''}`),
      h('h3', { class: 'rec__title' }, r.title),
      h('p', { class: 'rec__text' }, r.happened),
      r.child_words && h('p', { class: 'rec__words' }, `“${r.child_words}”`),
      r.worry && h('p', { class: 'rec__worry' }, h('b', {}, '힘들어하는 것 '), r.worry),
      h('div', { class: 'rec__actions' },
        ...made.map((m) => h('a', {
          class: 'made-link', href: `creation.html?id=${m.id}`, dataset: { status: m.status },
        }, m.status === 'ready' ? `${KIND[m.kind]} 「${m.title}」` : m.status === 'pending' ? `${KIND[m.kind]} 만드는 중` : `${KIND[m.kind]} 실패`)),
        makeBtn('story'), makeBtn('song'),
        h('button', { class: 'btn--text', type: 'button', style: 'margin-left:auto;color:var(--ink-sub)', onclick: () => removeRecord(r) }, '지우기'),
      )));
}

async function removeRecord(r) {
  if (!confirm(`「${r.title}」 기록을 지울까요? 사진도 함께 지워지고 되돌릴 수 없어요.`)) return;
  const { error } = await sb.from('records').delete().eq('id', r.id);
  if (error) return toast(`지우지 못했어요: ${error.message}`, 'error');
  if (r.photo_paths.length) await sb.storage.from('record-photos').remove(r.photo_paths);
  toast('기록을 지웠어요');
  loadMonth();
}

// ---------------------------------------------------------------- 동화·노래 만들기
let makeTarget = null;
function askMake(record, kind) {
  makeTarget = { record, kind };
  const left = kind === 'story' ? state.credit.stories_left : state.credit.songs_left;
  $('#make-dialog-title').textContent = `${KIND[kind]} 만들기`;
  $('#make-text').textContent = `「${record.title}」 기록으로 ${KIND[kind]}를 만들어요. 이번 기간에 남은 ${KIND[kind]} ${left}${kind === 'story' ? '편' : '곡'} 중 1번을 써요.`;
  $('#make-dialog').returnValue = ''; // Esc로 닫으면 이전 값이 남으므로 비워 둠
  $('#make-dialog').showModal();
}

$('#make-dialog').addEventListener('close', async () => {
  if ($('#make-dialog').returnValue !== 'make' || !makeTarget) return;
  const { record, kind } = makeTarget;
  makeTarget = null;
  toast(`${KIND[kind]}를 만들고 있어요. 1분쯤 걸려요…`);
  document.body.style.cursor = 'progress';
  try {
    const { data, error } = await sb.functions.invoke('generate', { body: { record_id: record.id, kind } });
    if (error) {
      let msg = error.message;
      try { msg = (await error.context.json()).error ?? msg; } catch { /* 본문 없음 */ }
      toast(msg, 'error');
      await refreshCredit();
      loadMonth();
      return;
    }
    location.href = `creation.html?id=${data.creation_id}`;
  } finally {
    document.body.style.cursor = '';
  }
});

async function refreshCredit() {
  try { state.credit = await creditStatus(); } catch { state.credit = null; }
  renderPlan();
}

// ---------------------------------------------------------------- 기록 쓰기
const MAX_PHOTOS = 6;

$('#new-record').addEventListener('click', () => {
  const f = $('#record-form');
  f.reset();
  const today = new Date();
  // 보고 있는 달이 이번 달이 아니면 그달 1일로
  f.record_date.value = monthStart(today).getTime() === state.month.getTime() ? ymd(today) : ymd(state.month);
  clearPhotos();
  $('#record-dialog').showModal();
});

function clearPhotos() {
  state.pendingPhotos.forEach((p) => URL.revokeObjectURL(p.url));
  state.pendingPhotos = [];
  renderPhotoPick();
}

function renderPhotoPick() {
  const pick = $('#photo-pick');
  const add = pick.querySelector('.photo-pick__add');
  pick.replaceChildren(
    ...state.pendingPhotos.map((p, i) => h('button', {
      type: 'button', title: '눌러서 빼기', style: 'border:0;padding:0;background:none;cursor:pointer',
      onclick: () => { URL.revokeObjectURL(p.url); state.pendingPhotos.splice(i, 1); renderPhotoPick(); },
    }, h('img', { src: p.url, alt: `고른 사진 ${i + 1}, 누르면 빠져요` }))),
    add,
  );
  add.hidden = state.pendingPhotos.length >= MAX_PHOTOS;
}

$('#photo-input').addEventListener('change', (e) => {
  for (const file of e.target.files) {
    if (state.pendingPhotos.length >= MAX_PHOTOS) break;
    if (!file.type.startsWith('image/')) continue;
    state.pendingPhotos.push({ file, url: URL.createObjectURL(file) });
  }
  e.target.value = '';
  renderPhotoPick();
});

// 긴 변 1600px JPEG로 줄여서 올림 (읽지 못하는 형식은 원본 그대로)
async function shrink(file) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = Object.assign(document.createElement('canvas'), {
      width: Math.round(bmp.width * scale), height: Math.round(bmp.height * scale),
    });
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    return blob ? { blob, ext: 'jpg', type: 'image/jpeg' } : { blob: file, ext: file.name.split('.').pop(), type: file.type };
  } catch {
    return { blob: file, ext: (file.name.split('.').pop() || 'jpg').toLowerCase(), type: file.type };
  }
}

$('#record-form').addEventListener('submit', async (e) => {
  if (e.submitter?.value !== 'save') return;
  e.preventDefault();
  const form = e.target;
  if (!form.reportValidity()) return;
  const f = new FormData(form);
  const id = crypto.randomUUID();
  const uploaded = [];

  await busy(e.submitter, '저장하는 중…', async () => {
    try {
      for (const [i, p] of state.pendingPhotos.entries()) {
        const { blob, ext, type } = await shrink(p.file);
        const path = `${user.id}/${id}/${i + 1}.${ext}`;
        const { error } = await sb.storage.from('record-photos').upload(path, blob, { contentType: type, upsert: false });
        if (error) throw new Error(`사진을 올리지 못했어요: ${error.message}`);
        uploaded.push(path);
      }
      const { error } = await sb.from('records').insert({
        id,
        child_id: state.child.id,
        record_date: f.get('record_date'),
        title: String(f.get('title')).trim(),
        happened: String(f.get('happened')).trim(),
        child_words: String(f.get('child_words')).trim() || null,
        worry: String(f.get('worry')).trim() || null,
        photo_paths: uploaded,
      });
      if (error) throw new Error(`저장하지 못했어요: ${error.message}`);

      $('#record-dialog').close();
      clearPhotos();
      toast('기록을 남겼어요');
      const d = new Date(`${f.get('record_date')}T00:00:00`);
      state.month = monthStart(d);
      loadMonth();
    } catch (err) {
      if (uploaded.length) await sb.storage.from('record-photos').remove(uploaded);
      toast(err.message, 'error');
    }
  });
});

// ---------------------------------------------------------------- 시작
async function showDash() {
  $('#onboard').hidden = true;
  $('#dash').hidden = false;
  const c = state.child;
  $('#kid-initial').textContent = c.name.slice(-2, -1) || c.name[0];
  $('#kid-name').textContent = `${c.name}${ageLabel(c.birth_date) ? ` · ${ageLabel(c.birth_date)}` : ''}`;
  $('#kid-likes').replaceChildren(...c.likes.map((l) => h('span', {}, l)));
  await refreshCredit();
  await loadMonth();
}

try {
  await loadChild();
  if (state.child) await showDash();
  else $('#onboard').hidden = false;
} catch (err) {
  toast(`불러오지 못했어요: ${err.message}`, 'error');
}
