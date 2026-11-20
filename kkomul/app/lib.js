// 꼬물상자 앱 공통: Supabase 클라이언트, 로그인 확인, 작은 도우미들
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const configured = !SUPABASE_URL.includes('YOUR-PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR-ANON-KEY');

export const sb = configured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// 설정 전이면 안내 띠를 보여 주고 멈춤
export function guardConfig() {
  if (configured) return true;
  const bar = document.createElement('div');
  bar.className = 'setup-bar';
  bar.innerHTML = '<b>Supabase 연결이 아직 안 됐어요.</b> <code>app/config.js</code>에 프로젝트 URL과 anon 키를 넣어 주세요. 자세한 방법은 <code>supabase/SETUP.md</code>에 있어요.';
  document.body.prepend(bar);
  return false;
}

// 로그인한 사용자 (없으면 로그인 화면으로)
export async function requireUser() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    location.replace(`login.html?next=${encodeURIComponent(location.pathname.split('/').pop() + location.search)}`);
    return new Promise(() => {}); // 이동하는 동안 아래 코드가 돌지 않게
  }
  return session.user;
}

export async function signOut() {
  await sb.auth.signOut();
  location.replace('login.html');
}

// DOM 도우미: 텍스트는 언제나 textContent로 넣어 사용자 입력이 HTML로 해석되지 않게
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);

// 알림 한 줄
let toastTimer;
export function toast(msg, kind = 'info') {
  let t = $('.toast');
  if (!t) { t = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(t); }
  t.textContent = msg;
  t.dataset.kind = kind;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 3600);
}

// 날짜
export const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const monthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
export const fmtDate = (s) => { const d = new Date(`${s}T00:00:00`); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
export const fmtMonth = (d) => `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
export const won = (n) => `${n.toLocaleString('ko-KR')}원`;

export function ageLabel(birth) {
  if (!birth) return '';
  const b = new Date(`${birth}T00:00:00`); const n = new Date();
  const m = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth()) - (n.getDate() < b.getDate() ? 1 : 0);
  if (m < 0) return '';
  return m < 36 ? `${m}개월` : `${Math.floor(m / 12)}살`;
}

// 비공개 사진 주소 (1시간짜리 서명 URL)
export async function photoUrls(paths) {
  if (!paths?.length) return {};
  const { data, error } = await sb.storage.from('record-photos').createSignedUrls(paths, 3600);
  if (error) return {};
  return Object.fromEntries(data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
}

// 지금 이용권과 남은 횟수
export async function creditStatus() {
  const { data, error } = await sb.rpc('credit_status');
  if (error) throw error;
  return data?.[0] ?? null;
}

// 버튼을 잠깐 '진행 중' 상태로
export async function busy(btn, label, fn) {
  const old = btn.textContent;
  btn.disabled = true; btn.textContent = label;
  try { return await fn(); }
  finally { btn.disabled = false; btn.textContent = old; }
}
