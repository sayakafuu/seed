const TANE_VERSION = "v8.3";
const COLORS = ["#7EDBD9", "#FFA6C5", "#BCEED8", "#BFD8FF", "#D8CBFF", "#FFF2B8", "#FFC48D", "#CAE96B"];
const STORAGE_KEY = "tane_v6_plan_queue";

const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || {
  categories: ["やること", "行きたい・食べたい", "気になる", "待ち"],
  archive: [],
  cards: [
    { title: "ふるさと納税", category: "やること", current: "上限額を調べる", memo: "", history: [], queue: ["返礼品を選ぶ", "寄付する", "ワンストップ申請をする"], color: COLORS[0] },
    { title: "台湾旅行", category: "行きたい・食べたい", current: "行き先を決める", memo: "", history: [], queue: ["宿を決める", "宿を予約する", "行くところを決める", "予定を組む"], color: COLORS[3] },
    { title: "図鑑", category: "気になる", current: "本屋で見てみる", memo: "友達おすすめ", history: [], queue: [], color: COLORS[5] }
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

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function h(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeCard(card) {
  if (!card.history) card.history = [];
  if (!card.queue) card.queue = [];
  if (!card.color) card.color = COLORS[0];
  return card;
}

function render() {
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
    cards.forEach(card => list.appendChild(createCard(card, state.cards.indexOf(card))));
    app.appendChild(section);
  });
}

function createCard(card, index) {
  normalizeCard(card);
  const row = document.createElement("div");
  row.className = "row";
  row.dataset.index = String(index);
  row.style.setProperty("--cardColor", card.color);
  row.innerHTML = `
    <div class="swipeBg"><span></span></div>
    <button class="action" type="button" aria-label="次へ"></button>
    <div class="item">
      <div class="inner" style="--lineColor:${card.color}">
        <div class="title">${h(card.title)}</div>
        <div class="now">${h(card.current)}</div>
        ${card.memo ? `<div class="memo">${h(card.memo)}</div>` : ""}
      </div>
    </div>
  `;

  const item = row.querySelector(".item");
  const action = row.querySelector(".action");
  let startX = 0;
  let dx = 0;
  let moved = false;
  let longPressed = false;
  let timer = null;

  item.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
    dx = 0;
    moved = false;
    longPressed = false;
    item.classList.add("pressing");
    timer = setTimeout(() => {
      longPressed = true;
      finishIndex = index;
      item.classList.remove("pressing");
      item.classList.add("holdReady");
      sprinkleHoldLight(item);
      vibrate([8, 34, 12]);
      setTimeout(() => {
        item.classList.remove("holdReady");
        openFinish();
      }, 180);
    }, 760);
  }, { passive: true });

  item.addEventListener("touchmove", e => {
    dx = e.touches[0].clientX - startX;
    if (Math.abs(dx) > 8) {
      moved = true;
      clearTimeout(timer);
      item.classList.remove("pressing", "holdReady");
    }
    if (dx > 0) {
      const move = Math.max(0, Math.min(dx, window.innerWidth * 0.5));
      const progress = Math.min(1, move / (window.innerWidth * 0.34));
      row.classList.add("dragging");
      row.style.setProperty("--drag", progress.toFixed(3));
      item.style.transform = `translate3d(${move}px,0,0)`;
    }
  }, { passive: true });

  item.addEventListener("touchend", () => {
    clearTimeout(timer);
    item.classList.remove("pressing", "holdReady");
    row.classList.remove("dragging");
    row.style.setProperty("--drag", "0");
    item.style.transform = "";
    if (longPressed) return;
    if (dx > window.innerWidth * 0.28) {
      nextIndex = index;
      openNext();
      return;
    }
    if (!moved) openEdit(index);
  });

  action.onclick = () => {
    nextIndex = index;
    openNext();
  };

  return row;
}

