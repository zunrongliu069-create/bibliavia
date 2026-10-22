import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outputDirectory = path.resolve('dist');
const sourceDirectory = path.join(
  outputDirectory,
  'assets',
  'node_modules',
  '@expo',
  'vector-icons',
  'build',
  'vendor',
  'react-native-vector-icons',
  'Fonts',
);
const targetDirectory = path.join(outputDirectory, 'assets', 'fonts');
const bundleDirectory = path.join(outputDirectory, '_expo', 'static', 'js', 'web');

await mkdir(targetDirectory, { recursive: true });

const fontFiles = (await readdir(sourceDirectory)).filter((file) => file.endsWith('.ttf'));
await Promise.all(
  fontFiles.map((file) => cp(path.join(sourceDirectory, file), path.join(targetDirectory, file))),
);

const bundleFiles = (await readdir(bundleDirectory)).filter((file) => file.endsWith('.js'));
for (const file of bundleFiles) {
  const bundlePath = path.join(bundleDirectory, file);
  const bundle = await readFile(bundlePath, 'utf8');
  const updatedBundle = bundle.replaceAll(
    'assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/',
    'assets/fonts/',
  );
  await writeFile(bundlePath, updatedBundle);
}

await writeFile(path.join(outputDirectory, '_redirects'), '/* /index.html 200\n');

console.log(`Prepared ${fontFiles.length} icon fonts for Cloudflare Pages.`);
