-- ============================================================================
-- RAON DESIGNSTUDIO — Migration 004
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 실행하세요.
--
-- 포함 내용:
--  1) 홈페이지 "대표 프로젝트" 지정 및 자유 배치(그리드) 저장용 컬럼 추가
-- ============================================================================

alter table portfolio_items add column if not exists featured boolean not null default false;
alter table portfolio_items add column if not exists featured_x integer not null default 0;
alter table portfolio_items add column if not exists featured_y integer not null default 0;
alter table portfolio_items add column if not exists featured_w integer not null default 2;
alter table portfolio_items add column if not exists featured_h integer not null default 2;

create index if not exists portfolio_items_featured_idx on portfolio_items(featured);
