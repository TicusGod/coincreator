#!/usr/bin/env bash
# Commit the current state. Run at the END of every agent session, and before touching
# anything after Codex (or anyone) edited the project.
#
#   ops/snapshot.sh "what changed"
. "$(dirname "$0")/_lib.sh"
cd "$ROOT"
if [ ! -d .git ]; then git init -q && ok "git initialised"; fi
[ -f .gitignore ] || die "no .gitignore — refusing to commit (keys/env could leak)"
git add -A
if git diff --cached --quiet; then info "nothing to snapshot"; exit 0; fi
# refuse obvious secrets
if git diff --cached --name-only | grep -Ei '(^|/)\.env($|\.)|\.pw$|keypair|id\.json$' | grep -v '\.env\.example$'; then
  git reset -q; die "secret-looking files staged (above) — add them to .gitignore"; fi
git commit -qm "snapshot: ${1:-$(date '+%Y-%m-%d %H:%M')}"
ok "snapshot $(git rev-parse --short HEAD): ${1:-}"
