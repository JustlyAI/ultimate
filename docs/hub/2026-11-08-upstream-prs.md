# Upstream pull requests to Ultimate

Status: proposed on 2026-11-08, for the owner to decide. Nothing is opened upstream.

## Goal

Ultimate Hub's lifecycle design (`docs/design/2026-11-07-lifecycle-design.md` in the private `JustlyAI/ultimate-hub` repository) lists changes to Ultimate that would make Hub's pause, play, and close safer or simpler. This spec examines four of them in full, so that the owner can choose which to propose.

Hub must keep working without each change. The main spec's anti-goals allow pull requests to Ultimate, but the app must work without them. So no change below may become a requirement, and Hub keeps its current path until a change lands and the owner's Ultimate clones have it.

## Sources and labels

Every Ultimate citation is `file:line` at commit `621c8665`, in the read-only clone at `~/dev/ultimate-test-clone`. Upstream `main` was at `7c5a2b17` on 2026-11-08. Hub citations are at `JustlyAI/ultimate-hub` commit `68f9898`, a private repository.

All experiments ran on a test Mac on 2026-11-08, with Node 26.13.0, pnpm 11.8.0, temporary `HOME` folders, disposable projects, and Hub's scripted test model. The scripts are throwaway files in `/tmp` and are not in this repository.

Each claim has one of these labels:

- **Measured.** I ran it and saw the result.
- **Inferred.** I read it in the code or the docs but did not run it.
- **Guess.** I have no direct evidence.

## How upstream works

`CONTRIBUTING.md` sets the terms:

- Ultimate is "a personal project, shared as inspiration, not as a library or a product with users to support" (`CONTRIBUTING.md:3`). The README says the same in its first note (`README.md:3-9`).
- The intended way to change Ultimate is to ask Ultimate to change itself, and to keep changes in `.ultimate/` folders (`CONTRIBUTING.md:5-9`).
- Pull requests are "welcome as shared ideas". Most stay open and unmerged. "Merging is the exception, for clear-cut fixes or improvements to the core." A feature PR is titled `Feature: …` and labelled `feature` (`CONTRIBUTING.md:10-13`).
- An agent must first adapt its own `.ultimate/`, then open one PR per idea, after it checks the open PRs for the same idea (`CONTRIBUTING.md:14-16`).
- Issues are not reviewed (`CONTRIBUTING.md:19`).
- "Nothing is stable." The author changes things "without migration paths, deprecation periods, or regard for anyone building on top" (`CONTRIBUTING.md:20-21`).

`AGENTS.md` sets the code rules that a PR must follow:

- `pnpm check` (format, lint, types) and the tests for the change must pass before a commit. `pnpm test` stays fast, with no real waits and no spawned processes. Tests that spawn processes go in `test/e2e` (`AGENTS.md:106`).
- No compatibility shims or speculative fallbacks. Commit tests for a feature's core path and one regression test for each bug that happened. Prove edge cases once and show the command and its output (`AGENTS.md:119-123`).
- `bin/` is the supervisor: "Keep it tiny and change it rarely" (`AGENTS.md:64`).
- Plain TypeScript, ESM, erasable syntax only, relative imports end in `.ts` (`AGENTS.md:102-103`).
- Docs and code use generic names and examples, never a real person, machine, or private repository (`AGENTS.md:96-98`).

`CONTRIBUTING.md` sets no size limit. The PRs that were merged are small. Measured with `gh` on 2026-11-08: 59 merged, 82 closed without a merge, and 22 open. All 59 merged PRs came from outside authors. Of the latest 20 merged, most change 2 to 5 files and add fewer than 150 lines.

I expect a clear-cut fix to a doc or a bug to have a fair chance of a merge. A change that exists to serve a third-party tool, or that adds a flag or a lock field, will most likely stay open as a reference (inferred from `CONTRIBUTING.md:10-13` and `README.md:7-8`).

## Summary

| PR | Value to Hub | Value to Ultimate's users | Chance of a merge | Recommendation |
| --- | --- | --- | --- | --- |
| 1. Launcher and start time in `ultimate.lock` | Small | None | Low | Hold. Do not propose now. |
| 2. Start flag that holds resumed work | None. Ultimate already does it. | None | Very low | Drop. |
| 3. Find `claude` without `PATH` | None. Hub already sets `PATH`. | Small, and the code is in another repository | Very low | Drop for Ultimate. |
| 4. README fix for pnpm 11 | None | Every new user | High | Propose. |

