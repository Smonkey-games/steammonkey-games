
(() => {
'use strict';
const dataUrl = document.body.dataset.filterData;
let DATA=null, rules=[], activeId=null, nextId=1;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const q=s=>'"'+String(s).replaceAll('"','\\"')+'"';

function defaultRule(dest='unassigned'){
 return {id:nextId++,category:'Armour',destination:dest,rarities:['Rare'],profiles:[],slots:[],bases:[],stats:[],mods:[],cosmetics:{text:'#f5efe6',bg:'#18120d',border:'#c8a86b',font:36,beam:'None',icon:'None',sound:'None'}};
}
function active(){return rules.find(r=>r.id===activeId)||null}
function addRule(dest='unassigned'){const r=defaultRule(dest);rules.push(r);activeId=r.id;render()}
function removeRule(id){rules=rules.filter(r=>r.id!==id);if(activeId===id)activeId=rules[0]?.id??null;render()}
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
 return DATA.items.filter(x=>itemMatchesSelectedProfiles(x,r.profiles)&&(!r.slots.length||r.slots.includes(x.slot)));
}
function matchedItems(r){let a=allowedItems(r);if(r.bases.length)a=a.filter(x=>r.bases.includes(x.name));return a}
function representative(r){const a=matchedItems(r).slice().sort((x,y)=>x.dropLevel-y.dropLevel||x.name.localeCompare(y.name));return a[Math.floor(a.length*.67)]||null}
function statProp(item,id){if(id==='DropLevel')return item.dropLevel;if(id==='BaseArmour')return item.defences?.armour?.min??0;if(id==='BaseEvasion')return item.defences?.evasion?.min??0;if(id==='BaseEnergyShield')return item.defences?.energyShield?.min??0;if(id==='BaseWard')return item.defences?.ward?.min??0;return null}
function summary(r){const rar=r.rarities.length===4||!r.rarities.length?'Any rarity':r.rarities.join(' + ');const p=r.profiles.length?r.profiles.join(', '):'Any defence';const s=r.slots.length?r.slots.join(', '):'Any armour slot';return `${rar} · ${p} · ${s}`}
function swatchStyle(r){return `background:linear-gradient(90deg,${r.cosmetics.text},${r.cosmetics.border},${r.cosmetics.bg})`}
function destinationLabel(v){return v==='show'?'SHOW':v==='hide'?'HIDE':'UNASSIGNED'}

function renderBoard(){
 for(const lane of ['unassigned','show','hide']){
   const el=$(`#lane-${lane}`), arr=rules.filter(r=>r.destination===lane);
   el.querySelector('.count').textContent=arr.length;
   el.querySelector('.lane-rules').innerHTML=arr.map(r=>`<article class="rule-card ${r.id===activeId?'active':''}" draggable="true" data-id="${r.id}"><button class="remove-rule" data-remove="${r.id}" title="Remove">×</button><h3>${esc(r.category)} Rule #${r.id}</h3><div class="rule-summary">${esc(summary(r))}</div><div class="rule-swatch" style="${swatchStyle(r)}"></div></article>`).join('');
 }
 $$('.rule-card').forEach(el=>{el.addEventListener('click',e=>{if(e.target.closest('[data-remove]'))return;activeId=+el.dataset.id;render()});el.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/rule-id',el.dataset.id);e.dataTransfer.effectAllowed='move'})});
 $$('[data-remove]').forEach(b=>b.onclick=e=>{e.stopPropagation();removeRule(+b.dataset.remove)});
}

function chipGroup(title,sub,values,selected,key,disableFn){return `<div class="edit-section"><div class="section-title"><h3>${title}</h3><span>${sub||''}</span></div><div class="chips">${values.map(v=>{const dis=disableFn?.(v);return `<button class="chip ${selected.includes(v)?'on':''} ${dis?'disabled':''}" data-chip="${key}" data-val="${esc(v)}" ${dis?'disabled':''}>${esc(v)}</button>`}).join('')}</div></div>`}
function renderEditor(){const r=active();const root=$('#editor');if(!r){root.innerHTML='<div class="empty-editor">Drag <strong>Armour</strong> into a lane or click it to create a rule.</div>';return}
 const items=allowedItems(r);const baseSearch=($('#baseSearch')?.value||'').toLowerCase();
 root.innerHTML=
 `<div class="edit-section"><div class="section-title"><h3>Rule #${r.id}</h3><span>${destinationLabel(r.destination)}</span></div><div class="dest-buttons">${['unassigned','show','hide'].map(d=>`<button data-dest="${d}" class="${r.destination===d?'on':''}">${destinationLabel(d)}</button>`).join('')}</div></div>`+
 chipGroup('Rarity','OR within layer',DATA.rarities,r.rarities,'rarity')+
 chipGroup('Defence Type','OR within layer · positive requirements; extra defences stay included',DATA.profiles,r.profiles,'profile')+
 chipGroup('Armour Slot','OR within layer',DATA.slots,r.slots,'slot',slot=>!DATA.items.some(x=>itemMatchesSelectedProfiles(x,r.profiles)&&x.slot===slot))+
 `<div class="edit-section"><div class="section-title"><h3>Specific Bases</h3><span>${r.bases.length?`${r.bases.length} selected`:'optional'}</span></div><div class="search-row"><input id="baseSearch" type="text" placeholder="Search ${items.length} matching bases…" value=""></div><div id="baseList" class="base-list"></div><p class="layer-note">Selecting bases narrows this rule further. Leave empty to include all bases matched above.</p></div>`+
 `<div class="edit-section"><div class="section-title"><h3>Numeric Filters</h3><span>AND between rows</span></div><div id="statRows">${r.stats.map((s,i)=>statRow(s,i)).join('')}</div><button class="add-stat" id="addStat">+ Add numeric condition</button></div>`+
 `<div class="edit-section"><div class="section-title"><h3>Explicit Modifier Names</h3><span>advanced</span></div><div class="search-row"><input id="modSearch" type="text" placeholder="Search ${DATA.explicitModNames.length} item affix names…"></div><div id="modList" class="mod-list"></div><p class="layer-note">Uses <code>HasExplicitMod</code> name matching. This does not test an affix's numeric rolled value.</p></div>`+
 `<div class="edit-section"><div class="section-title"><h3>Cosmetics</h3><span>shared by this rule</span></div><div class="cos-grid">${colorCtl('text','Text',r.cosmetics.text)}${colorCtl('bg','Background',r.cosmetics.bg)}${colorCtl('border','Border',r.cosmetics.border)}<div class="control"><label>Font size</label><input data-cos="font" type="number" min="1" max="45" value="${r.cosmetics.font}"></div><div class="control"><label>Beam</label><select data-cos="beam">${['None','Red','Green','Blue','Brown','White','Yellow','Cyan','Grey','Orange','Pink','Purple'].map(x=>`<option ${x===r.cosmetics.beam?'selected':''}>${x}</option>`).join('')}</select></div><div class="control"><label>Minimap icon</label><select data-cos="icon">${['None','Circle','Diamond','Hexagon','Square','Star','Triangle','Cross','Moon','Raindrop','Kite','Pentagon','UpsideDownHouse'].map(x=>`<option ${x===r.cosmetics.icon?'selected':''}>${x}</option>`).join('')}</select></div><div class="control"><label>Alert sound</label><select data-cos="sound">${['None',...Array.from({length:16},(_,i)=>String(i+1))].map(x=>`<option ${x===r.cosmetics.sound?'selected':''}>${x}</option>`).join('')}</select></div></div></div>`;
 bindEditor(); renderBaseList(''); renderModList('');
}
function colorCtl(id,label,val){return `<div class="control"><label>${label}</label><div class="color-field"><input data-cos="${id}" type="color" value="${val}"><input data-cos-text="${id}" type="text" value="${val}"></div></div>`}
function statRow(s,i){return `<div class="filter-row"><select data-stat-field="${i}">${DATA.filterableStats.map(x=>`<option value="${x.id}" ${x.id===s.field?'selected':''}>${x.label}</option>`).join('')}</select><select data-stat-op="${i}">${['>=','>','=','<=','<'].map(x=>`<option ${x===s.op?'selected':''}>${x}</option>`).join('')}</select><input data-stat-val="${i}" type="number" value="${s.value}"><button data-stat-remove="${i}">×</button></div>`}
function bindEditor(){const r=active();$$('[data-dest]').forEach(b=>b.onclick=()=>{r.destination=b.dataset.dest;render()});$$('[data-chip]').forEach(b=>b.onclick=()=>{const map={rarity:'rarities',profile:'profiles',slot:'slots'};toggle(r[map[b.dataset.chip]],b.dataset.val); if(b.dataset.chip!=='rarity')r.bases=r.bases.filter(n=>allowedItems(r).some(x=>x.name===n));render()});
 $('#baseSearch').oninput=e=>renderBaseList(e.target.value);$('#modSearch').oninput=e=>renderModList(e.target.value);
 $('#addStat').onclick=()=>{r.stats.push({field:'ItemLevel',op:'>=',value:65});render()};
 $$('[data-stat-field]').forEach(x=>x.onchange=()=>{r.stats[+x.dataset.statField].field=x.value;renderPreview()});$$('[data-stat-op]').forEach(x=>x.onchange=()=>{r.stats[+x.dataset.statOp].op=x.value;renderPreview()});$$('[data-stat-val]').forEach(x=>x.oninput=()=>{r.stats[+x.dataset.statVal].value=Number(x.value);renderPreview()});$$('[data-stat-remove]').forEach(x=>x.onclick=()=>{r.stats.splice(+x.dataset.statRemove,1);render()});
 $$('[data-cos]').forEach(x=>x.oninput=()=>{const k=x.dataset.cos;r.cosmetics[k]=x.type==='number'?Number(x.value):x.value;const t=$(`[data-cos-text="${k}"]`);if(t)t.value=x.value;renderPreview();renderBoard()});$$('[data-cos-text]').forEach(x=>x.onchange=()=>{const k=x.dataset.cosText;if(/^#[0-9a-f]{6}$/i.test(x.value)){r.cosmetics[k]=x.value;const c=$(`[data-cos="${k}"]`);if(c)c.value=x.value;renderPreview();renderBoard()}})
}
function renderBaseList(search=''){const r=active();if(!r)return;const list=allowedItems(r).filter(x=>!search||x.name.toLowerCase().includes(search.toLowerCase())).slice(0,160);$('#baseList').innerHTML=list.length?list.map(x=>`<label class="check-row"><input type="checkbox" data-base="${esc(x.name)}" ${r.bases.includes(x.name)?'checked':''}><span>${esc(x.name)}</span><small>Lv ${x.dropLevel}</small></label>`).join(''):'<div class="check-row">No matching bases.</div>';$$('[data-base]').forEach(x=>x.onchange=()=>{toggle(r.bases,x.dataset.base);renderPreview()})}
function renderModList(search=''){const r=active();if(!r)return;const qv=search.toLowerCase().trim();let vals=qv?DATA.explicitModNames.filter(x=>x.toLowerCase().includes(qv)).slice(0,100):r.mods.slice(0,50);$('#modList').innerHTML=vals.length?vals.map(n=>`<label class="check-row"><input type="checkbox" data-mod="${esc(n)}" ${r.mods.includes(n)?'checked':''}><span>${esc(n)}</span></label>`).join(''):'<div class="check-row">Type to search mod names.</div>';$$('[data-mod]').forEach(x=>x.onchange=()=>{toggle(r.mods,x.dataset.mod);renderPreview()})}
function hexRgba(hex,a=255){const n=parseInt(hex.slice(1),16);return `${(n>>16)&255} ${(n>>8)&255} ${n&255} ${a}`}
function compileRule(r,full=true){
 const lines=[r.destination==='hide'?'Hide':'Show'];
 if(r.rarities.length&&r.rarities.length<4)lines.push(`    Rarity ${r.rarities.join(' ')}`);

 // If the user explicitly picked individual bases, use exactly those bases.
 if(r.bases.length){
   const names=[...new Set(r.bases)];
   lines.push(`    BaseType == ${names.map(q).join(' ')}`);
 }else{
   const branches=simplifiedProfileBranches(r.profiles);

   // Native Class is the smallest exact expression for broad Armour/slot selection.
   // Every visual Armour rule stays scoped to Armour classes.
   const classes=armourClassesForSlots(r.slots);

   // A single positive defence conjunction is directly expressible.
   // Example Armour / Energy Shield => BaseArmour > 0 AND BaseEnergyShield > 0.
   // We intentionally DO NOT add negative conditions for unselected defences:
   // triple-defence bases remain included when they satisfy what the user asked for.
   if(branches.length<=1){
     if(classes.length)lines.push(`    Class == ${classes.map(q).join(' ')}`);
     if(branches.length===1){
       const lookup=Object.values(PROFILE_FILTERS).reduce((m,x)=>(m[x.condition]=x,m),{});
       for(const condition of branches[0].reqs){
         if(lookup[condition])lines.push(`    ${condition} > 0`);
       }
     }
   }else{
     // Multiple incomparable defence profiles are an OR-of-ANDs, which a single
     // native filter block cannot express directly. Fall back only in that case
     // to the exact set of current BaseTypes matching the user's positive requests.
     const names=[...new Set(allowedItems(r).map(x=>x.name))];
     if(names.length)lines.push(`    BaseType == ${names.map(q).join(' ')}`);
   }
 }

 for(const s of r.stats)lines.push(`    ${s.field} ${s.op} ${s.value}`);
 if(r.mods.length)lines.push(`    HasExplicitMod ${r.mods.map(q).join(' ')}`);
 lines.push(`    SetTextColor ${hexRgba(r.cosmetics.text)}`);
 lines.push(`    SetBackgroundColor ${hexRgba(r.cosmetics.bg,230)}`);
 lines.push(`    SetBorderColor ${hexRgba(r.cosmetics.border)}`);
 lines.push(`    SetFontSize ${r.cosmetics.font}`);
 if(r.cosmetics.sound!=='None')lines.push(`    PlayAlertSound ${r.cosmetics.sound} 100`);
 if(r.cosmetics.icon!=='None')lines.push(`    MinimapIcon 1 ${r.cosmetics.beam==='None'?'White':r.cosmetics.beam} ${r.cosmetics.icon}`);
 if(r.cosmetics.beam!=='None')lines.push(`    PlayEffect ${r.cosmetics.beam}`);
 return lines.join('\n')
}
function compileAll(){const ordered=[...rules.filter(r=>r.destination==='show'),...rules.filter(r=>r.destination==='hide')];return ordered.map(r=>`# SteamMonkey visual rule #${r.id}\n${compileRule(r)}`).join('\n\n')}
function renderPreview(){const r=active();if(!r){$('#lootLabel').textContent='No rule selected';$('#previewDetails').innerHTML='';$('#compiled').textContent='';return}const item=representative(r);const matches=matchedItems(r);const rarity=r.rarities.length===1?r.rarities[0]:r.rarities.length?`${r.rarities.join(' / ')}`:'Any';const label=$('#lootLabel');label.innerHTML=`<div class="rarity-line">${esc(rarity)}</div>${esc(item?.name||'No matching armour base')}`;label.style.color=r.cosmetics.text;label.style.background=r.cosmetics.bg;label.style.borderColor=r.cosmetics.border;label.style.fontSize=`${Math.max(13,r.cosmetics.font*.48)}px`;const defs=item?[['Armour',item.defences?.armour?.min],['Evasion',item.defences?.evasion?.min],['Energy Shield',item.defences?.energyShield?.min],['Ward',item.defences?.ward?.min]].filter(x=>x[1]):[];$('#previewDetails').innerHTML=item?`<div class="preview-item-name">${esc(item.name)}</div><div class="preview-meta">${esc(item.profile)} · ${esc(item.slot)} · Drop level ${item.dropLevel}${defs.length?' · '+defs.map(x=>`${x[0]} ${x[1]}`).join(' · '):''}<br><span class="match-count">${matches.length} legitimate base${matches.length===1?'':'s'} match this structural rule</span></div>`:'<div class="preview-item-name">No matching item</div><div class="preview-meta">Adjust defence type / slot / base selections.</div>';$('#compiled').textContent=compileRule(r)}
function render(){renderBoard();renderEditor();renderPreview()}
function setupDnD(){const palette=$('#armourPalette');palette.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/palette','Armour');e.dataTransfer.effectAllowed='copy'});palette.addEventListener('click',()=>addRule('unassigned'));$$('.lane').forEach(l=>{l.addEventListener('dragover',e=>{e.preventDefault();l.classList.add('dragover')});l.addEventListener('dragleave',()=>l.classList.remove('dragover'));l.addEventListener('drop',e=>{e.preventDefault();l.classList.remove('dragover');const dest=l.dataset.dest;const rid=e.dataTransfer.getData('text/rule-id');const pal=e.dataTransfer.getData('text/palette');if(rid){const r=rules.find(x=>x.id===+rid);if(r){r.destination=dest;activeId=r.id;render()}}else if(pal){addRule(dest)}})})}
async function init(){DATA=window.EMBEDDED_FILTER_DATA||await fetch(dataUrl).then(r=>r.json());$('#dataVersion').textContent=`RePoE POE2 ${DATA.metadata.repoeVersion} · ${DATA.items.length} armour bases`;setupDnD();addRule('unassigned');$('#copyFilter').onclick=async()=>{await navigator.clipboard.writeText(compileAll());$('#copyFilter').textContent='Copied';setTimeout(()=>$('#copyFilter').textContent='Copy all',1200)};$('#downloadFilter').onclick=()=>{const blob=new Blob([compileAll()+'\n'],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='SteamMonkey-POE2.filter';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}}
init().catch(err=>{$('#editor').innerHTML=`<div class="empty-editor">Failed to load filter data: ${esc(err.message)}</div>`;console.error(err)})
})();
