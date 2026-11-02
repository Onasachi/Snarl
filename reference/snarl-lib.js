(function(){
const E=s=>s.trim().split(/\s+/).map(p=>p.split('-').map(Number));
const NOTES=[261.63,293.66,329.63,392.0,440.0,523.25,587.33,659.25,783.99,880.0,1046.5];
const THEMES={
 night:{id:'night',name:'Night pond',bg:'#0d1527',bg2:'#152039',water:'#0f1d38',card:'rgba(232,237,246,0.07)',cardLine:'rgba(232,237,246,0.12)',ink:'#e8edf6',ink2:'#97a5c3',tangled:'#58678b',string:'#7290bd',warm:'oklch(0.80 0.15 65)',eye:'#0d1527',moon:'#f3ecd0',L:0.80,C:0.13,tL:0.91,tC:0.05},
 paper:{id:'paper',name:'Paper',bg:'#f3efe6',bg2:'#fbf8f2',water:'#e8e1d2',card:'rgba(28,35,51,0.05)',cardLine:'rgba(28,35,51,0.12)',ink:'#1c2333',ink2:'#5b6476',tangled:'#9ea6b8',string:'#8291b0',warm:'oklch(0.68 0.16 55)',eye:'#1c2333',moon:'#cdb978',L:0.68,C:0.14,tL:0.80,tC:0.09}
};
const th=t=>THEMES[t]||THEMES.night;
const color=(c,t)=>{const T=th(t);return `oklch(${T.L} ${c.chroma!=null?c.chroma:T.C} ${c.hue})`;};
const tint=(c,t)=>{const T=th(t);return `oklch(${T.tL} ${T.tC} ${c.hue})`;};

const CREATURES=[
 {id:'pip',name:'Pip',shape:'Small fish',hue:200,idle:'Swims in slow loops',tap:'Darts away, comes back',sound:'bubble',move:'swim',target:[3,4],par:3,lore:'Swims in circles on purpose. Mostly.',
  nodes:[[80,50],[55,33],[55,67],[38,50],[18,33],[18,67]],edges:E('0-1 0-2 1-2 1-3 2-3 3-4 3-5 4-5'),eye:0},
 {id:'dot',name:'Dot',shape:'Ladybird',hue:10,idle:'Crawls along the pond edge',tap:'Opens wings briefly',sound:'click',move:'walk',target:[4,5],par:4,lore:'Has seven spots and an opinion about each one.',
  nodes:[[50,20],[28,42],[72,42],[25,68],[75,68],[50,84],[50,56]],edges:E('0-1 0-2 1-3 2-4 3-5 4-5 1-6 2-6 6-5 0-6'),eye:0},
 {id:'flick',name:'Flick',shape:'Tadpole',hue:165,idle:'Wiggles tail',tap:'Spins once',sound:'bubble',move:'swim',target:[4,6],par:4,lore:'Will be a frog someday. Not today.',
  nodes:[[24,50],[38,34],[38,66],[52,50],[64,44],[75,56],[86,44],[96,54]],edges:E('0-1 0-2 1-2 1-3 2-3 3-4 4-5 5-6 6-7'),eye:0},
 {id:'mothy',name:'Mothy',shape:'Moth',hue:315,idle:'Flutters near the top',tap:'Flies to the finger',sound:'flutter',move:'bob',target:[6,8],par:6,lore:'Thinks every lantern is the moon.',
  nodes:[[50,22],[50,46],[50,70],[18,18],[12,48],[82,18],[88,48],[26,76],[74,76],[50,88]],edges:E('0-1 1-2 2-9 0-3 3-4 4-1 0-5 5-6 6-1 1-7 7-2 1-8 8-2 4-7 6-8'),eye:0},
 {id:'clack',name:'Clack',shape:'Crab',hue:30,idle:'Walks sideways',tap:'Snaps claws',sound:'click',move:'walk',target:[7,9],par:7,lore:'Walks sideways to avoid awkward conversations.',
  nodes:[[50,36],[32,44],[68,44],[36,62],[64,62],[50,68],[22,22],[8,36],[78,22],[92,36],[18,74],[82,74]],edges:E('0-1 0-2 1-2 1-3 2-4 3-5 4-5 1-6 1-7 6-7 2-8 2-9 8-9 3-10 4-11'),eye:0},
 {id:'jelly',name:'Jelly',shape:'Jellyfish',hue:345,idle:'Pulses up and down',tap:'Glows brighter',sound:'hum',move:'bob',target:[8,10],par:8,lore:'Ninety-five percent water, five percent drama.',
  nodes:[[50,18],[30,26],[70,26],[18,44],[82,44],[34,48],[50,50],[66,48],[30,66],[24,86],[50,70],[52,90],[70,66],[76,86]],edges:E('0-1 0-2 1-3 2-4 3-5 5-6 6-7 7-4 0-6 5-8 8-9 6-10 10-11 7-12 12-13'),eye:0},
 {id:'lilo',name:'Lilo',shape:'Frog',hue:135,idle:'Sits on a leaf',tap:'Jumps',sound:'croak',move:'sit',target:[9,12],par:9,lore:'Has sat on the same leaf since Tuesday.',
  nodes:[[50,30],[34,22],[66,22],[30,44],[70,44],[28,64],[72,64],[50,72],[50,12],[14,80],[30,86],[86,80],[70,86],[40,88],[60,88],[50,52]],edges:E('0-8 0-1 0-2 1-3 2-4 3-5 4-6 5-7 6-7 0-15 15-7 15-3 15-4 5-9 9-10 10-5 6-11 11-12 12-6 7-13 7-14'),eye:0},
 {id:'wren',name:'Wren',shape:'Small bird',hue:262,idle:'Hops on the pond edge',tap:'Sings two notes',sound:'chirp',move:'walk',target:[10,13],par:10,lore:'Knows two notes and uses both.',
  nodes:[[70,26],[86,30],[60,38],[45,40],[30,46],[40,62],[58,60],[70,46],[14,40],[10,54],[44,50],[45,74],[42,88],[56,74],[58,88],[68,14],[30,30],[48,28]],edges:E('0-1 0-15 0-2 0-7 2-7 2-3 3-4 4-8 4-9 8-9 4-5 5-6 6-7 3-10 10-6 3-16 16-17 17-2 5-11 11-12 6-13 13-14'),eye:0},
 {id:'shelby',name:'Shelby',shape:'Turtle',hue:105,idle:'Drifts slowly',tap:'Hides in shell',sound:'hum',move:'swim',target:[12,15],par:12,lore:'Arrives late, but always arrives.',
  nodes:[[50,10],[50,24],[34,30],[66,30],[80,50],[66,70],[34,70],[20,50],[50,50],[18,24],[82,24],[20,78],[80,78],[50,86],[42,40],[58,40],[62,55],[50,62],[38,55],[10,88]],edges:E('0-1 1-2 1-3 3-4 4-5 5-6 6-7 7-2 14-15 15-16 16-17 17-18 18-14 2-14 3-15 4-16 5-16 6-17 7-18 8-14 8-15 8-16 8-17 8-18 2-9 3-10 6-11 5-12 11-19 5-13 6-13'),eye:0},
 {id:'ollie',name:'Ollie',shape:'Octopus',hue:285,idle:'Waves arms',tap:'Squirts a tiny ink puff',sound:'bubble',move:'bob',target:[14,18],par:14,lore:'Could untangle itself. Chose not to.',
  nodes:[[50,30],[34,16],[66,16],[24,32],[76,32],[28,52],[72,52],[50,56],[18,66],[10,84],[40,58],[60,58],[34,74],[28,90],[66,74],[72,90],[82,66],[90,84],[50,74],[50,92],[40,42],[60,42],[50,6],[12,46]],edges:E('0-1 0-2 1-22 22-2 1-3 2-4 3-23 23-5 3-5 4-6 5-10 10-7 7-11 11-6 0-20 0-21 20-21 20-10 21-11 5-8 8-9 10-12 12-13 11-14 14-15 6-16 16-17 7-18 18-19'),eye:0}
];
const TUTORIAL=[
 {id:'bub',name:'Bub',shape:'Water bug',hue:190,sound:'bubble',move:'swim',par:1,lore:'Has never once been in a hurry.',
  nodes:[[30,35],[70,35],[70,68],[30,68]],edges:E('0-1 1-2 2-3 3-0'),eye:0,scrambled:[[24,30],[76,72],[76,30],[24,72]]},
 {id:'nib',name:'Nib',shape:'Beetle',hue:140,sound:'click',move:'walk',par:2,target:[2,2],lore:'Small, round and absolutely sure of itself.',
  nodes:[[50,22],[78,44],[66,78],[34,78],[22,44]],edges:E('0-1 1-2 2-3 3-4 4-0'),eye:0}
];
const RARE={id:'moonmoth',name:'Moon Moth',shape:'Moth · rare',hue:250,chroma:0.07,rare:true,sound:'hum',move:'bob',target:[8,10],par:8,lore:'Only comes out when the pond is quiet.',
 nodes:[[50,22],[50,46],[50,70],[18,18],[12,48],[82,18],[88,48],[26,76],[74,76],[50,86],[38,94],[62,94]],edges:E('0-1 1-2 2-9 0-3 3-4 4-1 0-5 5-6 6-1 1-7 7-2 1-8 8-2 4-7 6-8 9-10 9-11'),eye:0};

function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function inter(a,b,c,d){const d1x=b[0]-a[0],d1y=b[1]-a[1],d2x=d[0]-c[0],d2y=d[1]-c[1];const den=d1x*d2y-d1y*d2x;if(Math.abs(den)<1e-9)return null;
 const t=((c[0]-a[0])*d2y-(c[1]-a[1])*d2x)/den,u=((c[0]-a[0])*d1y-(c[1]-a[1])*d1x)/den;
 return(t>1e-6&&t<1-1e-6&&u>1e-6&&u<1-1e-6)?[a[0]+t*d1x,a[1]+t*d1y]:null;}
const share=(e,f)=>e[0]===f[0]||e[0]===f[1]||e[1]===f[0]||e[1]===f[1];
function crossings(pos,edges){const out=[];for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){const e=edges[i],f=edges[j];if(share(e,f))continue;const p=inter(pos[e[0]],pos[e[1]],pos[f[0]],pos[f[1]]);if(p)out.push({i,j,x:p[0],y:p[1]});}return out;}
function countFor(n,pos,edges){let k=0;for(const e of edges){if(e[0]!==n&&e[1]!==n)continue;for(const f of edges){if(f===e||share(e,f))continue;if(inter(pos[e[0]],pos[e[1]],pos[f[0]],pos[f[1]]))k++;}}return k;}
function fit(nodes,pad){pad=pad==null?10:pad;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const[x,y]of nodes){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 const w=Math.max(1,x1-x0),h=Math.max(1,y1-y0),s=(100-2*pad)/Math.max(w,h),ox=(100-w*s)/2,oy=(100-h*s)/2;return nodes.map(([x,y])=>[ox+(x-x0)*s,oy+(y-y0)*s]);}
function scramble(c,seed,pad){pad=pad==null?10:pad;if(c.scrambled)return c.scrambled.map(p=>p.slice());const home=fit(c.nodes,pad),n=home.length,t=c.target||[2,3];let best=null,bd=1e9;
 for(let a=0;a<500;a++){const r=rng((seed|0)*7919+a*31+1);let p=home.map(q=>q.slice());const sw=Math.max(1,Math.round(n*0.3+r()*n*0.4));
  for(let s=0;s<sw;s++){const i=Math.floor(r()*n),j=Math.floor(r()*n);const tmp=p[i];p[i]=p[j];p[j]=tmp;}
  const ang=r()*Math.PI*2,ca=Math.cos(ang),sa=Math.sin(ang);
  p=p.map(q=>{const x=q[0]-50,y=q[1]-50;return[clamp(50+x*ca-y*sa+(r()-.5)*12,pad,100-pad),clamp(50+x*sa+y*ca+(r()-.5)*12,pad,100-pad)];});
  const k=crossings(p,c.edges).length;if(k>=t[0]&&k<=t[1])return p;const d=k<t[0]?(t[0]-k)*3:k-t[1];if(k>0&&d<bd){bd=d;best=p;}}
 return best;}
function nudge(pos,edges){let best=null;for(let i=0;i<pos.length;i++){const base=countFor(i,pos,edges);if(!base)continue;
  for(let gx=8;gx<=92;gx+=6)for(let gy=8;gy<=92;gy+=6){if(pos.some((q,j)=>j!==i&&Math.hypot(q[0]-gx,q[1]-gy)<6))continue;const p2=pos.slice();p2[i]=[gx,gy];const g=base-countFor(i,p2,edges);const d=Math.hypot(pos[i][0]-gx,pos[i][1]-gy);
   if(g>0&&(!best||g>best.gain||(g===best.gain&&d<best.d)))best={i,to:[gx,gy],gain:g,d};}}
 if(!best){let mi=0,mc=-1;pos.forEach((_,i)=>{const k=countFor(i,pos,edges);if(k>mc){mc=k;mi=i;}});const nb=edges.filter(e=>e[0]===mi||e[1]===mi).map(e=>pos[e[0]===mi?e[1]:e[0]]);
  best={i:mi,to:[nb.reduce((s,q)=>s+q[0],0)/Math.max(1,nb.length),nb.reduce((s,q)=>s+q[1],0)/Math.max(1,nb.length)],gain:0};}
 return best;}

function svg(h,c,o){o=o||{};const tn=o.theme==='paper'?'paper':'night',T=THEMES[tn];const pos=o.pos||fit(c.nodes,o.pad!=null?o.pad:10);
 const free=o.state==='free',cr=o.cross||[],hot=new Set();cr.forEach(x=>{hot.add(x.i);hot.add(x.j);});
 const r=o.r||3.1,sw=o.sw||1,C=color(c,tn),Ti=tint(c,tn),anim=!o.static&&!o.reduce,K=[];
 const sil=o.state==='silhouette';
 c.edges.forEach((e,k)=>{const a=pos[e[0]],b=pos[e[1]],isHot=!free&&hot.has(k);
  K.push(h('line',{key:'e'+k,x1:a[0],y1:a[1],x2:b[0],y2:b[1],strokeLinecap:'round',style:{stroke:free?Ti:isHot?T.warm:sil?T.tangled:T.string,strokeWidth:isHot?sw*1.5:sw,opacity:(o.calm&&!isHot&&!free)?0.16:0.9,transition:'stroke 1s ease, opacity .3s, stroke-width .2s'}}));});
 if(o.nudge){const a=pos[o.nudge.i],b=o.nudge.to;K.push(h('line',{key:'nl',x1:a[0],y1:a[1],x2:b[0],y2:b[1],strokeLinecap:'round',style:{stroke:T.ink,strokeWidth:sw*.55,strokeDasharray:'0.1 2.2',opacity:.7}}));
  K.push(h('circle',{key:'ng',cx:b[0],cy:b[1],r:r*1.05,style:{fill:'none',stroke:T.ink,strokeWidth:sw*.5,strokeDasharray:'1 1',opacity:.85}}));}
 if(!free&&!sil&&o.rings!==false)cr.forEach(x=>K.push(h('circle',{key:'x'+x.i+'_'+x.j,cx:x.x,cy:x.y,r:r*.62,style:{fill:T.bg,stroke:T.warm,strokeWidth:sw*.55,transformBox:'fill-box',transformOrigin:'center',animation:anim?'snPulse 1.8s ease-in-out infinite':'none'}})));
 (o.sparkles||[]).forEach(s=>K.push(h('circle',{key:'s'+s.id,cx:s.x,cy:s.y,r:r*.8,style:{fill:'none',stroke:T.ink,strokeWidth:sw*.5,transformBox:'fill-box',transformOrigin:'center',animation:'snSpark .7s ease-out forwards'}})));
 pos.forEach((p,i)=>{const isEye=i===c.eye,R=isEye?r*1.32:r,lifted=o.drag===i,nud=o.nudge&&o.nudge.i===i,parts=[];
  if(lifted)parts.push(h('circle',{key:'sh',cx:.5,cy:1.6,r:R*1.05,style:{fill:'#000',opacity:.22}}));
  if(nud)parts.push(h('circle',{key:'nr',r:R*1.9,style:{fill:'none',stroke:T.ink,strokeWidth:sw*.55,transformBox:'fill-box',transformOrigin:'center',animation:anim?'snPulse 1s ease-in-out infinite':'none'}}));
  const body=[h('circle',{key:'b',r:R,style:{fill:free?C:T.tangled,transition:'fill 1.1s ease'}}),h('circle',{key:'hl',cx:-R*.32,cy:-R*.36,r:R*.32,style:{fill:'#fff',opacity:free?.42:.16,transition:'opacity 1s'}})];
  if(isEye&&!sil){const ey=o.eyes||(free?'open':'shut');[-1,1].forEach(s=>{const ex=s*R*.4,eyy=R*.04,open=ey==='open'||(ey==='one'&&s<0);
   body.push(open?h('circle',{key:'e'+s,cx:ex,cy:eyy,r:R*.2,style:{fill:T.eye}}):h('line',{key:'e'+s,x1:ex-R*.17,y1:eyy,x2:ex+R*.17,y2:eyy,strokeLinecap:'round',style:{stroke:T.eye,strokeWidth:R*.14}}));});}
  parts.push(h('g',{key:'bd'+(o.dropped===i?o.dropKey||'':''),style:{transformBox:'fill-box',transformOrigin:'center',transform:lifted?'scale(1.15)':'scale(1)',transition:'transform .18s cubic-bezier(.3,1.6,.5,1)',animation:o.dropped===i&&anim?'snDrop .38s ease-out':'none'}},
   h('g',{style:{transformBox:'fill-box',transformOrigin:'center',animation:anim&&!lifted?`snBreathe 2.2s ease-in-out ${(-i*.17).toFixed(2)}s infinite`:'none'}},body)));
  if(o.onBeadDown)parts.push(h('circle',{key:'hit',r:o.hit||6.5,style:{fill:'transparent',cursor:lifted?'grabbing':'grab'},onPointerDown:e=>o.onBeadDown(i,e)}));
  K.push(h('g',{key:'n'+i,transform:`translate(${p[0].toFixed(2)} ${p[1].toFixed(2)})`},parts));});
 if(o.hand){const a=o.hand.from,b=o.hand.to,v=(u,w)=>`${u};${u};${w};${w}`,kt='0;0.2;0.75;1';
  const an=(attr,u,w)=>h('animate',{key:attr,attributeName:attr,values:v(u,w),keyTimes:kt,dur:'2.4s',repeatCount:'indefinite'});
  K.push(h('g',{key:'hand',style:{pointerEvents:'none'}},h('circle',{cx:a[0],cy:a[1],r:5,style:{fill:T.ink,opacity:.18}},an('cx',a[0],b[0]),an('cy',a[1],b[1])),h('circle',{cx:a[0],cy:a[1],r:2.2,style:{fill:T.ink,opacity:.85}},an('cx',a[0],b[0]),an('cy',a[1],b[1]))));}
 const shiver=anim&&!free&&!sil&&o.shiver!==false?`snShiver ${o.slowShiver?1.6:.42}s ease-in-out infinite`:'none';
 return h('svg',Object.assign({viewBox:'0 0 100 100',style:Object.assign({display:'block',width:'100%',height:'100%',overflow:'visible',touchAction:'none'},o.style||{})},o.svgProps||{}),h('g',{style:{animation:shiver}},K));}

const Audio={ctx:null,on:true,last:{},
 init(){try{if(!this.ctx){const A=window.AudioContext||window.webkitAudioContext;this.ctx=new A();this.master=this.ctx.createGain();this.master.gain.value=0.55;const lp=this.ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3400;this.master.connect(lp);lp.connect(this.ctx.destination);}if(this.ctx.state==='suspended')this.ctx.resume();}catch(e){}},
 gate(k,ms){const n=performance.now();if(this.last[k]&&n-this.last[k]<ms)return false;this.last[k]=n;return true;},
 tone(f,o){o=o||{};if(!this.on||!this.ctx)return;const c=this.ctx,now=c.currentTime+(o.t||0),d=o.d||0.8,g=o.g||0.2;const osc=c.createOscillator(),v=c.createGain();osc.type=o.type||'sine';osc.frequency.setValueAtTime(f,now);if(o.glide)osc.frequency.exponentialRampToValueAtTime(o.glide,now+d*0.6);
  v.gain.setValueAtTime(0.0001,now);v.gain.exponentialRampToValueAtTime(g,now+(o.a||0.006));v.gain.exponentialRampToValueAtTime(0.0001,now+d);osc.connect(v);v.connect(this.master);osc.start(now);osc.stop(now+d+0.05);},
 pluck(i){if(!this.gate('pl',70))return;const f=NOTES[((i%NOTES.length)+NOTES.length)%NOTES.length];this.tone(f,{type:'triangle',d:1.2,g:0.2});this.tone(f*2,{d:0.5,g:0.05});},
 mute(){if(!this.gate('mu',120))return;this.tone(146.8,{type:'triangle',d:0.22,g:0.1});},
 tick(){this.tone(1500,{d:0.05,g:0.04});},
 drop(){this.tone(640,{d:0.09,g:0.035});},
 chord(){[0,2,4,7].forEach((n,k)=>this.tone(NOTES[n],{type:'triangle',t:k*0.09,d:1.8,g:0.13}));},
 chime(){this.tone(NOTES[7],{d:1.4,g:0.08});this.tone(NOTES[9],{t:0.1,d:1.4,g:0.07});},
 coin(){this.tone(NOTES[5],{d:0.5,g:0.08});this.tone(NOTES[8],{t:0.08,d:0.9,g:0.08});},
 creature(kind){switch(kind){
  case'bubble':this.tone(300,{glide:900,d:0.24,g:0.16});this.tone(420,{t:0.14,glide:1150,d:0.2,g:0.11});break;
  case'chirp':this.tone(1800,{glide:2600,d:0.12,g:0.07});this.tone(2100,{t:0.15,glide:3000,d:0.12,g:0.07});break;
  case'click':[0,0.07,0.14].forEach(t=>this.tone(2300,{type:'square',t,d:0.03,g:0.025}));break;
  case'flutter':for(let k=0;k<6;k++)this.tone(880+k*45,{t:k*0.05,d:0.05,g:0.04});break;
  case'croak':this.tone(150,{type:'sawtooth',glide:105,d:0.3,g:0.05});break;
  default:this.tone(196,{glide:262,d:0.9,g:0.13});}}
};
const buzz=ms=>{try{navigator.vibrate&&navigator.vibrate(ms);}catch(e){}};
window.SnarlLib={THEMES,CREATURES,TUTORIAL,RARE,NOTES,color,tint,rng,crossings,countFor,fit,scramble,nudge,svg,Audio,buzz};
})();
