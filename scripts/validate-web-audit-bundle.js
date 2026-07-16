#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(__dirname, 'web-audit-bundle.json');
const allowedPrefixes = [
  '.github/agents/',
  '.github/skills/',
  '.github/prompts/',
  '.github/instructions/',
  '.claude/agents/',
  '.claude/specialists/',
  '.claude/skills/',
  '.claude/commands/',
  '.claude/AGENTS.md',
];
const forbiddenSegments = [
  '/document-',
  '/office-',
  '/pdf-',
  '/powerpoint-',
  '/word-',
  '/excel-',
  '/mobile-',
  '/desktop-',
  '/markdown-',
  '/epub-',
];
const COPILOT_CATEGORIES = ['agents', 'skills', 'prompts', 'instructions'];
const CLAUDE_CATEGORIES = [
  'claudeAgents',
  'claudeSpecialists',
  'claudeSkills',
  'claudeCommands',
  'claudeMeta',
];

function loadManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function categoriesForPlatform(platform) {
  if (platform === 'copilot') return COPILOT_CATEGORIES;
  if (platform === 'claude') return CLAUDE_CATEGORIES;
  return [...COPILOT_CATEGORIES, ...CLAUDE_CATEGORIES];
}

function allBundleFiles(manifest, platform = 'both') {
  const categories = categoriesForPlatform(platform);
  return categories.flatMap((category) => manifest.files[category] || []);
}

function agentId(file) {
  return path.basename(file).replace(/\.agent\.md$/, '').replace(/\.md$/, '');
}

function installedAgentIds(manifest) {
  const ids = new Set();
  for (const file of manifest.files.agents || []) ids.add(agentId(file));
  for (const file of manifest.files.claudeAgents || []) ids.add(agentId(file));
  for (const file of manifest.files.claudeSpecialists || []) ids.add(agentId(file));
  return ids;
}

function sourcePath(manifest, file) {
  return manifest.fileSources?.[file] || file;
}

function parseInlineAgents(line) {
  const match = line.match(/^agents:\s*\[(.*)]\s*$/);
  if (!match) return [];
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((item) => item[1]);
}

function formatAgents(agents) {
  return `agents: [${agents.map((name) => `'${name}'`).join(', ')}]`;
}

