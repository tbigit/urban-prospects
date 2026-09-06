#!/usr/bin/env bash
# Deploy the demo film ladder to the webroot, separately from the site build.
# The ladder is git-ignored (web/static/media/demo/) and only changes when the film is re-cut.
#
#   web/deploy/deploy-media.sh            # ships web/static/media/demo -> /opt/www/upweb/media/demo
#
# The server has no rsync, hence tar over ssh. AppleDouble (._*) files are excluded.
set -euo pipefail
HOST=${HOST:-root@143.42.46.116}
ROOT=${ROOT:-/opt/www/upweb}
DIR=${1:-demo}
SRC="$(cd "$(dirname "$0")/.." && pwd)/static/media/$DIR"
[ -f "$SRC/master.m3u8" ] || { echo "no master.m3u8 in $SRC (run the film-ladder encode first)"; exit 1; }
echo "→ $SRC → $HOST:$ROOT/media/$DIR"
tar czf - --exclude='._*' --exclude='.DS_Store' -C "$SRC" . | ssh "$HOST" "set -e; mkdir -p $ROOT/media/$DIR.new && tar xzf - -C $ROOT/media/$DIR.new && rm -rf $ROOT/media/$DIR && mv $ROOT/media/$DIR.new $ROOT/media/$DIR && du -sh $ROOT/media/$DIR"
