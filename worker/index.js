const PROJECT_TYPE_LABEL = {
  residential: '주거단지',
  commercial: '상업시설',
  public: '공공기관 / 입찰용',
  personal: '개인 소장용',
  etc: '기타',
};

const BUDGET_LABEL = {
  under300: '500만원 미만',
  '300to1000': '500만원 ~ 1,000만원',
  '1000to3000': '1,000만원 ~ 5,000만원',
  over3000: '5,000만원 이상',
  undecided: '미정 / 상담 후 결정',
};

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function notifyTelegram(request, env) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('[notify-telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured');
    return new Response('Telegram not configured', { status: 500 });
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const text = [
    '🔔 <b>새 견적 문의가 접수되었습니다</b>',
    '',
    `이름: ${escapeHtml(data.name)}`,
    `연락처: ${escapeHtml(data.phone)}`,
    `이메일: ${escapeHtml(data.email)}`,
    `유형: ${escapeHtml(PROJECT_TYPE_LABEL[data.projectType] || data.projectType)}`,
    `예산: ${escapeHtml(BUDGET_LABEL[data.budget] || '미입력')}`,
    '',
    `내용:\n${escapeHtml(data.message)}`,
  ].join('\n');

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[notify-telegram] Telegram API error:', errText);
      return new Response('Telegram API error', { status: 502 });
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('[notify-telegram] request failed:', err);
    return new Response('Internal error', { status: 500 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/notify-telegram') {
      if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
      return notifyTelegram(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
