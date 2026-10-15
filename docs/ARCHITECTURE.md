# Architecture

## The constraint that shaped everything

Cloudflare Artifacts has **no write API**.

The Workers binding and the REST API are rich on the read side — `readFile`,
`readTree`, `readBlob`, `log`, `readCommit`, `raw/:ref/:path` — but there is no
endpoint anywhere that creates a commit or moves a ref. Confirmed across the
[Workers binding reference](https://developers.cloudflare.com/artifacts/api/workers-binding/)
and the [REST API reference](https://developers.cloudflare.com/artifacts/api/rest-api/):
every content route is a `GET`. `create`, `fork` and `import` make repositories;
none of them write files.

The only way to mutate an Artifacts repository is a **Git push**.

A Cloudflare Worker has no disk and no `git` binary. So CodeMesh builds the
write path itself:

```
agent output (plain file contents)
        │
        ▼
   MemFS  ............ src/memfs.ts — an in-memory fs.promises implementation
        │
        ▼
 isomorphic-git ...... init / clone / add / commit / push, pure JS
        │
        ▼
  smart HTTP  ........ git-receive-pack v1 over fetch()
        │
        ▼
  Artifacts remote ... authenticated with a repo-scoped write token
```

`src/memfs.ts` is a `Map<path, node>` exposing the subset of `fs.promises` that
isomorphic-git actually calls: `readFile`, `writeFile`, `unlink`, `readdir`,
`mkdir`, `rmdir`, `stat`, `lstat`, `readlink`, `symlink`, `chmod`. It implements
`mkdir -p` semantics on deep writes because git writes nested object paths
without creating directories first.

Because this component has no safety net — if it is subtly wrong, every agent
commit fails at runtime — it has an offline test that runs the real
isomorphic-git against it with no network:

```bash
npm test
```

## Why a fork per task

Branches exist because repositories used to be expensive. Cloning was slow,
disks were finite, and a server could not hand every contributor a private copy
of the tree.

On Artifacts that constraint is gone:

- `fork()` is a first-class method on the Workers binding
- repositories are **unlimited** per the
  [limits page](https://developers.cloudflare.com/artifacts/platform/limits/)
- each repo is "one isolated Git service with its own history, refs, remote URL,
  tokens, and durable state"

So CodeMesh does not give an agent a branch. It gives the agent **its own
repository**. Isolation is the default rather than something you opt into by
naming a ref. A thousand concurrent agents are a thousand repositories, which is
a shape Artifacts is built for and conventional Git hosting is not.

## Claim arbitration

The Orchestrator does not only split a request into tasks. It makes each task
declare, up front, the file paths it intends to touch.

```ts
{ id: "add-logging", title: "...", claims: ["src/logger.ts", "src/index.ts"] }
```

Before dispatch, the coordinator walks the tasks in order and grants each claim
to the first task that asks for it. A task that asks for an already-granted path
is marked `blocked` and sequenced behind the owner.

This is the central idea. **A merge conflict is not a merge problem — it is a
scheduling problem discovered too late.** Conventional tooling finds the
collision at integration time, after both sides have already done the work. With
hundreds of thousands of agents, that waste is the dominant cost. CodeMesh
detects the collision before a single token is spent on it.

## The merge train

There is no pull request and no review queue waiting on a human.

Completed work enters a serialized train the coordinator drains into trunk:

1. Read each fork's changed files back through the Artifacts binding
   (`readFile({ ref, path })`) — no cross-repo git merge, no conflict markers
2. Replay them onto a single trunk workspace
3. Commit per proposal, authored as the agent
4. Push once at the end

The trunk therefore has exactly one writer, always. Because claims were
arbitrated up front, overlap at this stage is the exception; when it does happen
the supersede is written explicitly into the activity log rather than left as a
conflict marker for someone to resolve.

## Components

| File | Responsibility |
|---|---|
| `src/index.ts` | Worker entry: page routes and JSON API |
| `src/coordinator.ts` | `MeshCoordinator` Durable Object — the only writer |
| `src/git.ts` | commit/push/clone/branches via isomorphic-git |
| `src/memfs.ts` | in-memory filesystem backing git |
| `src/agents/model.ts` | Workers AI access, per-role model binding, JSON coercion |
| `src/agents/roles.ts` | the five agents plus Auto-Fix |
| `src/ui/*` | dashboard, codebases, repo browser, change proposals |

### Why the coordinator owns every repo operation

Agents are pure functions of context: `(task, files) -> structured output`. They
never touch git. The coordinator decides what becomes a commit, which repository
it lands in, and in what order the trunk absorbs it.

A misbehaving or prompt-injected agent therefore cannot corrupt trunk, cannot
push behind the merge train's back, and cannot reach another agent's repository.
Tokens are repo-scoped, so even a leaked fork token is blast-radius-limited to
that one fork.

## Two bugs worth recording

Both were found by end-to-end testing against live Artifacts, not by inspection.

**Concurrent forks fail.** Forking the same trunk from four concurrent tasks
made the control plane return `An internal error occurred`, killing one task per
run. Fork provisioning is now serialized with retry and backoff before dispatch;
the agent work that follows stays fully concurrent. Forking is fast and was never
the part worth parallelizing.

**Write tokens leaked to the browser.** Each agent's fork handle carries a
repo-scoped *write* token, and the Durable Object was serializing its whole
state — handles included — to the dashboard. The state endpoint now strips the
handle and returns only the remote URL.

## Model handling

`MODEL_BY_ROLE` in `src/agents/model.ts` is the single place a role binds to a
model. Workers AI is the default so a demo needs no third-party key; pointing
the Developer at an external coding agent is a one-line change.

Workers AI models do not agree on a response shape:

- `@cf/meta/llama-3.3-70b-instruct-fp8-fast` returns `response` as a **string**
- `@cf/qwen/qwen2.5-coder-32b-instruct` returns `response` already **parsed**
- OpenAI-compatible models nest text under `choices[].message.content`

`coerce()` normalizes all three, then falls back to brace-matching extraction
for models that wrap JSON in prose or fences. A parse failure returns a typed
fallback rather than throwing — one flaky agent must not take down a mesh of
fifty.
