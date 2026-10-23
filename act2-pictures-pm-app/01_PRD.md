# Act2 Flow — Project Management Platform for Act2 Pictures
**Product Requirements Document (PRD) v1.0**
Prepared for: Act2 Pictures (Malaysia) · Build target: bolt.new (React + Supabase)
Author: Caroline Ang · Date: 23 October 2026

---

## 0. Executive Summary

Act2 Pictures runs several productions in parallel — commercials, corporate films, documentaries, series and social content — each with its own crew, timeline, budget, deliverable specification and KPIs. Generic tools (Trello, Asana, spreadsheets) force every project into the same shape, so producers lose visibility of cross-project crew clashes, budget drift and delivery risk.

**Act2 Flow** is a production-native project platform with one organising idea:

> **One portfolio, many project "shapes".** Every project shares a common spine (phases → tasks → deliverables → KPIs), but each project type carries its own spec template, KPI template and phase template.

**MVP outcomes (first 90 days of use)**
1. Leadership sees every project's health (on-time, on-budget, at-risk) on one screen.
2. Producers plan and track work through the six production phases, with custom specs per project.
3. Crew see only "my work this week" across all projects, and no one is double-booked.
4. Each project tracks its own KPIs against targets, with RAG status.
5. Deliverables move through versioned internal and client review with an audit trail.

**Success metrics for the product itself:** ≥ 90% of active projects live in Act2 Flow within 60 days; weekly active use by ≥ 80% of staff; a 30% reduction in "where are we on X?" status messages (measured by producer survey); zero crew double-bookings that are not flagged.

---

## 1. Context and Assumptions

| Item | Assumption (confirm or correct) |
|---|---|
| Company | Act2 Pictures, Malaysian video/film production house |
| Team size | 10–40 staff plus 20–100 freelancers; 5–15 concurrent projects |
| Currency / locale | MYR default; dates DD/MM/YYYY; timezone Asia/Kuala_Lumpur (UTC+8); English UI (Bahasa Melayu labels in Phase 2) |
| Languages in content | Projects may be delivered in BM, English, Mandarin, Tamil — tracked as a deliverable spec field |
| Clients | Brands, agencies, GLCs, broadcasters, streamers — external client access is **Phase 2** |
| Media files | **Not stored in-app.** Large media stays in existing storage (Google Drive, Dropbox, Frame.io, Vimeo, NAS). Act2 Flow stores links and metadata only. |
| Build tool | bolt.new (Vite + React + TypeScript + Tailwind) with Supabase (Postgres, Auth, RLS, Realtime) |
| Compliance | Malaysia PDPA 2010: store the minimum personal data on crew; no IC/passport numbers; role-based access; export and delete on request |

---

## 2. Users and Roles

### 2.1 Personas
| Persona | Needs | Pain today |
|---|---|---|
| **Executive Producer / Owner** (Aisha) | Portfolio health, margin, risk, pipeline | Learns about problems late; chases status |
| **Producer / Project Manager** (Daniel) | Plan, assign, budget, client comms | Spreadsheets per project; crew clashes |
| **Department Lead** (Director, DOP, Editor lead, Post supervisor) | Own department's tasks and capacity | Unclear priorities across projects |
| **Crew / Team Member** (Mei Ling, editor) | What do I do today and what's next | Instructions scattered over WhatsApp |
| **Freelancer** | See only the jobs they are booked on | Over-exposure or no access |
| **Finance / Admin** | Budget vs actual, invoicing milestones | Manual reconciliation |
| **Client** (Phase 2) | Review, approve, see milestones | Email chains of feedback |

### 2.2 Role–Permission Matrix
Legend: C create · R read · U update · D delete · A approve · — none · own = own records only · proj = projects they belong to

| Capability | Admin | Exec Producer | Producer | Dept Lead | Crew | Freelancer | Finance |
|---|---|---|---|---|---|---|---|
| Users and roles | CRUD | R | R | R | — | — | R |
| All projects (portfolio) | CRUD | CRUD | proj | proj | proj | proj | R |
| Create project | ✔ | ✔ | ✔ | — | — | — | — |
| Project spec and KPIs | CRUD | CRUD | CRUD (proj) | R | R | R | R |
| Tasks | CRUD | CRUD | CRUD (proj) | CRUD (dept) | U (own) | U (own) | R |
| Budget and costs | CRUD | CRUD | CRUD (proj) | — | — | — | CRUD |
| Crew rates (sensitive) | CRUD | R | R | — | — | — | CRUD |
| Resources and bookings | CRUD | CRUD | CRUD | R | R (own) | R (own) | R |
| Deliverables and reviews | CRUD | CRUD | CRUD (proj) | C/R | C/R | C/R | R |
| Final approval of deliverable | ✔ | ✔ | ✔ | — | — | — | — |
| Activity log | R | R | R (proj) | — | — | — | R |

