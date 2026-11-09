const express=require('express'),http=require('http'),crypto=require('crypto');
const {Server}=require('socket.io');const app=express(),server=http.createServer(app),io=new Server(server);
app.use(express.static('public'));const rooms=new Map();
const MAPS=['casa','cozinha','quarto','casa_banho','jardim','garagem'];
const PROPS=['almofada','vaso','caixa','peluche','candeeiro','planta'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function newCode(){let c;do{c=crypto.randomBytes(3).toString('hex').toUpperCase()}while(rooms.has(c));return c}
function snapshot(r,viewer){const myself=r.players.get(viewer);return {code:r.code,map:r.map,phase:r.phase,endsAt:r.endsAt,winner:r.winner||null,seekerId:r.seekerId,players:[...r.players.values()].map(p=>({id:p.id,name:p.name,role:p.role,found:p.found,disguised:p.disguised,disguise:p.disguise,x:r.phase==='hiding'&&myself?.role==='seeker'&&p.role==='cat'?null:p.x,z:r.phase==='hiding'&&myself?.role==='seeker'&&p.role==='cat'?null:p.z}))}}
function broadcast(r){for(const p of r.players.values())io.to(p.id).emit('state',snapshot(r,p.id))}
function getRoom(s){return rooms.get(s.data.roomCode)}
function finish(r,w){if(!['hiding','seeking'].includes(r.phase))return;r.phase='ended';r.winner=w;r.endsAt=0;broadcast(r)}
function start(r){if(r.players.size<2)return false;const ps=[...r.players.values()],s=ps[Math.floor(Math.random()*ps.length)];r.seekerId=s.id;r.phase='hiding';r.winner=null;r.endsAt=Date.now()+20000;
  ps.forEach((p,i)=>{p.role=p.id===s.id?'seeker':'cat';p.x=p.role==='seeker'?0:(i%5-2)*1.3;p.z=p.role==='seeker'?5:-2-Math.floor(i/5)*1.5;p.disguised=false;p.disguise=null;p.found=false;p.lastMove=Date.now()});broadcast(r);
  setTimeout(()=>{if(rooms.get(r.code)!==r||r.phase!=='hiding')return;r.phase='seeking';r.endsAt=Date.now()+120000;broadcast(r)},20000);return true}
io.on('connection',socket=>{
  const add=(r,name)=>{const p={id:socket.id,name:String(name||'Gato').trim().slice(0,18)||'Gato',role:'waiting',x:0,z:0,disguised:false,disguise:null,found:false,lastMove:Date.now()};r.players.set(socket.id,p);socket.join(r.code);socket.data.roomCode=r.code;broadcast(r)};
  socket.on('createRoom',(data={},cb=()=>{})=>{if(getRoom(socket))return cb({ok:false,error:'Já estás numa sala.'});const c=newCode(),r={code:c,map:MAPS.includes(data.map)?data.map:'casa',players:new Map(),phase:'lobby',seekerId:null,endsAt:0};rooms.set(c,r);add(r,data.name);cb({ok:true,state:snapshot(r,socket.id)})});
  socket.on('joinRoom',(data={},cb=()=>{})=>{if(getRoom(socket))return cb({ok:false,error:'Já estás numa sala.'});const r=rooms.get(String(data.code||'').trim().toUpperCase());if(!r)return cb({ok:false,error:'Código inválido.'});if(r.phase!=='lobby')return cb({ok:false,error:'Esta partida já começou.'});if(r.players.size>=10)return cb({ok:false,error:'Sala cheia.'});add(r,data.name);cb({ok:true,state:snapshot(r,socket.id)})});
  socket.on('startRound',(cb=()=>{})=>{const r=getRoom(socket);if(!r||!['lobby','ended'].includes(r.phase)||r.players.size<2)return cb({ok:false,error:'São necessários pelo menos dois jogadores e uma sala livre.'});start(r);cb({ok:true})});
  socket.on('move',(raw={})=>{const r=getRoom(socket),p=r?.players.get(socket.id);if(!p||!['hiding','seeking'].includes(r.phase)||p.found||(p.role==='seeker'&&r.phase==='hiding'))return;const x=Number(raw.x),z=Number(raw.z);if(!Number.isFinite(x)||!Number.isFinite(z))return;
    const now=Date.now(),dt=clamp((now-p.lastMove)/1000,0,0.15),speed=p.disguised?0:4.5,maxDist=speed*dt+0.12,dx=x-p.x,dz=z-p.z,dist=Math.hypot(dx,dz),scale=dist>maxDist&&dist>0?maxDist/dist:1;p.x=clamp(p.x+dx*scale,-8.8,8.8);p.z=clamp(p.z+dz*scale,-6.8,6.8);p.lastMove=now;
    if(r.phase==='hiding')for(const v of r.players.values()){if(v.role==='cat'&&v.id!==p.id)io.to(v.id).volatile.emit('playerMoved',{id:p.id,x:p.x,z:p.z})}
    else socket.to(r.code).volatile.emit('playerMoved',{id:p.id,x:p.x,z:p.z});
  });
  socket.on('disguise',(data={})=>{const r=getRoom(socket),p=r?.players.get(socket.id);if(!r||!p||p.role!=='cat'||p.found||r.phase!=='seeking')return;const kind=data.object;
    if(kind===null){p.disguised=false;p.disguise=null}else if(PROPS.includes(kind)){p.disguised=true;p.disguise=kind}else return;broadcast(r)});
  socket.on('catch',(data={})=>{const r=getRoom(socket),seeker=r?.players.get(socket.id),target=r?.players.get(data.targetId);if(!r||r.phase!=='seeking'||seeker?.role!=='seeker'||!target||target.role!=='cat'||target.found)return;
    if(Math.hypot(seeker.x-target.x,seeker.z-target.z)>1.65)return;target.found=true;target.disguised=false;target.disguise=null;if([...r.players.values()].every(p=>p.role!=='cat'||p.found))finish(r,'seeker');else broadcast(r)});
  socket.on('disconnect',()=>{const r=getRoom(socket);if(!r)return;r.players.delete(socket.id);if(!r.players.size){rooms.delete(r.code);return}if(r.seekerId===socket.id&&['hiding','seeking'].includes(r.phase))finish(r,'cats');else if(r.phase==='seeking'&&[...r.players.values()].every(p=>p.role!=='cat'||p.found))finish(r,'seeker');else broadcast(r)});
});
setInterval(()=>{for(const r of rooms.values())if(r.phase==='seeking'&&Date.now()>=r.endsAt)finish(r,'cats')},500);
server.listen(process.env.PORT||3000,()=>console.log('CAT HUNT disponível na porta',process.env.PORT||3000));
