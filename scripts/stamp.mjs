// After the build: version the script and stylesheet URLs by content hash, and make 404.html a copy
// of index.html so any page address (triptable.io/catalog) opens the app on GitHub Pages.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const dir = "site";
const hash = (file) => createHash("sha256").update(readFileSync(`${dir}/${file}`)).digest("hex").slice(0, 10);
let html = readFileSync(`${dir}/index.html`, "utf8");
for (const file of ["app.js", "style.css"]) {
  const re = new RegExp(`(["'])\\./${file.replace(".", "\\.")}\\1`, "g");
  if (!re.test(html)) throw new Error(`index.html does not reference ./${file}`);
  html = html.replace(re, `"./${file}?v=${hash(file)}"`);
}
writeFileSync(`${dir}/index.html`, html);
writeFileSync(`${dir}/404.html`, html);
