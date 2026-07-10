-- ============================================================================
-- RAON DESIGNSTUDIO — Migration 002
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 실행하세요.
-- (schema.sql을 이미 실행했다면, 이 파일만 추가로 실행하면 됩니다.)
--
-- 포함 내용:
--  1) 카테고리(메뉴) 관리 테이블 추가 — 어드민에서 이름 변경/추가/삭제/순서 가능
--  2) portfolio_items.category 를 고정 4종에서 자유 텍스트로 전환
--  3) 프로젝트 정렬 순서(sort_order)는 이미 있음 → 어드민 UI만 추가됨
--  4) 유튜브 임베드용 youtube_url 컬럼 추가
-- ============================================================================

-- 1) 카테고리 테이블
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

alter table categories enable row level security;

drop policy if exists "categories_public_read" on categories;
create policy "categories_public_read"
  on categories for select
  using (true);

drop policy if exists "categories_admin_write" on categories;
create policy "categories_admin_write"
  on categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- 2) portfolio_items.category 고정값 체크 제약 제거 (자유 카테고리 key 허용)
alter table portfolio_items drop constraint if exists portfolio_items_category_check;

-- 3) 유튜브 URL 컬럼 추가
alter table portfolio_items add column if not exists youtube_url text default '';
