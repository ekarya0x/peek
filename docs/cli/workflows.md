# Peek Workflows

Practical flows that showcase how Peek removes friction.

- **Interrupt fix:** `peek s hotfix-<name>` to isolate urgent fixes without touching your WIP, then `peek sw <wip>` to return—no stash/pop conflicts.
- **Side-by-side compare:** Rapid toggle with `peek sw -` to visually diff behavior (animations, UI tweaks) without reloads.
- **AI audit sandbox:** `peek s agent/<branch>` to inspect and test AI-generated changes; discard safely with `peek discard` if broken.
- **Risky merge rehearsal:** `peek s shadow/<branch>` and merge PR code there; resolve conflicts and run suites before promoting via `peek save`.
- **Framework upgrade trial:** `peek s react-<version>` (or similar), install upgraded deps in isolation, then compare against main running in parallel ports.
- **Client demo staging:** Pre-create `peek s demo-{1,2,3}` and switch live with `peek sw demo-2` etc. for instant stage shifts.
- **Full-stack sync:** With federation linked, `peek fed sw <session>` moves frontend/backend repos together for multi-repo features.
- **Context for AI:** `peek ctx src/...` to copy curated context honoring ignores; use `--output` for stdout when clipboard unavailable.
- **Housekeeping:** `peek clean` to prune stale sessions and reclaim space; `peek doctor` to self-heal orphaned worktrees/locks/state.
- **Recovery:** After `peek discard`, list recoverables with `peek recover` and apply specific stash IDs to any worktree.
