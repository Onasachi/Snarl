
class Component extends DCLogic {
  state = { ready:false, screen:'splash', tut:0, cur:null, mode:'tut', pos:[], home:[], moves:0, hist:[], drag:-1, phase:'play', calm:false, nudge:null, nudges:3, sparkles:[], card:false, freed:[], intro:false, verified:false, claimed:false, dailyDone:false, moon:0, sheet:null, toast:null, playIdx:1, react:{}, dropped:-1, dropKey:0, splashPos:null, splashFree:false, splashDone:false, hand:null, balance:0, plays:0 };
  componentDidMount(){ const w=()=>{ if(window.SnarlLib){ this.L=window.SnarlLib; this.setState({ready:true}); this.boot(); } else this.t0=setTimeout(w,40); }; w(); }
  componentWillUnmount(){ cancelAnimationFrame(this.raf); clearTimeout(this.t0); (this.timers||[]).forEach(clearTimeout); }
  later(fn,ms){ (this.timers=this.timers||[]).push(setTimeout(fn,ms)); }
  get reduce(){ return !!this.props.reduceMotion; }
  boot(){
    const L=this.L, s=this.props.startAt||'splash';
    if(s==='pond'){ this.setState({screen:'pond',freed:[L.TUTORIAL[0],L.TUTORIAL[1],L.CREATURES[0]].map((c,k)=>({c,k:'f'+k}))}); }
    else if(s==='puzzle'){ this.startTut(0); }
    else this.splash();
  }
  splash(){
    const L=this.L,c=L.TUTORIAL[0];
    this.setState({screen:'splash',splashPos:c.scrambled.map(p=>p.slice()),splashFree:false,splashDone:false});
    this.later(()=>this.animate(c.scrambled,L.fit(c.nodes,12),1300,p=>this.setState({splashPos:p}),()=>{ this.setState({splashFree:true}); this.later(()=>this.setState({splashDone:true}),500); }),700);
  }
  animate(from,to,dur,set,done){
    cancelAnimationFrame(this.raf);
    if(this.reduce||dur<=0){ set(to.map(p=>p.slice())); done&&done(); return; }
    const t0=performance.now(), ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    const step=now=>{ const t=Math.min(1,(now-t0)/dur),e=ease(t); set(from.map((p,i)=>[p[0]+(to[i][0]-p[0])*e,p[1]+(to[i][1]-p[1])*e])); if(t<1) this.raf=requestAnimationFrame(step); else done&&done(); };
    this.raf=requestAnimationFrame(step);
  }
  begin=()=>{ this.L.Audio.init(); this.L.Audio.chime(); this.startTut(0); };
  startTut(i){ const L=this.L; const c=i<2?L.TUTORIAL[i]:L.CREATURES[0]; this.setState({tut:i}); this.startPuzzle(c,'tut',i); }
  startPuzzle(c,mode,seed){
    const L=this.L, home=L.fit(c.nodes,12), pos=L.scramble(c,(seed||0)+c.id.length*13+(this.state.plays||0)*7,12);
    const cr=L.crossings(pos,c.edges);
    this.prevKeys=new Set(cr.map(x=>x.i+'_'+x.j)); this.prevCross=cr; this.note=2;
    let hand=null; if(mode==='tut'&&seed===0){ const n=L.nudge(pos,c.edges); hand={from:pos[n.i],to:n.to}; }
    this.setState({screen:'puzzle',cur:c,mode,pos,home,moves:0,hist:[],drag:-1,phase:'play',calm:false,nudge:null,card:false,sparkles:[],hand,sheet:null});
  }
  pt(e){ const r=this.svgEl.getBoundingClientRect(); return [Math.max(4,Math.min(96,(e.clientX-r.left)/r.width*100)),Math.max(4,Math.min(96,(e.clientY-r.top)/r.height*100))]; }
  onDown=(i,e)=>{
    if(this.state.phase!=='play') return; e.preventDefault(); this.L.Audio.init();
    try{ this.svgEl.setPointerCapture(e.pointerId); }catch(_){}
    this.dragStart=this.state.pos.map(p=>p.slice());
    const p=this.pt(e); this.grabOff=[this.state.pos[i][0]-p[0],this.state.pos[i][1]-p[1]];
    this.L.Audio.tick(); this.L.buzz(8); this.setState({drag:i,nudge:null,hand:null});
  };
  onMove=e=>{
    const i=this.state.drag; if(i<0) return; const L=this.L,c=this.state.cur;
    const p=this.pt(e), pos=this.state.pos.slice(); pos[i]=[Math.max(4,Math.min(96,p[0]+this.grabOff[0])),Math.max(4,Math.min(96,p[1]+this.grabOff[1]))];
    const cr=L.crossings(pos,c.edges), keys=new Set(cr.map(x=>x.i+'_'+x.j));
    const gone=this.prevCross.filter(x=>!keys.has(x.i+'_'+x.j)), born=cr.filter(x=>!this.prevKeys.has(x.i+'_'+x.j));
    let sparkles=this.state.sparkles;
    if(gone.length){ this.note=Math.min(10,Math.max(0,this.note+(Math.random()<.7?1:2))); if(this.note>=10) this.note=3; L.Audio.pluck(this.note); L.buzz(10);
      const add=gone.slice(0,3).map(x=>({id:Math.random().toString(36).slice(2),x:x.x,y:x.y})); sparkles=sparkles.concat(add);
      add.forEach(s=>this.later(()=>this.setState(st=>({sparkles:st.sparkles.filter(q=>q.id!==s.id)})),750)); }
    if(born.length) L.Audio.mute();
    this.prevKeys=keys; this.prevCross=cr;
    this.setState({pos,sparkles});
  };
  onUp=()=>{
    const i=this.state.drag; if(i<0) return; const L=this.L,c=this.state.cur;
    const a=this.dragStart[i],b=this.state.pos[i], moved=Math.hypot(a[0]-b[0],a[1]-b[1])>0.8;
    L.Audio.drop();
    this.setState(st=>({drag:-1,dropped:i,dropKey:st.dropKey+1,moves:moved?st.moves+1:st.moves,hist:moved?st.hist.concat([this.dragStart]):st.hist}));
    if(L.crossings(this.state.pos,c.edges).length===0) this.solve();
  };
  solve(){
    const L=this.L,c=this.state.cur;
    this.setState({phase:'inhale'});
    this.later(()=>{ L.Audio.chord(); this.setState({phase:'unfurl'});
      this.animate(this.state.pos,this.state.home,1200,p=>this.setState({pos:p}),()=>{ L.Audio.creature(c.sound); L.buzz(30); this.setState({phase:'free'}); this.later(()=>{ L.Audio.chime(); this.setState({card:true}); },550); });
    },this.reduce?0:420);
  }
  undo=()=>{ const st=this.state; if(!st.hist.length||st.phase!=='play') return; const pos=st.hist[st.hist.length-1], cr=this.L.crossings(pos,st.cur.edges);
    this.prevKeys=new Set(cr.map(x=>x.i+'_'+x.j)); this.prevCross=cr; this.L.Audio.tick();
    this.setState({pos,hist:st.hist.slice(0,-1),moves:Math.max(0,st.moves-1),nudge:null}); };
  toggleCalm=()=>this.setState(s=>({calm:!s.calm}));
  doNudge=()=>{ const st=this.state; if(st.phase!=='play') return;
    if(st.nudges<=0){ this.toast('Out of Nudges for today. Calm view still helps.'); return; }
    const n=this.L.nudge(st.pos,st.cur.edges); this.L.Audio.chime(); this.setState({nudge:n,nudges:st.nudges-1});
    clearTimeout(this.nt); this.nt=setTimeout(()=>this.setState({nudge:null}),4500); };
  next=()=>{
    const st=this.state,c=st.cur,L=this.L, freed=st.freed.concat([{c,k:'f'+st.freed.length+'_'+c.id}]);
    L.Audio.creature('bubble');
    if(st.mode==='tut'){ if(st.tut<2){ this.setState({freed}); this.startTut(st.tut+1); } else { this.setState({freed}); this.goPond(true); } return; }
    if(st.mode==='daily'){ const bal=st.verified?st.balance+10:st.balance; this.setState({freed,dailyDone:true,moon:Math.min(7,st.moon+1),balance:bal}); this.goPond(false);
      this.later(()=>this.toast(st.verified?'Daily Snarl reward: 10 G$ sent to your wallet.':'Your moon grew a phase. Verify to earn G$ for Daily Snarls.'),900); return; }
    this.setState(s=>({freed,playIdx:s.playIdx+1,plays:s.plays+1})); this.goPond(false);
  };
  goPond(intro){ cancelAnimationFrame(this.raf); this.setState({screen:'pond',intro,card:false}); if(intro) this.later(()=>this.setState({intro:false}),3500); }
  toPond=()=>this.goPond(false);
  toast(msg){ clearTimeout(this.tt); this.setState({toast:msg}); this.tt=setTimeout(()=>this.setState({toast:null}),2800); }
  soon=()=>this.toast('Journal and Shop are on the screens board.');
  moonTap=()=>this.toast(this.state.moon>=7?'Full moon. A visitor is on the way.':'Solve the Daily Snarl to grow the moon. Missing a day only dims it one phase.');
  openDaily=()=>{ this.L.Audio.init(); if(this.state.dailyDone){ this.toast('Already freed today. A new rare Snarl arrives tomorrow.'); return; } this.startPuzzle(this.L.RARE,'daily',3); };
  play=()=>{ this.L.Audio.init(); const L=this.L; this.startPuzzle(L.CREATURES[this.state.playIdx%L.CREATURES.length],'play',this.state.playIdx); };
  claimAmt='152.37';
  claimTap=()=>{ const st=this.state; this.L.Audio.init();
    if(!st.verified){ this.setState({sheet:'verify'}); return; }
    if(!st.claimed){ this.claimNow(); return; }
    this.toast('Claimed today. Next claim in 23h 58m.'); };
  claimNow=()=>{ this.L.Audio.coin(); this.L.buzz(20); this.setState(s=>({claimed:true,sheet:null,balance:s.balance+parseFloat(this.claimAmt)})); this.later(()=>this.toast('152.37 G$ claimed. See you tomorrow morning.'),300); };
  startScan=()=>{ this.setState({sheet:'scan'}); this.later(()=>{ this.L.Audio.chime(); this.setState({sheet:'done',verified:true}); },2600); };
  closeSheet=()=>{ if(this.state.sheet==='scan') return; this.setState({sheet:null}); };
  tapCreature(f){ this.L.Audio.init(); this.L.Audio.creature(f.c.sound); this.L.buzz(8); this.setState(s=>({react:Object.assign({},s.react,{[f.k]:Date.now()})})); }
  renderVals(){
    const st=this.state, L=window.SnarlLib, theme=this.props.theme==='paper'?'paper':'night';
    const t=L?L.THEMES[theme]:{bg:'#0d1527',bg2:'#152039',water:'#0f1d38',card:'rgba(232,237,246,0.07)',cardLine:'rgba(232,237,246,0.12)',ink:'#e8edf6',ink2:'#97a5c3',moon:'#f3ecd0'};
    if(L) L.Audio.on=this.props.sound!==false;
    const h=React.createElement, reduce=this.reduce;
    const base={t,isSplash:st.screen==='splash',isPuzzle:st.screen==='puzzle',isPond:st.screen==='pond',begin:this.begin};
    if(!L||!st.ready) return Object.assign(base,{beginOpacity:0});
    const c=st.cur, cr=c&&st.phase!=='unfurl'&&st.phase!=='free'?L.crossings(st.pos,c.edges):[];
    const free=st.phase==='unfurl'||st.phase==='free';
    const splashArt=st.splashPos&&L.svg(h,L.TUTORIAL[0],{theme,pos:st.splashPos,state:st.splashFree?'free':'tangled',cross:st.splashFree?[]:L.crossings(st.splashPos,L.TUTORIAL[0].edges),r:4.6,sw:1.6,reduce,eyes:st.splashFree?'open':'shut'});
    const board=c&&L.svg(h,c,{theme,pos:st.pos,state:free?'free':'tangled',cross:cr,calm:st.calm,nudge:st.nudge,sparkles:st.sparkles,drag:st.drag,dropped:st.dropped,dropKey:st.dropKey,hit:6.8,reduce,
      eyes:free?'open':(cr.length<=2?'one':'shut'),slowShiver:cr.length<=2,hand:st.hand,onBeadDown:this.onDown,svgProps:{ref:el=>{this.svgEl=el;},onPointerMove:this.onMove,onPointerUp:this.onUp,onPointerCancel:this.onUp}});
    const slots=[[26,22],[70,16],[50,46],[22,66],[76,60],[48,82],[84,38],[14,42],[62,72],[36,30]];
    const moveAnim={swim:['snSwim',16],bob:['snBob',5],walk:['snWalk',14],sit:['snSit',4]};
    const pondLife=st.screen==='pond'?h('div',{style:{position:'absolute',inset:0}},st.freed.map((f,k)=>{ const sl=slots[k%slots.length], sz=Math.round(62+f.c.nodes.length*1.6), m=moveAnim[f.c.move]||moveAnim.swim, rk=st.react[f.k];
      return h('div',{key:f.k,style:{position:'absolute',left:sl[0]+'%',top:sl[1]+'%',width:sz,height:sz,marginLeft:-sz/2,marginTop:-sz/2,animation:st.intro&&!reduce?`snEnter 1.6s ${(k*0.25).toFixed(2)}s cubic-bezier(.2,.8,.2,1) both`:'none'}},
        h('div',{style:{width:'100%',height:'100%',animation:reduce?'none':`${m[0]} ${m[1]+k*1.3}s ease-in-out ${-k*2.1}s infinite`}},
          h('div',{key:'r'+(rk||0),onClick:()=>this.tapCreature(f),style:{width:'100%',height:'100%',cursor:'pointer',animation:rk&&!reduce?'snReact .65s ease':'none'}},
            L.svg(h,f.c,{theme,state:'free',eyes:'open',r:5.4,sw:2.4,static:true}))));
    })):null;
    const dailyArt=L.svg(h,L.RARE,{theme,state:st.dailyDone?'free':'silhouette',eyes:'open',r:5,sw:2.2,static:true});
    const isTut=st.mode==='tut';
    let hint='';
    if(c&&st.phase==='play'){ if(isTut&&st.tut===0) hint='Drag a bead until no strings cross.'; else if(isTut&&st.tut===2) hint=st.nudges===3?'Stuck? Nudge shows one bead to move.':''; if(cr.length&&cr.length<=2&&!(isTut&&st.tut===0)) hint='Almost free.'; }
    if(st.phase==='inhale') hint='';
    const under=c&&st.moves<=c.par;
    const chips=!c?[]:st.mode==='daily'?['Rare · Daily Snarl','Freed by 1,285 today',st.verified?'+10 G$ reward':'Verify to earn G$']:[under?'Shell earned · under par':`Freed in ${st.moves} moves`];
    const nextLabel=st.mode==='tut'?(st.tut<2?'Next knot':'Release to the pond'):'Release to the pond';
    const caption=!c?'':st.mode==='daily'?'Daily Snarl · rare':st.mode==='play'?`World 1 · The Pond · ${(st.playIdx%L.CREATURES.length)+3}`:'';
    return Object.assign(base,{
      beginOpacity:st.splashDone?1:0, splashArt, board, cur:c||{}, moves:st.moves,
      crossCount:free||st.phase==='inhale'?0:cr.length, crossLabel:cr.length===1?'crossing':'crossings', crossColor:cr.length?t.warm:t.ink,
      caption, hint, isTut, showBack:!isTut, tutDots:[0,1,2].map(i=>({o:i===st.tut?1:i<st.tut?.55:.2})),
      boardScale:st.phase==='inhale'&&!reduce?0.95:1, toolsOpacity:st.phase==='play'?1:0,
      undo:this.undo, undoOpacity:st.hist.length?1:.45, toggleCalm:this.toggleCalm, calmBorder:st.calm?t.ink:t.cardLine,
      showNudge:!(isTut&&st.tut<2), doNudge:this.doNudge, nudges:st.nudges, nudgeAnim:isTut&&st.tut===2&&st.nudges===3&&!reduce?'snAttn 1.4s ease-in-out infinite':'none',
      card:st.card, cardColor:c?L.color(c,theme):t.ink, chips, next:this.next, nextLabel,
      pondLife, intro:st.intro, moonTap:this.moonTap, moonShift:(st.moon/7*100).toFixed(0)+'%', moonLabel:st.moon>=7?'Full moon':st.moon===0?'New moon':`Day ${st.moon} of 7`,
      verified:st.verified, balanceLabel:st.balance.toFixed(2)+' G$', soon:this.soon,
      openDaily:this.openDaily, dailyArt, dailyDotO:st.dailyDone?.25:1, dailyTitle:st.dailyDone?'Moon Moth':'A rare Snarl', dailySub:st.dailyDone?'Freed today':'Freed by 1,284 today',
      claimTap:this.claimTap, claimTitle:!st.verified?'Free UBI':st.claimed?'Claimed':this.claimAmt+' G$', claimSub:!st.verified?'Verify once to start':st.claimed?'Next in 23h 58m':'Ready to claim',
      claimBtn:!st.verified?'Verify':st.claimed?'Done for today':'Claim', claimBtnBg:!st.verified||st.claimed?'transparent':t.ink, claimBtnInk:!st.verified||st.claimed?t.ink:t.bg,
      play:this.play, playLabel:'Play · World 1',
      hasSheet:!!st.sheet, sheetVerify:st.sheet==='verify', sheetScan:st.sheet==='scan', sheetDone:st.sheet==='done', closeSheet:this.closeSheet, startScan:this.startScan, claimNow:this.claimNow, claimAmt:this.claimAmt,
      unlocks:['A daily G$ claim (UBI)','A small, capped reward for each Daily Snarl','Gifts to friends and the weekly Golden Knot'],
      doneBeads:[200,10,165,315,30].map(hh=>`oklch(${t.L} ${t.C} ${hh})`),
      hasToast:!!st.toast, toast:st.toast, toPond:this.toPond
    });
  }
}
