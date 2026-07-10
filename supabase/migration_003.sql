-- ============================================================================
-- RAON DESIGNSTUDIO — Migration 003
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 실행하세요.
--
-- 포함 내용:
--  1) 견적 문의 접수 테이블 (inquiries) — 어드민에서 조회/상태 관리
--  2) 방문자 분석 테이블 (page_views) — 어드민 대시보드에서 통계 확인
-- ============================================================================

-- 1) 견적 문의
create table if not exists inquiries (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  phone         text not null,
  email         text not null,
  project_type  text not null,
  budget        text default '',
  message       text not null,
  agree         boolean not null default false,
  status        text not null default 'new',   -- new | contacted | closed
  created_at    timestamptz not null default now()
);

create index if not exists inquiries_created_at_idx on inquiries(created_at desc);
create index if not exists inquiries_status_idx on inquiries(status);

alter table inquiries enable row level security;

-- 누구나(방문자) 문의를 등록할 수 있음 (조회는 불가)
drop policy if exists "inquiries_public_insert" on inquiries;
create policy "inquiries_public_insert"
  on inquiries for insert
  with check (true);

-- 로그인한 관리자만 조회/수정/삭제 가능
drop policy if exists "inquiries_admin_read" on inquiries;
create policy "inquiries_admin_read"
  on inquiries for select
  using (auth.role() = 'authenticated');

drop policy if exists "inquiries_admin_update" on inquiries;
create policy "inquiries_admin_update"
  on inquiries for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "inquiries_admin_delete" on inquiries;
create policy "inquiries_admin_delete"
  on inquiries for delete
  using (auth.role() = 'authenticated');

-- 2) 방문자 분석
create table if not exists page_views (
  id              bigint generated always as identity primary key,
  session_id      text not null,
  path            text not null,
  referrer        text default '',
  referrer_host   text default '',
  search_keyword  text default '',
  utm_source      text default '',
  utm_medium      text default '',
  utm_campaign    text default '',
  device          text default '',   -- mobile | tablet | desktop
  browser         text default '',
  created_at      timestamptz not null default now()
);

create index if not exists page_views_created_at_idx on page_views(created_at desc);
create index if not exists page_views_session_idx on page_views(session_id);

alter table page_views enable row level security;

-- 누구나(방문자) 조회 기록을 남길 수 있음 (조회는 불가)
drop policy if exists "page_views_public_insert" on page_views;
create policy "page_views_public_insert"
  on page_views for insert
  with check (true);

-- 로그인한 관리자만 조회 가능
drop policy if exists "page_views_admin_read" on page_views;
create policy "page_views_admin_read"
  on page_views for select
  using (auth.role() = 'authenticated');

drop policy if exists "page_views_admin_delete" on page_views;
create policy "page_views_admin_delete"
  on page_views for delete
  using (auth.role() = 'authenticated');
