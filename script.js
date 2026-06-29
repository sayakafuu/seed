const COLORS = ["#7EDBD9","#FFA6C5","#BCEED8","#BFD8FF","#D8CBFF","#FFF2B8","#FFC48D","#CAE96B"];
const STORAGE_KEY = "tane_v6_plan_queue";

const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || {
  categories:["やること","行きたい・食べたい","気になる","待ち"],
  archive:[],
  cards:[
    {title:"ふるさと納税",category:"やること",current:"上限額を調べる",memo:"",history:[],queue:["返礼品を選ぶ","寄付する","ワンストップ申請をする"],color:COLORS[0]},
    {title:"台湾旅行",category:"行きたい・食べたい",current:"行き先を決める",memo:"",history:[],queue:["宿を決める","宿を予約する","行くところを決める","予定を組む"],color:COLORS[3]},
    {title:"図鑑",category:"気になる",current:"本屋で見てみる",memo:"友達おすすめ",history:[],queue:[],color:COLORS[5]}
  ]
};

const app = document.getElementById("app");
const addTop = document.getElementById("addTop");
const archiveBtn = document.getElementById("archiveBtn");
const editDialog = document.getElementById("editDialog");
const nextDialog = document.getElementById("nextDialog");
const finishDialog = document.getElementById("finishDialog");
const archiveDialog = document.getElementById("archiveDialog");

let editIndex = null;
let nextIndex = null;
let finishIndex = null;
let selectedColor = COLORS[0];

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function h(str){
  return String(str || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function normalizeCard(card){
  if(!card.history) card.history = [];
  if(!card.queue) card.queue = [];
  if(!card.color) card.color = COLORS[0];
  return card;
}

function render(){
  app.innerHTML = "";

  state.cards.forEach(normalizeCard);

  state.categories.forEach(category => {
    const cards = state.cards.filter(card => card.category === category);

    const section = document.createElement("section");
    section.className = "group";
    section.innerHTML = `
      <div class="groupHead">
        <div class="groupName">${h(category)}</div>
        <div class="groupCount">${cards.length}</div>
        <button class="miniPlus" aria-label="追加">＋</button>
      </div>
      <div class="list"></div>
    `;

    section.querySelector(".miniPlus").onclick = () => openEdit(null, category);

    const list = section.querySelector(".list");
    cards.forEach(card => list.appendChild(createCard(card, state.cards.indexOf(card))));
    app.appendChild(section);
  });
}

function createCard(card, index){
  normalizeCard(card);

  const row = document.createElement("div");
  row.className = "row";
  const queueText = card.queue.length ? `このあと ${card.queue.length}件：${h(card.queue[0])}` : "";

  row.innerHTML = `
    <button class="action" aria-label="次へ">✨</button>
    <div class="item" style="--lineColor:${card.color}">
      <div class="inner">
        <div class="title">${h(card.title)}</div>
        <div class="now">${h(card.current)}</div>
        ${card.memo ? `<div class="memo">${h(card.memo)}</div>` : ""}
        ${queueText ? `<div class="queueMini">${queueText}</div>` : ""}
      </div>
    </div>
  `;

  const item = row.querySelector(".item");
  const action = row.querySelector(".action");

  let startX = 0, dx = 0, moved = false, longPressed = false, timer = null;

  item.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
    dx = 0; moved = false; longPressed = false;

    timer = setTimeout(() => {
      longPressed = true;
      finishIndex = index;
      item.classList.add("hold");
      navigator.vibrate?.(12);
      openFinish();
    }, 720);
  }, {passive:true});

  item.addEventListener("touchmove", e => {
    dx = e.touches[0].clientX - startX;

    if(Math.abs(dx) > 8){
      moved = true;
      clearTimeout(timer);
      item.classList.remove("hold");
    }

    if(dx > 0){
      row.classList.add("dragging");
      item.style.transform = `translate3d(${Math.max(0, dx)}px,0,0)`;
    }
  }, {passive:true});

  item.addEventListener("touchend", () => {
    clearTimeout(timer);
    item.classList.remove("hold");
    row.classList.remove("dragging");
    item.style.transform = "";

    if(longPressed) return;

    if(dx > window.innerWidth * 0.28){
      nextIndex = index;
      advanceOrAsk();
      return;
    }

    if(!moved) openEdit(index);
  });

  action.onclick = () => {
    nextIndex = index;
    advanceOrAsk();
  };

  return row;
}