Rules: RLS enforces all of the above in the database, not just in the UI. Freelancers see only projects where they are a member and never see budget or rates.

---

## 3. Product Architecture (the C³-style system view)

```
PORTFOLIO (company)
 └── PROJECT (type-templated)
      ├── SPEC (typed fields from Spec Template)
      ├── PHASES (Development → Pre-pro → Production → Post → Delivery → Wrap)
      │    └── TASKS (subtasks, dependencies, tags, assignees)
      ├── SCHEDULE (milestones, shoot days, Gantt)
      ├── TEAM and RESOURCES (people, equipment, locations, bookings)
      ├── BUDGET (lines, estimates, actuals, variance)
      ├── KPIs (from KPI Template, targets, actuals, RAG)
      ├── DELIVERABLES (versions, review rounds, approvals)
      └── ACTIVITY (audit trail, comments, notifications)
```

**Design principle: templates over customisation.** Admins maintain *Project Templates* (phases + spec fields + KPI set + default tasks). Producers choose a template at creation and then tweak per project. This is how "different projects, different KPIs, different specs" is solved without chaos.

---

## 4. Functional Requirements

Priority: **P0** = MVP · **P1** = Release 2 · **P2** = later.

### 4.1 Authentication and Organisation
- FR-1 (P0) Email/password sign-in; invite-only (no public sign-up). Admin invites by email and assigns role.
- FR-2 (P0) Profile: name, avatar, role title, department, phone (optional), employment type (staff/freelancer), skills tags.
- FR-3 (P0) Session persistence, password reset, sign-out.
- FR-4 (P1) Google sign-in. SSO is P2.

### 4.2 Portfolio Dashboard (home for leadership)
- FR-5 (P0) Project cards/table: name, client, type, phase, progress %, delivery date, budget used %, health (Green/Amber/Red), producer.
- FR-6 (P0) Filters: type, phase, health, producer, client, tag, date range. Saved views (P1).
- FR-7 (P0) KPI strip: active projects, at-risk projects, deliveries due in 14 days, overdue tasks, crew utilisation this week.
- FR-8 (P0) **Cross-project timeline**: horizontal bars per project with phase segments and milestones.
- FR-9 (P1) Pipeline view for upcoming/proposed projects (status: Lead → Proposal → Confirmed).
- FR-10 (P1) Revenue and margin summary (requires Finance role data).

**Health rule (auto, overridable with reason):**
Red if any of: delivery date in past and not delivered; budget variance > 10% over; ≥ 3 overdue critical tasks; any KPI Red.
Amber if any of: delivery within 7 days with open tasks > 20%; budget variance 5–10%; any KPI Amber.
Otherwise Green.

### 4.3 Projects
- FR-11 (P0) Create project from template: name, code (auto `A2-2026-014`), client, type, producer, start, delivery date, budget (MYR), description, tags.
- FR-12 (P0) **Dynamic Spec panel** from the template, e.g. Commercial: duration cuts (60s/30s/15s/6s), aspect ratios, platforms, languages, talent usage rights period, music licensing; Documentary: runtime, episodes, archive material list, interview subjects, broadcaster spec; Event: venue, coverage hours, live/recorded, turnaround SLA. Stored as JSON, validated by field definitions.
- FR-13 (P0) Project statuses: Proposal, Confirmed, Active, On Hold, Delivered, Closed, Cancelled.
- FR-14 (P0) Project members with project-level role (Producer, Director, DOP, Editor, etc.).
- FR-15 (P0) Project overview tab: summary, phase progress, next milestones, KPI snapshot, budget snapshot, latest activity.
- FR-16 (P1) Duplicate project; save as template.
- FR-17 (P1) Project archive and read-only closed state with a wrap-up checklist (hard drive backup, music cue sheet, final invoice).

