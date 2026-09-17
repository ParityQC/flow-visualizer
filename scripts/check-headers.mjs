// SPDX-License-Identifier: GPL-2.0-or-later
// ParityQC © 2026. See LICENSE.txt in the top level directory for details.

/**
 * Checks that every source file carries the two-line license header.
 *
 * A file is checked when its extension appears in COMMENT_STYLES — that is,
 * when we know how to write a comment in that language. Everything else (JSON,
 * images, Dockerfile, dotfiles) is skipped: those either cannot carry a comment
 * or have never carried the header.
 *
 * Run with --list to print the files that are being checked.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

/** Extension -> the comment markers wrapping a header line in that language. */
const COMMENT_STYLES = {
  '.ts': ['//', ''],
  '.tsx': ['//', ''],
  '.js': ['//', ''],
  '.jsx': ['//', ''],
  '.mjs': ['//', ''],
  '.cjs': ['//', ''],
  '.css': ['/*', '*/'],
  '.html': ['<!--', '-->'],
  '.yml': ['#', ''],
  '.yaml': ['#', ''],
};

const SPDX_LINE = 'SPDX-License-Identifier: GPL-2.0-or-later';
/** The year is matched loosely so that "2026-2027" needs no code change. */
const COPYRIGHT_RE =
  /^ParityQC © \d{4}(-\d{4})?\. See LICENSE\.txt in the top level directory for details\.$/;

/** How many lines may precede the header, e.g. a shebang or "<!doctype html>". */
const MAX_PREAMBLE_LINES = 2;

function trackedFiles() {
  const out = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' });
  return out.split('\u0000').filter(Boolean);
}

/** Strip the comment markers from `line`, or return null if they are absent. */
function uncomment(line, [open, close]) {
  const trimmed = line.trim();
  if (!trimmed.startsWith(open)) return null;
  let body = trimmed.slice(open.length);
  if (close) {
    if (!body.trimEnd().endsWith(close)) return null;
    body = body.trimEnd().slice(0, -close.length);
  }
  return body.trim();
}

function hasHeader(path, style) {
  const lines = readFileSync(path, 'utf8')
    .split('\n')
    .slice(0, MAX_PREAMBLE_LINES + 2);
  for (let i = 0; i + 1 < lines.length; i++) {
    const first = uncomment(lines[i], style);
    const second = uncomment(lines[i + 1], style);
    if (first === SPDX_LINE && second !== null && COPYRIGHT_RE.test(second)) return true;
  }
  return false;
}

const checked = trackedFiles()
  .map((path) => [path, COMMENT_STYLES[extname(path)]])
  .filter(([, style]) => style !== undefined);

if (process.argv.includes('--list')) {
  for (const [path] of checked) console.log(path);
  process.exit(0);
}

const missing = checked.filter(([path, style]) => !hasHeader(path, style));

if (missing.length > 0) {
  console.error(`Missing or malformed license header in ${missing.length} file(s):`);
  console.error('');
  for (const [path] of missing) console.error(`  ${path}`);
  console.error('');
  console.error('Every checked file must begin with these two lines, commented for its');
  console.error('language (see scripts/check-headers.mjs). For a .ts file:');
  console.error('');
  console.error(`  // ${SPDX_LINE}`);
  console.error('  // ParityQC © 2026. See LICENSE.txt in the top level directory for details.');
  process.exit(1);
}

console.log(`License header present in all ${checked.length} checked files.`);
