const C = ["#76d9dc","#ff9fb8","#bff0dd","#b9ddff","#d8c8ff","#fff0bd","#ffbe88","#c9e76b"];
const K = "tane_v2_magic";

let data = JSON.parse(localStorage[K] || "null") || {
  cats:["やること","行きたい・食べたい","気になる","待ち"],
  done:[],
  items:[
    {t:"ふるさと納税する",c:"やること",n:"上限金額を確認する",m:"今年こそ早めに",col:C[0],log:[]},
    {t:"図鑑",c:"気になる",n:"本屋で見てみる",m:"友達おすすめ",col:C[3],log:[]},
    {t:"金沢の水ようかん",c:"行きたい・食べたい",n:"お店の名前を見る",m:"テレビで見た",col:C[1],log:[]}
  ]
};

let cur = null;
let target = null;
let finishTarget = null;
let col = C[0];
let longTimer = null;

const app = document.getElementById("app");
const addTop = document.getElementById("addTop");
const archiveBtn = document.getElementById("archiveBtn");
const editDialog = document.getElementById("editDialog");
const nextDialog = document.getElementById("nextDialog");
const finishDialog = document.getElementById("finishDialog");
const archiveDialog = document.getElementById("archiveDialog");

function save(){
  localStorage[K] = JSON.stringify(data);
}

function esc(s){
  return String(s || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function render(){
  app.innerHTML = "";

  data.cats.forEach(cat => {
    const items = data.items.filter(x => x.c === cat);

    const group = document.createElement("section");
    group.className = "group";
    group.innerHTML = `
      <div class="groupHead">
        <div class="groupName">${esc(cat)}</div>
        <div class="groupCount">${items.length}</div>
        <button class="miniPlus">＋</button>
      </div>
      <div class="list"></div>
    `;

    group.querySelector(".miniPlus").onclick = () => openEdit(null, cat);

    const list = group.querySelector(".list");

    items.forEach(item => {
      list.appendChild(createRow(item, data.items.indexOf(item)));
    });

    app.appendChild(group);
  });
}

function createRow(item, index){
  const row = document.createElement("div");
  row.className = "row";

  row.innerHTML = `
    <button class="action">✨</button>
    <div class="item" style="--c:${item.col}">
      <div class="inner">
        <div class="title">${esc(item.t)}</div>
        <div class="now">${esc(item.n)}</div>
        <div class="memo">${esc(item.m)}</div>
      </div>
    </div>
  `;

  const card = row.querySelector(".item");
  let startX = 0;
  let dx = 0;
  let moved = false;

  card.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
    dx = 0;
    moved = false;

    longTimer = setTimeout(() => {
      finishTarget = index;
      openFinish();
      sparkle(window.innerWidth / 2, window.innerHeight / 2);
    }, 650);
  }, {passive:true});

  card.addEventListener("touchmove", e => {
    dx = e.touches[0].clientX - startX;

    if(Math.abs(dx) > 10){
      moved = true;
      clearTimeout(longTimer);
    }

    if(dx > 0){
      card.style.transform = `translateX(${Math.min(dx,78)}px)`;
    }
  }, {passive:true});

  card.addEventListener("touchend", () => {
    clearTimeout(longTimer);
    card.style.transform = "";

    if(dx > 48){
      target = index;
      openNext();
      sparkle(window.innerWidth / 2, window.innerHeight / 2);
      return;
    }

    if(!moved){
      openEdit(index);
    }
  });

  row.querySelector(".action").onclick = () => {
    target = index;
    openNext();
  };

  return row;
}

function openEdit(index, cat){
  cur = index;

  const item = index == null
    ? {t:"", c:cat || data.cats[0], n:"", m:"", col:C[0], log:[]}
    : data.items[index];

  col = item.col || C[0];

  editDialog.innerHTML = `
    <h2>${index == null ? "＋" : "…"}</h2>

    <label>タイトル</label>
    <input id="editTitle" value="${esc(item.t)}">

    <label>カテゴリ</label>
    <select id="editCat">
      ${data.cats.map(c => `<option ${c === item.c ? "selected" : ""}>${esc(c)}</option>`).join("")}
    </select>

    <label>今できること</label>
    <textarea id="editNow" rows="2">${esc(item.n)}</textarea>

    <label>メモ</label>
    <textarea id="editMemo" rows="2">${esc(item.m)}</textarea>

    <label>色</label>
    <div class="colors" id="colorBox"></div>

    <div class="btns">
      <button class="btn" onclick="editDialog.close()">閉じる</button>
      <button class="btn ok" onclick="saveEdit()">保存</button>
    </div>
  `;

  drawColors();
  editDialog.showModal();
}

