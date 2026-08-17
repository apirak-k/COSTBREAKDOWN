---
name: web-prototype-haws
description: >
  Master Web Prototype Framework enforcing HAWS (Human-AI Working Standard), the 8-Pillars
  Architecture Checklist, anti-AI design aesthetics, ECRS/Poka-Yoke, and proactive inquiry.
  Trigger when user types "Webstarts", "webstarts", "web start", or starts/resumes a web prototype.
---

# Web Prototype HAWS Framework

## Overview
This skill governs the end-to-end architecture, user experience, and implementation of production-grade web prototypes. It guarantees human-centric UX, industrial-grade reliability (ECRS/Poka-Yoke), fully dynamic fluid responsiveness across all screen sizes, traceable data architecture, zero blind guessing, and strict adherence to HAWS governance.

## When to Use
Trigger this skill whenever the user:
- Types **`Webstarts`**, **`webstarts`**, or **`web start`**
- Asks to initialize, design, build, test, refactor, or review a web prototype
- Resumes an existing web application or performs a session handoff

---

## 1. ⚖️ HAWS Core Behaviors & Protocols

1. **Classification of Facts (Judgment & Truth):**
   - **Confirmed Decision:** Verified requirements, explicit user approvals, and authoritative data.
   - **Assumption:** Unverified hypotheses requiring testing or explicit confirmation.
   - **Recommendation:** AI-proposed approaches accompanied by clear engineering rationale.
   - **Pending Question:** Ambiguities or missing parameters blocking or altering the outcome.
   *Universal Rule: Never present assumptions as facts, recommendations as decisions, or unperformed checks as completed.*

2. **Zero Blind Guessing & Proactive Inquiry Protocol:**
   - **Strictly No Guessing:** If any requirement, workflow, business logic, or user intent is ambiguous, underspecified, or conflicting, the AI **MUST NOT guess or invent requirements**.
   - **Ask with Actionable Recommendations:** Proactively ask the user directly, providing:
     1. The precise point of ambiguity or decision required.
     2. A **Recommended Default Option** based on standard best practices.
     3. Clear trade-offs/rationales so the user can decide with zero friction.

3. **Review vs. Action Protocol:**
   - **Review Mode:** When instructed to "Review", inspect, analyze, and report only. **Make ZERO modifications to files, code, or repositories.**
   - **Action Mode:** Execute within the confirmed scope. Require explicit user confirmation before destructive, irreversible, external, or permission-changing actions.

4. **Human-Crafted Aesthetic (Anti-AI Slop Directive):**
   - **No Cliché AI Tropes:** Strictly avoid generic AI patterns (e.g., dark-purple/violet glow accents, textureless surfaces, icon-stuffed bento boxes, nested cards inside cards, headline pill badges with pulsing dots).
   - **Authentic Engineering Craft:** Clean whitespace, harmonious curated color palette, symmetrical balance, thoughtful typographic hierarchy, real data density, and natural microcopy.

---

## 2. 🏗️ The 8-Pillars Web Architecture Checklist (All-Case Coverage)

Verify these 8 pillars across every component, workflow, and refactoring step:

1. **Purpose & Workflow Flow:**
   - Every feature directly serves the core objective.
   - Seamless end-to-end workflow with zero dead ends, broken paths, or confusing loops.

2. **UX/UI & Layout Symmetrical Harmony:**
   - Structured visual hierarchy with clear header, footer, content canvas, and navigation.
   - Balanced symmetrical alignment, consistent spacing tokens, and intuitive interactive states (hover, focus, active, disabled).

3. **Industrial Quality Tools (ECRS & Poka-Yoke):**
   - **ECRS:** **E**liminate redundant inputs/steps, **C**ombine overlapping functions, **R**earrange in natural logical order, **S**implify complexity.
   - **Poka-Yoke (Mistake-Proofing):** Input boundary guards (min/max, number format, regex), destructive action confirmation dialogs, and instant "Reset to Default" state recovery.
   - **All Edge Cases:** Explicitly handle empty data, null/undefined, extreme numbers, zero values, long string wraps, and duplicate submissions.

4. **Fluid & Dynamic Multi-Device Responsiveness (Never Fixed):**
   - **100% Fluid Adaptation:** Layouts must dynamically flex, scale, and reorganize to fit ANY viewport width (Mobile, iPad/Tablet, Laptop, Desktop, and Ultrawide monitors) without hardcoding fixed pixel widths.
   - **Zero Horizontal Overflow:** Container padding, grid auto-fit, and flex-wrap prevent unwanted horizontal scrolling on small screens.
   - **Touch & Pointer Friendly:** Accessible hit targets (minimum 44x44px for touch) and responsive input typography.

5. **Clean & Scalable Architecture:**
   - Modular frontend separation: UI Presentation (`components`), Business Logic & Engine (`lib`), State Store (`store/hooks`), and Type Definitions (`types`).
   - Mock Data Layer: Scalable JSON fixtures and Local State replicating real backend API and database schemas without tight coupling.

6. **Reliability, Network & Error Resilience:**
   - Clear loading skeletons, informative empty states, and error boundaries.
   - Network simulation (latency, offline handling, failed request recovery, clear retry options).

7. **Security, Traceability & Audit Trail:**
   - Complete audit trail: Display `Source Document`, `Reference ID`, `Effective Date`, and `Author/Line`.
   - Data Confidentiality: Keep proprietary sources and credentials out of public repositories via strict `.gitignore`.

8. **Git Lifecycle & Continuous Governance:**
   - Atomic, descriptive commits (`feat:`, `fix:`, `chore:`, `docs:`).
   - Update `PROJECT_SPECIFIC.md` for stable confirmed rules and `HANDOFF.md` for session resume checkpoints.

---

## 3. 🚀 Work Instructions & Execution Lifecycle

### Phase 1: Context Loading (Execution on `Webstarts`)
At the start of every session:
1. Inspect workspace structure and read `HAWS.md` & `WORK_INSTRUCTIONS.md`.
2. Read `PROJECT_SPECIFIC.md` (if present) for confirmed rules, master data, and constraints.
3. Read `HANDOFF.md` (if present) for current work state and exact resume point.
4. **Immediately report to the user:**
   - **Understood Goal:** Primary objective of the prototype
   - **Current Scope:** Boundaries of current features and architecture
   - **Active State:** Real status of code, builds, and deliverables
   - **Starting Point:** Immediate next action to execute

### Phase 2: Debugging & State Tracing
When diagnosing errors or unexpected behavior, trace systematically:
`Input → State → Condition/Calculation → Output → Side Effects → Final State`

### Phase 3: Checkpoint & Session Handoff
Before concluding a session or switching environments:
1. Verify build integrity (`npm run build` with 0 errors).
2. Test responsive layouts, boundary values, empty states, and Poka-Yoke validations across device views.
3. Update `HANDOFF.md` (Goal, Completed/Remaining, Confirmed Decisions, Risks, Resume Point).
4. Commit and Push to Git when authorized, reporting the active branch and commit hash.