function openEdit(index, category){
  editIndex = index;

  const card = index === null
    ? {title:"", category:category || state.categories[0], current:"", memo:"", history:[], queue:[], color:COLORS[0]}
    : normalizeCard(state.cards[index]);

  selectedColor = card.color || COLORS[0];

  const historyHtml = card.history.length
    ? `<label>これまで</label><div class="history">${card.history.map(x => `<div>✓ ${h(x)}</div>`).join("")}</div>`
    : "";

  const queueHtml = card.queue.length
    ? `<label>このあと</label><div class="queueView">${card.queue.map(x => `<div>${h(x)}</div>`).join("")}</div>`
    : "";

  editDialog.innerHTML = `
    <h2>${index === null ? "＋" : "…"}</h2>

    <label>タイトル</label>
    <input id="title" value="${h(card.title)}">

    <label>カテゴリ</label>
    <select id="category">
      ${state.categories.map(c => `<option ${c === card.category ? "selected" : ""}>${h(c)}</option>`).join("")}
    </select>

    <label>今できること</label>
    <textarea id="current">${h(card.current)}</textarea>

    <label>このあと</label>
    <textarea id="queue" class="queue" placeholder="1行ずつ書く">${h(card.queue.join("\\n"))}</textarea>

    ${historyHtml}

    <label>メモ</label>
    <textarea id="memo">${h(card.memo)}</textarea>

    <label>色</label>
    <div id="colors" class="colors"></div>

    <div class="btns">
      <button class="btn" onclick="editDialog.close()">閉じる</button>
      <button class="btn ok" onclick="saveEdit()">保存</button>
    </div>
  `;

  drawColors();
  editDialog.showModal();
}

function drawColors(){
  const box = document.getElementById("colors");
  box.innerHTML = "";

  COLORS.forEach(color => {
    const button = document.createElement("button");
    button.className = "sw" + (color === selectedColor ? " sel" : "");
    button.style.background = color;
    button.onclick = () => {
      selectedColor = color;
      drawColors();
      navigator.vibrate?.(6);
    };
    box.appendChild(button);
  });
}

function linesFromTextarea(id){
  return document.getElementById(id).value
    .split(/\n/)
    .map(x => x.trim())
    .filter(Boolean);
}

function saveEdit(){
  const title = document.getElementById("title").value.trim();
  if(!title) return;

  const card = {
    title,
    category:document.getElementById("category").value,
    current:document.getElementById("current").value.trim(),
    memo:document.getElementById("memo").value.trim(),
    history:editIndex === null ? [] : (state.cards[editIndex].history || []),
    queue:linesFromTextarea("queue"),
    color:selectedColor
  };

  if(editIndex === null) state.cards.unshift(card);
  else state.cards[editIndex] = card;

  save();
  editDialog.close();
  render();
}

function advanceOrAsk(){
  const card = normalizeCard(state.cards[nextIndex]);

  if(card.current) card.history.push(card.current);

  if(card.queue.length){
    card.current = card.queue.shift();
    save();
    render();
    return;
  }

  openNext();
}

function openNext(){
  nextDialog.innerHTML = `
    <h2>✨</h2>
    <label>次できること</label>
    <textarea id="nextInput" autofocus></textarea>
    <div class="btns">
      <button class="btn" onclick="nextDialog.close()">閉じる</button>
      <button class="btn ok" onclick="saveNext()">進める</button>
    </div>
  `;

  nextDialog.showModal();
}

function saveNext(){
  const next = document.getElementById("nextInput").value.trim();
  const card = normalizeCard(state.cards[nextIndex]);

  card.current = next;
  save();
  nextDialog.close();
  render();
}

function openFinish(){
  finishDialog.innerHTML = `
    <h2>✦</h2>
    <div class="btns">
      <button class="btn" onclick="finishDialog.close()">戻す</button>
      <button class="btn ok" onclick="finishCard()">しまう</button>
    </div>
  `;
  finishDialog.showModal();
}

function finishCard(){
  const card = state.cards.splice(finishIndex, 1)[0];
  state.archive.unshift({...card, archivedAt:new Date().toISOString()});
  save();
  finishDialog.close();
  render();
  magic();
}

function showArchive(){
  archiveDialog.innerHTML = `
    <h2>□</h2>
    <div id="archiveList"></div>
    <div class="btns">
      <button class="btn ok" onclick="archiveDialog.close()">閉じる</button>
    </div>
  `;

  const list = archiveDialog.querySelector("#archiveList");

  if(!state.archive.length){
    list.innerHTML = `<div class="memo">まだありません</div>`;
  }else{
    state.archive.forEach((card, index) => {
      const row = document.createElement("div");
      row.className = "oldRow";
      row.innerHTML = `<span class="oldTitle">${h(card.title)}</span><button class="oldDel">×</button>`;
      row.querySelector(".oldDel").onclick = () => {
        state.archive.splice(index, 1);
        save();
        showArchive();
      };
      list.appendChild(row);
    });
  }

  archiveDialog.showModal();
}

function magic(){
  const fromX = window.innerWidth / 2;
  const fromY = window.innerHeight / 2;
  const toX = window.innerWidth - 38;
  const toY = window.innerHeight - 42;

  for(let i = 0; i < 34; i++){
    const p = document.createElement("div");
    p.className = "finishSpark" + (i % 5 === 0 ? " star" : "");
    if(i % 5 === 0) p.textContent = "✦";

    const spreadX = Math.random() * 120 - 60;
    const spreadY = Math.random() * 70 - 35;
    const startX = fromX + spreadX;
    const startY = fromY + spreadY;

    p.style.left = startX + "px";
    p.style.top = startY + "px";
    p.style.setProperty("--tx", (toX - startX + Math.random() * 34 - 17) + "px");
    p.style.setProperty("--ty", (toY - startY + Math.random() * 34 - 17) + "px");

    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}

addTop.onclick = () => openEdit(null);
archiveBtn.onclick = showArchive;
render();
