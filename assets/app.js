// ====== CONFIG ======
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDh5KRyHBv2oVhE5ErC4ow0KKsapv5TTZek7rV1ZbWANn3nRR4vFxXZ3WjTGrpt9FLEtQq6EoX2rbt/pub?gid=0&single=true&output=csv"; // ...output=csv
const PHOTOS_DIR = "photos"; // folder in repo

// ================= HELPERS =================
const $ = (s) => document.querySelector(s);

const slugify = (s) =>
  (s || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const csvParse = (text) => {
  const rows = [];
  let row = [],
    val = "",
    inQ = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i],
      n = text[i + 1];

    if (c === '"' && inQ && n === '"') {
      val += '"';
      i++;
    } else if (c === '"') {
      inQ = !inQ;
    } else if (c === "," && !inQ) {
      row.push(val);
      val = "";
    } else if ((c === "\n" || c === "\r") && !inQ) {
      if (val.length || row.length) {
        row.push(val);
        rows.push(row);
        row = [];
        val = "";
      }
      if (c === "\r" && n === "\n") i++;
    } else {
      val += c;
    }
  }
  if (val.length || row.length) {
    row.push(val);
    rows.push(row);
  }
  return rows;
};

const safeLink = (url) => {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : "https://" + url;
};

// ================= LOAD DATA =================
async function loadFaculty() {
  const res = await fetch(SHEET_CSV_URL);
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
  const csv = await res.text();
  const rows = csvParse(csv);
  if (!rows.length) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o = {};
    headers.forEach((h, i) => (o[h] = (r[i] || "").trim()));
    o._id = slugify(o["Name"]);
    o._photo = `${PHOTOS_DIR}/${o._id}.jpg`;
    return o;
  }).filter(x => x["Name"]);
}

// ================= INDEX PAGE =================
async function renderIndex() {
  const grid = $("#grid");
  const search = $("#q");
  const positionSel = $("#position");
  const count = $("#count");

  const all = await loadFaculty();

  // Build position filter
  const positions = [...new Set(all.map(x => x["Position"]).filter(Boolean))].sort();
  positions.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    positionSel.appendChild(opt);
  });

  const paint = () => {
    const q = search.value.toLowerCase().trim();
    const pos = positionSel.value;

    const filtered = all.filter(p => {
      const blob = [
        p["Name"],
        p["Position"],
        p["Areas of Research"],
        p["Other Affiliations"]
      ].join(" ").toLowerCase();

      if (q && !blob.includes(q)) return false;
      if (pos && p["Position"] !== pos) return false;
      return true;
    });

    count.textContent = `${filtered.length} faculty`;
    grid.innerHTML = "";

    filtered.forEach(p => {
      const card = document.createElement("a");
      card.className = "card";
      card.href = `profile.html?id=${p._id}`;

      const img = document.createElement("img");
      img.className = "avatar";
      img.src = p._photo;
      img.alt = p["Name"];
      img.onerror = () => img.style.display = "none";

      const info = document.createElement("div");
      info.innerHTML = `
        <div class="name">${p["Name"]}</div>
        <div class="position">${p["Position"]}</div>
      `;

      card.appendChild(img);
      card.appendChild(info);
      grid.appendChild(card);
    });
  };

  search.addEventListener("input", paint);
  positionSel.addEventListener("change", paint);
  paint();
}

// ================= PROFILE PAGE =================
async function renderProfile() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const box = $("#profile");

  const all = await loadFaculty();
  const p = all.find(x => x._id === id);

  if (!p) {
    box.innerHTML = `<div class="panel">Faculty member not found. <a href="index.html">Back</a></div>`;
    return;
  }

  const courses = (p["Courses"] || "")
    .split(/\s*,\s*|\n+/)
    .filter(Boolean)
    .map(c => `<li>${c}</li>`)
    .join("");

  box.innerHTML = `
    <div class="panel">
      <div class="profile">
        <img class="big" src="${p._photo}" alt="${p["Name"]}" onerror="this.style.display='none'">
        <div>
          <div class="h2">${p["Name"]}</div>
          <div class="small">${p["Position"]}</div>
          <div class="links">
            ${p["Google Scholar"] ? `<a href="${safeLink(p["Google Scholar"])}" target="_blank">Google Scholar</a>` : ""}
            ${p["LinkedIn"] ? `<a href="${safeLink(p["LinkedIn"])}" target="_blank">LinkedIn</a>` : ""}
          </div>
          ${p["Other Affiliations"] ? `<p class="small"><strong>Other Affiliations:</strong> ${p["Other Affiliations"]}</p>` : ""}
        </div>
      </div>

      <hr class="sep">

      <div class="kv">
        ${p["BSc"] ? `<div class="k">BSc</div><div class="v">${p["BSc School"]}, BSc (${p["BSc"]})</div>` : ""}
        ${p["MSc"] ? `<div class="k">MSc</div><div class="v">${p["MSc School"]}, MSc (${p["MSc"]})</div>` : ""}
        ${p["PhD"] ? `<div class="k">PhD</div><div class="v">${p["PhD School"]}, PhD (${p["PhD"]})</div>` : ""}
      </div>

      ${p["Areas of Research"] ? `<div style="margin-top:16px"><div class="k">Areas of Research</div><div class="v">${p["Areas of Research"]}</div></div>` : ""}

      ${courses ? `<div style="margin-top:16px"><div class="k">Courses</div><ul style="margin-top:6px;padding-left:18px">${courses}</ul></div>` : ""}

      ${p["Awards"] ? `<div style="margin-top:16px"><div class="k">Awards</div><div class="v">${p["Awards"]}</div></div>` : ""}

      <div style="margin-top:20px">
        <a class="badge" href="index.html">← Back to directory</a>
      </div>
    </div>
  `;
}

// ================= BOOT =================
document.addEventListener("DOMContentLoaded", async () => {
  try {
    if ($("#grid")) await renderIndex();
    if ($("#profile")) await renderProfile();
  } catch (e) {
    console.error(e);
    const target = $("#grid") || $("#profile");
    if (target) target.innerHTML = `<div class="panel"><strong>Error:</strong> ${e.message}</div>`;
  }
});
