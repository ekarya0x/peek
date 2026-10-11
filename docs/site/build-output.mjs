import { cp, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const output = resolve('..', '.vercel', 'output');
await mkdir(output, { recursive: true });
await cp(resolve('dist'), resolve(output, 'static'), { recursive: true });
await writeFile(resolve(output, 'config.json'), JSON.stringify({
  version: 3,
  routes: [{ src: '/.*', headers: {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN'
  }, continue: true }]
}, null, 2));
console.log('Static Build Output API artifact created with security headers.');