function drawColors(){
  const box = document.getElementById("colorBox");
  box.innerHTML = "";

  C.forEach(c => {
    const b = document.createElement("button");
    b.className = "sw" + (c === col ? " sel" : "");
    b.style.background = c;
    b.onclick = () => {
      col = c;
      drawColors();
    };
    box.appendChild(b);
  });
}

function saveEdit(){
  const title = document.getElementById("editTitle").value.trim();
  if(!title) return;

  const item = {
    t:title,
    c:document.getElementById("editCat").value,
    n:document.getElementById("editNow").value.trim(),
    m:document.getElementById("editMemo").value.trim(),
    col:col,
    log:cur == null ? [] : (data.items[cur].log || [])
  };

  if(cur == null){
    data.items.unshift(item);
  }else{
    data.items[cur] = item;
  }

  save();
  editDialog.close();
  render();
  sparkle(window.innerWidth - 45, 80);
}

function openNext(){
  nextDialog.innerHTML = `
    <h2>✨</h2>
    <label>次できること</label>
    <textarea id="nextText" rows="3" autofocus></textarea>

    <div class="btns">
      <button class="btn" onclick="nextDialog.close()">閉じる</button>
      <button class="btn ok" onclick="saveNext()">↗︎</button>
    </div>
  `;

  nextDialog.showModal();
}

function saveNext(){
  if(target == null) return;

  const item = data.items[target];
  const next = document.getElementById("nextText").value.trim();

  if(item.n){
    item.log = item.log || [];
    item.log.push(item.n);
  }

  item.n = next;
  save();

  nextDialog.close();
  render();
  sparkle(window.innerWidth / 2, window.innerHeight / 2);
}

function openFinish(){
  finishDialog.innerHTML = `
    <h2>✦</h2>
    <div class="confirmText">ここでおしまいにする？</div>

    <div class="btns">
      <button class="btn" onclick="finishDialog.close()">まだ置く</button>
      <button class="btn ok" onclick="finishConfirmed()">おしまい</button>
    </div>
  `;

  finishDialog.showModal();
}

function finishConfirmed(){
  if(finishTarget == null) return;

  const item = data.items.splice(finishTarget,1)[0];
  data.done.unshift({...item, at:new Date().toISOString()});

  save();
  finishTarget = null;

  finishDialog.close();
  render();
  sparkle(window.innerWidth - 35, window.innerHeight - 45);
}

function showDone(){
  archiveDialog.innerHTML = `
    <h2>□</h2>
    <div id="archiveList"></div>
    <div class="btns solo">
      <button class="btn ok" onclick="archiveDialog.close()">閉じる</button>
    </div>
  `;

  const list = archiveDialog.querySelector("#archiveList");

  if(!data.done.length){
    list.innerHTML = `<div class="memo"></div>`;
  }else{
    data.done.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "oldRow";
      row.innerHTML = `
        <span class="oldTitle">${esc(item.t)}</span>
        <button class="oldDel">×</button>
      `;
      row.querySelector(".oldDel").onclick = () => {
        data.done.splice(index,1);
        save();
        showDone();
      };
      list.appendChild(row);
    });
  }

  archiveDialog.showModal();
}

function sparkle(x,y){
  ["✦","･","✧","✦"].forEach((s,i) => {
    const e = document.createElement("div");
    e.className = "spark";
    e.textContent = s;
    e.style.left = (x + i * 11 - 18) + "px";
    e.style.top = (y - i * 7) + "px";
    document.body.appendChild(e);
    setTimeout(() => e.remove(),780);
  });
}

addTop.onclick = () => openEdit(null);
archiveBtn.onclick = showDone;

render();
