// Private preview sign-up: client-side validation only (no backend yet).
(function () {
  const form = document.querySelector('[data-signup]');
  if (!form) return;
  const email = form.querySelector('#email');
  const consent = form.querySelector('#consent');
  const error = form.querySelector('[data-signup-error]');
  const done = document.querySelector('[data-signup-done]');

  function showError(msg) {
    error.textContent = msg;
    error.hidden = !msg;
  }

  email.addEventListener('input', () => showError(''));
  consent.addEventListener('change', () => showError(''));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      showError('올바른 이메일 주소를 입력해 주세요.');
      email.focus();
      return;
    }
    if (!consent.checked) {
      showError('개인정보 수집·이용에 동의해 주세요.');
      consent.focus();
      return;
    }
    form.hidden = true;
    done.hidden = false;
    done.focus();
  });
})();
