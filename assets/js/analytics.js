import { getSupabase } from './supabase-client.js';

const VISITOR_ID_KEY = 'raon_vid';

function getVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return `anon-${Date.now()}`;
  }
}

function detectDevice(ua) {
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
  return 'desktop';
}

function detectBrowser(ua) {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  if (/Firefox\//.test(ua)) return 'Firefox';
  return 'Other';
}

function extractSearchKeyword(referrer) {
  try {
    const url = new URL(referrer);
    const keys = ['q', 'query', 'search', 'wd', 'text'];
    for (const key of keys) {
      const v = url.searchParams.get(key);
      if (v) return v;
    }
  } catch {
    /* not a valid URL */
  }
  return '';
}

async function track() {
  if (['localhost', '127.0.0.1'].includes(location.hostname)) return;

  const referrer = document.referrer || '';
  let referrerHost = '';
  try {
    if (referrer) {
      const rHost = new URL(referrer).hostname;
      if (rHost && rHost !== location.hostname) referrerHost = rHost;
    }
  } catch {
    /* ignore */
  }

  const params = new URLSearchParams(location.search);

  const payload = {
    session_id: getVisitorId(),
    path: location.pathname.replace(/^\//, '') || 'index.html',
    referrer,
    referrer_host: referrerHost,
    search_keyword: extractSearchKeyword(referrer) || params.get('utm_term') || '',
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    device: detectDevice(navigator.userAgent),
    browser: detectBrowser(navigator.userAgent),
  };

  try {
    const supabase = await getSupabase();
    if (!supabase) return;
    await supabase.from('page_views').insert(payload);
  } catch (err) {
    console.error('[analytics] tracking failed:', err);
  }
}

track();