### 4.4 Phases and Tasks
- FR-18 (P0) Default phases from the template: Development, Pre-production, Production, Post-production, Delivery, Wrap. Phases can be renamed, reordered, hidden, and have planned start/end.
- FR-19 (P0) Task fields: title, description (rich text lite), phase, assignee(s), start, due, estimate (hours), priority (Low/Med/High/Critical), status (Backlog, To Do, In Progress, In Review, Blocked, Done), tags, checklist, attachments (links), parent task (subtasks), department.
- FR-20 (P0) Views: **List**, **Kanban board** (by status, drag-and-drop), **Gantt/Timeline** (by phase), **Calendar**.
- FR-21 (P0) Task dependencies (finish-to-start); the Gantt shows linking arrows; moving a predecessor shows a warning and optional cascade (P1 cascade).
- FR-22 (P0) Comments with @mentions; mentions trigger in-app notifications.
- FR-23 (P0) "My Work" page: all my tasks across projects, grouped Today / This week / Later / Overdue.
- FR-24 (P0) Bulk actions: assign, change status, move phase, add tag.
- FR-25 (P1) Task templates per phase (e.g. "Pre-pro checklist: recce, permits, call sheet, insurance, wardrobe").
- FR-26 (P1) Recurring tasks (e.g. weekly progress report).
- FR-27 (P1) Time tracking per task (start/stop and manual) feeding utilisation.

### 4.5 Scheduling, Shoot Days and Resources
- FR-28 (P0) **Milestones** (Treatment approved, Script lock, Shoot start, Rough cut, Fine cut, Colour/Sound, Final delivery) with date and status.
- FR-29 (P0) **Shoot days**: date, call time, wrap time, location(s), scenes/shot list notes, crew called, weather note, status. Printable **call sheet** view (P1 PDF export).
- FR-30 (P0) **Resources** library: people, equipment (cameras, lenses, lights, audio, drones, gimbals), vehicles, locations/studios, edit suites. Each has type, category, availability, daily rate (visible to Finance/Producer only).
- FR-31 (P0) **Bookings**: assign resource to project for a date range or shoot day. **Conflict detection** blocks or warns on overlap with another booking.
- FR-32 (P0) Resource calendar (week/month) with a person-by-day heat map showing load.
- FR-33 (P1) Availability: leave, holiday (Malaysian public holidays + state holidays configurable), freelancer unavailable dates.
- FR-34 (P1) Equipment check-out/check-in log and condition notes.

### 4.6 KPIs (per-project, template-driven)
- FR-35 (P0) **KPI Template** library maintained by Admin. A KPI definition has: name, description, unit (%, MYR, count, days, score), direction (higher/lower is better), calculation (manual or auto), default target, Amber/Red thresholds, applicable project types.
- FR-36 (P0) Each project selects KPIs from its template and may override targets. KPI instance fields: target, current value, history, owner, RAG status, comment.
- FR-37 (P0) Auto-calculated KPIs: on-time task completion %, budget variance %, schedule variance (days), revision rounds used vs contracted, deliverables approved first time %.
- FR-38 (P0) Manual KPIs with update history (e.g. audience reach, broadcaster QC pass, client NPS, social views at 30 days).
- FR-39 (P0) KPI dashboard per project and a portfolio roll-up (count of Red/Amber/Green KPIs).
- FR-40 (P1) Trend sparkline and snapshot at each milestone.
- FR-41 (P1) Person-level contribution (tasks completed, utilisation), **visible to the person and their manager only**, not as a leaderboard.

**Starter KPI library by project type**

| Project type | Example KPIs |
|---|---|
| Commercial / TVC | First-cut on time; revision rounds ≤ contract; budget variance ≤ 5%; broadcast QC pass; delivered cut-downs 100% |
| Corporate / Branded film | On-time delivery; client satisfaction ≥ 4/5; revisions ≤ 2; gross margin ≥ target |
| Documentary / Series | Episodes delivered vs plan; archive clearance %; shoot days used vs plan; broadcaster QC pass |
| Social / Content retainer | Videos delivered/month; turnaround ≤ 3 days; engagement rate; 30-day views |
| Event coverage | Same-day highlights delivered; coverage completeness; crew utilisation |
| Music video / Short film | Festival submissions; budget variance; post turnaround days |

### 4.7 Deliverables and Review
- FR-42 (P0) Deliverable list per project from the spec (e.g. "30s TVC — 16:9 — BM"). Fields: name, format spec, due date, owner, status (Not started, In progress, Internal review, Client review, Changes requested, Approved, Delivered).
- FR-43 (P0) **Versions**: V1, V2, V3 with link (Frame.io/Vimeo/Drive), notes, uploaded by, date. Latest version flagged.
- FR-44 (P0) **Review rounds**: each round has comments with optional timecode, author, status (Open/Resolved). Count of rounds is tracked against the contract.
- FR-45 (P0) Approval action by authorised roles, logged with timestamp and name.
- FR-46 (P1) Client review portal (magic-link, view-only plus comment and approve).
- FR-47 (P2) Deliverable QC checklist (loudness, safe areas, captions/subtitles, slate).

