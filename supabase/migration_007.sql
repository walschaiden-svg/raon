-- ============================================================================
-- RAON DESIGNSTUDIO — Migration 007
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 실행하세요.
--
-- 포함 내용:
--  1) 쇼룸 게시물 테이블 (사진 / 릴스 / 움짤)
--  2) 좋아요 테이블 + 집계 트리거
--  3) 비회원이 좋아요를 누를 수 있게 하는 RPC 함수 2개
--
-- 좋아요를 테이블 직접 접근이 아니라 RPC로만 처리하는 이유:
-- 익명 방문자에게 showroom_likes 테이블의 insert/delete 권한을 직접 열어주면
-- 남의 좋아요까지 지울 수 있게 됩니다. 아래 함수는 security definer 로 돌면서
-- "자기 visitor_id 행"만 건드리므로, 익명 사용자에게 테이블 권한을 전혀
-- 주지 않고도 좋아요/취소가 가능합니다.
-- ============================================================================

-- 1) 게시물 --------------------------------------------------------------
create table if not exists showroom_posts (
  id            uuid primary key default gen_random_uuid(),
  media_type    text not null default 'photo',   -- photo | reel | motion
  media_url     text not null default '',        -- 사진/움짤 이미지, 또는 업로드한 영상 파일
  poster_url    text default '',                 -- 릴스/움짤 재생 전에 보여줄 표지 (선택)
  youtube_url   text default '',                 -- 릴스를 유튜브로 넣을 때 (media_url 대신)
  like_count    integer not null default 0,      -- showroom_likes 집계값 (트리거가 관리)
  published     boolean not null default true,
  sort_order    integer not null default 0,      -- 높을수록 앞에 노출
  created_at    timestamptz not null default now()
);

create index if not exists showroom_posts_published_idx on showroom_posts(published);
create index if not exists showroom_posts_sort_idx on showroom_posts(sort_order desc, created_at desc);

-- 2) 좋아요 --------------------------------------------------------------
-- visitor_id 는 브라우저 localStorage 에 저장되는 임의의 문자열입니다.
-- 로그인이 없으므로 완벽한 1인 1표는 불가능하고, 같은 브라우저에서 중복으로
-- 눌리는 것만 막는 수준입니다.
create table if not exists showroom_likes (
  post_id     uuid not null references showroom_posts(id) on delete cascade,
  visitor_id  text not null,
  created_at  timestamptz not null default now(),
  primary key (post_id, visitor_id)
);

create index if not exists showroom_likes_visitor_idx on showroom_likes(visitor_id);

-- 집계 트리거: showroom_likes 가 바뀌면 posts.like_count 를 맞춰줍니다.
create or replace function showroom_sync_like_count() returns trigger
language plpgsql as $$
begin
  update showroom_posts p
     set like_count = (select count(*) from showroom_likes l where l.post_id = p.id)
   where p.id = coalesce(new.post_id, old.post_id);
  return null;
end;
$$;

drop trigger if exists showroom_likes_sync on showroom_likes;
create trigger showroom_likes_sync
  after insert or delete on showroom_likes
  for each row execute function showroom_sync_like_count();

-- 3) 비회원용 RPC --------------------------------------------------------
-- 좋아요 토글. 반환: (liked, like_count)
create or replace function showroom_toggle_like(p_post_id uuid, p_visitor text)
returns table (liked boolean, like_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  if p_visitor is null or length(trim(p_visitor)) = 0 then
    raise exception 'visitor id required';
  end if;

  select exists(
    select 1 from showroom_likes
     where post_id = p_post_id and visitor_id = p_visitor
  ) into v_exists;

  if v_exists then
    delete from showroom_likes
     where post_id = p_post_id and visitor_id = p_visitor;
  else
    insert into showroom_likes (post_id, visitor_id)
    values (p_post_id, p_visitor)
    on conflict do nothing;
  end if;

  return query
    select (not v_exists),
           (select p.like_count from showroom_posts p where p.id = p_post_id);
end;
$$;

-- 이 방문자가 좋아요한 게시물 id 목록
create or replace function showroom_liked_posts(p_visitor text)
returns setof uuid
language sql
security definer
set search_path = public
as $$
  select post_id from showroom_likes where visitor_id = p_visitor;
$$;

grant execute on function showroom_toggle_like(uuid, text) to anon, authenticated;
grant execute on function showroom_liked_posts(text) to anon, authenticated;

-- 4) RLS -----------------------------------------------------------------
alter table showroom_posts enable row level security;
alter table showroom_likes enable row level security;

-- 게시물: 공개된 것은 누구나 조회, 쓰기는 로그인한 관리자만
drop policy if exists "showroom_public_read" on showroom_posts;
create policy "showroom_public_read"
  on showroom_posts for select
  using (published = true);

drop policy if exists "showroom_admin_read_all" on showroom_posts;
create policy "showroom_admin_read_all"
  on showroom_posts for select
  using (auth.role() = 'authenticated');

drop policy if exists "showroom_admin_write" on showroom_posts;
create policy "showroom_admin_write"
  on showroom_posts for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "showroom_admin_update" on showroom_posts;
create policy "showroom_admin_update"
  on showroom_posts for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "showroom_admin_delete" on showroom_posts;
create policy "showroom_admin_delete"
  on showroom_posts for delete
  using (auth.role() = 'authenticated');

-- 좋아요 테이블: 익명에게는 정책을 주지 않습니다(=직접 접근 전면 차단).
-- 위의 security definer 함수를 통해서만 기록됩니다.
drop policy if exists "showroom_likes_admin_read" on showroom_likes;
create policy "showroom_likes_admin_read"
  on showroom_likes for select
  using (auth.role() = 'authenticated');
