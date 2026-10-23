# Act2 Flow — bolt.new Prompt Pack
Paste prompts **one at a time, in order**. Wait for each to build and test it before sending the next. Commit to GitHub after every phase.

## How to use bolt.new well on this build
1. Create the Supabase project first (region: Singapore). In bolt.new, connect Supabase, then run the SQL in **Phase 0** in the Supabase SQL editor.
2. Put the **Project Knowledge / system prompt** below into bolt's Project Settings (or send it as the first message).
3. Use Discussion mode to plan before large changes. Lock `src/lib/supabase.ts`, `src/types/database.ts` and the design tokens once stable.
4. If bolt starts rewriting finished files, say: "Only change files needed for this feature. Do not refactor unrelated code."
5. Never paste the Supabase service-role key anywhere. Only the anon key belongs in the front end.

---

## A. Project Knowledge (paste once)

```
You are building "Act2 Flow", an internal project-management web app for Act2 Pictures, a Malaysian video and film production company.

STACK: React 18, Vite, TypeScript (strict), Tailwind CSS, react-router-dom v6, TanStack Query, supabase-js, react-hook-form + zod, @dnd-kit, Recharts, date-fns + date-fns-tz, lucide-react. No other UI frameworks.

CONVENTIONS
- Feature folders: src/features/{auth,projects,tasks,kpis,deliverables,resources,budget,admin,dashboard}. Shared UI in src/components/ui. Data hooks in each feature's /api folder using TanStack Query.
- All DB access via a typed supabase client in src/lib/supabase.ts. Never put secrets in code. Use env vars VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
- Every list has loading, empty and error states. Every mutation shows a toast and uses optimistic updates where sensible.
- Locale: English UI, currency MYR formatted as "RM 12,500.00", dates DD/MM/YYYY, timezone Asia/Kuala_Lumpur.
- Accessibility: WCAG AA contrast, visible focus rings, keyboard-operable controls, aria labels on icon buttons. Never convey status by colour alone (pair with icon/label).
- Design: cinematic but calm. Neutral slate base, warm amber accent (#F59E0B), Inter font, 12px radius cards, subtle borders, light mode default with a dark-mode toggle. Status colours: green emerald-500, amber amber-500, red rose-500, info sky-500.
- Desktop-first, fully usable at 375px for My Work, task update, notifications and call sheet views.
- Role-based UI: roles are admin, exec_producer, producer, dept_lead, crew, freelancer, finance. Hide UI the role cannot use, but assume the database (RLS) is the real security boundary.
- Tags are namespaced strings like "dept:camera", "priority:high", "lang:bm".
- Use sample data only with fictional names (e.g. "Kopi Kita TVC", "Lorong 9 Series"). Never use real client names.
- Keep code small, readable, and typed. No placeholder lorem ipsum in finished screens.
```

---

## Phase 0 — Database (run in Supabase SQL editor)

> Run in 3 chunks (0A schema, 0B functions + RLS, 0C seed). Generate TypeScript types afterwards: `npx supabase gen types typescript --project-id <id> > src/types/database.ts`.

