import { parseArazzo, parseRuntimeExpression, ParseError } from '@usearazzo/parser';
import { toValue } from '@speclynx/apidom-core';

const file = process.argv[2];
let problems = 0;

function check(element) {
  const expression = String(toValue(element));
  const { result } = parseRuntimeExpression(expression);
  if (result.success) return;
  const where = `${file}:${element.startLine + 1}:${element.startCharacter + 1}`;
  console.log(`${where}  invalid runtime expression\n  ${expression}\n  ${' '.repeat(result.maxMatched)}^ does not parse from here\n`);
  problems += 1;
}

let parseResult;
try {
  parseResult = await parseArazzo(file, { parse: { parserOpts: { sourceMap: true, strict: false } } });
} catch (error) {
  if (error instanceof ParseError) {
    console.error(error.message);
    process.exit(2);
  }
  throw error;
}

parseResult.api.workflows.forEach((workflow) => {
  workflow.steps.forEach((step) => {
    step.outputs?.forEach((value) => check(value));
  });
});

console.log(`${problems || 'no'} problem${problems === 1 ? '' : 's'}`);
process.exit(problems > 0 ? 1 : 0);
