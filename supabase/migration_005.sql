-- ============================================================================
-- RAON DESIGNSTUDIO — Migration 005
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 실행하세요.
--
-- 포함 내용:
--  1) 프로젝트 상세페이지 사진 그리드 템플릿 선택값 저장 컬럼 추가
--     (0부터 시작하는 인덱스로, 실제 템플릿 정의는 assets/js/detail-layouts.js)
-- ============================================================================

alter table portfolio_items add column if not exists detail_layout integer not null default 0;
