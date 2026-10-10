import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { transform } from 'esbuild';

/** Keep the authored catalog intact for the engine, MCP and source editing. */
export async function readSkillCatalog(root) {
  const source = readFileSync(resolve(root, 'src/app/skills/skill-meta.generated.ts'), 'utf8');
  const { code } = await transform(source, { loader: 'ts', format: 'esm', target: 'es2022' });
  return (await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).SKILL_META;
}

export function splitSkillCatalog(catalog) {
  const metadata = {};
  const descriptions = {};
  for (const [name, { description, ...meta }] of Object.entries(catalog)) {
    metadata[name] = meta;
    if (meta.id !== undefined && description) descriptions[meta.id] = description;
  }
  return { metadata, descriptions };
}

/** Browser-only projections: optional prose is fetched after startup or on demand. */
export function browserDataPlugin(root) {
  return { name: 'browser-data', setup(builder) {
    builder.onLoad({ filter: /src[\\/]app[\\/]skills[\\/]skill-meta\.generated\.ts$/ }, async () => {
      const { metadata } = splitSkillCatalog(await readSkillCatalog(root));
      return { contents: `export const SKILL_META = ${JSON.stringify(metadata)};`, loader: 'js' };
    });
    builder.onLoad({ filter: /src[\\/]releases[\\/]summary\.ts$/ }, () => {
      const history = JSON.parse(readFileSync(resolve(root, 'src/releases/history.json'), 'utf8'));
      return { contents: `export const releaseVersions = ${JSON.stringify(history.map(entry => entry.v))};`, loader: 'js' };
    });
  } };
}
