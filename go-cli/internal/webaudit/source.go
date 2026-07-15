package webaudit

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/Community-Access/accessibility-agents/go-cli/internal/system"
)

const bundleMarker = "scripts/web-audit-bundle.json"

func ResolveSourceRoot(explicit string) (string, error) {
	candidates := []string{}
	if explicit != "" {
		candidates = append(candidates, explicit)
	}
	if env := os.Getenv("A11Y_AGENTS_SOURCE_ROOT"); env != "" {
		candidates = append(candidates, env)
	}
	if exe, err := os.Executable(); err == nil {
		if root, err := findBundleRoot(filepath.Dir(exe)); err == nil {
			candidates = append(candidates, root)
		}
	}
	if cwd, err := os.Getwd(); err == nil {
		if root, err := findBundleRoot(cwd); err == nil {
			candidates = append(candidates, root)
		}
	}

	seen := map[string]bool{}
	for _, candidate := range candidates {
		clean := filepath.Clean(candidate)
		if seen[clean] {
			continue
		}
		seen[clean] = true
		if err := validateSourceRoot(clean); err == nil {
			return clean, nil
		}
	}

	return "", errors.New("accessibility-agents source root not found; pass --source-root or set A11Y_AGENTS_SOURCE_ROOT")
}

func findBundleRoot(start string) (string, error) {
	current := start
	for {
		if system.FileExists(filepath.Join(current, bundleMarker)) {
			return current, nil
		}
		parent := filepath.Dir(current)
		if parent == current {
			return "", errors.New("bundle marker not found")
		}
		current = parent
	}
}

func validateSourceRoot(root string) error {
	if root == "" {
		return errors.New("empty source root")
	}
	info, err := os.Stat(root)
	if err != nil {
		return err
	}
	if !info.IsDir() {
		return fmt.Errorf("source root is not a directory: %s", root)
	}
	if !system.FileExists(filepath.Join(root, bundleMarker)) {
		return fmt.Errorf("missing %s under %s", bundleMarker, root)
	}
	if !system.FileExists(filepath.Join(root, "install-web-audit.sh")) {
		return fmt.Errorf("missing install-web-audit.sh under %s", root)
	}
	return nil
}
