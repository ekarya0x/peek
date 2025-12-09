# Peek Workflows

Real-world scenarios that showcase how Peek eliminates friction from your development workflow.

## The Interrupt

You're 3 hours into a refactor. Slack pings: "Production is down."

**Without Peek:**
```bash
git stash -u
git checkout main
git pull
npm install
npm run dev          # 45s later...
# Fix bug
git checkout feature-auth
git stash pop        # CONFLICT!
```

**With Peek:**
```bash
peek s hotfix-checkout    # 91ms - fresh workspace, ready
# Fix bug
peek save                 # merge to main, cleanup
peek sw feature-auth      # back to your refactor, untouched
```

---

## The AI Audit

Your coding agent just pushed 47 files to `agent/refactor-database`. It claims tests pass. You've been burned before.

```bash
peek s agent/refactor-database   # isolated sandbox
npm test                          # actually broken
peek discard                      # gone, no trace in main
```

Your main workspace never knew it existed.

---

## The Side-by-Side Compare

Which animation timing feels better? Your memory is unreliable.

```bash
peek sw -    # toggle to previous
peek sw -    # toggle back
peek sw -    # toggle again
```

The browser doesn't reload. The modal just switches. Compare in real-time.

---

## The Risky Merge

A 3-week PR needs to merge. The author is on vacation. No one wants to be the merge button hero.

```bash
peek s shadow-payments
git merge origin/feature/payments-overhaul
# Resolve conflicts safely here
npm test
# If broken: peek discard
# If working: peek save --push
```

Main is never touched until you're certain.

---

## The Framework Upgrade Trial

React 19 just dropped. PM wants to know if the upgrade is "a big deal."

```bash
peek s react-19-test
npm install react@19 react-dom@19
npm run dev
```

Split screen: main on left (React 18), experiment on right (React 19, on fire). Take notes. Close experiment.

---

## The Live Demo

You're on a Zoom call. Client wants to see Option A and Option B. They want to toggle between them.

```bash
# Before call:
peek s demo-blue
peek s demo-red

# During call:
peek sw demo-blue    # "Here's blue..."
peek sw demo-red     # "And here's red..."
peek sw demo-blue    # "Back to blue..."
```

Instant. Silent. Professional.

---

## Full-Stack Sync

Building a feature that spans frontend and backend repos? Link them:

```bash
peek fed link backend ../api-repo
peek fed sw feature-x    # switches both repos together
```

One command. Both repos move. Both servers update.

---

## Context for AI

Feed your LLM the right context:

```bash
peek ctx src/components src/types
# Copies formatted code to clipboard (14 files, 8.2KB)
```

Respects `.gitignore`. Formats as markdown. No node_modules pollution.

---

## Housekeeping

It's been three weeks. You have 8 stale worktrees from merged PRs.

```bash
peek clean
# Removed 5 stale sessions
# Pruned git references  
# Reclaimed 1.2GB
```

---

## Recovery

You discarded a session but realized you needed that one file:

```bash
peek recover
# Lists: feature-experiment (2 hours ago, 3 files)

peek recover --apply stash-abc123
# Applied to current worktree
```

Discarded work is stashed, not deleted. Recoverable for 30 days.

---

## Metrics

Is Peek actually saving time?

```bash
peek metrics --week
# Switches: 147
# Avg switch time: 89ms
# Time saved: ~1.8 hours
```

Real data. Real ROI.
