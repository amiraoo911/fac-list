// ====== CONFIG ======
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSXLu30suf2X_bw2LNh-Oth37FTtA8xSpbvHtPepxyBrQLlbjaz_xxRBCPZfGY5uEwARJCGEf-Hd1r0/pub?gid=1991112818&single=true&output=csv"; // ...output=csv

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

// const loadPhoto = (img, basePath) => {
//   const exts = ["jpg", "jpeg", "png", "webp", "jfif"];
//   const placeholder = "assets/placeholder.jpg";
//   let i = 0;

//   const tryNext = () => {
//     if (i >= exts.length) {
//       img.onerror = null;
//       img.src = placeholder;
//       return;
//     }
//     img.src = `${basePath}.${exts[i++]}`;
//   };

//   img.onerror = tryNext;
//   tryNext();
// };
const loadPhoto = (img, basePath) => {
  const exts = ["jpg", "jpeg", "png", "webp", "jfif"];
  const placeholder = "assets/placeholder.jpg";
  let i = 0;

  const tryNext = () => {
    if (i >= exts.length) {
      img.onerror = null;
      img.src = placeholder;
      return;
    }
    img.src = `${basePath}.${exts[i++]}`;
  };

  img.onerror = tryNext;
  tryNext();
};



// async function loadFaculty() {
//   const res = await fetch(SHEET_CSV_URL);
//   if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
//   const csv = await res.text();
//   const rows = csvParse(csv);
//   if (!rows.length) return [];

//   const headers = rows[0].map(h => h.trim());

//   return rows.slice(1)
//     .map(r => {
//       const o = {};
//       headers.forEach((h, i) => {
//         if (h === "Image") return; // 🔹 ignore image column
//         o[h] = (r[i] || "").trim();
//       });

//       o._id = slugify(o["Name"]);
//       o._photo = `${PHOTOS_DIR}/${o._id}.jpg`; // unchanged
//       return o;
//     })
//     .filter(x => x["Name"]);
// }
const CSV_CACHE_KEY = "faculty_csv_cache_v1";
const CSV_CACHE_TIME_KEY = "faculty_csv_cache_time";
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

async function loadFaculty() {
  const now = Date.now();
  const cached = localStorage.getItem(CSV_CACHE_KEY);
  const cachedTime = localStorage.getItem(CSV_CACHE_TIME_KEY);

  let csv;

  if (cached && cachedTime && now - cachedTime < CACHE_TTL) {
    // ✅ Use cached CSV
    csv = cached;
  } else {
    // 🔄 Fetch fresh CSV
    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
    csv = await res.text();

    localStorage.setItem(CSV_CACHE_KEY, csv);
    localStorage.setItem(CSV_CACHE_TIME_KEY, now);
  }

  const rows = csvParse(csv);
  if (!rows.length) return [];

  const headers = rows[0].map(h => h.trim());

  return rows.slice(1)
    .map(r => {
      const o = {};
      headers.forEach((h, i) => {
        if (h === "Image") return;
        o[h] = (r[i] || "").trim();
      });

      o._id = slugify(o["Name"]);
      o._photo = `${PHOTOS_DIR}/${o._id}.jpg`;
      return o;
    })
    .filter(x => x["Name"]);
}



// ================= INDEX PAGE =================
async function renderIndex() {
  const grid = $("#grid");
  const search = $("#q");
  const positionSel = $("#position");
  // const count = $("#count");

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
      p["Additional Positions"],
      p["Areas of Research"]
    ].join(" ").toLowerCase();


      if (q && !blob.includes(q)) return false;
      if (pos && p["Position"] !== pos) return false;
      return true;
    });

    // count.textContent = `${filtered.length} faculty`;
    grid.innerHTML = "";

    filtered.forEach(p => {
      const card = document.createElement("a");
      card.className = "card";
      card.href = `profile.html?id=${p._id}`;

      const img = document.createElement("img");
      img.className = "avatar";
      // img.src = p._photo;
      // img.alt = p["Name"];
      loadPhoto(img, `${PHOTOS_DIR}/${p._id}`);
      // img.onerror = () => img.style.display = "none";

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
        <img id="profile-photo" class="big" alt="${p["Name"]}">
        <div>
          <div class="h2">${p["Name"]}</div>
          <div class="small">${p["Position"]}</div>
          <div class="links">
            ${p["Research Profile"] ? `<a href="${safeLink(p["Research Profile"])}" target="_blank">Research Profile</a>` : ""}
            ${p["LinkedIn"] ? `<a href="${safeLink(p["LinkedIn"])}" target="_blank">LinkedIn</a>` : ""}
          </div>
          ${p["Additional Positions"] ? `<p class="small"><strong>Additional Positions:</strong> ${p["Additional Positions"]}</p>` : ""}
        <div class="kv">
          ${p["BSc"] ? `<div class="k">BSc</div><div class="v">${p["BSc School"]}, ${p["BSc"]}${p["BSc Year"] ? ` (${p["BSc Year"]})` : ""}</div>` : ""}
          ${p["MSc"] ? `<div class="k">MSc</div><div class="v">${p["MSc School"]}, ${p["MSc"]}${p["MSc Year"] ? ` (${p["MSc Year"]})` : ""}</div>` : ""}
          ${p["PhD"] ? `<div class="k">PhD</div><div class="v">${p["PhD School"]}, ${p["PhD"]}${p["PhD Year"] ? ` (${p["PhD Year"]})` : ""}</div>` : ""}
          </div>
         ${p["Areas of Research"]
  ? `
    <div style="margin-top:22px">
      <div class="k">Areas of Research</div>
      <ul class="research-list">
        ${p["Areas of Research"].split(",").map(i => `<li>${i.trim()}</li>`).join("")}
      </ul>
    </div>
  `
  : ""
}

${p["Courses"]
  ? `
    <div style="margin-top:16px">
      <div class="k">Courses</div>
      <ul class="research-list">
        ${p["Courses"].split(",").map(i => `<li>${i.trim()}</li>`).join("")}
      </ul>
    </div>
  `
  : ""
}

${p["Awards"]
  ? `
    <div style="margin-top:16px">
      <div class="k">Awards</div>
      <ul class="research-list">
        ${p["Awards"].split(",").map(i => `<li>${i.trim()}</li>`).join("")}
      </ul>
    </div>
  `
  : ""
}

        <div style="margin-top:20px">
          <a class="badge" href="index.html">← Back to directory</a>
        </div>
      </div>
  </div>

  `;

  const img = document.getElementById("profile-photo");
  loadPhoto(img, `${PHOTOS_DIR}/${p._id}`);
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
