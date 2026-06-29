const COLORS = ["#7EDBD9", "#FFA6C5", "#BCEED8", "#BFD8FF", "#D8CBFF", "#FFF2B8", "#FFC48D", "#CAE96B"];
const STORAGE_KEY = "tane_v6_plan_queue";

const DEFAULT_STATE = {
  categories:["やること", "行きたい・食べたい", "気になる", "待ち"],
  archive:[],
  cards:[
    {title:"ふるさと納税", category:"やること", current:"上限額を調べる", memo:"", history:[], queue:["返礼品を選ぶ", "寄付する", "ワンストップ申請をする"], color:COLORS[0]},
    {title:"台湾旅行", category:"行きたい・食べたい", current:"行き先を決める", memo:"", history:[], queue:["宿を決める", "宿を予約する", "行くところを決める", "予定を組む"], color:COLORS[3]},
    {title:"図鑑", category:"気になる", current:"本屋で見てみる", memo:"友達おすすめ", history:[], queue:[], color:COLORS[2]}
  ]
};

let state;
try { state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_STATE; }
catch { state = DEFAULT_STATE; }

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
let pendingFromQueue = false;
let pendingOriginalCurrent = "";
let pendingOriginalQueue = [];
let lastTouchedRect = null;

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function h(str){
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
function normalizeCard(card){
  if(!card.history) card.history = [];
  if(!card.queue) card.queue = [];
  if(!card.color) card.color = COLORS[0];
  if(!card.category) card.category = state.categories[0];
  return card;
}
function vibrate(ms){ try { navigator.vibrate?.(ms); } catch{} }

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
        <button class="miniPlus" type="button" aria-label="${h(category)}に追加">＋</button>
      </div>
      <div class="list"></div>
    `;
    section.querySelector(".miniPlus").onclick = () => openEdit(null, category);
    const list = section.querySelector(".list");
    if(cards.length === 0){
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "";
      list.appendChild(empty);
    }else{
      cards.forEach(card => list.appendChild(createCard(card, state.cards.indexOf(card))));
    }
    app.appendChild(section);
  });
}

function createCard(card, index){
  normalizeCard(card);
  const row = document.createElement("div");
  row.className = "row";
  row.style.setProperty("--lineColor", card.color);
  row.style.setProperty("--swipeColor", card.color);
  const queueText = card.queue.length ? `このあと ${card.queue.length}件` : "";
  row.innerHTML = `
    <div class="swipeBg"></div>
    <div class="swipeDust"></div>
    <article class="item">
      <div class="inner">
        <div class="title">${h(card.title)}</div>
        <div class="now">${h(card.current)}</div>
        ${card.memo ? `<div class="memo">${h(card.memo)}</div>` : ""}
        ${queueText ? `<div class="queueMini">${h(queueText)}</div>` : ""}
      </div>
    </article>
  `;

  const item = row.querySelector(".item");
  let startX = 0;
  let dx = 0;
  let moved = false;
  let longPressed = false;
  let holdTimer = null;
  let holdPulse = null;

  item.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
    dx = 0;
    moved = false;
    longPressed = false;
    lastTouchedRect = item.getBoundingClientRect();
    holdTimer = setTimeout(() => {
      longPressed = true;
      finishIndex = index;
      item.classList.add("holding");
      vibrate(10);
      holdPulse = setTimeout(() => vibrate(8), 230);
      setTimeout(() => {
        item.classList.remove("holding");
        openFinish();
      }, 360);
    }, 620);
  }, {passive:true});

  item.addEventListener("touchmove", e => {
    dx = e.touches[0].clientX - startX;
    if(Math.abs(dx) > 8){
      moved = true;
      clearTimeout(holdTimer);
      clearTimeout(holdPulse);
      item.classList.remove("holding");
    }
    if(dx > 0){
      row.classList.add("dragging");
      const move = Math.min(dx, window.innerWidth * .42);
      item.style.transform = `translate3d(${move}px,0,0)`;
    }
  }, {passive:true});

  item.addEventListener("touchend", () => {
    clearTimeout(holdTimer);
    clearTimeout(holdPulse);
    item.classList.remove("holding");
    row.classList.remove("dragging");
    item.style.transform = "";
    if(longPressed) return;
    if(dx > window.innerWidth * 0.28){
      nextIndex = index;
      openNextConfirm();
      return;
    }
    if(!moved) openEdit(index);
  });

  item.addEventListener("click", () => openEdit(index));
  return row;
}

function openEdit(index, category){
  editIndex = index;
  const card = index === null ? {title:"", category:category || state.categories[0], current:"", memo:"", history:[], queue:[], color:COLORS[0]} : normalizeCard(state.cards[index]);
  selectedColor = card.color || COLORS[0];
  const historyHtml = card.history.length ? `
    <label class="field">これまで</label>
    <div class="history">${card.history.map(x => `<div>✓ ${h(x)}</div>`).join("")}</div>
  ` : "";
  editDialog.innerHTML = `
    <h2>${index === null ? "＋" : "…"}</h2>
    <label class="field" for="title">タイトル</label>
    <input id="title" value="${h(card.title)}" inputmode="text">
    <label class="field" for="category">カテゴリ</label>
    <select id="category">${state.categories.map(c => `<option ${c === card.category ? "selected" : ""}>${h(c)}</option>`).join("")}</select>
    <label class="field" for="current">今できること</label>
    <textarea id="current">${h(card.current)}</textarea>
    <label class="field" for="queue">このあと</label>
    <textarea id="queue" class="queueArea" placeholder="1行ずつ書く">${h(card.queue.join("\n"))}</textarea>
    ${historyHtml}
    <label class="field" for="memo">メモ</label>
    <textarea id="memo">${h(card.memo)}</textarea>
    <label class="field">色</label>
    <div id="colors" class="colors"></div>
    <div class="btns">
      <button class="btn" type="button" id="cancelEdit">キャンセル</button>
      <button class="btn ok" type="button" id="saveEdit">保存</button>
    </div>
  `;
  drawColors();
  editDialog.showModal();
  setTimeout(() => {
    const active = document.activeElement;
    if(active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) active.blur();
  }, 0);
  document.getElementById("cancelEdit").onclick = () => editDialog.close();
  document.getElementById("saveEdit").onclick = saveEdit;
}

function drawColors(){
  const box = document.getElementById("colors");
  box.innerHTML = "";
  COLORS.forEach(color => {
    const button = document.createElement("button");
    button.className = "sw" + (color === selectedColor ? " sel" : "");
    button.style.background = color;
    button.type = "button";
    button.onclick = () => {
      selectedColor = color;
      vibrate(6);
      drawColors();
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
  const old = editIndex === null ? null : normalizeCard(state.cards[editIndex]);
  const card = {
    title,
    category:document.getElementById("category").value,
    current:document.getElementById("current").value.trim(),
    memo:document.getElementById("memo").value.trim(),
    history:old ? old.history : [],
    queue:linesFromTextarea("queue"),
    color:selectedColor
  };
  if(editIndex === null) state.cards.unshift(card);
  else state.cards[editIndex] = card;
  save();
  editDialog.close();
  render();
}

function openNextConfirm(){
  const card = normalizeCard(state.cards[nextIndex]);
  pendingOriginalCurrent = card.current || "";
  pendingOriginalQueue = [...card.queue];
  pendingFromQueue = card.queue.length > 0;
  const defaultNext = pendingFromQueue ? card.queue[0] : "";
  nextDialog.innerHTML = `
    <h2>次にやること</h2>
    <textarea id="nextInput" placeholder="次にやることを入力">${h(defaultNext)}</textarea>
    <div class="btns">
      <button class="btn" type="button" id="cancelNext">キャンセル</button>
      <button class="btn ok" type="button" id="saveNext">OK</button>
    </div>
  `;
  nextDialog.showModal();
  setTimeout(() => document.getElementById("nextInput")?.blur(), 0);
  document.getElementById("cancelNext").onclick = () => nextDialog.close();
  document.getElementById("saveNext").onclick = saveNext;
}

function saveNext(){
  const next = document.getElementById("nextInput").value.trim();
  const card = normalizeCard(state.cards[nextIndex]);
  if(pendingOriginalCurrent) card.history.push(pendingOriginalCurrent);
  card.current = next;
  if(pendingFromQueue){
    card.queue = pendingOriginalQueue.slice(1);
  }else{
    card.queue = pendingOriginalQueue;
  }
  save();
  nextDialog.close();
  render();
}

function openFinish(){
  finishDialog.innerHTML = `
    <div class="finishPanel">
      <button class="choiceBtn store" type="button" id="doFinish">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 9.5h13v9h-13z"></path><path d="M7 6.5h10l1.5 3h-13z"></path><path d="M9 9.5v-1.1c0-1.5 1.2-2.6 3-2.6s3 1.1 3 2.6v1.1"></path></svg>
        <span>しまう</span>
      </button>
      <button class="choiceBtn back" type="button" id="cancelFinish">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7"></path><path d="M4 5.5v5h5"></path></svg>
        <span>戻す</span>
      </button>
    </div>
  `;
  finishDialog.showModal();
  document.getElementById("cancelFinish").onclick = () => finishDialog.close();
  document.getElementById("doFinish").onclick = finishCard;
}

function finishCard(){
  const card = state.cards[finishIndex];
  if(!card) return;
  const rect = lastTouchedRect;
  state.cards.splice(finishIndex, 1);
  state.archive.unshift({...card, archivedAt:new Date().toISOString()});
  save();
  finishDialog.close();
  archiveMagic(rect, card.color || COLORS[0]);
  setTimeout(render, 80);
}

function archiveMagic(rect, color){
  const archiveRect = archiveBtn.getBoundingClientRect();
  const startX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const startY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
  const toX = archiveRect.left + archiveRect.width / 2;
  const toY = archiveRect.top + archiveRect.height / 2;

  if(rect){
    const ghost = document.createElement("div");
    ghost.className = "cardGhost";
    ghost.style.left = rect.left + "px";
    ghost.style.top = rect.top + "px";
    ghost.style.width = rect.width + "px";
    ghost.style.height = rect.height + "px";
    ghost.style.setProperty("--toX", toX + "px");
    ghost.style.setProperty("--toY", toY + "px");
    document.body.appendChild(ghost);
    setTimeout(() => ghost.remove(), 650);
  }

  for(let i = 0; i < 22; i++){
    const p = document.createElement("div");
    p.className = "magicSpark" + (i % 6 === 0 ? " big" : "");
    const sx = startX + Math.random() * 70 - 35;
    const sy = startY + Math.random() * 48 - 24;
    p.style.left = sx + "px";
    p.style.top = sy + "px";
    p.style.setProperty("--tx", (toX - sx + Math.random() * 22 - 11) + "px");
    p.style.setProperty("--ty", (toY - sy + Math.random() * 22 - 11) + "px");
    p.style.animationDelay = (Math.random() * .16) + "s";
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1200);
  }
}

function showArchive(){
  archiveDialog.innerHTML = `
    <h2>保管庫</h2>
    <div id="archiveList"></div>
    <div class="btns"><button class="btn ok" type="button" id="closeArchive">閉じる</button></div>
  `;
  const list = archiveDialog.querySelector("#archiveList");
  if(!state.archive.length){
    list.innerHTML = `<div class="history">まだありません</div>`;
  }else{
    state.archive.forEach((card, index) => {
      const row = document.createElement("div");
      row.className = "oldRow";
      row.innerHTML = `<div class="oldTitle">${h(card.title)}</div><button class="oldDel" type="button">×</button>`;
      row.querySelector(".oldDel").onclick = () => {
        state.archive.splice(index, 1);
        save();
        archiveDialog.close();
        showArchive();
      };
      list.appendChild(row);
    });
  }
  archiveDialog.showModal();
  document.getElementById("closeArchive").onclick = () => archiveDialog.close();
}

addTop.onclick = () => openEdit(null);
archiveBtn.onclick = showArchive;
render();
