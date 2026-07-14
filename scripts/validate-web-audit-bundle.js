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

function loadManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function allBundleFiles(manifest) {
  return Object.values(manifest.files).flat();
}

function agentId(file) {
  return path.basename(file, '.agent.md');
}

function parseInlineAgents(line) {
  const match = line.match(/^agents:\s*\[(.*)]\s*$/);
  if (!match) return [];
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((item) => item[1]);
}

function formatAgents(agents) {
  return `agents: [${agents.map((name) => `'${name}'`).join(', ')}]`;
}

function sanitizeAgent(content, file, manifest) {
  const first = content.indexOf('---');
  const second = content.indexOf('---', first + 3);
  if (first !== 0 || second < 0) return content;

  const installedAgents = new Set(manifest.files.agents.map(agentId));
  const override = manifest.agentOverrides[file] || {};
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

  return `---\n${output.join('\n')}\n---${body}`.replace(
    /WEB-ACCESSIBILITY-AUDIT\.md/g,
    'ACCESSIBILITY-AUDIT.md',
  );
}

function collectAgentReferences(content) {
  const second = content.indexOf('---', 3);
  const frontmatter = content.slice(3, second);
  const references = new Set();
  frontmatter.split('\n').forEach((line) => {
    parseInlineAgents(line).forEach((name) => references.add(name));
    const handoff = line.match(/^\s+agent:\s*([a-z0-9-]+)\s*$/i);
    if (handoff) references.add(handoff[1]);
  });
  return references;
}

function validate(root = repoRoot) {
  const manifest = loadManifest();
  const files = allBundleFiles(manifest);
  const errors = [];
  const seen = new Set();

  if (manifest.schemaVersion !== '1.0') {
    errors.push(`Unsupported schemaVersion: ${manifest.schemaVersion}`);
  }

  for (const file of files) {
    if (seen.has(file)) errors.push(`Duplicate bundle path: ${file}`);
    seen.add(file);
    if (!allowedPrefixes.some((prefix) => file.startsWith(prefix))) {
      errors.push(`Unsupported bundle path: ${file}`);
    }
    if (forbiddenSegments.some((segment) => file.includes(segment))) {
      errors.push(`Non-web resource in bundle: ${file}`);
    }
    if (!fs.existsSync(path.join(root, file))) {
      errors.push(`Missing bundle file: ${file}`);
    }
  }

  for (const supportFile of [manifest.managedInstructionSource, manifest.configTemplate]) {
    if (!fs.existsSync(path.join(repoRoot, supportFile))) {
      errors.push(`Missing support file: ${supportFile}`);
    }
  }

  const installedAgents = new Set(manifest.files.agents.map(agentId));
  for (const file of manifest.files.agents) {
    const source = path.join(repoRoot, file);
    if (!fs.existsSync(source)) continue;
    const rendered = sanitizeAgent(fs.readFileSync(source, 'utf8'), file, manifest);
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
  console.log(`Web audit bundle is valid (${files.length} files).`);
  return true;
}

function main() {
  const manifest = loadManifest();
  const args = process.argv.slice(2);
  const renderIndex = args.indexOf('--render');
  const rootIndex = args.indexOf('--installed-root');

  if (args.includes('--list')) {
    for (const [category, files] of Object.entries(manifest.files)) {
      files.forEach((file) => process.stdout.write(`${category}\t${file}\n`));
    }
    return;
  }

  if (renderIndex !== -1) {
    const file = args[renderIndex + 1];
    if (!allBundleFiles(manifest).includes(file)) {
      throw new Error(`Cannot render path outside the bundle: ${file}`);
    }
    const content = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    const rendered = manifest.files.agents.includes(file)
      ? sanitizeAgent(content, file, manifest)
      : content.replace(/WEB-ACCESSIBILITY-AUDIT\.md/g, 'ACCESSIBILITY-AUDIT.md');
    process.stdout.write(rendered);
    return;
  }

  const root = rootIndex === -1 ? repoRoot : path.resolve(args[rootIndex + 1]);
  process.exitCode = validate(root) ? 0 : 1;
}

if (require.main === module) {
  main();
}

module.exports = { allBundleFiles, loadManifest, sanitizeAgent, validate };