function openEdit(index, category) {
  editIndex = index;
  const card = index === null
    ? { title: "", category: category || state.categories[0], current: "", memo: "", history: [], queue: [], color: COLORS[0] }
    : normalizeCard(state.cards[index]);

  selectedColor = card.color || COLORS[0];
  const historyHtml = card.history.length ? `
    <details class="historyWrap">
      <summary>これまで</summary>
      <div class="history">${card.history.map(x => `<div>✓ ${h(x)}</div>`).join("")}</div>
    </details>
  ` : "";

  editDialog.innerHTML = `
    <form method="dialog" class="dialogForm editForm" id="editForm">
      <h2>${index === null ? "＋" : "…"}</h2>
      <label for="title">タイトル</label>
      <input id="title" value="${h(card.title)}" autocomplete="off" inputmode="text">
      <label for="category">カテゴリ</label>
      <select id="category">${state.categories.map(c => `<option ${c === card.category ? "selected" : ""}>${h(c)}</option>`).join("")}</select>
      <label for="current">今できること</label>
      <textarea id="current">${h(card.current)}</textarea>
      <label for="queue">このあと</label>
      <textarea id="queue" class="queue" placeholder="このあとを1行ずつ書く">${h(card.queue.join("\n"))}</textarea>
      ${historyHtml}
      <label for="memo">メモ</label>
      <textarea id="memo">${h(card.memo)}</textarea>
      <label>色</label>
      <div id="colors" class="colors"></div>
      <div class="btns">
        <button class="btn" value="cancel" type="button" onclick="editDialog.close()">キャンセル</button>
        <button class="btn ok" type="button" onclick="saveEdit()">保存</button>
      </div>
    </form>
  `;
  drawColors();
  editDialog.showModal();

  // 開いた直後はどこにもカーソルを入れない。タップした欄だけ編集。
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}

function drawColors() {
  const box = document.getElementById("colors");
  box.innerHTML = "";
  COLORS.forEach(color => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sw" + (color === selectedColor ? " sel" : "");
    button.style.background = color;
    button.onclick = () => {
      selectedColor = color;
      drawColors();
      vibrate(6);
    };
    box.appendChild(button);
  });
}

function linesFromTextarea(id) {
  return document.getElementById(id).value
    .split(/\n/)
    .map(x => x.trim())
    .filter(Boolean);
}

function saveEdit() {
  const title = document.getElementById("title").value.trim();
  if (!title) return;
  const card = {
    title,
    category: document.getElementById("category").value,
    current: document.getElementById("current").value.trim(),
    memo: document.getElementById("memo").value.trim(),
    history: editIndex === null ? [] : (state.cards[editIndex].history || []),
    queue: linesFromTextarea("queue"),
    color: selectedColor
  };
  if (editIndex === null) state.cards.unshift(card);
  else state.cards[editIndex] = card;
  save();
  editDialog.close();
  render();
}

function openNext() {
  const card = normalizeCard(state.cards[nextIndex]);
  const proposed = card.queue.length ? card.queue[0] : "";
  nextDialog.innerHTML = `
    <form method="dialog" class="dialogForm nextForm">
      <h2>次にやること</h2>
      <div class="nextContext">
        <div class="nextItemTitle">${h(card.title)}</div>
        ${card.current ? `<div class="nextDone">✓ ${h(card.current)}</div>` : ""}
      </div>
      <textarea id="nextInput" placeholder="次にやることを入力">${h(proposed)}</textarea>
      <div class="btns">
        <button class="btn" type="button" onclick="nextDialog.close()">キャンセル</button>
        <button class="btn ok" type="button" onclick="saveNext()">OK</button>
      </div>
    </form>
  `;
  nextDialog.showModal();
  // この画面も、開いた直後はキーボードを出さない。
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}

function saveNext() {
  const next = document.getElementById("nextInput").value.trim();
  const card = normalizeCard(state.cards[nextIndex]);
  if (card.current) card.history.push(card.current);
  if (card.queue.length) card.queue.shift();
  card.current = next;
  save();
  nextDialog.close();
  render();
}

function openFinish() {
  finishDialog.innerHTML = `
    <form method="dialog" class="finishBox">
      <button class="finishBtn finishSave" type="button" onclick="finishCard()"><span class="miniChest" aria-hidden="true"></span><span>しまう</span></button>
      <button class="finishBtn finishBack" type="button" onclick="finishDialog.close()"><span class="backIcon" aria-hidden="true">↺</span><span>戻す</span></button>
    </form>
  `;
  finishDialog.showModal();
}

