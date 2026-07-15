# Web Audit Bundle Releases

The focused web audit bundle is versioned independently from the main Accessibility Agents release line. Product teams pin installs and updates to these tags for predictable rollouts.

## Version source

The canonical version lives in [`scripts/web-audit-bundle.json`](../../scripts/web-audit-bundle.json):

```json
{
  "bundleVersion": "1.0.0"
}
```

Release tags use the format:

```text
web-audit-bundle/1.0.0
```

The tag name suffix must match `bundleVersion`.

## Create a release tag (maintainers)

From a clean checkout on the branch that contains the intended bundle:

```bash
bash scripts/tag-web-audit-bundle.sh
```

Dry run:

```bash
bash scripts/tag-web-audit-bundle.sh --dry-run
```

Push the tag:

```bash
git push origin web-audit-bundle/1.0.0
```

## Consumer pinning

Install or update from a specific tag:

```bash
bash install-web-audit.sh \
  --target /path/to/web-product \
  --with-config \
  --source-ref web-audit-bundle/1.0.0
```

Remote bootstrap with a pinned tag:

```bash
REF=web-audit-bundle/1.0.0
curl -fsSL "https://raw.githubusercontent.com/porsche-design-system/accessibility-agents/$REF/install-web-audit.sh" |
  bash -s -- --target /path/to/web-product --with-config --source-ref "$REF"
```

Verify what is installed in a product repository:

```bash
bash install-web-audit.sh --target /path/to/web-product --check
cat /path/to/web-product/.a11y-web-audit-install-summary.json
```

## Release checklist

1. Update agent, skill, or prompt files included in the allowlist.
2. Run `node scripts/validate-web-audit-bundle.js`.
3. Run `bash scripts/test-web-audit-installer.sh`.
4. Bump `bundleVersion` in `scripts/web-audit-bundle.json` when the allowlist or rendered output changes.
5. Update [CHANGELOG.md](../../CHANGELOG.md) with bundle release notes.
6. Run `bash scripts/tag-web-audit-bundle.sh` and push the tag.
7. Notify product teams to re-run install with `--force --source-ref web-audit-bundle/X.Y.Z`.

## CI validation

The workflow [`.github/workflows/web-audit-bundle-release.yml`](../../.github/workflows/web-audit-bundle-release.yml) validates bundle integrity when a `web-audit-bundle/*` tag is pushed.
