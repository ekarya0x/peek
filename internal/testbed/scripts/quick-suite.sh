#!/usr/bin/env bash
set -euo pipefail

ROOT="/tmp/peek-test"
REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PEEK_BIN="$REPO_ROOT/packages/cli/dist/index.js"
TARGET_WT="/tmp/peek/peek-test-1"

echo "=== Peek Quick Suite ==="
rm -rf "$ROOT"
mkdir -p "$ROOT"
cd "$ROOT"
export HOME="$ROOT"

cat > package.json <<'EOF'
{
  "name": "peek-quick-suite",
  "version": "0.0.0",
  "private": true
}
EOF
pnpm add -D @peektree/cli@link:"$REPO_ROOT/packages/cli" @peektree/vite-plugin@link:"$REPO_ROOT/packages/vite-plugin" vite >/dev/null
pnpm add react react-dom >/dev/null

cat > vite.config.ts <<'EOF'
import { defineConfig } from 'vite'
import peek from '@peektree/vite-plugin'
export default defineConfig({ plugins: [peek()] })
EOF

mkdir -p src
cat > src/main.tsx <<'EOF'
document.body.innerHTML = '<h1>Hello from quick suite</h1>'
EOF

cat > index.html <<'EOF'
<!DOCTYPE html>
<html><body><script type="module" src="/src/main.tsx"></script></body></html>
EOF

git init -q
git add -A
git commit -qm "init"

# Clean any stale worktree from prior runs
rm -rf "$TARGET_WT"

node "$PEEK_BIN" s test-1
node "$PEEK_BIN" ls | grep test-1 >/dev/null
node "$PEEK_BIN" sw .
node "$PEEK_BIN" doctor

echo "=== Quick suite complete ==="

