// 계정: 아이 정보 고치기, 비밀번호 바꾸기(재설정 메일로 들어온 경우 포함), 로그아웃
import { sb, guardConfig, requireUser, $, toast, busy, signOut } from './lib.js';

if (!guardConfig()) await new Promise(() => {}); // 설정 전에는 여기서 멈춤
const user = await requireUser();
$('#email').textContent = user.email;

// 재설정 메일 링크로 들어오면 비밀번호 칸으로 안내
sb.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    $('#pw-form').password.focus();
    toast('새 비밀번호를 정해 주세요');
  }
});

const { data: children } = await sb.from('children').select('*').order('created_at').limit(1);
const child = children?.[0];
const cf = $('#child-form');
if (child) {
  cf.name.value = child.name;
  cf.birth_date.value = child.birth_date ?? '';
  cf.likes.value = child.likes.join(', ');
  cf.family_call.value = child.family_call ?? '';
} else {
  cf.closest('section').hidden = true;
}

cf.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.submitter;
  await busy(btn, '저장하는 중…', async () => {
    const { error } = await sb.from('children').update({
      name: cf.name.value.trim(),
      birth_date: cf.birth_date.value || null,
      likes: cf.likes.value.split(/[,，、]/).map((s) => s.trim()).filter(Boolean).slice(0, 8),
      family_call: cf.family_call.value.trim() || null,
    }).eq('id', child.id);
    toast(error ? `저장하지 못했어요: ${error.message}` : '아이 정보를 저장했어요', error ? 'error' : 'info');
  });
});

$('#pw-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = e.target.password.value;
  if (pw.length < 8) return toast('비밀번호는 8자 이상이에요', 'error');
  await busy(e.submitter, '바꾸는 중…', async () => {
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) return toast(`바꾸지 못했어요: ${error.message}`, 'error');
    e.target.reset();
    toast('비밀번호를 바꿨어요');
  });
});

$('#logout').addEventListener('click', signOut);
