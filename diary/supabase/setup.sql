-- 멍뭉일지 Supabase 설정 (SQL Editor 에 통째로 붙여 넣고 Run 한 번)
-- 여러 번 실행해도 괜찮아요. 이미 있는 데이터는 지우지 않아요.
--
-- 보안 방식
-- - 데이터 표(mm_docs)는 직접 읽거나 쓸 수 없게 막아 두고(RLS, 정책 없음),
--   아래 함수들로만 다뤄요. 함수는 입장 비밀번호(4자리)로 받은 토큰이 있어야 움직여요.
-- - 도장 찍기, 삭제, 특징 목록 바꾸기는 관리자 토큰이 있어야 해요.
-- - 비밀번호는 bcrypt 로 암호화해서 저장해요.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.mm_docs (
  coll text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (coll, id)
);
create table if not exists public.mm_secret (k text primary key, v text not null);
create table if not exists public.mm_tokens (
  token text primary key,
  kind text not null check (kind in ('user', 'admin')),
  created_at timestamptz not null default now()
);
create table if not exists public.mm_fails (k text primary key, n int not null default 0, until timestamptz);

alter table public.mm_docs enable row level security;
alter table public.mm_secret enable row level security;
alter table public.mm_tokens enable row level security;
alter table public.mm_fails enable row level security;
revoke all on public.mm_docs, public.mm_secret, public.mm_tokens, public.mm_fails from anon, authenticated;

-- ---------- 내부 도우미 ----------
create or replace function public.mm_kind(p_token text) returns text
language sql stable security definer set search_path = public, extensions as $$
  select kind from mm_tokens where token = p_token and coalesce(p_token, '') <> ''
$$;

create or replace function public.mm_need(p_token text, p_admin boolean) returns void
language plpgsql stable security definer set search_path = public, extensions as $$
declare k text := mm_kind(p_token);
begin
  if k is null then raise exception 'mm_locked' using errcode = '28000'; end if;
  if p_admin and k <> 'admin' then raise exception 'mm_admin_only' using errcode = '42501'; end if;
end $$;

