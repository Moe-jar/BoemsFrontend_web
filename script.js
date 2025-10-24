/*
const API_BASE = "http://localhost:5132/api/Boems";
const AUTHORS_API = "http://localhost:5132/api/Authors";


*/
const API_BASE = "https://sofismboemsapis-production.up.railway.app/api/Boems";
const AUTHORS_API =
  "https://sofismboemsapis-production.up.railway.app/api/Authors";

const particlesEl = document.getElementById("particles");
(function makeParticles() {
  const colors = ["#0b6b4a", "#00d07a", "#7fffd4", "#0fa36b"];
  for (let i = 0; i < 26; i++) {
    const el = document.createElement("div");
    el.className = "particle";
    const size = Math.random() * 40 + 8;
    el.style.width = size + "px";
    el.style.height = size + "px";
    el.style.left = Math.random() * 100 + "vw";
    el.style.top = Math.random() * 100 + "vh";
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.opacity = (Math.random() * 0.16 + 0.04).toFixed(2);
    el.style.animationDuration = 6 + Math.random() * 8 + "s";
    el.style.animationDelay = Math.random() * 2 + "s";
    particlesEl.appendChild(el);
  }
})();

function qs(id) {
  return document.getElementById(id);
}
function show(el) {
  el.classList.add("show");
  el.setAttribute("aria-hidden", "false");
}
function hide(el) {
  el.classList.remove("show");
  el.setAttribute("aria-hidden", "true");
}
function escapeHtml(s) {
  if (s == null) return "";
  return String(s).replace(
    /[&<>"'`=\/]/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "`": "&#96;",
        "/": "&#47;",
        "=": "&#61;",
      }[c])
  );
}
function formatPoemText(txt) {
  return String(txt)
    .split(/\r?\n/)
    .map((line) => `<div>${escapeHtml(line) || "<br>"}</div>`)
    .join("");
}

// dynamic authors dropdown
async function loadAuthors() {
  const select = qs("quickAuthor");
  try {
    const res = await fetch(AUTHORS_API + "/All");
    if (!res.ok) throw new Error("فشل جلب المؤلفين");
    const authors = await res.json();
    select.innerHTML = '<option value="">اختر المؤلف</option>';
    authors.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a.id ?? a.Id ?? a.ID;
      opt.textContent = a.name ?? a.Name ?? "بدون اسم";
      select.appendChild(opt);
    });
  } catch (err) {
    select.innerHTML = `<option value="">خطأ: ${err.message}</option>`;
    console.error(err);
  }
}

// search
async function onSearch() {
  const keyword = qs("searchInput").value.trim();
  const results = qs("results");
  results.innerHTML = `<div style="padding:12px;color:var(--muted)">⏳ جارٍ البحث عن: «${escapeHtml(
    keyword
  )}»...</div>`;
  if (!keyword) {
    results.innerHTML = `<div style="padding:12px;color:rgba(255,255,255,0.6)">اكتب كلمة للبحث</div>`;
    return;
  }
  try {
    const r = await fetch(`${API_BASE}/Search/${encodeURIComponent(keyword)}`);
    if (!r.ok) {
      if (r.status === 404) throw new Error("لا توجد نتائج");
      else throw new Error("خطأ في الاستجابة");
    }
    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) {
      results.innerHTML = `<div style="padding:12px;color:#fca5a5">لا توجد نتائج عن «${escapeHtml(
        keyword
      )}»</div>`;
      return;
    }
    results.innerHTML = "";
    data.forEach((item) => {
      const id = item.id ?? item.Id ?? item.ID;
      const title = escapeHtml(item.title ?? item.Title ?? "بدون عنوان");
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.innerHTML = `<div class="title">${title}</div><div class="meta">id: ${id}</div>`;
      tile.onclick = () => loadById(id);

      let pressTimer;
      tile.addEventListener("mousedown", (e) => {
        e.preventDefault();
        pressTimer = setTimeout(() => showActionMenu(id, title), 600);
      });
      tile.addEventListener("mouseup", () => clearTimeout(pressTimer));
      tile.addEventListener("mouseleave", () => clearTimeout(pressTimer));
      tile.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showActionMenu(id, title);
      });

      results.appendChild(tile);
    });
  } catch (err) {
    results.innerHTML = `<div style="padding:12px;color:#fda085">حدث خطأ أثناء البحث — ${escapeHtml(
      err.message
    )}</div>`;
    console.error(err);
  }
}

// show modal with admin input
function showActionMenu(id, title) {
  const confirmModal = qs("confirmModal");
  confirmModal.innerHTML = `
    <div class="modal-card small">
      <h3>إجراء على القصيدة: ${escapeHtml(title)}</h3>
      <label>اسم المسؤول:</label>
      <input id="adminNameInput" type="text" placeholder="أدخل اسم المسؤول">
      <div class="form-actions">
        <button id="setCurrentBtn" class="btn-submit">⭐ اجعلها قصيدة حالية</button>
        <button id="addToLinkBtn" class="btn-submit">➕ أضف للوصلة الحالية</button>
        <button id="cancelBtn" class="btn-clear">إلغاء</button>
      </div>
      <p id="actionMsg" class="status-msg"></p>
    </div>
  `;
  show(confirmModal);
  const adminInput = qs("adminNameInput");
  const msgEl = qs("actionMsg");

  qs("setCurrentBtn").onclick = async () => {
    const username = adminInput.value.trim();
    if (!username) return (msgEl.textContent = "❌ الرجاء إدخال اسم المسؤول");
    await setBoemAsCurrent(id, username);
    hide(confirmModal);
  };
  qs("addToLinkBtn").onclick = async () => {
    const username = adminInput.value.trim();
    if (!username) return (msgEl.textContent = "❌ الرجاء إدخال اسم المسؤول");
    await addToCurrentList(id, username);
    hide(confirmModal);
  };
  qs("cancelBtn").onclick = () => hide(confirmModal);
}

// set current poem
async function setBoemAsCurrent(id, username) {
  try {
    const res = await fetch(
      `${API_BASE}/AddToCurrent?id=${id}&AdminUserName=${encodeURIComponent(
        username
      )}`,
      { method: "POST" }
    );
    if (res.ok) {
      alert("✅ تم عرض القصيدة للجميع بنجاح");
    } else if (res.status === 400) {
      alert("❌ لا يمكنك مشاركة هذه القصيدة — بيانات غير صحيحة");
    } else {
      const msg = await res.text();
      alert("⚠️ خطأ في المشاركة: " + msg);
    }
  } catch (err) {
    alert("❌ فشل الاتصال بالخادم: " + err.message);
  }
}

// add to current list
async function addToCurrentList(id, username) {
  try {
    const res = await fetch(
      `${API_BASE}/AddToCurrentList?id=${id}&AdminUserName=${encodeURIComponent(
        username
      )}`,
      { method: "POST" }
    );
    if (res.ok) {
      alert("✅ تم إضافة القصيدة للوصلة الحالية بنجاح");
    } else {
      const msg = await res.text();
      alert("⚠️ خطأ: " + msg);
    }
  } catch (err) {
    alert("❌ فشل الاتصال بالخادم: " + err.message);
  }
}

// load by id
async function loadById(id) {
  if (!id) {
    alert("معرّف غير صالح");
    return;
  }
  const view = qs("viewer");
  qs("viewTitle").textContent = "جارٍ التحميل...";
  qs("viewBody").textContent = "";
  show(view);
  try {
    const r = await fetch(`${API_BASE}/ById/${encodeURIComponent(id)}`);
    if (!r.ok) throw new Error("لم يتم العثور على القصيدة");
    const poem = await r.json();
    const title = poem.title ?? poem.Title ?? "بدون عنوان";
    const text =
      poem.boemText ??
      poem.BoemText ??
      poem.text ??
      poem.Text ??
      poem.body ??
      "";
    qs("viewTitle").textContent = title;
    qs("viewBody").innerHTML = text
      ? formatPoemText(text)
      : '<i style="color:rgba(255,255,255,0.6)">لا يوجد نص للقصيدة</i>';
  } catch (err) {
    qs("viewTitle").textContent = "حدث خطأ";
    qs("viewBody").textContent = err.message || "فشل في جلب القصيدة";
    console.error(err);
  }
}

// current poem
async function onCurrent() {
  const view = qs("viewer");
  qs("viewTitle").textContent = "جارٍ التحميل...";
  qs("viewBody").textContent = "";
  show(view);
  try {
    const res = await fetch(`${API_BASE}/Current`);
    if (!res.ok) {
      if (res.status === 400) throw new Error("لم يتم تعيين قصيدة حالية بعد");
      throw new Error("خطأ في جلب القصيدة الحالية");
    }
    const poem = await res.json();
    const title = poem.title ?? poem.Title ?? "بدون عنوان";
    const text =
      poem.boemText ??
      poem.BoemText ??
      poem.text ??
      poem.Text ??
      poem.body ??
      "";
    qs("viewTitle").textContent = title;
    qs("viewBody").innerHTML = text
      ? formatPoemText(text)
      : '<i style="color:rgba(255,255,255,0.6)">لا يوجد نص للقصيدة</i>';
  } catch (err) {
    qs("viewTitle").textContent = "حدث خطأ";
    qs("viewBody").innerHTML = `<div style="color:#fda085">${escapeHtml(
      err.message
    )}</div>`;
  }
}

// current list
async function onCurrentList() {
  const results = qs("results");
  results.innerHTML = `<div style="padding:12px;color:var(--muted)">⏳ جارٍ تحميل الوصلة الحالية...</div>`;
  try {
    const r = await fetch(`${API_BASE}/CurrentListOfBoems`);
    if (!r.ok) throw new Error("لم يتم العثور على الوصلة الحالية");
    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) {
      results.innerHTML = `<div style="padding:12px;color:#fca5a5">الوصلة الحالية فارغة</div>`;
      return;
    }
    results.innerHTML = "";
    data.forEach((item) => {
      const id = item.id ?? item.Id ?? item.ID;
      const title = escapeHtml(item.title ?? item.Title ?? "بدون عنوان");
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.innerHTML = `<div class="title">${title}</div><div class="meta">id: ${id}</div>`;
      tile.onclick = () => loadById(id);
      let pressTimer;
      tile.addEventListener("mousedown", (e) => {
        e.preventDefault();
        pressTimer = setTimeout(() => showActionMenu(id, title), 600);
      });
      tile.addEventListener("mouseup", () => clearTimeout(pressTimer));
      tile.addEventListener("mouseleave", () => clearTimeout(pressTimer));
      tile.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showActionMenu(id, title);
      });
      results.appendChild(tile);
    });
  } catch (err) {
    results.innerHTML = `<div style="padding:12px;color:#fda085">حدث خطأ: ${escapeHtml(
      err.message
    )}</div>`;
    console.error(err);
  }
}

// load all poems
async function onAllPoems() {
  const results = qs("results");
  results.innerHTML = `<div style="padding:12px;color:var(--muted)">⏳ جارٍ تحميل جميع القصائد...</div>`;
  try {
    const r = await fetch(`${API_BASE}/All`);
    if (!r.ok) throw new Error("لم يتم العثور على القصائد");
    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) {
      results.innerHTML = `<div style="padding:12px;color:#fca5a5">لا توجد قصائد</div>`;
      return;
    }
    results.innerHTML = "";
    data.forEach((item) => {
      const id = item.id ?? item.Id ?? item.ID;
      const title = escapeHtml(item.title ?? item.Title ?? "بدون عنوان");
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.innerHTML = `<div class="title">${title}</div><div class="meta">id: ${id}</div>`;
      tile.onclick = () => loadById(id);
      let pressTimer;
      tile.addEventListener("mousedown", (e) => {
        e.preventDefault();
        pressTimer = setTimeout(() => showActionMenu(id, title), 600);
      });
      tile.addEventListener("mouseup", () => clearTimeout(pressTimer));
      tile.addEventListener("mouseleave", () => clearTimeout(pressTimer));
      tile.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showActionMenu(id, title);
      });
      results.appendChild(tile);
    });
  } catch (err) {
    results.innerHTML = `<div style="padding:12px;color:#fda085">حدث خطأ: ${escapeHtml(
      err.message
    )}</div>`;
    console.error(err);
  }
}

// modal
qs("viewer").addEventListener("click", (e) => {
  if (e.target === qs("viewer")) closeViewer();
});
function closeViewer() {
  hide(qs("viewer"));
  qs("viewBody").scrollTop = 0;
}

// shortcuts
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    qs("searchInput").focus();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  loadAuthors();
});
