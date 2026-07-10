-- ============================================================================
-- RAON DESIGNSTUDIO — Supabase schema
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 실행하세요.
-- ============================================================================

-- 1) 페이지 콘텐츠 (Home / About / Process / Contact 텍스트 전부 여기에 저장)
create table if not exists page_content (
  page        text primary key,        -- 'home' | 'about' | 'process' | 'contact'
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- 2) 카테고리(메뉴) — 어드민에서 이름 변경/추가/삭제/순서 관리
create table if not exists categories (
  key         text primary key,
  label       text not null,
  sort_order  integer not null default 0
);

insert into categories (key, label, sort_order) values
  ('residential', '주거단지', 1),
  ('commercial',  '상업시설', 2),
  ('public',      '공공기관', 3),
  ('aerial',      '조감도',   4)
on conflict (key) do nothing;

-- 3) 포트폴리오 프로젝트
create table if not exists portfolio_items (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  category      text not null,          -- categories.key 참조 (자유 텍스트, FK 강제 없음)
  region        text default '',
  client        text default '',
  scale         text default '',
  year          text default '',
  duration      text default '',
  description   text default '',
  cover_image_url text default '',
  images        jsonb not null default '[]'::jsonb,  -- 상세페이지용 이미지 URL 배열
  youtube_url   text default '',        -- 유튜브 영상 URL (입력 시 상세페이지 맨 앞에 자동재생 배치)
  published     boolean not null default true,
  sort_order    integer not null default 0,           -- 관리자 지정 노출 순서 (낮은 숫자부터 먼저 노출, 홈페이지엔 숫자 자체는 비노출)
  created_at    timestamptz not null default now()
);

create index if not exists portfolio_items_category_idx on portfolio_items(category);
create index if not exists portfolio_items_published_idx on portfolio_items(published);

-- updated_at 자동 갱신
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_page_content_updated on page_content;
create trigger trg_page_content_updated
  before update on page_content
  for each row execute function set_updated_at();


-- ============================================================================
-- RLS (Row Level Security)
-- 공개 방문자 = 조회(select)만 가능
-- 로그인한 관리자(Supabase Auth로 로그인) = 모든 쓰기 작업 가능
-- ============================================================================

alter table page_content enable row level security;
alter table portfolio_items enable row level security;
alter table categories enable row level security;

-- categories: 누구나 조회 가능, 로그인한 관리자만 쓰기
drop policy if exists "categories_public_read" on categories;
create policy "categories_public_read"
  on categories for select
  using (true);

drop policy if exists "categories_admin_write" on categories;
create policy "categories_admin_write"
  on categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- page_content: 누구나 조회 가능
drop policy if exists "page_content_public_read" on page_content;
create policy "page_content_public_read"
  on page_content for select
  using (true);

-- page_content: 로그인한 사용자만 수정/추가
drop policy if exists "page_content_admin_write" on page_content;
create policy "page_content_admin_write"
  on page_content for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- portfolio_items: 공개 방문자는 published=true 항목만 조회
drop policy if exists "portfolio_public_read" on portfolio_items;
create policy "portfolio_public_read"
  on portfolio_items for select
  using (published = true);

-- portfolio_items: 로그인한 관리자는 전체 조회 + 쓰기 가능
drop policy if exists "portfolio_admin_read_all" on portfolio_items;
create policy "portfolio_admin_read_all"
  on portfolio_items for select
  using (auth.role() = 'authenticated');

drop policy if exists "portfolio_admin_write" on portfolio_items;
create policy "portfolio_admin_write"
  on portfolio_items for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "portfolio_admin_update" on portfolio_items;
create policy "portfolio_admin_update"
  on portfolio_items for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "portfolio_admin_delete" on portfolio_items;
create policy "portfolio_admin_delete"
  on portfolio_items for delete
  using (auth.role() = 'authenticated');


-- ============================================================================
-- 초기 데이터 — 지금 정적 사이트에 들어있는 문구를 그대로 시드로 넣습니다.
-- 어드민에서 언제든 수정 가능합니다.
-- ============================================================================

