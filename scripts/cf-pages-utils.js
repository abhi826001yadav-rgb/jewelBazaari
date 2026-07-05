const fs = require('fs');
const path = require('path');

function parseHeadersFile(content) {
  const rules = [];
  let current = null;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('/')) {
      if (current) rules.push(current);
      current = { pattern: trimmed, headers: {} };
      continue;
    }

    if (!current) continue;

    const separator = trimmed.indexOf(':');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (key && value) current.headers[key] = value;
  }

  if (current) rules.push(current);
  return rules;
}

function loadHeaders(publicRoot) {
  const headersFile = path.join(publicRoot, '_headers');
  try {
    return parseHeadersFile(fs.readFileSync(headersFile, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

function patternSpecificity(pattern) {
  return pattern.replace(/\*/g, '').length;
}

function matchPattern(pattern, urlPath) {
  if (pattern === '/*') return true;

  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -1);
    return urlPath.startsWith(prefix);
  }

  if (pattern.includes('*')) {
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`).test(urlPath);
  }

  return urlPath === pattern;
}

function resolveHeaders(rules, urlPath) {
  const globalRule = rules.find((rule) => rule.pattern === '/*');
  const merged = globalRule ? { ...globalRule.headers } : {};

  const matches = rules
    .filter((rule) => rule.pattern !== '/*' && matchPattern(rule.pattern, urlPath))
    .sort((a, b) => patternSpecificity(b.pattern) - patternSpecificity(a.pattern));

  if (matches.length > 0) {
    Object.assign(merged, matches[0].headers);
  }

  return merged;
}

function parseRedirectsFile(content) {
  const redirects = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) continue;

    const from = parts[0];
    const to = parts[1];
    const status = Number(parts[2] || 301);
    redirects.push({ from, to, status });
  }

  return redirects;
}

function loadRedirects(publicRoot) {
  const redirectsFile = path.join(publicRoot, '_redirects');
  try {
    return parseRedirectsFile(fs.readFileSync(redirectsFile, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

function resolveRedirect(redirects, urlPath) {
  for (const rule of redirects) {
    if (rule.from === urlPath) return rule;
  }
  return null;
}

module.exports = {
  parseHeadersFile,
  loadHeaders,
  resolveHeaders,
  parseRedirectsFile,
  loadRedirects,
  resolveRedirect,
  matchPattern
};