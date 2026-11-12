import { ArazzoRunner } from '@usearazzo/runner';
import { validateURI, DiagnosticSeverity } from '@usearazzo/validator';

const uri = 'find-a-pet.arazzo.yaml';

const diagnostics = await validateURI(uri);
const errors = diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error);

if (errors.length > 0) {
  for (const { range, message } of errors) {
    console.error(`${uri}:${range.start.line + 1}:${range.start.character + 1}  ${message}`);
  }
  process.exit(1);
}

const runner = await ArazzoRunner.load(uri);

const result = await runner.execute('findAPet', {
  inputs: { status: 'available' },
});

for (const step of result.steps) {
  const mark = step.successful ? '✓' : '✗';
  const time = `${Math.round(step.durationMs)} ms`;
  console.log(`${mark} ${step.stepId.padEnd(10)}${time.padStart(8)}`);
}
console.log(`\n${result.status} in ${Math.round(result.durationMs)} ms`);
console.log(result.outputs);

process.exitCode = result.status === 'completed' ? 0 : 1;
