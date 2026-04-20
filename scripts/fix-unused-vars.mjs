// Batch fix for no-unused-vars:
// - catch (err) unused → catch (_err)
// - catch (e) unused → catch (_e)
// - Unused named imports → remove from import line
// Only applies patterns that are safe to autofix.

import { execSync } from "node:child_process";
import fs from "node:fs";

// eslint exit code is non-zero when errors exist — catch and use stdout
let output;
try {
  output = execSync("npx eslint . --format=json", { encoding: "utf8", maxBuffer: 200 * 1024 * 1024 });
} catch (err) {
  output = err.stdout || "";
}
const results = JSON.parse(output);

const edits = new Map(); // filePath -> { line, col, kind, name }[]

for (const file of results) {
  for (const msg of file.messages) {
    if (msg.ruleId !== "no-unused-vars") continue;
    const match = msg.message.match(/^'([^']+)' is (defined|assigned a value)/);
    if (!match) continue;
    const name = match[1];
    if (!edits.has(file.filePath)) edits.set(file.filePath, []);
    edits.get(file.filePath).push({ line: msg.line, col: msg.column, name });
  }
}

let totalFixed = 0;
let totalFiles = 0;

for (const [filePath, entries] of edits) {
  const src = fs.readFileSync(filePath, "utf8");
  const lines = src.split("\n");
  const changed = new Set();

  for (const { line, name } of entries) {
    const idx = line - 1;
    const before = lines[idx];

    // 1) catch (X) → catch (_X)
    const catchRe = new RegExp(`catch\\s*\\(\\s*${escape(name)}(\\s*[:\\s][^)]*)?\\)`);
    if (catchRe.test(before)) {
      lines[idx] = before.replace(catchRe, (m) => m.replace(name, `_${name}`));
      changed.add(idx);
      totalFixed++;
      continue;
    }

    // 1b) Array destructure element: const [X, ...] or [..., X, ...]
    //     only match if the name appears standalone (not inside a string)
    const arrDestructureRe = new RegExp(`(\\[[^\\]]*?)\\b${escape(name)}\\b([^\\]]*?\\]\\s*=)`);
    if (arrDestructureRe.test(before)) {
      lines[idx] = before.replace(arrDestructureRe, (_, pre, post) => `${pre}_${name}${post}`);
      changed.add(idx);
      totalFixed++;
      continue;
    }

    // 1c) Function parameter — rename X → _X (in params list)
    //     Conservative: only when the name clearly appears inside (...)
    const fnParamRe = new RegExp(`(\\(\\s*|,\\s*)\\b${escape(name)}\\b(\\s*[,):])`);
    if (fnParamRe.test(before)) {
      lines[idx] = before.replace(fnParamRe, (_, pre, post) => `${pre}_${name}${post}`);
      changed.add(idx);
      totalFixed++;
      continue;
    }

    // 1d) Standalone `const X = ...` or `let X = ...` → rename to `_X`
    const singleAssignRe = new RegExp(`^(\\s*(?:const|let)\\s+)${escape(name)}(\\s*=)`);
    if (singleAssignRe.test(before)) {
      lines[idx] = before.replace(singleAssignRe, `$1_${name}$2`);
      changed.add(idx);
      totalFixed++;
      continue;
    }

    // 1e) Object destructuring: `const { X, Y } = obj` → `const { X: _X, Y } = obj`
    //     (works even when only one of multiple names is unused)
    const objDestructureRe = new RegExp(`(\\{[^}]*?\\b)${escape(name)}\\b([^}:]*?\\}\\s*=)`);
    if (objDestructureRe.test(before)) {
      lines[idx] = before.replace(objDestructureRe, (_, pre, post) => `${pre}${name}: _${name}${post}`);
      changed.add(idx);
      totalFixed++;
      continue;
    }

    // (rule 1f 제거됨 — `{ icon: Icon }` 같은 prop rename 과 충돌해 빌드 깨짐)

    // 2) Remove unused named import: import { A, Unused, B } from '...'
    const importLineRe = new RegExp(`^(\\s*import\\s*\\{)([^}]+)(\\}\\s*from\\s*['"][^'"]+['"];?)`);
    const im = before.match(importLineRe);
    if (im) {
      const names = im[2].split(",").map(s => s.trim()).filter(Boolean);
      const reduced = names.filter(n => {
        const clean = n.replace(/\s+as\s+.*$/, "").replace(/^type\s+/, "").trim();
        return clean !== name;
      });
      if (reduced.length !== names.length) {
        if (reduced.length === 0) {
          lines[idx] = ""; // remove entire line
        } else {
          lines[idx] = `${im[1]} ${reduced.join(", ")} ${im[3]}`;
        }
        changed.add(idx);
        totalFixed++;
        continue;
      }
    }

    // 3) Simple unused `const X = ...` on its own line where RHS is a direct call
    //    → comment out (conservative, avoid if RHS has side effects that are desired)
    //    Skip this — too risky to auto-comment.
  }

  if (changed.size > 0) {
    fs.writeFileSync(filePath, lines.join("\n"), "utf8");
    totalFiles++;
  }
}

console.log(`fix-unused-vars: ${totalFixed} fixes across ${totalFiles} files`);

function escape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
