#!/usr/bin/env bash
# Scans every commit on every fetched ref for secrets with gitleaks. Used by site-ci.yml and
# site-watch.yml (check out with fetch-depth: 0). The binary is pinned by version and SHA-256, so
# no third-party action runs. Dependabot cannot see this pin: bump both values together when
# docs/maintenance.md says so (checksums: the release's gitleaks_<version>_checksums.txt).
set -euo pipefail
VERSION=8.30.1
SHA256=551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb
tmp=$(mktemp -d)
curl -sSfL -o "$tmp/gitleaks.tgz" \
  "https://github.com/gitleaks/gitleaks/releases/download/v${VERSION}/gitleaks_${VERSION}_linux_x64.tar.gz"
echo "${SHA256}  $tmp/gitleaks.tgz" | sha256sum -c -
tar -xzf "$tmp/gitleaks.tgz" -C "$tmp" gitleaks
"$tmp/gitleaks" git --log-opts="--all" --redact --no-banner .
