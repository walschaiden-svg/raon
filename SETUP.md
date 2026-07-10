# RAON DESIGNSTUDIO — 어드민 연동 설정 가이드

이 사이트는 정적 HTML/CSS/JS이지만, 콘텐츠(Home/About/Process/Contact 문구, 포트폴리오)는
[Supabase](https://supabase.com) 데이터베이스에서 불러옵니다. Supabase를 연결하기 전까지는
지금 보이는 기본 문구가 그대로 표시되며 사이트는 정상 작동합니다 — 설정은 언제 해도 됩니다.

## 1. Supabase 프로젝트 생성

1. https://supabase.com 에서 무료 계정으로 로그인 후 새 프로젝트를 생성합니다.
2. 프로젝트가 준비되면 왼쪽 메뉴의 **SQL Editor**를 엽니다.
3. 이 저장소의 `supabase/schema.sql` 파일 내용을 전체 복사해서 붙여넣고 실행(Run)합니다.
   - 테이블(`page_content`, `portfolio_items`), 보안 정책(RLS), 이미지 저장 버킷(`portfolio`, `site`),
     그리고 지금 사이트에 있는 기본 문구가 초기 데이터로 함께 생성됩니다.

## 2. 연결 정보 입력

1. Supabase 대시보드 → **Project Settings → API** 로 이동합니다.
2. **Project URL** 과 **anon public** 키를 복사합니다. (anon 키는 공개되어도 안전한 키입니다.
   실제 데이터 보호는 1번에서 설정한 RLS 정책이 담당합니다.)
3. 이 저장소의 [assets/js/supabase-config.js](assets/js/supabase-config.js) 파일을 열어
   `YOUR_SUPABASE_PROJECT_URL` 과 `YOUR_SUPABASE_ANON_KEY` 를 방금 복사한 값으로 교체합니다.

## 3. 관리자 계정 생성

1. Supabase 대시보드 → **Authentication → Users** → **Add user** 를 클릭합니다.
2. 관리자로 사용할 이메일과 비밀번호를 입력해 계정을 하나 생성합니다.
   (별도의 회원가입 페이지는 없으며, 이 계정으로만 어드민에 로그인할 수 있습니다.)

## 4. 어드민 접속

- `admin/login.html` 로 접속해 방금 만든 계정으로 로그인합니다.
- 로그인 후 `admin/index.html`에서 Home / About / Process / Contact 문구와
  포트폴리오 프로젝트(추가/수정/삭제, 이미지 업로드, 공개 여부)를 관리할 수 있습니다.
- 저장 즉시 실제 사이트(`index.html` 등)에 반영됩니다.

## 배포 시 참고사항

- 이 사이트는 순수 정적 파일(HTML/CSS/JS)이므로 Cafe24, Netlify, Vercel, GitHub Pages 등
  어떤 정적 호스팅에도 그대로 업로드하면 됩니다. 별도의 서버(Node 등)는 필요하지 않습니다.
- `assets/js/supabase-config.js` 에 들어가는 anon key는 공개되는 파일이지만,
  `supabase/schema.sql`에 정의된 RLS 정책 덕분에 방문자는 공개(published)된 콘텐츠만 읽을 수 있고,
  로그인한 관리자만 쓰기/수정/삭제가 가능합니다.
- 관리자 비밀번호를 변경하거나 계정을 추가/삭제하려면 Supabase 대시보드의
  Authentication → Users 메뉴를 이용하세요.
