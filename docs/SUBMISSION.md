# Submission pack

Everything the form asks for, ready to paste.

- **Live:** https://codemesh.heisenberg145.workers.dev
- **Repo:** https://github.com/heisenbergletmecook/CodeMesh
- **Deadline:** 14 October 2026, 11:59 PM PDT

---

## Project name

CodeMesh

## Project vision

*(paste as-is)*

> Branches exist because repositories used to be expensive. Cloning was slow, disks
> were finite, and no server could hand every contributor a private copy of the tree.
> Every convention we inherited — long-lived branches, pull requests, merge conflicts,
> review queues — is downstream of that single constraint.
>
> On Cloudflare Artifacts the constraint is gone. Forking is a binding primitive and
> repositories are unlimited. So CodeMesh does not add agents to the GitHub model; it
> removes the part of the model that only existed because repos were scarce.
>
> Every agent task gets its own forked repository rather than a branch. Before writing
> a line, each task declares the file paths it intends to touch, and the coordinator
> arbitrates those claims at dispatch — so overlapping work is sequenced instead of
> colliding. This is the core bet: a merge conflict is not a merge problem, it is a
> scheduling problem discovered too late. Conventional tooling finds the collision at
> integration time, after both sides have already done the work. At the scale of
> hundreds of thousands of agents, that waste is the dominant cost. CodeMesh detects
> it before a single token is spent.
>
> Integration is a serialized merge train the coordinator drains into trunk, so trunk
> has exactly one writer. There is no pull request waiting on a human: Security,
> Reviewer and Auto-Fix run as functions, and every decision is recorded in commit
> history. Commit messages and change descriptions are written from the diff itself.

## How you used Cloudflare

*(paste as-is)*

> **Artifacts** is the substrate. Each mesh run creates a trunk repository, then forks
> it once per task via the Workers binding's `fork()`. Reads — `readFile`, `readTree`,
> `log`, `info`, `createToken` — drive the whole UI, and integration reads each fork's
> changed files back through the binding rather than performing a cross-repo git merge.
>
> The interesting constraint: **Artifacts has no write API.** Every content route in the
> binding and the REST API is a GET; the only way to mutate a repository is a Git push.
> A Worker has no disk and no git binary, so CodeMesh implements an in-memory
> filesystem (`src/memfs.ts`) and drives `isomorphic-git` over it, pushing by smart HTTP
> with a repo-scoped token. Agents therefore commit from the edge with no runner, no
> container and no checkout. Branch listing goes through `listServerRefs` against the
> same remote, since refs are not exposed by the binding or the REST API.
>
> **Durable Objects** host `MeshCoordinator`, one per run. It is the only writer in the
> system: agents are pure functions that propose file contents, and the coordinator
> decides what becomes a commit, in which repository, and in what order trunk absorbs
> it. That is what makes claim arbitration and the merge train enforceable rather than
> advisory.
>
> **Workers AI** runs all six agents, so a demo needs no third-party key. `MODEL_BY_ROLE`
> binds each role to a model — Qwen 2.5 Coder for Developer, Testing and Auto-Fix;
> Llama 3.3 for Orchestrator, Security, Reviewer and Change Intelligence — and is the
> single place to swap in an external coding agent.

## Instructions to run

```bash
git clone https://github.com/heisenbergletmecook/CodeMesh.git
cd CodeMesh
npm install
npx wrangler login
npx wrangler deploy
```

Open the deployed URL and press **Run mesh**. Requires a Cloudflare account on the
**Workers Paid** plan — Artifacts is not available on the free plan during open beta.

Offline test of the write path (no account needed):

```bash
npm test
```

Verify the repositories are real, from outside the app:

```bash
curl https://codemesh.heisenberg145.workers.dev/api/repos
curl https://codemesh.heisenberg145.workers.dev/api/repos/<name>/log
```

## Required confirmations

- ☑ Built using Cloudflare Workers and Artifacts
- ☑ MIT licensed, `LICENSE` present in the repository root
- ☑ Public repository

## Team

| Field | Value |
|---|---|
| Team name | CodeMesh |
| Primary contact | Arjun Rajapeta — heisenberg145@icloud.com |
| Team location | Austin, Texas, USA |
| Attendee 1 | Arjun Rajapeta — heisenberg145@icloud.com |
| Attendee 2 | Naimisha Marri — naimisha.marri@gmail.com |

