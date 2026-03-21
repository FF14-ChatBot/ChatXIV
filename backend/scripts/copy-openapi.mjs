import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '..');
const srcFile = path.join(backendRoot, 'openapi', 'openapi.yaml');
const destDir = path.join(backendRoot, 'dist', 'openapi');
const destFile = path.join(destDir, 'openapi.yaml');

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(srcFile, destFile);
