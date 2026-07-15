package webaudit

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/Community-Access/accessibility-agents/go-cli/internal/system"
)

type InstallOptions struct {
	TargetDir  string
	SourceRoot string
	WithConfig bool
	Force      bool
	DryRun     bool
	AssumeYes  bool
}

func Install(opts InstallOptions) ([]string, error) {
	if runtime.GOOS == "windows" {
		return nil, errors.New("web-audit bundle install supports macOS and Linux only; use install-web-audit.sh from Git Bash or WSL")
	}
	if strings.TrimSpace(opts.TargetDir) == "" {
		return nil, errors.New("target directory is required")
	}
	targetDir, err := filepath.Abs(opts.TargetDir)
	if err != nil {
		return nil, err
	}
	if info, err := os.Stat(targetDir); err != nil || !info.IsDir() {
		return nil, fmt.Errorf("target directory does not exist: %s", targetDir)
	}

	sourceRoot, err := ResolveSourceRoot(opts.SourceRoot)
	if err != nil {
		return nil, err
	}

	node := system.CheckCommand("node", true, "-v")
	if !node.Available {
		return nil, errors.New("Node.js 18 or newer is required for web-audit bundle install")
	}
	bash := system.CheckCommand("bash", true, "--version")
	if !bash.Available {
		return nil, errors.New("bash is required for web-audit bundle install")
	}

	installer := filepath.Join(sourceRoot, "install-web-audit.sh")
	args := []string{installer, "--target", targetDir}
	if opts.WithConfig {
		args = append(args, "--with-config")
	}
	if opts.Force {
		args = append(args, "--force")
	}
	if opts.DryRun {
		args = append(args, "--dry-run")
	}
	if opts.AssumeYes {
		args = append(args, "--yes")
	}

	summary := []string{
		fmt.Sprintf("source root: %s", sourceRoot),
		fmt.Sprintf("target directory: %s", targetDir),
	}
	if opts.DryRun {
		summary = append(summary, "mode: dry run")
	}
	if err := system.RunCommand(sourceRoot, bash.Path, args...); err != nil {
		return summary, fmt.Errorf("web-audit bundle install failed: %w", err)
	}
	summary = append(summary, "web-audit bundle install completed")
	return summary, nil
}
