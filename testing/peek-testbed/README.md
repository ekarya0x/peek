# Peek Testbed

Purpose-built sandbox to exercise **all** peek packages together and capture reliable screenshots. The testbed is isolated from the main workspace, uses local package links, and mirrors the deep testing flows we expect to run before releases.

## Layout
- Root workspace: `pnpm-workspace.yaml` with two apps under `apps/`
  - `apps/vite-app`: Vite + React + `@peektree/vite-plugin` + `@peektree/banner`
  - `apps/next-app`: Next 14 (App Router) + `@peektree/next-plugin` + `@peektree/banner`
- Uses `link:` deps pointing to `../../packages/*` so you always test current source. Build the packages first (`pnpm build` at repo root) to ensure fresh dist output.

## Quick Start (one-time)
```bash
# from repo root
pnpm build                     # builds workspace packages for linking
cd testing/peek-testbed
pnpm install                   # installs + links local packages
pnpm dev:vite                  # start Vite app (http://localhost:5173)
pnpm dev:next                  # start Next app (http://localhost:3000)
```

Take baseline screenshots from both apps: main view, toggled view after a switch, and banner render.

## Deep Testing Guide (expanded)
Use `/tmp/peek-test` as the disposable target for CLI-driven flows. The commands below assume the Vite dev server is running from `apps/vite-app`.

### 1) Fresh project scaffold
```bash
cd /tmp
rm -rf peek-test
mkdir peek-test && cd peek-test
pnpm init -y
pnpm i react react-dom vite
pnpm i -D @peektree/cli @peektree/vite-plugin
cat > vite.config.ts <<'EOF'
import { defineConfig } from 'vite'
import peek from '@peektree/vite-plugin'
export default defineConfig({ plugins: [peek()] })
EOF
mkdir src
cat > src/main.tsx <<'EOF'
document.body.innerHTML = '<h1>Hello from main</h1>'
EOF
cat > index.html <<'EOF'
<!DOCTYPE html>
<html><body><script type="module" src="/src/main.tsx"></script></body></html>
EOF
git init && git add -A && git commit -m "initial"
pnpm vite --host --port 5173 &
```

### 2) Switch + live reload
```bash
cd /tmp/peek-test
pnpm peek s experiment
echo "document.body.innerHTML = '<h1>Hello from EXPERIMENT</h1>'" > /tmp/peek/peek-experiment/src/main.tsx
```
Expected: browser hot-reloads to "Hello from EXPERIMENT" in <100ms.

### 3) Toggle speed check
```bash
pnpm peek sw .
pnpm peek sw -
pnpm peek sw -
pnpm peek sw .
```
Measure: toggles stay under 100ms and browser updates instantly.

### 4) Save flow
```bash
pnpm peek sw experiment
echo "// new feature" >> /tmp/peek/peek-experiment/src/main.tsx
git -C /tmp/peek/peek-experiment add -A && git -C /tmp/peek/peek-experiment commit -m "add feature"
pnpm peek save
```
Expected: experiment merged into main, worktree removed, main restored.

### 5) Discard flow
```bash
pnpm peek s throwaway
echo "// bad code" >> /tmp/peek/peek-throwaway/src/main.tsx
pnpm peek discard -f
```
Expected: worktree gone; main untouched.

### 6) List, status, leaderboard
```bash
pnpm peek s agent-1
pnpm peek s agent-2
pnpm peek s agent-3
pnpm peek ls
pnpm peek st
for agent in agent-1 agent-2 agent-3; do
  cd /tmp/peek/peek-$agent
  echo "// work" >> src/main.tsx
  git add -A && git commit -m "work"
  cd /tmp/peek-test
done
pnpm peek lb
```
Expected: lists all worktrees; leaderboard shows commit counts and save rates.

### 7) Diff + doctor + crash recovery
```bash
pnpm peek diff agent-1 agent-2 --stat
pnpm peek doctor
pnpm peek doctor --fix
pnpm peek s crash-test &
PID=$!; sleep 0.1; kill -9 $PID
pnpm peek doctor
pnpm peek ls
```
Expected: doctor cleans pending state; no corruption after crash.

### 8) Concurrency + context copy
Run `pnpm peek s concurrent-1` in terminal A while starting `pnpm peek s concurrent-2` in terminal B. The second waits/queues without corruption. Validate:
```bash
pnpm peek ctx          # copies project structure
pnpm peek ctx src/     # copies src/ only
pnpm peek ctx -o       # prints instead of copying
```

### 9) Shell completion + PEEK_NATIVE
```bash
eval "$(pnpm peek completion zsh)"
pnpm peek s <TAB>      # should show options
export PEEK_NATIVE=1
pnpm peek s native-test
pnpm peek ls           # shows metadata + tips
```

## App-specific checks
- **Vite app (`apps/vite-app`)**
  - `pnpm dev:vite`, open http://localhost:5173, verify banner renders and shows current branch labels (main vs experiment).
  - Toggle branches via CLI while server runs; confirm hot reload and banner updates text.
- **Next app (`apps/next-app`)**
  - `pnpm dev:next`, open http://localhost:3000, verify banner component renders.
  - Switch branches via CLI; ensure the page reflects branch text after reload.

## Quick script
`scripts/quick-suite.sh` runs a lean sanity sweep (start, list, switch, discard, doctor) against `/tmp/peek-test`. Use it before cutting screenshots:
```bash
cd testing/peek-testbed
./scripts/quick-suite.sh
```

## Screenshot checklist
- Vite main + experiment view (with banner)
- Next main + experiment view (with banner)
- `peek ls`, `peek lb`, and `peek diff` terminal shots
- Doctor output after crash recovery

Keep the sandbox disposable. Delete `/tmp/peek-test` and rerun the quick script before every release cut to avoid stale state.

