# CodeMesh

**Agent-native source control on Cloudflare Workers + Artifacts.**

A fork per agent. Claims before work. A merge train instead of pull requests.

Built for the Cloudflare *Build the Next-Gen Git Platform* competition.

---

## The idea

Branches exist because repositories used to be expensive. Cloning was slow, disks
were finite, and a server could not hand every contributor their own copy of the
tree. Every convention we inherited from GitHub — long-lived branches, pull
requests, merge conflicts, review queues — is downstream of that one constraint.

On Cloudflare Artifacts the constraint is gone. Forking is a binding primitive,
repositories are unlimited, and each one is an isolated Git service that
Cloudflare can route to from any region. So CodeMesh does not add agents to the
GitHub model. It removes the part of the model that only existed because repos
were scarce.

Three consequences:

### 1. A fork per task, not a branch

Every agent task gets **its own forked Artifacts repository**. Isolation is the
default, not something you opt into by naming a branch. A thousand concurrent
agents are a thousand repositories, which is a shape Artifacts is explicitly
built for and Git hosting never was.

### 2. Claims before work

Before any code is written, the Orchestrator makes each task declare the file
paths it intends to touch. The coordinator compares those claims **at dispatch
time** and sequences any task whose territory overlaps one already granted.

This is the part that matters at scale. Merge conflicts are not a merge problem —
they are a *scheduling* problem that we have historically discovered too late, at
the moment of integration, after the work is already done and wasted. CodeMesh
detects the collision before a single token is spent on it.

### 3. A merge train, not pull requests

There is no PR queue waiting on a human. Completed work enters a **serialized
merge train** the coordinator drains into trunk. Review is a function that runs
(Security + Reviewer agents, concurrently), and Auto-Fix folds blocking feedback
back into the fork before the train ever sees it. The trunk has exactly one
writer, always.

---

## Architecture

```
  Request
     │
     ▼
┌─────────────────────────────────────────────────────┐
│  MeshCoordinator  (Durable Object — the only writer) │
└─────────────────────────────────────────────────────┘
     │
     ├── Orchestrator ──► tasks + path claims
     │                     │
     │                     ▼
     │              claim arbitration ──► overlap? sequence it
     │
     ├── fork trunk ──► repo per task ──► Artifacts
     │     │
     │     ├── Developer  ──► real file contents
     │     ├── Testing    ──► test files + expected failures
     │     ├── Security   ─┐ concurrent
     │     ├── Reviewer   ─┘
     │     └── Auto-Fix   ──► corrections
     │           │
     │           ▼
     │     commit + push (isomorphic-git over in-memory FS)
     │
     └── merge train ──► serialized integration ──► trunk
```

### The write path is the interesting constraint

Artifacts has **no write API**. The Workers binding and REST API are rich on the
read side (`readFile`, `readTree`, `readBlob`, `log`, `raw/:ref/:path`) but there
is no endpoint that creates a commit or moves a ref. The only way to mutate a
repository is a Git push.

Workers have no disk and no `git` binary. So CodeMesh:

- implements an in-memory filesystem (`src/memfs.ts`) against which
- `isomorphic-git` runs `init` / `clone` / `add` / `commit` / `push`
- over smart HTTP to the Artifacts remote, authenticated with a repo-scoped token.

Agents therefore commit **from the edge** — no runner, no container, no checkout.

Integration reads back through the binding rather than doing a cross-repo git
merge: the coordinator pulls each fork's changed files with `readFile` and
replays them onto trunk. Because claims were arbitrated up front, overlap at this
stage is the exception, and when it happens the supersede is written explicitly
into the activity log rather than left as a conflict marker.

---

## The agents

Five are active in this prototype, plus Auto-Fix:

| Agent | Does | Model role |
|---|---|---|
| **Orchestrator** | Splits the request into independent tasks, declares path claims | general |
| **Developer** | Writes real file contents, committed to its own fork | coder |
| **Testing** | Generates test files, reports expected failures | coder |
| **Security** | Flags vulnerabilities, secrets, unsafe dependencies | general |
| **Reviewer** | Inline comments and an approve / request-changes verdict | general |
| **Auto-Fix** | Folds blocking findings back into the code before merge | coder |

Agents are pure functions of context. **None of them touch git** — the
coordinator owns every repository operation, so a misbehaving agent can never
corrupt trunk or push behind the merge train's back.

Engines are swappable: `MODEL_BY_ROLE` in `src/agents/model.ts` is the only place
a role is bound to a model. It runs on Workers AI by default so a demo needs no
third-party key; pointing the Developer at an external coding agent is a one-line
change.

The remaining roles from the full design (Architect, Docs, PR Intelligence,
Dependency & Lineage, Notification, Merge & Conflict) are deliberately **not**
implemented as agents. Conflict handling is structural, not an LLM call. Not
every feature needs a model behind it.

---

## Running it

### Requirements

- Node 18+
- A Cloudflare account on the **Workers Paid plan** — Artifacts is not available
  on the free plan during open beta.

### Setup

```bash
npm install
npx wrangler login
npx wrangler deploy
```

Open the deployed URL, type a request, press **Run mesh**.

### Local development

```bash
npx wrangler dev --remote
```

`--remote` is required: the Artifacts and Workers AI bindings have no local
simulator, so the Worker must run against the real services.

### Verifying the repos are real

Everything on the dashboard is a real Artifacts repository. To check from outside
the app:

```bash
# every repo the mesh created
curl https://<your-worker>.workers.dev/api/repos

# commit history for one agent's fork, straight from the Artifacts binding
curl https://<your-worker>.workers.dev/api/repos/<repo-name>/log
```

Each commit's author is the agent that made it (`codemesh-<task-id>`), so
`git log` alone tells you which agent touched what.

---

## Layout

```
src/
  index.ts        Worker entry — routes + API
  coordinator.ts  MeshCoordinator Durable Object: forks, claims, merge train
  git.ts          isomorphic-git write path (commit + push from a Worker)
  memfs.ts        in-memory filesystem backing git
  logo.ts         inline SVG mark
  ui.ts           dashboard
  agents/
    model.ts      Workers AI access, per-role model binding, JSON extraction
    roles.ts      the five agents + Auto-Fix
```

---

## What is real and what is not

Being explicit, because demos invite the question:

- **Real:** every repository, fork, commit and push. Claim arbitration. The merge
  train. All agent output. Every number on the dashboard.
- **Simulated:** test *execution*. The Testing agent writes real test files and
  judges which assertions should fail, but nothing runs them in a sandbox yet.
  Wiring this to Cloudflare Sandboxes is the next step and needs Containers.

---

## License

MIT — see [LICENSE](./LICENSE).
