const ALIAS_PATTERN = /^[a-zA-Z0-9_-]+$/;
const RESERVED_ALIASES = ["fonts"];
const WORKFLOW_URL = "https://github.com/nopanpeno/pangkas.in/actions/workflows/add-link.yml";
const form = document.querySelector("#shortlink-form");
const aliasField = document.querySelector("#alias");
const destinationField = document.querySelector("#destination");
const message = document.querySelector("#form-message");
const list = document.querySelector("#links-list");
const count = document.querySelector("#link-count");
const empty = document.querySelector("#links-empty");
const aliasPreview = document.querySelector("#alias-preview");

const siteBase = new URL("./", window.location.href);

function shortUrl(alias) {
  return new URL(encodeURIComponent(alias), siteBase).href;
}

function updateAliasPreview() {
  const alias = aliasField.value.trim();
  aliasPreview.textContent = alias ? shortUrl(alias) : `${siteBase.host}${siteBase.pathname}nama-link`;
}
updateAliasPreview();
aliasField.addEventListener("input", updateAliasPreview);

function showMessage(text, type = "error") {
  message.textContent = text;
  message.className = `form-message ${type}`;
  message.hidden = false;
}

function validDestination(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function normalizeAlias(value) {
  return value.trim();
}

async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const temporary = document.createElement("textarea");
  temporary.value = value;
  temporary.style.position = "fixed";
  temporary.style.opacity = "0";
  document.body.append(temporary);
  temporary.select();
  const copied = document.execCommand("copy");
  temporary.remove();
  if (!copied) throw new Error("copy_failed");
}

function copyInlineButton(label, value) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "copy-inline";
  button.textContent = label;
  button.addEventListener("click", async () => {
    try {
      await copyText(value);
      button.textContent = "Tersalin ✓";
    } catch {
      button.textContent = "Gagal menyalin";
    }
    window.setTimeout(() => {
      button.textContent = label;
    }, 1500);
  });
  return button;
}

function renderLinks(links) {
  const entries = Object.entries(links);
  count.textContent = `${entries.length} link tersedia`;
  empty.hidden = entries.length > 0;
  list.replaceChildren();

  for (const [alias, destination] of entries) {
    const card = document.createElement("article");
    card.className = "link-card";
    const icon = document.createElement("span");
    icon.className = "link-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "↗";
    const info = document.createElement("div");
    info.className = "link-info";
    const link = document.createElement("a");
    link.className = "link-alias";
    link.href = shortUrl(alias);
    link.textContent = `/${alias}`;
    const target = document.createElement("span");
    target.className = "link-url";
    target.textContent = destination;
    target.title = destination;
    info.append(link, target);
    const button = document.createElement("button");
    button.className = "copy-button";
    button.type = "button";
    button.setAttribute("aria-label", `Salin shortlink ${alias}`);
    button.title = "Salin shortlink";
    button.textContent = "⧉";
    button.addEventListener("click", async () => {
      try {
        await copyText(link.href);
        button.textContent = "✓";
        button.setAttribute("aria-label", `Shortlink ${alias} disalin`);
        window.setTimeout(() => {
          button.textContent = "⧉";
          button.setAttribute("aria-label", `Salin shortlink ${alias}`);
        }, 1500);
      } catch {
        showMessage("Gagal menyalin otomatis. Pilih dan salin alamat shortlink secara manual.");
      }
    });
    card.append(icon, info, button);
    list.append(card);
  }
}

async function loadLinks() {
  try {
    const response = await fetch(new URL("links.json", siteBase));
    if (!response.ok) throw new Error("links_unavailable");
    const links = await response.json();
    if (!links || Array.isArray(links) || typeof links !== "object") throw new Error("invalid_config");
    renderLinks(links);
    return links;
  } catch {
    renderLinks({});
    showMessage("Daftar link belum dapat dimuat. Coba muat ulang halaman atau hubungi pemilik situs.");
    return null;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.hidden = true;
  const alias = normalizeAlias(aliasField.value);
  const destination = destinationField.value.trim();

  if (!destination) {
    showMessage("Link tujuan wajib diisi.");
    destinationField.focus();
    return;
  }
  if (!validDestination(destination)) {
    showMessage("Masukkan URL yang valid dengan protokol http:// atau https://.");
    destinationField.focus();
    return;
  }
  if (!alias) {
    showMessage("Nama pendek wajib diisi.");
    aliasField.focus();
    return;
  }
  if (!ALIAS_PATTERN.test(alias)) {
    showMessage("Nama pendek hanya boleh berisi huruf, angka, tanda hubung, dan garis bawah.");
    aliasField.focus();
    return;
  }

  if (RESERVED_ALIASES.includes(alias.toLowerCase())) {
    showMessage("Nama pendek ini dipakai oleh situs. Coba alias lain.");
    aliasField.focus();
    return;
  }

  const links = await loadLinks();
  if (!links) {
    // Daftar tidak termuat, jadi cek alias ganda tidak bisa dipercaya. Pesan sudah tampil.
    return;
  }
  if (Object.keys(links).some((registered) => registered.toLowerCase() === alias.toLowerCase())) {
    showMessage("Nama pendek ini sudah dipakai. Coba alias lain.");
    aliasField.focus();
    return;
  }

  message.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = `Siap ditambahkan: ${shortUrl(alias)}`;
  const steps = document.createElement("span");
  steps.textContent = "Buka workflow “Tambah shortlink” di GitHub, tekan Run workflow, lalu tempel alias dan link tujuan (tombol salin ada di bawah). Link aktif sekitar 1–2 menit kemudian.";
  const actions = document.createElement("div");
  actions.className = "message-actions";
  const workflow = document.createElement("a");
  workflow.className = "copy-inline";
  workflow.href = WORKFLOW_URL;
  workflow.target = "_blank";
  workflow.rel = "noopener noreferrer";
  workflow.textContent = "Buka workflow ↗";
  actions.append(copyInlineButton("Salin alias", alias), copyInlineButton("Salin link tujuan", destination), workflow);
  message.append(title, document.createElement("br"), steps, actions);
  message.className = "form-message success";
  message.hidden = false;
});

loadLinks();