### 4.8 Budget and Costs
- FR-48 (P0) Budget lines by category: Pre-production, Crew, Talent, Equipment, Locations, Post, Music and licensing, Travel, Contingency, Overheads. Each has estimate, committed, actual, and variance.
- FR-49 (P0) Budget summary: total, spent, remaining, % used, forecast at completion.
- FR-50 (P0) Visible only to Admin, Exec Producer, Producer (own projects), Finance.
- FR-51 (P1) Invoice milestones (e.g. 50% on confirmation, 50% on delivery) with status; link to the external accounting system by reference number only.
- FR-52 (P2) Accounting integration.

### 4.9 Collaboration and Notifications
- FR-53 (P0) Project activity feed (who changed what, when).
- FR-54 (P0) In-app notifications: assigned, mentioned, due soon (24h), overdue, status changed on my task, review comment added, booking conflict.
- FR-55 (P1) Email digest (daily) and WhatsApp-friendly "share update" text generator (copy to clipboard).
- FR-56 (P1) Slack/Teams/Google Calendar sync (P2 for Calendar write).

### 4.10 Search, Tags and Reporting
- FR-57 (P0) Global search (projects, tasks, people, deliverables).
- FR-58 (P0) Tag system with namespaces (see §5).
- FR-59 (P1) Reports: project status report (PDF), weekly portfolio report, utilisation report, budget variance. CSV export for all tables.

### 4.11 Admin
- FR-60 (P0) Manage users, roles, departments.
- FR-61 (P0) Manage project templates, spec field definitions, KPI library, tag library, phase defaults, holiday calendar.
- FR-62 (P1) Data export and PDPA delete/anonymise.

---

## 5. Tag Taxonomy

Tags are **namespaced** (`namespace:value`) so that they filter reliably. Namespaces marked *fixed* are enumerations the app controls; *open* namespaces can be extended by Producers.

| Namespace | Type | Values (starter set) | Used on |
|---|---|---|---|
| `type:` | fixed | tvc, corporate, documentary, series, social, event, music-video, short-film, feature, animation | Project |
| `phase:` | fixed | development, pre-production, production, post-production, delivery, wrap | Task (auto from phase) |
| `dept:` | fixed | producing, directing, camera, lighting, sound, art, wardrobe-makeup, edit, colour, vfx-motion, audio-post, accounts, bizdev | Task, Resource, Person |
| `priority:` | fixed | low, medium, high, critical | Task |
| `status-flag:` | fixed | blocked, waiting-client, waiting-talent, needs-approval, at-risk | Task, Deliverable |
| `deliverable:` | open | master, cut-down-30s, cut-down-15s, social-9x16, social-1x1, trailer, bts, subtitles-bm, subtitles-en, subtitles-zh, broadcast-master | Deliverable |
| `platform:` | open | tv, cinema, youtube, tiktok, instagram, facebook, linkedin, ott, internal, event-screen | Deliverable, Project |
| `lang:` | open | bm, en, zh, ta, multi | Deliverable |
| `client-type:` | open | brand, agency, glc, government, broadcaster, ngo, sme | Client, Project |
| `location:` | open | klang-valley, penang, johor, sabah, sarawak, overseas, studio, remote | Shoot day, Project |
| `risk:` | open | weather, permit, talent-availability, music-clearance, budget, scope-creep, tech | Task, Project |
| `skill:` | open | steadicam, drone-licensed, colourist, motion-graphics, sound-mixer, vo-bm, vo-en, makeup, gaffer | Person |
| `release:` | open | v1, v2, final | Deliverable |

**Colour system for tags and status** (Tailwind tokens): Green `emerald-500`, Amber `amber-500`, Red `rose-500`, Blue (info) `sky-500`, Neutral `slate-400`. Never rely on colour alone: pair it with an icon or label.

---

## 6. Information Architecture and Key Screens

**Global navigation (left rail):** Portfolio · My Work · Projects · Calendar (Resources) · Deliverables · KPIs · Reports · Admin. Top bar: global search, notifications, quick create (+), profile.

