const API_BASE = "https://sofismboemsapis-production.up.railway.app/api/Boems";
const AUTHORS_API = "https://sofismboemsapis-production.up.railway.app/api/Authors";


/*
const API_BASE = "http://localhost:5132/api/Boems";
const AUTHORS_API = "http://localhost:5132/api/Authors";
*/

/* particles */
const particlesEl = document.getElementById('particles');
(function makeParticles(){
  const colors = ['#0b6b4a','#00d07a','#7fffd4','#0fa36b'];
  for(let i=0;i<26;i++){
    const el = document.createElement('div');
    el.className = 'particle';
    const size = Math.random()*40 + 8;
    el.style.width = size+'px';
    el.style.height = size+'px';
    el.style.left = (Math.random()*100) + 'vw';
    el.style.top = (Math.random()*100) + 'vh';
    el.style.background = colors[Math.floor(Math.random()*colors.length)];
    el.style.opacity = (Math.random()*0.16 + 0.04).toFixed(2);
    el.style.animationDuration = (6 + Math.random()*8) + 's';
    el.style.animationDelay = (Math.random()*2) + 's';
    particlesEl.appendChild(el);
  }
})();

/* helpers */
function qs(id){ return document.getElementById(id) }
function show(el){ el.classList.add('show'); el.setAttribute('aria-hidden','false') }
function hide(el){ el.classList.remove('show'); el.setAttribute('aria-hidden','true') }
function escapeHtml(s){
  if(s==null) return '';
  return String(s).replace(/[&<>"'`=\/]/g, function(c){ 
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;','/':'&#47;','=':'&#61;'}[c];
  });
}
function formatPoemText(txt){
  const parts = String(txt).split(/\r?\n/).map(line => `<div>${escapeHtml(line) || '<br>'}</div>`);
  return parts.join('');
}

/* load authors dynamically for the dropdown */
async function loadAuthors(){
  const select = qs('quickAuthor');
  try {
    const res = await fetch(AUTHORS_API+'/All');
    if(!res.ok) throw new Error('فشل جلب المؤلفين');
    const authors = await res.json();
    select.innerHTML = '<option value="">اختر المؤلف</option>';
    authors.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id ?? a.Id ?? a.ID;
      opt.textContent = a.name ?? a.Name ?? 'بدون اسم';
      select.appendChild(opt);
    });
  } catch(err){
    select.innerHTML = `<option value="">خطأ: ${err.message}</option>`;
    console.error(err);
  }
}

/* search functionality */
async function onSearch(){
  const keyword = qs('searchInput').value.trim();
  const results = qs('results');
  results.innerHTML = `<div style="padding:12px;color:var(--muted)">⏳ جارٍ البحث عن: «${escapeHtml(keyword)}»...</div>`;
  if(!keyword){ results.innerHTML = `<div style="padding:12px;color:rgba(255,255,255,0.6)">اكتب كلمة للبحث</div>`; return; }

  try {
    const r = await fetch(`${API_BASE}/Search/${encodeURIComponent(keyword)}`);
    if(!r.ok){
      if(r.status === 404) throw new Error('لا توجد نتائج');
      else throw new Error('خطأ في الاستجابة');
    }
    const data = await r.json();
    if(!Array.isArray(data) || data.length === 0){
      results.innerHTML = `<div style="padding:12px;color:#fca5a5">لا توجد نتائج عن «${escapeHtml(keyword)}»</div>`;
      return;
    }

    results.innerHTML = '';
    data.forEach(item=>{
      const id = item.id ?? item.Id ?? item.ID;
      const title = escapeHtml(item.title ?? item.Title ?? 'بدون عنوان');

      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.innerHTML = `
        <div class="title">${title}</div>
        <div class="meta">id: ${id}</div>
      `;

      // tap or click → open poem
      tile.onclick = ()=> loadById(id);

      // long press or right click → show share option
      let pressTimer;
      tile.addEventListener('mousedown', e => {
        e.preventDefault();
        pressTimer = setTimeout(()=> showShareOption(id, title), 600);
      });
      tile.addEventListener('mouseup', ()=> clearTimeout(pressTimer));
      tile.addEventListener('mouseleave', ()=> clearTimeout(pressTimer));
      tile.addEventListener('contextmenu', e=>{
        e.preventDefault();
        showShareOption(id, title);
      });

      results.appendChild(tile);
    });

  } catch (err){
    results.innerHTML = `<div style="padding:12px;color:#fda085">حدث خطأ أثناء البحث — ${escapeHtml(err.message)}</div>`;
    console.error(err);
  }
}

/* share option */
function showShareOption(id, title){
  if(!confirm(`عرض القصيدة «${title}» للجميع؟`)) return;
  const username = prompt("أدخل اسم المستخدم (الإداري):");
  if(!username) return alert("لم يتم إدخال اسم المستخدم");

  setBoemAsCurrent(id, username);
}