### 0A — Schema
```sql
create extension if not exists "uuid-ossp";
create extension if not exists btree_gist;

-- ENUMS
create type app_role as enum ('admin','exec_producer','producer','dept_lead','crew','freelancer','finance');
create type project_status as enum ('proposal','confirmed','active','on_hold','delivered','closed','cancelled');
create type health as enum ('green','amber','red');
create type task_status as enum ('backlog','todo','in_progress','in_review','blocked','done');
create type priority as enum ('low','medium','high','critical');
create type deliverable_status as enum ('not_started','in_progress','internal_review','client_review','changes_requested','approved','delivered');
create type resource_type as enum ('person','equipment','vehicle','location','edit_suite');
create type kpi_direction as enum ('higher_better','lower_better');
create type kpi_source as enum ('manual','auto');

-- PEOPLE
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  email text not null,
  role app_role not null default 'crew',
  department text,
  job_title text,
  employment_type text check (employment_type in ('staff','freelancer')) default 'staff',
  phone text,
  avatar_url text,
  skills text[] default '{}',
  active boolean default true,
  created_at timestamptz default now()
);

create table clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  client_type text,
  contact_name text,
  contact_email text,
  notes text,
  created_at timestamptz default now()
);

-- TEMPLATES
create table project_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,                 -- 'Commercial / TVC'
  project_type text not null,         -- 'tvc'
  default_phases jsonb not null,      -- [{"name":"Development","position":1}, ...]
  default_tasks jsonb default '[]',   -- [{"phase":"Pre-production","title":"Recce","dept":"directing"}]
  default_kpi_ids uuid[] default '{}',
  created_at timestamptz default now()
);

create table spec_fields (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid references project_templates on delete cascade,
  key text not null,
  label text not null,
  field_type text not null check (field_type in ('text','textarea','number','date','select','multiselect','boolean','url')),
  options jsonb,
  required boolean default false,
  position int default 0,
  unique(template_id, key)
);

-- PROJECTS
create table projects (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  name text not null,
  description text,
  client_id uuid references clients,
  template_id uuid references project_templates,
  project_type text not null,
  status project_status default 'proposal',
  health_override health,
  health_override_reason text,
  producer_id uuid references profiles,
  start_date date,
  delivery_date date,
  budget_total numeric(14,2) default 0,
  currency text default 'MYR',
  spec jsonb default '{}',
  contracted_revisions int default 2,
  created_by uuid references profiles,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table project_members (
  project_id uuid references projects on delete cascade,
  profile_id uuid references profiles on delete cascade,
  project_role text,                  -- 'Director','DOP','Editor'...
  primary key (project_id, profile_id)
);

create table phases (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects on delete cascade,
  name text not null,
  position int not null,
  start_date date,
  end_date date,
  hidden boolean default false
);

create table tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects on delete cascade,
  phase_id uuid references phases on delete set null,
  parent_task_id uuid references tasks on delete cascade,
  title text not null,
  description text,
  status task_status default 'todo',
  priority priority default 'medium',
  department text,
  start_date date,
  due_date date,
  estimate_hours numeric(6,2),
  checklist jsonb default '[]',
  links jsonb default '[]',
  position numeric default 0,
  created_by uuid references profiles,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on tasks(project_id, status);
create index on tasks(due_date);

create table task_assignees (
  task_id uuid references tasks on delete cascade,
  profile_id uuid references profiles on delete cascade,
  primary key (task_id, profile_id)
);

create table task_dependencies (
  task_id uuid references tasks on delete cascade,
  depends_on_id uuid references tasks on delete cascade,
  primary key (task_id, depends_on_id),
  check (task_id <> depends_on_id)
);

create table task_comments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references tasks on delete cascade,
  author_id uuid references profiles,
  body text not null,
  mentions uuid[] default '{}',
  created_at timestamptz default now()
);

-- TAGS (polymorphic)
create table tags (
  id uuid primary key default uuid_generate_v4(),
  namespace text not null,
  value text not null,
  color text,
  unique(namespace, value)
);
create table entity_tags (
  entity_type text not null check (entity_type in ('project','task','deliverable','profile','resource','client','shoot_day')),
  entity_id uuid not null,
  tag_id uuid references tags on delete cascade,
  primary key (entity_type, entity_id, tag_id)
);

-- SCHEDULE
create table milestones (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects on delete cascade,
  name text not null,
  due_date date not null,
  completed_at timestamptz
);

create table resources (
  id uuid primary key default uuid_generate_v4(),
  type resource_type not null,
  name text not null,
  category text,
  profile_id uuid references profiles,   -- for type = person
  notes text,
  active boolean default true
);
-- sensitive: rates live in their own table
create table resource_rates (
  resource_id uuid primary key references resources on delete cascade,
  day_rate numeric(12,2)
);

create table shoot_days (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects on delete cascade,
  shoot_date date not null,
  call_time time,
  wrap_time time,
  location text,
  scenes text,
  notes text,
  weather_note text,
  status text default 'planned'
);

create table bookings (
  id uuid primary key default uuid_generate_v4(),
  resource_id uuid not null references resources on delete cascade,
  project_id uuid not null references projects on delete cascade,
  shoot_day_id uuid references shoot_days on delete set null,
  period daterange not null,
  note text,
  exclude using gist (resource_id with =, period with &&)   -- hard stop on double-booking
);
-- NOTE: UI should catch the exclusion error and show "Resource already booked on <project> for these dates."

create table holidays (
  id uuid primary key default uuid_generate_v4(),
  holiday_date date not null,
  name text not null,
  scope text default 'national'   -- or state name
);

-- KPIs
create table kpi_definitions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  unit text not null,                -- '%','MYR','count','days','score'
  direction kpi_direction not null,
  source kpi_source default 'manual',
  auto_key text,                     -- 'on_time_tasks','budget_variance','schedule_variance','revisions_used','first_pass_approval'
  default_target numeric,
  amber_threshold numeric,           -- distance from target that turns amber
  red_threshold numeric,             -- distance from target that turns red
  project_types text[] default '{}'
);

create table project_kpis (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects on delete cascade,
  kpi_id uuid references kpi_definitions,
  target numeric not null,
  current_value numeric,
  owner_id uuid references profiles,
  comment text,
  updated_at timestamptz default now(),
  unique(project_id, kpi_id)
);

create table kpi_updates (
  id uuid primary key default uuid_generate_v4(),
  project_kpi_id uuid references project_kpis on delete cascade,
  value numeric not null,
  note text,
  recorded_by uuid references profiles,
  recorded_at timestamptz default now()
);

-- DELIVERABLES
create table deliverables (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects on delete cascade,
  name text not null,
  format_spec jsonb default '{}',   -- {"duration":"30s","aspect":"16:9","lang":"bm","platform":"tv"}
  due_date date,
  owner_id uuid references profiles,
  status deliverable_status default 'not_started',
  created_at timestamptz default now()
);
create table deliverable_versions (
  id uuid primary key default uuid_generate_v4(),
  deliverable_id uuid references deliverables on delete cascade,
  version_no int not null,
  review_url text,
  notes text,
  created_by uuid references profiles,
  created_at timestamptz default now(),
  unique(deliverable_id, version_no)
);
create table review_comments (
  id uuid primary key default uuid_generate_v4(),
  version_id uuid references deliverable_versions on delete cascade,
  author_id uuid references profiles,
  author_label text,               -- for future external clients
  timecode text,                   -- '00:00:12:05'
  body text not null,
  resolved boolean default false,
  created_at timestamptz default now()
);
create table approvals (
  id uuid primary key default uuid_generate_v4(),
  deliverable_id uuid references deliverables on delete cascade,
  version_id uuid references deliverable_versions,
  approved_by uuid references profiles,
  approved_at timestamptz default now(),
  note text
);

-- BUDGET (restricted)
create table budget_lines (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects on delete cascade,
  category text not null,
  description text,
  estimate numeric(14,2) default 0,
  committed numeric(14,2) default 0,
  actual numeric(14,2) default 0
);

-- TIME, ACTIVITY, NOTIFICATIONS
create table time_entries (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references tasks on delete cascade,
  profile_id uuid references profiles,
  entry_date date default current_date,
  hours numeric(5,2) not null
);
create table activity_log (
  id bigint generated always as identity primary key,
  project_id uuid references projects on delete cascade,
  actor_id uuid references profiles,
  entity_type text,
  entity_id uuid,
  action text,
  detail jsonb,
  created_at timestamptz default now()
);
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid references profiles on delete cascade,
  kind text,                        -- assigned, mentioned, due_soon, overdue, review_comment, booking_conflict
  title text,
  link text,
  read boolean default false,
  created_at timestamptz default now()
);
```

