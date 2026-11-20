-- ============================================================
-- 꼬물상자 Supabase 스키마
-- Supabase 대시보드 → SQL Editor에 통째로 붙여 넣고 Run 하세요.
-- 여러 번 실행해도 안전하도록 if not exists / or replace 를 썼어요.
-- ============================================================

-- ---------- 요금제 (누구나 읽기만) ----------
create table if not exists public.plans (
  code            text primary key,
  name            text not null,
  price           integer not null,           -- 원
  stories         integer not null,           -- 기간 안에 만들 수 있는 동화 수
  songs           integer not null,           -- 기간 안에 만들 수 있는 노래 수
  saves_album     boolean not null default false,
  is_subscription boolean not null default false,
  period_days     integer not null default 30
);

insert into public.plans (code, name, price, stories, songs, saves_album, is_subscription, period_days) values
  ('trial_once',  '1회 체험권',   20000, 1, 1, false, false, 30),
  ('trial_month', '1개월 체험권', 50000, 3, 3, false, false, 30),
  ('monthly',     '월간 구독',    45000, 3, 3, true,  true,  30)
on conflict (code) do update set
  name = excluded.name, price = excluded.price, stories = excluded.stories, songs = excluded.songs,
  saves_album = excluded.saves_album, is_subscription = excluded.is_subscription, period_days = excluded.period_days;

-- ---------- 아이 ----------
create table if not exists public.children (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 20),
  birth_date  date,
  likes       text[] not null default '{}',     -- 좋아하는 것: 소방차, 기차 …
  family_call text,                             -- 가족 호칭: 엄마, 아빠, 할머니 …
  created_at  timestamptz not null default now()
);
create index if not exists children_user_idx on public.children (user_id);

-- ---------- 이용권 (결제 연동 전에는 데모로 활성화) ----------
create table if not exists public.subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_code  text not null references public.plans (code),
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz not null,
  status     text not null default 'active' check (status in ('active', 'canceled', 'expired')),
  is_demo    boolean not null default true,     -- 실제 결제를 붙이면 false 로 기록
  created_at timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id, starts_at desc);

-- ---------- 앨범 기록 ----------
create table if not exists public.records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  child_id    uuid not null references public.children (id) on delete cascade,
  record_date date not null default current_date,
  title       text not null check (char_length(title) between 1 and 40),
  happened    text not null check (char_length(happened) between 1 and 1000),  -- 오늘 있었던 일
  child_words text check (char_length(child_words) <= 200),                    -- 아이가 한 말
  worry       text check (char_length(worry) <= 200),                          -- 요즘 힘들어하는 것
  photo_paths text[] not null default '{}',                                    -- storage 경로
  created_at  timestamptz not null default now()
);
create index if not exists records_child_date_idx on public.records (child_id, record_date desc);

-- ---------- 이달의 순간 ----------
create table if not exists public.moments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  child_id       uuid not null references public.children (id) on delete cascade,
  month          date not null check (extract(day from month) = 1),  -- 그달 1일
  favorite_word  text check (char_length(favorite_word) <= 100),
  first_word     text check (char_length(first_word) <= 100),
  first_action   text check (char_length(first_action) <= 100),
  updated_at     timestamptz not null default now(),
  unique (child_id, month)
);

-- ---------- 만든 동화·노래 ----------
create table if not exists public.creations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  child_id        uuid not null references public.children (id) on delete cascade,
  record_id       uuid references public.records (id) on delete set null,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  kind            text not null check (kind in ('story', 'song')),
  status          text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  title           text,
  content         jsonb,          -- story: {pages:[{text}]}, song: {mood, lines:[...]}
  error           text,
  created_at      timestamptz not null default now()
);
create index if not exists creations_user_idx on public.creations (user_id, created_at desc);
create index if not exists creations_sub_idx  on public.creations (subscription_id, kind);

-- ---------- 동화 하드북 주문 ----------
create table if not exists public.book_orders (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  creation_id  uuid not null references public.creations (id) on delete restrict,
  cover_name   text not null check (char_length(cover_name) between 1 and 20),
  recipient    text not null check (char_length(recipient) between 1 and 30),
  phone        text not null check (phone ~ '^[0-9-]{9,14}$'),
  address      text not null check (char_length(address) between 5 and 200),
  price        integer not null default 35000,
  status       text not null default 'requested' check (status in ('requested', 'paid', 'printing', 'shipped', 'canceled')),
  created_at   timestamptz not null default now()
);

