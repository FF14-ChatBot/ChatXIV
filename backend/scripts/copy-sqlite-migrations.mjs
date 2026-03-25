import { mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const from = join(root, 'src/lib/persistence/sqlite/migrations');
const to = join(root, 'dist/lib/persistence/sqlite/migrations');
mkdirSync(to, { recursive: true });
for (const name of readdirSync(from)) {
  if (name.endsWith('.sql')) {
    copyFileSync(join(from, name), join(to, name));
  }
}
