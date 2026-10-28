#!/bin/sh
set -eu
runtime_dir=$(CDPATH= cd "$(dirname "$0")" && pwd)
case "$(uname -m)" in
  x86_64|amd64) architecture=amd64 ;;
  aarch64|arm64) architecture=arm64 ;;
  *) printf '%s\n' 'This Linux package supports x86_64 and arm64.' >&2; exit 1 ;;
esac
exec "$runtime_dir/costbreakdown-linux-$architecture" --start "$@"