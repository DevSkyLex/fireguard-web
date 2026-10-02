import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const lockText = readFileSync('package-lock.json', 'utf8');
const lock = JSON.parse(lockText);
if (lock.lockfileVersion !== 3 || !lock.packages)
  throw new Error('Expected a reviewed npm v3 package lock.');
const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw new Error('Pass the production SBOM input and license JSON output paths.');
const sbom = JSON.parse(readFileSync(input, 'utf8'));
if (sbom.bomFormat !== 'CycloneDX' || !Array.isArray(sbom.components))
  throw new Error('Expected the npm production CycloneDX SBOM.');
const packages = sbom.components
  .map((component) => ({
    name: component.name,
    version: component.version,
    licenses: (component.licenses?.length ? component.licenses : [{}]).map(
      (entry) => entry.expression ?? entry.license?.id ?? entry.license?.name ?? 'UNDECLARED',
    ),
    scope: component.scope,
    purl: component.purl,
  }))
  .toSorted((left, right) => left.purl.localeCompare(right.purl));
writeFileSync(
  resolve(output),
  JSON.stringify(
    {
      source: 'package-lock.json',
      sha256: createHash('sha256').update(lockText).digest('hex'),
      scope: 'npm production CycloneDX components from the reviewed dependency lock',
      packages,
    },
    null,
    2,
  ) + '\n',
);
process.stdout.write(`Recorded ${packages.length} production dependency license declarations.\n`);
