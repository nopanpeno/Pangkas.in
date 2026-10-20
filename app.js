const ALIAS_PATTERN = /^[a-zA-Z0-9_-]+$/;
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
    return {};
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

  const links = await loadLinks();
  if (Object.keys(links).some((registered) => registered.toLowerCase() === alias.toLowerCase())) {
    showMessage("Nama pendek ini sudah dipakai. Coba alias lain.");
    aliasField.focus();
    return;
  }

  const proposedUrl = shortUrl(alias);
  message.replaceChildren();
  message.append("Draft siap: ");
  const resultLink = document.createElement("a");
  resultLink.href = proposedUrl;
  resultLink.textContent = proposedUrl;
  resultLink.target = "_blank";
  resultLink.rel = "noopener noreferrer";
  message.append(resultLink, document.createElement("br"));
  const instruction = document.createElement("span");
  instruction.textContent = "Agar shortlink aktif untuk semua orang, pemilik situs perlu menambahkan alias dan URL tujuan ke links.json lalu menerbitkan ulang situs.";
  message.append(instruction, document.createElement("br"));
  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "copy-inline";
  copyButton.textContent = "Salin draft";
  copyButton.addEventListener("click", async () => {
    try {
      await copyText(proposedUrl);
      copyButton.textContent = "Tersalin ✓";
    } catch {
      copyButton.textContent = "Gagal menyalin";
    }
  });
  message.append(copyButton);
  message.className = "form-message success";
  message.hidden = false;
});

loadLinks();