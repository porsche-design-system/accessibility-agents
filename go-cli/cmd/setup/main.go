package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/Community-Access/accessibility-agents/go-cli/internal/app"
	"github.com/Community-Access/accessibility-agents/go-cli/internal/config"
	"github.com/Community-Access/accessibility-agents/go-cli/internal/hooks"
	"github.com/Community-Access/accessibility-agents/go-cli/internal/repo"
	"github.com/Community-Access/accessibility-agents/go-cli/internal/system"
	"github.com/Community-Access/accessibility-agents/go-cli/internal/webaudit"
)

func main() {
	role := flag.String("role", "developer", "installation role: developer, reviewer, author, full, custom, web-auditor")
	bundle := flag.String("bundle", "", "installation bundle: web-audit")
	scope := flag.String("scope", "global", "installation scope: global or project")
	teamConfigPath := flag.String("config", "", "optional path to team configuration JSON")
	platformsFlag := flag.String("platforms", "", "comma-separated platforms: vscode, claude, codex, gemini")
	hooksFlag := flag.Bool("hooks", false, "install repository pre-commit hook when inside a git repository")
	mcpPort := flag.Int("mcp-port", 8080, "default MCP port to persist in config")
	sourceRoot := flag.String("source-root", "", "path to accessibility-agents source for bundle installs")
	withConfig := flag.Bool("with-config", false, "add moderate .a11y-web-config.json when absent (web-audit bundle)")
	force := flag.Bool("force", false, "replace allowlisted web-audit bundle files")
	dryRun := flag.Bool("dry-run", false, "preview web-audit bundle changes without writing files")
	yes := flag.Bool("yes", false, "accept defaults without prompting")
	flag.Parse()

	workingDir, err := os.Getwd()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	repoRoot, _ := repo.FindRoot(workingDir)
	selectedRole := *role
	selectedScope := *scope
	selectedBundle := config.NormalizeBundle(*bundle)
	selectedPlatforms := parsePlatforms(*platformsFlag)
	installHooks := *hooksFlag

	if selectedRole == "web-auditor" && selectedBundle == "" {
		selectedBundle = "web-audit"
	}
	if selectedBundle == "web-audit" {
		selectedRole = "web-auditor"
		selectedScope = "project"
	}

	if !*yes {
		selectedRole = promptWithDefault("Role", selectedRole)
		if selectedBundle == "" {
			selectedBundle = config.NormalizeBundle(promptWithDefault("Bundle (blank for full setup)", ""))
		}
		selectedScope = promptWithDefault("Scope", selectedScope)
		if len(selectedPlatforms) == 0 {
			selectedPlatforms = parsePlatforms(promptWithDefault("Platforms (comma-separated)", strings.Join(system.DetectPlatforms(), ",")))
		}
		installHooks = parseBool(promptWithDefault("Install git hooks? (y/n)", boolLabel(installHooks)))
	}

	if selectedRole == "web-auditor" && selectedBundle == "" {
		selectedBundle = "web-audit"
	}
	if selectedBundle == "web-audit" {
		selectedRole = "web-auditor"
		selectedScope = "project"
	}

	if err := config.ValidateRole(selectedRole); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}
	if err := config.ValidateBundle(selectedBundle); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}
	if err := config.ValidateScope(selectedScope); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}
	if len(selectedPlatforms) == 0 {
		selectedPlatforms = system.DetectPlatforms()
	}
	if *teamConfigPath != "" {
		if _, err := os.Stat(*teamConfigPath); err != nil {
			fmt.Fprintf(os.Stderr, "team config not found: %s\n", *teamConfigPath)
			os.Exit(2)
		}
	}

	targetDir := workingDir
	if repoRoot != "" {
		targetDir = repoRoot
	}
	if selectedBundle == "web-audit" && repoRoot == "" {
		fmt.Fprintln(os.Stderr, "web-audit bundle requires project scope inside a git repository")
		os.Exit(2)
	}

	configPath, err := config.Path(selectedScope, workingDir, repoRoot)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	cfg := config.InstallConfig{
		Role:           selectedRole,
		Bundle:         selectedBundle,
		Scope:          selectedScope,
		Platforms:      selectedPlatforms,
		TeamConfigPath: *teamConfigPath,
		GitHooks:       installHooks,
		MCPPort:        *mcpPort,
		RepoRoot:       repoRoot,
	}
	if err := config.Save(configPath, cfg); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	summary := []string{
		app.Prefix("ok", "Configuration written to "+configPath),
		app.Prefix("ok", "Role: "+selectedRole),
		app.Prefix("ok", "Scope: "+selectedScope),
	}
	if selectedBundle != "" {
		summary = append(summary, app.Prefix("ok", "Bundle: "+selectedBundle))
	}
	summary = append(summary, app.Prefix("ok", "Platforms: "+strings.Join(selectedPlatforms, ", ")))

	if selectedBundle == "web-audit" {
		lines, err := webaudit.Install(webaudit.InstallOptions{
			TargetDir:  targetDir,
			SourceRoot: *sourceRoot,
			WithConfig: *withConfig,
			Force:      *force,
			DryRun:     *dryRun,
			AssumeYes:  *yes,
		})
		for _, line := range lines {
			summary = append(summary, app.Prefix("ok", line))
		}
		if err != nil {
			summary = append(summary, app.Prefix("fail", err.Error()))
			app.PrintResult(app.Result{Name: "Setup", Summary: summary})
			os.Exit(1)
		}
	}

	if *teamConfigPath != "" {
		summary = append(summary, app.Prefix("ok", "Team config: "+*teamConfigPath))
	}
	if installHooks {
		if repoRoot == "" {
			summary = append(summary, app.Prefix("warn", "Hooks requested but no git repository was detected"))
		} else if _, err := hooks.Install(repoRoot); err != nil {
			summary = append(summary, app.Prefix("fail", "Hook install failed: "+err.Error()))
		} else {
			summary = append(summary, app.Prefix("ok", "Repository pre-commit hook installed"))
		}
	}
	app.PrintResult(app.Result{Name: "Setup", Summary: summary})
}

func promptWithDefault(label, defaultValue string) string {
	reader := bufio.NewReader(os.Stdin)
	fmt.Printf("%s [%s]: ", label, defaultValue)
	line, err := reader.ReadString('\n')
	if err != nil {
		return defaultValue
	}
	line = strings.TrimSpace(line)
	if line == "" {
		return defaultValue
	}
	return line
}

func parsePlatforms(value string) []string {
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		clean := strings.TrimSpace(strings.ToLower(part))
		if clean != "" {
			result = append(result, clean)
		}
	}
	return result
}

func parseBool(value string) bool {
	value = strings.ToLower(strings.TrimSpace(value))
	return value == "y" || value == "yes" || value == "true" || value == "1"
}

func boolLabel(value bool) string {
	if value {
		return "y"
	}
	return "n"
}
