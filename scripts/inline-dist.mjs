import { readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(projectRoot, 'dist');
const htmlPath = resolve(distDir, 'index.html');

const assetPathFor = (assetUrl) => {
  const pathname = assetUrl.split(/[?#]/, 1)[0];

  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(pathname)) {
    throw new Error(`Cannot inline external asset: ${assetUrl}`);
  }

  const relativeAssetPath = pathname.replace(/^\.?[\\/]/, '');
  const assetPath = resolve(distDir, relativeAssetPath);
  const pathFromDist = relative(distDir, assetPath);

  if (!relativeAssetPath || pathFromDist.startsWith('..') || isAbsolute(pathFromDist)) {
    throw new Error(`Asset is outside dist: ${assetUrl}`);
  }

  return assetPath;
};

const inlineMatches = async (source, pattern, replacer) => {
  let output = '';
  let cursor = 0;

  for (const match of source.matchAll(pattern)) {
    output += source.slice(cursor, match.index);
    output += await replacer(match[0]);
    cursor = match.index + match[0].length;
  }

  return output + source.slice(cursor);
};

let html = await readFile(htmlPath, 'utf8');
let scriptCount = 0;
let stylesheetCount = 0;
const inlinedScripts = [];

html = await inlineMatches(
  html,
  /<script\b(?=[^>]*\bsrc=["'][^"']+["'])[^>]*>[\s\S]*?<\/script>/gi,
  async (tag) => {
    const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);

    if (!srcMatch) {
      return tag;
    }

    const script = await readFile(assetPathFor(srcMatch[1]), 'utf8');
    scriptCount += 1;

    // Prevent a string containing </script> from terminating the HTML element.
    inlinedScripts.push(`<script>\n${script.replace(/<\/script/gi, '<\\/script')}\n</script>`);
    return '';
  },
);

html = await inlineMatches(
  html,
  /<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["'][^"']+["'])[^>]*\/?>/gi,
  async (tag) => {
    const hrefMatch = tag.match(/\bhref=["']([^"']+)["']/i);

    if (!hrefMatch) {
      return tag;
    }

    const stylesheet = await readFile(assetPathFor(hrefMatch[1]), 'utf8');
    stylesheetCount += 1;

    return `<style>\n${stylesheet}\n</style>`;
  },
);

if (inlinedScripts.length > 0 && !/<\/body>/i.test(html)) {
  throw new Error('Cannot place the inlined script because dist/index.html has no closing body tag.');
}

html = html.replace(/<\/body>/i, () => `${inlinedScripts.join('\n')}\n</body>`);

if (scriptCount === 0 || stylesheetCount === 0) {
  throw new Error(
    `Expected one bundled script and stylesheet, found ${scriptCount} script(s) and ${stylesheetCount} stylesheet(s).`,
  );
}

await writeFile(htmlPath, html, 'utf8');
console.log(`Inlined ${scriptCount} script(s) and ${stylesheetCount} stylesheet(s) into dist/index.html.`);
