# Makhzoon AI Development Team

This project uses a team of specialized AI agents that collaborate on development.

**Start here →** `@product-manager` is your single point of contact. Tell it what you want, and it orchestrates the rest.

---

## Team Roles

### @product-manager **(Primary — start here)**
Orchestrates the entire team — plans features, assigns tasks, tracks progress, reports results.
- **When to invoke:** Any feature request, bug report, or task. Always start here.
- **Read-only** — does not make changes itself, delegates everything
- Automatically calls `@architect` → distributes tasks → calls `@qa` for review → reports back to you

### @architect
System architect for architecture design, code review, and implementation planning.
- **Read-only** — produces plans, reviews code, does not make changes

### @frontend
Frontend developer for UI components, pages, responsive design, animations, and styling.
- **Can make changes** to `app/`, `components/`, `hooks/`, `store/`, `locales/`

### @backend
Backend developer for API routes, services, authentication, business logic, and permissions.
- **Can make changes** to `app/api/`, `lib/services/`, `lib/supabase/`, `lib/audit/`

### @database
Database specialist for Supabase Postgres tables, migrations, RLS policies, and query optimization.
- **Can make changes** to `lib/db/`, `supabase/migrations/`, `scripts/`

### @qa
QA engineer for testing, code review, linting, type checking, and security review.
- **Read-only** — reviews code, runs tests, does not make changes

### @devops
DevOps engineer for deployment configuration, CI/CD, environment variables, and infrastructure.
- **Can make changes** to config files, workflows, deployment scripts

---

## Workflow

### Starting a New Feature
1. Tell `@product-manager` what you want
2. PM clarifies requirements, then calls `@architect` for a plan
3. PM breaks the plan into tasks and assigns them to `@frontend`, `@backend`, `@database` as needed
4. PM calls `@qa` to review and test everything
5. PM reports the completed work and any remaining items

### Reporting a Bug
1. Tell `@product-manager` about the bug with error details
2. PM asks `@qa` to investigate and identify root cause
3. PM assigns the fix to the appropriate agent
4. PM calls `@qa` to verify the fix

### Task Tracking (Conflict Prevention)
The `@product-manager` uses `.opencode/tasks.json` as its persistent memory:
- Every new task is recorded with its files, assignee, and requester (`user` or `partner`)
- Before assigning work, PM checks for existing implementations and file conflicts
- If partner has an `in-progress` task on the same file, PM warns about merge conflicts
- **Commit `tasks.json` with every change** so both partners stay in sync
- Always `git pull` before starting a session

### Collaboration Guidelines
- Agents communicate by @-mentioning each other with full handoff context
- Always reference existing patterns in similar files before creating new ones
- Commit all agent config files to git so both partners share the same team
- The `ruflo` MCP server in `.mcp.json` enables multi-agent orchestration

---

## Configuration Files

- `opencode.json` — Agent definitions and permissions
- `.opencode/agents/*.md` — Per-agent system prompts
- `.opencode/tasks.json` — Shared task registry (commit with every change)
- `AGENTS.md` — This file: team structure and workflow
- `.mcp.json` — ruflo MCP server for inter-agent communication

Both partners must have these files in the repo for the team to work consistently.