### 0B — Helper functions and RLS
```sql
-- Helpers
create or replace function current_role_name() returns app_role
language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

create or replace function is_leadership() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(current_role_name() in ('admin','exec_producer'), false) $$;

create or replace function can_see_money() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(current_role_name() in ('admin','exec_producer','producer','finance'), false) $$;

create or replace function is_project_member(pid uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists(select 1 from project_members where project_id = pid and profile_id = auth.uid())
       or exists(select 1 from projects where id = pid and producer_id = auth.uid())
       or coalesce(current_role_name() in ('admin','exec_producer','finance'), false) $$;

-- Auto-create profile on invite/sign-up
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email,
          coalesce((new.raw_user_meta_data->>'role')::app_role, 'crew'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Enable RLS everywhere
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- PROFILES: everyone signed in can read basic profile; self or admin can update
create policy "profiles read" on profiles for select to authenticated using (true);
create policy "profiles self update" on profiles for update to authenticated using (id = auth.uid() or current_role_name() = 'admin');
create policy "profiles admin insert" on profiles for insert to authenticated with check (current_role_name() = 'admin');

-- Reference data: read for all authenticated, write for admin
do $$ declare t text; begin
  foreach t in array array['clients','project_templates','spec_fields','tags','kpi_definitions','holidays','resources'] loop
    execute format('create policy "%1$s read" on %1$I for select to authenticated using (true)', t);
    execute format('create policy "%1$s admin write" on %1$I for all to authenticated using (is_leadership()) with check (is_leadership())', t);
  end loop;
end $$;

-- PROJECTS
create policy "projects read" on projects for select to authenticated using (is_project_member(id));
create policy "projects insert" on projects for insert to authenticated with check (current_role_name() in ('admin','exec_producer','producer'));
create policy "projects update" on projects for update to authenticated using (is_leadership() or producer_id = auth.uid());
create policy "projects delete" on projects for delete to authenticated using (current_role_name() = 'admin');

-- Project-scoped tables: read if member; write if producer/leadership, plus task-level rules below
do $$ declare t text; begin
  foreach t in array array['project_members','phases','milestones','shoot_days','bookings','project_kpis','deliverables','activity_log'] loop
    execute format('create policy "%1$s read" on %1$I for select to authenticated using (is_project_member(project_id))', t);
    execute format('create policy "%1$s write" on %1$I for all to authenticated using (is_leadership() or exists(select 1 from projects p where p.id = project_id and p.producer_id = auth.uid())) with check (is_leadership() or exists(select 1 from projects p where p.id = project_id and p.producer_id = auth.uid()))', t);
  end loop;
end $$;
-- activity_log should be insert-only for members:
drop policy "activity_log write" on activity_log;
create policy "activity insert" on activity_log for insert to authenticated with check (is_project_member(project_id));

-- TASKS: members read; members can create; assignees/leads/producers update
create policy "tasks read" on tasks for select to authenticated using (is_project_member(project_id));
create policy "tasks insert" on tasks for insert to authenticated with check (is_project_member(project_id) and current_role_name() <> 'freelancer');
create policy "tasks update" on tasks for update to authenticated using (
  is_leadership() or exists(select 1 from projects p where p.id = project_id and p.producer_id = auth.uid())
  or current_role_name() = 'dept_lead' and is_project_member(project_id)
  or exists(select 1 from task_assignees a where a.task_id = tasks.id and a.profile_id = auth.uid()));
create policy "tasks delete" on tasks for delete to authenticated using (is_leadership() or exists(select 1 from projects p where p.id = project_id and p.producer_id = auth.uid()));

-- Task children
create policy "assignees read" on task_assignees for select to authenticated using (exists(select 1 from tasks t where t.id = task_id and is_project_member(t.project_id)));
create policy "assignees write" on task_assignees for all to authenticated using (exists(select 1 from tasks t where t.id = task_id and (is_leadership() or is_project_member(t.project_id) and current_role_name() in ('producer','dept_lead'))));
create policy "deps rw" on task_dependencies for all to authenticated using (exists(select 1 from tasks t where t.id = task_id and is_project_member(t.project_id)));
create policy "comments read" on task_comments for select to authenticated using (exists(select 1 from tasks t where t.id = task_id and is_project_member(t.project_id)));
create policy "comments insert" on task_comments for insert to authenticated with check (author_id = auth.uid() and exists(select 1 from tasks t where t.id = task_id and is_project_member(t.project_id)));
create policy "time rw own" on time_entries for all to authenticated using (profile_id = auth.uid() or is_leadership());
create policy "entity_tags rw" on entity_tags for all to authenticated using (true) with check (true);  -- tighten per entity in R2

-- Deliverable children
create policy "versions rw" on deliverable_versions for all to authenticated using (exists(select 1 from deliverables d where d.id = deliverable_id and is_project_member(d.project_id)));
create policy "review rw" on review_comments for all to authenticated using (exists(select 1 from deliverable_versions v join deliverables d on d.id = v.deliverable_id where v.id = version_id and is_project_member(d.project_id)));
create policy "approvals read" on approvals for select to authenticated using (exists(select 1 from deliverables d where d.id = deliverable_id and is_project_member(d.project_id)));
create policy "approvals insert" on approvals for insert to authenticated with check (current_role_name() in ('admin','exec_producer','producer') and approved_by = auth.uid());
create policy "kpi updates rw" on kpi_updates for all to authenticated using (exists(select 1 from project_kpis k where k.id = project_kpi_id and is_project_member(k.project_id)));

-- MONEY (restricted)
create policy "budget read" on budget_lines for select to authenticated using (can_see_money() and is_project_member(project_id));
create policy "budget write" on budget_lines for all to authenticated using (current_role_name() in ('admin','exec_producer','finance') or (current_role_name()='producer' and exists(select 1 from projects p where p.id=project_id and p.producer_id=auth.uid())));
create policy "rates read" on resource_rates for select to authenticated using (can_see_money());
create policy "rates write" on resource_rates for all to authenticated using (current_role_name() in ('admin','finance'));

-- Notifications: own only
create policy "notif own" on notifications for select to authenticated using (recipient_id = auth.uid());
create policy "notif update own" on notifications for update to authenticated using (recipient_id = auth.uid());
create policy "notif insert" on notifications for insert to authenticated with check (true);

-- NOTE: projects.budget_total is readable by members. If freelancers/crew must not see it,
-- move it to a restricted table (project_financials) before go-live. Flagged for R1 hardening.
```