insert into page_content (page, data) values
('home', '{
  "eyebrow": "ARCHITECTURAL SCALE MODEL STUDIO",
  "title_line1": "정밀함으로 완성하는",
  "title_line2": "건축의 축소판",
  "subtitle": "라온디자인스튜디오는 건축사무소, 시행사, 공공기관의 설계 언어를 밀리미터 단위의 정교함으로 재현합니다. 조달청 입찰용 모형부터 갤러리급 전시 모형까지.",
  "cta_primary": "프로젝트 문의하기",
  "cta_secondary": "포트폴리오 보기",
  "hero_video_url": "../assets/video/hero-figures.mp4",
  "hero_poster_url": "../assets/images/hero-night-building.jpeg",
  "strengths": [
    {"num":"01","title":"0.1mm 단위의 정밀 축적","desc":"도면을 그대로 옮긴 듯한 정교한 스케일 구현으로 심사·설계 검토 신뢰도를 높입니다."},
    {"num":"02","title":"최첨단 장비 인프라","desc":"레이저커터, UV프린터, CNC 가공까지 자체 보유하여 재현 한계 없이 제작합니다."},
    {"num":"03","title":"신속하고 정확한 납품","desc":"입찰·프레젠테이션 일정에 맞춘 체계적인 공정 관리로 납기를 철저히 준수합니다."},
    {"num":"04","title":"검증된 공공·민간 실적","desc":"건축사무소, 시행사, 공공기관과의 협업 경험을 바탕으로 신뢰할 수 있는 결과물을 제공합니다."}
  ]
}'::jsonb)
on conflict (page) do nothing;

insert into page_content (page, data) values
('about', '{
  "intro_eyebrow": "OUR STORY",
  "intro_title_1": "손끝의 정밀함이",
  "intro_title_2": "신뢰가 되는 과정",
  "intro_body": "라온(RAON)은 순우리말로 ''즐거운''을 의미합니다. 우리는 건축이라는 복잡한 언어를 가장 정확하고 즐거운 방식으로 축소하여 전달하는 것을 목표로 합니다. 건축사무소의 설계 검토용 모형부터 조달청 입찰 심사용 모형, 그리고 개인 고객의 특별한 기념 모형까지 — 각기 다른 목적을 가진 세 그룹의 요구를 하나의 기준, ''정밀함''으로 충족시켜 왔습니다.",
  "intro_image_url": "../assets/images/daylight-house.png",
  "stats": [
    {"value":"450+","label":"누적 프로젝트 제작"},
    {"value":"120+","label":"협력 건축사무소·시행사"},
    {"value":"98%","label":"납기 준수율"}
  ],
  "timeline": [
    {"year":"2013","title":"스튜디오 설립","desc":"건축 축소모형 전문 제작을 목표로 라온디자인스튜디오 설립."},
    {"year":"2016","title":"공공기관 조달 등록","desc":"조달청 벤처나라 등록 및 공공기관 입찰용 모형 제작 사업 확장."},
    {"year":"2019","title":"정밀 가공 장비 도입","desc":"레이저커터·UV프린터 등 첨단 장비를 도입해 제작 정밀도와 속도를 향상."},
    {"year":"2023","title":"누적 프로젝트 400건 돌파","desc":"대형 주거복합단지부터 소형 개인 의뢰까지 폭넓은 포트폴리오 확보."},
    {"year":"2026","title":"새로운 도약","desc":"디지털 프레젠테이션과 결합한 하이브리드 모형 서비스 준비 중."}
  ],
  "equipment": [
    {"title":"레이저 커팅기","specs":[{"key":"가공 면적","value":"1,300 × 900mm"},{"key":"정밀도","value":"±0.05mm"},{"key":"소재","value":"아크릴 · 우드락 · 합판"}]},
    {"title":"UV 평판 프린터","specs":[{"key":"출력 해상도","value":"1440 dpi"},{"key":"출력 면적","value":"2,500 × 1,300mm"},{"key":"소재","value":"아크릴 · 시트지 · 금속"}]},
    {"title":"CNC 정밀 가공기","specs":[{"key":"가공축","value":"3-Axis"},{"key":"정밀도","value":"±0.02mm"},{"key":"소재","value":"MDF · 알루미늄 · 우레탄"}]},
    {"title":"3D 프린터 (SLA/FDM)","specs":[{"key":"출력 정밀도","value":"0.025mm layer"},{"key":"출력 크기","value":"300 × 300 × 400mm"},{"key":"용도","value":"인물·조경·디테일 조형물"}]},
    {"title":"LED 조명 연출 시스템","specs":[{"key":"제어 방식","value":"구역별 개별 제어"},{"key":"연출","value":"주간 / 야간 모드"},{"key":"용도","value":"프레젠테이션 · 전시용"}]},
    {"title":"도면 데이터 분석","specs":[{"key":"지원 포맷","value":"DWG · DXF · SKP · PDF"},{"key":"축척","value":"1:50 ~ 1:1000 대응"},{"key":"검토","value":"설계 오차 사전 검수"}]}
  ],
  "partners_note": "협력사 로고는 확인 후 추후 삽입될 예정입니다."
}'::jsonb)
on conflict (page) do nothing;

