// Pakai: node scripts/links.mjs check
//        LINK_ALIAS=nama LINK_URL=https://... node scripts/links.mjs add
//        node scripts/links.mjs build _site
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FILE = process.env.LINKS_FILE || "links.json";
const ALIAS_PATTERN = /^[a-zA-Z0-9_-]{1,48}$/;
const GOOGLE_HOSTS = ["docs.google.com", "drive.google.com"];
const GOOGLE_NOISE = ["ouid", "rtpof", "sd"];
const TRACKING = [/^utm_/i, /^fbclid$/i, /^gclid$/i];

// Isi situs yang diterbitkan. Nama folder di sini tidak boleh jadi alias.
const SITE_FILES = ["index.html", "404.html", "styles.css", "app.js", "favicon.svg", "apple-touch-icon.png"];
const SITE_DIRS = ["fonts"];
const RESERVED = SITE_DIRS;

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

function isWebUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}

// Buang parameter pelacak dan ID akun Google dari link tujuan.
function cleanUrl(value) {
  const url = new URL(value);
  const google = GOOGLE_HOSTS.includes(url.hostname);
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING.some((pattern) => pattern.test(key)) || (google && GOOGLE_NOISE.includes(key))) {
      url.searchParams.delete(key);
    }
  }
  return url.href;
}

function loadLinks() {
  let links;
  try {
    links = JSON.parse(readFileSync(FILE, "utf8"));
  } catch (error) {
    fail(`${FILE} tidak bisa dibaca sebagai JSON: ${error.message}`);
  }
  if (!links || Array.isArray(links) || typeof links !== "object") {
    fail(`${FILE} harus berupa objek JSON { "alias": "url" }.`);
  }
  return links;
}

function validate(links) {
  const seen = new Map();
  const errors = [];
  const warnings = [];
  for (const [alias, destination] of Object.entries(links)) {
    if (!ALIAS_PATTERN.test(alias)) {
      errors.push(`Alias "${alias}" tidak valid (huruf, angka, - dan _, maksimal 48).`);
    }
    const lower = alias.toLowerCase();
    if (RESERVED.includes(lower)) {
      errors.push(`Alias "${alias}" dipakai oleh folder situs. Pilih nama lain.`);
    }
    if (seen.has(lower)) {
      errors.push(`Alias "${alias}" bentrok dengan "${seen.get(lower)}" (huruf besar/kecil dianggap sama).`);
    }
    seen.set(lower, alias);
    if (typeof destination !== "string" || !isWebUrl(destination)) {
      errors.push(`Tujuan untuk "${alias}" bukan URL http(s) yang valid.`);
      continue;
    }
    if (cleanUrl(destination) !== new URL(destination).href) {
      warnings.push(`"${alias}" punya parameter pelacak atau ID akun Google. Hapus parameter itu dari ${FILE} secara manual.`);
    }
  }
  return { errors, warnings };
}

function report({ errors, warnings }) {
  for (const message of warnings) console.log(`::warning::${message}`);
  if (errors.length) {
    for (const message of errors) console.error(`::error::${message}`);
    process.exit(1);
  }
}

function check() {
  const links = loadLinks();
  report(validate(links));
  console.log(`OK: ${Object.keys(links).length} link valid.`);
}

function add() {
  const alias = (process.env.LINK_ALIAS || "").trim();
  const destination = (process.env.LINK_URL || "").trim();
  if (!ALIAS_PATTERN.test(alias)) {
    fail("Alias hanya boleh huruf, angka, tanda hubung, dan garis bawah (maksimal 48 karakter).");
  }
  if (RESERVED.includes(alias.toLowerCase())) fail(`Alias "${alias}" dipakai oleh folder situs. Pilih nama lain.`);
  if (!isWebUrl(destination)) fail("Link tujuan harus URL http:// atau https:// yang valid.");

  const links = loadLinks();
  const clash = Object.keys(links).find((key) => key.toLowerCase() === alias.toLowerCase());
  if (clash) fail(`Alias "${alias}" sudah dipakai (sebagai "${clash}").`);

  const cleaned = cleanUrl(destination);
  links[alias] = cleaned;
  writeFileSync(FILE, `${JSON.stringify(links, null, 2)}\n`);

  const note = cleaned === new URL(destination).href ? "" : " (parameter pelacak dibuang)";
  console.log(`Ditambahkan: /${alias} -> ${cleaned}${note}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Ditambahkan \`/${alias}\` → ${cleaned}${note}\n`);
  }
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Halaman kecil yang langsung mengalihkan. Disajikan dengan status 200.
function redirectPage(destination) {
  const href = new URL(destination).href;
  const url = escapeHtml(href);
  const script = JSON.stringify(href).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Mengalihkan…</title>
  <meta http-equiv="refresh" content="0; url=${url}">
  <script>window.location.replace(${script});</script>
</head>
<body>
  <p>Mengalihkan ke <a href="${url}">${url}</a>…</p>
</body>
</html>
`;
}

// Susun folder situs: file statis + satu folder per alias.
function build() {
  const out = process.argv[3];
  if (!out) fail("Pakai: node scripts/links.mjs build <folder-keluaran>");
  if (existsSync(out)) fail(`Folder keluaran "${out}" sudah ada. Pakai folder baru.`);

  const links = loadLinks();
  report(validate(links));

  mkdirSync(out, { recursive: true });
  for (const name of SITE_FILES) cpSync(name, join(out, name));
  cpSync(FILE, join(out, "links.json"));
  for (const dir of SITE_DIRS) {
    if (existsSync(dir)) cpSync(dir, join(out, dir), { recursive: true });
  }

  for (const [alias, destination] of Object.entries(links)) {
    const folder = join(out, alias);
    if (existsSync(folder)) fail(`Alias "${alias}" bentrok dengan isi situs.`);
    mkdirSync(folder);
    writeFileSync(join(folder, "index.html"), redirectPage(destination));
  }
  console.log(`Build selesai: ${Object.keys(links).length} halaman link di ${out}`);
}

const command = process.argv[2];
if (command === "check") check();
else if (command === "add") add();
else if (command === "build") build();
else fail("Pakai: node scripts/links.mjs check|add|build");
