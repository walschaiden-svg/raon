import { getSupabase } from './supabase-client.js';

/* ---------------------------------------------------------------------------
   기본값(Fallback) — Supabase가 아직 연결되지 않았거나 네트워크 오류가 나도
   사이트가 빈 화면 없이 정상적으로 보이도록 하는 안전망입니다.
   실제 콘텐츠는 어드민 → Supabase의 page_content 테이블에서 옵니다.
--------------------------------------------------------------------------- */
export const DEFAULT_CONTENT = {
  home: {
    eyebrow: 'ARCHITECTURAL SCALE MODEL STUDIO',
    title_line1: '정밀함으로 완성하는',
    title_line2: '건축의 축소판',
    subtitle: '라온디자인스튜디오는 건축사무소, 시행사, 공공기관의 설계 언어를 밀리미터 단위의 정교함으로 재현합니다. 조달청 입찰용 모형부터 갤러리급 전시 모형까지.',
    cta_primary: '프로젝트 문의하기',
    cta_secondary: '포트폴리오 보기',
    hero_video_url: 'assets/video/hero-figures.mp4',
    hero_poster_url: 'assets/images/hero-night-building.jpeg',
    strengths: [
      { num: '01', title: '0.1mm 단위의 정밀 축적', desc: '도면을 그대로 옮긴 듯한 정교한 스케일 구현으로 심사·설계 검토 신뢰도를 높입니다.' },
      { num: '02', title: '최첨단 장비 인프라', desc: '레이저커터, UV프린터, CNC 가공까지 자체 보유하여 재현 한계 없이 제작합니다.' },
      { num: '03', title: '신속하고 정확한 납품', desc: '입찰·프레젠테이션 일정에 맞춘 체계적인 공정 관리로 납기를 철저히 준수합니다.' },
      { num: '04', title: '검증된 공공·민간 실적', desc: '건축사무소, 시행사, 공공기관과의 협업 경험을 바탕으로 신뢰할 수 있는 결과물을 제공합니다.' },
    ],
  },
  about: {
    intro_eyebrow: 'OUR STORY',
    intro_title_1: '손끝의 정밀함이',
    intro_title_2: '신뢰가 되는 과정',
    intro_body: "라온(RAON)은 순우리말로 '즐거운'을 의미합니다. 우리는 건축이라는 복잡한 언어를 가장 정확하고 즐거운 방식으로 축소하여 전달하는 것을 목표로 합니다. 건축사무소의 설계 검토용 모형부터 조달청 입찰 심사용 모형, 그리고 개인 고객의 특별한 기념 모형까지 — 각기 다른 목적을 가진 세 그룹의 요구를 하나의 기준, '정밀함'으로 충족시켜 왔습니다.",
    intro_image_url: 'assets/images/daylight-house.png',
    stats: [
      { value: '450+', label: '누적 프로젝트 제작' },
      { value: '120+', label: '협력 건축사무소·시행사' },
      { value: '98%', label: '납기 준수율' },
    ],
    timeline: [
      { year: '2013', title: '스튜디오 설립', desc: '건축 축소모형 전문 제작을 목표로 라온디자인스튜디오 설립.' },
      { year: '2016', title: '공공기관 조달 등록', desc: '조달청 벤처나라 등록 및 공공기관 입찰용 모형 제작 사업 확장.' },
      { year: '2019', title: '정밀 가공 장비 도입', desc: '레이저커터·UV프린터 등 첨단 장비를 도입해 제작 정밀도와 속도를 향상.' },
      { year: '2023', title: '누적 프로젝트 400건 돌파', desc: '대형 주거복합단지부터 소형 개인 의뢰까지 폭넓은 포트폴리오 확보.' },
      { year: '2026', title: '새로운 도약', desc: '디지털 프레젠테이션과 결합한 하이브리드 모형 서비스 준비 중.' },
    ],
    equipment: [
      { title: '레이저 커팅기', specs: [{ key: '가공 면적', value: '1,300 × 900mm' }, { key: '정밀도', value: '±0.05mm' }, { key: '소재', value: '아크릴 · 우드락 · 합판' }] },
      { title: 'UV 평판 프린터', specs: [{ key: '출력 해상도', value: '1440 dpi' }, { key: '출력 면적', value: '2,500 × 1,300mm' }, { key: '소재', value: '아크릴 · 시트지 · 금속' }] },
      { title: 'CNC 정밀 가공기', specs: [{ key: '가공축', value: '3-Axis' }, { key: '정밀도', value: '±0.02mm' }, { key: '소재', value: 'MDF · 알루미늄 · 우레탄' }] },
      { title: '3D 프린터 (SLA/FDM)', specs: [{ key: '출력 정밀도', value: '0.025mm layer' }, { key: '출력 크기', value: '300 × 300 × 400mm' }, { key: '용도', value: '인물·조경·디테일 조형물' }] },
      { title: 'LED 조명 연출 시스템', specs: [{ key: '제어 방식', value: '구역별 개별 제어' }, { key: '연출', value: '주간 / 야간 모드' }, { key: '용도', value: '프레젠테이션 · 전시용' }] },
      { title: '도면 데이터 분석', specs: [{ key: '지원 포맷', value: 'DWG · DXF · SKP · PDF' }, { key: '축척', value: '1:50 ~ 1:1000 대응' }, { key: '검토', value: '설계 오차 사전 검수' }] },
    ],
    partners_note: '협력사 로고는 확인 후 추후 삽입될 예정입니다.',
  },
  process: {
    steps: [
      { num: '01', title: '설계 확인 & 도면 분석', desc: 'DWG, SKP, PDF 등 도면 데이터를 정밀 검토하여 축척, 재질, 디테일 표현 범위를 사전에 확정합니다. 이 단계에서 고객과 함께 표현 수준과 일정을 협의합니다.', tags: ['도면 검토', '축척 산정', '견적 확정'], image_url: 'assets/images/macro-wireframe.png' },
      { num: '02', title: '재단 & 정밀 가공', desc: '레이저커터와 CNC 장비를 활용해 ±0.05mm 이내의 오차로 부재를 재단합니다. 소재 특성에 맞춘 최적의 가공 방식을 적용해 정확한 형태를 구현합니다.', tags: ['레이저 커팅', 'CNC 가공', '소재 최적화'], image_url: 'assets/images/facade-macro.png' },
      { num: '03', title: '조립 & 구조 완성', desc: '재단된 수백 개의 부재를 숙련된 장인이 한 층씩 정교하게 조립합니다. 구조적 안정성과 시각적 완성도를 동시에 확보하는 핵심 단계입니다.', tags: ['수작업 조립', '구조 검수', '층별 조립'], image_url: 'assets/images/daylight-house.png' },
      { num: '04', title: '마감 & 조경·조명 연출', desc: '조경, 인물, 차량 등의 디테일 요소를 배치하고 LED 조명을 설치하여 주간·야간 연출을 완성합니다. 실제 건축물과 같은 생동감을 부여하는 단계입니다.', tags: ['조경 식재', 'LED 조명', '디테일 마감'], image_url: 'assets/images/hero-night-building.jpeg' },
      { num: '05', title: '검수 & 안전 납품', desc: '전 부재 최종 검수 후 전용 보호 케이스로 포장하여 현장까지 안전하게 운송·설치합니다. 입찰·프레젠테이션 일정에 맞춘 정확한 납기를 약속합니다.', tags: ['최종 검수', '안전 포장', '현장 설치'], image_url: 'assets/images/daylight-house.png' },
    ],
  },
  contact: {
    address: '서울특별시 (주소 추후 확정)',
    address_note: '지하철역 도보 00분',
    phone: '02-000-0000',
    email: 'contact@raondesignstudio.com',
    hours: '평일 09:00 – 18:00',
    hours_note: '주말 및 공휴일 휴무',
    business_number: '000-00-00000',
    ceo_name: '000',
    map_note: '지도 영역 (Google Maps 연동 예정)',
    privacy_policy: `1. 수집 항목
이름(담당자명), 연락처, 이메일, 프로젝트 유형, 예상 예산(선택), 문의 내용

2. 수집 목적
견적 상담 및 프로젝트 문의 응대, 상담 이력 관리

3. 보유 및 이용 기간
문의 처리 완료 후 6개월간 보관하며, 보관 기간 경과 시 지체 없이 파기합니다. 단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.

4. 동의 거부 권리 및 불이익 안내
귀하는 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다. 다만, 동의하지 않으실 경우 견적 문의 접수 및 상담 진행이 제한될 수 있습니다.`,
  },
};

