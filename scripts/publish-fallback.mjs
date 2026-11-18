// Rebuilds published/ (the bundle index.html loads when GitHub Pages serves the branch
// directly instead of the Actions build). Run after `GITHUB_PAGES=true npx vite build`.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";

const app = readFileSync("site/app.js", "utf8");
const css = readdirSync("site/assets").find((f) => f.endsWith(".css"));
if (!css) throw new Error("No built CSS in site/assets");
rmSync("published/parts", { recursive: true, force: true });
mkdirSync("published/parts", { recursive: true });
const parts = [];
for (let i = 0, n = 0; i < app.length; n += 1) {
  let end = Math.min(app.length, i + 90000);
  const code = app.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) end -= 1; // don't split a surrogate pair
  const name = `parts/${String(n).padStart(2, "0")}.js`;
  writeFileSync(`published/${name}`, app.slice(i, end));
  parts.push(name);
  i = end;
}
for (const old of readdirSync("assets")) if (old.startsWith("style-")) rmSync(`assets/${old}`);
copyFileSync(`site/assets/${css}`, `assets/${css}`);
writeFileSync("published/manifest.json", JSON.stringify({ css: `/grok1/assets/${css}`, parts }));
console.log(`published ${parts.length} parts, css ${css}`);