### 0C — Seed (templates, KPIs, tags, holidays)
```sql
insert into project_templates (name, project_type, default_phases) values
('Commercial / TVC','tvc','[{"name":"Development","position":1},{"name":"Pre-production","position":2},{"name":"Production","position":3},{"name":"Post-production","position":4},{"name":"Delivery","position":5},{"name":"Wrap","position":6}]'),
('Corporate / Branded Film','corporate','[{"name":"Development","position":1},{"name":"Pre-production","position":2},{"name":"Production","position":3},{"name":"Post-production","position":4},{"name":"Delivery","position":5},{"name":"Wrap","position":6}]'),
('Documentary / Series','documentary','[{"name":"Development","position":1},{"name":"Research & Pre-production","position":2},{"name":"Production","position":3},{"name":"Post-production","position":4},{"name":"Delivery","position":5},{"name":"Wrap","position":6}]'),
('Social Content Retainer','social','[{"name":"Planning","position":1},{"name":"Production","position":2},{"name":"Edit","position":3},{"name":"Publish & Report","position":4}]'),
('Event Coverage','event','[{"name":"Planning","position":1},{"name":"Event Day","position":2},{"name":"Edit & Deliver","position":3}]');

-- Spec fields (examples; extend later in Admin UI)
insert into spec_fields (template_id, key, label, field_type, options, required, position)
select t.id, f.key, f.label, f.ft, f.opts::jsonb, f.req, f.pos from project_templates t
join (values
 ('tvc','cutdowns','Cut-downs required','multiselect','["60s","30s","15s","6s"]',true,1),
 ('tvc','aspect_ratios','Aspect ratios','multiselect','["16:9","9:16","1:1","4:5"]',true,2),
 ('tvc','platforms','Platforms','multiselect','["TV","Cinema","YouTube","TikTok","Instagram","Facebook"]',true,3),
 ('tvc','languages','Languages','multiselect','["BM","English","Mandarin","Tamil"]',true,4),
 ('tvc','usage_period','Talent usage period (months)','number',null,false,5),
 ('tvc','music_licence','Music licence type','select','["Original composition","Stock","Licensed track","None"]',false,6),
 ('corporate','runtime','Target runtime (min)','number',null,true,1),
 ('corporate','aspect_ratios','Aspect ratios','multiselect','["16:9","9:16","1:1"]',true,2),
 ('corporate','subtitles','Subtitle languages','multiselect','["BM","English","Mandarin","Tamil"]',false,3),
 ('documentary','episodes','Number of episodes','number',null,true,1),
 ('documentary','runtime','Runtime per episode (min)','number',null,true,2),
 ('documentary','broadcaster_spec','Broadcaster/streamer delivery spec URL','url',null,false,3),
 ('documentary','archive_needed','Archive material required','boolean',null,false,4),
 ('documentary','interviewees','Interview subjects (count)','number',null,false,5),
 ('social','videos_per_month','Videos per month','number',null,true,1),
 ('social','turnaround_days','Turnaround SLA (days)','number',null,true,2),
 ('social','channels','Channels','multiselect','["TikTok","Instagram","YouTube Shorts","Facebook","LinkedIn"]',true,3),
 ('event','venue','Venue','text',null,true,1),
 ('event','coverage_hours','Coverage hours','number',null,true,2),
 ('event','same_day_edit','Same-day highlight required','boolean',null,false,3)
) as f(pt,key,label,ft,opts,req,pos) on f.pt = t.project_type;

insert into kpi_definitions (name, description, unit, direction, source, auto_key, default_target, amber_threshold, red_threshold, project_types) values
('On-time task completion','Share of due tasks completed by due date','%','higher_better','auto','on_time_tasks',90,10,20,'{tvc,corporate,documentary,social,event}'),
('Budget variance','Actual vs estimate','%','lower_better','auto','budget_variance',5,5,10,'{tvc,corporate,documentary,event}'),
('Schedule variance','Days behind planned delivery','days','lower_better','auto','schedule_variance',0,3,7,'{tvc,corporate,documentary,social,event}'),
('Revision rounds used','Rounds used vs contracted','count','lower_better','auto','revisions_used',2,1,2,'{tvc,corporate,documentary}'),
('First-pass approval','Deliverables approved at V1','%','higher_better','auto','first_pass_approval',60,20,40,'{tvc,corporate,social}'),
('Broadcast QC pass','Passed broadcaster QC first time (1=yes)','score','higher_better','manual',null,1,0,1,'{tvc,documentary}'),
('Client satisfaction','Post-project score out of 5','score','higher_better','manual',null,4.5,0.5,1,'{tvc,corporate,documentary,event}'),
('Videos delivered per month','Count vs retainer','count','higher_better','manual',null,8,2,4,'{social}'),
('30-day views','Views 30 days after publish','count','higher_better','manual',null,50000,15000,30000,'{social,tvc}'),
('Same-day highlights delivered','Delivered within 24h (1=yes)','score','higher_better','manual',null,1,0,1,'{event}');

-- Tag library (namespaces from PRD section 5)
insert into tags (namespace, value, color) values
('priority','low','#94A3B8'),('priority','medium','#38BDF8'),('priority','high','#F59E0B'),('priority','critical','#F43F5E'),
('dept','producing','#8B5CF6'),('dept','directing','#EC4899'),('dept','camera','#0EA5E9'),('dept','lighting','#F59E0B'),('dept','sound','#10B981'),
('dept','art','#F97316'),('dept','wardrobe-makeup','#D946EF'),('dept','edit','#6366F1'),('dept','colour','#14B8A6'),('dept','vfx-motion','#A855F7'),
('dept','audio-post','#22C55E'),('dept','accounts','#64748B'),('dept','bizdev','#EAB308'),
('status-flag','blocked','#F43F5E'),('status-flag','waiting-client','#F59E0B'),('status-flag','waiting-talent','#F59E0B'),('status-flag','needs-approval','#38BDF8'),('status-flag','at-risk','#F43F5E'),
('lang','bm','#64748B'),('lang','en','#64748B'),('lang','zh','#64748B'),('lang','ta','#64748B'),
('platform','tv','#64748B'),('platform','cinema','#64748B'),('platform','youtube','#64748B'),('platform','tiktok','#64748B'),('platform','instagram','#64748B'),('platform','facebook','#64748B'),
('deliverable','master','#64748B'),('deliverable','cut-down-30s','#64748B'),('deliverable','cut-down-15s','#64748B'),('deliverable','social-9x16','#64748B'),('deliverable','subtitles-bm','#64748B'),
('risk','weather','#F97316'),('risk','permit','#F97316'),('risk','talent-availability','#F97316'),('risk','music-clearance','#F97316'),('risk','budget','#F97316'),('risk','scope-creep','#F97316');

-- Malaysia 2026 national holidays: ADMIN TO VERIFY DATES against the official gazette (some are moon-dependent)
-- insert into holidays (holiday_date, name) values (...);
```

