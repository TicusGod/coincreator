# COPYCAT

Chain: solana · created 2026-10-06 from `read before build/playbook/templates/project-kit`.

Truth: `docs/00_BRIEF.md` (what) · `docs/01_STATUS.md` (where we are).

## Ops — one command each (details: `read before build/playbook/guides/OPS_AUTOMATION.md`)

| Owner asks | Command |
|---|---|
| "voici le CA, ajoute-le" / "supprime le CA" | `ops/site.sh ca <address>` / `ops/site.sh ca none` |
| "voici le Twitter" | `ops/site.sh x @handle` |
| "voici le logo" | `ops/site.sh logo <file>` |
| "mets en pause" / "remets en ligne" | `ops/site.sh status paused` / `ops/site.sh status live` |
| "push sur Vercel" | `ops/site.sh deploy` |
| "crée un wallet" / "envoie l'adresse à financer" | `ops/wallet.sh new deployer` → give the address only |
| "combien il faut envoyer ?" | `ops/estimate.sh` → paste the table |
| "récupère et envoie à X" | `ops/wallet.sh sweep <name> <address>` |
| "j'ai modifié avec Codex" | `ops/changes.sh` → summarise → `ops/snapshot.sh "codex UI"` |
| a key pasted in the chat | `printf %s "$V" \| ops/secrets.sh set <service> <KEY>` then `ops/secrets.sh use <service>` + `push` |
| "il manque quoi ?" | `ops/ready.sh` (or `--build`) → paste the table |
| converted to another chain | `ops/leftovers.sh <old chain>` |

End of every agent session: `ops/snapshot.sh "<summary>"`.
