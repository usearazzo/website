import path from 'node:path';
import { parseArazzo, ParseError } from '@usearazzo/parser';
import { toValue } from '@speclynx/apidom-core';

const entry = process.argv[2];

let parseResult;
try {
  parseResult = await parseArazzo(entry, {
    parse: { parserOpts: { sourceDescriptions: true } },
  });
} catch (error) {
  if (error instanceof ParseError) {
    console.error(error.message);
    process.exit(2);
  }
  throw error;
}

function describe(api) {
  if (api.element === 'arazzoSpecification1') return `Arazzo ${toValue(api.arazzo)}`;
  if (api.element === 'swagger') return `OpenAPI ${toValue(api.swagger)}`;
  return `OpenAPI ${toValue(api.openapi)}`;
}

function fileName(parseResult) {
  return path.basename(toValue(parseResult.meta.get('retrievalURI')));
}

const ids = new Map();
const lines = ['graph LR'];
let problems = 0;

function idFor(parseResult) {
  if (!ids.has(parseResult)) ids.set(parseResult, `d${ids.size + 1}`);
  return ids.get(parseResult);
}

function walk(parseResult) {
  const from = idFor(parseResult);
  const sourceDescriptions = parseResult.api.sourceDescriptions ?? [];

  for (let i = 0; i < sourceDescriptions.length; i += 1) {
    const sourceDescription = sourceDescriptions.get(i);
    const nested = sourceDescription.meta.get('parseResult');
    const name = toValue(sourceDescription.name);
    const seen = ids.has(nested);
    const to = idFor(nested);

    if (nested.api) {
      if (!seen) lines.push(`  ${to}["${fileName(nested)}<br/>${describe(nested.api)}"]`);
      lines.push(`  ${from} -->|${name}| ${to}`);
    } else {
      if (!seen) lines.push(`  ${to}["${fileName(nested)}<br/>not parsed"]:::missing`);
      lines.push(`  ${from} -.->|${name}| ${to}`);
    }

    nested.errors.forEach((annotation) => console.error(`${name}: ${toValue(annotation)}`));
    nested.warnings.forEach((annotation) => console.error(`${name}: warning: ${toValue(annotation)}`));
    problems += nested.errors.length;

    if (nested.api && !seen) walk(nested);
  }
}

lines.push(`  ${idFor(parseResult)}["${fileName(parseResult)}<br/>${describe(parseResult.api)}"]`);
walk(parseResult);
lines.push('  classDef missing stroke-dasharray: 6 4');

console.log(lines.join('\n'));
process.exit(problems > 0 ? 1 : 0);