function finishCard() {
  const row = document.querySelector(`.row[data-index="${finishIndex}"]`);
  const item = row ? row.querySelector(".item") : null;
  const rect = item ? item.getBoundingClientRect() : null;
  const card = state.cards[finishIndex];

  finishDialog.close();

  if (item && rect) {
    item.classList.add("turningToLight");
    sparkleFlowFromRect(rect);
    vibrate([8, 28, 8]);

    setTimeout(() => {
      const archived = state.cards.splice(finishIndex, 1)[0] || card;
      state.archive.unshift({ ...archived, archivedAt: new Date().toISOString() });
      save();
      render();
    }, 900);
  } else {
    const archived = state.cards.splice(finishIndex, 1)[0];
    if (archived) state.archive.unshift({ ...archived, archivedAt: new Date().toISOString() });
    save();
    render();
    sparkleFlowFromRect(null);
  }
}

function showArchive() {
  archiveDialog.innerHTML = `
    <form method="dialog" class="dialogForm">
      <h2>□</h2>
      <div id="archiveList"></div>
      <div class="btns"><button class="btn" type="button" onclick="archiveDialog.close()">閉じる</button></div>
    </form>
  `;
  const list = archiveDialog.querySelector("#archiveList");
  if (!state.archive.length) {
    list.innerHTML = `<div class="empty">まだありません</div>`;
  } else {
    state.archive.forEach((card, index) => {
      const row = document.createElement("div");
      row.className = "oldRow";
      row.innerHTML = `<span class="oldTitle">${h(card.title)}</span><button class="oldDel" type="button">×</button>`;
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

function sprinkleHoldLight(item) {
  const rect = item.getBoundingClientRect();
  for (let i = 0; i < 8; i++) {
    const p = document.createElement("div");
    p.className = "holdSpark";
    p.style.left = `${rect.left + rect.width * (.18 + Math.random() * .64)}px`;
    p.style.top = `${rect.top + rect.height * (.18 + Math.random() * .64)}px`;
    p.style.animationDelay = `${Math.random() * .12}s`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 620);
  }
}

function sparkleFlowFromRect(rect) {
  const target = archiveBtn.getBoundingClientRect();
  const toX = target.left + target.width / 2;
  const toY = target.top + target.height / 2;
  const fromX = rect ? rect.left + rect.width * 0.50 : window.innerWidth * 0.52;
  const fromY = rect ? rect.top + rect.height * 0.50 : window.innerHeight * 0.55;
  const width = rect ? rect.width : 170;
  const height = rect ? rect.height : 70;

  const glow = document.createElement("div");
  glow.className = "cardGlowBurst";
  glow.style.left = `${rect ? rect.left : fromX - 85}px`;
  glow.style.top = `${rect ? rect.top : fromY - 35}px`;
  glow.style.width = `${width}px`;
  glow.style.height = `${height}px`;
  document.body.appendChild(glow);
  setTimeout(() => glow.remove(), 1000);

  for (let i = 0; i < 30; i++) {
    const dot = document.createElement("div");
    dot.className = "localTwinkle" + (i % 6 === 0 ? " star" : "");
    const sx = fromX + (Math.random() - .5) * width * .82;
    const sy = fromY + (Math.random() - .5) * height * .95;
    dot.style.left = `${sx}px`;
    dot.style.top = `${sy}px`;
    dot.style.animationDelay = `${Math.random() * .22}s`;
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 1100);
  }

  const count = 70;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "finishSpark" + (i % 9 === 0 ? " softStar" : "");
    const startX = fromX + (Math.random() - .5) * width * .72;
    const startY = fromY + (Math.random() - .5) * height * .92;
    const drift = i / count;
    const curveX = (Math.random() - .5) * 54 - 26 * drift;
    const curveY = -36 - Math.random() * 62 + 24 * drift;
    p.style.left = `${startX}px`;
    p.style.top = `${startY}px`;
    p.style.setProperty("--tx", `${toX - startX + curveX}px`);
    p.style.setProperty("--ty", `${toY - startY + curveY}px`);
    p.style.animationDelay = `${0.10 + i * 0.013 + Math.random() * .11}s`;
    p.style.animationDuration = `${1.10 + Math.random() * .48}s`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 2200);
  }

  archiveBtn.classList.add("receivingLight");
  setTimeout(() => archiveBtn.classList.remove("receivingLight"), 1300);
}

function magicFromRect(rect) {
  sparkleFlowFromRect(rect);
}

function magic() {
  sparkleFlowFromRect(null);
}

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

addTop.onclick = () => openEdit(null);
archiveBtn.onclick = showArchive;
render();
