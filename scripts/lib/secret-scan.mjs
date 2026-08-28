const rules = [
  { name: "private-key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
  { name: "github-token", pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g },
  { name: "aws-access-key", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "openai-api-key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: "slack-token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
];

const assignmentPattern = /^\s*(?:export\s+)?([A-Z][A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|API_KEY|ACCESS_KEY|DATABASE_URL)[A-Z0-9_]*)\s*=\s*(.+?)\s*$/;
const credentialUrlPattern = /\b(?:mysql|postgres(?:ql)?|mongodb(?:\+srv)?):\/\/([^\s:/]+):([^\s@]+)@/gi;

export function isPlaceholder(value) {
  const normalized = value.trim().replace(/^['"]|['"]$/g, "");
  return (
    normalized === "" ||
    /^(?:undefined|null|changeme|example|password|secret|token|api[_-]?key|ci-placeholder|sha256_value)$/i.test(normalized) ||
    /^(?:replace|set|insert|your)[-_ ]?(?:me|with|this|value|secret|password|token|key)/i.test(normalized) ||
    /^(?:staging|production|development|test)_[A-Z0-9_]+$/i.test(normalized) ||
    /^\$\{[^}]+\}$/.test(normalized) ||
    /^<[^>]+>$/.test(normalized) ||
    /USER(?::|%3A)PASSWORD/i.test(normalized) ||
    /\.example(?:\.|\/|$)|\.invalid(?:\.|\/|$)/i.test(normalized)
  );
}

export function scanText(path, text) {
  const findings = [];
  const lines = text.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    for (const rule of rules) {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(line)) findings.push({ path, line: index + 1, rule: rule.name });
    }

    const assignment = line.match(assignmentPattern);
    if (assignment && !isPlaceholder(assignment[2])) {
      findings.push({ path, line: index + 1, rule: "sensitive-assignment" });
    }

    credentialUrlPattern.lastIndex = 0;
    for (const match of line.matchAll(credentialUrlPattern)) {
      if (!isPlaceholder(match[2])) {
        findings.push({ path, line: index + 1, rule: "credential-in-url" });
      }
    }
  }

  return findings;
}
