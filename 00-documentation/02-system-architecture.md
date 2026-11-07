# 02 — System Architecture

## 1. Document Control

- **Product:** Personal Dashboard (Student Management Dashboard)
- **Document ID:** 02
- **Status:** Authoritative Architecture Specification
- **Version:** 4.0.0
- **Audience:** Developers, architects, AI coding agents

## 2. Architectural Principles & Stack

1. **Frontend-Backend Separation:**
   - **Frontend:** React 18, TypeScript, and Vite. Static single-page application hosted on Vercel.
   - **Backend:** Google Apps Script (GAS) Web App deployed as an executable API endpoint.
   - **Datastore:** Exactly six Google Sheets tables in a single private Google Spreadsheet.
2. **Strict Datastore Boundary:**
   - The browser never communicates directly with the Google Sheets API.
   - All spreadsheet reads and mutations pass through the authenticated Apps Script Web App.
3. **Zero-GCP Authentication:**
   - No Google Cloud Console, GCP project, OAuth consent screen, or OAuth credentials are required.
   - Session authentication uses server-side HMAC-SHA256 tokens signed with `ADMIN_AUTH_KEY` stored in Apps Script `ScriptProperties`.
4. **Transport via CORS-Free Text/Plain POST:**
   - The frontend issues HTTP POST requests with `Content-Type: text/plain;charset=utf-8` and `redirect: 'follow'`.
   - Using `text/plain` prevents CORS preflight (`OPTIONS`) requests, which Google Apps Script Web Apps cannot answer.
5. **Micro-File Architecture:**
   - Every source file in `src/` and `public/` is strictly $\le 149$ lines, organized by single-responsibility domains.

## 3. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph Browser["User Browser (Desktop / Tablet)"]
        UI["React 18 SPA (Vite)"]
        State["Domain Hooks & Local State"]
        APIClient["Centralized API Client (apiClient.ts)"]
    end

    subgraph Hosting["Frontend Hosting (Vercel)"]
        VercelSPA["Static Bundle & SPA Rewrites (vercel.json)"]
    end

    subgraph Backend["Google Apps Script Web App"]
        DoPost["doPost(e) Entry Point (ApiEntry.gs)"]
        AuthGuards["HMAC-SHA256 Auth & Allowlist (IdentityVerifier.gs)"]
        Router["OperationRouter.gs"]
        Services["Domain Business Services (Student, Package, Class, Payment, Report)"]
        LockMgr["LockManager.gs (ScriptLock)"]
        Repositories["Domain Repositories (CRUD & Memory Maps)"]
        SheetsAccess["HeaderMapper.gs & DateFormatService.gs"]
    end

    subgraph Datastore["Canonical Google Spreadsheet (Private)"]
        T1["Students (9 cols)"]
        T2["Packages (12 cols)"]
        T3["Payments (6 cols)"]
        T4["ClassSessions (8 cols)"]
        T5["MeetingLinks (4 cols)"]
        T6["StudentNotes (5 cols)"]
    end

    UI --> State
    State --> APIClient
    APIClient -- "POST text/plain;charset=utf-8" --> DoPost
    DoPost --> AuthGuards
    AuthGuards --> Router
    Router --> Services
    Services --> LockMgr
    Services --> Repositories
    Repositories --> SheetsAccess
    SheetsAccess --> T1
    SheetsAccess --> T2
    SheetsAccess --> T3
    SheetsAccess --> T4
    SheetsAccess --> T5
    SheetsAccess --> T6
```

## 4. Request & Response Lifecycle Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrator
    participant UI as React UI (Client)
    participant Client as apiClient.ts
    participant GAS as Apps Script (ApiEntry.gs)
    participant Auth as IdentityVerifier.gs
    participant Svc as Domain Service
    participant Sheet as Google Sheets (Canonical Table)

    Admin->>UI: Triggers action (e.g. Mark Class Present)
    UI->>Client: sendApiRequest('classes.complete', { session_id, attendance_status: 'PRESENT' })
    Client->>GAS: HTTP POST (JSON body as text/plain, token, requestId)
    GAS->>Auth: verifyIdentityToken(token)
    Auth-->>GAS: Valid (admin: ashreya0502@gmail.com)
    GAS->>Svc: Classes_complete(spreadsheet, payload, actor)
    Svc->>Sheet: Read row & acquire LockManager
    Svc->>Sheet: Update ClassSessions (session_status='COMPLETED', deduct_class=true)
    Svc-->>GAS: Success { session_status: 'COMPLETED', deduct_class: true }
    GAS-->>Client: HTTP 200 { ok: true, data: { ... }, meta: { requestId } }
    Client-->>UI: Resolved Promise
    UI-->>Admin: UI updates & toast notification
```

## 5. Domain Relationship Diagram

The canonical datastore contains **strictly six tables** with all secondary records linking directly to `Students.student_id`.