| # | Screen | Purpose | Key components |
|---|---|---|---|
| S1 | Sign-in / Accept invite | Access | Email, password, forgot password |
| S2 | Portfolio dashboard | Leadership overview | KPI strip, project table/cards, health badges, cross-project timeline, risk list |
| S3 | My Work | Personal task hub | Today/Week/Overdue groups, quick status change, time log |
| S4 | Projects list | Browse and filter | Filters, tag chips, saved views, "New project" |
| S5 | New project wizard | Template-driven creation | Step 1 template, Step 2 basics, Step 3 spec fields, Step 4 team, Step 5 KPIs |
| S6 | Project workspace | Home of one project | Tabs: Overview · Tasks · Timeline · Schedule · Team · Budget · KPIs · Deliverables · Files and links · Activity |
| S7 | Task detail drawer | Edit a task | Fields, subtasks, dependencies, comments, history |
| S8 | Resource calendar | Crew and equipment | Person/resource rows × days, bookings, conflicts |
| S9 | Shoot day / call sheet | Production day planning | Times, locations, crew called, scenes, notes, print view |
| S10 | Deliverable detail | Review | Versions, comment thread with timecode, approve |
| S11 | KPI dashboard | Performance | Cards per KPI with RAG, trend, edit target |
| S12 | Admin | Configuration | Users, templates, KPI library, tags, holidays |
| S13 | Client portal (P1) | External review | Deliverables, comment, approve |

### 6.1 Wireframe notes (text)
- **Portfolio dashboard:** top row of five stat cards; below, left 2/3 project table with health dot, phase chip, progress bar, delivery countdown; right 1/3 "Needs attention" list (red/amber items with reason). Below that, a full-width timeline.
- **Project workspace header:** project code + name, client, status chip, health badge, producer avatar, delivery date countdown, quick actions (Add task, Add shoot day, Share update).
- **Kanban:** columns by status, swimlanes optional by phase or assignee; cards show title, assignee avatar, due date, priority icon, tag chips, subtask progress.
- **Resource calendar:** rows = people/equipment, columns = days; coloured blocks per project (consistent project colour), red outline where double-booked.

### 6.2 Visual direction
Cinematic but calm: dark-mode capable, near-black slate base with a warm accent (amber/gold, nodding to "Act 2"), generous spacing, strong typography (Inter for UI; a display face such as "Sora" for headings), 8-pt spacing grid, 12px rounded cards, subtle borders rather than heavy shadows. Light mode default for office use; dark mode toggle. Accessible contrast (WCAG AA).

---

## 7. Data Model (summary; full SQL in the prompt pack)

Core entities: `profiles`, `clients`, `project_templates`, `spec_fields`, `projects`, `project_members`, `phases`, `tasks`, `task_dependencies`, `task_comments`, `tags`, `entity_tags`, `milestones`, `shoot_days`, `resources`, `bookings`, `kpi_definitions`, `project_kpis`, `kpi_updates`, `deliverables`, `deliverable_versions`, `review_comments`, `budget_lines`, `time_entries`, `activity_log`, `notifications`, `holidays`.

Key relationships
- `projects` 1—N `phases` 1—N `tasks`; `tasks` self-reference for subtasks; `task_dependencies` is N—N on tasks.
- `projects` N—N `profiles` via `project_members` (carries project role).
- `projects` 1—N `project_kpis`, each referencing a `kpi_definitions` row; `kpi_updates` stores history.
- `deliverables` 1—N `deliverable_versions` 1—N `review_comments`.
- `bookings` link `resources` (person or equipment) to `projects` with a date range; an exclusion rule prevents overlaps per resource.
- `entity_tags` is polymorphic (`entity_type`, `entity_id`, `tag_id`).
- Spec data: `projects.spec` is `jsonb`, validated against `spec_fields` for the project's template.

---

## 8. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Dashboard loads < 2s for 20 projects / 5,000 tasks on broadband; list views paginated or virtualised |
| Availability | Managed Supabase + static hosting; target 99.5%; daily DB backups |
| Security | Supabase Auth; RLS on every table; no service-role key in the client; sensitive fields (rates, budget) isolated in separate tables with stricter policies; audit log immutable |
| Privacy (PDPA) | Collect minimum data; consent note on invite; export and delete workflow; no IC numbers; Malaysian data-residency preference noted (choose nearest region, e.g. Singapore) |
| Accessibility | WCAG 2.1 AA; keyboard navigable Kanban alternatives (status dropdown) |
| Responsive | Desktop-first; mobile-friendly for My Work, task update, call sheet view and notifications |
| Browser | Latest Chrome, Edge, Safari, Firefox |
| Localisation | English now; i18n-ready strings; MYR formatting; DD/MM/YYYY; MY public holidays |
| Observability | Error boundary, toast on failures, activity log for user-visible changes |
| Maintainability | TypeScript strict, feature-folder structure, zod schemas, generated DB types |

