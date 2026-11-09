import * as THREE from 'three';
const socket=io();const $=id=>document.getElementById(id);
let state=null,myId=null,scene,camera,renderer,clock,animStarted=false,props=new Map(),entities=new Map(),motion={x:0,z:0},lastSend=0,previous=performance.now(),lastProp=null;
const mapData={
 casa:{floor:0xb6a17d,wall:0xe8d5ac,items:[['sofa',-3,-2,0x6c9980],['table',0,0,0xb78a58],['plant',3,-2,0x4a956c],['bed',-3,2,0xd6a5ae],['cabinet',3,2,0xb47c54]]},
 cozinha:{floor:0xc4c7c0,wall:0xefe5d0,items:[['cabinet',-4,-2,0xc0a076],['fridge',3,-2,0xd6e8e6],['table',0,0,0xa97b4e],['plant',3,2,0x4c985e]]},
 quarto:{floor:0xbda386,wall:0xe9d9c7,items:[['bed',0,0,0x99a9d3],['cabinet',-4,-2,0xb28a68],['plant',3,2,0x519c65],['table',3,-2,0x9b7755]]},
 casa_banho:{floor:0x9ac1c0,wall:0xdbeae6,items:[['bath',0,0,0xe5f5f1],['cabinet',-4,-2,0x9bbaa7],['plant',3,2,0x519c65]]},
 jardim:{floor:0x78a56c,wall:0xaed299,items:[['plant',-4,-2,0x44854d],['plant',3,-2,0x44854d],['table',0,0,0xb8a079],['sofa',-3,2,0xb5c097]]},
 garagem:{floor:0x989c98,wall:0xb9c0bc,items:[['car',0,0,0x5c95b7],['crate',-4,-2,0xb78a52],['cabinet',3,2,0x9a8575]]}
};
const palette=[0x494b49,0xdcac78,0xe5d7c5,0xb98362,0x6b7987,0xeabda8,0x8e9186,0x7a6a61,0xb8afa3,0xdfc8ad];
const material=(color)=>new THREE.MeshStandardMaterial({color,roughness:.88,flatShading:true});
function cube(g,w,h,d,x,y,z,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m}
function sphere(g,r,x,y,z,color,scale){const m=new THREE.Mesh(new THREE.DodecahedronGeometry(r,0),material(color));m.position.set(x,y,z);if(scale)m.scale.set(...scale);m.castShadow=true;g.add(m);return m}
function cylinder(g,top,bottom,h,x,y,z,color,segments=7){const m=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,h,segments),material(color));m.position.set(x,y,z);m.castShadow=true;g.add(m);return m}
function buildCat(color){const g=new THREE.Group();sphere(g,.45,0,.49,.14,color,[1,.76,1.38]);sphere(g,.37,0,.76,-.30,color);for(const x of [-.23,.23]){let ear=new THREE.Mesh(new THREE.ConeGeometry(.16,.37,4),material(color));ear.position.set(x,1.09,-.43);ear.rotation.z=x>0?-.12:.12;g.add(ear);sphere(g,.07,x*.58,.82,-.62,0x1e2827)}for(const x of [-.3,.3])for(const z of [-.23,.43])cube(g,.19,.33,.22,x,.20,z,color);sphere(g,.13,0,.61,-.70,0xe99b98);return g}
// The actual prop meshes: these replace the cat geometry (not just labels or scaling).
function buildProp(kind){const g=new THREE.Group();switch(kind){
 case 'almofada':cube(g,1.12,.27,.85,0,.21,0,0xf0bc84);cube(g,.82,.08,.58,0,.38,0,0xffdeaa);break;
 case 'vaso':cylinder(g,.31,.23,.65,0,.34,0,0xc37b55,8);cylinder(g,.38,.38,.1,0,.68,0,0xb76a4c,8);sphere(g,.45,0,1.03,0,0x4d9863,[1,1.1,1]);break;
 case 'caixa':cube(g,.91,.84,.9,0,.44,0,0xbd9056);cube(g,.96,.08,.25,0,.89,0,0xd5a96f);cube(g,.2,.86,.93,0,.44,0,0xd8af7a);break;
 case 'peluche':sphere(g,.40,0,.53,0,0xc69c7a);sphere(g,.31,0,1.00,-.13,0xc69c7a);sphere(g,.15,-.24,1.21,-.13,0xbd8a6d);sphere(g,.15,.24,1.21,-.13,0xbd8a6d);sphere(g,.13,0,.98,-.40,0x654a3e);break;
 case 'candeeiro':cylinder(g,.30,.35,.12,0,.09,0,0x6d7774);cylinder(g,.055,.055,.85,0,.55,0,0x8e9891);cylinder(g,.26,.48,.51,0,1.20,0,0xf6d58b);break;
 case 'planta':cube(g,.58,.51,.58,0,.28,0,0xc77a4e);cylinder(g,.08,.11,.52,0,.75,0,0x75583e);sphere(g,.48,0,1.14,0,0x42905a);sphere(g,.29,-.3,1.0,.04,0x56a76b);break;
 default:return buildCat(0xe0b19b);
}return g}
function buildFurniture(kind,x,z,color){const g=new THREE.Group();if(kind==='sofa'){cube(g,3.1,.5,1.4,0,.47,0,color);cube(g,3.1,.85,.25,0,.83,.62,color);cube(g,.26,.55,1.4,-1.42,.62,0,color);cube(g,.26,.55,1.4,1.42,.62,0,color)}
 else if(kind==='bed'){cube(g,3.1,.48,2.1,0,.34,0,color);cube(g,3.2,.9,.20,0,.61,1.0,0xa37c69);cube(g,.8,.18,.6,-.7,.68,-.52,0xf3e6da);cube(g,.8,.18,.6,.7,.68,-.52,0xf3e6da)}
 else if(kind==='table'){cube(g,2,.17,1.4,0,.87,0,color);for(const xx of [-.76,.76])for(const zz of [-.49,.49])cube(g,.16,.82,.16,xx,.41,zz,color)}
 else if(kind==='plant'){g.add(buildProp('planta'))}else if(kind==='fridge')cube(g,1.35,2.4,1.1,0,1.2,0,color);
 else if(kind==='cabinet')cube(g,2,1.85,1,0,.925,0,color);
 else if(kind==='bath'){cube(g,3,.75,1.6,0,.42,0,color);cube(g,2.45,.07,1.1,0,.82,0,0x86bdcc)}
 else if(kind==='car'){cube(g,3.4,.66,1.8,0,.55,0,color);cube(g,2.1,.68,1.55,0,1.17,0,0xa6c3c9)}
 else g.add(buildProp('caixa'));
 g.position.set(x,0,z);scene.add(g);
 // Duplicate the camouflaging objects among legitimate scenery so props blend in.
 if(['sofa','bed','table','cabinet','plant'].includes(kind)){const d=buildProp(kind==='plant'?'planta':kind==='sofa'||kind==='bed'?'almofada':'vaso');d.position.set(x+1.7,0,z+1);scene.add(d)}
}
function createWorld(){scene=new THREE.Scene();scene.background=new THREE.Color(0xa8cebc);renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;$('world').appendChild(renderer.domElement);camera=new THREE.OrthographicCamera(-9,9,7,-7,.1,100);camera.position.set(0,18,11);camera.lookAt(0,0,0);scene.add(new THREE.HemisphereLight(0xffffff,0x647f70,2.4));const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(-6,14,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
 const m=mapData[state.map]||mapData.casa;cube(scene,19,.22,15,0,-.18,0,m.floor);for(const [x,z,w,d] of [[0,-7.5,19,.25],[-9.5,0,.25,15],[9.5,0,.25,15],[0,7.5,19,.25]])cube(scene,w,1.6,d,x,.7,z,m.wall);m.items.forEach(it=>buildFurniture(...it));resize();window.addEventListener('resize',resize);clock=new THREE.Clock();controls();if(!animStarted){animStarted=true;requestAnimationFrame(animate)}}
function resize(){if(!renderer)return;const w=$('world').clientWidth,h=$('world').clientHeight;renderer.setSize(w,h);const ratio=w/h;camera.left=-7*ratio;camera.right=7*ratio;camera.top=7;camera.bottom=-7;camera.updateProjectionMatrix()}
function renderPlayer(p){let e=entities.get(p.id);if(!e){e={group:new THREE.Group(),model:null,kind:null};scene.add(e.group);entities.set(p.id,e)}
 const hide=p.found||p.x===null||p.z===null;e.group.visible=!hide;if(hide)return;
 const desired=p.disguised&&p.disguise?'prop:'+p.disguise:'cat:'+p.role+':'+(state.players.findIndex(x=>x.id===p.id)%palette.length);
 if(e.kind!==desired){if(e.model)e.group.remove(e.model);e.model=p.disguised&&p.disguise?buildProp(p.disguise):buildCat(p.role==='seeker'?0xf4c153:palette[state.players.findIndex(x=>x.id===p.id)%palette.length]);e.group.add(e.model);e.kind=desired}
 e.group.position.set(p.x,0,p.z);
}
function applyState(s){state=s;if(s.phase==='lobby'){renderLobby();return}$('lobby').classList.add('hidden');$('game').classList.remove('hidden');if(!scene)createWorld();resize();s.players.forEach(renderPlayer);for(const [id,e] of entities)if(!s.players.some(p=>p.id===id)){scene.remove(e.group);entities.delete(id)};
 const me=s.players.find(p=>p.id===socket.id);if(!me)return;$('role').textContent=me.role==='seeker'?'🔎 DETETIVE':'🐈 GATO';$('count').textContent=`🐈 ${s.players.filter(p=>p.role==='cat'&&p.found).length}/${s.players.filter(p=>p.role==='cat').length}`;
 let hint=s.phase==='hiding'?(me.role==='seeker'?'Espera enquanto os gatos se escondem':'Esconde-te! Tens 20 segundos'):me.role==='seeker'?'Aproxima-te e toca em APANHAR':'Escolhe um objeto 3D para te disfarçares!';if(me.disguised)hint=`Disfarçado como ${me.disguise}! Ficas imóvel até voltares a gato.`;if(me.found)hint='Foste apanhado!';$('hint').textContent=hint;
 const actions=$('actions');actions.className='actions';actions.innerHTML='';if(s.phase==='seeking'&&!me.found){if(me.role==='cat'){
 if(me.disguised){addButton('🐈 VOLTAR','sm',()=>socket.emit('disguise',{object:null}))}else{addButton('🎭 DISFARÇAR','',()=>chooseDisguise())}}
 else addButton('🔎 APANHAR','',()=>{const p=state.players.find(x=>x.id===socket.id);const near=state.players.filter(x=>x.role==='cat'&&!x.found&&x.x!==null).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];if(near&&Math.hypot(near.x-p.x,near.z-p.z)<=1.65)socket.emit('catch',{targetId:near.id});else $('hint').textContent='Aproxima-te de um gato!'})}
 if(s.phase==='ended'){$('result').classList.remove('hidden');$('result').innerHTML=(s.winner==='seeker'?'🏆 O detetive ganhou!':'🐈 Os gatos escaparam!')+'<button id="again">Nova partida</button>';$('again').onclick=()=>socket.emit('startRound',r=>{if(!r.ok)alert(r.error)})}else $('result').classList.add('hidden');
}
function addButton(title,cls,fn){const b=document.createElement('button');b.textContent=title;b.className=cls;b.onclick=fn;$('actions').appendChild(b)}
function chooseDisguise(){const actions=$('actions');actions.innerHTML='';const choices=[['🛋️','almofada'],['🪴','vaso'],['📦','caixa'],['🧸','peluche'],['💡','candeeiro'],['🌿','planta']];const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(3,48px);gap:6px;pointer-events:auto';choices.forEach(([emoji,name])=>{const b=document.createElement('button');b.textContent=emoji;b.title=name;b.style.cssText='width:48px;height:48px';b.onclick=()=>socket.emit('disguise',{object:name});grid.appendChild(b)});actions.appendChild(grid);addButton('✕','sm',()=>applyState(state));$('hint').textContent='Escolhe o objeto em que te queres transformar';}
function controls(){const joy=$('joystick'),stick=$('stick');let tracking=false;function moveStick(e){const box=joy.getBoundingClientRect(),dx=e.clientX-(box.left+box.width/2),dy=e.clientY-(box.top+box.height/2),scale=Math.min(1,39/(Math.hypot(dx,dy)||1));motion={x:dx*scale/39,z:dy*scale/39};stick.style.transform=`translate(${dx*scale}px,${dy*scale}px)`}joy.addEventListener('pointerdown',e=>{tracking=true;joy.setPointerCapture(e.pointerId);moveStick(e)});joy.addEventListener('pointermove',e=>{if(tracking)moveStick(e)});const stop=()=>{tracking=false;motion={x:0,z:0};stick.style.transform='translate(0,0)'};joy.addEventListener('pointerup',stop);joy.addEventListener('pointercancel',stop)}
function animate(now){requestAnimationFrame(animate);if(!scene||!state)return;let dt=Math.min((now-previous)/1000,.05);previous=now;const p=state.players.find(x=>x.id===socket.id);if(p&&p.x!==null&&!p.found&&!(p.disguised&&p.role==='cat')&&!(p.role==='seeker'&&state.phase==='hiding')&&['hiding','seeking'].includes(state.phase)&&Math.hypot(motion.x,motion.z)>.05){p.x=THREE.MathUtils.clamp(p.x+motion.x*4.5*dt,-8.8,8.8);p.z=THREE.MathUtils.clamp(p.z+motion.z*4.5*dt,-6.8,6.8);renderPlayer(p);if(now-lastSend>65){lastSend=now;socket.emit('move',{x:p.x,z:p.z})}}
 if(p&&p.x!==null){const pos=camera.position,desiredX=p.x,desiredZ=p.z+11;pos.x+=(desiredX-pos.x)*.04;pos.z+=(desiredZ-pos.z)*.04;camera.lookAt(p.x,0,p.z)}if(state.endsAt){const secs=Math.max(0,Math.ceil((state.endsAt-Date.now())/1000));$('timer').textContent=`${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`}renderer.render(scene,camera)}
function renderLobby(){if(!state||state.phase!=='lobby')return;$('playerList').replaceChildren(...state.players.map(p=>{let el=document.createElement('div');el.textContent='🐾 '+p.name;return el}));$('start').disabled=state.players.length<2}
function setRoom(r){state=r;$('roomLabel').textContent='SALA '+r.code;$('codeOut').textContent=r.code;$('menu').classList.add('hidden');$('lobby').classList.remove('hidden');renderLobby()}
$('create').onclick=()=>socket.emit('createRoom',{name:$('name').value,map:$('map').value},r=>r.ok?setRoom(r.state):$('error').textContent=r.error);
$('join').onclick=()=>socket.emit('joinRoom',{name:$('name').value,code:$('code').value},r=>r.ok?setRoom(r.state):$('error').textContent=r.error);
$('start').onclick=()=>socket.emit('startRound',r=>{if(!r.ok)alert(r.error)});
$('copy').onclick=()=>navigator.clipboard?.writeText(state?.code||'');
socket.on('state',s=>{if(!state)return;applyState(s)});
socket.on('playerMoved',p=>{if(!state||p.id===socket.id)return;const old=state.players.find(x=>x.id===p.id);if(old){old.x=p.x;old.z=p.z;renderPlayer(old)}});
