import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '..');
const destDir = path.join(backendRoot, 'dist', 'openapi');
const specs = ['openapi.public.yaml', 'openapi.admin.yaml'];

fs.mkdirSync(destDir, { recursive: true });
for (const name of specs) {
  fs.copyFileSync(path.join(backendRoot, 'openapi', name), path.join(destDir, name));
}
