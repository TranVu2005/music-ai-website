#!/bin/sh
set -e

MODE="default"
if [ "$1" = "--staged" ]; then
  MODE="staged"
fi

if [ "$MODE" = "staged" ]; then
  FILES=$(git diff --cached --name-only --diff-filter=ACMR)
else
  FILES=$(git ls-files)
fi

FAILED=0
MAX_BYTES=15728640

for FILE in $FILES; do
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
done

if [ "$FAILED" -ne 0 ]; then
  exit 1
fi

exit 0