---

## Phase 1 — Foundation, auth, layout
```
Build the foundation of "Act2 Flow".

1. Set up the folder structure from the project knowledge. Create src/lib/supabase.ts using VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, and use the generated types in src/types/database.ts.
2. Auth: invite-only email/password sign-in page (no public sign-up), forgot-password flow, session persistence, a ProtectedRoute wrapper, and an AuthProvider exposing { user, profile, role, signOut }. Load the profile row from the profiles table after sign-in.
3. App shell: left navigation rail (Portfolio, My Work, Projects, Calendar, Deliverables, KPIs, Reports, Admin) with lucide icons and active state; top bar with global search input (UI only for now), notification bell with unread count from the notifications table, quick-create "+" menu, user menu with dark-mode toggle and sign out. Hide Admin for non-admin roles; hide Reports for crew and freelancer.
4. Design system: build reusable components in src/components/ui: Button, Input, Select, Textarea, Badge, TagChip (parses "namespace:value" and uses the tag colour), Avatar, AvatarGroup, Card, Tabs, Modal, Drawer, Toast, EmptyState, Skeleton, HealthBadge (green/amber/red with icon + text), ProgressBar, DataTable (sortable), DateRangePicker, ConfirmDialog.
5. Create the routes with placeholder pages: /portfolio, /my-work, /projects, /projects/:id/*, /calendar, /deliverables, /kpis, /reports, /admin.
6. Admin > Users: table of profiles with role dropdown (admin only) and an "Invite user" form (email, full name, role). Note in the UI that invites are sent via the Supabase dashboard for now.

Acceptance: I can sign in, see the shell, toggle dark mode, and the Admin page lists users. Role-based nav visibility works.
```