-- ============================================================
-- 행 단위 보안(RLS): 내 데이터는 나만
-- ============================================================
alter table public.plans         enable row level security;
alter table public.children      enable row level security;
alter table public.subscriptions enable row level security;
alter table public.records       enable row level security;
alter table public.moments       enable row level security;
alter table public.creations     enable row level security;
alter table public.book_orders   enable row level security;

drop policy if exists "plans readable" on public.plans;
create policy "plans readable" on public.plans for select using (true);

-- 아이, 기록, 이달의 순간: 본인 것만 읽고 쓰기
do $$
declare t text;
begin
  foreach t in array array['children', 'records', 'moments'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- 기록과 순간은 내 아이에게만 달 수 있게
drop policy if exists "own child" on public.records;
create policy "own child" on public.records as restrictive for all
  using (true)
  with check (exists (select 1 from public.children c where c.id = child_id and c.user_id = auth.uid()));
drop policy if exists "own child" on public.moments;
create policy "own child" on public.moments as restrictive for all
  using (true)
  with check (exists (select 1 from public.children c where c.id = child_id and c.user_id = auth.uid()));

-- 이용권: 본인 것 읽기만 (만들기는 아래 activate_plan 함수로)
drop policy if exists "own read" on public.subscriptions;
create policy "own read" on public.subscriptions for select using (user_id = auth.uid());

-- 만든 작품: 읽기·지우기만 (만들기·고치기는 함수와 Edge Function이 함)
drop policy if exists "own read" on public.creations;
create policy "own read" on public.creations for select using (user_id = auth.uid());
drop policy if exists "own delete" on public.creations;
create policy "own delete" on public.creations for delete using (user_id = auth.uid());

-- 하드북 주문: 본인 것 읽기 + 새로 넣기 (내 동화로만)
drop policy if exists "own read" on public.book_orders;
create policy "own read" on public.book_orders for select using (user_id = auth.uid());
drop policy if exists "own insert" on public.book_orders;
create policy "own insert" on public.book_orders for insert with check (
  user_id = auth.uid()
  and price = 35000
  and status = 'requested'
  and exists (select 1 from public.creations c
              where c.id = creation_id and c.user_id = auth.uid() and c.kind = 'story' and c.status = 'ready')
);

-- ============================================================
-- 함수
-- ============================================================

-- 지금 쓰고 있는 이용권과 남은 횟수
create or replace function public.credit_status()
returns table (
  subscription_id uuid, plan_code text, plan_name text, ends_at timestamptz,
  saves_album boolean, stories_left integer, songs_left integer
)
language sql stable security invoker set search_path = public as $$
  select s.id, p.code, p.name, s.ends_at, p.saves_album,
         greatest(p.stories - (select count(*) from creations c
                               where c.subscription_id = s.id and c.kind = 'story' and c.status <> 'failed'), 0)::int,
         greatest(p.songs   - (select count(*) from creations c
                               where c.subscription_id = s.id and c.kind = 'song'  and c.status <> 'failed'), 0)::int
  from subscriptions s
  join plans p on p.code = s.plan_code
  where s.user_id = auth.uid() and s.status = 'active' and now() between s.starts_at and s.ends_at
  order by s.starts_at desc
  limit 1;
$$;

-- 이용권 활성화 (결제 연동 전 데모). 결제를 붙이면 이 함수는 결제 완료 웹훅에서만 부르도록 바꾸세요.
create or replace function public.activate_plan(p_plan text)
returns public.subscriptions
language plpgsql security definer set search_path = public as $$
declare
  v_plan plans;
  v_sub  subscriptions;
begin
  if auth.uid() is null then raise exception '로그인이 필요해요'; end if;
  select * into v_plan from plans where code = p_plan;
  if not found then raise exception '없는 요금제예요'; end if;

  -- 쓰던 이용권은 끝내고 새로 시작
  update subscriptions set status = 'expired'
   where user_id = auth.uid() and status = 'active';

  insert into subscriptions (user_id, plan_code, starts_at, ends_at, is_demo)
  values (auth.uid(), v_plan.code, now(), now() + make_interval(days => v_plan.period_days), true)
  returning * into v_sub;
  return v_sub;
end $$;

-- 동화·노래 만들기 시작: 남은 횟수를 확인하고 'pending' 행을 만든다 (동시에 눌러도 한 번만 차감)
create or replace function public.start_creation(p_record uuid, p_kind text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_rec   records;
  v_sub   subscriptions;
  v_plan  plans;
  v_used  integer;
  v_limit integer;
  v_id    uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요해요'; end if;
  if p_kind not in ('story', 'song') then raise exception '동화 또는 노래만 만들 수 있어요'; end if;

  select * into v_rec from records where id = p_record and user_id = auth.uid();
  if not found then raise exception '기록을 찾을 수 없어요'; end if;

  select * into v_sub from subscriptions
   where user_id = auth.uid() and status = 'active' and now() between starts_at and ends_at
   order by starts_at desc limit 1
   for update;
  if not found then raise exception 'NO_PLAN'; end if;

  select * into v_plan from plans where code = v_sub.plan_code;
  select count(*) into v_used from creations
   where subscription_id = v_sub.id and kind = p_kind and status <> 'failed';
  v_limit := case when p_kind = 'story' then v_plan.stories else v_plan.songs end;
  if v_used >= v_limit then raise exception 'NO_CREDIT'; end if;

  insert into creations (user_id, child_id, record_id, subscription_id, kind, status)
  values (auth.uid(), v_rec.child_id, v_rec.id, v_sub.id, p_kind, 'pending')
  returning id into v_id;
  return v_id;
end $$;

-- 결과 저장 (Edge Function이 사용자 권한으로 호출)
create or replace function public.finish_creation(p_id uuid, p_title text, p_content jsonb, p_error text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update creations
     set status  = case when p_error is null then 'ready' else 'failed' end,
         title   = coalesce(p_title, title),
         content = coalesce(p_content, content),
         error   = p_error
   where id = p_id and user_id = auth.uid() and status = 'pending';
  if not found then raise exception '만들고 있는 작품을 찾을 수 없어요'; end if;
end $$;

revoke all on function public.activate_plan(text) from public, anon;
revoke all on function public.start_creation(uuid, text) from public, anon;
revoke all on function public.finish_creation(uuid, text, jsonb, text) from public, anon;
grant execute on function public.activate_plan(text) to authenticated;
grant execute on function public.start_creation(uuid, text) to authenticated;
grant execute on function public.finish_creation(uuid, text, jsonb, text) to authenticated;
grant execute on function public.credit_status() to authenticated;

-- ============================================================
-- 사진 저장소: record-photos (비공개). 경로는 {user_id}/{파일명}
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('record-photos', 'record-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

drop policy if exists "own photos read"   on storage.objects;
drop policy if exists "own photos insert" on storage.objects;
drop policy if exists "own photos delete" on storage.objects;
create policy "own photos read" on storage.objects for select to authenticated
  using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'record-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- (선택) 체험권은 앨범이 저장되지 않아요:
-- 이용권이 끝난 지 7일 지난 체험 사용자의 기록을 지우는 함수.
-- Supabase 대시보드 → Database → Extensions 에서 pg_cron 을 켠 뒤 아래 schedule 줄의 주석을 풀어 주세요.
-- 사진 파일은 storage 정리 작업으로 따로 지워야 해요.
-- ============================================================
create or replace function public.purge_expired_trial_records()
returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  with targets as (
    select distinct s.user_id
      from subscriptions s
     where s.plan_code in ('trial_once', 'trial_month')
       and s.ends_at < now() - interval '7 days'
       and not exists (
         select 1 from subscriptions m
          where m.user_id = s.user_id and m.plan_code = 'monthly'
            and m.status = 'active' and now() < m.ends_at)
  )
  delete from records r using targets t where r.user_id = t.user_id;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function public.purge_expired_trial_records() from public, anon, authenticated;
-- select cron.schedule('purge-trial-records', '0 4 * * *', 'select public.purge_expired_trial_records()');
