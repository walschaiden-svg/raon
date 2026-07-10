/*
  RAON DESIGNSTUDIO — Supabase 연결 설정

  1. https://supabase.com 에서 프로젝트를 생성합니다.
  2. 프로젝트 대시보드 → SQL Editor 에서 supabase/schema.sql 내용을 실행합니다.
  3. 프로젝트 설정(Project Settings → API)에서 "Project URL" 과 "anon public" 키를 복사해
     아래 두 값에 붙여넣습니다. (anon 키는 공개되어도 안전한 키입니다 — RLS가 데이터를 보호합니다.)
  4. Authentication → Users 에서 관리자 계정(이메일/비밀번호)을 하나 생성합니다.
     이 계정으로 /admin/login.html 에서 로그인합니다.
*/
export const SUPABASE_URL = 'https://sbuczsqodxhzwyhomfma.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_M237VW25751bsy4tOZYWBQ_bJOR31II';