## Phase 2 — Projects, templates, dynamic specs
```
Build the Projects feature.

1. /projects: list with toggle between table and card view. Columns: code, name, client, type (TagChip), phase, progress %, delivery date with countdown, health badge, producer avatar. Filters: type, status, health, producer, client, tag, date range. Search by name/code.
2. New Project wizard (Modal or full page, 5 steps): (1) choose a project template (cards from project_templates), (2) basics: name, client (select or create inline), producer, start date, delivery date, budget in MYR, description, contracted revision rounds, (3) spec: render fields dynamically from spec_fields for the chosen template using react-hook-form + zod built at runtime (text, textarea, number, date, select, multiselect, boolean, url; honour required), (4) team: add members with a project role, (5) KPIs: preselect the KPIs matching the template's project_type from kpi_definitions with editable targets. On finish, in one flow: generate the code "A2-YYYY-NNN" (next sequence for that year), insert the project, create phases from the template's default_phases, insert project_members and project_kpis, write an activity_log entry.
3. Project workspace at /projects/:id with a header (code, name, client, status select, HealthBadge, producer, delivery countdown, quick actions) and tabs: Overview, Tasks, Timeline, Schedule, Team, Budget, KPIs, Deliverables, Links, Activity. Implement Overview, Team and Activity fully now; show "coming next" EmptyStates for the others.
4. Overview: phase progress strip, next 3 milestones, KPI snapshot cards, budget snapshot (visible only to roles that can see money), latest 10 activity items, and the Spec panel showing spec values as labelled read-only rows with an Edit button.
5. Health: implement a computeHealth(project) utility per these rules: Red if delivery date has passed and status is not delivered/closed, or budget variance over 10%, or 3+ overdue critical tasks, or any KPI red; Amber if delivery within 7 days and more than 20% of tasks open, or budget variance 5-10%, or any KPI amber; else Green. If health_override is set, show it with the reason and an "overridden" marker.
6. Seed the UI with 5 fictional sample projects through a dev-only "Load sample data" button in Admin (one per template type). Use fictional names only.

Acceptance: I can create a TVC project and a Documentary project and see different spec fields, different default KPIs, and correct phases.
```

