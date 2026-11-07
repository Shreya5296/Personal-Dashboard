# 03 Data — 02 Entity Relationships and Data Dictionary

## 1. Document Control

- **Product:** Personal Dashboard (Student Management Dashboard)
- **Document ID:** Data-02
- **Status:** Authoritative Entity Specification
- **Version:** 4.0.0 (Strict Six-Table Model)

---

## 2. Entity-Relationship Overview

All secondary entities link directly to `Students` using `student_id`. There are no intermediate entities or junction tables.

```text
               ┌──────────────┐
               │   Students   │ (1)
               └──────┬───────┘
                      │
     ┌────────────────┼────────────────┬────────────────┬────────────────┐
     │ 1:N            │ 1:N            │ 1:N            │ 1:1            │ 1:N
     ▼                ▼                ▼                ▼                ▼
┌──────────┐    ┌──────────┐    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Packages │    │ Payments │    │ClassSessions │ │ MeetingLinks │ │ StudentNotes │
└──────────┘    └──────────┘    └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 3. Key Strategies & Record Identification

### 3.1 Primary Student Identification (`student_id`)
- Format: `STU_001`, `STU_002`, ..., `STU_026`.
- Generated sequentially by backend `IdGenerator.gs`. Permanent and immutable across active, inactive, and returning periods.

### 3.2 Package Identification (`Packages`)
- **No `package_id` in sheet.**
- A student's package is keyed by `student_id`.
- The backend matches and updates rows using `student_id` (or 1-based `_rowIndex`).

### 3.3 Class Session Identification (`ClassSessions`)
- **No `session_id` in sheet.**
- Sessions are identified in memory and during API operations by composite key:
  $$\text{Composite Key} = \text{student\_id} + \text{"\_\_"} + \text{schedule\_date} + \text{"\_\_"} + \text{schedule\_time}$$
  (e.g. `STU_001__2026-01-19__18:00`).
- Updates match row by composite key or 1-based `_rowIndex`.
- Derived End Time: `schedule_time + Packages.class_duration`.

### 3.4 Meeting Links Identification (`MeetingLinks`)
- Keyed directly by `student_id` (1 row per student).
- Contains `meeting_link_1` (primary) and `meeting_link_2` (secondary/backup).

### 3.5 Student Notes Identification (`StudentNotes`)
- Keyed by `student_id`.
- Contains `note_date`, `note_text`, and optional `follow_up_date`.

---

## 4. Complete Data Dictionary

| Table | Column Name | Data Type | Physical Col | Required | Description & Constraints |
|---|---|---|---|---|---|
| `Students` | `student_id` | String | A (1) | Yes | Unique ID (`STU_xxx`). |
| `Students` | `student_name` | String | B (2) | Yes | Full display name. |
| `Students` | `parent_name` | String | C (3) | Yes | Parent or guardian contact name. |
| `Students` | `parent_phone` | String | D (4) | Yes | Parent phone number (`+` escaped). |
| `Students` | `parent_email` | String | E (5) | No | Parent email address. |
| `Students` | `student_phone` | String | F (6) | No | Direct student phone number. |
| `Students` | `student_email` | String | G (7) | No | Direct student email for calendar invites. |
| `Students` | `subject` | String | H (8) | No | Enrolled subject or subjects. |
| `Students` | `status` | Enum | I (9) | Yes | `ACTIVE`, `INACTIVE`, `ARCHIVED`. |
| `Packages` | `student_id` | String | A (1) | Yes | References `Students.student_id`. |
| `Packages` | `student_name` | String | B (2) | Yes | Student name snapshot. |
| `Packages` | `plan_type` | Enum | C (3) | Yes | `PACKAGE`, `MONTHLY`, `YEARLY`, `PER_CLASS`. |
| `Packages` | `currency` | String | D (4) | Yes | Currency code (`INR`, `USD`, `GBP`, `EUR`). |
| `Packages` | `package_price`| Numeric| E (5) | Yes | Agreed package price. |
| `Packages` | `per_class` | Numeric | F (6) | No | Effective rate per individual class. |
| `Packages` | `classes_purchased`| Integer| G (7) | Yes | Total purchased classes. |
| `Packages` | `start_date` | Date | H (8) | Yes | Package start date (`YYYY-MM-DD`). |
| `Packages` | `end_date` | Date | I (9) | No | Projected package end date. |
| `Packages` | `next_due_date`| Date | J (10)| No | Next renewal fee due date (N-4 rule). |
| `Packages` | `class_duration`| Integer| K (11)| Yes | Session duration in minutes (default 60). |
| `Packages` | `class_schedule`| String | L (12)| No | Recurring schedule string (e.g. `Mon - 6:00 PM`). |
| `Payments` | `student_id` | String | A (1) | Yes | References `Students.student_id`. |
| `Payments` | `student_name` | String | B (2) | Yes | Student name snapshot. |
| `Payments` | `payment_date` | Date | C (3) | Yes | Payment received date (`YYYY-MM-DD`). |
| `Payments` | `amount` | Numeric| D (4) | Yes | Received amount in original currency. |
| `Payments` | `currency` | String | E (5) | Yes | Currency code. |
| `Payments` | `in_inr` | Numeric| F (6) | No | Manually entered INR-equivalent. |
| `ClassSessions`| `student_id` | String | A (1) | Yes | References `Students.student_id`. |
| `ClassSessions`| `student_name` | String | B (2) | Yes | Student name snapshot. |
| `ClassSessions`| `schedule_date`| Date | C (3) | Yes | Scheduled date (`YYYY-MM-DD`, text format). |
| `ClassSessions`| `schedule_time`| String | D (4) | Yes | Scheduled start time (`HH:mm`, 24h format). |
| `ClassSessions`| `attendance_status`| Enum | E (5) | Yes | `NOT_MARKED`, `PRESENT`, `ABSENT`, `CANCELLED`. |
| `ClassSessions`| `session_status`| Enum | F (6) | Yes | `SCHEDULED`, `COMPLETED`, `CANCELLED`. |
| `ClassSessions`| `deduct_class` | Boolean| G (7) | Yes | `TRUE` if class consumes balance. |
| `ClassSessions`| `cancellation_reason`| String| H (8) | No | Cancellation or rescheduling note. |
| `MeetingLinks` | `student_id` | String | A (1) | Yes | References `Students.student_id` (PK). |
| `MeetingLinks` | `student_name` | String | B (2) | Yes | Student name snapshot. |
| `MeetingLinks` | `meeting_link_1`| String | C (3) | Yes | Primary room URL (Google Meet). |
| `MeetingLinks` | `meeting_link_2`| String | D (4) | No | Backup room URL (Zoom). |
| `StudentNotes` | `student_id` | String | A (1) | Yes | References `Students.student_id`. |
| `StudentNotes` | `student_name` | String | B (2) | Yes | Student name snapshot. |
| `StudentNotes` | `note_date` | Date | C (3) | Yes | Date note created (`YYYY-MM-DD`). |
| `StudentNotes` | `note_text` | String | D (4) | Yes | Pedagogical remarks / homework notes. |
| `StudentNotes` | `follow_up_date`| Date | E (5) | No | Optional follow-up date. |