const FALLBACK_PORTFOLIO = [
  { id: 'demo-1', title: '야간 조명 연출 주거복합단지', category: 'residential', region: '서울', client: 'A건축사무소', scale: '1/200', year: '2024', duration: '10주', description: '야간 LED 조명 연출을 적용한 주거복합단지 프레젠테이션 모형입니다.', cover_image_url: 'assets/images/hero-night-building.jpeg', images: ['assets/images/hero-night-building.jpeg'] },
  { id: 'demo-2', title: '단독주택 프레젠테이션 모형', category: 'residential', region: '경기', client: '개인 의뢰', scale: '1/100', year: '2024', duration: '4주', description: '단독주택 설계안을 검토하기 위해 제작한 프레젠테이션 모형입니다.', cover_image_url: 'assets/images/daylight-house.png', images: ['assets/images/daylight-house.png'] },
  { id: 'demo-3', title: '도시 매스 스터디 조감모형', category: 'aerial', region: '서울', client: 'B건축사무소', scale: '1/500', year: '2023', duration: '6주', description: '초기 설계 단계의 매스 스터디를 위한 조감 모형입니다.', cover_image_url: 'assets/images/macro-wireframe.png', images: ['assets/images/macro-wireframe.png'] },
  { id: 'demo-4', title: '파사드 정밀 디테일', category: 'residential', region: '서울', client: 'A건축사무소', scale: '1/100', year: '2023', duration: '5주', description: '커튼월 파사드의 디테일을 정밀하게 재현한 모형입니다.', cover_image_url: 'assets/images/facade-macro.png', images: ['assets/images/facade-macro.png'] },
];