create or replace function public.mm_new_token(p_kind text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare t text := encode(gen_random_bytes(24), 'hex');
begin
  insert into mm_tokens(token, kind) values (t, p_kind);
  return t;
end $$;

-- 5번 틀리면 1분 잠금
create or replace function public.mm_guard(p_key text, p_ok boolean) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare r mm_fails;
begin
  select * into r from mm_fails where k = p_key;
  if r.until is not null and r.until > now() then raise exception 'mm_too_many' using errcode = '53400'; end if;
  if p_ok then delete from mm_fails where k = p_key; return; end if;
  insert into mm_fails(k, n) values (p_key, 1)
    on conflict (k) do update set n = mm_fails.n + 1,
      until = case when mm_fails.n + 1 >= 5 then now() + interval '1 minute' else null end;
  update mm_fails set n = 0 where k = p_key and until is not null;
end $$;

-- ---------- 입장 비밀번호 ----------
create or replace function public.mm_status() returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object(
    'pin_set', exists(select 1 from mm_secret where k = 'pin'),
    'admin_set', exists(select 1 from mm_secret where k = 'admin'))
$$;

create or replace function public.mm_check(p_token text) returns text
language sql stable security definer set search_path = public, extensions as $$
  select mm_kind(p_token)
$$;

create or replace function public.mm_set_pin(p_pin text) returns text
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_pin !~ '^\d{4}$' then raise exception 'mm_bad_pin' using errcode = '22023'; end if;
  if exists(select 1 from mm_secret where k = 'pin') then raise exception 'mm_pin_exists' using errcode = '23505'; end if;
  insert into mm_secret(k, v) values ('pin', crypt(p_pin, gen_salt('bf')));
  return mm_new_token('user');
end $$;

create or replace function public.mm_unlock(p_pin text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare h text; ok boolean;
begin
  select v into h from mm_secret where k = 'pin';
  ok := h is not null and p_pin ~ '^\d{4}$' and crypt(p_pin, h) = h;
  perform mm_guard('pin', ok);
  if not ok then return null; end if;
  return mm_new_token('user');
end $$;

-- 관리자: 처음 로그인할 때 쓴 비밀번호가 관리자 비밀번호가 돼요
create or replace function public.mm_admin_login(p_pw text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare h text; ok boolean;
begin
  if length(coalesce(p_pw, '')) < 4 then raise exception 'mm_bad_pw' using errcode = '22023'; end if;
  select v into h from mm_secret where k = 'admin';
  if h is null then
    insert into mm_secret(k, v) values ('admin', crypt(p_pw, gen_salt('bf')));
    return mm_new_token('admin');
  end if;
  ok := crypt(p_pw, h) = h;
  perform mm_guard('admin', ok);
  if not ok then return null; end if;
  return mm_new_token('admin');
end $$;

create or replace function public.mm_admin_password(p_token text, p_new text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform mm_need(p_token, true);
  if length(coalesce(p_new, '')) < 4 then raise exception 'mm_bad_pw' using errcode = '22023'; end if;
  update mm_secret set v = crypt(p_new, gen_salt('bf')) where k = 'admin';
  delete from mm_tokens where kind = 'admin' and token <> p_token;
end $$;

-- 입장 비밀번호 초기화: 모든 기기에서 다시 비밀번호를 정하게 돼요
create or replace function public.mm_reset_pin(p_token text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform mm_need(p_token, true);
  delete from mm_secret where k = 'pin';
  delete from mm_tokens where kind = 'user';
end $$;

-- ---------- 데이터 ----------
create or replace function public.mm_allowed(p_coll text) returns boolean
language sql immutable as $$
  select p_coll in ('app', 'diary', 'stamps', 'places', 'photos')
$$;

create or replace function public.mm_list(p_token text, p_coll text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform mm_need(p_token, false);
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'data', data) order by id)
                   from mm_docs where coll = p_coll), '[]'::jsonb);
end $$;

create or replace function public.mm_get(p_token text, p_coll text, p_id text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform mm_need(p_token, false);
  return (select data from mm_docs where coll = p_coll and id = p_id);
end $$;

create or replace function public.mm_put(p_token text, p_coll text, p_id text, p_data jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not mm_allowed(p_coll) or length(p_id) > 80 or p_id !~ '^[A-Za-z0-9_.:-]+$' then
    raise exception 'mm_bad_path' using errcode = '22023';
  end if;
  if length(p_data::text) > 20000 then raise exception 'mm_too_big' using errcode = '22023'; end if;
  -- 도장, 특징 목록은 관리자만
  perform mm_need(p_token, p_coll = 'stamps' or (p_coll = 'app' and p_id = 'settings'));
  if p_coll = 'app' and p_id not in ('profile', 'settings') then raise exception 'mm_bad_path' using errcode = '22023'; end if;
  insert into mm_docs(coll, id, data) values (p_coll, p_id, p_data)
    on conflict (coll, id) do update set data = excluded.data, updated_at = now();
end $$;

create or replace function public.mm_del(p_token text, p_coll text, p_id text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform mm_need(p_token, true);
  delete from mm_docs where coll = p_coll and id = p_id;
end $$;

create or replace function public.mm_wipe(p_token text, p_colls text[]) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform mm_need(p_token, true);
  delete from mm_docs where coll = any(p_colls) and coll <> 'app';
  if 'profile' = any(p_colls) then delete from mm_docs where coll = 'app' and id = 'profile'; end if;
end $$;

revoke execute on all functions in schema public from public;
grant execute on function
  public.mm_status(), public.mm_check(text), public.mm_set_pin(text), public.mm_unlock(text),
  public.mm_admin_login(text), public.mm_admin_password(text, text), public.mm_reset_pin(text),
  public.mm_list(text, text), public.mm_get(text, text, text), public.mm_put(text, text, text, jsonb),
  public.mm_del(text, text, text), public.mm_wipe(text, text[])
  to anon, authenticated;

-- ---------- 사진 저장소 ----------
-- 사진 파일 이름은 추측할 수 없는 긴 무작위 이름이라, 일기 목록(비밀번호 필요) 없이는 찾을 수 없어요.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('mm-photos', 'mm-photos', true, 20971520, array['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
    on conflict (id) do nothing;

    drop policy if exists "mm photos upload" on storage.objects;
    create policy "mm photos upload" on storage.objects for insert to anon, authenticated
      with check (bucket_id = 'mm-photos');
    drop policy if exists "mm photos delete" on storage.objects;
    create policy "mm photos delete" on storage.objects for delete to anon, authenticated
      using (bucket_id = 'mm-photos');
  end if;
end $$;
