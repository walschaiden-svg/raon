-- ============================================================================
-- RAON DESIGNSTUDIO — Migration 008
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 실행하세요.
--
-- 포함 내용:
--  1) 카테고리별 영문 주소(slug) 컬럼
--     raonmodel.co.kr/portfolio?category=<slug> 로 들어오면 해당 필터가
--     선택된 상태로 열립니다 (네이버 광고 등 랜딩 주소용).
--  2) 기존 카테고리에 기본 주소 채우기 (이미 값이 있으면 건드리지 않음)
--
-- slug 를 key 와 따로 두는 이유: key 는 portfolio_items.category 가 참조하는
-- 내부 값이라 바꾸면 프로젝트 연결이 끊깁니다. slug 는 공개 주소 전용이라
-- 어드민에서 자유롭게 바꿀 수 있습니다 (단, 광고에 이미 쓴 주소는 깨집니다).
-- ============================================================================

alter table categories add column if not exists slug text;

create unique index if not exists categories_slug_key on categories (slug);

update categories set slug = 'bunyang'      where key = 'residential' and slug is null;
update categories set slug = 'exhibition'   where key = 'commercial'  and slug is null;
update categories set slug = 'architecture' where key = 'public'      and slug is null;
update categories set slug = 'unit'         where key = 'aerial'      and slug is null;
update categories set slug = 'etc'          where label = '기타모형'   and slug is null;