## Phase 3 — Tasks (list, board, My Work)
```
Build the Tasks feature inside the project workspace and on the My Work page.

1. Tasks tab with a view switcher: List, Board, Calendar. Persist the chosen view per project in localStorage.
2. List view: grouped by phase (collapsible), columns: title, assignees, status, priority, due date, department, tags, subtask progress. Inline edit of status, assignee, due date and priority. Quick-add row at the bottom of each phase.
3. Board view: Kanban by status (Backlog, To Do, In Progress, In Review, Blocked, Done) with @dnd-kit drag and drop, optimistic updates, and a fallback status dropdown on each card for keyboard users. Optional swimlanes by phase or assignee. Cards show title, assignee avatars, due date (red if overdue), priority icon, tag chips and subtask count.
4. Calendar view: month grid of tasks by due date.
5. Task detail Drawer: title, rich-text-lite description (bold, italic, lists, links), status, priority, phase, department, start/due, estimate, assignees (multi-select from project members), tags (namespaced picker grouped by namespace), checklist with progress, links (label + URL), subtasks (add, reorder, complete), dependencies ("blocked by" picker), comments with @mention autocomplete (create a notification for each mention), history from activity_log.
6. Filters toolbar: assignee, status, priority, department, tag, due range, "overdue only", "my tasks". Bulk select with actions: assign, set status, move to phase, add tag.
7. My Work page (/my-work): tasks assigned to me across all projects grouped Overdue, Today, This week, Later, No date. Each row shows the project code chip. One-click complete. Mobile-optimised layout with large tap targets.
8. Notifications: insert a notification when a task is assigned to someone, when mentioned, and a scheduled-style check on page load for tasks due within 24h or overdue (client-side for now). The bell dropdown shows them and can mark read.
9. Mark completed_at when status becomes done; clear it if reopened. Moving a task to done when it has unfinished blocking dependencies should show a warning dialog.

Acceptance: I can plan a project's tasks in list, drag cards on the board, and an assignee sees them on My Work.
```

## Phase 4 — Portfolio dashboard and KPIs
```
Build the Portfolio dashboard and KPI features.

1. /portfolio (leadership home; all roles may open it but see only projects they can access):
   - Stat cards: active projects, at-risk projects (amber+red), deliveries due in 14 days, overdue tasks, crew utilisation this week (booked days / available working days; show "n/a" until bookings exist).
   - Project table with health dot, phase chip, progress bar, delivery countdown, budget used % (only if the role may see money).
   - "Needs attention" panel listing each red/amber project with the plain-language reason(s) from computeHealth.
   - Cross-project timeline: horizontal bars per project from start_date to delivery_date, segmented by phase colours, with milestone diamonds and a "today" line. Zoom: month / quarter. Click a bar to open the project.
   - Filters: type, producer, client, health, date range.
2. KPIs tab in the project workspace: cards per project_kpi showing name, target, current value, unit, RAG status, trend sparkline (Recharts) from kpi_updates, owner and comment. Calculate RAG with a utility: for higher_better, status is green if value >= target, amber if value >= target - amber_threshold, else red; for lower_better, mirror the logic. Provide "Update value" (adds a kpi_updates row and updates current_value), "Edit target", and "Add KPI from library".
3. Auto KPIs: implement the calculators for auto_key values: on_time_tasks (done tasks with completed_at <= due_date / tasks with a due_date that have passed or are done), budget_variance ((sum actual - sum estimate)/sum estimate * 100), schedule_variance (days between planned delivery_date and forecast = max due date of open tasks, minimum 0), revisions_used (max review round number across deliverables), first_pass_approval (deliverables approved at version 1 / approved deliverables). Recalculate on view and cache the value into project_kpis.current_value.
4. /kpis page: portfolio roll-up grid of KPI names x projects with RAG cells, and a summary count of red/amber/green.
5. Admin > KPI Library: CRUD for kpi_definitions with fields from the table.

Acceptance: The dashboard shows correct health for a green, amber and red sample project; two projects display different KPI sets with correct RAG.
```