Each chance of a merge is a guess, based on the terms above.

## PR 1: launcher and start time in `ultimate.lock`

### Problem

The supervisor writes `ultimate.lock` with three fields: `pid`, `port`, and `project` (`bin/ultimate.ts:75-79`, then again after the port is bound at `bin/ultimate.ts:213`).

To start an Ultimate again, Hub needs the Node binary and the entry file. It derives them from the running supervisor (`src/main/ultimate.ts:240-249`):

- `node` is the first `txt` path from `lsof -d txt` (`src/main/ultimate.ts:194-197`).
- `entry` comes from `ps -o args=`, resolved against the `cwd` from `lsof -d cwd`, and split at the first space that gives a file that exists (`entryOf`, `src/main/ultimate.ts:214-223`).

For the process identity, Hub reads `LC_ALL=C ps -o uid=,lstart=` (`src/main/ultimate.ts:187-192`). `verifySupervisor` (`src/main/ultimate.ts:199-208`), `signalSupervisor` (`src/main/ultimate.ts:251-257`), and `exited` (`src/main/ultimate.ts:260-262`) compare that start string.

The lifecycle design calls the `ps` and `lsof` parsing "the most fragile part of this design". It works today from a pnpm shim start and from `pnpm start` (measured on 2026-11-07, in the design's "Measured answers" table).

### Proposed change

The lock gets two fields:

```ts
// ultimate.lock, written by bin/ultimate.ts
type SupervisorLock = {
	pid: number
	port: number
	project: string
	node: string // process.execPath
	entry: string // join(ultimateRoot, 'bin/ultimate.ts')
}
```

`ultimateRoot` comes from `import.meta.url` (`bin/ultimate.ts:22`). Node resolves symlinks for the main module, so `entry` is the clone's real path, not the pnpm shim's path. Measured with a fake package of the same shape under a pnpm 11 shim: `process.argv[1]` gave the path inside the pnpm global folder, `import.meta.url` gave the real folder, and `process.execPath` gave the real fnm Node binary.

The start time is left out. Hub needs the start of the process that holds the PID now, at each check, and only `ps` gives that. A start value in the lock would add nothing that the existing check does not give. Hub already proves the lock's PID by finding it as the listener on the lock's port (`src/main/ultimate.ts:202-203`). The start value also has a format problem. Ultimate's `identify()` runs `ps -o lstart=` with the user's locale (`lib/process-group.ts:28-31`). Measured: `LC_ALL=C` and `en_US.UTF-8` give `Sun Nov  8 07:55:58 2026`, but `de_DE.UTF-8` gives `So.  8 Nov. 07:55:58 2026`. A value written in one locale does not match a read in another.

File changes:

- `bin/ultimate.ts`: build the lock value once, with `node` and `entry`, and pass it to `acquireLock` (`:75-79`) and `lock.update` (`:213`).
- `server/lock.ts`: add `node?: string; entry?: string` to the value types of `readOwner` (`:60`) and `acquireLock` (`:72`).
- `docs/running.md`: one sentence after `:3` that says the lock names the Node binary and the entry.
- `test/e2e/supervisor-process.test.ts`: the exact lock check at `:152-156` gets the two fields.

### Compatibility

- `readOwner` returns the parsed JSON as it is (`server/lock.ts:61-64`). Its callers read only `pid`, `port`, and `project`: the project list (`server/project.ts:52-63`), the window open on a second start (`bin/ultimate.ts:81-82`), and `pnpm reset` (`scripts/reset.ts:84`). They ignore the new fields (inferred).
- `ultimate.projects()` exposes only `running: { pid, url }` (`server/project.ts:61-63`), so the paths do not reach codemode (inferred).
- `storage.lock` uses a different call (`server/harness.ts:225-227`) and does not change.
- Older Hubs read only three fields (`parseLock`, `src/main/ultimate.ts:19-25`), so they ignore the new fields (inferred).

### Tests

One e2e assertion, in Ultimate's style. `test/e2e/supervisor-process.test.ts:144` already starts a real supervisor and checks the exact lock with `toEqual`. Add `node: process.execPath` and `entry: join(first.ultimateRoot, 'bin/ultimate.ts')` to that object. No fast test is needed, because only the supervisor writes the lock.

### What Hub changes if it lands

`parseLock` reads `node` and `entry` when both are absolute strings. `readLauncher` uses them when they are present and `verifyLauncher` (`src/main/ultimate.ts:225-237`) accepts them. Otherwise it uses the current `lsof` and `ps` path.

Hub keeps the current path. The owner's clones may be at an older commit, and `CONTRIBUTING.md:20-21` says the author may remove the fields later without notice. So Hub adds about 10 lines and removes none. Hub could drop the fallback only if it refused to pause an Ultimate without the fields. That would be a regression for older clones.

### Risks

- The value to Hub is small. The current derivation works and was measured from both start paths. The lock fields would only matter if a pnpm or Node change broke `entryOf`.
- `bin/` changes need a manual restart (`AGENTS.md:64`), and the author wants `bin/` small. This is a reason to decline the PR (inferred).
- A user who starts Node with flags, such as `node --max-old-space-size=… bin/ultimate.ts`, loses them on Play. That is true today too, because Hub's `startSupervisor` passes no flags (`src/main/ultimate.ts:291-302`). `process.execArgv` would carry them. Measured: `node --no-warnings` gives `execArgv: ["--no-warnings"]`.

### Questions for the author

1. Is `ultimate.lock` a format that outside tools may read, or private to Ultimate?
2. Should the lock also hold `process.execArgv`?
3. Would you prefer the launcher in a separate file in the home, so that the lock stays a lock?

### Size

About 12 lines in 4 files (guess, from the file changes above).

## PR 2: a start flag that holds resumed work

### Problem

When Ultimate starts again, it resumes interrupted runs from their last checkpoint (`docs/durability.md:4-6`). Measured on 2026-11-07: after a stop during a `hold-turn`, the restarted instance sent the same request to the scripted model again. The owner accepted this on 2026-11-07, and Hub's pause warning says it (`src/main/lifecycle.ts:12-13`).

The candidate was a flag, such as `--hold-resumed`, built on the patched `Harness.hold()`.

### Ultimate already does this

Ultimate's built-in `pause` extension holds the scheduler, and the hold survives a restart:

- The pause is stored in the root's `pause.state` document and "survives a restart: the `onOpen` callback holds the scheduler again before the server resumes scheduling" (`extensions/pause/README.md:6`).
- The code does this in `onOpen` (`extensions/pause/server.ts:414-426`).
- The hold uses the patched scheduler. A held task starts no run, and a running one parks as `pending` at its next phase boundary (`patches/@earendil-works__pi-durable@1.5.0.patch:249-256`, `:264-265`, `:282-286`).
- `pause` and `play` are user-only actions. Codemode refuses them, but "the HTTP path still calls them" (`extensions/pause/server.ts:471-480`, `extensions/README.md:640-648`).

Measured twice on 2026-11-08, with the same result each time:

1. A scripted Ultimate started a `hold-turn`. Status said `busy: 1`, and the model had 1 `hold-turn` request.
2. `POST /api/extensions/pause/actions/pause` answered `paused: true`, with the running model response listed.
3. `SIGTERM` to the supervisor. All its processes were gone in 439 ms and 344 ms.
4. A new start of the same project. 8 seconds after the status action answered, the model still had 1 request, status said `busy: 1`, and the pause state said `paused: true`.
5. `POST /api/extensions/pause/actions/play`. The model then got the request a second time, and the turn finished.

So a flag adds nothing that Ultimate does not already do. The author has said, "I don't want to maintain code I don't need" (`CONTRIBUTING.md:12`).

### Proposed change

None. Drop this PR.

### What Hub could do instead

This is a Hub decision, not an upstream one. The owner already chose resume on 2026-11-07, so nothing changes unless the owner wants to revisit it.

If the owner wants Play to start with work held, Hub could call Ultimate's `pause` action before it sends `SIGTERM`. After Play, the instance stays paused until the user presses **Play** in Ultimate's status line (`extensions/pause/README.md:30`), or until Hub calls `play`. That is about 15 lines in `src/main/ultimate.ts` and `src/main/lifecycle.ts` (guess). If the action fails, for example because the user turned the optional extension off (`extensions/pause/api.ts:8-9`), Hub would stop without it. I did not measure what the HTTP path returns for a disabled extension.

The owner would need to decide these points first:

- The anti-goals say the app never changes "an Ultimate's code, settings, or project files". The pause writes a document to Ultimate's state database. It is none of those three, and it is the same action as the user's own Pause button. But it does change the Ultimate's state.
- Hub's **Pause** stops the server. Ultimate's **Pause** holds the scheduler. Two meanings of one word in one window can confuse.
- A held instance reports `busy: 1` (measured), so Hub's status lists would show it as working. Ultimate's pause also holds new messages and automations until Play (`extensions/pause/README.md:1`, `:23`).

### Size

Zero lines upstream.

## PR 3: finding `claude` without `PATH`

### Problem

An app opened from Finder has `PATH=/usr/bin:/bin:/usr/sbin:/sbin` (measured on 2026-11-07, in the lifecycle design). The Claude Code provider looks for `claude` on `PATH`. The design doc cites `docs/pi-upstream.md`, which records that a missing auth answer once moved `@ultimate` "onto a paid API key while Claude Code was logged in" (`docs/pi-upstream.md:4`).

Hub reads the login shell's `PATH` once and gives it to each Ultimate that it starts (`readLoginPath` and `launchPath`, `src/main/ultimate.ts:264-288`, used by `startSupervisor` at `:293`).

### What the code shows

- The lookup is not in Ultimate. It is in the `@earendil-works/pi-claude-code` package, which Ultimate pins to one commit (`extensions/claude-code/README.md:7`). `resolveClaudeExecutable` uses `PI_CLAUDE_CODE_COMMAND` if set, else searches `PATH` for `claude` (`node_modules/@earendil-works/pi-claude-code/src/claude-cli.ts:83-117`).
- An override already exists. `PI_CLAUDE_CODE_COMMAND` selects the executable (`extensions/claude-code/README.md:9`), and the install hint names it (`pi-claude-code/src/claude-cli.ts:24-26`).
- The paid-key incident came from a status with no answer, which was read as "logged out". Ultimate's patch now treats that as unknown (`docs/pi-upstream.md:4`), and the provider keeps its last confirmed login (`pi-claude-code/src/provider.ts:54-60`).
- A missing `claude` is a definite answer. The provider then reports no login, and Pi hides its models (`pi-claude-code/src/provider.ts:61-65`). Ultimate's model fallback then refuses to move a subscription to a pay-per-token login: "A subscription never switches to a pay-per-token login: then nothing replaces it, the conversation keeps its model and the entry asks the user" (`extensions/models/fallback.ts:1-5`, `extensions/models/README.md:7`). So the paid-key risk is closed in Ultimate (inferred from the code). I did not measure it, because a test would need a real Claude Code login.
- Ultimate's own service installer solves the `PATH` problem the same way Hub does. It reads the interactive login shell's `PATH` and writes it into the systemd unit and the launchd agent (`scripts/setup-machine.ts:87-117`, `:137-147`). Its test is named "puts the login shell's PATH first, so a bare service PATH still finds claude, gh and pnpm" (`test/setup-machine.test.ts:49`).

### Proposed change

None in Ultimate. A change to the lookup would be a new patch to a pinned package. Ultimate tracks each such patch and drops it when the package's own repository ships the fix (`docs/pi-upstream.md:4`, `:40`). A fallback search of common install folders belongs in `earendil-works/pi-claude-code`, not in Ultimate. Which folders to search depends on how users install Claude Code (guess).

### What Hub changes

Nothing. Hub's login shell `PATH` already covers Hub.

### Size

Zero lines in Ultimate.

## PR 4: README fix for pnpm 11

### Problem

Ultimate pins pnpm 11.8.0 (`package.json:66`). Its docs tell users to run `pnpm link --global` in three places:

- the setup prompt that users paste into an agent (`README.md:58-59`),
- the install commands (`README.md:86`),
- `docs/running.md:4`.

pnpm 11.8 rejects it. Measured with a temporary `HOME` and `PNPM_HOME`:

```text
$ pnpm link --global
[ERR_PNPM_LINK_BAD_PARAMS] You must provide a parameter. Usage: pnpm link <dir>
```

`pnpm link` with no argument gives the same error. `pnpm help link` shows only `pnpm link <dir>`, which links a package into the current project, not into the global bin. Upstream `main` at `7c5a2b17` still has all three lines (measured with `gh api` on 2026-11-08). No open or closed PR mentions it (measured with `gh pr list --search` on 2026-11-08).

### Proposed change

Replace `pnpm link --global` with `pnpm add -g .` in all three places:

- `README.md:58-59`: "run `pnpm install`, then `pnpm add -g .` so I get the `ultimate` command; if pnpm's global bin is not on my PATH yet, `pnpm setup` adds it."
- `README.md:86`: `pnpm add -g .        # once, in this clone, to get the ultimate command (pnpm setup first if pnpm's global bin is not on PATH)`
- `docs/running.md:4`: "Run `pnpm add -g .` once in the clone, then `cd ~/Projects/app && ultimate`."

Measured on pnpm 11.8.0, with a fake package of the same shape (`"name": "ultimate"`, `"private": true`, `"bin": { "ultimate": "bin/ultimate.ts" }`, `"type": "module"`):

- `pnpm add -g .` records `"ultimate": "link:<folder>"` in the global `package.json` and makes `node_modules/ultimate` a symlink to the folder.
- The shim is `$PNPM_HOME/bin/ultimate`. It runs the folder's `bin/ultimate.ts`, and an edit to that file takes effect on the next run. So a clone that updates itself keeps working.
- It writes nothing into the folder. With a `file:` dependency in the package, no `node_modules` folder appeared there.
- `pnpm remove -g ultimate` removes it.
- With `$PNPM_HOME/bin` not on `PATH`, every global command stops with "The configured global bin directory … is not in PATH. Run "pnpm setup"". So the `pnpm setup` hint stays correct.

### Tests

None. It is a doc change. The PR body shows the commands and their output, as `AGENTS.md:121-123` asks.

### What Hub changes

Nothing. Hub's launcher does not use the shim.

### Risks

- I did not run `pnpm add -g .` on a real Ultimate clone. I used a fake package so that nothing could write into the clone.
- I did not read the pnpm 11 web docs. The replacement comes from `pnpm help link` and the experiment.
- I did not test pnpm 10 or pnpm 12. Ultimate pins 11.8.0, so 11 is the version that matters (inferred).

### Questions for the author

1. Do you want the install to stay a link to the clone? `pnpm add -g .` keeps that.

### Size

3 lines in 2 files.

## Recommendation

1. **Propose PR 4 now.** It fixes a command that fails for every new user on the pnpm version that Ultimate pins. It is a clear-cut fix, the kind the author merges (`CONTRIBUTING.md:10-11`). Title it as a plain fix, not `Feature: …`, and put the measured commands in the body.
2. **Drop PR 2.** Ultimate's pause extension already holds resumed work across a restart, and I measured it. Whether Hub should use that pause is an owner decision about Hub. See [What Hub could do instead](#what-hub-could-do-instead).
3. **Drop PR 3 for Ultimate.** The lookup is in another repository. An override already exists. Ultimate's fallback rules already block the move to a paid key. Ultimate's own installer uses the same `PATH` fix as Hub. Ultimate's users who start from a terminal do not have the problem.
4. **Hold PR 1.** Its value to Hub is small, because the current derivation works and Hub must keep it anyway. The start time part has no value. Revisit PR 1 only if a pnpm or Node change breaks `entryOf`, and then propose it as a reference, with no expectation of a merge.

## Side findings for Hub

These are not upstream changes. They are for the owner to consider.

- Hub reads `PATH` with `$SHELL -l -c` and takes the last line (`src/main/ultimate.ts:279-283`). Ultimate's installer uses `-lic` and a marker line, because "many setups (mise activate, PNPM_HOME) extend PATH only in the rc file" (`scripts/setup-machine.ts:107-112`). The lifecycle design lists `.zshrc` as a known gap. Matching Ultimate's method would close it, but an interactive shell can print noise or wait for input.
- `ps -o lstart=` depends on the locale (measured). Hub sets `LC_ALL=C` for every read (`src/main/ultimate.ts:188`), so Hub's own comparisons are consistent (inferred).
