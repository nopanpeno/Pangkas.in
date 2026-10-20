// Pakai: node scripts/links.mjs check
//        LINK_ALIAS=nama LINK_URL=https://... node scripts/links.mjs add
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

const FILE = process.env.LINKS_FILE || "links.json";
const ALIAS_PATTERN = /^[a-zA-Z0-9_-]{1,48}$/;
const GOOGLE_HOSTS = ["docs.google.com", "drive.google.com"];
const GOOGLE_NOISE = ["ouid", "rtpof", "sd"];
const TRACKING = [/^utm_/i, /^fbclid$/i, /^gclid$/i];

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

function check() {
  const links = loadLinks();
  const seen = new Map();
  const errors = [];
  for (const [alias, destination] of Object.entries(links)) {
    if (!ALIAS_PATTERN.test(alias)) {
      errors.push(`Alias "${alias}" tidak valid (huruf, angka, - dan _, maksimal 48).`);
    }
    const lower = alias.toLowerCase();
    if (seen.has(lower)) {
      errors.push(`Alias "${alias}" bentrok dengan "${seen.get(lower)}" (huruf besar/kecil dianggap sama).`);
    }
    seen.set(lower, alias);
    if (typeof destination !== "string" || !isWebUrl(destination)) {
      errors.push(`Tujuan untuk "${alias}" bukan URL http(s) yang valid.`);
      continue;
    }
    if (cleanUrl(destination) !== new URL(destination).href) {
      console.log(`::warning::"${alias}" punya parameter pelacak atau ID akun Google. Hapus parameter itu dari ${FILE} secara manual.`);
    }
  }
  if (errors.length) {
    for (const message of errors) console.error(`::error::${message}`);
    process.exit(1);
  }
  console.log(`OK: ${Object.keys(links).length} link valid.`);
}

function add() {
  const alias = (process.env.LINK_ALIAS || "").trim();
  const destination = (process.env.LINK_URL || "").trim();
  if (!ALIAS_PATTERN.test(alias)) {
    fail("Alias hanya boleh huruf, angka, tanda hubung, dan garis bawah (maksimal 48 karakter).");
  }
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

const command = process.argv[2];
if (command === "check") check();
else if (command === "add") add();
else fail("Pakai: node scripts/links.mjs check|add");