export function getDefault(page) {
  return DEFAULT_CONTENT[page];
}

export async function fetchPageContent(page) {
  const supabase = await getSupabase();
  if (!supabase) return DEFAULT_CONTENT[page];
  try {
    const { data, error } = await supabase.from('page_content').select('data').eq('page', page).maybeSingle();
    if (error || !data) return DEFAULT_CONTENT[page];
    return { ...DEFAULT_CONTENT[page], ...data.data };
  } catch (err) {
    console.error('[content] fetchPageContent failed, using fallback:', err);
    return DEFAULT_CONTENT[page];
  }
}

const PAGE_SIZE = 9;

function filterFallback({ category = 'all', region = 'all', scale = 'all' } = {}) {
  return FALLBACK_PORTFOLIO.filter(i => {
    if (category !== 'all' && i.category !== category) return false;
    if (region !== 'all' && i.region !== region) return false;
    if (scale !== 'all' && i.scale !== scale) return false;
    return true;
  });
}

export async function fetchPortfolio({ category = 'all', region = 'all', scale = 'all', page = 1 } = {}) {
  const supabase = await getSupabase();
  if (!supabase) {
    const items = filterFallback({ category, region, scale });
    return { items, total: items.length, page: 1, pageSize: PAGE_SIZE, totalPages: 1 };
  }
  try {
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase.from('portfolio_items').select('*', { count: 'exact' }).eq('published', true);
    if (category !== 'all') query = query.eq('category', category);
    if (region !== 'all') query = query.eq('region', region);
    if (scale !== 'all') query = query.eq('scale', scale);
    query = query.order('sort_order', { ascending: true }).order('created_at', { ascending: false }).range(from, to);
    const { data, count, error } = await query;
    if (error) throw error;
    return {
      items: data || [],
      total: count || 0,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil((count || 0) / PAGE_SIZE)),
    };
  } catch (err) {
    console.error('[content] fetchPortfolio failed, using fallback:', err);
    const items = filterFallback({ category, region, scale });
    return { items, total: items.length, page: 1, pageSize: PAGE_SIZE, totalPages: 1 };
  }
}

export async function fetchPortfolioFilters() {
  const supabase = await getSupabase();
  if (!supabase) {
    return {
      regions: [...new Set(FALLBACK_PORTFOLIO.map(i => i.region).filter(Boolean))],
      scales: [...new Set(FALLBACK_PORTFOLIO.map(i => i.scale).filter(Boolean))],
    };
  }
  try {
    const { data, error } = await supabase.from('portfolio_items').select('region, scale').eq('published', true);
    if (error) throw error;
    return {
      regions: [...new Set((data || []).map(i => i.region).filter(Boolean))].sort(),
      scales: [...new Set((data || []).map(i => i.scale).filter(Boolean))].sort(),
    };
  } catch (err) {
    console.error('[content] fetchPortfolioFilters failed:', err);
    return { regions: [], scales: [] };
  }
}

export async function fetchCategories() {
  const supabase = await getSupabase();
  const fallback = [
    { key: 'residential', label: '주거단지', sort_order: 1 },
    { key: 'commercial', label: '상업시설', sort_order: 2 },
    { key: 'public', label: '공공기관', sort_order: 3 },
    { key: 'aerial', label: '조감도', sort_order: 4 },
  ];
  if (!supabase) return fallback;
  try {
    const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    return data && data.length ? data : fallback;
  } catch (err) {
    console.error('[content] fetchCategories failed, using fallback:', err);
    return fallback;
  }
}

export async function fetchPortfolioItem(id) {
  const supabase = await getSupabase();
  if (!supabase) return FALLBACK_PORTFOLIO.find(i => i.id === id) || null;
  try {
    const { data, error } = await supabase.from('portfolio_items').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[content] fetchPortfolioItem failed:', err);
    return null;
  }
}

export async function fetchFeaturedPortfolio() {
  const supabase = await getSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('portfolio_items')
      .select('id, title, category, cover_image_url, featured_x, featured_y, featured_w, featured_h')
      .eq('featured', true)
      .eq('published', true)
      .order('featured_y', { ascending: true })
      .order('featured_x', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[content] fetchFeaturedPortfolio failed:', err);
    return [];
  }
}

export async function submitInquiry(payload) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error('문의 시스템에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
  const { error } = await supabase.from('inquiries').insert(payload);
  if (error) throw error;
}

