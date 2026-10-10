#!/usr/bin/env node
// Fail-closed stop gate. The evaluator is still responsible for honest evidence.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { checkKey, dimensions, requiredChecks, workflowIds } from './contract.mjs';

const [reportPath, candidateBuildId, matrixPath, candidateContractPath] = process.argv.slice(2);
if (!reportPath || !candidateBuildId || !matrixPath || !candidateContractPath) {
  console.error('Usage: node check-report.mjs REPORT.json CANDIDATE_BUILD_ID FROZEN_MATRIX.json EXPECTED_CANDIDATE_CONTRACT.json');
  process.exit(2);
}
let report, matrix, candidateContract, evidenceManifest;
try {
  report = JSON.parse(readFileSync(reportPath, 'utf8'));
  matrix = JSON.parse(readFileSync(matrixPath, 'utf8'));
  candidateContract = JSON.parse(readFileSync(candidateContractPath, 'utf8'));
  evidenceManifest = JSON.parse(readFileSync(resolve(dirname(reportPath), 'evidence-manifest.json'), 'utf8'));
} catch (error) {
  console.error(`BLOCKED: cannot read report/matrix: ${error.message}`);
  process.exit(2);
}
const failures = [];
const requireThat = (condition, reason) => { if (!condition) failures.push(reason); };
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
requireThat(report.schema_version === 1, 'Unsupported/missing report schema');
requireThat(report.run_status === 'complete' && report.verdict === 'pass', 'Evaluator did not report a complete pass');
requireThat(report.candidate_build_id === candidateBuildId, 'Report is for a different candidate build');
requireThat(candidateContract.build_id === candidateBuildId, 'Expected served contract is for a different candidate build');
requireThat(nonempty(matrix.baseline_build_id) && matrix.baseline_build_id !== 'SET_FROZEN_BASELINE_BUILD_ID', 'Matrix needs a frozen baseline identity');
requireThat(report.baseline_build_id === matrix.baseline_build_id, 'Report baseline differs from frozen contract');
requireThat(report.baseline_verified === true, 'Baseline not verified');
const isDigest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
requireThat(isDigest(matrix.baseline_resource_digest), 'Missing baseline resource digest');
requireThat(isDigest(candidateContract.resource_digest), 'Missing candidate resource digest');
for (const [target, id, digest, count] of [['candidate', candidateBuildId, candidateContract.resource_digest, Object.keys(candidateContract.files || {}).length], ['baseline', matrix.baseline_build_id, matrix.baseline_resource_digest, matrix.baseline_resource_count]]) {
  requireThat(Number.isInteger(count) && count > 0, `Expected ${target} resource count missing/invalid`);
  for (const stage of ['before', 'after']) {
    const proof = report.build_verification?.[target]?.[stage];
    requireThat(proof?.matched === true && proof.build_id === id && proof.resource_digest === digest && proof.resources_verified === count, `Browser did not verify served ${target} resource bytes ${stage} interactions`);
  }
}
requireThat(nonempty(report.evaluated_at) && Number.isFinite(Date.parse(report.evaluated_at)), 'Missing/invalid evaluation timestamp');
requireThat(report.browser?.actual_browser === true && nonempty(report.browser?.version) && report.browser?.engine === 'chromium', 'Actual Chromium browser evidence required');
for (const key of ['touch_context_used', 'no_hover_verified', 'coarse_pointer_verified']) {
  requireThat(report.input_checks?.[key] === true, `Missing input verification: ${key}`);
}
for (const family of ['desktop', 'tablet', 'mobile']) {
  requireThat(report.devices?.[family]?.rating === 'good', `${family} is not good`);
  for (const key of [...dimensions, ...(family === 'desktop' ? ['desktop_preservation'] : [])]) {
    requireThat(report.devices?.[family]?.dimensions?.[key] === 'good', `${family}/${key} is not good`);
  }
}
for (const key of ['findings', 'blockers']) {
  requireThat(Array.isArray(report[key]) && report[key].length === 0, `Unresolved/missing ${key}`);
}
requireThat(Array.isArray(report.limitations), 'Emulation/device limitations must be recorded');
requireThat(Array.isArray(matrix.workflow_ids) && workflowIds.every(id => matrix.workflow_ids.includes(id)), 'Frozen inventory omits required workflows');
requireThat(Array.isArray(matrix.required_checks), 'Frozen matrix missing');
requireThat(Array.isArray(matrix.breakpoints) && [768, 1536].every(b => matrix.breakpoints.includes(b)) && matrix.breakpoints.every(b => Number.isInteger(b) && b > 0), 'Frozen breakpoints missing/invalid');
requireThat(Array.isArray(matrix.engines) && matrix.engines.includes('chromium'), 'Required Chromium engine missing');
const expectedRows = Array.isArray(matrix.required_checks) ? matrix.required_checks : [];
const expected = new Set(expectedRows.map(checkKey));
const expectedByKey = new Map(expectedRows.map(row => [checkKey(row), row]));
requireThat(expected.size === expectedRows.length, 'Duplicate checks in frozen matrix');
for (const row of expectedRows) {
  requireThat(nonempty(row.viewport_id) && nonempty(row.workflow_id) && nonempty(row.engine) && ['touch', 'mouse-keyboard'].includes(row.input) && Number.isInteger(row.width) && row.width > 0 && Number.isInteger(row.height) && row.height > 0, 'Invalid frozen check metadata');
}
for (const row of requiredChecks(Array.isArray(matrix.workflow_ids) ? matrix.workflow_ids : workflowIds, Array.isArray(matrix.breakpoints) ? matrix.breakpoints : [768, 1536], Array.isArray(matrix.engines) ? matrix.engines : ['chromium'])) {
  requireThat(expected.has(checkKey(row)), `Frozen matrix omits ${checkKey(row)}`);
  const frozen = expectedByKey.get(checkKey(row));
  for (const field of ['engine', 'input', 'width', 'height']) requireThat(frozen?.[field] === row[field], `Frozen matrix changes canonical ${field}: ${checkKey(row)}`);
}
const observed = new Map();
requireThat(Array.isArray(report.coverage), 'Coverage missing');
const outputRoot = resolve(dirname(reportPath));
requireThat(Array.isArray(evidenceManifest.checks), 'Evidence manifest checks missing');
const evidenceEntries = new Map();
for (const item of Array.isArray(evidenceManifest.checks) ? evidenceManifest.checks : []) {
  requireThat(!evidenceEntries.has(item.check_key), `Duplicate evidence record: ${item.check_key}`);
  evidenceEntries.set(item.check_key, item);
}
for (const row of Array.isArray(report.coverage) ? report.coverage : []) {
  requireThat(nonempty(row.viewport_id) && nonempty(row.workflow_id), 'Malformed coverage row');
  const key = checkKey(row);
  requireThat(!observed.has(key), `Duplicate coverage: ${key}`);
  observed.set(key, row);
  const expectedRow = expectedByKey.get(key);
  const evidence = evidenceEntries.get(key);
  requireThat(!!evidence && evidence.candidate_build_id === candidateBuildId, `Evidence not linked to current candidate: ${key}`);
  for (const field of ['engine', 'input', 'width', 'height']) {
    requireThat(expectedRow && row[field] === expectedRow[field] && evidence?.[field] === expectedRow[field], `Evidence/coverage mismatch for ${field}: ${key}`);
  }
  requireThat(Array.isArray(evidence?.actions) && evidence.actions.length > 0 && evidence.actions.every(nonempty) && Array.isArray(evidence?.observations) && evidence.observations.length > 0 && evidence.observations.every(nonempty), `Browser action/observation record missing/invalid: ${key}`);
  requireThat(row.status === 'passed', `Coverage not passed: ${key}`);
  requireThat(Array.isArray(row.evidence) && row.evidence.length > 0, `Evidence missing: ${key}`);
  for (const file of Array.isArray(row.evidence) ? row.evidence : []) {
    requireThat(Array.isArray(evidence?.files) && evidence.files.includes(file), `File not linked in browser evidence manifest: ${key}`);
    if (!nonempty(file)) { requireThat(false, `Invalid evidence path: ${key}`); continue; }
    const full = resolve(outputRoot, file);
    const within = relative(outputRoot, full);
    const contained = !isAbsolute(file) && within !== '..' && !within.startsWith(`..${sep}`);
    requireThat(contained, `Evidence outside report directory: ${key}`);
    requireThat(existsSync(full) && statSync(full).isFile() && statSync(full).size > 0, `Missing/empty evidence: ${file}`);
    if (contained && existsSync(full) && statSync(full).isFile() && /\.(png|jpe?g|webp|zip)$/i.test(file)) {
      const bytes = readFileSync(full);
      const valid = /\.png$/i.test(file) ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
        : /\.jpe?g$/i.test(file) ? bytes[0] === 255 && bytes[1] === 216
        : /\.webp$/i.test(file) ? bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP'
        : bytes[0] === 80 && bytes[1] === 75;
      requireThat(valid, `Invalid screenshot/trace file signature: ${file}`);
    }
  }
  requireThat(Array.isArray(row.evidence) && row.evidence.some(file => /\.(png|jpe?g|webp|zip)$/i.test(file)), `Screenshot/trace evidence required: ${key}`);
}
for (const key of expected) requireThat(observed.has(key), `Coverage omitted: ${key}`);
if (failures.length) {
  console.error(`NOT PASSED (${failures.length} checks):\n${failures.map(reason => `- ${reason}`).join('\n')}`);
  process.exit(1);
}
console.log(`PASS: desktop, tablet and mobile are good; ${expected.size} required checks have evidence for ${candidateBuildId}.`);
