import*as T from'three';
import{OrbitControls}from'three/addons/controls/OrbitControls.js';
import{TransformControls}from'three/addons/controls/TransformControls.js';
import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';
import{GLTFExporter}from'three/addons/exporters/GLTFExporter.js';
import{OBJLoader}from'three/addons/loaders/OBJLoader.js';
import{OBJExporter}from'three/addons/exporters/OBJExporter.js';
import{RoomEnvironment}from'three/addons/environments/RoomEnvironment.js';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';

const $=s=>document.querySelector(s),el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const ease=p=>1+2.70158*Math.pow(p-1,3)+1.70158*Math.pow(p-1,2);
const P={name:'MyProject',handle:null,named:false,state:'New Project'};
let S=null,SS=[],H=[],hi=-1,saved=null,forceDirty=false,anim={dur:5,keys:{}},tm=0,playing=false,fx=[],moved=false,helpers=[],proxies=[],cv=null,spd=1,loopOn=true,autoKey=false,wire=false,help=false,recing=false,snapOn=false,tri=0,last=performance.now(),fc=0,ft=last,fps=60;

/* ---------- Viewport ---------- */
const vp=$('#vp'),R=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
R.setPixelRatio(Math.min(devicePixelRatio,2));R.shadowMap.enabled=true;R.shadowMap.type=T.PCFSoftShadowMap;R.toneMapping=T.ACESFilmicToneMapping;R.autoClear=true;
vp.prepend(R.domElement);
const scene=new T.Scene(),root=new T.Group(),aux=new T.Group();scene.add(root,aux);scene.background=new T.Color('#25272b');
const cam=new T.PerspectiveCamera(50,1,.1,500);cam.position.set(6,5,8);
const orbit=new OrbitControls(cam,R.domElement);orbit.enableDamping=true;orbit.dampingFactor=.08;orbit.target.set(0,.5,0);
const ax=(v,c)=>new T.Line(new T.BufferGeometry().setFromPoints([v.clone().multiplyScalar(-20),v.clone().multiplyScalar(20)]),new T.LineBasicMaterial({color:c,transparent:true,opacity:.75}));
aux.add(new T.GridHelper(40,40,0x4a4d55,0x30323a),ax(new T.Vector3(1,0,0),0xe5484d),ax(new T.Vector3(0,1,0),0x46c46a),ax(new T.Vector3(0,0,1),0x4d8df7));
const tc=new TransformControls(cam,R.domElement);tc.setSize(innerWidth<820?1.4:1);scene.add(tc);
tc.addEventListener('dragging-changed',e=>{orbit.enabled=!e.value;if(!e.value&&moved){moved=false;autoKey&&S?addKey(true):commit()}});
tc.addEventListener('objectChange',()=>{moved=true;syncProps();dirtyMark()});
const sel=new T.BoxHelper(new T.Object3D(),0xe87d0d);sel.material.transparent=true;sel.material.depthTest=false;sel.visible=false;aux.add(sel);
R.domElement.style.touchAction='none';
new ResizeObserver(()=>{const w=vp.clientWidth,h=vp.clientHeight;if(!w||!h)return;R.setSize(w,h);cam.aspect=w/h;cam.updateProjectionMatrix()}).observe(vp);

/* ---------- Helpers: tween, toast, modal ---------- */
const tween=(d,f,end)=>fx.push({t:performance.now(),d,f,end});
function toast(m,t='ok'){const d=el('div','toast '+t,m);$('#toasts').append(d);setTimeout(()=>{d.classList.add('out');setTimeout(()=>d.remove(),320)},2600)}
const ask=(msg,btns,input)=>new Promise(r=>{const d=$('#modal'),b=$('#mb'),i=$('#mi');$('#mm').textContent=msg;i.hidden=input==null;if(input!=null)i.value=input;b.replaceChildren();
  btns.forEach((t,k)=>{const x=el('button',k?'':'pri',t);x.onclick=()=>{d.classList.remove('on');r({i:k,v:i.value})};b.append(x)});d.classList.add('on');setTimeout(()=>input!=null?i.select():b.firstChild.focus(),60)});
