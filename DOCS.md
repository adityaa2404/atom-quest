# AtomQuest Goal Portal — Documentation

## What is this?

A web app for managing employee goals and performance across an organization. Three types of users — employees, managers, and HR admins — each have their own dashboard and set of actions.

---

## How it works

### The basic flow

1. **Admin sets up a cycle** — e.g. "FY 2025-26" with goal-setting dates and quarterly windows
2. **Employee creates a goal sheet** — adds up to 8 goals with targets and weightages (must total 100%)
3. **Employee submits** — sheet goes to their manager for review
4. **Manager reviews** — can approve, return with feedback, or edit targets inline
5. **Once approved** — goals are locked. Employee logs actual achievements each quarter
6. **Manager does a check-in** — reviews progress and writes structured feedback
7. **Admin monitors everything** — sees completion stats, audit logs, escalations

---

## The three roles

### Employee
- Creates and edits their own goal sheet
- Submits for approval
- Logs quarterly achievements (Q1, Q2, Q3, Q4)
- Sees their computed score after each entry

### Manager
- Sees all direct reports and their goal sheet statuses
- Reviews and approves or returns sheets
- Can edit targets/weightages on submitted sheets (every edit is logged)
- Does quarterly check-ins with comments
- Views team achievement progress and scores

### Admin / HR
- Creates performance cycles with date windows
- Manages thrust areas (categories goals fall under)
- Sees all goal sheets across the org, can unlock any locked sheet
- Pushes shared goals to multiple employees at once
- Runs escalation checks — finds employees who are overdue on submissions, approvals, or check-ins
- Views full audit trail of every change made
- Downloads an Excel report of all achievements

---

## Goal types (UoM)

Goals have 6 measurement types. The system computes a score automatically when an employee enters their actual:

| Type | Meaning | Score logic |
|---|---|---|
| Numeric — Higher is better | e.g. Revenue, clients onboarded | Actual ÷ Target × 100 |
| Numeric — Lower is better | e.g. Response time, defects | Target ÷ Actual × 100 |
| Percentage — Higher is better | e.g. Test coverage, satisfaction % | Actual ÷ Target × 100 |
| Percentage — Lower is better | e.g. Churn rate, error rate | Target ÷ Actual × 100 |
| Timeline | Complete by a date | On or before deadline = 100%, late = 0% |
| Zero-based | Zero incidents/errors = success | Actual = 0 → 100%, anything else → 0% |

All scores are capped at 100%. The overall goal sheet score is the weighted average across all goals.

---

## Escalations

Admin configures rules like:
- "If goal sheet not submitted within 14 days of cycle start → escalate"
- "If sheet not approved within 7 days of submission → escalate"
- "If quarterly check-in not done → escalate"

Escalations start at Level 1 (notify employee), progress to Level 2 (notify manager), then Level 3 (notify HR) based on configured day thresholds. Admin clicks "Run Check Now" to trigger a check — escalations appear instantly and can be resolved or dismissed.

---

## Analytics

Four views available to managers and admins:

- **QoQ Trends** — average achievement scores across Q1–Q4, filterable by org / department / individual
- **Completion Heatmap** — table showing check-in completion % per department per quarter, color coded green/yellow/red
- **Goal Distribution** — pie charts showing goals by thrust area and UoM type, bar chart by status per quarter
- **Manager Effectiveness** — table ranking managers by approval rate, check-in completion, and average team score

---

## Shared Goals

Admin or manager can create a goal and push it to multiple employees at once. The goal gets copied into each employee's sheet. Employees can only change the weightage — the title and target are locked. Employees with already-locked sheets are skipped automatically.

---

## Audit Trail

Every significant action is logged:
- Manager edits a goal target or weightage
- Admin unlocks a locked sheet (reason required)
- Sheet submitted, approved, or returned

The audit log shows old values, new values, who made the change, and when.

---

## Tech used

- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui + Recharts
- **Backend:** FastAPI (Python)
- **Database & Auth:** Supabase (PostgreSQL)
- **Excel export:** openpyxl
- **Hosting:** Vercel (frontend) + Render (backend)
