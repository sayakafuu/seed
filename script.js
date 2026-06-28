const C=["#76d9dc","#ff9fb8","#bff0dd","#b9ddff","#d8c8ff","#fff0bd","#ffbe88","#c9e76b"];
const K="tane_v3_clean";

let data=JSON.parse(localStorage[K]||"null")||{
  cats:["やること","行きたい・食べたい","気になる","待ち"],
  done:[],
  items:[
    {t:"ふるさと納税する",c:"やること",n:"上限金額を確認する",m:"今年こそ早めに",col:C[0],log:[]},
    {t:"金沢の水ようかん",c:"行きたい・食べたい",n:"お店の名前を見る",m:"テレビで見た",col:C[1],log:[]},
    {t:"図鑑",c:"気になる",n:"本屋で見てみる",m:"友達おすすめ",col:C[3],log:[]}
  ]
};

let cur=null,target=null,finishTarget=null,col=C[0],timer=null;
const app=document.getElementById("app");
const addTop=document.getElementById("addTop");
const archiveBtn=document.getElementById("archiveBtn");
const editDialog=document.getElementById("editDialog");
const nextDialog=document.getElementById("nextDialog");
const finishDialog=document.getElementById("finishDialog");
const archiveDialog=document.getElementById("archiveDialog");

function save(){localStorage[K]=JSON.stringify(data)}
function esc(s){return String(s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}

function render(){
  app.innerHTML="";
  data.cats.forEach(cat=>{
    const items=data.items.filter(x=>x.c===cat);
    const group=document.createElement("section");
    group.className="group";
    group.innerHTML=`
      <div class="groupHead">
        <div class="groupName">${esc(cat)}</div>
        <div class="groupCount">${items.length}</div>
        <button class="miniPlus">＋</button>
      </div>
      <div class="list"></div>`;
    group.querySelector(".miniPlus").onclick=()=>openEdit(null,cat);
    const list=group.querySelector(".list");
    items.forEach(item=>list.appendChild(row(item,data.items.indexOf(item))));
    app.appendChild(group);
  });
}

function row(item,index){
  const r=document.createElement("div");
  r.className="row";
  r.innerHTML=`
    <button class="action">✨</button>
    <div class="item" style="--c:${item.col}">
      <div class="inner">
        <div class="title">${esc(item.t)}</div>
        <div class="now">${esc(item.n)}</div>
        <div class="memo">${esc(item.m)}</div>
      </div>
    </div>`;
  const card=r.querySelector(".item");
  let sx=0,dx=0,moved=false;

  card.addEventListener("touchstart",e=>{
    sx=e.touches[0].clientX;dx=0;moved=false;
    timer=setTimeout(()=>{
      finishTarget=index;
      openFinish();
      sparkle(innerWidth/2,innerHeight/2);
    },700);
  },{passive:true});

  card.addEventListener("touchmove",e=>{
    dx=e.touches[0].clientX-sx;
    if(Math.abs(dx)>10){moved=true;clearTimeout(timer)}
    if(dx>0) card.style.transform=`translate3d(${Math.min(dx,76)}px,0,0)`;
  },{passive:true});

  card.addEventListener("touchend",()=>{
    clearTimeout(timer);
    card.style.transform="";
    if(dx>52){target=index;openNext();return}
    if(!moved) openEdit(index);
  });

  r.querySelector(".action").onclick=()=>{target=index;openNext()};
  return r;
}

function openEdit(index,cat){
  cur=index;
  const item=index==null?{t:"",c:cat||data.cats[0],n:"",m:"",col:C[0],log:[]}:data.items[index];
  col=item.col||C[0];
  const history=item.log?.length?`
    <label>これまで</label>
    <div class="history">${item.log.map(x=>`<div>✓ ${esc(x)}</div>`).join("")}</div>`:"";

  editDialog.innerHTML=`
    <h2>${index==null?"＋":"…"}</h2>
    <label>タイトル</label><input id="editTitle" value="${esc(item.t)}">
    <label>カテゴリ</label><select id="editCat">${data.cats.map(c=>`<option ${c===item.c?"selected":""}>${esc(c)}</option>`).join("")}</select>
    <label>今できること</label><textarea id="editNow" rows="2">${esc(item.n)}</textarea>
    ${history}
    <label>メモ</label><textarea id="editMemo" rows="2">${esc(item.m)}</textarea>
    <label>色</label><div class="colors" id="colorBox"></div>
    <div class="btns"><button class="btn" onclick="editDialog.close()">閉じる</button><button class="btn ok" onclick="saveEdit()">保存</button></div>`;
  drawColors();
  editDialog.showModal();
}

function drawColors(){
  const box=document.getElementById("colorBox");
  box.innerHTML="";
  C.forEach(c=>{
    const b=document.createElement("button");
    b.className="sw"+(c===col?" sel":"");
    b.style.background=c;
    b.onclick=()=>{col=c;drawColors();sparkle(innerWidth/2,innerHeight/2)};
    box.appendChild(b);
  });
}

function saveEdit(){
  const title=document.getElementById("editTitle").value.trim();
  if(!title)return;
  const item={
    t:title,
    c:document.getElementById("editCat").value,
    n:document.getElementById("editNow").value.trim(),
    m:document.getElementById("editMemo").value.trim(),
    col,
    log:cur==null?[]:(data.items[cur].log||[])
  };
  cur==null?data.items.unshift(item):data.items[cur]=item;
  save();editDialog.close();render();sparkle(innerWidth-45,80);
}

function openNext(){
  nextDialog.innerHTML=`
    <h2>✨</h2>
    <label>次できること</label>
    <textarea id="nextText" rows="3" autofocus></textarea>
    <div class="btns"><button class="btn" onclick="nextDialog.close()">閉じる</button><button class="btn ok" onclick="saveNext()">↗︎</button></div>`;
  nextDialog.showModal();
}

function saveNext(){
  const item=data.items[target];
  const next=document.getElementById("nextText").value.trim();
  if(item.n){item.log=item.log||[];item.log.push(item.n)}
  item.n=next;
  save();nextDialog.close();render();sparkle(innerWidth/2,innerHeight/2);
}

function openFinish(){
  finishDialog.innerHTML=`
    <h2>✦</h2>
    <div class="confirmText">ここでおしまいにする？</div>
    <div class="btns"><button class="btn" onclick="finishDialog.close()">まだ置く</button><button class="btn ok" onclick="finishConfirmed()">おしまい</button></div>`;
  finishDialog.showModal();
}

function finishConfirmed(){
  const item=data.items.splice(finishTarget,1)[0];
  data.done.unshift({...item,at:new Date().toISOString()});
  save();finishTarget=null;finishDialog.close();render();sparkle(innerWidth-35,innerHeight-45);
}

function showDone(){
  archiveDialog.innerHTML=`
    <h2>□</h2>
    <div id="archiveList"></div>
    <div class="btns solo"><button class="btn ok" onclick="archiveDialog.close()">閉じる</button></div>`;
  const list=archiveDialog.querySelector("#archiveList");
  list.innerHTML=data.done.length?data.done.map((x,i)=>`
    <div class="oldRow"><span class="oldTitle">${esc(x.t)}</span><button class="oldDel" onclick="delDone(${i})">×</button></div>`).join(""):`<div class="memo"></div>`;
  archiveDialog.showModal();
}

function delDone(i){data.done.splice(i,1);save();showDone()}

function sparkle(x,y){
  ["✦","･","✧","✦"].forEach((s,i)=>{
    const e=document.createElement("div");
    e.className="spark";
    e.textContent=s;
    e.style.left=(x+i*11-18)+"px";
    e.style.top=(y-i*7)+"px";
    document.body.appendChild(e);
    setTimeout(()=>e.remove(),780);
  });
}

addTop.onclick=()=>openEdit(null);
archiveBtn.onclick=showDone;
render();