Eligibility confirmed: both attendees are 18+, resident in an eligible country,
and able to attend Cloudflare Connect in San Francisco on 21 October 2026.
Finalists are notified on 16 October.

---

# Demo video script — target 7:00

Record at 1920x1080, browser zoom 100%, nothing else on screen.

**Before recording**, set the stage so the screens are populated but not noisy.
The workspace currently holds ~100 scratch codebases from audit runs; deleting
the `e2e_*` ones first will make Codebases read as deliberate rather than
cluttered.

The run below is real and already in the workspace — `heisenberg-payments-api`.
You can re-run it live or walk the existing one.

### 0:00 - 0:50 - The premise

Open Overview, on the hero line.

> "Branches exist because repositories used to be expensive. Cloning was slow,
> disks were finite. Pull requests, merge conflicts, review queues - all of it
> is downstream of that one constraint.
>
> On Cloudflare Artifacts that constraint is gone. Forking is a binding
> primitive and repositories are unlimited. So CodeMesh doesn't add agents on
> top of GitHub. It removes the part of GitHub that only existed because repos
> were scarce."

### 0:50 - 1:40 - A codebase, and a human change

Codebases -> `heisenberg-payments-api` -> open `src/index.ts` -> **Edit**.
Add a line. Choose **Create a new branch**. Commit.

> "A person can work here too. But I don't write the commit message - the diff
> does. A Change Intelligence agent reads the actual change and writes the
> message, the title and the description."

Show the generated message appear, then the new branch under **Branches**.

### 1:40 - 3:00 - Hand it to the swarm

On the same codebase, use **Run a mesh on this codebase**:
*Add request validation and audit logging to the payments API*

> "The Orchestrator doesn't just split this into tasks. It makes every task
> declare, up front, which files it intends to touch."

Let the cards appear. Point at the claim chips.

### 3:00 - 4:00 - The strongest minute. Do not rush it.

Point at the card marked **sequenced** (`implement-logging`, behind
`add-validation` - both claimed `src/payments/api.ts`).

> "These two both claimed the same file. The coordinator caught it at dispatch,
> before either agent wrote a line, and sequenced one behind the other.
>
> That's the whole idea. A merge conflict isn't a merge problem. It's a
> scheduling problem we've always discovered too late, after both sides already
> did the work. With a hundred thousand agents, that waste is the dominant
> cost. Here it never happens."

### 4:00 - 5:15 - Inside a change proposal

Open the `implement-logging` proposal. Walk the pipeline strip left to right,
then the tabs.

> "There's no pull request. A change proposal is the agent's own forked
> repository."

- **Discussion** - what the mesh decided, written by the agents
- **Changes** - real diff against the fork point (+114 / -0)
- **Checks** - 3 security findings, reviewer requested changes
- **Impact** - the overlap the mesh had to resolve

### 5:15 - 5:50 - The merge train

Back to Overview, scroll the coordinator log.

> "Integration is serialized, so trunk has exactly one writer. Where two
> proposals touched the same file, the supersede is written into the log - not
> left as a conflict marker for a human."

Then **Trust Center**: every finding across every run. Then **Work Items**:

> "High-severity findings aren't quietly patched. The Security agent files them
> as work items, so they outlive the run."

### 5:50 - 6:40 - Prove it is real

Terminal. This is the part that convinces a judge.

```bash
curl https://codemesh.heisenberg145.workers.dev/api/repos
curl https://codemesh.heisenberg145.workers.dev/api/repos/heisenberg-payments-api/log
```

> "Every one of these is a real Artifacts repository. Real commits, each
> authored by the agent that made it. And all of it was pushed from a Worker -
> no disk, no git binary. Artifacts has no write API at all, so CodeMesh runs
> isomorphic-git over an in-memory filesystem and pushes over smart HTTP."

### 6:40 - 7:00 - Close, honestly

> "What isn't done: test execution. The Testing agent writes real tests and
> predicts which assertions fail, but running them needs Sandboxes and
> Containers. It's in the README, and it's the next thing we'd build."

**Say this.** Naming your own gap is more convincing than hiding it, and a judge
will find it anyway.
