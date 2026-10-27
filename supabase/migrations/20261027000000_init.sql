-- Innerdesk Studio: skema Supabase.
-- Kontrak data dan alasannya ada di docs/fase-database.md. Jalankan lewat `supabase db push`
-- atau tempel utuh ke SQL Editor di dashboard. Aman dijalankan sekali pada project baru.
--
-- Pola yang dipakai di semua tabel:
--   * Primary key (user_id, id). `id` bertipe text: id lama dari localStorage (TSK-1, prj-ab12cd) tetap muat,
--     id baru dibuat server (uuid) dan tidak pernah dipakai ulang.
--   * `user_id` default auth.uid(), jadi klien tidak pernah mengirimnya. RLS: pemilik saja, tanpa akses anon.
--   * `updated_at` diisi trigger pada UPDATE. INSERT (termasuk restore/urungkan) mempertahankan nilai yang dikirim.
--   * Field opsional yang dikosongkan UI menjadi NULL (klien mengubah `undefined` menjadi null).

-- ---------------------------------------------------------------------------------------------
-- Pembantu
-- ---------------------------------------------------------------------------------------------

create domain public.minor_amount as bigint
  check (value between -9007199254740991 and 9007199254740991); -- Number.isSafeInteger di JavaScript

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create function public.url_decode_ascii(input text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  result text := replace(input, '+', ' ');
  hit text;
  code int;
begin
  loop
    hit := substring(result from '%[0-9a-fA-F]{2}');
    exit when hit is null;
    code := ('x' || substr(hit, 2, 2))::bit(8)::int;
    result := replace(result, hit, case when code = 0 then '' else chr(code) end);
  end loop;
  return result;
end $$;

-- Pemeriksaan tautan project yang sama dengan checkLinkUrl (src/lib/projectLinks.ts). Form bisa dilewati, server tidak.
create function public.project_links_valid(links jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  item jsonb;
  u text;
  authority text;
  host text;
  part text;
  parts text[];
begin
  for item in select value from jsonb_array_elements(links) loop
    if jsonb_typeof(item) is distinct from 'object'
       or jsonb_typeof(item -> 'id') is distinct from 'string'
       or jsonb_typeof(item -> 'title') is distinct from 'string'
       or jsonb_typeof(item -> 'url') is distinct from 'string'
       or (item ->> 'kind') is null
       or (item ->> 'kind') not in ('akun', 'dokumen', 'desain', 'lainnya') then
      return false;
    end if;

    u := item ->> 'url';
    if u !~* '^https?://' or u ~ '\s' then return false; end if;

    authority := substring(u from '^[A-Za-z]+://([^/?#]*)');
    if authority is null or authority = '' or position('@' in authority) > 0 then return false; end if;
    host := regexp_replace(authority, ':[0-9]*$', '');
    if position('.' in host) = 0 and lower(host) <> 'localhost' then return false; end if;

    -- Query dan fragment dipecah per "&", nama parameter didekode seperti URLSearchParams.
    parts := array_cat(
      string_to_array(coalesce(substring(u from '^[^#?]*\?([^#]*)'), ''), '&'),
      string_to_array(coalesce(substring(u from '#(.*)$'), ''), '&')
    );
    foreach part in array parts loop
      if lower(public.url_decode_ascii(split_part(part, '=', 1))) ~
         '^(password|passwd|pwd|pass|secret|token|access_token|refresh_token|id_token|auth|authorization|api[-_]?key|apikey|client_secret|session|sessionid|sid)$' then
        return false;
      end if;
    end loop;
  end loop;
  return true;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Project dan task
-- ---------------------------------------------------------------------------------------------

create table public.projects (
  id          text not null default gen_random_uuid()::text,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(btrim(name)) > 0),
  description text,
  status      text not null check (status in ('active', 'paused', 'done')),
  phase       text not null check (phase in ('riset', 'desain', 'pengembangan', 'peluncuran')),
  deadline    date,
  color       text not null check (color in ('moss', 'ochre', 'clay', 'teal', 'slate', 'rosewood')),
  start_date  date,
  goal        text,
  milestones  jsonb not null default '[]' check (jsonb_typeof(milestones) = 'array'),
  links       jsonb not null default '[]' check (jsonb_typeof(links) = 'array' and public.project_links_valid(links)),
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.tasks (
  id               text not null default gen_random_uuid()::text,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title            text not null check (length(btrim(title)) > 0),
  description      text,
  status           text not null check (status in ('todo', 'doing', 'review', 'done')),
  priority         text not null check (priority in ('urgent', 'high', 'medium', 'low')),
  project_id       text,
  due_date         date,
  due_time         text check (due_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  tags             text[] not null default '{}',
  note_count       int not null default 0 check (note_count >= 0),
  time_log         jsonb not null default '[]' check (jsonb_typeof(time_log) = 'array'),
  focus_count      int not null default 0 check (focus_count >= 0),
  completed_at     timestamptz,
  subtasks         jsonb not null default '[]' check (jsonb_typeof(subtasks) = 'array'),
  estimate_minutes int check (estimate_minutes > 0),
  recurrence       jsonb check (
    recurrence is null or (
      jsonb_typeof(recurrence) = 'object'
      and recurrence ->> 'freq' in ('daily', 'weekly', 'monthly')
      and recurrence ->> 'interval' ~ '^[1-9][0-9]{0,8}$'
    )
  ),
  -- Posisi manual dalam satu kolom status. Pecahan, negatif, dan seri diperbolehkan: bukan integer.
  sort_order       double precision not null default 0,
  archived_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (user_id, id)
);
create index tasks_status_order_idx on public.tasks (user_id, status, sort_order);
create index tasks_project_idx on public.tasks (user_id, project_id);
create index tasks_due_idx on public.tasks (user_id, due_date) where due_date is not null;

-- ---------------------------------------------------------------------------------------------
-- Catatan
-- ---------------------------------------------------------------------------------------------

create table public.notes (
  id              text not null default gen_random_uuid()::text,
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  library_item_id text,
  title           text not null default '',
  content         jsonb not null check (jsonb_typeof(content) = 'object'),
  excerpt         text not null default '',
  tags            text[] not null default '{}',
  pinned          boolean not null default false,
  project_id      text,
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (user_id, id)
);
create index notes_project_idx on public.notes (user_id, project_id);

create table public.note_templates (
  id          text not null default gen_random_uuid()::text,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(btrim(name)) > 0),
  description text,
  title       text not null default '',
  content     jsonb not null check (jsonb_typeof(content) = 'object'),
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------------------------------------------------------------------------------------------
-- Kalender
-- ---------------------------------------------------------------------------------------------

create table public.categories (
  id          text not null default gen_random_uuid()::text,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(btrim(name)) > 0),
  color_token text not null check (color_token in ('moss', 'ochre', 'clay', 'teal', 'slate', 'rosewood')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.events (
  id                 text not null default gen_random_uuid()::text,
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title              text not null,
  starts_at          timestamptz not null,
  ends_at            timestamptz not null,
  all_day            boolean not null default false,
  category_id        text not null,
  project_id         text,
  location           text,
  link               text,
  description        text,
  recurrence         jsonb check (recurrence is null or jsonb_typeof(recurrence) = 'object'),
  reminders          int[] not null default '{}' check (reminders <@ array[10, 60, 1440]),
  recurring_event_id text,
  original_start     timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  primary key (user_id, id),
  check (ends_at >= starts_at)
);
create index events_start_idx on public.events (user_id, starts_at);
create index events_master_idx on public.events (user_id, recurring_event_id) where recurring_event_id is not null;

-- ---------------------------------------------------------------------------------------------
-- Mood dan jurnal: satu data per tanggal
-- ---------------------------------------------------------------------------------------------

create table public.mood_entries (
  id         text not null default gen_random_uuid()::text,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null,
  level      smallint not null check (level between 1 and 5),
  factors    text[] not null default '{}' check (factors <@ array['tidur', 'olahraga', 'makan', 'sosial', 'kerja', 'cuaca']),
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, date)
);

create table public.journal_entries (
  id         text not null default gen_random_uuid()::text,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null,
  title      text,
  content    jsonb not null check (jsonb_typeof(content) = 'object'),
  gratitude  text[],
  learning   text,
  tags       text[],
  excerpt    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, date)
);

-- ---------------------------------------------------------------------------------------------
-- Fokus
-- ---------------------------------------------------------------------------------------------

create table public.focus_sessions (
  id              text not null default gen_random_uuid()::text,
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mode            text not null check (mode in ('focus', 'short', 'long')),
  task_id         text,
  project_id      text,
  planned_seconds int not null check (planned_seconds >= 0),
  actual_seconds  int not null check (actual_seconds >= 0),
  started_at      timestamptz not null,
  ended_at        timestamptz not null,
  completed       boolean not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (user_id, id),
  check (ended_at >= started_at)
);
create index focus_started_idx on public.focus_sessions (user_id, started_at);

-- ---------------------------------------------------------------------------------------------
-- Kebiasaan
-- ---------------------------------------------------------------------------------------------

create table public.habits (
  id            text not null default gen_random_uuid()::text,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null check (length(btrim(name)) > 0),
  description   text,
  color         text not null check (color in ('moss', 'ochre', 'clay', 'teal', 'slate', 'rosewood')),
  icon          text not null check (icon in ('drop', 'barbell', 'book', 'moon', 'sun', 'heart', 'brain', 'pencil', 'leaf', 'coffee', 'walk', 'bicycle', 'apple', 'target', 'star')),
  days          smallint[] not null check (cardinality(days) between 1 and 7 and days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  target        int not null default 1 check (target >= 1),
  unit          text,
  reminder_time text check (reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  start_date    date not null,
  sort_order    double precision not null default 0,
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.habit_logs (
  id         text not null default gen_random_uuid()::text,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id   text not null,
  date       date not null,
  value      double precision not null check (value >= 0),
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, habit_id, date)
);
create index habit_logs_date_idx on public.habit_logs (user_id, date);

-- ---------------------------------------------------------------------------------------------
-- Library
-- ---------------------------------------------------------------------------------------------

create table public.library_items (
  id                   text not null default gen_random_uuid()::text,
  user_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind                 text not null check (kind in ('film', 'buku')),
  title                text not null check (length(btrim(title)) > 0),
  original_title       text,
  year                 int,
  status               text not null check (status in ('planned', 'active', 'done', 'dropped')),
  rating               smallint check (rating between 1 and 10),
  review               jsonb check (review is null or jsonb_typeof(review) = 'object'),
  review_excerpt       text,
  review_has_spoilers  boolean,
  synopsis             text,
  genres               text[] not null default '{}',
  tags                 text[] not null default '{}',
  favorite             boolean,
  cover_url            text,
  accent               text check (accent in ('moss', 'ochre', 'clay', 'teal', 'slate', 'rosewood')),
  finished_at          date,
  sort_order           double precision not null default 0,
  runtime_min          int,
  director             text,
  cast_members         jsonb check (cast_members is null or jsonb_typeof(cast_members) = 'array'),
  crew                 jsonb check (crew is null or jsonb_typeof(crew) = 'array'),
  authors              text[],
  pages                int,
  current_page         int,
  publisher            text,
  isbn                 text,
  format               text check (format in ('cetak', 'ebook', 'audio')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.library_logs (
  id         text not null default gen_random_uuid()::text,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id    text not null,
  date       date not null,
  place      text,
  with_whom  text,
  from_page  int,
  to_page    int,
  minutes    int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index library_logs_item_idx on public.library_logs (user_id, item_id);

create table public.library_quotes (
  id         text not null default gen_random_uuid()::text,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id    text not null,
  text       text not null,
  locator    text,
  comment    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index library_quotes_item_idx on public.library_quotes (user_id, item_id);

-- ---------------------------------------------------------------------------------------------
-- Keuangan (aturan lengkap: bagian "Keuangan" di docs/fase-database.md)
-- Uang selalu bigint satuan minor. Hapus akun tidak boleh menghapus riwayat: restrict, bukan cascade.
-- ---------------------------------------------------------------------------------------------

create table public.accounts (
  id                    text not null default gen_random_uuid()::text,
  user_id               uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                  text not null check (length(btrim(name)) > 0),
  kind                  text not null check (kind in ('tunai', 'bank', 'ewallet', 'investasi')),
  currency              char(3) not null check (currency ~ '^[A-Z]{3}$'),
  opening_balance_minor public.minor_amount not null default 0,
  sort_order            double precision not null default 0,
  archived_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.finance_categories (
  id          text not null default gen_random_uuid()::text,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(btrim(name)) > 0),
  kind        text not null check (kind in ('income', 'expense')),
  sort_order  double precision not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.transactions (
  id                   text not null default gen_random_uuid()::text,
  user_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date                 date not null,
  kind                 text not null check (kind in ('expense', 'income', 'transfer')),
  amount_minor         public.minor_amount not null,
  currency             char(3) not null check (currency ~ '^[A-Z]{3}$'),
  fx_rate              numeric(20, 6) check (fx_rate > 0),
  fx_base_amount_minor public.minor_amount,
  account_id           text not null,
  to_account_id        text,
  to_amount_minor      public.minor_amount,
  category_id          text,
  note                 text,
  payee                text,
  project_id           text,
  tags                 text[] not null default '{}',
  recurring_id         text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  primary key (user_id, id),
  -- Kurs dan nilai dasar disimpan bersama dan tidak pernah dihitung ulang dari kurs hari ini.
  check ((fx_rate is null) = (fx_base_amount_minor is null)),
  check (kind <> 'transfer' or to_account_id is not null),
  check (to_account_id is null or to_account_id <> account_id),
  constraint transactions_account_fk foreign key (user_id, account_id)
    references public.accounts (user_id, id) on delete restrict,
  constraint transactions_to_account_fk foreign key (user_id, to_account_id)
    references public.accounts (user_id, id) on delete restrict,
  constraint transactions_category_fk foreign key (user_id, category_id)
    references public.finance_categories (user_id, id) on delete set null (category_id),
  constraint transactions_project_fk foreign key (user_id, project_id)
    references public.projects (user_id, id) on delete set null (project_id)
);
create index transactions_date_idx on public.transactions (user_id, date);
create index transactions_account_idx on public.transactions (user_id, account_id);
create index transactions_project_idx on public.transactions (user_id, project_id) where project_id is not null;

-- Mata uang transaksi = mata uang akun asal. Transfer lintas mata uang wajib punya to_amount_minor,
-- kalau tidak, kedua sisi tidak bisa diterapkan dan uang tercipta atau hilang.
create function public.transactions_validate() returns trigger
language plpgsql set search_path = '' as $$
declare
  src char(3);
  dst char(3);
begin
  select currency into src from public.accounts where user_id = new.user_id and id = new.account_id;
  if src is null then return new; end if; -- foreign key yang melaporkan akun yang tidak ada
  if new.currency <> src then
    raise exception 'currency_mismatch' using errcode = '23514';
  end if;
  if new.kind = 'transfer' and new.to_account_id is not null then
    select currency into dst from public.accounts where user_id = new.user_id and id = new.to_account_id;
    if dst is not null and dst <> src and new.to_amount_minor is null then
      raise exception 'to_amount_required' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

create trigger transactions_validate before insert or update on public.transactions
  for each row execute function public.transactions_validate();

create table public.budgets (
  id          text not null default gen_random_uuid()::text,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month       char(7) not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  category_id text not null,
  limit_minor public.minor_amount not null check (limit_minor >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, month, category_id),
  constraint budgets_category_fk foreign key (user_id, category_id)
    references public.finance_categories (user_id, id) on delete restrict
);

create table public.goals (
  id           text not null default gen_random_uuid()::text,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null check (length(btrim(name)) > 0),
  target_minor public.minor_amount not null check (target_minor > 0),
  target_date  date,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.goal_contributions (
  id           text not null,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id      text not null,
  date         date not null,
  amount_minor public.minor_amount not null,
  note         text,
  position     int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, id),
  constraint goal_contributions_goal_fk foreign key (user_id, goal_id)
    references public.goals (user_id, id) on delete cascade
);
create index goal_contributions_goal_idx on public.goal_contributions (user_id, goal_id, position);

create table public.recurring (
  id           text not null default gen_random_uuid()::text,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null check (length(btrim(name)) > 0),
  kind         text not null check (kind in ('income', 'expense')),
  amount_minor public.minor_amount not null,
  currency     char(3) not null check (currency ~ '^[A-Z]{3}$'),
  account_id   text not null,
  category_id  text,
  freq         text not null check (freq in ('weekly', 'monthly', 'yearly')),
  interval     int not null default 1 check (interval >= 1),
  next_date    date not null,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, id),
  constraint recurring_account_fk foreign key (user_id, account_id)
    references public.accounts (user_id, id) on delete restrict,
  constraint recurring_category_fk foreign key (user_id, category_id)
    references public.finance_categories (user_id, id) on delete set null (category_id)
);

-- Setoran target: ganti seluruh larik dalam satu transaksi. Id setoran dibuat klien dan dipertahankan.
create function public.goal_replace_contributions(p_goal_id text, p_items jsonb) returns void
language plpgsql set search_path = '' as $$
begin
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'invalid_contributions' using errcode = '22023';
  end if;

  delete from public.goal_contributions
  where user_id = auth.uid() and goal_id = p_goal_id
    and id not in (select e ->> 'id' from jsonb_array_elements(p_items) as e);

  insert into public.goal_contributions (id, goal_id, date, amount_minor, note, position)
  select e ->> 'id', p_goal_id, (e ->> 'date')::date, (e ->> 'amountMinor')::bigint, e ->> 'note', (t.ord - 1)::int
  from jsonb_array_elements(p_items) with ordinality as t(e, ord)
  on conflict (user_id, id) do update
    set goal_id = excluded.goal_id, date = excluded.date, amount_minor = excluded.amount_minor,
        note = excluded.note, position = excluded.position;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Vault: hanya ciphertext. Server tidak pernah melihat kata sandi, kunci, atau teks asli.
-- Tidak ada kolom judul, jenis, tag, url, atau favorit di luar ciphertext. Lihat "Vault" di docs/fase-database.md.
-- ---------------------------------------------------------------------------------------------

create table public.vault_meta (
  user_id                uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  version                int  not null check (version = 1),
  revision               int  not null check (revision >= 1),
  key_epoch              int  not null check (key_epoch >= 1),
  kdf                    jsonb not null,
  wrapped_vk_by_password jsonb not null,
  wrapped_vk_by_recovery jsonb not null,
  created_at             timestamptz not null,
  updated_at             timestamptz not null
);

create table public.vault_items (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null check (id ~ '^[A-Za-z0-9_-]{1,64}$'),
  v          int  not null,
  key_epoch  int  not null,
  iv         text not null check (length(iv) <= 64),
  ciphertext text not null check (length(ciphertext) <= 400000),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, id)
);

-- Set pengganti yang disiapkan di samping set aktif (rotasi kunci dan restore backup).
create table public.vault_items_staged (like public.vault_items including all);
alter table public.vault_items_staged
  add constraint vault_items_staged_user_fk foreign key (user_id) references auth.users (id) on delete cascade;
alter table public.vault_items_staged alter column user_id set default auth.uid();

create table public.vault_stage (
  user_id   uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  key_epoch int not null check (key_epoch >= 1)
);

-- Menjadikan set yang disiapkan sebagai set aktif. Epoch diambil dari meta di server, bukan dipercaya dari klien:
-- set baru hanya naik kalau epoch-nya sama dengan epoch meta yang sudah berkomitmen. Aman dipanggil berulang.
create function public.vault_settle(p_epoch int) returns void
language plpgsql set search_path = '' as $$
declare
  me uuid := auth.uid();
  staged int;
  meta_epoch int;
  live_epoch int;
begin
  select key_epoch into staged from public.vault_stage where user_id = me;
  if staged is null then return; end if;
  select key_epoch into meta_epoch from public.vault_meta where user_id = me;
  select max(key_epoch) into live_epoch from public.vault_items where user_id = me;

  if staged = p_epoch and meta_epoch = staged and (live_epoch is null or live_epoch < staged) then
    delete from public.vault_items where user_id = me;
    insert into public.vault_items (id, v, key_epoch, iv, ciphertext, created_at, updated_at)
      select id, v, key_epoch, iv, ciphertext, created_at, updated_at
      from public.vault_items_staged where user_id = me;
  end if;

  delete from public.vault_items_staged where user_id = me;
  delete from public.vault_stage where user_id = me;
end $$;

create function public.vault_discard_staged() returns void
language plpgsql set search_path = '' as $$
begin
  delete from public.vault_items_staged where user_id = auth.uid();
  delete from public.vault_stage where user_id = auth.uid();
end $$;

create function public.vault_stage_replace(p_items jsonb, p_epoch int) returns void
language plpgsql set search_path = '' as $$
begin
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'invalid_items' using errcode = '22023';
  end if;
  delete from public.vault_items_staged where user_id = auth.uid();
  insert into public.vault_stage (key_epoch) values (p_epoch)
    on conflict (user_id) do update set key_epoch = excluded.key_epoch;
  insert into public.vault_items_staged (id, v, key_epoch, iv, ciphertext, created_at, updated_at)
    select e ->> 'id', (e ->> 'v')::int, p_epoch, e ->> 'iv', e ->> 'ciphertext',
           (e ->> 'createdAt')::timestamptz, (e ->> 'updatedAt')::timestamptz
    from jsonb_array_elements(p_items) as e;
end $$;

-- Compare-and-swap pada meta. Kalau ada set yang disiapkan untuk epoch baru, ia naik di transaksi yang sama,
-- jadi meta dan item tidak pernah berbeda kunci. Error VLT01 = conflict.
create function public.vault_meta_update(p_meta jsonb) returns void
language plpgsql set search_path = '' as $$
declare
  changed int;
  next_revision int := (p_meta ->> 'revision')::int;
  next_epoch int := (p_meta ->> 'keyEpoch')::int;
begin
  update public.vault_meta set
    revision = next_revision,
    key_epoch = next_epoch,
    kdf = p_meta -> 'kdf',
    wrapped_vk_by_password = p_meta -> 'wrappedVkByPassword',
    wrapped_vk_by_recovery = p_meta -> 'wrappedVkByRecovery',
    updated_at = (p_meta ->> 'updatedAt')::timestamptz
  where user_id = auth.uid() and revision = next_revision - 1 and key_epoch <= next_epoch;
  get diagnostics changed = row_count;
  if changed = 0 then raise exception 'conflict' using errcode = 'VLT01'; end if;
  perform public.vault_settle(next_epoch);
end $$;

-- Mengganti meta tanpa membandingkan: hanya untuk memulihkan backup yang sudah diverifikasi ke atas vault yang rusak.
create function public.vault_meta_overwrite(p_meta jsonb) returns void
language plpgsql set search_path = '' as $$
begin
  insert into public.vault_meta (version, revision, key_epoch, kdf, wrapped_vk_by_password, wrapped_vk_by_recovery, created_at, updated_at)
  values ((p_meta ->> 'version')::int, (p_meta ->> 'revision')::int, (p_meta ->> 'keyEpoch')::int, p_meta -> 'kdf',
          p_meta -> 'wrappedVkByPassword', p_meta -> 'wrappedVkByRecovery',
          (p_meta ->> 'createdAt')::timestamptz, (p_meta ->> 'updatedAt')::timestamptz)
  on conflict (user_id) do update set
    version = excluded.version, revision = excluded.revision, key_epoch = excluded.key_epoch, kdf = excluded.kdf,
    wrapped_vk_by_password = excluded.wrapped_vk_by_password, wrapped_vk_by_recovery = excluded.wrapped_vk_by_recovery,
    created_at = excluded.created_at, updated_at = excluded.updated_at;
  perform public.vault_settle((p_meta ->> 'keyEpoch')::int);
end $$;

-- Tulis item hanya terhadap epoch meta yang berlaku: tab usang tidak bisa menambah item dengan kunci lama.
create function public.vault_check_epoch(p_epoch int) returns void
language plpgsql stable set search_path = '' as $$
declare current_epoch int;
begin
  select key_epoch into current_epoch from public.vault_meta where user_id = auth.uid();
  if current_epoch is null or current_epoch <> p_epoch then
    raise exception 'conflict' using errcode = 'VLT01';
  end if;
end $$;

create function public.vault_item_put(p_item jsonb, p_epoch int) returns void
language plpgsql set search_path = '' as $$
begin
  perform public.vault_check_epoch(p_epoch);
  insert into public.vault_items (id, v, key_epoch, iv, ciphertext, created_at, updated_at)
  values (p_item ->> 'id', (p_item ->> 'v')::int, p_epoch, p_item ->> 'iv', p_item ->> 'ciphertext',
          (p_item ->> 'createdAt')::timestamptz, (p_item ->> 'updatedAt')::timestamptz)
  on conflict (user_id, id) do update set
    v = excluded.v, key_epoch = excluded.key_epoch, iv = excluded.iv, ciphertext = excluded.ciphertext,
    created_at = excluded.created_at, updated_at = excluded.updated_at;
end $$;

-- Mengembalikan item yang dihapus dengan ciphertext yang sama. Gagal (23505) kalau id sudah ada.
create function public.vault_item_restore(p_item jsonb, p_epoch int) returns void
language plpgsql set search_path = '' as $$
begin
  perform public.vault_check_epoch(p_epoch);
  insert into public.vault_items (id, v, key_epoch, iv, ciphertext, created_at, updated_at)
  values (p_item ->> 'id', (p_item ->> 'v')::int, p_epoch, p_item ->> 'iv', p_item ->> 'ciphertext',
          (p_item ->> 'createdAt')::timestamptz, (p_item ->> 'updatedAt')::timestamptz);
end $$;

create function public.vault_item_remove(p_id text, p_epoch int) returns void
language plpgsql set search_path = '' as $$
begin
  perform public.vault_check_epoch(p_epoch);
  delete from public.vault_items where user_id = auth.uid() and id = p_id;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Data awal per pengguna: kategori kalender dan kategori keuangan. Dijalankan klien sekali setelah masuk.
-- Penanda user_bootstrap membuatnya idempoten dan tahan balapan dua tab: kategori yang kamu hapus tidak muncul lagi.
-- ---------------------------------------------------------------------------------------------

create table public.user_bootstrap (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  done_at timestamptz not null default now()
);

create function public.bootstrap_defaults() returns boolean
language plpgsql set search_path = '' as $$
declare inserted int;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  insert into public.user_bootstrap (user_id) values (auth.uid()) on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return false; end if;

  insert into public.categories (name, color_token) values
    ('Kerja', 'slate'), ('Belajar', 'teal'), ('Pribadi', 'rosewood'),
    ('Olahraga', 'moss'), ('Keluarga', 'ochre'), ('Perjalanan', 'clay');

  insert into public.finance_categories (name, kind, sort_order) values
    ('Makan', 'expense', 0), ('Transportasi', 'expense', 1), ('Belanja', 'expense', 2), ('Tagihan', 'expense', 3),
    ('Tempat tinggal', 'expense', 4), ('Hiburan', 'expense', 5), ('Kesehatan', 'expense', 6), ('Pengeluaran lain', 'expense', 7),
    ('Gaji', 'income', 0), ('Freelance', 'income', 1), ('Pemasukan lain', 'income', 2);
  return true;
end $$;

-- ---------------------------------------------------------------------------------------------
-- RLS, hak akses, dan trigger updated_at
-- ---------------------------------------------------------------------------------------------

do $$
declare
  t text;
  with_trigger text[] := array[
    'projects', 'tasks', 'notes', 'note_templates', 'categories', 'events', 'mood_entries', 'journal_entries',
    'focus_sessions', 'habits', 'habit_logs', 'library_items', 'library_logs', 'library_quotes',
    'accounts', 'finance_categories', 'transactions', 'budgets', 'goals', 'goal_contributions', 'recurring'
  ];
  -- Tabel vault menyimpan updated_at dari klien apa adanya, dan tidak ada trigger yang menyentuh isinya.
  plain text[] := array['vault_meta', 'vault_items', 'vault_items_staged', 'vault_stage', 'user_bootstrap'];
begin
  foreach t in array with_trigger || plain loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, public', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || '_own', t
    );
  end loop;
  foreach t in array with_trigger loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Fungsi bisa dipanggil PUBLIC secara bawaan. Hanya pengguna yang sudah masuk yang boleh memanggil RPC.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'goal_replace_contributions', 'bootstrap_defaults', 'vault_settle', 'vault_discard_staged', 'vault_stage_replace',
      'vault_meta_update', 'vault_meta_overwrite', 'vault_check_epoch', 'vault_item_put', 'vault_item_restore', 'vault_item_remove'
    )
  loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
