const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

async function build() {
  const distDir = path.resolve(__dirname, 'dist');
  const publicDir = path.resolve(__dirname, 'public');

  // Ensure dist exists
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Copy public static files to dist
  fs.cpSync(publicDir, distDir, { recursive: true });

  const buildOptions = {
    entryPoints: [
      path.resolve(__dirname, 'src/background.ts'),
      path.resolve(__dirname, 'src/content.ts'),
      path.resolve(__dirname, 'src/popup.ts'),
    ],
    bundle: true,
    outdir: distDir,
    target: ['chrome110'],
    format: 'esm',
    sourcemap: true,
    minify: !isWatch,
  };

  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes in chrome-extension...');
  } else {
    await esbuild.build(buildOptions);
    console.log('Chrome extension built successfully in dist/');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
