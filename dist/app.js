const phone = document.querySelector('.phone');
const video = document.querySelector('#camera');
const incoming = document.querySelector('#incoming');
const activeCall = document.querySelector('#activeCall');
const ended = document.querySelector('#ended');
const cameraPrompt = document.querySelector('#cameraPrompt');
const cameraMessage = document.querySelector('#cameraMessage');
const timer = document.querySelector('#timer');
const toast = document.querySelector('#toast');
const stage = document.querySelector('.stage');
const editorToggle = document.querySelector('#editorToggle');

let stream = null;
let elapsed = 0;
let timerId = null;
let toastId = null;

const editorDefaults = {
  name: '오은영 선생님',
  label: '영상통화',
  status: 'FaceTime 요청 중…',
  incomingBlur: 5,
  activeBlur: 0
};

function readEditorSettings() {
  try {
    return { ...editorDefaults, ...JSON.parse(localStorage.getItem('videoCallMockupSettings') || '{}') };
  } catch {
    return { ...editorDefaults };
  }
}

function applyEditorSettings(settings, save = true) {
  const safe = { ...editorDefaults, ...settings };
  document.querySelectorAll('[data-edit="name"]').forEach(el => { el.textContent = safe.name || editorDefaults.name; });
  document.querySelectorAll('[data-edit="label"]').forEach(el => { el.textContent = safe.label || editorDefaults.label; });
  document.querySelectorAll('[data-edit="status"]').forEach(el => { el.textContent = safe.status || editorDefaults.status; });

  document.querySelector('#nameInput').value = safe.name;
  document.querySelector('#labelInput').value = safe.label;
  document.querySelector('#statusInput').value = safe.status;
  document.querySelector('#incomingBlur').value = safe.incomingBlur;
  document.querySelector('#activeBlur').value = safe.activeBlur;
  document.querySelector('#incomingBlurValue').textContent = `${safe.incomingBlur}px`;
  document.querySelector('#activeBlurValue').textContent = `${safe.activeBlur}px`;
  phone.style.setProperty('--incoming-blur', `${safe.incomingBlur}px`);
  phone.style.setProperty('--active-blur', `${safe.activeBlur}px`);

  if (save) localStorage.setItem('videoCallMockupSettings', JSON.stringify(safe));
}

function currentEditorSettings() {
  return {
    name: document.querySelector('#nameInput').value,
    label: document.querySelector('#labelInput').value,
    status: document.querySelector('#statusInput').value,
    incomingBlur: Number(document.querySelector('#incomingBlur').value),
    activeBlur: Number(document.querySelector('#activeBlur').value)
  };
}

function setEditorOpen(open) {
  stage.classList.toggle('editor-open', open);
  editorToggle.setAttribute('aria-expanded', String(open));
}

function updateClock() {
  document.querySelector('#clock').textContent = new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric', minute: '2-digit', hour12: false
  }).format(new Date());
}

function showToast(message) {
  clearTimeout(toastId);
  toast.textContent = message;
  toast.classList.add('show');
  toastId = setTimeout(() => toast.classList.remove('show'), 2300);
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraMessage.textContent = '이 브라우저에서는 카메라를 사용할 수 없습니다.';
    cameraPrompt.hidden = false;
    phone.classList.add('camera-off');
    return false;
  }

  try {
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    });
    video.srcObject = stream;
    await video.play();
    cameraPrompt.hidden = true;
    phone.classList.remove('camera-off');
    return true;
  } catch (error) {
    const blocked = error.name === 'NotAllowedError' || error.name === 'SecurityError';
    cameraMessage.textContent = blocked
      ? '카메라 권한을 허용하면 내 화면이 여기에 바로 보여요.'
      : '카메라를 찾지 못했습니다. 연결 상태를 확인해 주세요.';
    cameraPrompt.hidden = false;
    phone.classList.add('camera-off');
    return false;
  }
}

function stopCamera() {
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
  video.srcObject = null;
  phone.classList.add('camera-off');
}

function setScreen(name) {
  incoming.hidden = name !== 'incoming';
  activeCall.hidden = name !== 'active';
  ended.hidden = name !== 'ended';
  phone.classList.toggle('in-call', name === 'active');
  if (name !== 'active') phone.classList.remove('blur-on');
}

function beginTimer() {
  clearInterval(timerId);
  elapsed = 0;
  timer.textContent = '00:00';
  timerId = setInterval(() => {
    elapsed += 1;
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const seconds = String(elapsed % 60).padStart(2, '0');
    timer.textContent = `${minutes}:${seconds}`;
  }, 1000);
}

function endCall() {
  clearInterval(timerId);
  timerId = null;
  stopCamera();
  setScreen('ended');
}

document.querySelector('#enableCamera').addEventListener('click', startCamera);
document.querySelector('#accept').addEventListener('click', async () => {
  if (!stream && !(await startCamera())) return;
  setScreen('active');
  beginTimer();
});
document.querySelector('#decline').addEventListener('click', endCall);
document.querySelector('#hangup').addEventListener('click', endCall);
document.querySelector('#restart').addEventListener('click', async () => {
  setScreen('incoming');
  await startCamera();
});
document.querySelector('#remind').addEventListener('click', () => showToast('1시간 뒤에 다시 알려드릴게요'));
document.querySelector('#message').addEventListener('click', () => showToast('“지금 통화할 수 없어요” 메시지를 준비했어요'));

document.querySelector('#mute').addEventListener('click', (event) => {
  const button = event.currentTarget;
  const pressed = button.getAttribute('aria-pressed') === 'true';
  button.setAttribute('aria-pressed', String(!pressed));
  showToast(pressed ? '음소거를 해제했어요' : '음소거했어요');
});

document.querySelector('#blur').addEventListener('click', (event) => {
  const button = event.currentTarget;
  const pressed = button.getAttribute('aria-pressed') === 'true';
  button.setAttribute('aria-pressed', String(!pressed));
  phone.classList.toggle('blur-on', !pressed);
});

editorToggle.addEventListener('click', () => setEditorOpen(!stage.classList.contains('editor-open')));
document.querySelector('#editorClose').addEventListener('click', () => setEditorOpen(false));
document.querySelectorAll('#nameInput, #labelInput, #statusInput, #incomingBlur, #activeBlur').forEach(input => {
  input.addEventListener('input', () => applyEditorSettings(currentEditorSettings()));
});
document.querySelector('#resetEditor').addEventListener('click', () => {
  applyEditorSettings(editorDefaults);
  showToast('기본값으로 되돌렸어요');
});

window.addEventListener('pagehide', stopCamera);
applyEditorSettings(readEditorSettings(), false);
updateClock();
setInterval(updateClock, 30000);
startCamera();
