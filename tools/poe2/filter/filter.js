
(() => {
'use strict';
const dataUrl = document.body.dataset.filterData;
let DATA=null, rules=[], activeId=null, nextId=1, manualOrder=null, editBuffer=null;
let hideAllEnabled=false;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const q=s=>'"'+String(s).replaceAll('"','\\"')+'"';

function defaultRule(category='Armour',dest=null){
 return {id:nextId++,name:category,category,types:[],destination:dest,committed:false,rarities:[],profiles:[],slots:[],bases:[],stats:[],hasSockets:false,hasQuality:false,mods:[],modCount:1,cosmetics:{text:'#f5efe6',bg:'#18120d',border:'#c8a86b',font:36,beam:'None',icon:'None',iconColor:'White',iconSize:1,sound:'None',overrideText:false,overrideBg:false,overrideBorder:false,overrideFont:false}};
}
function cloneRule(r){return JSON.parse(JSON.stringify(r))}
function active(){return editBuffer||rules.find(r=>r.id===activeId)||null}
function beginEdit(id){
 const saved=rules.find(r=>r.id===id&&r.committed);
 if(!saved)return;
 const existing=rules.find(r=>r.id===activeId);
 if(existing&&!existing.committed)rules=rules.filter(x=>x.id!==existing.id);
 activeId=id;
 editBuffer=cloneRule(saved);
 render();
}
function addRule(category='Armour',dest=null){
 const existing=rules.find(r=>r.id===activeId);
 if(existing&&!existing.committed)rules=rules.filter(x=>x.id!==existing.id);
 editBuffer=null;
 const r=defaultRule(category,dest);
 rules.push(r);
 activeId=r.id;
 render()
}
function removeRule(id){
 rules=rules.filter(r=>r.id!==id);
 if(manualOrder)manualOrder=manualOrder.filter(x=>x!==id);
 if(activeId===id){activeId=null;editBuffer=null}
 render()
}
function toggle(arr,val){const i=arr.indexOf(val);if(i>=0)arr.splice(i,1);else arr.push(val)}
const PROFILE_FILTERS={
 'Armour':{condition:'BaseArmour',prop:'armour'},
 'Evasion':{condition:'BaseEvasion',prop:'evasion'},
 'Energy Shield':{condition:'BaseEnergyShield',prop:'energyShield'},
 'Ward':{condition:'BaseWard',prop:'ward'}
};
function profileRequirements(profile){
 return profile.split(' / ').map(x=>PROFILE_FILTERS[x]).filter(Boolean);
}
function hasPositiveDefence(item,req){
 const v=item.defences?.[req.prop];
 if(v==null)return false;
 if(typeof v==='number')return v>0;
 return Number(v.min??v.max??0)>0||Number(v.max??v.min??0)>0;
}
function itemMatchesProfile(item,profile){
 const reqs=profileRequirements(profile);
 return reqs.length>0&&reqs.every(req=>hasPositiveDefence(item,req));
}
function itemMatchesSelectedProfiles(item,profiles){
 return !profiles.length||profiles.some(profile=>itemMatchesProfile(item,profile));
}
function simplifiedProfileBranches(profiles){
 const branches=profiles.map(profile=>({
   profile,
   reqs:[...new Set(profileRequirements(profile).map(x=>x.condition))]
 })).filter(x=>x.reqs.length);
 return branches.filter((branch,i)=>!branches.some((other,j)=>
   i!==j &&
   other.reqs.length<branch.reqs.length &&
   other.reqs.every(x=>branch.reqs.includes(x))
 ));
}
function armourClassesForSlots(slots){
 const wanted=slots.length?slots:DATA.slots;
 return [...new Set(DATA.items.filter(x=>wanted.includes(x.slot)).map(x=>x.class))];
}
function allowedItems(r){
 let items=DATA.items.filter(x=>(x.broadCategory||'Armour')===r.category);
 if(r.category==='Armour'){
  items=items.filter(x=>itemMatchesSelectedProfiles(x,r.profiles)&&(!r.slots.length||r.slots.includes(x.slot)));
 }else if(r.types?.length){
  items=items.filter(x=>r.types.includes(x.class));
 }
 return items;
}
function matchedItems(r){let a=allowedItems(r);if(r.bases.length)a=a.filter(x=>r.bases.includes(x.name));return a}
function representative(r){const a=matchedItems(r).slice().sort((x,y)=>x.dropLevel-y.dropLevel||x.name.localeCompare(y.name));return a[Math.floor(a.length*.67)]||null}
function statProp(item,id){if(id==='DropLevel')return item.dropLevel;if(id==='BaseArmour')return item.defences?.armour?.min??0;if(id==='BaseEvasion')return item.defences?.evasion?.min??0;if(id==='BaseEnergyShield')return item.defences?.energyShield?.min??0;if(id==='BaseWard')return item.defences?.ward?.min??0;return null}
function summary(r){
 const rar=r.rarities.length===DATA.rarities.length||!r.rarities.length?'Any rarity':r.rarities.join(' + ');
 if(r.category==='Armour'){
  const p=r.profiles.length?r.profiles.join(', '):'Any defence';
  const s=r.slots.length?r.slots.join(', '):'Any armour slot';
  return `${rar} · ${p} · ${s}`;
 }
 const t=r.types?.length?r.types.join(', '):`Any ${r.category}`;
 return `${rar} · ${t}`;
}
function swatchStyle(r){return `background:linear-gradient(90deg,${r.cosmetics.text},${r.cosmetics.border},${r.cosmetics.bg})`}
function destinationLabel(v){return v==='show'?'SHOW':v==='hide'?'HIDE':'CHOOSE SHOW / HIDE'}
const ICON_SHAPES=['Circle','Diamond','Hexagon','Square','Star','Triangle','Cross','Moon','Raindrop','Kite','Pentagon','UpsideDownHouse'];
const FILTER_COLORS=['Red','Green','Blue','Brown','White','Yellow','Cyan','Grey','Orange','Pink','Purple'];
const ICON_HEX={Red:'#e34b4b',Green:'#54c66a',Blue:'#5b7fe8',Brown:'#a66b3d',White:'#f1f1e9',Yellow:'#e7cf52',Cyan:'#54d5d8',Grey:'#969aa0',Orange:'#e78a3c',Pink:'#df72b2',Purple:'#a56be1'};
function iconSvg(shape,color='White'){
 const c=ICON_HEX[color]||ICON_HEX.White;
 const common=`fill="${c}" stroke="rgba(0,0,0,.72)" stroke-width="1.5"`;
 const shapes={
  Circle:`<circle cx="12" cy="12" r="7.4" ${common}/>`,
  Diamond:`<path d="M12 3.4 20.6 12 12 20.6 3.4 12Z" ${common}/>`,
  Hexagon:`<path d="M6 4.2h12l4 7.8-4 7.8H6L2 12Z" ${common}/>`,
  Square:`<rect x="4.2" y="4.2" width="15.6" height="15.6" rx="1.1" ${common}/>`,
  Star:`<path d="m12 2.7 2.8 5.7 6.3.9-4.55 4.44 1.08 6.27L12 17.05 6.37 20l1.08-6.27L2.9 9.3l6.3-.9Z" ${common}/>`,
  Triangle:`<path d="M12 3 21 20H3Z" ${common}/>`,
  Cross:`<path d="M8.3 3.2h7.4v5.1h5.1v7.4h-5.1v5.1H8.3v-5.1H3.2V8.3h5.1Z" ${common}/>`,
  Moon:`<path d="M17.9 17.8A8.2 8.2 0 1 1 10 4.1a6.4 6.4 0 0 0 7.9 13.7Z" ${common}/>`,
  Raindrop:`<path d="M12 2.8s7.1 8.05 7.1 12.2A7.1 7.1 0 1 1 4.9 15C4.9 10.85 12 2.8 12 2.8Z" ${common}/>`,
  Kite:`<path d="M12 2.5 19.5 10 12 21.5 4.5 10Z" ${common}/>`,
  Pentagon:`<path d="m12 2.8 8.7 6.3-3.3 10.2H6.6L3.3 9.1Z" ${common}/>`,
  UpsideDownHouse:`<path d="M3.2 4.3h17.6v8.2L12 21 3.2 12.5Z" ${common}/>`
 };
 return `<svg viewBox="0 0 24 24" aria-hidden="true">${shapes[shape]||shapes.Circle}</svg>`;
}

function renderBoard(){
 const r=active(),slot=$('#activeRuleCard');
 if(slot){
   if(!r)slot.innerHTML='<div class="active-empty">Drag an item type here to start a rule.</div>';
   else slot.innerHTML=`<article class="rule-card active active-build-card" draggable="false" data-id="${r.id}"><h3>${esc(r.name||r.category)}</h3><div class="rule-summary">${esc(summary(r))}</div><div class="rule-swatch" style="${swatchStyle(r)}"></div></article>`;
 }
 const show=$('#activeShow'),hide=$('#activeHide');
 if(show)show.classList.toggle('on',r?.destination==='show');
 if(hide)hide.classList.toggle('on',r?.destination==='hide');
 renderCompletedRules();
}
function renderCompletedRules(){
 const el=$('#completedRules');
 if(!el)return;
 const ordered=orderedAssignedRules();
 if(!ordered.length){
   el.innerHTML='<div class="completed-empty">No rules have been added yet.<br><span>Build a rule, choose its action, then click Add to Filter.</span></div>';
   return;
 }
 el.innerHTML=ordered.map((r,i)=>`<article class="completed-card ${r.id===activeId?'active':''}" draggable="true" data-completed-id="${r.id}" data-order-index="${i}"><div class="completed-order">${i+1}</div><div class="completed-body"><div class="completed-top"><strong>${esc(r.name||r.category)}</strong><em class="${r.destination}">${destinationLabel(r.destination)}</em></div><div class="rule-summary">${esc(summary(r))}</div><div class="rule-swatch" style="${swatchStyle(r)}"></div><small>${ruleSpecificity(r)===0?'catch-all':`smart priority ${ruleSpecificity(r)}`}</small></div><button class="remove-rule completed-remove" data-completed-remove="${r.id}" title="Remove">×</button></article>`).join('');
 $$('[data-completed-id]').forEach(card=>{
   card.onclick=e=>{if(e.target.closest('[data-completed-remove]'))return;beginEdit(+card.dataset.completedId)};
   card.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/completed-rule-id',card.dataset.completedId);e.dataTransfer.effectAllowed='move';card.classList.add('dragging')});
   card.addEventListener('dragend',()=>card.classList.remove('dragging'));
   card.addEventListener('dragover',e=>{e.preventDefault();card.classList.add('drag-target')});
   card.addEventListener('dragleave',()=>card.classList.remove('drag-target'));
   card.addEventListener('drop',e=>{e.preventDefault();card.classList.remove('drag-target');const fromId=+e.dataTransfer.getData('text/completed-rule-id');const toId=+card.dataset.completedId;if(fromId&&toId&&fromId!==toId)attemptManualReorder(fromId,toId)});
 });
 $$('[data-completed-remove]').forEach(b=>b.onclick=e=>{e.stopPropagation();removeRule(+b.dataset.completedRemove)});
}

function chipGroup(title,sub,values,selected,key,disableFn){return `<div class="edit-section"><div class="section-title"><h3>${title}</h3><span>${sub||''}</span></div><div class="chips">${values.map(v=>{const dis=disableFn?.(v);return `<button class="chip ${selected.includes(v)?'on':''} ${dis?'disabled':''}" data-chip="${key}" data-val="${esc(v)}" ${dis?'disabled':''}>${esc(v)}</button>`}).join('')}</div></div>`}
function renderEditor(){
 const r=active(),root=$('#editor');
 if(!r){root.innerHTML='<div class="empty-editor">Drag an item category down from the palette or click it to create a rule.</div>';updateAddButton();return}
 const items=allowedItems(r);
 const categoryMeta=(DATA.paletteCategories||[]).find(x=>x.id===r.category);
 const typeValues=DATA.categoryTypes?.[r.category]||[];
 const hierarchy=r.category==='Armour'
   ? chipGroup('Defence Type','OR within layer · positive requirements; extra defences stay included',DATA.profiles,r.profiles,'profile')+
     chipGroup('Armour Slot','OR within layer',DATA.slots,r.slots,'slot',slot=>!DATA.items.some(x=>(x.broadCategory||'Armour')==='Armour'&&itemMatchesSelectedProfiles(x,r.profiles)&&x.slot===slot))
   : chipGroup(r.category==='Weapons'?'Weapon Type':'Item Type','OR within layer',typeValues,r.types||[],'type');
 root.innerHTML=
 `<div class="edit-section rule-name-section"><div class="section-title"><h3>Rule Name</h3><span>${r.committed?'editing saved rule':'new rule'}</span></div><input id="ruleName" class="rule-name-input" type="text" maxlength="80" value="${esc(r.name||r.category)}" placeholder="${esc(categoryMeta?.label||r.category)}"></div>`+
 chipGroup('Rarity','OR within layer',DATA.rarities,r.rarities,'rarity')+
 hierarchy+
 `<div class="edit-section"><div class="section-title"><h3>Specific Bases</h3><span>${r.bases.length?`${r.bases.length} selected`:'optional'}</span></div><div class="search-row"><input id="baseSearch" type="text" placeholder="Search ${items.length} matching bases…" value=""></div><div id="baseList" class="base-list"></div><p class="layer-note">Selecting bases narrows this rule further. Leave empty to include all bases matched above.</p></div>`+
 `<div class="edit-section item-properties-section">
   <div class="section-title"><h3>Item Properties</h3><span>unidentified loot</span></div>
   <p class="layer-note itemization-note">These properties are visible to the loot filter before an item is identified. Leaving an option off means it does not affect the rule.</p>
   <div class="simple-property-grid">
    <label class="simple-property-row"><span class="simple-property-label"><b>Item Level</b><small>Only show items at or above this item level.</small></span><div class="simple-ilvl-control"><span>≥</span><input id="itemLevelMin" type="number" min="1" max="100" placeholder="Any" value="${(r.stats.find(x=>x.field==='ItemLevel'&&x.op==='>=')||{}).value??''}"></div></label>
    <label class="simple-property-row simple-toggle-row"><span class="simple-property-label"><b>Has Sockets</b><small>Require the item to have one or more sockets.</small></span><input id="hasSockets" type="checkbox" ${r.hasSockets?'checked':''}></label>
    <label class="simple-property-row simple-toggle-row"><span class="simple-property-label"><b>Has Quality</b><small>Require the item to have quality above 0%.</small></span><input id="hasQuality" type="checkbox" ${r.hasQuality?'checked':''}></label>
   </div>
  </div>`+
 `<details class="edit-section affix-section advanced-section">
   <summary class="advanced-summary"><span><b>Advanced — Identified Items</b><small>Affixes / Mods</small></span><span>${r.mods.length?`${r.mods.length} selected`:'optional'}</span></summary>
   <div class="section-title"><h3>Affixes / Mods</h3><span>${r.mods.length?`${r.mods.length} selected`:'optional'}</span></div>
   <p class="layer-note itemization-note">Choose named prefixes or suffixes that can roll on the item types selected above. Suggestions are filtered to the current item bases.</p>
   <div id="selectedAffixes">${selectedAffixChips(r)}</div>
   <div class="affix-match-row"><label for="modCount">Match at least</label><input id="modCount" type="number" min="1" max="${Math.max(1,r.mods.length)}" value="${Math.min(Math.max(1,Number(r.modCount)||1),Math.max(1,r.mods.length))}" ${r.mods.length?'':'disabled'}><span>of the selected affixes</span></div>
   <div class="search-row"><input id="modSearch" type="text" placeholder="Search prefixes and suffixes…"></div>
   <div id="modList" class="mod-list"></div>
   <p class="layer-note">Explicit modifiers generally matter only after an item is identified. This section is intentionally secondary to the unidentified-item properties above.</p>
  </details>`+
 `<div class="edit-section"><div class="section-title"><h3>Cosmetics</h3><span>shared by this rule</span></div><div class="cos-grid">${colorCtl('text','Text',r.cosmetics.text,'overrideText')}${colorCtl('bg','Background',r.cosmetics.bg,'overrideBg')}${colorCtl('border','Border',r.cosmetics.border,'overrideBorder')}<div class="control"><label><input type="checkbox" data-cos-override="overrideFont" ${r.cosmetics.overrideFont?'checked':''}> Font size</label><input data-cos="font" type="number" min="1" max="45" value="${r.cosmetics.font}" ${r.cosmetics.overrideFont?'':'disabled'}></div><div class="control"><label>Beam</label><select data-cos="beam">${['None',...FILTER_COLORS].map(x=>`<option ${x===r.cosmetics.beam?'selected':''}>${x}</option>`).join('')}</select></div><div class="control"><label>Alert sound</label><div class="sound-control-row"><select data-cos="sound">${['None',...Array.from({length:16},(_,i)=>String(i+1))].map(x=>`<option ${x===r.cosmetics.sound?'selected':''}>${x}</option>`).join('')}</select><button type="button" class="sound-preview-btn" data-action="play-alert-sound" title="Play selected alert sound" aria-label="Play selected alert sound">▶ Play</button></div></div><div class="control icon-control"><label>Minimap icon</label><div class="icon-picker"><button type="button" class="icon-choice none-choice ${r.cosmetics.icon==='None'?'on':''}" data-icon-shape="None" title="None">None</button>${ICON_SHAPES.map(shape=>`<button type="button" class="icon-choice ${shape===r.cosmetics.icon?'on':''}" data-icon-shape="${shape}" title="${shape}" aria-label="${shape}">${iconSvg(shape,r.cosmetics.iconColor)}</button>`).join('')}</div></div><div class="control"><label>Minimap color</label><select data-cos="iconColor">${FILTER_COLORS.map(x=>`<option ${x===r.cosmetics.iconColor?'selected':''}>${x}</option>`).join('')}</select></div><div class="control"><label>Minimap size</label><select data-cos="iconSize">${[0,1,2].map(x=>`<option value="${x}" ${Number(x)===Number(r.cosmetics.iconSize)?'selected':''}>${x} — ${x===0?'small':x===1?'medium':'large'}</option>`).join('')}</select></div></div><p class="layer-note">Cosmetic overrides are optional. Leave an override unchecked to keep the game's normal appearance for that property.</p></div>`;
;
 bindEditor();renderBaseList('');renderModList('');updateAddButton();
}
function updateAddButton(){
 const b=$('#addToFilter'),note=$('#addFilterNote'),r=active();
 if(!b||!note)return;
 if(!r){b.disabled=true;b.textContent='Add to Filter';note.textContent='Drag an item type into Active Rule to start.';return}
 if(!r.destination){
   b.disabled=true;
   b.textContent=r.committed?'Save Rule':'Add to Filter';
   note.textContent='Choose Show or Hide for this rule first.';
   return
 }
 b.disabled=false;
 b.textContent=r.committed?'Save Rule':'Add to Filter';
 note.textContent=r.committed
   ?'Save applies these edits to the existing filter block.'
   :'This draft is not part of the filter until you click Add to Filter.';
 b.onclick=()=>{
   const cleanName=(r.name||'').trim();
   r.name=cleanName||r.category;
   if(r.committed&&editBuffer){
     const idx=rules.findIndex(x=>x.id===r.id);
     if(idx>=0)rules[idx]=cloneRule(r);
     editBuffer=null;
   }else{
     r.committed=true;
   }
   activeId=null;
   clearReorderError();
   render()
 };
}

function colorCtl(id,label,val,overrideKey){
 const enabled=!!active()?.cosmetics?.[overrideKey];
 return `<div class="control"><label><input type="checkbox" data-cos-override="${overrideKey}" ${enabled?'checked':''}> ${label}</label><div class="color-field"><input data-cos="${id}" type="color" value="${val}" ${enabled?'':'disabled'}><input data-cos-text="${id}" type="text" value="${val}" ${enabled?'':'disabled'}></div></div>`
}

const ITEM_PROPERTY_META={
 ItemLevel:{label:'Item Level',group:'Progression',hint:'The item level of the dropped item.'},
 DropLevel:{label:'Drop Level',group:'Progression',hint:'The level at which this base type starts dropping.'},
 Quality:{label:'Quality',group:'Item Quality',hint:'The quality shown on the item.'},
 BaseArmour:{label:'Base Armour',group:'Base Defences',hint:'Armour on the base item before explicit affixes.'},
 BaseEvasion:{label:'Base Evasion',group:'Base Defences',hint:'Evasion on the base item before explicit affixes.'},
 BaseEnergyShield:{label:'Base Energy Shield',group:'Base Defences',hint:'Energy Shield on the base item before explicit affixes.'},
 BaseWard:{label:'Base Ward',group:'Base Defences',hint:'Ward on the base item before explicit affixes.'},
 BaseDefencePercentile:{label:'Base Defence Percentile',group:'Base Defences',hint:'How high the base defence roll is within its possible range.'}
};
const FRIENDLY_OPS=[
 ['>=','at least'],
 ['>','more than'],
 ['=','exactly'],
 ['<=','at most'],
 ['<','less than']
];
function propertyMeta(id){
 const src=(DATA.filterableStats||[]).find(x=>x.id===id);
 return ITEM_PROPERTY_META[id]||{label:src?.label||id,group:'Other',hint:''};
}
function propertyOptions(selected){
 const groups=['Progression','Item Quality','Base Defences','Other'];
 return groups.map(group=>{
   const rows=(DATA.filterableStats||[]).filter(x=>propertyMeta(x.id).group===group);
   if(!rows.length)return '';
   return `<optgroup label="${group}">${rows.map(x=>`<option value="${x.id}" ${x.id===selected?'selected':''}>${esc(propertyMeta(x.id).label)}</option>`).join('')}</optgroup>`;
 }).join('');
}
function relevantAffixTags(r){
 const source=(r.bases&&r.bases.length)?matchedItems(r):allowedItems(r);
 return new Set(source.flatMap(x=>x.tags||[]));
}
function affixRelevantToRule(affix,r){
 const tags=affix.spawnTags||[];
 if(!tags.length)return true;
 const relevant=relevantAffixTags(r);
 return tags.some(tag=>relevant.has(tag));
}
function selectedAffixChips(r){
 if(!r.mods.length)return '<div class="affix-empty">No affixes selected.</div>';
 const lookup=new Map((DATA.itemAffixes||[]).map(x=>[x.name,x]));
 return `<div class="selected-affixes">${r.mods.map(name=>{
   const a=lookup.get(name);
   const relevant=!a||affixRelevantToRule(a,r);
   return `<button type="button" class="affix-chip ${relevant?'':'affix-chip-warning'}" data-mod-remove-name="${esc(name)}" title="${relevant?'Remove affix':'This affix may not occur on the currently selected item bases. Click to remove.'}"><span>${esc(name)}</span><b>×</b></button>`;
 }).join('')}</div>`;
}

function statRow(s,i){
 const meta=propertyMeta(s.field);
 return `<div class="filter-row item-property-row">
   <div class="property-main">
    <select class="property-name" data-stat-field="${i}" title="${esc(meta.hint)}">${propertyOptions(s.field)}</select>
    <select class="property-op" data-stat-op="${i}">${FRIENDLY_OPS.map(([v,l])=>`<option value="${v}" ${v===s.op?'selected':''}>${l}</option>`).join('')}</select>
    <input class="property-value" data-stat-val="${i}" type="number" value="${s.value}">
    <button class="property-remove" data-stat-remove="${i}" title="Remove item property">×</button>
   </div>
   <div class="property-hint">${esc(meta.hint)}</div>
  </div>`;
}
function bindEditor(){const r=active();
 const ruleName=$('#ruleName');
 if(ruleName)ruleName.oninput=e=>{r.name=e.target.value;renderBoard();renderFullFilterPreview();};
 $$('[data-chip]').forEach(b=>b.onclick=()=>{
 const map={rarity:'rarities',profile:'profiles',slot:'slots',type:'types'};
 const key=map[b.dataset.chip];if(!key)return;
 toggle(r[key],b.dataset.val);
 if(b.dataset.chip!=='rarity')r.bases=r.bases.filter(n=>allowedItems(r).some(x=>x.name===n));
 render()
});
 const baseSearchInput=$('#baseSearch');
 if(baseSearchInput)baseSearchInput.oninput=e=>renderBaseList(e.target.value);
 const modSearchInput=$('#modSearch');
 if(modSearchInput)modSearchInput.oninput=e=>renderModList(e.target.value);
 const itemLevelMin=$('#itemLevelMin');
 if(itemLevelMin)itemLevelMin.oninput=e=>{
   r.stats=r.stats.filter(x=>x.field!=='ItemLevel');
   const v=Number(e.target.value);
   if(e.target.value!==''&&Number.isFinite(v))r.stats.push({field:'ItemLevel',op:'>=',value:v});
   renderPreview();
 };
 const hasSockets=$('#hasSockets');
 if(hasSockets)hasSockets.onchange=e=>{r.hasSockets=e.target.checked;renderPreview()};
 const hasQuality=$('#hasQuality');
 if(hasQuality)hasQuality.onchange=e=>{r.hasQuality=e.target.checked;renderPreview()};
 const modCount=$('#modCount');
 if(modCount)modCount.oninput=e=>{r.modCount=Math.max(1,Math.min(r.mods.length||1,Number(e.target.value)||1));renderPreview()};
 $$('[data-mod-remove-name]').forEach(x=>x.onclick=()=>{toggle(r.mods,x.dataset.modRemoveName);r.modCount=Math.min(Math.max(1,r.modCount||1),Math.max(1,r.mods.length));renderEditor();renderPreview()});

 $$('[data-cos-override]').forEach(x=>x.onchange=()=>{r.cosmetics[x.dataset.cosOverride]=x.checked;renderEditor();renderPreview();renderBoard()});
 $$('[data-cos]').forEach(x=>x.oninput=()=>{const k=x.dataset.cos;r.cosmetics[k]=(x.type==='number'||k==='iconSize')?Number(x.value):x.value;const t=$(`[data-cos-text="${k}"]`);if(t)t.value=x.value;if(k==='iconColor')renderEditor();else{renderPreview();renderBoard()}});$$('[data-cos-text]').forEach(x=>x.onchange=()=>{const k=x.dataset.cosText;if(/^#[0-9a-f]{6}$/i.test(x.value)){r.cosmetics[k]=x.value;const c=$(`[data-cos="${k}"]`);if(c)c.value=x.value;renderPreview();renderBoard()}});
 $$('[data-icon-shape]').forEach(x=>x.onclick=()=>{r.cosmetics.icon=x.dataset.iconShape;renderEditor();renderPreview();renderBoard()})
}
function renderBaseList(search=''){
 const r=active();if(!r)return;
 const list=allowedItems(r).filter(x=>!search||x.name.toLowerCase().includes(search.toLowerCase())).slice().sort((a,b)=>(b.dropLevel||0)-(a.dropLevel||0)||a.name.localeCompare(b.name)).slice(0,160);
 const target=$('#baseList');if(!target)return;
 target.innerHTML=list.length?list.map(x=>`<label class="check-row"><input type="checkbox" data-base="${esc(x.name)}" ${r.bases.includes(x.name)?'checked':''}><span>${esc(x.name)}</span><small>Lv ${x.dropLevel}</small></label>`).join(''):'<div class="check-row">No matching bases.</div>';
 $$('[data-base]').forEach(x=>x.onchange=()=>{toggle(r.bases,x.dataset.base);renderPreview()})
}
function renderModList(search=''){
 const r=active();if(!r)return;
 const qv=search.toLowerCase().trim();
 const all=(DATA.itemAffixes||[]).filter(a=>affixRelevantToRule(a,r));
 const vals=(qv?all.filter(a=>a.name.toLowerCase().includes(qv)):all.filter(a=>r.mods.includes(a.name))).slice(0,100);
 const list=$('#modList');
 if(!list)return;
 if(!qv&&!r.mods.length){
   list.innerHTML=`<div class="check-row affix-search-prompt">Search the affixes available to the currently selected item bases.</div>`;
   return;
 }
 list.innerHTML=vals.length?vals.map(a=>{
   const kind=a.types.length===1?a.types[0]:'prefix / suffix';
   const lv=a.minRequiredLevel?`Requires item level ${a.minRequiredLevel}+`:'No level requirement shown';
   return `<label class="check-row affix-result">
    <input type="checkbox" data-mod="${esc(a.name)}" ${r.mods.includes(a.name)?'checked':''}>
    <span class="affix-result-main"><b>${esc(a.name)}</b><small>${esc(kind)} · ${esc(lv)}</small></span>
   </label>`;
 }).join(''):'<div class="check-row">No matching affixes for the currently selected item bases.</div>';
 $$('[data-mod]').forEach(x=>x.onchange=()=>{
   toggle(r.mods,x.dataset.mod);
   r.modCount=Math.min(Math.max(1,r.modCount||1),Math.max(1,r.mods.length));
   renderEditor();renderPreview()
 })
}
function hexRgba(hex,a=255){const n=parseInt(hex.slice(1),16);return `${(n>>16)&255} ${(n>>8)&255} ${n&255} ${a}`}
function compileRule(r,full=true){
 const lines=[r.destination==='hide'?'Hide':'Show'];
 if(r.rarities.length&&r.rarities.length<4)lines.push(`    Rarity ${r.rarities.join(' ')}`);

 // If the user explicitly picked individual bases, use exactly those bases.
 if(r.bases.length){
   const names=[...new Set(r.bases)];
   lines.push(`    BaseType == ${names.map(q).join(' ')}`);
 }else if(r.category==='Armour'){
   const branches=simplifiedProfileBranches(r.profiles);
   const classes=armourClassesForSlots(r.slots);
   if(branches.length<=1){
     if(classes.length)lines.push(`    Class == ${classes.map(q).join(' ')}`);
     if(branches.length===1){
       const lookup=Object.values(PROFILE_FILTERS).reduce((m,x)=>(m[x.condition]=x,m),{});
       for(const condition of branches[0].reqs)if(lookup[condition])lines.push(`    ${condition} > 0`);
     }
   }else{
     const names=[...new Set(allowedItems(r).map(x=>x.name))];
     if(names.length)lines.push(`    BaseType == ${names.map(q).join(' ')}`);
   }
 }else{
   const classes=(r.types&&r.types.length)?r.types:(DATA.categoryTypes?.[r.category]||[]);
   if(classes.length)lines.push(`    Class == ${classes.map(q).join(' ')}`);
 }

 for(const s of r.stats)lines.push(`    ${s.field} ${s.op} ${s.value}`);
 if(r.hasSockets)lines.push('    Sockets > 0');
 if(r.hasQuality)lines.push('    Quality > 0');
 if(r.mods.length)lines.push(`    HasExplicitMod >=${Math.min(Math.max(1,Number(r.modCount)||1),r.mods.length)} ${r.mods.map(q).join(' ')}`);
 if(r.cosmetics.overrideText)lines.push(`    SetTextColor ${hexRgba(r.cosmetics.text)}`);
 if(r.cosmetics.overrideBg)lines.push(`    SetBackgroundColor ${hexRgba(r.cosmetics.bg,230)}`);
 if(r.cosmetics.overrideBorder)lines.push(`    SetBorderColor ${hexRgba(r.cosmetics.border)}`);
 if(r.cosmetics.overrideFont)lines.push(`    SetFontSize ${r.cosmetics.font}`);
 if(r.cosmetics.sound!=='None')lines.push(`    PlayAlertSound ${r.cosmetics.sound} 100`);
 if(r.cosmetics.icon!=='None')lines.push(`    MinimapIcon ${Number(r.cosmetics.iconSize??1)} ${r.cosmetics.iconColor||'White'} ${r.cosmetics.icon}`);
 if(r.cosmetics.beam!=='None')lines.push(`    PlayEffect ${r.cosmetics.beam}`);
 return lines.join('\n')
}
function ruleSpecificity(r){
 let score=0;
 if(r.bases.length)score+=10000+Math.max(0,1000-r.bases.length);
 if(r.mods.length)score+=r.mods.length*900;
 if(r.stats.length)score+=r.stats.length*650;
 if(r.profiles.length)score+=900+(DATA.profiles.length-r.profiles.length)*70;
 if(r.slots.length)score+=700+(DATA.slots.length-r.slots.length)*60;
 if(r.types?.length){const total=DATA.categoryTypes?.[r.category]?.length||r.types.length;score+=700+Math.max(0,total-r.types.length)*40}
 if(r.hasSockets)score+=500;
 if(r.hasQuality)score+=500;
 if(r.rarities.length&&r.rarities.length<DATA.rarities.length)score+=450+(DATA.rarities.length-r.rarities.length)*50;
 return score;
}
function smartOrderedRules(){
 return rules.filter(r=>r.committed&&r.destination).slice().sort((a,b)=>{
  const delta=ruleSpecificity(b)-ruleSpecificity(a);
  return delta||a.id-b.id;
 });
}
function orderedAssignedRules(){
 const committed=rules.filter(r=>r.committed&&r.destination);
 if(!manualOrder)return smartOrderedRules();
 const byId=new Map(committed.map(r=>[r.id,r]));
 const ordered=manualOrder.map(id=>byId.get(id)).filter(Boolean);
 for(const r of committed)if(!ordered.includes(r))ordered.push(r);
 return ordered;
}
function ruleActionSignature(r){
 const c=r.cosmetics||{};
 return JSON.stringify({destination:r.destination,cosmetics:{text:c.overrideText?c.text:null,bg:c.overrideBg?c.bg:null,border:c.overrideBorder?c.border:null,font:c.overrideFont?c.font:null,beam:c.beam||'None',icon:c.icon||'None',iconColor:c.icon!=='None'?c.iconColor:null,iconSize:c.icon!=='None'?c.iconSize:null,sound:c.sound||'None'}});
}
function rulePotentialBases(r){
 return new Set(matchedItems(r).map(x=>x.id||x.name));
}
function raritySet(r){
 return new Set((!r.rarities.length||r.rarities.length===DATA.rarities.length)?DATA.rarities:r.rarities);
}
function raritiesOverlap(a,b){
 const A=raritySet(a),B=raritySet(b);
 return [...A].some(x=>B.has(x));
}
function numericConditionCouldOverlap(a,b){
 // Conservative by design: unless we can prove disjointness, treat numeric/mod filters as overlapping.
 return true;
}
function rulesCouldOverlap(a,b){
 if(!raritiesOverlap(a,b))return false;
 const A=rulePotentialBases(a),B=rulePotentialBases(b);
 if(![...A].some(x=>B.has(x)))return false;
 return numericConditionCouldOverlap(a,b);
}
function clearReorderError(){const el=$('#reorderError');if(el){el.hidden=true;el.textContent=''}}
function showReorderError(msg){const el=$('#reorderError');if(el){el.hidden=false;el.textContent=msg}}
function attemptManualReorder(fromId,toId){
 clearReorderError();
 const current=orderedAssignedRules();
 const from=current.findIndex(r=>r.id===fromId),to=current.findIndex(r=>r.id===toId);
 if(from<0||to<0||from===to)return;
 const moving=current[from];
 const crossed=current.slice(Math.min(from,to),Math.max(from,to)+1).filter(r=>r.id!==fromId);
 for(const other of crossed){
   if(rulesCouldOverlap(moving,other)&&ruleActionSignature(moving)!==ruleActionSignature(other)){
     showReorderError(`Can't move Rule #${moving.id} across Rule #${other.id}: they can match the same item and their resulting actions differ. Changing their order could change filter behaviour.`);
     renderCompletedRules();
     return;
   }
 }
 const ids=current.map(r=>r.id);
 ids.splice(from,1);
 const targetIndex=ids.indexOf(toId);
 ids.splice(to>from?targetIndex+1:targetIndex,0,fromId);
 manualOrder=ids;
 render();
}
function compileAll(){
 const blocks=orderedAssignedRules().map((r,i)=>`# ${r.name||r.category} · execution ${i+1}\n${compileRule(r)}`);
 if(hideAllEnabled)blocks.push('# Hide all unmatched loot\nHide');
 return blocks.join('\n\n')
}
function renderFullFilterPreview(){
 const compiled=$('#compiled');
 if(!compiled)return;
 const ordered=orderedAssignedRules();
 if(!ordered.length&&!hideAllEnabled){
   compiled.innerHTML='<div class="filter-empty">No saved rules yet. Draft rules appear here after Add to Filter.</div>';
   return
 }
 const blocks=ordered.map((saved,i)=>{
   const isEditing=saved.id===activeId&&!!editBuffer;
   const shown=isEditing?editBuffer:saved;
   return `<div class="filter-block ${saved.id===activeId?'active-filter-block':''}" data-filter-rule="${saved.id}">
    <div class="filter-block-head"><span>${esc(shown.name||shown.category)}</span><small>${isEditing?'Editing preview · Save Rule to commit':`Saved · execution ${i+1}`}</small></div>
    <pre>${esc(`# ${shown.name||shown.category} · execution ${i+1}\n${compileRule(shown)}`)}</pre>
   </div>`;
 }).join('');
 const fallback=hideAllEnabled?`<div class="filter-block"><div class="filter-block-head"><span>Hide all unmatched loot</span><small>Saved fallback</small></div><pre># Hide all unmatched loot\nHide</pre></div>`:'';
 compiled.innerHTML=blocks+fallback;
}
function previewExamples(r){
 const matches=matchedItems(r).slice().sort((a,b)=>a.dropLevel-b.dropLevel||a.name.localeCompare(b.name));
 if(!matches.length)return [];
 if(matches.length<=3)return matches;
 return [matches[Math.floor(matches.length*.25)],matches[Math.floor(matches.length*.58)],matches[Math.floor(matches.length*.82)]];
}
function renderExecutionOrder(){
 const el=$('#executionOrder');
 if(!el)return;
 const ordered=orderedAssignedRules();
 if(!ordered.length){el.innerHTML='<div class="order-empty">Add rules to the filter to see execution order.</div>';return}
 el.innerHTML=`<div class="order-head"><strong>Saved filter order</strong><span>${manualOrder?'manual, validated':'automatic'}</span></div><div class="order-list">${ordered.map((r,i)=>`<div class="order-row ${r.id===activeId?'active':''}"><b>${i+1}</b><span>${esc(r.name||r.category)}</span><em>${destinationLabel(r.destination)}</em><small>${ruleSpecificity(r)===0?'catch-all':`priority ${ruleSpecificity(r)}`}</small></div>`).join('')}</div><p>${manualOrder?'Manual order is active. Unsafe overlap-crossing moves are blocked.':'Rules start in specificity order. Drag Completed Rules to make safe manual adjustments.'}</p>`;
}
function defaultLabelStyle(rarity){
 // Close visual approximation of POE2 ground-label defaults. The actual game
 // font asset is not bundled with this site, so typography uses a web-safe serif fallback.
 const styles={
  Normal:{text:'#c8c8c8',bg:'#101010',border:'#555555',font:16,weight:700},
  Magic:{text:'#8888ff',bg:'#101019',border:'#55558a',font:16,weight:700},
  Rare:{text:'#ffff77',bg:'#151508',border:'#77772f',font:16,weight:700},
  Unique:{text:'#af6025',bg:'#160f0a',border:'#7b421f',font:16,weight:700}
 };
 return styles[rarity]||styles.Normal
}
function renderPreview(){
 const r=active();
 const stage=$('#lootStage'),details=$('#previewDetails'),compiled=$('#compiled');
 if(!stage||!details||!compiled)return;

 if(!r){
  stage.innerHTML='<div class="stage-empty">No rule selected</div>';
  details.innerHTML='';
  renderFullFilterPreview();
  renderExecutionOrder();
  return
 }

 const matches=matchedItems(r).slice().sort((a,b)=>a.dropLevel-b.dropLevel||a.name.localeCompare(b.name));
 const item=representative(r);
 const rarities=(r.rarities&&r.rarities.length)?r.rarities:['Normal','Magic','Rare','Unique'];

 if(!matches.length){
  stage.innerHTML='<div class="stage-empty">No matching base item</div>';
  details.innerHTML='<div class="preview-item-name">No matching item</div><div class="preview-meta">Adjust the item type or base selections.</div>';
  renderFullFilterPreview();
  renderExecutionOrder();
  return
 }

 const examples=rarities.map((rarity,i)=>{
   const index=rarities.length===1
     ? Math.floor(matches.length*.67)
     : Math.round((matches.length-1)*(i/(Math.max(1,rarities.length-1))));
   return {rarity,item:matches[Math.max(0,Math.min(matches.length-1,index))]}
 });

 const beamColor=ICON_HEX[r.cosmetics.beam]||'#ffffff';

 stage.innerHTML=examples.map((entry,i)=>{
   const rarity=entry.rarity,ex=entry.item;
   const d=defaultLabelStyle(rarity);
   const text=r.cosmetics.overrideText?r.cosmetics.text:d.text;
   const bg=r.cosmetics.overrideBg?r.cosmetics.bg:d.bg;
   const border=r.cosmetics.overrideBorder?r.cosmetics.border:d.border;
   const font=r.cosmetics.overrideFont?Math.max(11,r.cosmetics.font*.43):d.font;

   const beam=r.cosmetics.beam!=='None'
     ? `<span class="loot-beam-wrap" style="--beam:${beamColor}">
          <span class="loot-beam-glow"></span>
          <span class="loot-beam-core"></span>
          <span class="loot-beam-ground"></span>
        </span>`
     : '';

   return `<div class="ground-drop rarity-drop" data-preview-index="${i}">
    ${beam}
    <div class="ground-label poe2-label" style="color:${text};background:${bg};border-color:${border};font-size:${font}px;font-weight:${d.weight}">${esc(ex.name)}</div>
   </div>`;
 }).join('');

 // Layout after the browser has measured each real rendered label.
 requestAnimationFrame(()=>{
   const nodes=[...stage.querySelectorAll('.rarity-drop')];
   if(!nodes.length)return;
   const sw=stage.clientWidth||520, sh=stage.clientHeight||320;
   const widths=nodes.map(n=>Math.min(sw*.78, Math.max(150,n.getBoundingClientRect().width)));
   const rowGap=52;
   const totalH=(nodes.length-1)*rowGap;
   let baseY=Math.max(54,(sh-totalH)/2);
   if(nodes.length===1) baseY=sh*.52;

   nodes.forEach((n,i)=>{
     const side = nodes.length===1 ? 0 : (i%2===0 ? -1 : 1);
     const maxShift=Math.max(0,(sw-widths[i])/2-18);
     const desired=Math.min(maxShift, Math.max(58, sw*.16));
     const x=sw/2 + side*desired;
     const y=baseY + i*rowGap;
     n.style.left=`${x}px`;
     n.style.top=`${y}px`;
   });
 });

 const defs=item?[['Armour',item.defences?.armour?.min],['Evasion',item.defences?.evasion?.min],['Energy Shield',item.defences?.energyShield?.min],['Ward',item.defences?.ward?.min]].filter(x=>x[1]):[];
 const mapPreview=r.cosmetics.icon!=='None'
   ? `<span class="selected-map-icon" title="${esc(r.cosmetics.icon)}">${iconSvg(r.cosmetics.icon,r.cosmetics.iconColor)}</span>`
   : '';
 const hasCustom=(r.cosmetics.overrideText||r.cosmetics.overrideBg||r.cosmetics.overrideBorder||r.cosmetics.overrideFont||r.cosmetics.beam!=='None'||r.cosmetics.icon!=='None'||r.cosmetics.sound!=='None');
 const raritySummary=(r.rarities&&r.rarities.length)?r.rarities.join(' / '):'Any rarity';

 details.innerHTML=item
  ? `<div class="preview-item-name">${esc(item.name)} ${mapPreview}</div>
     <div class="preview-meta">
      ${esc(raritySummary)} · ${esc(r.category)} · ${esc(item.class||item.slot)} · Drop level ${item.dropLevel}${r.category==='Armour'&&item.profile?` · ${esc(item.profile)}`:''}${defs.length?' · '+defs.map(x=>`${x[0]} ${x[1]}`).join(' · '):''}
      <br><span class="match-count">${matches.length} legitimate base${matches.length===1?'':'s'} match this structural rule</span>
      <br><span>${examples.length} preview item${examples.length===1?'':'s'} · one per ${r.rarities.length?'selected':'possible'} rarity</span>
      <br><span>${hasCustom?'Only enabled cosmetic properties are overridden':'Game default appearance (preview approximation)'}</span>
     </div>`
  : '<div class="preview-item-name">No matching item</div>';

 renderFullFilterPreview();
 renderExecutionOrder();
}
function renderHideAll(){
 const b=$('#hideAllToggle');if(!b)return;
 b.classList.toggle('on',hideAllEnabled);
 b.setAttribute('aria-pressed',hideAllEnabled?'true':'false');
 b.textContent=`Hide All: ${hideAllEnabled?'ON':'OFF'}`;
}
function render(){renderBoard();renderEditor();renderPreview();renderHideAll()}
function renderPalette(){
 const el=$('#itemPalette');if(!el)return;
 el.innerHTML=(DATA.paletteCategories||[]).map(cat=>`<button type="button" class="palette-card" draggable="true" data-palette-category="${esc(cat.id)}"><strong>${esc(cat.label)}</strong><small>${esc(cat.description)}</small></button>`).join('');
}
function setupDnD(){
 const slot=$('#activeRuleSlot');
 $$('[data-palette-category]').forEach(card=>{
  card.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/palette',card.dataset.paletteCategory);e.dataTransfer.effectAllowed='copy'});
  card.addEventListener('click',()=>addRule(card.dataset.paletteCategory,null));
 });
 if(slot){
  slot.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('text/palette')){e.preventDefault();slot.classList.add('dragover')}});
  slot.addEventListener('dragleave',()=>slot.classList.remove('dragover'));
  slot.addEventListener('drop',e=>{const pal=e.dataTransfer.getData('text/palette');if(pal){e.preventDefault();slot.classList.remove('dragover');addRule(pal,null)}});
 }
 $('#activeShow').onclick=()=>{const r=active();if(r){r.destination='show';render()}};
 $('#activeHide').onclick=()=>{const r=active();if(r){r.destination='hide';render()}};
 const hideAll=$('#hideAllToggle');if(hideAll)hideAll.onclick=()=>{hideAllEnabled=!hideAllEnabled;render()};
}
async function init(){
 DATA=window.EMBEDDED_FILTER_DATA||await fetch(dataUrl).then(r=>r.json());
 const blockedWeaponClasses=new Set(['Claws','Daggers','Flails','One Hand Axes','One Hand Swords','Two Hand Axes','Two Hand Swords']);
 DATA.items=DATA.items.filter(x=>!(x.broadCategory==='Weapons'&&blockedWeaponClasses.has(x.class)));
 DATA.categoryTypes.Weapons=(DATA.categoryTypes.Weapons||[]).filter(x=>!blockedWeaponClasses.has(x));
 $('#dataVersion').textContent=`RePoE POE2 ${DATA.metadata.repoeVersion} · ${DATA.items.length} live-filter bases`;
 renderPalette();setupDnD();render();
 $('#copyFilter').onclick=async()=>{await navigator.clipboard.writeText(compileAll());$('#copyFilter').textContent='Copied';setTimeout(()=>$('#copyFilter').textContent='Copy all',1200)};
 $('#downloadFilter').onclick=()=>{const blob=new Blob([compileAll()+'\n'],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='SteamMonkey-POE2.filter';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
}
init().catch(err=>{$('#editor').innerHTML=`<div class="empty-editor">Failed to load filter data: ${esc(err.message)}</div>`;console.error(err)})
})();

let _alertPreviewAudio=null;
function selectedAlertSoundId(){
 const sel=document.querySelector('select[data-cos="sound"]');
 if(!sel)return null;
 const m=String(sel.value||'').match(/^(\d+)$/);
 if(!m)return null;
 const n=Number(m[1]);
 return n>=1&&n<=16?n:null;
}
function playSelectedAlertSound(){
 const id=selectedAlertSoundId();
 if(!id){
  const btn=document.querySelector('[data-action="play-alert-sound"]');
  if(btn){
   const old=btn.textContent;
   btn.textContent='Select 1–16';
   setTimeout(()=>{if(btn.textContent==='Select 1–16')btn.textContent=old},1200);
  }
  return;
 }
 if(_alertPreviewAudio){
   _alertPreviewAudio.pause();
   _alertPreviewAudio.currentTime=0;
 }
 _alertPreviewAudio=new Audio(`/tools/poe2/filter/assets/sounds/AlertSound${id}.mp3`);
 const btn=document.querySelector('[data-action="play-alert-sound"]');
 if(btn)btn.classList.add('is-playing');
 const done=()=>{ if(btn)btn.classList.remove('is-playing'); };
 _alertPreviewAudio.addEventListener('ended',done,{once:true});
 _alertPreviewAudio.addEventListener('error',done,{once:true});
 _alertPreviewAudio.play().catch(done);
}



document.addEventListener('click',e=>{
 const btn=e.target.closest('[data-action="play-alert-sound"]');
 if(!btn)return;
 e.preventDefault();
 playSelectedAlertSound();
});
