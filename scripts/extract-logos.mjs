// Extrai as logos embutidas no bundle do protótipo (Portal NavemazoniaPrototipo.html)
// e salva como arquivos reais em src/assets/brand/.
//
// Uso: node scripts/extract-logos.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const htmlPath = join(root, "Portal NavemazoniaPrototipo.html");
const outDir = join(root, "src", "assets", "brand");

// UUIDs localizados no template de login/header do protótipo.
const TARGETS = {
  "3d1d4751-02b2-4015-81a7-7672f604a68c": "logo-icon",
  "9a56d02c-1b7d-40ea-843e-ae69ea73cce5": "logo-navemazonia",
};

const MIME_EXT = {
  "image/svg+xml": "svg",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const html = readFileSync(htmlPath, "utf8");

// Extrai o conteúdo do <script type="__bundler/manifest">…</script>.
const match = html.match(
  /<script type="__bundler\/manifest">([\s\S]*?)<\/script>/,
);
if (!match) {
  console.error("Bloco __bundler/manifest não encontrado no HTML.");
  process.exit(1);
}

const manifest = JSON.parse(match[1]);

mkdirSync(outDir, { recursive: true });

let count = 0;
for (const [uuid, name] of Object.entries(TARGETS)) {
  const entry = manifest[uuid];
  if (!entry) {
    console.warn(`UUID ${uuid} (${name}) não está no manifest — pulando.`);
    continue;
  }

  let bytes = Buffer.from(entry.data, "base64");
  if (entry.compressed) bytes = gunzipSync(bytes);

  const ext = MIME_EXT[entry.mime] ?? "bin";
  const outPath = join(outDir, `${name}.${ext}`);
  writeFileSync(outPath, bytes);
  count++;
  console.log(`✓ ${name}.${ext}  (${entry.mime}, ${bytes.length} bytes)`);
}

console.log(`\n${count} arquivo(s) extraído(s) em src/assets/brand/`);