const dl=(b,n)=>{const a=el('a');a.href=URL.createObjectURL(b);a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)};
const clean=s=>s.replace(/[\\/:*?"<>|]+/g,'').trim()||'MyProject';
const dispose=o=>o.traverse(c=>{c.geometry&&c.geometry.dispose();[].concat(c.material||[]).forEach(m=>m.dispose())});
const find=id=>root.getObjectByProperty('uuid',id);

/* ---------- Objects ---------- */
const G={Cube:()=>new T.BoxGeometry(1,1,1),Sphere:()=>new T.SphereGeometry(.6,48,32),Cylinder:()=>new T.CylinderGeometry(.5,.5,1.2,48),Cone:()=>new T.ConeGeometry(.6,1.2,48),Plane:()=>new T.PlaneGeometry(2,2),Torus:()=>new T.TorusGeometry(.6,.22,24,64),Capsule:()=>new T.CapsuleGeometry(.4,.8,8,24),Icosphere:()=>new T.IcosahedronGeometry(.7,1),Knot:()=>new T.TorusKnotGeometry(.5,.16,128,16)};
const uniq=b=>{let n=b,i=1;while(root.children.some(c=>c.name===n))n=b+'.'+String(i++).padStart(3,'0');return n};
function mesh(k,name){const m=new T.Mesh(G[k](),new T.MeshStandardMaterial({color:'#b9bdc7',metalness:.1,roughness:.55,side:k=='Plane'?2:0}));m.name=uniq(name||k);m.castShadow=m.receiveShadow=true;if(k=='Plane')m.rotation.x=-Math.PI/2;else m.position.y=.6;return m}
function light(t){const l=t=='Ambient'?new T.AmbientLight('#ffffff',.5):t=='Directional'?new T.DirectionalLight('#ffffff',2.2):t=='Spot'?new T.SpotLight('#fff0dc',120,0,.5,.6,2):new T.PointLight('#ffd9b0',40,0,2);
  l.name=uniq(t+' Light');if(t=='Directional'){l.position.set(5,8,4);l.castShadow=true;l.shadow.mapSize.set(1024,1024);Object.assign(l.shadow.camera,{left:-8,right:8,top:8,bottom:-8});l.shadow.camera.updateProjectionMatrix()}else if(t=='Point')l.position.set(-4,3,2);else if(t=='Spot'){l.position.set(-3,6,3);l.castShadow=true}return l}
function camera(){const c=new T.PerspectiveCamera(45,16/9,.1,100);c.name=uniq('Camera');c.position.copy(cam.position);c.quaternion.copy(cam.quaternion);if(!root.children.some(o=>o.isCamera&&o.userData.active))c.userData.active=true;return c}
function ring(p){const m=new T.Mesh(new T.RingGeometry(.4,.45,64),new T.MeshBasicMaterial({color:0xe87d0d,transparent:true,depthWrite:false,side:2}));m.rotation.x=-Math.PI/2;m.position.set(p.x,.02,p.z);aux.add(m);
  tween(750,k=>{m.scale.setScalar(1+k*4);m.material.opacity=.9*(1-k)},()=>{aux.remove(m);m.geometry.dispose();m.material.dispose()})}
function add(o){root.add(o);rebuild();const s=o.scale.clone();o.scale.multiplyScalar(.001);ring(o.position);sparks(o.position);
  tween(450,p=>o.scale.copy(s).multiplyScalar(Math.max(ease(p),.001)),()=>{o.scale.copy(s);commit()});select(o)}
const addMesh=k=>add(mesh(k));
function rebuild(){helpers.forEach(h=>{aux.remove(h);h.dispose&&h.dispose()});proxies.forEach(p=>{aux.remove(p);p.geometry.dispose()});helpers=[];proxies=[];
  root.children.forEach(o=>{const h=o.isDirectionalLight?new T.DirectionalLightHelper(o,1.2):o.isPointLight?new T.PointLightHelper(o,.25):o.isSpotLight?new T.SpotLightHelper(o):o.isCamera?new T.CameraHelper(o):null;if(h){helpers.push(h);aux.add(h);const p=new T.Mesh(new T.BoxGeometry(.6,.6,.6),new T.MeshBasicMaterial({visible:false}));p.userData.owner=o;proxies.push(p);aux.add(p)}});shade();rows()}
function clearRoot(){tc.detach();[...root.children].forEach(c=>{root.remove(c);dispose(c)})}
function del(){if(!S)return;const L=SS.filter(o=>!o.userData.lock&&!o.__d);if(!L.length)return toast('Object is locked. Press L to unlock.','warn');select(null);let n=L.length;L.forEach(o=>{o.__d=1;const s=o.scale.clone();ring(o.position);tween(260,p=>o.scale.copy(s).multiplyScalar(Math.max(1-p,.001)),()=>{root.remove(o);dispose(o);o.traverse(x=>delete anim.keys[x.uuid]);if(--n==0){rebuild();commit()}})})}
async function clearScene(){if(!root.children.length){toast('Nothing to clear.','warn');return}
  const r=await ask('Clear the whole scene? Every object will be removed.',['Clear','Cancel']);if(r.i)return;select(null);clearRoot();anim={dur:5,keys:{}};rebuild();commit();toast('Scene cleared.')}

/* ---------- Selection ---------- */
function select(o,add){if(add){if(!o)return;const i=SS.indexOf(o);if(i>=0){SS.splice(i,1);S=SS[SS.length-1]||null}else{SS.push(o);S=o}}else{SS=o?[o]:[];S=o||null}refSel();rows();syncProps();markers()}
const rc=new T.Raycaster(),m2=new T.Vector2();let dn=null;
R.domElement.addEventListener('pointerdown',e=>{dn=tc.axis?null:[e.clientX,e.clientY]});
R.domElement.addEventListener('pointerup',e=>{if(!dn||tc.dragging)return;if(Math.hypot(e.clientX-dn[0],e.clientY-dn[1])>5)return;
  const b=R.domElement.getBoundingClientRect();m2.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);rc.setFromCamera(m2,cam);
  const h=rc.intersectObjects([...root.children.filter(o=>o.visible&&!o.isLight&&!o.isCamera),...proxies],true)[0];let o=h&&h.object;dn=null;if(o&&o.userData.owner){o=o.userData.owner;select(o);if(o.isCamera)enterCam(o);return}while(o&&o.parent!==root)o=o.parent;select(o||null,multi||e.shiftKey||e.ctrlKey||e.metaKey)});
function setMode(m){tc.setMode(m);document.querySelectorAll('#tools [data-m]').forEach(b=>b.classList.toggle('on',b.dataset.m==m))}
function focus(){if(!S)return;let b=new T.Box3().setFromObject(S);if(b.isEmpty())b.setFromCenterAndSize(S.position,new T.Vector3(1,1,1));
  const c=b.getCenter(new T.Vector3()),r=Math.max(b.getSize(new T.Vector3()).length(),1),p0=cam.position.clone(),t0=orbit.target.clone(),d=p0.clone().sub(t0).normalize().multiplyScalar(r*1.8);
  tween(500,k=>{k=1-Math.pow(1-k,3);orbit.target.lerpVectors(t0,c,k);cam.position.lerpVectors(p0,c.clone().add(d),k)})}

/* ---------- Outliner ---------- */
function rows(){const L=$('#outl');L.replaceChildren(el('h3','','Scene Collection'));
  root.children.forEach(o=>{const r=el('div','row'+(SS.includes(o)?' on':'')+(o.visible?'':' off'));
    const mk=(t,f,ti)=>{const b=el('button','',t);b.title=ti;b.setAttribute('aria-label',ti);b.dataset.h='r:'+ti;b.onclick=e=>{e.stopPropagation();f()};return b};
    r.append(el('i','ic',o.isLight?'✦':o.isCamera?'▷':'▣'),el('span','nm',(o.userData.lock?'🔒 ':'')+o.name),...(o.isCamera?[mk('⛶',()=>{select(o);enterCam(o)},'Camera view')]:[]),mk('✎',()=>rename(o),'Rename'),mk('⧉',()=>{select(o);clone()},'Clone'),
      mk(o.visible?'◉':'◌',()=>{o.visible=!o.visible;o===S?select(o):rows();commit()},'Show / Hide'),mk('✕',()=>{SS=[o];S=o;del()},'Delete'));
    r.onclick=e=>select(o,e.shiftKey||e.ctrlKey||e.metaKey||multi);r.ondblclick=()=>rename(o);L.append(r)});
  $('#info').textContent=root.children.length+' objects'+(SS.length?' · '+SS.length+' selected':'')+' · '+fps+' fps'}
async function rename(o){const r=await ask('Rename object',['OK','Cancel'],o.name);if(!r.i&&r.v.trim()){o.name=r.v.trim();rows();syncProps();commit()}}

/* ---------- Properties ---------- */
const PRE={Matte:['#b9bdc7',0,.95,1,'#000000'],Plastic:['#4d8df7',0,.35,1,'#000000'],Metal:['#9aa0ab',1,.3,1,'#000000'],Gold:['#d4a73c',1,.28,1,'#000000'],Chrome:['#e8ecf2',1,.05,1,'#000000'],Glass:['#bfe6ff',0,.05,.35,'#000000'],Neon:['#06222a',0,.4,1,'#22e6ff']};
const n3=p=>[0,1,2].map(i=>`<input type="number" step="0.1" data-k="${p}${i}">`).join('');
const sl=(c,l,k,a,b,s)=>`<label class="r ${c}">${l}<input type="range" min="${a}" max="${b}" step="${s}" data-k="${k}"></label>`;
$('#props').innerHTML=`<p id="empty">Select an object to edit it.</p><div id="pp" hidden><p id="mcount" hidden></p><input class="nm" data-k="nm"><h4>Location</h4><div class="g3">${n3('p')}</div><h4>Rotation (°)</h4><div class="g3">${n3('r')}</div><h4>Scale</h4><div class="g3">${n3('s')}</div>
<h4 class="ml">Material</h4><label class="r ml">Color<input type="color" data-k="col"></label><label class="r m">Emissive<input type="color" data-k="emi"></label>
${sl('m','Metalness','met',0,1,.01)}${sl('m','Roughness','rou',0,1,.01)}${sl('m','Opacity','opa',0,1,.01)}${sl('l','Intensity','int',0,10,.05)}${sl('c','FOV','fov',15,120,1)}<label class="r c">Look at<select data-k="tg"></select></label>${sl('c','Look height','ty',-2,6,.1)}<button class="c" id="act">Set as active camera</button><button class="c" id="cvb">Enter camera view</button><label class="r m">Preset<select data-k="pre"><option value="">Choose…</option>${Object.keys(PRE).map(k=>`<option>${k}</option>`).join('')}</select></label><label class="r m">Cast shadow<input type="checkbox" data-k="shd"></label><div class="r m">Face<span class="chips" id="facec">${['All','Front','Back','Up','Down','Right','Left'].map(f=>`<button data-face="${f}" data-h="face"${f=='All'?' class="on"':''}>${f}</button>`).join('')}</span></div><div class="r m">Image<span class="btns"><button id="imgb">Upload PNG</button><button id="imgx" hidden>Remove</button></span></div>${sl('m','Tiling','rep',1,12,1)}<label class="r">Lock<input type="checkbox" data-k="lk"></label><button id="clb">Clone ⧉</button></div>
<h4>World</h4><label class="r">Background<input type="color" data-k="bg" value="#25272b"></label><label class="r">Exposure<input type="range" id="wexp" min="0.3" max="2.5" step="0.05" value="1"></label><label class="r">Fog<input type="range" id="wfog" min="0" max="0.12" step="0.002" value="0"></label><label class="r">Reflections<input type="checkbox" id="wenv" checked></label><label class="r">Shadows<input type="checkbox" id="wsh" checked></label>`;
const pr=$('#props');
pr.addEventListener('input',e=>{const k=e.target.dataset.k,v=e.target.value;if(!k)return;if(k=='bg'){scene.background.set(v);dirtyMark();return}
  const o=S;if(o&&k=='tg'){v?o.userData.tg=v:delete o.userData.tg;dirtyMark();return}if(!o||v==='')return;const f=+v,q=/^([prs])([012])$/.exec(k);
  if(q){const i=+q[2];if(q[1]=='p')o.position.setComponent(i,f);else if(q[1]=='r')o.rotation['xyz'[i]]=f*Math.PI/180;else o.scale.setComponent(i,f)}
  else if(k=='nm'){o.name=v;rows()}else if(k=='col')(o.material||o).color.set(v);else if(k=='emi'&&o.material.emissive)o.material.emissive.set(v);
  else if(k=='met')o.material.metalness=f;else if(k=='rou')o.material.roughness=f;else if(k=='opa'){o.material.opacity=f;o.material.transparent=f<1}
  else if(k=='int')o.intensity=f;else if(k=='fov'){o.fov=f;o.updateProjectionMatrix()}else if(k=='ty')o.userData.ty=f;else if(k=='shd')o.traverse(c=>{if(c.isMesh)c.castShadow=e.target.checked});else if(k=='pre'){const u=PRE[v],m=o.material;if(u&&m&&m.emissive){m.color.set(u[0]);m.metalness=u[1];m.roughness=u[2];m.opacity=u[3];m.transparent=u[3]<1;m.emissive.set(u[4]);m.emissiveIntensity=u[4]=='#000000'?1:1.6;e.target.value='';syncProps()}}dirtyMark()});
pr.addEventListener('change',()=>commit());
$('#act').onclick=()=>{if(!S||!S.isCamera)return;root.children.forEach(o=>{if(o.isCamera)o.userData.active=false});S.userData.active=true;commit();toast('Active camera set.')};
function syncProps(){const pp=$('#pp'),o=S;$('#empty').hidden=!!o;pp.hidden=!o;if(!o)return;pp.dataset.t=o.isMesh?'mesh':o.isLight?'light':o.isCamera?'cam':'grp';
  const set=(k,v)=>{const i=pp.querySelector(`[data-k="${k}"]`);if(i&&document.activeElement!==i)i.value=v},m=mats(firstMesh(o))[0],r=[o.rotation.x,o.rotation.y,o.rotation.z];
  [0,1,2].forEach(i=>{set('p'+i,+o.position.getComponent(i).toFixed(3));set('r'+i,+(r[i]*180/Math.PI).toFixed(2));set('s'+i,+o.scale.getComponent(i).toFixed(3))});set('nm',o.name);
  if(m&&m.color){set('col','#'+m.color.getHexString());if(m.emissive)set('emi','#'+m.emissive.getHexString());set('met',m.metalness??0);set('rou',m.roughness??1);set('opa',m.opacity)}
  if(o.isLight){set('col','#'+o.color.getHexString());set('int',o.intensity)}if(o.isCamera){set('fov',o.fov);const sl=pp.querySelector('[data-k=tg]'),L=root.children.filter(c=>!c.isCamera&&!c.isLight),ks=L.map(c=>c.uuid+c.name).join('|');if(sl.dataset.ks!==ks){sl.dataset.ks=ks;sl.replaceChildren(new Option('— none —',''),...L.map(c=>new Option(c.name,c.uuid)))}if(document.activeElement!==sl)sl.value=o.userData.tg||'';set('ty',o.userData.ty??1.2)}
  const sh=pp.querySelector('[data-k=shd]');if(sh)sh.checked=o.isMesh?o.castShadow:true;set('rep',m&&m.map?m.map.repeat.x:1);const lk=pp.querySelector('[data-k=lk]');if(lk)lk.checked=!!o.userData.lock;$('#imgx').hidden=!meshesOf(o).some(c=>mats(c).some(x=>x.map));const mc=$('#mcount');mc.hidden=SS.length<2;mc.textContent=SS.length+' objects selected · changes apply to all'}

/* ---------- History / project state ---------- */
const snap=()=>JSON.stringify({s:root.toJSON(),a:anim,sel:S&&S.uuid});
const isDirty=()=>forceDirty||H[hi]!==saved;
function refresh(){const d=isDirty();document.title=P.name+(d?'*':'')+' — Mini Blender';$('#ptitle').textContent=P.name+(d?' ●':'');$('#st').textContent=d?'Unsaved Changes':P.state;$('#stat').classList.toggle('dirty',d)}
function commit(){forceDirty=false;const s=snap();if(H[hi]!==s){H=H.slice(0,hi+1);H.push(s);if(H.length>(s.length>1e6?10:80))H.shift();hi=H.length-1}refresh()}
const dirtyMark=()=>{forceDirty=true;refresh()};
function restore(s){const o=JSON.parse(s),g=new T.ObjectLoader().parse(o.s);clearRoot();[...g.children].forEach(c=>root.add(c));anim=o.a;rebuild();select(o.sel&&find(o.sel));forceDirty=false;refresh()}
const undo=()=>{if(hi>0){hi--;restore(H[hi])}else toast('Nothing to undo.','warn')};
const redo=()=>{if(hi<H.length-1){hi++;restore(H[hi])}else toast('Nothing to redo.','warn')};

/* ---------- Project: new / save / open ---------- */
function reset(){clearRoot();anim={dur:5,keys:{}};tm=0;Object.assign(P,{name:'MyProject',handle:null,named:false,state:'New Project'});scene.background.set('#25272b');
  const fl=mesh('Plane','Floor');fl.scale.setScalar(8);fl.material.color.set('#2f3237');fl.material.roughness=.9;
  const cb=mesh('Cube'),c=camera();c.position.set(4,3,6);c.lookAt(0,.5,0);root.add(fl,cb,light('Ambient'),light('Directional'),light('Point'),c);
  H=[];hi=-1;rebuild();select(null);commit();saved=H[0];refresh();markers()}
async function guard(msg){if(!isDirty())return true;const r=await ask(msg,['Save',"Don't Save",'Cancel']);if(r.i==2)return false;if(r.i==0){await save();if(isDirty())return false}return true}
async function newProj(){if(await guard('You have unsaved changes. Save before creating a new project?')){reset();try{localStorage.removeItem('mb_recover')}catch{}toast('New project created.')}}
const pack=()=>JSON.stringify({app:'MiniBlender',v:1,name:P.name,scene:root.toJSON(),anim,bg:'#'+scene.background.getHexString(),w:{e:R.toneMappingExposure,f:scene.fog?scene.fog.density:0,v:!!scene.environment,s:R.shadowMap.enabled},cam:{p:cam.position.toArray(),t:orbit.target.toArray(),fov:cam.fov}});
const recents=()=>{try{return JSON.parse(localStorage.getItem('mb_recent'))||[]}catch{return[]}};
function addRecent(name,data){const l=recents().filter(r=>r.name!==name);l.unshift({name,time:Date.now(),data});l.length=Math.min(l.length,5);
  try{localStorage.setItem('mb_recent',JSON.stringify(l))}catch{try{localStorage.setItem('mb_recent',JSON.stringify(l.map(r=>({name:r.name,time:r.time}))))}catch{}}}
async function save(as){if(!root.children.length){toast('Nothing to save.','warn');return}
  try{if(window.showSaveFilePicker&&(as||!P.handle)){P.handle=await showSaveFilePicker({suggestedName:P.name+'.json',types:[{description:'Mini Blender project',accept:{'application/json':['.json']}}]});P.name=clean(P.handle.name.replace(/\.json$/i,''))}
    else if(!window.showSaveFilePicker&&(as||!P.named)){const r=await ask('Save project as',['Save','Cancel'],P.name);if(r.i)return;P.name=clean(r.v)}
    $('#st').textContent='Saving...';const data=pack();
    if(P.handle){const w=await P.handle.createWritable();await w.write(data);await w.close()}else dl(new Blob([data],{type:'application/json'}),P.name+'.json');
    P.named=true;P.state='Saved';saved=H[hi];forceDirty=false;addRecent(P.name,data);try{localStorage.removeItem('mb_recover')}catch{}refresh();toast('Project saved successfully.')
  }catch(e){refresh();if(e&&e.name!=='AbortError')toast('Failed to save project.','err')}}
function loadProject(j,name){const g=new T.ObjectLoader().parse(j.scene);clearRoot();[...g.children].forEach(c=>root.add(c));anim=j.anim||{dur:5,keys:{}};tm=0;
  if(j.bg)scene.background.set(j.bg);if(j.w)applyW(j.w);if(j.cam){cam.position.fromArray(j.cam.p);orbit.target.fromArray(j.cam.t);cam.fov=j.cam.fov||50;cam.updateProjectionMatrix()}
  Object.assign(P,{name:clean(name||j.name||'Project'),handle:null,named:true,state:'Loaded'});H=[];hi=-1;rebuild();select(null);commit();saved=H[0];refresh();markers()}
function parseProject(txt){let j;try{j=JSON.parse(txt)}catch{throw'The file is not valid JSON.'}if(!j||j.app!=='MiniBlender'||!j.scene||!j.scene.object)throw'Unsupported file format.';return j}
async function openFile(f,txt,quiet){$('#st').textContent='Loading...';try{const raw=txt??await f.text(),j=parseProject(raw);loadProject(j,f?f.name.replace(/\.json$/i,''):j.name);addRecent(P.name,raw);toast('Project loaded successfully.')}
  catch(e){refresh();toast(typeof e=='string'?e:'Failed to load project.','err')}}
const file=$('#file');
function pickFile(acc,fn){file.accept=acc;file.onchange=()=>{const f=file.files[0];file.value='';f&&fn(f)};file.click()}
async function openDlg(){if(await guard('You have unsaved changes. Save before opening another project?'))pickFile('.json,application/json',f=>openFile(f))}

/* ---------- Import / Export ---------- */
async function importFile(f){const ext=f.name.split('.').pop().toLowerCase(),nm=f.name.replace(/\.[^.]+$/,'');$('#st').textContent='Loading...';
  try{let items;
    if(ext=='glb'||ext=='gltf')items=[(await new GLTFLoader().parseAsync(ext=='glb'?await f.arrayBuffer():await f.text(),'')).scene];
    else if(ext=='obj')items=[new OBJLoader().parse(await f.text())];
    else if(ext=='json'){let j;try{j=JSON.parse(await f.text())}catch{throw'The file is not valid JSON.'}const sj=j&&j.scene&&j.scene.object?j.scene:j&&j.object?j:null;if(!sj)throw'Unsupported file format.';
      const o=new T.ObjectLoader().parse(sj);items=o.type=='Group'||o.type=='Scene'?[...o.children]:[o]}
    else throw'Unsupported file format.';
    items.forEach((o,i)=>{if(ext!='json'){o.name=uniq(nm);const sz=new T.Box3().setFromObject(o).getSize(new T.Vector3()).length();if(sz>12||(sz>0&&sz<.2))o.scale.setScalar(4/sz);o.traverse(c=>{if(c.isMesh)c.castShadow=c.receiveShadow=true})}else o.name=uniq(o.name||'Object');root.add(o);ring(o.position)});
    rebuild();select(items[items.length-1]);commit();toast('Import completed.')}
  catch(e){refresh();toast(typeof e=='string'?e:'Failed to import file.','err')}}
function expGroup(){const g=new T.Group();root.children.filter(o=>o.visible&&(o.isMesh||o.isGroup)).forEach(o=>g.add(o.clone()));g.updateMatrixWorld(true);return g}
async function exportAs(t){const g=expGroup();if(!g.children.length){toast('Nothing to export.','warn');return}
  try{const n=P.name;if(t=='obj')dl(new Blob([new OBJExporter().parse(g)],{type:'text/plain'}),n+'.obj');else if(t=='json')dl(new Blob([pack()],{type:'application/json'}),n+'.json');
    else{const r=await new Promise((ok,no)=>new GLTFExporter().parse(g,ok,no,{binary:t=='glb'}));dl(t=='glb'?new Blob([r],{type:'model/gltf-binary'}):new Blob([JSON.stringify(r)],{type:'model/gltf+json'}),n+'.'+t)}
    toast('Export completed.')}catch(e){toast('Export failed.','err')}}
function shot(){const v=[aux.visible,tc.visible];aux.visible=tc.visible=false;R.setScissorTest(false);R.setViewport(0,0,vp.clientWidth,vp.clientHeight);if(cv){cv.aspect=vp.clientWidth/vp.clientHeight;cv.updateProjectionMatrix()}R.render(scene,cv||cam);
  R.domElement.toBlob(b=>{dl(b,P.name+'.png');toast('Export completed.')});aux.visible=v[0];tc.visible=v[1]}

/* ---------- Animation ---------- */
function sample(){for(const id in anim.keys){const o=find(id),k=anim.keys[id];if(!o||!k.length)continue;let a=k[0],b=a;
  if(tm>=k[k.length-1].t)a=b=k[k.length-1];else for(let i=0;i<k.length-1;i++)if(tm>=k[i].t&&tm<k[i+1].t){a=k[i];b=k[i+1];break}
  let f=a===b?0:(tm-a.t)/(b.t-a.t);if(anim.ease)f=f*f*(3-2*f);const L=(x,y)=>x.map((v,i)=>v+(y[i]-v)*f);o.position.fromArray(L(a.p,b.p));o.rotation.set(...L(a.r,b.r));o.scale.fromArray(L(a.s,b.s))}}
function ui(){$('#tr').value=$('#tr2').value=tm;$('#tt').textContent=$('#tt2').textContent=tm.toFixed(2)+'s';if(S)syncProps()}
function markers(){const tr=$('#tr'),k=$('#kfs');tr.max=$('#tr2').max=anim.dur;$('#dur').value=anim.dur;document.querySelector('[data-t=ease]').classList.toggle('on',!!anim.ease);k.replaceChildren();
  ((S&&anim.keys[S.uuid])||[]).forEach(x=>{const i=el('i');i.style.left=(x.t/anim.dur*100)+'%';k.append(i)})}
function addKey(q){if(!S){toast('Select an object first.','warn');return}SS.forEach(o=>{const k=anim.keys[o.uuid]||(anim.keys[o.uuid]=[]),t=+tm.toFixed(2),n={t,p:o.position.toArray(),r:[o.rotation.x,o.rotation.y,o.rotation.z],s:o.scale.toArray()},i=k.findIndex(x=>Math.abs(x.t-t)<.01);i<0?k.push(n):k[i]=n;k.sort((a,b)=>a.t-b.t)});
  markers();commit();q||toast('Keyframe added.')}
$('#tr').oninput=$('#tr2').oninput=e=>{tm=+e.target.value;sample();ui()};
$('#dur').onchange=e=>{anim.dur=Math.min(60,Math.max(1,+e.target.value||5));tm=Math.min(tm,anim.dur);markers();ui()};
function tact(e){const b=e.target.closest('[data-t]');if(!b)return;const a=b.dataset.t,k=(S&&anim.keys[S.uuid])||[];
  if(a=='key')addKey();
  else if(a=='del'){if(!S)return;const i=k.findIndex(x=>Math.abs(x.t-tm)<.06);if(i<0)return toast('No keyframe here.','warn');k.splice(i,1);if(!k.length)delete anim.keys[S.uuid];markers();commit()}
  else if(a=='clr'){if(k.length){delete anim.keys[S.uuid];markers();commit();toast('Animation cleared.')}}
  else if(a=='play'){if(tm>=anim.dur)tm=0;playing=true}else if(a=='pause')playing=false;
  else if(a=='stop'){playing=false;tm=0;sample();ui()}
  else if(a=='prev'||a=='next'){const ts=[...new Set(Object.values(anim.keys).flat().map(x=>x.t))].sort((x,y)=>x-y),n=a=='next'?ts.find(x=>x>tm+.005):ts.reverse().find(x=>x<tm-.005);if(n!=null){tm=n;sample();ui()}}
  else if(a=='loop'){loopOn=!loopOn;b.classList.toggle('on',loopOn)}
  else if(a=='spd'){spd=spd==1?.5:spd==.5?2:1;b.textContent=spd+'×'}
  else if(a=='auto'){autoKey=!autoKey;b.classList.toggle('on',autoKey);toast(autoKey?'Auto-key on.':'Auto-key off.')}
  else if(a=='ease'){anim.ease=!anim.ease;b.classList.toggle('on',anim.ease);commit()}
  else if(a=='x')exitCam();else if(a=='fs')toggleFs();else if(a=='rec')recVid();else if(a=='thirds')toggleThirds();else if(a=='bars')$('#vp').classList.toggle('bars')}
$('#tl').onclick=$('#camhud').onclick=tact;

/* ---------- Menus & toolbar ---------- */
const M={
  File:()=>[['New',newProj,'Ctrl+N'],['Open…',openDlg,'Ctrl+O'],['Save',()=>save(),'Ctrl+S'],['Save As…',()=>save(true),'Ctrl+Shift+S']],
  Add:()=>[...Object.keys(G).map(k=>[k,()=>addMesh(k)]),0,['Point Light',()=>add(light('Point'))],['Spot Light',()=>add(light('Spot'))],['Directional Light',()=>add(light('Directional'))],['Ambient Light',()=>add(light('Ambient'))],0,['Camera',()=>add(camera())]],
  Edit:()=>[['Undo',undo,'Ctrl+Z'],['Redo',redo,'Ctrl+Y'],0,['Clone',clone,'Shift+D'],['Array Clone…',arrayClone],['Mirror X',mirror],['Drop to Floor',drop],['Reset Transform',resetT],['Center to Origin',centerO],['Lock / Unlock',lockSel,'L'],['Isolate',isolate,'I'],['Show All',showAll,'Alt+H'],['Random Color',randCol],0,['Focus',focus,'F'],['Delete',del,'Del'],0,['Clear Scene',clearScene]],
  Select:()=>[['Select All',selAll,'Ctrl+A'],['Select None',selNone,'Alt+A'],['Invert Selection',selInv,'Ctrl+I'],0,['Box Select',boxToggle,'B'],['Multi Select',multiToggle,'M'],0,['Select Same Color',selSame],['Select Meshes',()=>selKind('mesh')],['Select Lights',()=>selKind('light')],['Select Cameras',()=>selKind('cam')]],
  Arrange:()=>[['Union',union,'Ctrl+G'],['Ungroup',ungroup,'Ctrl+Shift+G'],['Join Meshes',joinMesh,'Ctrl+J'],0,['Align X',()=>align('x')],['Align Y',()=>align('y')],['Align Z',()=>align('z')],['Distribute X',distribute],0,['Copy Look',copyLook,'Alt+C'],['Paste Look',pasteLook,'Alt+V']],
  View:()=>[['Camera View',()=>enterCam(camTarget()),'C'],['Frame All',frameAll,'Home'],0,['Front',()=>viewTo('front'),'Num 1'],['Right',()=>viewTo('right'),'Num 3'],['Top',()=>viewTo('top'),'Num 7'],['Perspective',()=>viewTo('persp'),'Num 5'],0,['Wireframe',toggleWire,'Z'],['Snap',toggleSnap,'Q'],['Local / World',toggleSpace,'T'],['Grid',toggleGrid],['Studio Reflections',()=>toggleEnv()],['Shadows',()=>toggleShadows()],['Quality: Low/High',toggleQuality],['Accent Color',cycleAccent],['Auto Rotate',()=>{orbit.autoRotate=!orbit.autoRotate;orbit.autoRotateSpeed=2}],['Fullscreen',()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen()]],
  Import:()=>[['GLTF',()=>pickFile('.gltf',importFile)],['GLB',()=>pickFile('.glb',importFile)],['OBJ',()=>pickFile('.obj',importFile)],['JSON Scene',()=>pickFile('.json,application/json',importFile)]],
  Export:()=>[['GLTF',()=>exportAs('gltf')],['GLB',()=>exportAs('glb')],['OBJ',()=>exportAs('obj')],['JSON',()=>exportAs('json')],['Screenshot PNG',shot],['Record Video (WebM)',recVid]],
  Recent:()=>{const l=recents();return l.length?l.map(r=>[r.name+'  ·  '+new Date(r.time).toLocaleString([],{dateStyle:'short',timeStyle:'short'}),async()=>{if(!await guard('You have unsaved changes. Save before opening another project?'))return;
    if(r.data)openFile(null,r.data);else toast('Project data is no longer available.','warn')}]):[['No recent projects',()=>{}]]}};
const closeM=()=>document.querySelectorAll('.mn.on').forEach(m=>m.classList.remove('on'));
Object.keys(M).forEach(n=>{const w=el('div','mn'),b=el('button','',n),d=el('div','dd');b.dataset.h=n;
  b.onclick=()=>{const was=w.classList.contains('on');closeM();if(was)return;d.replaceChildren();M[n]().forEach(i=>{if(!i){d.append(el('hr'));return}const x=el('button','',i[0]);x.dataset.h=i[0];if(i[2])x.append(el('kbd','',i[2]));x.onclick=()=>{closeM();i[1]()};d.append(x)});
    d.style.left=Math.max(4,Math.min(b.getBoundingClientRect().left,innerWidth-230))+'px';w.classList.add('on')};
  w.append(b,d);$('#menus').append(w)});
addEventListener('pointerdown',e=>{if(!e.target.closest('.mn'))closeM()});
[['translate','✥','Move (G)'],['rotate','↻','Rotate (R)'],['scale','⤢','Scale (S)']].forEach(([m,t,ti])=>{const b=el('button','',t);b.dataset.m=m;b.title=ti;b.setAttribute('aria-label',ti);b.onclick=()=>setMode(m);$('#tools').append(b)});
const tb={};
$('#tools').append(el('hr'));
[['◎','Focus (F)',focus],['⧉','Clone (Shift+D)',clone],['↶','Undo (Ctrl+Z)',undo],['↷','Redo (Ctrl+Y)',redo],['🗑','Delete',del],['🎥','Camera View (C)',()=>enterCam(camTarget())],['🧲','Snap (Q)',toggleSnap],['▦','Wireframe (Z)',toggleWire]].forEach(([t,ti,f])=>{const b=el('button','',t);b.title=ti;b.dataset.h=ti;b.setAttribute('aria-label',ti);b.onclick=f;tb[ti]=b;$('#tools').append(b)});
$('#ptog').onclick=()=>document.body.classList.toggle('sheet');

/* ---------- Keyboard ---------- */
addEventListener('keydown',e=>{const m=$('#modal');
  if(m.classList.contains('on')){if(e.key=='Escape'){e.preventDefault();$('#mb').lastChild.click()}else if(e.key=='Enter'&&e.target.id=='mi'){e.preventDefault();$('#mb').firstChild.click()}return}
  const k=e.key.toLowerCase(),c=e.ctrlKey||e.metaKey,inF=/INPUT|TEXTAREA/.test(e.target.tagName)&&e.target.type!='range';
  if(c){if(k=='s'){e.preventDefault();save(e.shiftKey)}else if(k=='o'){e.preventDefault();openDlg()}else if(k=='n'){e.preventDefault();newProj()}
    else if(!inF&&k=='a'){e.preventDefault();selAll()}else if(k=='g'){e.preventDefault();e.shiftKey?ungroup():union()}else if(k=='j'){e.preventDefault();joinMesh()}else if(!inF&&k=='i'){e.preventDefault();selInv()}else if(k=='d'){e.preventDefault();clone()}else if(!inF&&k=='z'){e.preventDefault();e.shiftKey?redo():undo()}else if(!inF&&k=='y'){e.preventDefault();redo()}return}
  if(inF)return;if(cv){if(k=='escape')exitCam();else if(k==' '){e.preventDefault();playing=!playing}else if(k=='g')toggleThirds();else if(k==','||k=='.')step(k=='.'?1:-1);else if(k=='f')toggleFs();return}
  if(e.altKey&&k=='a'){selNone();return}if(e.altKey&&k=='c'){copyLook();return}if(e.altKey&&k=='v'){pasteLook();return}if(k=='b'){boxToggle();return}if(k=='m'){multiToggle();return}if(k=='tab'){e.preventDefault();cycle(e.shiftKey?-1:1);return}if(e.altKey&&k=='h'){showAll();return}if(k=='l'&&S){lockSel();return}if(k=='i'){isolate();return}if(k==','||k=='.'){step(k=='.'?1:-1);return}if(e.target===document.body&&S&&nudge(e))return;const nv={Numpad1:'front',Numpad3:'right',Numpad7:'top',Numpad5:'persp'}[e.code];
  if(nv)viewTo(nv);else if(k=='g')setMode('translate');else if(k=='r')setMode('rotate');else if(k=='s')setMode('scale');else if(k=='f')focus();
  else if(k=='delete'||k=='backspace'||k=='x')del();else if(k=='d'&&e.shiftKey)clone();else if(k=='f2'&&S)rename(S);
  else if(k=='escape')help?toggleHelp():select(null);else if(k=='?')toggleHelp();else if(k=='h'&&S){const v=!S.visible;SS.forEach(o=>o.visible=v);selectMany(SS,S);commit()}
  else if(k=='c'||k=='0')enterCam(camTarget());else if(k=='q')toggleSnap();else if(k=='t')toggleSpace();else if(k=='z')toggleWire();else if(k=='home')frameAll();
  else if(k=='k')addKey();else if(k==' '&&e.target.tagName!='BUTTON'){e.preventDefault();playing=!playing}});

/* ---------- Autosave & errors ---------- */
const stash=()=>{if(isDirty()&&root.children.length){try{localStorage.setItem('mb_recover',pack())}catch{}}};
setInterval(stash,60000);
addEventListener('beforeunload',e=>{if(isDirty()){stash();e.preventDefault();e.returnValue=''}});
addEventListener('error',()=>toast('Something went wrong.','err'));
addEventListener('unhandledrejection',()=>toast('Something went wrong.','err'));

/* ---------- Render loop ---------- */
function draw(){const w=vp.clientWidth,h=vp.clientHeight;if(!w||!h)return;R.setScissorTest(false);R.setViewport(0,0,w,h);
  if(cv){cv.aspect=w/h;cv.updateProjectionMatrix();const tv=tc.visible;aux.visible=tc.visible=false;R.render(scene,cv);aux.visible=true;tc.visible=tv;return}
  R.render(scene,cam);tri=R.info.render.triangles;
  const ac=root.children.find(o=>o.isCamera&&o.userData.active&&o.visible),pv=$('#pv');pv.style.display=ac?'block':'none';
  if(ac){const pw=innerWidth<820?132:200,ph=Math.round(pw*9/16),tv=tc.visible;ac.aspect=pw/ph;ac.updateProjectionMatrix();aux.visible=tc.visible=false;
    R.setScissorTest(true);R.setViewport(12,12,pw,ph);R.setScissor(12,12,pw,ph);R.render(scene,ac);R.setScissorTest(false);aux.visible=true;tc.visible=tv}}
function loop(now){requestAnimationFrame(loop);const dt=Math.min((now-last)/1e3,.1);last=now;
  fx=fx.filter(a=>{const p=Math.min((now-a.t)/a.d,1);a.f(p);if(p>=1){a.end&&a.end();return false}return true});
  if(cv&&!cv.parent&&!cv.__x){cv.__x=1;exitCam()}fill.visible=!root.children.some(o=>o.isLight&&o.visible);if(scene.fog)scene.fog.color.copy(scene.background);if(playing){tm+=dt*spd;if(tm>anim.dur){if(loopOn)tm=0;else{tm=anim.dur;playing=false}}sample();ui()}track();
  orbit.update();if(S&&sel.visible){sel.setFromObject(S);sel.material.opacity=.7+.3*Math.sin(now/260)}selx.forEach(h=>{if(h.visible&&h.userData.o){h.setFromObject(h.userData.o);h.material.opacity=sel.material.opacity}});
  helpers.forEach(h=>{h.update&&h.update();h.visible=(h.light||h.camera).visible});proxies.forEach(p=>p.position.copy(p.userData.owner.position));
  fc++;if(now-ft>500){fps=Math.round(fc*1000/(now-ft));fc=0;ft=now;$('#info').textContent=root.children.length+' objects'+(SS.length?' · '+SS.length+' selected':'')+' · '+(tri/1e3).toFixed(1)+'k tris · '+fps+' fps'}
  draw()}

/* ---------- v2: camera view, clone, help, extra tools ---------- */
const tv3=new T.Vector3(),camTarget=()=>S&&S.isCamera?S:root.children.find(o=>o.isCamera&&o.userData.active)||root.children.find(o=>o.isCamera);
function track(){root.children.forEach(c=>{const t=c.isCamera&&c.userData.tg&&find(c.userData.tg);if(t){tv3.copy(t.position);tv3.y+=c.userData.ty??1.2;c.lookAt(tv3)}})}
const iris=f=>{const i=$('#iris');i.classList.add('on');setTimeout(()=>{f();requestAnimationFrame(()=>i.classList.remove('on'))},240)};
function enterCam(c){if(cv)return;if(!c){toast('Add a camera first.','warn');return}
  iris(()=>{cv=c;root.children.forEach(o=>{if(o.isCamera)o.userData.active=false});c.userData.active=true;document.body.classList.remove('sheet');document.body.classList.add('camv');$('#cvn').textContent=c.name;tc.detach();sel.visible=false;orbit.enabled=false;dirtyMark()})}
function exitCam(){if(!cv)return;iris(()=>{cv=null;recing=false;document.body.classList.remove('camv','rec');orbit.enabled=!boxm;selectMany(SS,S)})}
async function recVid(){const c=camTarget();if(!c){toast('Add a camera first.','warn');return}
  if(!window.MediaRecorder){toast('Recording is not supported in this browser.','err');return}
  if(recing)return;if(!cv){enterCam(c);await new Promise(r=>setTimeout(r,700))}
  const ch=[],mt=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm',mr=new MediaRecorder(R.domElement.captureStream(30),{mimeType:mt});
  mr.ondataavailable=e=>e.data.size&&ch.push(e.data);mr.onstop=()=>{dl(new Blob(ch,{type:'video/webm'}),P.name+'.webm');recing=false;document.body.classList.remove('rec');toast('Export completed.')};
  tm=0;sample();playing=true;recing=true;document.body.classList.add('rec');mr.start();setTimeout(()=>{playing=false;mr.stop()},anim.dur*1000+250)}
const toggleThirds=()=>$('#vp').classList.toggle('thirds');
function cloneObj(o,d){const c=o.clone(true),a=[],b=[];o.traverse(x=>a.push(x));c.traverse(x=>b.push(x));
  b.forEach(x=>{if(x.isMesh)x.material=Array.isArray(x.material)?x.material.map(m=>m.clone()):x.material.clone()});
  a.forEach((x,i)=>{const k=anim.keys[x.uuid];if(k)anim.keys[b[i].uuid]=k.map(q=>({t:q.t,p:i?q.p.slice():q.p.map((v,j)=>v+d[j]),r:q.r.slice(),s:q.s.slice()}))});
  c.name=uniq(o.name.replace(/\.\d+$/,''));c.position.add(new T.Vector3(...d));if(c.userData.active)c.userData.active=false;return c}
function ghost(a,b){const bb=new T.Box3().setFromObject(a);if(bb.isEmpty())return;const sz=bb.getSize(new T.Vector3()),g=new T.Mesh(new T.BoxGeometry(sz.x,sz.y,sz.z),new T.MeshBasicMaterial({color:0x22e6ff,wireframe:true,transparent:true,depthWrite:false})),c0=bb.getCenter(new T.Vector3()),c1=c0.clone().add(b.position).sub(a.position);aux.add(g);
  tween(560,k=>{g.position.lerpVectors(c0,c1,1-Math.pow(1-k,3));g.material.opacity=1-k},()=>{aux.remove(g);g.geometry.dispose();g.material.dispose()})}
function sparks(p){const n=28,g=new T.BufferGeometry(),a=new Float32Array(n*3),v=[];for(let i=0;i<n;i++){const t=Math.random()*6.283,u=.6+Math.random()*1.6;v.push(Math.cos(t)*u,1+Math.random()*2,Math.sin(t)*u)}
  g.setAttribute('position',new T.BufferAttribute(a,3));const m=new T.Points(g,new T.PointsMaterial({color:0x7ff0ff,size:.07,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));m.position.copy(p);m.frustumCulled=false;aux.add(m);
  tween(800,k=>{for(let i=0;i<n;i++){a[i*3]=v[i*3]*k;a[i*3+1]=v[i*3+1]*k-2.5*k*k;a[i*3+2]=v[i*3+2]*k}g.attributes.position.needsUpdate=true;m.material.opacity=1-k},()=>{aux.remove(m);g.dispose();m.material.dispose()})}
function clone(){if(!S)return toast('Select an object first.','warn');const cs=SS.map(o=>{const c=cloneObj(o,[.6,0,.6]);ghost(o,c);return c});
  if(cs.length==1){add(cs[0]);toast('Cloned: '+cs[0].name);return}
  cs.forEach((c,i)=>{root.add(c);const s=c.scale.clone();c.scale.multiplyScalar(.001);ring(c.position);sparks(c.position);tween(450,p=>c.scale.copy(s).multiplyScalar(Math.max(ease(p),.001)),()=>{c.scale.copy(s);if(i==cs.length-1)commit()})});
  rebuild();selectMany(cs);toast(cs.length+' objects cloned.')}
async function arrayClone(){if(!S)return toast('Select an object first.','warn');const r=await ask('Array Clone: how many copies?',['Create','Cancel'],'4');if(r.i)return;
  const n=Math.min(30,Math.max(1,parseInt(r.v)||0)),bb=new T.Box3().setFromObject(S),w=bb.isEmpty()?1.5:bb.getSize(new T.Vector3()).x+.3,base=S;let c;
  for(let i=1;i<=n;i++){c=cloneObj(base,[w*i,0,0]);root.add(c);const s=c.scale.clone(),q=c;q.scale.setScalar(.001);setTimeout(()=>{ring(q.position);sparks(q.position);tween(380,p=>q.scale.copy(s).multiplyScalar(Math.max(ease(p),.001)),()=>q.scale.copy(s))},i*70)}
  rebuild();select(c);setTimeout(commit,n*70+500);toast(n+' clones created.')}
const mirror=()=>{if(!S)return;const cx=SS.reduce((a,o)=>a+o.position.x,0)/SS.length;SS.forEach(o=>{o.scale.x*=-1;if(SS.length>1)o.position.x=2*cx-o.position.x});syncProps();commit()};
function drop(){if(!S)return;const b=new T.Box3();SS.forEach(o=>b.expandByObject(o));if(b.isEmpty())return;SS.forEach(o=>o.position.y-=b.min.y);syncProps();commit()}
const resetT=()=>{if(!S)return;S.position.set(0,0,0);S.rotation.set(0,0,0);S.scale.set(1,1,1);syncProps();commit()};
function viewTo(n){const t=orbit.target.clone(),d=Math.max(cam.position.distanceTo(t),6),v={front:[0,0,1],right:[1,0,0],top:[0,1,.001],persp:[.55,.45,.7]}[n],p1=t.clone().add(new T.Vector3(...v).normalize().multiplyScalar(d)),p0=cam.position.clone();tween(480,k=>{k=1-Math.pow(1-k,3);cam.position.lerpVectors(p0,p1,k)})}
function frameAll(){const b=new T.Box3(),v=new T.Vector3();root.children.forEach(o=>{if(o.isLight||o.isCamera||!o.visible)return;const q=new T.Box3().setFromObject(o);if(!q.isEmpty()&&q.getSize(v).length()<30)b.union(q)});if(b.isEmpty())return;
  const c=b.getCenter(new T.Vector3()),r=Math.max(b.getSize(v).length(),2),p0=cam.position.clone(),t0=orbit.target.clone(),p1=c.clone().add(p0.clone().sub(t0).normalize().multiplyScalar(r*1.3));tween(520,k=>{k=1-Math.pow(1-k,3);orbit.target.lerpVectors(t0,c,k);cam.position.lerpVectors(p0,p1,k)})}
function toggleSnap(){snapOn=!snapOn;tc.setTranslationSnap(snapOn?.5:null);tc.setRotationSnap(snapOn?Math.PI/12:null);tc.setScaleSnap(snapOn?.1:null);tb['Snap (Q)'].classList.toggle('on',snapOn);toast(snapOn?'Snap on.':'Snap off.')}
const toggleSpace=()=>{tc.setSpace(tc.space=='world'?'local':'world');toast('Space: '+tc.space)};
function shade(){root.traverse(c=>{if(c.isMesh)[].concat(c.material).forEach(m=>{m.wireframe=wire;m.envMapIntensity=.4})})}
function toggleWire(){wire=!wire;shade();tb['Wireframe (Z)'].classList.toggle('on',wire)}
let gridOn=true;const toggleGrid=()=>{gridOn=!gridOn;aux.children.forEach(c=>{if(c.type=='GridHelper'||c.type=='Line')c.visible=gridOn})};
/* help */
const HELP=Object.fromEntries(`#logo|Mini Blender|Editor 3D mini di browser: buat objek, atur material, animasi, kamera, lalu simpan atau ekspor.
#ptitle|Nama project|Nama project aktif. Tanda ● berarti ada perubahan yang belum disimpan.
#hbtn|Bantuan (?)|Mode bantuan: sentuh bagian apa pun untuk lihat fungsinya tanpa menjalankannya. Tekan ? lagi untuk keluar.
#ptog|Panel|Buka/tutup panel Outliner dan Properties di HP.
File|Menu File|New = project baru, Open = buka file .json, Save / Save As = simpan project.
Add|Menu Add|Tambah bentuk, lampu, atau kamera ke scene.
Edit|Menu Edit|Undo/Redo, Clone, Array Clone, Mirror, Drop to Floor, Reset Transform, Focus, Delete, Clear Scene.
View|Menu View|Camera View, Frame All, view Front/Right/Top, Wireframe, Snap, Local/World, Grid, Auto Rotate, Fullscreen.
Import|Menu Import|Masukkan model GLTF, GLB, OBJ, atau scene JSON.
Export|Menu Export|Simpan sebagai GLTF, GLB, OBJ, JSON, screenshot PNG, atau video WebM dari kamera.
Recent|Recent Projects|Project yang baru dibuka atau disimpan. Klik untuk membukanya lagi.
New|New|Buat project baru. Ctrl+N.
Open…|Open|Buka file project .json. Ctrl+O.
Save|Save|Simpan project ke file. Ctrl+S.
Save As…|Save As|Simpan dengan nama atau lokasi baru. Ctrl+Shift+S.
Point Light|Point Light|Lampu titik: cahaya menyebar ke segala arah.
Spot Light|Spot Light|Lampu sorot berbentuk kerucut dan bisa membuat bayangan.
Directional Light|Directional Light|Cahaya paralel seperti matahari.
Ambient Light|Ambient Light|Cahaya dasar rata yang menerangi semua sisi.
Camera|Camera|Tambah kamera. Klik kamera di viewport untuk masuk Camera View.
Undo|Undo|Batalkan perubahan terakhir. Ctrl+Z.
Redo|Redo|Ulangi perubahan yang dibatalkan. Ctrl+Y.
Clone|Clone|Gandakan objek terpilih beserta animasinya. Shift+D atau Ctrl+D.
Array Clone…|Array Clone|Gandakan objek berderet sebanyak angka yang kamu isi.
Mirror X|Mirror X|Balik objek terpilih pada sumbu X.
Drop to Floor|Drop to Floor|Turunkan objek sampai menempel di lantai (y = 0).
Reset Transform|Reset Transform|Kembalikan posisi, rotasi, dan scale ke bawaan.
Focus|Focus|Arahkan kamera editor ke objek terpilih. F.
Delete|Delete|Hapus objek terpilih. Delete atau X.
Clear Scene|Clear Scene|Hapus semua objek (ada konfirmasi).
Camera View|Camera View|Layar penuh dari kamera. Animasi kamera ikut diputar. Tekan ✕ atau Esc untuk keluar. C.
Frame All|Frame All|Tampilkan semua objek di layar. Home.
Front|Front|Lihat dari depan. Num 1.
Right|Right|Lihat dari kanan. Num 3.
Top|Top|Lihat dari atas. Num 7.
Perspective|Perspective|Kembali ke sudut miring. Num 5.
Wireframe|Wireframe|Tampilkan kerangka objek. Z.
Snap|Snap|Gerak, putar, dan scale per langkah tetap. Q.
Local / World|Local / World|Ganti gizmo antara sumbu objek dan sumbu dunia. T.
Grid|Grid|Tampil atau sembunyikan grid dan sumbu.
Auto Rotate|Auto Rotate|Putar kamera editor otomatis seperti turntable.
Fullscreen|Fullscreen|Layar penuh browser.
GLTF|GLTF|Format 3D standar web (.gltf).
GLB|GLB|GLTF dalam satu file biner.
OBJ|OBJ|Format 3D klasik, hanya bentuk objek.
JSON|JSON|Project atau scene dalam format JSON.
JSON Scene|JSON Scene|Gabungkan scene JSON ke project.
Screenshot PNG|Screenshot|Simpan gambar viewport tanpa gizmo.
Record Video (WebM)|Record Video|Rekam animasi dari kamera aktif menjadi video .webm.
m:translate|Move|Geser objek. G.
m:rotate|Rotate|Putar objek. R.
m:scale|Scale|Ubah ukuran objek. S.
Focus (F)|Focus|Arahkan kamera ke objek terpilih.
Clone (Shift+D)|Clone|Gandakan objek terpilih beserta animasinya.
Undo (Ctrl+Z)|Undo|Batalkan perubahan terakhir.
Redo (Ctrl+Y)|Redo|Ulangi perubahan yang dibatalkan.
Delete|Delete|Hapus objek terpilih.
Camera View (C)|Camera View|Masuk mode kamera layar penuh.
Snap (Q)|Snap|Gerak, putar, dan scale per langkah tetap.
Wireframe (Z)|Wireframe|Tampilkan kerangka objek.
#vp|Viewport|Seret = putar, klik kanan atau 2 jari = geser, scroll atau cubit = zoom. Klik objek untuk memilih, klik kamera untuk Camera View.
#pv|Camera preview|Pratinjau dari kamera aktif.
#outl|Outliner|Daftar semua objek di Scene Collection. Klik untuk memilih.
row|Baris objek|Klik untuk memilih. Klik dua kali untuk rename.
r:Rename|Rename|Ganti nama objek.
r:Clone|Clone|Gandakan objek ini.
r:Show / Hide|Show / Hide|Tampilkan atau sembunyikan objek.
r:Delete|Delete|Hapus objek.
r:Camera view|Camera view|Masuk Camera View dari kamera ini.
#props|Properties|Pengaturan objek terpilih, berubah real-time.
k:nm|Nama|Nama objek.
k:p|Location|Posisi X, Y, Z.
k:r|Rotation|Rotasi X, Y, Z dalam derajat.
k:s|Scale|Ukuran X, Y, Z.
k:col|Color|Warna objek atau lampu.
k:emi|Emissive|Warna cahaya yang dipancarkan permukaan.
k:met|Metalness|0 = non-logam, 1 = logam.
k:rou|Roughness|0 = mengkilap, 1 = kasar.
k:opa|Opacity|Transparansi. 1 = padat.
k:int|Intensity|Kekuatan cahaya.
k:fov|FOV|Lebar sudut pandang kamera.
k:tg|Look at|Kamera selalu menghadap objek ini, jadi ikut bergerak saat objek dianimasikan.
k:ty|Look height|Tinggi titik yang dilihat kamera pada objek target.
k:pre|Preset|Pilih material siap pakai.
k:shd|Cast shadow|Objek membuat bayangan.
k:bg|Background|Warna latar dunia.
#act|Set active camera|Jadikan kamera ini yang tampil di preview.
#cvb|Enter camera view|Masuk Camera View dari kamera ini.
#clb|Clone|Gandakan objek terpilih.
t:key|Key|Tambah keyframe di waktu sekarang. Kamera juga bisa dianimasikan.
t:del|Del|Hapus keyframe di waktu sekarang.
t:clr|Clear|Hapus semua keyframe objek terpilih.
t:auto|Auto|Auto-key: setiap selesai menggeser objek, keyframe langsung dibuat.
t:ease|Ease|Gerakan antar keyframe jadi halus (mulai dan berhenti pelan).
t:loop|Loop|Putar ulang animasi dari awal setelah selesai.
t:spd|Speed|Ganti kecepatan: 0.5×, 1×, 2×.
t:prev|Prev|Loncat ke keyframe sebelumnya.
t:next|Next|Loncat ke keyframe berikutnya.
t:play|Play|Putar animasi. Spasi.
t:pause|Pause|Jeda animasi.
t:stop|Stop|Kembali ke awal animasi.
#tr|Timeline|Geser untuk pindah waktu. Berlian putih = keyframe objek terpilih.
#tr2|Timeline|Geser untuk pindah waktu animasi.
#dur|Length|Panjang animasi dalam detik.
#tt|Waktu|Waktu animasi sekarang.
t:x|Keluar|Keluar dari Camera View dan kembali mengedit. Esc.
t:rec|Record|Rekam animasi dari kamera ini menjadi video WebM.
t:thirds|Guides|Garis bantu komposisi sepertiga. G.
t:bars|Cinema bars|Garis hitam atas dan bawah ala film.
#cvn|Kamera|Nama kamera yang sedang dipakai.
#stat|Status|Status project, jumlah objek, segitiga, dan FPS.`.split('\n').map(l=>{const[a,b,c]=l.split('|');return[a,[b,c]]}));
Object.keys(G).forEach(k=>HELP[k]=['Tambah '+k,'Tambah bentuk '+k+' ke scene.']);
const SHORT='Ctrl+S Save · Ctrl+Shift+S Save As · Ctrl+O Open · Ctrl+N New\nCtrl+Z Undo · Ctrl+Y Redo\nG Move · R Rotate · S Scale\nShift+D / Ctrl+D Clone\nF Focus · Home Frame All · Num 1/3/7/5 Views\nC Camera View · Esc keluar\nQ Snap · T Local/World · Z Wireframe\nK Keyframe · Space Play/Pause\nDelete / X Hapus · H Sembunyikan · F2 Rename\n? Bantuan\nL Lock · I Isolate · Alt+H Show All · Tab Pilih berikutnya\nPanah / PgUp / PgDn Geser objek · , . Mundur/maju 1 frame · F Fullscreen (Camera View)\nCtrl+A Select All · Alt+A None · Ctrl+I Invert · Shift+Klik multi-select\nB Box Select · M Multi-select (HP) · Ctrl+G Union · Ctrl+Shift+G Ungroup · Ctrl+J Join\nAlt+C / Alt+V Copy / Paste Look';
function hkey(t){for(let n=t;n&&n!==document.body;n=n.parentElement){const d=n.dataset||{},k=d.h||(d.k&&'k:'+d.k.replace(/^([prs])[012]$/,'$1'))||(d.t&&'t:'+d.t)||(d.m&&'m:'+d.m)||(n.id&&'#'+n.id)||(n.classList.contains('row')&&'row');if(k&&HELP[k])return[n,k]}return[]}
function showHelp(t){const[n,k]=hkey(t);document.querySelectorAll('.hl').forEach(x=>x.classList.remove('hl'));if(!n)return;n.classList.add('hl');$('#hct').textContent=HELP[k][0];$('#hcb').textContent=HELP[k][1];$('#hcard').classList.add('on')}
function toggleHelp(){help=!help;document.body.classList.toggle('help',help);if(!help){$('#hcard').classList.remove('on');document.querySelectorAll('.hl').forEach(x=>x.classList.remove('hl'))}else toast('Help mode on. Tap any part.')}
document.addEventListener('click',e=>{if(!help||e.target.closest('#hbar,#hcard,#modal,#hbtn'))return;showHelp(e.target);if(!e.target.closest('.mn>button')){e.preventDefault();e.stopPropagation()}},true);
['pointerdown','pointerup'].forEach(n=>document.addEventListener(n,e=>{if(help&&e.target.closest('#vp,#tools,#tl,#side,.dd')){e.preventDefault();e.stopPropagation()}},true));
$('#hbtn').onclick=$('#hx').onclick=toggleHelp;$('#hkeys').onclick=()=>ask(SHORT,['Close']);
$('#cvb').onclick=()=>enterCam(S);$('#clb').onclick=clone;
/* ---------- v3: PNG image on blocks, never-black lighting, extra tools ---------- */
const pmg=new T.PMREMGenerator(R),envTex=pmg.fromScene(new RoomEnvironment(),.04).texture;scene.environment=envTex;
const fill=new T.HemisphereLight(0xcfd8ff,0x30343c,.7);fill.visible=false;scene.add(fill);
const refMat=()=>root.traverse(c=>{if(c.isMesh)[].concat(c.material).forEach(m=>m.needsUpdate=true)});
let iso=null,nt=0,hq=true;
const setFog=d=>{scene.fog=d>0?new T.FogExp2(scene.background.getHex(),d):null};
function toggleEnv(q){scene.environment=scene.environment?null:envTex;$('#wenv').checked=!!scene.environment;refMat();q===true||toast('Studio reflections '+(scene.environment?'on.':'off.'))}
function toggleShadows(q){R.shadowMap.enabled=!R.shadowMap.enabled;$('#wsh').checked=R.shadowMap.enabled;refMat();q===true||toast('Shadows '+(R.shadowMap.enabled?'on.':'off.'))}
function toggleQuality(){hq=!hq;R.setPixelRatio(hq?Math.min(devicePixelRatio,2):1);R.setSize(vp.clientWidth,vp.clientHeight);toast('Quality: '+(hq?'High':'Low'))}
function applyW(w){R.toneMappingExposure=w.e??1;$('#wexp').value=R.toneMappingExposure;setFog(w.f||0);$('#wfog').value=w.f||0;if(!!w.v!==!!scene.environment)toggleEnv(true);if(w.s!==undefined&&w.s!==R.shadowMap.enabled)toggleShadows(true)}
$('#wexp').oninput=e=>{R.toneMappingExposure=+e.target.value;dirtyMark()};$('#wfog').oninput=e=>{setFog(+e.target.value);dirtyMark()};$('#wenv').onchange=()=>toggleEnv();$('#wsh').onchange=()=>toggleShadows();
const ACC=['#e87d0d','#22c7e6','#5fb37a','#d0d4dc'];let ai=0;try{ai=+localStorage.getItem('mb_acc')||0}catch{}
function setAcc(){const c=ACC[ai%ACC.length];document.documentElement.style.setProperty('--ac',c);sel.material.color.set(c)}
function cycleAccent(){ai++;try{localStorage.setItem('mb_acc',ai%ACC.length)}catch{}setAcc();toast('Accent color changed.')}setAcc();
function toggleFs(){const d=document;d.fullscreenElement?d.exitFullscreen():d.documentElement.requestFullscreen&&d.documentElement.requestFullscreen().catch(()=>toast('Fullscreen is blocked by the browser.','warn'))}
function step(d){playing=false;tm=Math.min(anim.dur,Math.max(0,tm+d/30));sample();ui()}
function cycle(d){const l=root.children;if(!l.length)return;const i=l.indexOf(S);select(l[i<0?(d>0?0:l.length-1):(i+d+l.length)%l.length])}
function lockSel(){if(!S)return toast('Select an object first.','warn');const v=!S.userData.lock;SS.forEach(o=>{if(v)o.userData.lock=true;else delete o.userData.lock});selectMany(SS,S);commit();toast(v?'Locked.':'Unlocked.')}
function isolate(){if(iso)return showAll();if(!S)return toast('Select an object first.','warn');iso=root.children.filter(o=>!SS.includes(o)&&o.visible&&!o.isLight&&!o.isCamera);iso.forEach(o=>o.visible=false);rows();commit();toast('Isolated. Press I again to restore.')}
function showAll(){(iso||root.children).forEach(o=>o.visible=true);iso=null;rows();commit()}
function centerO(){if(!S)return;const cx=SS.reduce((a,o)=>a+o.position.x,0)/SS.length,cz=SS.reduce((a,o)=>a+o.position.z,0)/SS.length;SS.forEach(o=>{o.position.x-=cx;o.position.z-=cz});syncProps();commit()}
const PAL=['#b9bdc7','#4d8df7','#e87d0d','#5fb37a','#d4a73c','#9a6bd1','#e5555d','#22c7e6'];
function randCol(){if(!S)return;SS.forEach(o=>{const c=PAL[Math.floor(Math.random()*PAL.length)];meshesOf(o).forEach(x=>mats(x).forEach(m=>{if(m.color&&!m.map)m.color.set(c)}))});syncProps();commit()}
function nudge(e){const m={ArrowLeft:[-1,0,0],ArrowRight:[1,0,0],ArrowUp:[0,0,-1],ArrowDown:[0,0,1],PageUp:[0,1,0],PageDown:[0,-1,0]}[e.key];if(!m||S.userData.lock)return false;e.preventDefault();const k=e.shiftKey?.5:.1;
  SS.forEach(o=>{if(!o.userData.lock){o.position.x+=m[0]*k;o.position.y+=m[1]*k;o.position.z+=m[2]*k}});syncProps();dirtyMark();clearTimeout(nt);nt=setTimeout(commit,450);return true}
Object.assign(HELP,{'#imgb':['Upload PNG','Pilih gambar PNG dari perangkat, lalu dipasang sebagai tekstur di block terpilih. Ikut tersimpan di project.'],'#imgx':['Remove image','Hapus gambar dari block ini.'],'k:rep':['Tiling','Berapa kali gambar diulang di permukaan block.'],'k:lk':['Lock','Kunci objek agar tidak bisa digeser atau terhapus. Tombol L.'],
 '#wexp':['Exposure','Terang atau gelapnya seluruh scene.'],'#wfog':['Fog','Kabut tipis berwarna latar untuk kesan kedalaman.'],'#wenv':['Reflections','Pantulan studio supaya bahan logam tidak tampak hitam.'],'#wsh':['Shadows','Nyalakan atau matikan bayangan. Matikan jika berat di HP.'],
 'Studio Reflections':['Studio Reflections','Pantulan cahaya studio untuk bahan logam dan mengkilap.'],'Shadows':['Shadows','Nyalakan atau matikan bayangan.'],'Quality: Low/High':['Quality','Turunkan resolusi render supaya lebih ringan di HP.'],'Accent Color':['Accent Color','Ganti warna aksen antarmuka.'],
 'Center to Origin':['Center to Origin','Pindahkan objek ke tengah (X dan Z = 0).'],'Lock / Unlock':['Lock / Unlock','Kunci atau buka kunci objek. L.'],'Isolate':['Isolate','Sembunyikan semua kecuali objek terpilih. Tekan lagi untuk memulihkan. I.'],'Show All':['Show All','Tampilkan lagi semua objek. Alt+H.'],'Random Color':['Random Color','Beri warna acak dari palet ke objek terpilih.'],'t:fs':['Fullscreen','Layar penuh browser saat Camera View. F.']});
/* ---------- v4: multi-select, union, face-mapped PNG ---------- */
const m4=new T.Matrix4(),mp=new T.Object3D();let selx=[],mrel=[],multi=false,boxm=false,looks=null,bx=null,faceSel='All';scene.add(mp);
const bs=el('div');bs.id='bsel';vp.append(bs);
const mats=o=>o&&o.material?[].concat(o.material):[];
const firstMesh=o=>{let r=null;o&&o.traverse(c=>{if(!r&&c.isMesh)r=c});return r};
const meshesOf=o=>{const r=[];o.traverse(c=>c.isMesh&&r.push(c));return r};
const isBox=o=>o.isMesh&&o.geometry&&o.geometry.type=='BoxGeometry',unl=o=>!o.userData.lock;
/* selection */
function refSel(){sel.visible=!!(S&&S.visible&&(S.isMesh||S.isGroup));const ex=SS.filter(o=>o!==S);
  while(selx.length<ex.length){const h=new T.BoxHelper(new T.Object3D(),0xe87d0d);h.material.transparent=true;h.material.depthTest=false;h.material.color.copy(sel.material.color);aux.add(h);selx.push(h)}
  selx.forEach((h,i)=>{h.userData.o=ex[i];h.visible=!!(ex[i]&&ex[i].visible&&(ex[i].isMesh||ex[i].isGroup))});
  const L=SS.filter(o=>o.visible&&unl(o));if(!S||!L.length||boxm){tc.detach();return}
  if(SS.length<2){tc.attach(S);return}
  const c=new T.Vector3();L.forEach(o=>c.add(o.position));c.divideScalar(L.length);mp.position.copy(c);mp.quaternion.identity();mp.scale.set(1,1,1);mp.updateMatrixWorld(true);tc.attach(mp)}
function selectMany(l,pri){SS=l.filter(Boolean);S=pri&&SS.includes(pri)?pri:SS[SS.length-1]||null;refSel();rows();syncProps();markers()}
tc.addEventListener('dragging-changed',e=>{if(tc.object===mp&&e.value){root.updateMatrixWorld(true);const inv=mp.matrixWorld.clone().invert();mrel=SS.filter(o=>o.visible&&unl(o)).map(o=>({o,m:inv.clone().multiply(o.matrixWorld)}))}});
tc.addEventListener('objectChange',()=>{if(tc.object!==mp)return;mp.updateMatrixWorld(true);mrel.forEach(({o,m})=>m4.multiplyMatrices(mp.matrixWorld,m).decompose(o.position,o.quaternion,o.scale));syncProps()});
const flash=l=>l.slice(0,10).forEach(o=>ring(o.position));
function selAll(){const l=root.children.filter(unl);if(!l.length)return toast('Nothing to select.','warn');selectMany(l,S);flash(l);toast(l.length+' selected.')}
const selNone=()=>select(null);
function selInv(){const l=root.children.filter(o=>!SS.includes(o)&&unl(o));selectMany(l);flash(l)}
function selSame(){if(!S)return toast('Select an object first.','warn');const mc=o=>{const m=mats(firstMesh(o))[0];return m&&m.color?m.color.getHex():null},c=mc(S);if(c==null)return toast('This object has no color.','warn');const l=root.children.filter(o=>mc(o)===c);selectMany(l,S);flash(l);toast(l.length+' with the same color.')}
function selKind(k){const l=root.children.filter(o=>k=='mesh'?(o.isMesh||o.isGroup):k=='light'?o.isLight:o.isCamera);if(!l.length)return toast('None found.','warn');selectMany(l);flash(l);toast(l.length+' selected.')}
function multiToggle(){multi=!multi;tb['Multi Select (M)'].classList.toggle('on',multi);toast(multi?'Multi-select on: tap objects to add or remove.':'Multi-select off.')}
function boxToggle(){boxm=!boxm;vp.classList.toggle('boxm',boxm);tb['Box Select (B)'].classList.toggle('on',boxm);orbit.enabled=!boxm&&!cv;refSel();toast(boxm?'Box select on: drag to select.':'Box select off.')}
R.domElement.addEventListener('pointerdown',e=>{if(!boxm||e.button)return;const r=vp.getBoundingClientRect();bx={x:e.clientX-r.left,y:e.clientY-r.top,a:e.shiftKey||e.ctrlKey||multi}});
addEventListener('pointermove',e=>{if(!bx)return;const r=vp.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;bx.x2=x;bx.y2=y;Object.assign(bs.style,{left:Math.min(bx.x,x)+'px',top:Math.min(bx.y,y)+'px',width:Math.abs(x-bx.x)+'px',height:Math.abs(y-bx.y)+'px'});bs.classList.toggle('on',Math.hypot(x-bx.x,y-bx.y)>5)});
addEventListener('pointerup',()=>{if(!bx)return;const b=bx;bx=null;if(!bs.classList.contains('on'))return;bs.classList.remove('on');
  const w=vp.clientWidth,h=vp.clientHeight,x0=Math.min(b.x,b.x2),x1=Math.max(b.x,b.x2),y0=Math.min(b.y,b.y2),y1=Math.max(b.y,b.y2),v=new T.Vector3(),bb=new T.Box3();
  const hit=root.children.filter(o=>{if(!o.visible||!unl(o))return false;bb.setFromObject(o);bb.isEmpty()?v.copy(o.position):bb.getCenter(v);v.project(cam);const sx=(v.x+1)/2*w,sy=(1-v.y)/2*h;return v.z<1&&sx>=x0&&sx<=x1&&sy>=y0&&sy<=y1});
  if(!hit.length)return toast('Nothing in the box.','warn');selectMany(b.a?[...new Set([...SS,...hit])]:hit);flash(hit);toast(hit.length+' selected.')});
/* union / join */
function union(){const L=SS.filter(o=>unl(o)&&!o.isLight&&!o.isCamera);if(L.length<2)return toast('Select at least 2 objects to union.','warn');
  const g=new T.Group(),c=new T.Vector3();L.forEach(o=>c.add(o.position));c.divideScalar(L.length);g.position.copy(c);g.name=uniq('Union');g.updateMatrixWorld(true);
  L.forEach(o=>{ghost(o,{position:c});const k=anim.keys[o.uuid];if(k)anim.keys[o.uuid]=k.map(q=>({...q,p:[q.p[0]-c.x,q.p[1]-c.y,q.p[2]-c.z]}));g.attach(o)});
  root.add(g);rebuild();ring(c);sparks(c);selectMany([g]);commit();toast('Union created: '+g.name)}
function ungroup(){const gs=SS.filter(o=>o.type=='Group'&&o.children.length);if(!gs.length)return toast('Select a union group first.','warn');const out=[];
  gs.forEach(g=>{g.updateMatrixWorld(true);const flat=Math.abs(g.rotation.x)+Math.abs(g.rotation.y)+Math.abs(g.rotation.z)<1e-4&&Math.abs(g.scale.x-1)+Math.abs(g.scale.y-1)+Math.abs(g.scale.z-1)<1e-4,p=g.position.clone();
    [...g.children].forEach(ch=>{const k=anim.keys[ch.uuid];if(k){if(flat)anim.keys[ch.uuid]=k.map(q=>({...q,p:[q.p[0]+p.x,q.p[1]+p.y,q.p[2]+p.z]}));else delete anim.keys[ch.uuid]}root.attach(ch);out.push(ch);ring(ch.position)});delete anim.keys[g.uuid];root.remove(g)});
  rebuild();selectMany(out);commit();toast('Ungrouped.')}
function parts(m){const g=m.geometry,a=mats(m),o=[];if(Array.isArray(m.material)&&g.groups.length&&g.index)g.groups.forEach(gr=>{const q=g.clone();q.clearGroups();q.setIndex(new T.BufferAttribute(g.index.array.slice(gr.start,gr.start+gr.count),1));o.push([q,a[gr.materialIndex]])});else o.push([g.clone(),a[0]]);return o}
function joinMesh(){const ms=[];SS.forEach(o=>unl(o)&&o.traverse(c=>c.isMesh&&ms.push(c)));if(ms.length<2)return toast('Select at least 2 meshes to join.','warn');
  try{root.updateMatrixWorld(true);const gs=[],mt=[],c0=new T.Vector3();
    ms.forEach(m=>parts(m).forEach(([g,mat])=>{g.applyMatrix4(m.matrixWorld);gs.push(g.index?g.toNonIndexed():g);mt.push(mat)}));
    const mg=mergeGeometries(gs,true);if(!mg)throw 0;const um=[...new Set(mt)];mg.groups.forEach((gr,i)=>gr.materialIndex=um.indexOf(mt[i]));
    mg.computeBoundingBox();mg.boundingBox.getCenter(c0);mg.translate(-c0.x,-c0.y,-c0.z);
    const j=new T.Mesh(mg,um.length==1?um[0]:um);j.name=uniq('Joined');j.position.copy(c0);j.castShadow=j.receiveShadow=true;
    SS.filter(unl).forEach(o=>{ghost(o,{position:c0});root.remove(o);o.traverse(x=>{x.geometry&&x.geometry.dispose();delete anim.keys[x.uuid]})});
    root.add(j);rebuild();ring(c0);sparks(c0);selectMany([j]);commit();toast('Joined into one mesh: '+j.name)}catch(e){toast('These meshes cannot be joined.','err')}}
/* arrange */
function glide(a){const s=a.map(([o])=>o.position.clone());tween(380,k=>{k=1-Math.pow(1-k,3);a.forEach(([o,x,y,z],i)=>o.position.set(s[i].x+(x-s[i].x)*k,s[i].y+(y-s[i].y)*k,s[i].z+(z-s[i].z)*k));syncProps()},commit)}
function align(ax){if(SS.length<2)return toast('Select at least 2 objects.','warn');glide(SS.filter(unl).map(o=>{const p=o.position.clone();p[ax]=S.position[ax];return[o,p.x,p.y,p.z]}));toast('Aligned '+ax.toUpperCase()+' to the active object.')}
function distribute(){const L=SS.filter(unl).sort((a,b)=>a.position.x-b.position.x);if(L.length<3)return toast('Select at least 3 objects.','warn');const a=L[0].position.x,b=L[L.length-1].position.x;glide(L.map((o,i)=>[o,a+(b-a)*i/(L.length-1),o.position.y,o.position.z]));toast('Distributed along X.')}
function copyLook(){const m=mats(firstMesh(S))[0];if(!m)return toast('Select a mesh first.','warn');looks=m.clone();toast('Look copied.')}
function pasteLook(){if(!looks)return toast('Copy a look first (Alt+C).','warn');SS.forEach(o=>meshesOf(o).forEach(c=>{const old=mats(c);c.material=Array.isArray(c.material)?old.map(()=>looks.clone()):looks.clone();old.forEach(x=>x.dispose())}));syncProps();commit();toast('Look pasted.')}
/* materials for all selected (array-safe) */
const pr4=$('#props');
pr4.addEventListener('input',e=>{const t=e.target,k=t.dataset.k,v=t.value;if(!['col','emi','met','rou','opa','pre','shd','rep','int'].includes(k)||!SS.length||(v===''&&k!='shd'))return;e.stopImmediatePropagation();const f=+v;
  SS.forEach(o=>{if(o.isLight){if(k=='col')o.color.set(v);else if(k=='int')o.intensity=f;return}if(o.isCamera)return;
    meshesOf(o).forEach(c=>{if(k=='shd'){c.castShadow=t.checked;return}mats(c).forEach(m=>{if(k=='col')m.color.set(v);else if(k=='emi'&&m.emissive)m.emissive.set(v);else if(k=='met')m.metalness=f;else if(k=='rou')m.roughness=f;
      else if(k=='opa'){m.opacity=f;m.transparent=f<1||!!m.map}else if(k=='rep'){if(m.map)m.map.repeat.set(f,f)}
      else if(k=='pre'){const u=PRE[v];if(u&&m.emissive){m.color.set(u[0]);m.metalness=u[1];m.roughness=u[2];m.opacity=u[3];m.transparent=u[3]<1||!!m.map;m.emissive.set(u[4]);m.emissiveIntensity=u[4]=='#000000'?1:1.6}}})})});
  if(k=='pre'){t.value='';syncProps()}dirtyMark()},true);
pr4.addEventListener('input',e=>{if(e.target.dataset.k!='lk')return;SS.forEach(o=>{if(e.target.checked)o.userData.lock=true;else delete o.userData.lock});refSel();rows();dirtyMark()});
/* PNG on faces */
const FI={Right:0,Left:1,Up:2,Down:3,Front:4,Back:5},FACES={Right:{n:[1,0,0],r:[0,Math.PI/2,0],s:'dh'},Left:{n:[-1,0,0],r:[0,-Math.PI/2,0],s:'dh'},Up:{n:[0,1,0],r:[-Math.PI/2,0,0],s:'wd'},Down:{n:[0,-1,0],r:[Math.PI/2,0,0],s:'wd'},Front:{n:[0,0,1],r:[0,0,0],s:'wh'},Back:{n:[0,0,-1],r:[0,Math.PI,0],s:'wh'}};
function ensureFaces(c){if(!Array.isArray(c.material)){const b=c.material;c.material=[0,1,2,3,4,5].map(()=>b.clone());b.dispose()}}
function ftargets(c){if(faceSel!='All'&&isBox(c)){ensureFaces(c);return[c.material[FI[faceSel]]]}return mats(c)}
function flashFace(o,f){if(!isBox(o))return;const g=o.geometry.parameters,sc=o.getWorldScale(new T.Vector3()),d={w:g.width*sc.x,h:g.height*sc.y,d:g.depth*sc.z},wq=o.getWorldQuaternion(new T.Quaternion());
  (f=='All'?Object.keys(FACES):[f]).forEach(k=>{const F=FACES[k],[a,b]=[...F.s].map(c=>d[c]),m=new T.Mesh(new T.PlaneGeometry(a,b),new T.MeshBasicMaterial({color:ACC[ai%ACC.length],transparent:true,opacity:.65,depthTest:false,depthWrite:false,side:2}));
    m.position.copy(o.localToWorld(new T.Vector3(F.n[0]*g.width/2*1.004,F.n[1]*g.height/2*1.004,F.n[2]*g.depth/2*1.004)));m.quaternion.copy(wq).multiply(new T.Quaternion().setFromEuler(new T.Euler(...F.r)));m.renderOrder=10;aux.add(m);
    tween(800,q=>m.material.opacity=.65*(1-q)*(.7+.3*Math.cos(q*14)),()=>{aux.remove(m);m.geometry.dispose();m.material.dispose()})})}
$('#facec').onclick=e=>{const b=e.target.closest('[data-face]');if(!b)return;faceSel=b.dataset.face;$('#facec').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));SS.forEach(o=>meshesOf(o).forEach(c=>flashFace(c,faceSel)))};
function setImg(f){const ms=SS.flatMap(meshesOf);if(!ms.length)return toast('Select a block first.','warn');if(!(f.type=='image/png'||/\.png$/i.test(f.name)))return toast('Only PNG images are supported.','err');
  const u=URL.createObjectURL(f),im=new Image();
  im.onload=()=>{const k=Math.min(1,1024/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=R.capabilities.getMaxAnisotropy();
    ms.forEach(m=>{ftargets(m).forEach(x=>{if(x.map&&x.map!==t)x.map.dispose();x.map=t;x.color.set('#ffffff');x.transparent=true;x.alphaTest=.02;x.needsUpdate=true});flashFace(m,faceSel)});
    sparks(S.position);syncProps();commit();toast('Image applied to '+faceSel.toLowerCase()+'.')};
  im.onerror=()=>{URL.revokeObjectURL(u);toast('Failed to read image.','err')};im.src=u}
function rmImg(){let n=0;SS.flatMap(meshesOf).forEach(m=>ftargets(m).forEach(x=>{if(x.map){x.map.dispose();x.map=null;x.alphaTest=0;x.transparent=x.opacity<1;x.color.set('#b9bdc7');x.needsUpdate=true;n++}}));if(!n)return toast('No image on '+faceSel.toLowerCase()+'.','warn');syncProps();commit();toast('Image removed.')}
$('#imgb').onclick=()=>{if(!S)return toast('Select a block first.','warn');pickFile('image/png,.png',setImg)};$('#imgx').onclick=rmImg;
[['☑','Multi Select (M)',multiToggle],['⬚','Box Select (B)',boxToggle],['⊕','Union (Ctrl+G)',union],['⊖','Ungroup (Ctrl+Shift+G)',ungroup]].forEach(([t,ti,f])=>{const b=el('button','',t);b.title=ti;b.dataset.h=ti;b.setAttribute('aria-label',ti);b.onclick=f;tb[ti]=b;$('#tools').append(b)});
Object.assign(HELP,{'Select':['Menu Select','Pilih banyak objek sekaligus: semua, kebalikan, kotak seret, atau yang warnanya sama.'],'Arrange':['Menu Arrange','Union, Ungroup, Join, rapikan posisi (Align, Distribute), dan salin tampilan.'],
 'Select All':['Select All','Pilih semua objek. Ctrl+A.'],'Select None':['Select None','Batalkan semua pilihan. Alt+A.'],'Invert Selection':['Invert Selection','Pilih yang tidak terpilih, lepas yang terpilih. Ctrl+I.'],
 'Box Select':['Box Select','Seret kotak di viewport untuk memilih semua objek di dalamnya. Shift = tambah. B.'],'Multi Select':['Multi Select','Mode HP: setiap ketuk menambah atau melepas objek dari pilihan. M.'],
 'Select Same Color':['Select Same Color','Pilih semua objek berwarna sama dengan objek aktif.'],'Select Meshes':['Select Meshes','Pilih semua block dan grup.'],'Select Lights':['Select Lights','Pilih semua lampu.'],'Select Cameras':['Select Cameras','Pilih semua kamera.'],
 'Union':['Union','Gabung objek terpilih jadi satu grup: digeser, diputar, dan di-scale bersama sebagai satu objek. Ctrl+G.'],'Ungroup':['Ungroup','Pecah grup kembali jadi objek terpisah. Ctrl+Shift+G.'],'Join Meshes':['Join Meshes','Lebur block terpilih jadi satu mesh asli (bentuk dan gambar tetap). Animasi sumbernya hilang. Ctrl+J.'],
 'Align X':['Align X','Sejajarkan semua pilihan ke posisi X objek aktif.'],'Align Y':['Align Y','Sejajarkan semua pilihan ke posisi Y objek aktif.'],'Align Z':['Align Z','Sejajarkan semua pilihan ke posisi Z objek aktif.'],'Distribute X':['Distribute X','Bagi jarak objek sama rata sepanjang sumbu X (minimal 3).'],
 'Copy Look':['Copy Look','Salin warna dan bahan objek aktif. Alt+C.'],'Paste Look':['Paste Look','Tempel bahan yang disalin ke semua objek terpilih. Alt+V.'],
 'Multi Select (M)':['Multi Select','Mode HP: setiap ketuk menambah atau melepas objek dari pilihan. M.'],'Box Select (B)':['Box Select','Seret kotak di viewport untuk memilih banyak objek. B.'],'Union (Ctrl+G)':['Union','Gabung objek terpilih jadi satu grup. Ctrl+G.'],'Ungroup (Ctrl+Shift+G)':['Ungroup','Pecah grup jadi objek terpisah. Ctrl+Shift+G.'],
 'face':['Face','Pilih sisi block tempat gambar PNG dipasang: All, Front, Back, Up, Down, Right, atau Left. Sisi yang dipilih berkedip.'],'#facec':['Face','Pilih sisi block tempat gambar PNG dipasang.']});
setMode('translate');reset();requestAnimationFrame(loop);
try{const rec=localStorage.getItem('mb_recover');if(rec)ask('A recovery version of your project was found.',['Recover','Discard']).then(r=>{
  if(!r.i){try{loadProject(parseProject(rec));saved=null;refresh();toast('Project recovered.')}catch(e){toast('Failed to load project.','err')}}try{localStorage.removeItem('mb_recover')}catch{}})}catch{}
