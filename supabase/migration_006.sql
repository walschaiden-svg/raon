-- ============================================================================
-- RAON DESIGNSTUDIO — Migration 006
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 실행하세요.
--
-- 포함 내용:
--  1) 프로젝트 SEO 태그 컬럼 추가
--     쉼표로 구분한 검색 키워드를 저장합니다. (예: "아파트모형, 주거단지, 1/200")
--     화면에는 렌더링하지 않고 <meta name="keywords"> 와 JSON-LD 구조화 데이터로만
--     내보냅니다 — 자세한 내용은 assets/js/portfolio.js 의 applyDetailSeo() 참고.
-- ============================================================================

alter table portfolio_items add column if not exists tags text default '';