---

## 9. Tech Stack (for bolt.new)

| Layer | Choice | Reason |
|---|---|---|
| Framework | React 18 + Vite + TypeScript | Native to bolt.new |
| Styling | Tailwind CSS + shadcn-style components, lucide-react icons | Fast, consistent |
| Routing | react-router-dom v6 | Standard |
| Data fetching | TanStack Query + supabase-js | Caching, optimistic updates |
| Forms | react-hook-form + zod | Dynamic spec forms with validation |
| Drag-and-drop | @dnd-kit | Kanban |
| Timeline / Gantt | Custom SVG/CSS Gantt (simple bars, dependency lines) to avoid licence-restricted libraries | Control and no cost |
| Charts | Recharts | KPI and budget charts |
| Dates | date-fns (+ date-fns-tz) | Asia/Kuala_Lumpur handling |
| Backend | Supabase: Postgres, Auth, RLS, Realtime, Storage (avatars only), Edge Functions (digest emails, P1) | Single backend |
| Hosting | bolt.new deploy (Netlify) or Vercel/Cloudflare Pages | Easy |
| Email (P1) | Resend or Supabase SMTP | Notifications |

---

## 10. Release Plan

| Release | Scope | Indicative effort in bolt.new |
|---|---|---|
| **R0 Foundation** | Auth, invite flow, roles, layout, design system, schema + RLS, seed data | 1–2 days |
| **R1 MVP** | Projects + templates + dynamic specs, phases/tasks (list, board), My Work, portfolio dashboard, tags, KPIs (manual + auto), deliverables + versions + review, activity, notifications | 2–3 weeks |
| **R2** | Gantt with dependencies, resource calendar + conflicts, shoot days + call sheet PDF, budget, time tracking, reports | 3–4 weeks |
| **R3** | Client portal, email digests, calendar sync, invoice milestones, templates marketplace, BM localisation | 4+ weeks |

**Go-live plan:** pilot with 2 live projects and 5 users (2 weeks) → feedback sprint → company-wide rollout with a 45-minute training and a one-page "How we use Act2 Flow" guide.

---

## 11. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Low adoption (people stay on WhatsApp/Sheets) | High | "My Work" as daily entry point; share-update text generator; pilot champions; import tasks from CSV |
| Scope creep from bespoke project needs | Med | Template + spec-field system instead of custom code per project |
| Bolt.new code drift as app grows | Med | Prompt in small phases; lock key files; commit to GitHub after each phase; keep a `ARCHITECTURE.md` |
| RLS mistakes expose budget/rates | High | Separate sensitive tables; policy tests per role; review policies before launch |
| Gantt complexity | Med | Ship list/board first; Gantt read-only first, drag-resize second |
| Double-booking logic edge cases | Med | DB-level exclusion constraint plus UI warning |
| PDPA exposure from crew data | Med | Minimal fields; consent; deletion workflow; privacy note |
| Vendor limits (bolt tokens, Supabase free tier) | Low | Plan for Supabase Pro at go-live |

---

## 12. Acceptance Criteria (MVP exit checklist)

1. Admin can invite a user and assign a role; invited user can only access permitted data (verified for all seven roles).
2. Producer creates a "TVC" project from a template; spec form shows TVC-specific fields; creating a "Documentary" shows different fields.
3. Two projects have different KPI sets and targets; each KPI shows RAG correctly against thresholds.
4. Tasks can be created, assigned, moved across Kanban columns, filtered by tag, and appear in the assignee's My Work page.
5. Portfolio dashboard shows correct health for seeded Green, Amber and Red projects.
6. Deliverable moves through V1 → changes requested → V2 → approved, with the audit trail.
7. Freelancer cannot see budget, rates, or projects they are not on.
8. App works at 375px width for My Work and notifications.
9. No console errors in the main flows; all forms validate.

---

## 13. Open Questions for Act2 Pictures (do not block the build)
1. Which media tools are already in use (Frame.io, Vimeo, Google Drive, Dropbox)? Links will be tailored to these.
2. Do producers need client-visible budgets, or is budget strictly internal?
3. Is crew day-rate data held in this app, or only in accounting?
4. Which project types account for most revenue? We will tune the first templates to them.
5. Is Bahasa Melayu UI needed at launch?
