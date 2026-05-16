# ATOMQUEST HACKATHON 1.0

# Problem Statement
## In-House Goal Setting & Tracking Portal

---

# 1. Background & Problem Context

Organizations that rely on manual or fragmented goal-tracking methods often struggle with alignment, visibility, and accountability. Spreadsheets, emails, and offline review cycles create blind spots — managers cannot monitor team progress in real time, employees lack clarity on how their work connects to organizational priorities, and HR teams are left piecing together data at appraisal time.

The challenge is to build a structured, digital Goal Setting & Tracking Portal that eliminates these pain points. The system must support the full lifecycle of employee goals — from creation and alignment to quarterly check-ins and performance visibility — while being intuitive, reliable, and audit-ready.

---

# 2. What You Need to Build

Participants are required to design and develop a functional web-based portal that fulfils the following core requirements.

---

## 2.1 Phase 1 — Goal Creation & Approval (Must-Have)

### Employee-facing interface to create and submit a Goal Sheet
- Select a Thrust Area and define Goal Title / Description
- Assign Unit of Measurement (UoM):
  - Numeric
  - %
  - Timeline
  - Zero-based
- Set Targets and Weightage per goal

### System-enforced validation rules
- Total weightage across all goals must equal **100%**
- Minimum weightage per individual goal: **10%**
- Maximum number of goals per employee: **8**

### Manager (L1) Approval Workflow
- Review submitted goals
- Ability to edit targets / weightages inline
- Return goals for rework
- On approval, goals are locked — no further edits without Admin intervention

### Shared Goals functionality
- Admin or manager can push a departmental KPI to multiple employees
- Recipients may adjust weightage only
- Goal Title and Target are read-only
- Achievement updates by the primary owner sync across all linked goal sheets

---

## 2.2 Phase 2 — Achievement Tracking & Quarterly Check-ins (Must-Have)

### Quarterly update interface
Employees can log:
- Actual Achievement
- Planned Targets

### Status selection per goal
- Not Started
- On Track
- Completed

### Manager Check-in module
- View Planned vs. Achievement data
- Add structured Check-in Comments

### System-computed progress scores (tracking only)

| UoM Type | Description | Formula |
|---|---|---|
| Min (Numeric / %) | Higher is better — e.g., Sales Revenue | Achievement ÷ Target |
| Max (Numeric / %) | Lower is better — e.g., TAT, Cost | Target ÷ Achievement |
| Timeline | Date-based completion | Completion date vs. Deadline |
| Zero | Zero = Success — e.g., Safety incidents | If 0 → 100%, else 0% |

---

## 2.3 Check-in Schedule

| Period | Window Opens | Action |
|---|---|---|
| Phase 1 — Goal Setting | 1st May | Goal Creation, Submission & Approval |
| Q1 Check-in | July | Progress Update — Planned vs. Actual |
| Q2 Check-in | October | Progress Update — Planned vs. Actual |
| Q3 Check-in | January | Progress Update — Planned vs. Actual |
| Q4 / Annual | March / April | Final Achievement Capture |

---

# 3. User Roles & Personas

The portal must support three distinct user roles with clearly differentiated access and capabilities.

| Role | Responsibilities | Required System Capabilities |
|---|---|---|
| Employee | Draft goals; enter quarterly achievement; update progress status | Create & edit goals pre-submission; view locked goals; input actuals |
| Manager (L1) | Review & approve goals; conduct quarterly check-ins; log feedback | Team dashboard; inline editing during approval; comment / feedback logs |
| Admin / HR | Configure cycles; manage org hierarchy; oversee completion rates | Cycle management; exception handling; audit logs; goal unlock capability |

---

# 4. Reporting & Governance Requirements

- Achievement Report:
  - Exportable (CSV / Excel)
  - Shows Planned Target vs. Actual Achievement

- Completion Dashboard:
  - Real-time tracking of employees/managers completing check-ins

- Audit Trail:
  - Log all changes made after goal lock date
  - Capture:
    - Who changed what
    - When the change occurred

---

# 5. Good-to-Have Features (Bonus Points)

These enhancements are optional but can improve evaluation scores.

---

## 5.1 Microsoft Entra ID (Azure AD) Integration

- Single Sign-On (SSO)
- Automatic org hierarchy sync
- Role assignment via Azure AD groups

---

## 5.2 Email & Microsoft Teams Integration

- Automated email notifications:
  - Goal submission
  - Approval
  - Rejection
  - Check-in reminders

- Teams bot / adaptive card notifications

- Deep-link support to open relevant goal sheets directly

---

## 5.3 Escalation Module (Rule-Based)

### Configurable escalation triggers
Examples:
- Employee has not submitted goals within N days
- Manager has not approved goals within N days
- Quarterly check-in not completed within active window

### Escalation chain
- Employee
- Manager
- Skip-level / HR

### Additional features
- Escalation logs visible to Admin / HR

---

## 5.4 Analytics Module

- Quarter-on-Quarter (QoQ) trends
- Heatmaps / progress charts
- Goal distribution analysis
- Manager effectiveness dashboard

---

# 6. Evaluation Parameters & Scoring

| # | Parameter | What Evaluators Will Look For |
|---|---|---|
| 1 | Functionality of the Portal | End-to-end working system |
| 2 | Adherence to BRD | Correct implementation of requirements and validations |
| 3 | User Friendliness | Intuitive UI and smooth workflows |
| 4 | Presence of Bugs | Stable and predictable behavior |
| 5 | Good-to-Have Features | Quality implementation of bonus features |
| 6 | Cost Optimisation | Efficient architecture and hosting strategy |

---

# 7. Constraints & Ground Rules

- Any technology stack can be used
- Must be web-browser accessible
- Demo must include:
  - Employee flow
  - Manager flow
  - Admin flow
- Code must be version controlled
- Repository link submission required
- Architecture diagram mandatory

---

# 8. Submission Deliverables

1. Live / hosted demo URL
2. Source code repository link
3. Architecture diagram (PDF or image)
4. Login credentials for:
   - Employee
   - Manager
   - Admin

   OR

   Option to switch between user journeys

---