## Phase 5 — Deliverables and review
```
Build Deliverables and review.

1. Deliverables tab: table of deliverables (name, spec chips for duration/aspect/language/platform, due date, owner, status, latest version). "Add deliverable" supports a quick generator: pick cut-downs x aspect ratios x languages from the project's spec to create many deliverables at once (e.g. "30s - 16:9 - BM").
2. Deliverable detail drawer/page: status stepper (Not started > In progress > Internal review > Client review > Changes requested > Approved > Delivered), version list (V1, V2...) each with review URL (opens in a new tab), notes, uploader and date; "Add new version" auto-increments version_no and sets status to internal_review.
3. Review comments per version: add comment with optional timecode (HH:MM:SS:FF), author, resolved checkbox, filter open/resolved. Show "Review round n of N contracted" and warn in amber at N and red above N.
4. Approvals: producers, exec producers and admins can approve a version; creates an approvals row and sets status to approved; log in activity. Show the approval history.
5. /deliverables page: cross-project board by status with filters, so producers see everything in client review.
6. Notify the deliverable owner and project producer on new review comments and status changes.

Acceptance: I can take a deliverable through V1, changes requested, V2, approved, and see the audit trail and the round count update.
```

## Phase 6 — Resources, bookings, shoot days
```
Build scheduling and resources.

1. /calendar (Resources): week and month views, rows = resources (grouped by type: people, equipment, vehicles, locations, edit suites), columns = days. Bookings render as coloured blocks using a stable colour per project. Weekends and Malaysian public holidays (from the holidays table) are shaded. Filters: resource type, department, project.
2. Create a booking by clicking and dragging across days or via a "Book resource" modal (resource, project, date range, note). The database has an exclusion constraint that prevents overlaps: catch that error and show "Already booked on [project] for these dates" with a link; also pre-check for overlaps in the UI and warn before saving.
3. Person load heat map: a toggle that shades each person-day by number of bookings and assigned tasks due.
4. Resource management (Admin or Producer): create/edit resources with type, category, notes and active flag. Day rates are entered in a separate section visible only to admin and finance (stored in resource_rates).
5. Schedule tab in a project: milestones list with add/complete, shoot days list/calendar. Shoot day form: date, call time, wrap time, location, scenes, notes, weather note, crew called (people bookings for that date), equipment list. Add a clean printable Call Sheet view (print stylesheet, project and shoot-day header, call times, location, crew table by department, notes) with a "Print / Save as PDF" button.
6. Timeline tab: Gantt with phases as grouped rows and tasks as bars (start_date to due_date), milestone diamonds, today line, dependency arrows (SVG) for task_dependencies, zoom day/week/month. First version is read-only with click-to-open task drawer; then add drag to move and resize bar ends that update dates, with a warning when a dependency would be violated.

Acceptance: Double-booking the same camera is blocked with a clear message; a call sheet prints correctly; the Gantt shows dependencies.
```

## Phase 7 — Budget, reports, hardening
```
Build budget, reports and hardening.

1. Budget tab (visible only to admin, exec_producer, finance, and the project's producer): table of budget_lines by category with estimate, committed, actual and variance (amount and %); totals; donut chart of spend by category; bar chart estimate vs actual; "forecast at completion" = actual + remaining committed. Add/edit/delete lines. CSV export.
2. Reports (leadership, producers, finance): Project status report (print-friendly page: summary, phase progress, KPIs with RAG, risks tagged "risk:", budget summary if permitted, next milestones), Weekly portfolio report, Utilisation report (bookings and time_entries by person), Budget variance report. Every table has CSV export.
3. Time tracking: start/stop timer and manual hours on tasks, feeding the utilisation report. People can see only their own time; leadership sees all.
4. Global search: Cmd/Ctrl+K palette searching projects, tasks, people, deliverables the user can access.
5. Hardening pass: audit every query so that crew and freelancers cannot receive budget_total, budget_lines, resource_rates; move projects.budget_total into a restricted project_financials table with its own RLS and update the UI; add error boundaries; add a PDPA page in Admin with "Export my data" (JSON) and an admin "Anonymise user" action; add a Privacy notice link in the footer. Write a short ARCHITECTURE.md and a USER_GUIDE.md.
6. Final QA: check keyboard navigation, 375px layouts for My Work, task drawer, call sheet and notifications, and remove all console errors.

Acceptance: A freelancer test account sees only their projects and never any money fields; reports export correctly.
```

---

## Role test script (run before go-live)
Create one test user per role and confirm:

| Test | Expected |
|---|---|
| Freelancer opens a project they are not on | Not visible in list, direct URL shows "Not found" |
| Crew opens Budget tab | Tab hidden; direct URL blocked; API returns zero rows |
| Dept lead edits a task in their project | Allowed |
| Crew edits a task not assigned to them | Blocked |
| Producer opens another producer's budget | Blocked |
| Finance edits budget_lines | Allowed |
| Anyone books an already-booked camera | Rejected with a clear message |
| Non-admin changes a role | Blocked |

## Optional: one-shot "master prompt" (if you prefer to start with a single message)
```
Using the Project Knowledge and the existing Supabase schema, scaffold Act2 Flow: auth + app shell + design system (Phase 1) and the Projects feature with the template-driven wizard and dynamic spec forms (Phase 2). Stop there. Do not build tasks, KPIs, deliverables, resources or budget yet. After you finish, list what you built and which files you created.
```