/* call backend to set current poem */
async function setBoemAsCurrent(id, username){
  try {
    const res = await fetch(`${API_BASE}/AddToCurrent?id=${id}&AdminUserName=${encodeURIComponent(username)}`, {
      method: 'POST'
    });
    if(res.ok){
      alert("✅ تم عرض القصيدة للجميع بنجاح");
    } else if(res.status === 400){
      alert("❌ لا يمكنك مشاركة هذه القصيدة — بيانات غير صحيحة");
    } else {
      const msg = await res.text();
      alert("⚠️ خطأ في المشاركة: " + msg);
    }
  } catch(err){
    alert("❌ فشل الاتصال بالخادم: " + err.message);
  }
}

/* load current poem */
async function onCurrent(){
  const view = qs('viewer');
  qs('viewTitle').textContent = 'جارٍ التحميل...';
  qs('viewBody').textContent = '';
  show(view);

  try {
    const res = await fetch(`${API_BASE}/Current`);
    if(!res.ok){
      if(res.status === 400) throw new Error("لم يتم تعيين قصيدة حالية بعد");
      throw new Error("خطأ في جلب القصيدة الحالية");
    }
    const poem = await res.json();
    const title = poem.title ?? poem.Title ?? 'بدون عنوان';
    const text = poem.boemText ?? poem.BoemText ?? poem.text ?? poem.Text ?? poem.body ?? '';
    qs('viewTitle').textContent = title;
    qs('viewBody').innerHTML = text ? formatPoemText(text) : '<i style="color:rgba(255,255,255,0.6)">لا يوجد نص للقصيدة</i>';
  } catch(err){
    qs('viewTitle').textContent = 'حدث خطأ';
    qs('viewBody').innerHTML = `<div style="color:#fda085">${escapeHtml(err.message)}</div>`;
  }
}

/* load poem by id */
async function loadById(id){
  if(!id){ alert('معرّف غير صالح'); return; }
  const view = qs('viewer');
  qs('viewTitle').textContent = 'جارٍ التحميل...';
  qs('viewBody').textContent = '';
  show(view);

  try {
    const r = await fetch(`${API_BASE}/ById/${encodeURIComponent(id)}`);
    if(!r.ok) throw new Error('لم يتم العثور على القصيدة');
    const poem = await r.json();
    const title = poem.title ?? poem.Title ?? 'بدون عنوان';
    const text = poem.boemText ?? poem.BoemText ?? poem.text ?? poem.Text ?? poem.body ?? '';
    qs('viewTitle').textContent = title;
    qs('viewBody').innerHTML = text ? formatPoemText(text) : '<i style="color:rgba(255,255,255,0.6)">لا يوجد نص للقصيدة</i>';
  } catch (err) {
    qs('viewTitle').textContent = 'حدث خطأ';
    qs('viewBody').textContent = err.message || 'فشل في جلب القصيدة';
    console.error(err);
  }
}

/* add poem */
async function onAdd(){
  const title = qs('quickTitle').value.trim();
  const text = qs('quickText').value.trim();
  const authorId = parseInt(qs('quickAuthor').value);
  const msg = qs('addMsg'); msg.style.color = 'var(--accent-2)'; msg.textContent = '';

  if(!title || !text || isNaN(authorId) || authorId < 1){
    msg.style.color = '#ffd3c9';
    msg.textContent = '⚠️ الرجاء إدخال العنوان والنص ورقم مؤلف صالح';
    return;
  }

  try {
    const body = { Title: title, BoemText: text, AuthorID: authorId };
    const res = await fetch(`${API_BASE}/Add`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    if(!res.ok){
      const txt = await res.text().catch(()=>null);
      throw new Error(txt || `خطأ: ${res.status}`);
    }

    msg.style.color = '#bfffcf';
    msg.textContent = '✅ تمت إضافة القصيدة بنجاح';
    clearQuick();
    loadAuthors();
  } catch(err){
    msg.style.color = '#ffb4b4';
    msg.textContent = '❌ فشل الإضافة — ' + (err.message || '');
    console.error(err);
  }
}

/* clear add form */
function clearQuick(){
  qs('quickTitle').value = '';
  qs('quickText').value = '';
  qs('quickAuthor').value = '';
  qs('addMsg').textContent = '';
}

/* modal */
qs('openAdd').addEventListener('click', ()=>{
  const quick = qs('quickTitle');
  quick.scrollIntoView({behavior:'smooth', block:'center'});
  quick.focus();
});
qs('viewer').addEventListener('click', (e)=>{
  if(e.target === qs('viewer')) closeViewer();
});
function closeViewer(){ hide(qs('viewer')); qs('viewBody').scrollTop = 0; }

/* keyboard shortcuts */
document.addEventListener('keydown', e=>{
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='k'){ 
    e.preventDefault(); 
    qs('searchInput').focus(); 
  }
});

/* load authors on page load */
document.addEventListener('DOMContentLoaded', () => {
  loadAuthors();
});