function sanitizeBody(content, deniedAgents) {
  let output = content.replace(/WEB-ACCESSIBILITY-AUDIT\.md/g, 'ACCESSIBILITY-AUDIT.md');
  for (const denied of deniedAgents) {
    const pattern = new RegExp(
      `^\\s*-\\s*\\*\\*${denied.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*.*$`,
      'gm',
    );
    output = output.replace(pattern, '');
    output = output.replace(
      new RegExp(`direct users to the ${denied.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'),
      'focus on web accessibility audits only',
    );
    output = output.replace(
      new RegExp(`For document accessibility[^.]*use the ${denied.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]*\\.`, 'gi'),
      'This installer provides web accessibility audits only.',
    );
  }
  return output;
}

function sanitizeAgent(content, file, manifest) {
  const first = content.indexOf('---');
  const second = content.indexOf('---', first + 3);
  if (first !== 0 || second < 0) {
    const override = manifest.agentOverrides?.[file] || {};
    return sanitizeBody(content, new Set(override.removeHandoffAgents || []));
  }

  const installedAgents = installedAgentIds(manifest);
  const override = manifest.agentOverrides?.[file] || {};
  const frontmatter = content.slice(3, second).replace(/^\n/, '').split('\n');
  const body = content.slice(second + 3);
  const output = [];

  for (let index = 0; index < frontmatter.length;) {
    const line = frontmatter[index];

    if (line.startsWith('agents:')) {
      const configured = override.agents || parseInlineAgents(line);
      output.push(formatAgents(configured.filter((name) => installedAgents.has(name))));
      index += 1;
      continue;
    }

    if (line === 'handoffs:') {
      const blocks = [];
      index += 1;
      while (index < frontmatter.length && /^\s/.test(frontmatter[index])) {
        const block = [];
        do {
          block.push(frontmatter[index]);
          index += 1;
        } while (
          index < frontmatter.length &&
          /^\s/.test(frontmatter[index]) &&
          !/^  - /.test(frontmatter[index])
        );
        blocks.push(block);
      }

      const denied = new Set(override.removeHandoffAgents || []);
      const kept = blocks.filter((block) => {
        const agentLine = block.find((entry) => /^\s+agent:\s*/.test(entry));
        if (!agentLine) return true;
        const name = agentLine.replace(/^\s+agent:\s*/, '').trim();
        return installedAgents.has(name) && !denied.has(name);
      });
      if (kept.length > 0) {
        output.push('handoffs:');
        kept.forEach((block) => output.push(...block));
      }
      continue;
    }

    output.push(line);
    index += 1;
  }

  const denied = new Set(override.removeHandoffAgents || []);
  return sanitizeBody(`---\n${output.join('\n')}\n---${body}`, denied);
}

function collectAgentReferences(content) {
  const second = content.indexOf('---', 3);
  if (second < 0) return new Set();
  const frontmatter = content.slice(3, second);
  const references = new Set();
  frontmatter.split('\n').forEach((line) => {
    parseInlineAgents(line).forEach((name) => references.add(name));
    const handoff = line.match(/^\s+agent:\s*([a-z0-9-]+)\s*$/i);
    if (handoff) references.add(handoff[1]);
  });
  return references;
}

function isSanitizedAgent(file, manifest) {
  return (
    manifest.files.agents.includes(file)
    || manifest.files.claudeAgents.includes(file)
    || manifest.files.claudeSpecialists.includes(file)
  );
}

function validate(root = repoRoot, platform = 'both') {
  const manifest = loadManifest();
  const files = allBundleFiles(manifest, platform);
  const errors = [];
  const seen = new Set();

  if (manifest.schemaVersion !== '1.0') {
    errors.push(`Unsupported schemaVersion: ${manifest.schemaVersion}`);
  }

  for (const file of files) {
    if (seen.has(file)) errors.push(`Duplicate bundle path: ${file}`);
    seen.add(file);
    if (!allowedPrefixes.some((prefix) => file.startsWith(prefix) || file === prefix)) {
      errors.push(`Unsupported bundle path: ${file}`);
    }
    if (forbiddenSegments.some((segment) => file.includes(segment))) {
      errors.push(`Non-web resource in bundle: ${file}`);
    }
    const source = sourcePath(manifest, file);
    if (!fs.existsSync(path.join(repoRoot, source))) {
      errors.push(`Missing bundle file: ${file} (source: ${source})`);
    }
    if (root !== repoRoot && !fs.existsSync(path.join(root, file))) {
      errors.push(`Missing installed file: ${file}`);
    }
  }

  const supportFiles = [manifest.managedInstructionSource, manifest.configTemplate];
  if (platform === 'claude' || platform === 'both') {
    supportFiles.push(manifest.managedClaudeInstructionSource);
    supportFiles.push(manifest.claudeAgentsSource || 'templates/claude-agents-web-audit.md');
  }
  for (const supportFile of supportFiles) {
    if (supportFile && !fs.existsSync(path.join(repoRoot, supportFile))) {
      errors.push(`Missing support file: ${supportFile}`);
    }
  }

  const installedAgents = installedAgentIds(manifest);
  const agentFiles = [
    ...(platform === 'claude' ? [] : manifest.files.agents),
    ...(platform === 'copilot' ? [] : [
      ...(manifest.files.claudeAgents || []),
      ...(manifest.files.claudeSpecialists || []),
    ]),
  ];
  if (platform === 'both') {
    agentFiles.length = 0;
    agentFiles.push(
      ...manifest.files.agents,
      ...(manifest.files.claudeAgents || []),
      ...(manifest.files.claudeSpecialists || []),
    );
  }

  for (const file of agentFiles) {
    const source = sourcePath(manifest, file);
    const sourcePathOnDisk = path.join(repoRoot, source);
    if (!fs.existsSync(sourcePathOnDisk)) continue;
    const rendered = sanitizeAgent(fs.readFileSync(sourcePathOnDisk, 'utf8'), file, manifest);
    for (const reference of collectAgentReferences(rendered)) {
      if (!installedAgents.has(reference)) {
        errors.push(`${file} references unavailable agent: ${reference}`);
      }
    }
  }

  if (errors.length > 0) {
    errors.forEach((error) => console.error(`ERROR: ${error}`));
    return false;
  }
  console.log(`Web audit bundle is valid (${files.length} files for ${platform}).`);
  return true;
}

function renderFile(manifest, file) {
  const source = sourcePath(manifest, file);
  const content = fs.readFileSync(path.join(repoRoot, source), 'utf8');
  if (isSanitizedAgent(file, manifest)) {
    return sanitizeAgent(content, file, manifest);
  }
  return content.replace(/WEB-ACCESSIBILITY-AUDIT\.md/g, 'ACCESSIBILITY-AUDIT.md');
}

function main() {
  const manifest = loadManifest();
  const args = process.argv.slice(2);
  const renderIndex = args.indexOf('--render');
  const rootIndex = args.indexOf('--installed-root');
  const platformIndex = args.indexOf('--platform');
  const platform = platformIndex === -1 ? 'both' : args[platformIndex + 1];

  if (!['copilot', 'claude', 'both'].includes(platform)) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  if (args.includes('--list')) {
    for (const category of categoriesForPlatform(platform)) {
      for (const file of manifest.files[category] || []) {
        process.stdout.write(`${category}\t${file}\n`);
      }
    }
    return;
  }

  if (renderIndex !== -1) {
    const file = args[renderIndex + 1];
    if (!allBundleFiles(manifest, 'both').includes(file)) {
      throw new Error(`Cannot render path outside the bundle: ${file}`);
    }
    process.stdout.write(renderFile(manifest, file));
    return;
  }

  const root = rootIndex === -1 ? repoRoot : path.resolve(args[rootIndex + 1]);
  process.exitCode = validate(root, platform) ? 0 : 1;
}

if (require.main === module) {
  main();
}

module.exports = {
  allBundleFiles,
  categoriesForPlatform,
  loadManifest,
  renderFile,
  sanitizeAgent,
  sourcePath,
  validate,
};
