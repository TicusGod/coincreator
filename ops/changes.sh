#!/usr/bin/env bash
# What changed since the last snapshot (e.g. after a Codex session). Read this instead of
# re-reading the whole project, summarise it to the owner, then run ops/snapshot.sh.
#
#   ops/changes.sh            summary + per-area stats
#   ops/changes.sh full       full diff (web, contracts, program, backend)
. "$(dirname "$0")/_lib.sh"
cd "$ROOT"
[ -d .git ] || die "no git yet — run ops/snapshot.sh \"baseline\" first"
echo "last snapshot: $(git log -1 --format='%h %ar — %s')"
echo; echo "== files"; git status --short -uall | grep -v node_modules || info "nothing changed"
echo; echo "== by area"
for area in web contracts program backend keeper docs; do
  [ -d "$area" ] || continue
  n=$(git status --short -uall -- "$area" | grep -vc node_modules || true)
  [ "$n" = 0 ] || echo "$area: $n files"
done
git diff --stat | tail -1
if [ "${1:-}" = full ]; then git diff; git ls-files --others --exclude-standard | grep -v node_modules | while read -r f; do echo "+++ new: $f"; done; fi
