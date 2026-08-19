export function parseYoutubeId(url) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = String(url).match(re);
    if (m) return m[1];
  }
  return null;
}

/* 쇼츠(세로 9:16)인지 일반 영상(가로 16:9)인지는 URL 형태로 확실히 알 수 있습니다.
   추측할 필요가 없으므로 재생·썸네일 비율을 여기에 맞춰 정합니다. */
export function isShortsUrl(url) {
  return /youtube\.com\/shorts\//.test(String(url || ''));
}

export function youtubeThumbnail(id) {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

/* hqdefault.jpg 는 4:3 캔버스라 원본이 그 비율이 아니면 유튜브가 먼저 여백을
   넣어서 내려줍니다 — 쇼츠는 좌우, 16:9는 위아래로. 그 위에 우리가 또 여백을
   두면 화면이 두 번 쪼그라들기 때문에, 원본 비율에 가까운 파일을 먼저 시도하고
   없을 때만 단계적으로 내려갑니다. 세로 영상의 원본 비율 파일이 oardefault
   ("original aspect ratio")입니다. */
export function youtubeThumbnailCandidates(id, { short = false } = {}) {
  const base = `https://i.ytimg.com/vi/${id}`;
  return short
    ? [`${base}/oardefault.jpg`, `${base}/frame0.jpg`, `${base}/hqdefault.jpg`]
    : [`${base}/maxresdefault.jpg`, `${base}/hq720.jpg`, `${base}/hqdefault.jpg`];
}

/* 없는 썸네일은 404로 오기도 하고, 120x90 회색 플레이스홀더가 200으로 오기도
   합니다. 두 경우 모두 다음 후보로 넘어가야 해서 크기까지 같이 봅니다. */
export function loadThumbnailInto(imgEls, candidates) {
  const els = [].concat(imgEls).filter(Boolean);
  if (!els.length || !candidates.length) return;

  let i = 0;
  const probe = new Image();
  const tryNext = () => {
    if (i >= candidates.length) return;
    probe.src = candidates[i++];
  };
  probe.onload = () => {
    if (probe.naturalWidth <= 120 && i < candidates.length) { tryNext(); return; }
    els.forEach(el => { el.src = probe.src; });
  };
  probe.onerror = tryNext;
  tryNext();
}

export function youtubeEmbedUrl(id, { autoplay = true } = {}) {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  });
  if (autoplay) {
    params.set('autoplay', '1');
    params.set('mute', '1');
  }
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}
