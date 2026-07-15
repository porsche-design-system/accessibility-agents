package webaudit

import (
	"os"
	"path/filepath"
	"testing"
)

func TestResolveSourceRootFromExplicitPath(t *testing.T) {
	root := t.TempDir()
	writeBundleFixture(t, root)

	got, err := ResolveSourceRoot(root)
	if err != nil {
		t.Fatalf("ResolveSourceRoot() error = %v", err)
	}
	if got != root {
		t.Fatalf("ResolveSourceRoot() = %q, want %q", got, root)
	}
}

func TestResolveSourceRootWalksUpFromNestedDirectory(t *testing.T) {
	root := t.TempDir()
	writeBundleFixture(t, root)
	nested := filepath.Join(root, "go-cli", "bin")
	if err := os.MkdirAll(nested, 0o755); err != nil {
		t.Fatalf("MkdirAll() error = %v", err)
	}
	t.Chdir(nested)

	got, err := ResolveSourceRoot("")
	if err != nil {
		t.Fatalf("ResolveSourceRoot() error = %v", err)
	}
	if got != root {
		t.Fatalf("ResolveSourceRoot() = %q, want %q", got, root)
	}
}

func writeBundleFixture(t *testing.T, root string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Join(root, "scripts"), 0o755); err != nil {
		t.Fatalf("MkdirAll() error = %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "scripts", "web-audit-bundle.json"), []byte(`{"schemaVersion":"1.0","bundleVersion":"1.0.0","files":{}}`), 0o644); err != nil {
		t.Fatalf("WriteFile(bundle) error = %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "install-web-audit.sh"), []byte("#!/bin/bash\n"), 0o644); err != nil {
		t.Fatalf("WriteFile(installer) error = %v", err)
	}
}