```mermaid
erDiagram
    Students ||--o{ Packages : "has (linked by student_id)"
    Students ||--o{ Payments : "pays (linked by student_id)"
    Students ||--o{ ClassSessions : "attends (linked by student_id)"
    Students ||--o| MeetingLinks : "uses (linked by student_id)"
    Students ||--o{ StudentNotes : "records (linked by student_id)"

    Students {
        string student_id PK "Unique identifier (STU_001)"
        string student_name "Full name"
        string parent_name "Parent name"
        string parent_phone "Parent phone (+ escaped)"
        string parent_email "Parent email"
        string student_phone "Student phone"
        string student_email "Student email"
        string subject "Enrolled subject(s)"
        string status "ACTIVE | INACTIVE"
    }

    Packages {
        string student_id FK "References Students.student_id"
        string student_name "Student name snapshot"
        string plan_type "PACKAGE | MONTHLY | YEARLY | PER_CLASS"
        string currency "INR | USD | EUR | GBP"
        number package_price "Agreed total price"
        number per_class "Per-class rate"
        number classes_purchased "Total classes purchased"
        string start_date "Start date (YYYY-MM-DD)"
        string end_date "End date (YYYY-MM-DD)"
        string next_due_date "Next fee due date (YYYY-MM-DD)"
        number class_duration "Class duration in minutes"
        string class_schedule "Schedule text (e.g. Mon - 6:00 PM)"
    }

    Payments {
        string student_id FK "References Students.student_id"
        string student_name "Student name snapshot"
        string payment_date "Payment date (YYYY-MM-DD)"
        number amount "Original currency amount"
        string currency "Payment currency code"
        number in_inr "Manual INR equivalent"
    }

    ClassSessions {
        string student_id FK "References Students.student_id"
        string student_name "Student name snapshot"
        string schedule_date "Date (YYYY-MM-DD)"
        string schedule_time "Time (HH:mm, 24-hour)"
        string attendance_status "NOT_MARKED | PRESENT | ABSENT | CANCELLED"
        string session_status "SCHEDULED | COMPLETED | CANCELLED"
        boolean deduct_class "True consumes package balance"
        string cancellation_reason "Reason if cancelled"
    }

    MeetingLinks {
        string student_id FK "References Students.student_id"
        string student_name "Student name snapshot"
        string meeting_link_1 "Primary room URL (Google Meet)"
        string meeting_link_2 "Backup room URL (Zoom)"
    }

    StudentNotes {
        string student_id FK "References Students.student_id"
        string student_name "Student name snapshot"
        string note_date "Date note created"
        string note_text "Note content"
        string follow_up_date "Optional follow-up date"
    }
```

## 6. Attendance & Class Deduction Workflow

```mermaid
flowchart TD
    Start["Class Session Marked"] --> StatusCheck{"What action was chosen?"}
    
    StatusCheck -- "Present / Attended" --> SetPresent["Set session_status = 'COMPLETED'<br/>Set attendance_status = 'PRESENT'<br/>Set deduct_class = true"]
    SetPresent --> BurnCredit["Consumes 1 Class Credit<br/>(Deducted FIFO by package start_date)"]
    
    StatusCheck -- "Absent / No-Show" --> PromptOwner{"Did owner choose to deduct?"}
    PromptOwner -- "Yes (Unexcused / Late)" --> SetAbsentDeduct["Set attendance_status = 'ABSENT'<br/>Set deduct_class = true"]
    SetAbsentDeduct --> BurnCredit
    PromptOwner -- "No (Excused)" --> SetAbsentNoDeduct["Set attendance_status = 'ABSENT'<br/>Set deduct_class = false"]
    SetAbsentNoDeduct --> NoDeduct["Credit is NOT consumed"]
    
    StatusCheck -- "Cancelled" --> CheckTime{"Cancelled < 4h before session?"}
    CheckTime -- "Yes (Late cancellation)" --> CheckWaive{"Credit waived by owner?"}
    CheckWaive -- "No" --> SetCancelLate["Set session_status = 'CANCELLED'<br/>Set attendance_status = 'CANCELLED_LATE'<br/>Set deduct_class = true"]
    SetCancelLate --> BurnCredit
    CheckWaive -- "Yes" --> SetCancelWaived["Set session_status = 'CANCELLED'<br/>Set deduct_class = false"]
    CheckTime -- "No (Advance notice)" --> SetCancelWaived
    
    SetCancelWaived --> AutoReschedule["Schedule Automatic Replacement Session<br/>at next recurring schedule slot<br/>& extend package end_date"]
    AutoReschedule --> NoDeduct
```

## 7. Calendar Hybrid Event Synthesis

```mermaid
flowchart TD
    WeekSelect["User selects calendar week in UI"] --> FetchData["Fetch dated sessions & active student packages"]
    
    FetchData --> ProcessDated["1. Map dated ClassSessions for visible week"]
    ProcessDated --> ClassifyDated["Classify each dated session:<br/>- Completed/Present -> PAST_COMPLETED (Soft Green)<br/>- Cancelled or uncompleted past -> CANCELLED (Soft Red)<br/>- Scheduled future -> UPCOMING (Amber)"]
    
    FetchData --> ProcessRecurring["2. Parse recurring schedules from Packages.class_schedule"]
    ProcessRecurring --> FilterActive["Filter active students & date boundaries<br/>(date >= package.start_date and <= package.end_date)"]
    
    ClassifyDated --> DuplicateCheck{"Does a dated session already exist<br/>at this student's weekday + time slot?"}
    FilterActive --> DuplicateCheck
    
    DuplicateCheck -- "Yes" --> SkipRecurring["Suppress recurring placeholder<br/>(Dated session takes precedence)"]
    DuplicateCheck -- "No" --> SynthesizeRecurring["Synthesize recurring event placeholder<br/>status = 'UPCOMING' (Amber)"]
    
    SkipRecurring --> Render["Render unified 7-day time grid (06:00 to 23:00) in Asia/Kolkata"]
    SynthesizeRecurring --> Render
```
