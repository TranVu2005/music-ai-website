#!/bin/sh
set -e

# Re-exec with bash if running under a non-bash shell (e.g. dash on Debian/Ubuntu)
# to support NUL-delimited reading (read -d '').
if [ -z "$BASH_VERSION" ] && command -v bash >/dev/null 2>&1; then
  exec bash "$0" "$@"
fi

MODE="default"
if [ "$1" = "--staged" ]; then
  MODE="staged"
fi

TMP_LIST=$(mktemp)
trap 'rm -f "$TMP_LIST"' EXIT INT TERM

if [ "$MODE" = "staged" ]; then
  git diff --cached --name-only --diff-filter=ACMR -z > "$TMP_LIST"
else
  git ls-files -z > "$TMP_LIST"
fi

FAILED=0
MAX_BYTES=15728640

while IFS= read -r -d '' FILE; do
  if [ ! -f "$FILE" ]; then
    continue
  fi

  IS_AUDIO=0
  case "$FILE" in
    *.[wW][aA][vV]|*.[fF][lL][aA][cC]|*.[mM][pP]3|*.[aA][iI][fF][fF]|*.[aA][iI][fF]|*.[mM]4[aA]|*.[aA][aA][cC]|*.[oO][gG][gG]|*.[oO][pP][uU][sS]|*.[wW][mM][aA])
      IS_AUDIO=1
      ;;
  esac

  if [ "$IS_AUDIO" -eq 1 ]; then
    case "$FILE" in
      public/audio/previews/*|assets/watermark/*)
        ;;
      *)
        echo "ERROR: Audio file outside allowed preview/watermark directories: $FILE" >&2
        FAILED=1
        ;;
    esac
  fi

  FILE_SIZE=$(wc -c < "$FILE" 2>/dev/null | tr -d '[:space:]')
  if [ -n "$FILE_SIZE" ] && [ "$FILE_SIZE" -gt "$MAX_BYTES" ]; then
    echo "ERROR: File exceeds 15MB limit ($FILE_SIZE bytes): $FILE" >&2
    FAILED=1
  fi
done < "$TMP_LIST"

if [ "$FAILED" -ne 0 ]; then
  exit 1
fi

exit 0
