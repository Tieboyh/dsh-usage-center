import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('lib', { recursive: true });
await build({
  entryPoints: ['src/client.js'],
  outfile: 'lib/client.js',
  bundle: true,
  minify: true,
  platform: 'browser',
  format: 'cjs',
  target: ['chrome120'],
  external: ['react'],
  legalComments: 'eof',
  banner: { js: 'window.__ModuleLoader__.load({id:"dsh-usage-center",factory:(require)=>{var module={exports:{}};var exports=module.exports;' },
  footer: { js: 'return module.exports;}});' },
});
for (const file of ['index.js', 'usage.js', 'pricing.js', 'accounts.js', 'snapshot.js']) {
  await copyFile(`src/${file}`, `lib/${file}`);
}