insert into page_content (page, data) values
('process', '{
  "steps": [
    {"num":"01","title":"설계 확인 & 도면 분석","desc":"DWG, SKP, PDF 등 도면 데이터를 정밀 검토하여 축척, 재질, 디테일 표현 범위를 사전에 확정합니다. 이 단계에서 고객과 함께 표현 수준과 일정을 협의합니다.","tags":["도면 검토","축척 산정","견적 확정"],"image_url":"../assets/images/macro-wireframe.png"},
    {"num":"02","title":"재단 & 정밀 가공","desc":"레이저커터와 CNC 장비를 활용해 ±0.05mm 이내의 오차로 부재를 재단합니다. 소재 특성에 맞춘 최적의 가공 방식을 적용해 정확한 형태를 구현합니다.","tags":["레이저 커팅","CNC 가공","소재 최적화"],"image_url":"../assets/images/facade-macro.png"},
    {"num":"03","title":"조립 & 구조 완성","desc":"재단된 수백 개의 부재를 숙련된 장인이 한 층씩 정교하게 조립합니다. 구조적 안정성과 시각적 완성도를 동시에 확보하는 핵심 단계입니다.","tags":["수작업 조립","구조 검수","층별 조립"],"image_url":"../assets/images/daylight-house.png"},
    {"num":"04","title":"마감 & 조경·조명 연출","desc":"조경, 인물, 차량 등의 디테일 요소를 배치하고 LED 조명을 설치하여 주간·야간 연출을 완성합니다. 실제 건축물과 같은 생동감을 부여하는 단계입니다.","tags":["조경 식재","LED 조명","디테일 마감"],"image_url":"../assets/images/hero-night-building.jpeg"},
    {"num":"05","title":"검수 & 안전 납품","desc":"전 부재 최종 검수 후 전용 보호 케이스로 포장하여 현장까지 안전하게 운송·설치합니다. 입찰·프레젠테이션 일정에 맞춘 정확한 납기를 약속합니다.","tags":["최종 검수","안전 포장","현장 설치"],"image_url":"../assets/images/daylight-house.png"}
  ]
}'::jsonb)
on conflict (page) do nothing;

insert into page_content (page, data) values
('contact', '{
  "address": "서울특별시 (주소 추후 확정)",
  "address_note": "지하철역 도보 00분",
  "phone": "02-000-0000",
  "email": "contact@raondesignstudio.com",
  "hours": "평일 09:00 – 18:00",
  "hours_note": "주말 및 공휴일 휴무",
  "business_number": "000-00-00000",
  "ceo_name": "000",
  "map_note": "지도 영역 (Google Maps 연동 예정)"
}'::jsonb)
on conflict (page) do nothing;


-- ============================================================================
-- Storage: 포트폴리오 이미지 업로드용 버킷
-- SQL로 버킷 생성이 안 되면 대시보드 → Storage → New bucket 에서
-- 이름 "portfolio" , Public bucket 체크 로 직접 만들어도 됩니다.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

-- 히어로 영상/이미지, About 소개 이미지, Process 단계 이미지 등 사이트 공통 미디어용 버킷
insert into storage.buckets (id, name, public)
values ('site', 'site', true)
on conflict (id) do nothing;

drop policy if exists "portfolio_bucket_public_read" on storage.objects;
create policy "portfolio_bucket_public_read"
  on storage.objects for select
  using (bucket_id in ('portfolio','site'));

drop policy if exists "portfolio_bucket_admin_write" on storage.objects;
create policy "portfolio_bucket_admin_write"
  on storage.objects for insert
  with check (bucket_id in ('portfolio','site') and auth.role() = 'authenticated');

drop policy if exists "portfolio_bucket_admin_delete" on storage.objects;
create policy "portfolio_bucket_admin_delete"
  on storage.objects for delete
  using (bucket_id in ('portfolio','site') and auth.role() = 'authenticated');
