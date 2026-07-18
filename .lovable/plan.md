
# Admissions & Enrollment Rebuild Plan

This is a large, multi-phase rebuild. I'll break it into shippable phases so you can review each one before we move on. Nothing below is destructive to existing learner/teacher/parent data — we only extend the workflow around them.

---

## Phase 1 — Data model & schema (migration)

Extend `admission_applications` and add supporting tables.

**`admission_applications` — add columns**
- `application_type` (`learner` | `staff`)
- `application_number` (auto: `APP-YYYY-000001`, unique per school)
- `stage` (`pending`, `under_review`, `interview_scheduled`, `entrance_exam`, `waiting_list`, `accepted`, `rejected`, `cancelled`, `enrolled`)
- `source` (`internal` | `online`)
- `parent_national_id`, `parent_relationship`
- `documents` (jsonb — uploaded file refs)
- `medical_info` (jsonb), `emergency_contacts` (jsonb)
- `photo_url`
- `interview_at`, `exam_score`, `reviewer_id`, `reviewed_at`
- `created_learner_id`, `created_teacher_id`, `created_parent_id` (populated on approval)

**New tables**
- `staff_applications_ext` OR reuse `admission_applications` with `application_type='staff'` and a `staff_details` jsonb (position, qualifications, subjects, experience_years, expected_salary).
- `application_status_history` — every stage change with actor + reason.
- `application_documents` — file metadata linked to storage bucket `admission-documents` (private).

**School settings additions** (`school_settings`)
- `admissions_mode` (`internal_only` | `internal_and_online`)
- `auto_create_parent_login` (bool)
- `auto_create_learner_login` (bool)
- `auto_create_teacher_login` (bool)
- `next_admission_number_seq`, `next_employee_number_seq`

**Storage**
- New private bucket `admission-documents` with RLS: school staff read/write own school; public insert allowed via edge function only.

**RLS**
- All new tables scoped by `school_id`. Public online submissions go through an edge function using service role — no direct anon inserts.

---

## Phase 2 — Approval engine (Postgres function + edge function)

Single SECURITY DEFINER function `public.approve_admission_application(app_id uuid)`:

1. Load application, verify caller is admin/head_teacher/principal of same school.
2. Duplicate check on national_id / phone / email / admission_no.
3. If `application_type = 'learner'`:
   - Detect school_level → create `profiles` row (student role) + `students` row.
   - Generate admission number (`ADM-YYYY-NNNN`).
   - Enroll in class (`student_enrollments`) with current academic year/term.
   - Create/link `parents` + `parent_student_relationships`.
   - Insert `student_medical_info`, `student_emergency_contacts` if provided.
4. If `application_type = 'staff'`:
   - Create `profiles` (teacher role) + `teachers` row + employee_number.
5. Optionally trigger login creation via edge function `create-user-from-application` (uses service role, honors `auto_create_*_login` settings).
6. Set `stage = 'enrolled'`, write history row + notifications.
7. Return created IDs.

**Reject / other transitions**: separate lightweight function `public.transition_application(app_id, new_stage, reason)`.

**Edge functions**
- `submit-public-application` — anon-callable, validates + inserts application, uploads docs.
- `check-application-status` — anon-callable, looks up by app number or phone.
- `create-user-from-application` — auth-only, provisions supabase auth accounts per settings.

---

## Phase 3 — Admissions UI rebuild

Replace current `src/pages/admin/Admissions.tsx` with tabbed layout:

**Tabs**
1. **Learner / Student Admissions**
   - Sub-tabs: All | Pending | Under Review | Interview | Waiting List | Accepted | Rejected | Enrolled
   - Table with app #, name, class, source (internal/online), stage, actions.
   - Row actions: View, Approve, Reject, Move to stage, Schedule interview.
   - "New Application" dialog — full form (learner + parent + documents + medical + emergency).
2. **Staff Recruitment**
   - Same pattern with staff-specific fields (position, subjects, qualifications, CV upload).
   - Approve button label: "Hire".

**Detail drawer**: full applicant profile, documents preview, status history timeline, comments.

**Settings panel** (in Admin Settings): admissions mode toggle + login auto-create toggles.

---

## Phase 4 — Public application portal

Two new public routes (no auth):
- `/apply` — school picker (multi-school) OR resolved via subdomain.
- `/apply/:schoolSlug` — learner application form.
- `/apply/:schoolSlug/status` — status lookup by app # or phone.

Only visible when school's `admissions_mode = 'internal_and_online'`. Uses `submit-public-application` edge function.

---

## Phase 5 — User Management cleanup

`src/pages/admin/UserManagement.tsx`:
- Remove `teacher`, `student`, `parent` from the create-user role dropdown.
- Keep: admin, head_teacher, principal, bursar, librarian, accountant, it_officer, receptionist.
- Add banner: "To add teachers, learners, students or parents, use Admissions or the relevant Management page."
- Keep reset password / activate / deactivate / role assignment for admin roles only.

Management pages (`TeacherManagement`, `StudentManagement`, `ParentManagement`) keep their existing Add buttons — those now reuse the same provisioning helper the approval engine uses, so manual adds also auto-create fees/attendance/library profiles.

---

## Phase 6 — Notifications & audit

- Insert `notifications` on submit / approve / reject / interview scheduled (in-app; email via existing gateway later).
- Reuse `activity_log` + `application_status_history` for audit trail.

---

## Delivery order (each phase = one review cycle)

1. **Phase 1 migration** (schema + storage + RLS) — you approve the migration.
2. **Phase 2 approval engine** — DB functions + edge functions.
3. **Phase 3 Admissions UI** — new tabbed page + forms.
4. **Phase 4 public portal** — `/apply` routes.
5. **Phase 5 User Management cleanup** + management-page provisioning helper.
6. **Phase 6 notifications + audit polish.**

Future features you listed (hostel, transport, entrance exam scoring, bulk import, digital admission letters, SMS) are out of scope for this rebuild but the schema is designed to accept them without breaking changes.

---

## Confirm before I start

- OK to proceed **phase by phase** in this order? (Recommended — each phase is independently reviewable.)
- Any phase you want to skip or reprioritize (e.g. skip the public portal for now)?
- For **login auto-creation defaults**: parents ON, learners OFF, teachers ON — acceptable? Or all OFF by default and admin opts in?
