let vimeoPlayer = null;
let lastTime = 0;
let isPlaying = false;
let duration = 0;
let initPromise = null;
let onCompleteCallback = null;
let confirmSeekCallback = null;
let seekConfirmInProgress = false;
let isApplyingSeek = false;
let currentSessionId = null;

const SEEK_THRESHOLD = 2;

const COMPLETED_SUFFIX = 'video_completed';
const TIME_SUFFIX = 'video_time';
const COMPLETED_VALUE = '9bbb881c947f436888e2cd84a054d448';

function storageKey(suffix) {
  if (!currentSessionId) return null;
  return `atv:${currentSessionId}:${suffix}`;
}

export function setVideoSessionId(sessionId) {
  currentSessionId = sessionId ? String(sessionId) : null;
  lastTime = 0;
}

export function isVideoCompleted() {
  const key = storageKey(COMPLETED_SUFFIX);
  if (!key) return false;
  return localStorage.getItem(key) === COMPLETED_VALUE;
}

export function initVideoState() {
  const timeKey = storageKey(TIME_SUFFIX);
  if (!timeKey) return;

  if (!localStorage.getItem(timeKey)) {
    localStorage.setItem(timeKey, '0');
  }
}

export function setSeekConfirmHandler(handler) {
  confirmSeekCallback = handler;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function updatePlayPauseBtn() {
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  if (!playIcon || !pauseIcon) return;

  if (isPlaying) {
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
  } else {
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
  }
}

function updateProgressUI(seconds) {
  if (duration <= 0) return;

  const percent = (seconds / duration) * 100;
  const bar = document.getElementById('progress-bar');
  const thumb = document.getElementById('progress-thumb');
  const track = document.getElementById('progress-track');
  if (bar) bar.style.width = `${percent}%`;
  if (thumb) thumb.style.left = `${percent}%`;
  if (track) track.classList.toggle('has-progress', percent > 0.5);
  const timeEl = document.getElementById('progress-time');
  if (timeEl) {
    timeEl.textContent = `${formatTime(seconds)} / ${formatTime(duration)}`;
  }
}

function getSeekTimeFromPointer(event) {
  const rail = document.getElementById('progress-rail');
  if (!rail || duration <= 0) return null;

  const rect = rail.getBoundingClientRect();
  const clientX = 'touches' in event && event.touches.length
    ? event.touches[0].clientX
    : event.clientX;
  const percent = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  return percent * duration;
}

let isDraggingProgress = false;

function setThumbDragging(active) {
  const thumb = document.getElementById('progress-thumb');
  const track = document.getElementById('progress-track');
  if (thumb) {
    thumb.classList.toggle('is-dragging', active);
  }
  if (track) {
    track.classList.toggle('is-dragging', active);
  }
}

function finishProgressDrag(event) {
  if (!isDraggingProgress) return;

  isDraggingProgress = false;
  setThumbDragging(false);
  document.removeEventListener('mousemove', handleProgressDrag);
  document.removeEventListener('mouseup', finishProgressDrag);
  document.removeEventListener('touchmove', handleProgressDrag);
  document.removeEventListener('touchend', finishProgressDrag);

  const targetTime = getSeekTimeFromPointer(event);
  if (targetTime === null) return;

  requestSeek(targetTime).catch((error) => {
    console.error('No se pudo adelantar el video:', error);
  });
}

function handleProgressDrag(event) {
  if (!isDraggingProgress) return;

  const previewTime = getSeekTimeFromPointer(event);
  if (previewTime === null) return;

  updateProgressUI(previewTime);
}

function persistVideoTime(seconds) {
  const timeKey = storageKey(TIME_SUFFIX);
  if (timeKey) {
    localStorage.setItem(timeKey, seconds.toString());
  }
}

function markVideoCompleted() {
  const completedKey = storageKey(COMPLETED_SUFFIX);
  const timeKey = storageKey(TIME_SUFFIX);
  if (completedKey) {
    localStorage.setItem(completedKey, COMPLETED_VALUE);
  }
  if (timeKey) {
    localStorage.removeItem(timeKey);
  }
}

function applySeek(targetTime) {
  return ensureVimeoPlayer()
    .then((player) => {
      isApplyingSeek = true;
      return player.setCurrentTime(targetTime).then(() => player);
    })
    .then(() => {
      lastTime = targetTime;
      updateProgressUI(targetTime);
      persistVideoTime(targetTime);
    })
    .finally(() => {
      isApplyingSeek = false;
    });
}

async function requestSeek(targetTime) {
  if (isVideoCompleted() || targetTime <= lastTime + SEEK_THRESHOLD) {
    return applySeek(targetTime);
  }

  if (seekConfirmInProgress) return undefined;

  seekConfirmInProgress = true;
  const wasPlaying = isPlaying;

  if (wasPlaying && vimeoPlayer) {
    await vimeoPlayer.pause();
  }

  let confirmed = false;
  if (confirmSeekCallback) {
    confirmed = await confirmSeekCallback(targetTime);
  }

  seekConfirmInProgress = false;

  if (confirmed) {
    await applySeek(targetTime);
    if (wasPlaying && vimeoPlayer) {
      await vimeoPlayer.play();
    }
  } else {
    updateProgressUI(lastTime);
    if (wasPlaying && vimeoPlayer) {
      await vimeoPlayer.play();
    }
  }

  return undefined;
}

function bindPlayerEvents(player) {
  player.on('timeupdate', (data) => {
    if (isApplyingSeek) return;

    if (isVideoCompleted()) {
      lastTime = data.seconds;
      updateProgressUI(data.seconds);
      return;
    }

    if (data.seconds > lastTime + SEEK_THRESHOLD) {
      const targetTime = data.seconds;
      isApplyingSeek = true;
      player
        .setCurrentTime(lastTime)
        .finally(() => {
          isApplyingSeek = false;
        });
      updateProgressUI(lastTime);
      requestSeek(targetTime);
      return;
    }

    lastTime = data.seconds;

    if (Math.floor(data.seconds) % 5 === 0) {
      persistVideoTime(data.seconds);
    }

    updateProgressUI(data.seconds);
  });

  player.on('play', () => {
    isPlaying = true;
    const overlay = document.getElementById('play-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 300);
    }
    updatePlayPauseBtn();
  });

  player.on('pause', () => {
    isPlaying = false;
    const overlay = document.getElementById('play-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.style.opacity = '1';
    }
    updatePlayPauseBtn();
  });

  player.on('ended', () => {
    markVideoCompleted();
    isPlaying = false;
    updatePlayPauseBtn();
    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = '100%';
    unlockPanels();
    onCompleteCallback?.();
  });
}

export function lockPanels() {
  const btn = document.getElementById('btn-siguiente-video');
  if (btn) {
    btn.disabled = true;
    btn.classList.add('opacity-30', 'cursor-not-allowed');
    btn.textContent = 'Siguiente — Completá el video primero';
  }

  document.querySelectorAll('.step-item').forEach((el) => {
    const step = parseInt(el.dataset.step, 10);
    if (step >= 4) {
      el.classList.add('opacity-30', 'pointer-events-none', 'cursor-not-allowed');
      el.classList.remove('cursor-pointer');
    }
  });
}

export function unlockPanels() {
  const btn = document.getElementById('btn-siguiente-video');
  if (btn) {
    btn.disabled = false;
    btn.classList.remove('opacity-30', 'cursor-not-allowed');
    btn.textContent = 'Siguiente →';
  }

  document.querySelectorAll('.step-item').forEach((el) => {
    const step = parseInt(el.dataset.step, 10);
    if (step >= 4) {
      el.classList.remove('opacity-30', 'pointer-events-none', 'cursor-not-allowed');
      el.classList.add('cursor-pointer');
    }
  });
}

function createPlayer() {
  const vimeoIframe = document.getElementById('vimeo-player');
  if (!vimeoIframe) {
    throw new Error('Vimeo iframe not found');
  }

  const player = new Vimeo.Player(vimeoIframe);
  bindPlayerEvents(player);

  return player.getDuration().then((d) => {
    duration = d;
    const timeKey = storageKey(TIME_SUFFIX);
    const savedTime = timeKey ? localStorage.getItem(timeKey) : null;
    if (savedTime && !isVideoCompleted()) {
      const t = parseFloat(savedTime);
      if (t > 0 && t < d) {
        return player.setCurrentTime(t).then(() => {
          lastTime = t;
          return player;
        });
      }
    }
    return player;
  });
}

export function ensureVimeoPlayer(onComplete) {
  if (onComplete) {
    onCompleteCallback = onComplete;
  }

  if (vimeoPlayer) {
    return Promise.resolve(vimeoPlayer);
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise((resolve, reject) => {
    const attemptInit = (retriesLeft = 40) => {
      if (typeof Vimeo === 'undefined') {
        if (retriesLeft <= 0) {
          reject(new Error('Vimeo API no cargó'));
          return;
        }
        setTimeout(() => attemptInit(retriesLeft - 1), 200);
        return;
      }

      const iframe = document.getElementById('vimeo-player');
      if (!iframe) {
        if (retriesLeft <= 0) {
          reject(new Error('Iframe de Vimeo no encontrado'));
          return;
        }
        setTimeout(() => attemptInit(retriesLeft - 1), 100);
        return;
      }

      createPlayer()
        .then((player) => {
          vimeoPlayer = player;
          resolve(player);
        })
        .catch((error) => {
          initPromise = null;
          reject(error);
        });
    };

    attemptInit();
  });

  return initPromise;
}

export function initVimeoPlayer(onComplete) {
  return ensureVimeoPlayer(onComplete);
}

export function togglePlay() {
  ensureVimeoPlayer()
    .then((player) => {
      if (isPlaying) {
        return player.pause();
      }
      return player.play();
    })
    .catch((error) => {
      console.error('No se pudo reproducir el video:', error);
    });
}

export function seekVideo(event) {
  if (duration <= 0) return;

  const targetTime = getSeekTimeFromPointer(event);
  if (targetTime === null) return;

  requestSeek(targetTime).catch((error) => {
    console.error('No se pudo adelantar el video:', error);
  });
}

export function startProgressDrag(event) {
  if (duration <= 0) return;

  event.preventDefault();
  isDraggingProgress = true;
  setThumbDragging(true);

  const previewTime = getSeekTimeFromPointer(event);
  if (previewTime !== null) {
    updateProgressUI(previewTime);
  }

  document.addEventListener('mousemove', handleProgressDrag);
  document.addEventListener('mouseup', finishProgressDrag);
  document.addEventListener('touchmove', handleProgressDrag, { passive: false });
  document.addEventListener('touchend', finishProgressDrag);
}

export function toggleFullscreen() {
  const iframe = document.getElementById('vimeo-player');
  const container = iframe?.parentElement;
  const fullscreenIcon = document.getElementById('fullscreen-icon');
  const exitIcon = document.getElementById('exit-fullscreen-icon');
  if (!container) return;

  if (!document.fullscreenElement) {
    container.requestFullscreen();
    if (fullscreenIcon) fullscreenIcon.style.display = 'none';
    if (exitIcon) exitIcon.style.display = 'block';
  } else {
    document.exitFullscreen();
    if (fullscreenIcon) fullscreenIcon.style.display = 'block';
    if (exitIcon) exitIcon.style.display = 'none';
  }
}

export function demoUnlock(onComplete) {
  markVideoCompleted();
  isPlaying = false;
  updatePlayPauseBtn();
  unlockPanels();
  onComplete?.();
}
