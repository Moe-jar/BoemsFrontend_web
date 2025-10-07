
const API_BASE = "http://localhost:5132/api/Boems";

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

function qs(id){ return document.getElementById(id) }
function show(el){ el.classList.add('show'); el.setAttribute('aria-hidden','false') }
function hide(el){ el.classList.remove('show'); el.setAttribute('aria-hidden','true') }

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
      const tile = document.createElement('div');
      tile.className = 'tile';
      const left = document.createElement('div');
      left.innerHTML = `<div class="title">${escapeHtml(item.title || item.Title || 'بدون عنوان')}</div>
                        <div class="meta">id: ${escapeHtml(item.id ?? item.Id ?? '')}</div>`;
      tile.appendChild(left);
      tile.onclick = ()=> loadById(item.id ?? item.Id ?? item.ID ?? item.ID);
      results.appendChild(tile);
    });

  } catch (err){
    results.innerHTML = `<div style="padding:12px;color:#fda085">حدث خطأ أثناء البحث — ${escapeHtml(err.message)}</div>`;
    console.error(err);
  }
}

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
    qs('quickTitle').value = '';
    qs('quickText').value = '';
    qs('quickAuthor').value = '';
  } catch(err){
    msg.style.color = '#ffb4b4';
    msg.textContent = '❌ فشل الإضافة — ' + (err.message || '');
    console.error(err);
  }
}

function clearQuick(){
  qs('quickTitle').value = ''; qs('quickText').value = ''; qs('quickAuthor').value = '';
  qs('addMsg').textContent = '';
}

qs('openAdd').addEventListener('click', ()=>{
  const quick = qs('quickTitle');
  quick.scrollIntoView({behavior:'smooth', block:'center'});
  quick.focus();
});

qs('viewer').addEventListener('click', (e)=>{
  if(e.target === qs('viewer')) closeViewer();
});
function closeViewer(){ hide(qs('viewer')); qs('viewBody').scrollTop = 0; }

function escapeHtml(s){
  if(s==null) return '';
  return String(s).replace(/[&<>"'`=\/]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;','/':'&#47;','=':'&#61;'}[c];});
}

function formatPoemText(txt){
  const parts = String(txt).split(/\r?\n/).map(line => `<div>${escapeHtml(line) || '<br>'}</div>`);
  return parts.join('');
}

document.addEventListener('keydown', e=>{
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); qs('searchInput').focus(); }
});
