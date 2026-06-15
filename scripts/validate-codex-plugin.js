#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pluginRoot = path.join(root, 'codex-plugin');
const requiredFiles = [
  'codex-plugin/.codex-plugin/plugin.json',
  'codex-plugin/README.md',
  'codex-plugin/skills/web-accessibility/SKILL.md',
  'codex-plugin/skills/document-accessibility/SKILL.md',
  'codex-plugin/skills/github-workflows/SKILL.md',
  'codex-plugin/skills/developer-tools/SKILL.md',
  'codex-plugin/skills/markdown-accessibility/SKILL.md',
  'codex-plugin/agents/accessibility-lead.toml',
  'codex-plugin/agents/aria-specialist.toml',
  'codex-plugin/extensions/core/extension.json',
  'codex-plugin/extensions/README.md',
];

let failed = false;

function fail(message) {
  console.error(message);
  failed = true;
}

for (const rel of requiredFiles) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    fail(`Missing required Codex plugin file: ${rel}`);
  } else if (fs.statSync(abs).size === 0) {
    fail(`Empty required Codex plugin file: ${rel}`);
  }
}

const pluginJsonPath = path.join(pluginRoot, '.codex-plugin', 'plugin.json');
if (fs.existsSync(pluginJsonPath)) {
  try {
    const plugin = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
    if (plugin.name !== 'a11y-agents-codex') {
      fail(`codex-plugin/.codex-plugin/plugin.json: expected name "a11y-agents-codex", got "${plugin.name}"`);
    }
    if (plugin.skills !== './skills/') {
      fail('codex-plugin/.codex-plugin/plugin.json: expected skills to be "./skills/"');
    }
  } catch (error) {
    fail(`codex-plugin/.codex-plugin/plugin.json is not valid JSON: ${error.message}`);
  }
}

const skillsDir = path.join(pluginRoot, 'skills');
if (fs.existsSync(skillsDir)) {
  const skillNames = fs.readdirSync(skillsDir).filter((name) => fs.existsSync(path.join(skillsDir, name, 'SKILL.md')));
  if (skillNames.length > 8) {
    fail(`Codex plugin exposes ${skillNames.length} top-level skills; keep the router surface at 8 or fewer.`);
  }
}

const agentsDir = path.join(pluginRoot, 'agents');
const specialistsDir = path.join(pluginRoot, 'references', 'specialists');
if (fs.existsSync(agentsDir)) {
  const agentFiles = fs.readdirSync(agentsDir).filter((name) => name.endsWith('.toml'));
  const specialistFiles = fs.existsSync(specialistsDir)
    ? fs.readdirSync(specialistsDir).filter((name) => name.endsWith('.md') && name !== 'index.md')
    : [];
  if (agentFiles.length !== specialistFiles.length) {
    fail(`Codex subagent parity mismatch: found ${agentFiles.length} TOML agents but ${specialistFiles.length} specialist references.`);
  }
  for (const file of agentFiles) {
    const body = fs.readFileSync(path.join(agentsDir, file), 'utf8');
    for (const field of ['name =', 'description =', 'developer_instructions =']) {
      if (!body.includes(field)) {
        fail(`codex-plugin/agents/${file}: missing ${field}`);
      }
    }
  }
}

const extensionPath = path.join(pluginRoot, 'extensions', 'core', 'extension.json');
const extensionsDir = path.join(pluginRoot, 'extensions');
if (fs.existsSync(extensionsDir)) {
  const extensionFiles = fs.readdirSync(extensionsDir)
    .map((name) => path.join(extensionsDir, name, 'extension.json'))
    .filter((file) => fs.existsSync(file));
  const specialistFiles = fs.existsSync(specialistsDir)
    ? fs.readdirSync(specialistsDir).filter((name) => name.endsWith('.md') && name !== 'index.md')
    : [];
  const registeredAgents = new Map();
  if (extensionFiles.length < 2) {
    fail('codex-plugin/extensions: expected multiple built-in extension packs, not a single monolithic registry.');
  }
  for (const file of extensionFiles) {
    try {
      const extension = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!extension.author || typeof extension.author !== 'string') {
        fail(`${path.relative(root, file)}: expected author string.`);
      }
      if (!Array.isArray(extension.extensionPoints) || !extension.extensionPoints.includes('agents')) {
        fail(`${path.relative(root, file)}: expected extensionPoints to include "agents".`);
      }
      if (!Array.isArray(extension.agents)) {
        fail(`${path.relative(root, file)}: expected agents array.`);
        continue;
      }
      for (const agent of extension.agents) {
        if (!agent.name) {
          fail(`${path.relative(root, file)}: agent entry missing name.`);
          continue;
        }
        if (registeredAgents.has(agent.name)) {
          fail(`${agent.name} is registered by multiple built-in extension packs: ${registeredAgents.get(agent.name)} and ${path.relative(root, file)}.`);
        }
        registeredAgents.set(agent.name, path.relative(root, file));
      }
    } catch (error) {
      fail(`${path.relative(root, file)} is not valid JSON: ${error.message}`);
    }
  }
  if (registeredAgents.size !== specialistFiles.length) {
    fail(`Built-in extension registry parity mismatch: ${registeredAgents.size} unique registered agents but ${specialistFiles.length} specialist references.`);
  }
}

if (failed) {
  process.exit(1);
}

console.log('Codex plugin structure is valid.');
