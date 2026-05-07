
    const { useState, useEffect, useRef, useCallback } = React;
    const BALL_ICO = "ball.png";

    // ─── FIREBASE ──────────────────────────────────────────────────────────
    const firebaseConfig = {
      apiKey: "AIzaSyBWcUvEUzlvUb0CwM_GsjLY0AmiYHa8GhA",
      authDomain: "live-pickle.firebaseapp.com",
      databaseURL: "https://live-pickle-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "live-pickle",
      storageBucket: "live-pickle.firebasestorage.app",
      messagingSenderId: "419584191740",
      appId: "1:419584191740:web:430fdc01037a21838bfb79"
    };
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    // ─── Team definitions ───────────────────────────────────────────────────
    const ALL_TEAMS = [
      { id:"red",    name:"Red",    color:"#ef4444", text:"#fff" },
      { id:"blue",   name:"Blue",   color:"#3b82f6", text:"#fff" },
      { id:"yellow", name:"Yellow", color:"#eab308", text:"#000" },
      { id:"green",  name:"Green",  color:"#22c55e", text:"#fff" },
      { id:"orange", name:"Orange", color:"#f97316", text:"#fff" },
      { id:"purple", name:"Purple", color:"#a855f7", text:"#fff" },
      { id:"pink",   name:"Pink",   color:"#ec4899", text:"#fff" },
      { id:"grey",   name:"Grey",   color:"#6b7280", text:"#fff" },
      { id:"brown",  name:"Brown",  color:"#92400e", text:"#fff" },
      { id:"teal",   name:"Teal",   color:"#14b8a6", text:"#fff" },
      { id:"lime",   name:"Lime",   color:"#84cc16", text:"#000" },
      { id:"cyan",   name:"Cyan",   color:"#06b6d4", text:"#000" },
      { id:"indigo", name:"Indigo", color:"#6366f1", text:"#fff" },
      { id:"rose",   name:"Rose",   color:"#f43f5e", text:"#fff" },
      { id:"amber",  name:"Amber",  color:"#f59e0b", text:"#000" },
      { id:"navy",   name:"Navy",   color:"#1e40af", text:"#fff" },
      { id:"mint",   name:"Mint",   color:"#6ee7b7", text:"#000" },
      { id:"coral",  name:"Coral",  color:"#fb7185", text:"#fff" },
      { id:"sky",    name:"Sky",    color:"#38bdf8", text:"#000" },
      { id:"gold",   name:"Gold",   color:"#d97706", text:"#fff" },
    ];

    let CUSTOM_TEAMS = [];
    const teamById = (id) => {
      const c = CUSTOM_TEAMS.find(t => t.id === id);
      if (c) return c;
      return ALL_TEAMS.find(t => t.id === id);
    };
    const registerTeams = (teams) => { CUSTOM_TEAMS = teams || []; };

    // ─── Firebase normalisation ─────────────────────────────────────────────
    function toArr(val) {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === 'string' || typeof val === 'number') return [val];
      return Object.keys(val).sort((a,b)=>Number(a)-Number(b)).map(k=>val[k]);
    }
    function normaliseSnapshot(s) {
      if (!s) return s;
      const rawReg = s.teamRegistry ? toArr(s.teamRegistry) : null;
      const registry = rawReg
        ? rawReg.filter(t=>t&&t.id&&t.name&&t.color).map(t=>({id:String(t.id),name:String(t.name),color:String(t.color),text:String(t.text||"#fff")}))
        : null;
      if (registry && registry.length > 0) registerTeams(registry);
      const h = toArr(s.history).map(r=>({...r,games:toArr(r.games),bye:toArr(r.bye),paused:toArr(r.paused)}));
      const rd = s.roundData ? {
        courtTeamIds: toArr(s.roundData.courtTeamIds).map(p=>toArr(p)),
        byeIds: toArr(s.roundData.byeIds),
        pausedTeamIds: toArr(s.roundData.pausedTeamIds),
      } : null;
      const rrSched = s.roundRobinSchedule ? toArr(s.roundRobinSchedule).map(rd=>toArr(rd).map(p=>toArr(p))) : null;
      const rrCourts = s.roundRobinCourts ? toArr(s.roundRobinCourts).map(String) : null;
      const rrSnap = s.roundRobinStartSnapshot ? {
        startRoundNum: s.roundRobinStartSnapshot.startRoundNum ?? null,
        participatingIds: toArr(s.roundRobinStartSnapshot.participatingIds).map(String),
        excludedIds: toArr(s.roundRobinStartSnapshot.excludedIds).map(String),
      } : null;
      const rrEndSnap = s.roundRobinEndSnapshot ? {
        endRoundNum: s.roundRobinEndSnapshot.endRoundNum ?? null,
        endReason: s.roundRobinEndSnapshot.endReason || "manual",
      } : null;
      const extras = s.activeRoundExtras ? toArr(s.activeRoundExtras) : [];
      const liveAdds = s.liveAdditions ? toArr(s.liveAdditions) : [];
      const cancelled = s.cancelledRoundNums ? toArr(s.cancelledRoundNums).map(Number) : [];
      return { ...s, history:h, roundData:rd,
        activeTeamIds:toArr(s.activeTeamIds), courtNumbers:toArr(s.courtNumbers),
        pausedIds:toArr(s.pausedIds), teamRegistry:registry,
        tournamentMode:s.tournamentMode||"swiss",
        roundRobinSchedule:rrSched,
        roundRobinCourts:rrCourts,
        roundRobinStartRoundNum:s.roundRobinStartRoundNum??null,
        roundRobinStartSnapshot:rrSnap,
        roundRobinEndSnapshot:rrEndSnap,
        activeRoundExtras:extras,
        liveAdditions:liveAdds,
        cancelledRoundNums:cancelled,
        tournamentFinished:!!s.tournamentFinished };
    }

    // ─── Standings ──────────────────────────────────────────────────────────
    function mkStandings(ids){
      return ids.map(id=>({...teamById(id),id,wins:0,losses:0,scoreDiff:0,played:0,lastPlayedRound:-999,lastByeRound:-999}));
    }
    function rerank(st){ return [...st].sort((a,b)=>{ if(b.wins!==a.wins)return b.wins-a.wins; if(b.scoreDiff!==a.scoreDiff)return b.scoreDiff-a.scoreDiff; return a.played-b.played; }); }
    function rebuildStandings(ids,history){
      const map=Object.fromEntries(mkStandings(ids).map(t=>[t.id,{...t}]));
      history.forEach((rd,ri)=>{
        rd.games.forEach(g=>{ const w=map[g.winnerId],l=map[g.loserId]; if(!w||!l)return;
          w.wins++;w.scoreDiff+=g.winnerScore-g.loserScore;w.played++;w.lastPlayedRound=ri;
          l.losses++;l.scoreDiff+=g.loserScore-g.winnerScore;l.played++;l.lastPlayedRound=ri; });
        (rd.bye||[]).forEach(id=>{ if(map[id])map[id].lastByeRound=ri; });
      });
      return Object.values(map);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────
    const ORDINAL=n=>{const s=["th","st","nd","rd"],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);};
    function TeamChip({teamId}){
      const t=teamById(teamId); if(!t)return null;
      return <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold"
        style={{background:t.color,color:t.text,border:"2px solid rgba(255,255,255,0.15)"}}>{t.name}</span>;
    }

    // ─── Read-only compact timer bar ────────────────────────────────────────
    function RoundTimer({secsLeft,totalSecs,roundNum,timerRunning,breakInfo}){
      const[breakSecsLeft,setBreakSecsLeft]=useState(()=>breakInfo?Math.max(0,Math.round((breakInfo.endAt-Date.now())/1000)):0);
      useEffect(()=>{
        if(!breakInfo)return;
        const tick=()=>setBreakSecsLeft(Math.max(0,Math.round((breakInfo.endAt-Date.now())/1000)));
        tick();const id=setInterval(tick,1000);return()=>clearInterval(id);
      },[breakInfo&&breakInfo.endAt]);
      if(breakInfo){
        const bm=Math.floor(breakSecsLeft/60),bs=breakSecsLeft%60,over=breakSecsLeft===0;
        return(
          <div className="flex items-center rounded-xl"
            style={{padding:"clamp(6px,1.5vw,10px) clamp(10px,2.5vw,16px)",gap:"clamp(8px,2vw,14px)",
              background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.5)",marginBottom:"clamp(6px,1.5vw,10px)"}}>
            <div style={{fontSize:"clamp(20px,5vw,28px)",flexShrink:0}}>☕</div>
            <div className="flex-1">
              <div style={{fontSize:"clamp(9px,2vw,12px)",color:"#d97706",lineHeight:1,marginBottom:2,fontWeight:800,letterSpacing:"0.08em"}}>BREAK</div>
              <div style={{fontFamily:"monospace",fontWeight:800,fontSize:"clamp(13px,3.5vw,18px)",lineHeight:1,color:over?"#ef4444":"#92400e"}}>
                {over?"BREAK OVER":`${bm}:${String(bs).padStart(2,"0")}`}
              </div>
            </div>
          </div>
        );
      }
      const mins=Math.floor(secsLeft/60),secs=secsLeft%60;
      const pct=totalSecs>0?secsLeft/totalSecs:1;
      const expired=secsLeft===0,urgent=pct<0.2&&!expired;
      const color=expired?"#ef4444":urgent?"#f97316":"#6366f1";
      return(
        <div className="flex items-center rounded-xl"
          style={{padding:"clamp(6px,1.5vw,10px) clamp(10px,2.5vw,16px)",gap:"clamp(8px,2vw,14px)",
            background:"rgba(0,0,0,0.03)",border:`1px solid ${color}66`,marginBottom:"clamp(6px,1.5vw,10px)"}}>
          <svg style={{width:"clamp(28px,7vw,38px)",height:"clamp(28px,7vw,38px)",flexShrink:0}} viewBox="0 0 34 34">
            <circle cx={17} cy={17} r={13} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={3}/>
            <circle cx={17} cy={17} r={13} fill="none" stroke={color} strokeWidth={3}
              strokeDasharray={`${2*Math.PI*13}`} strokeDashoffset={`${-2*Math.PI*13*(1-pct)}`}
              strokeLinecap="round" transform="rotate(-90 17 17)"
              style={{transition:"stroke-dashoffset 1s linear,stroke 0.3s"}}/>
            {expired&&<text x={17} y={21} textAnchor="middle" fontSize={9} fill="#dc2626" fontWeight="bold">!</text>}
          </svg>
          <div className="flex-1">
            <div style={{fontSize:"clamp(9px,2vw,12px)",color:"#94a3b8",lineHeight:1,marginBottom:2}}>Round {roundNum}</div>
            <div style={{fontFamily:"monospace",fontWeight:800,fontSize:"clamp(13px,3.5vw,18px)",lineHeight:1,color:expired?"#dc2626":urgent?"#ea580c":"#1e293b"}}>
              {expired?"TIME'S UP":`${mins}:${String(secs).padStart(2,"0")}`}
            </div>
          </div>
        </div>
      );
    }

    // ─── Read-only court card ────────────────────────────────────────────────
    function ViewerCourtCard({courtLabel,teams}){
      const[tA,tB]=teams;
      return(
        <div className="rounded-2xl" style={{padding:"clamp(12px,3vw,18px)",background:"#fff",border:"1px solid rgba(0,0,0,0.1)",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
          <p style={{fontSize:"clamp(10px,2.5vw,13px)",color:"#0f4c75",fontWeight:800,marginBottom:"clamp(8px,2vw,12px)",textTransform:"uppercase",letterSpacing:"0.1em"}}>{courtLabel}</p>
          <div className="flex items-stretch" style={{gap:"clamp(8px,2vw,12px)"}}>
            <div className="flex-1 flex items-center justify-center rounded-xl"
              style={{padding:"clamp(12px,3vw,20px)",background:tA.color,border:`2px solid ${tA.color}`}}>
              <span className="font-black text-center" style={{fontSize:"clamp(16px,4vw,26px)",color:tA.text}}>{tA.name}</span>
            </div>
            <div className="flex items-center justify-center flex-shrink-0">
              <span style={{color:"#cbd5e1",fontWeight:900,fontSize:"clamp(14px,3.5vw,20px)"}}>VS</span>
            </div>
            <div className="flex-1 flex items-center justify-center rounded-xl"
              style={{padding:"clamp(12px,3vw,20px)",background:tB.color,border:`2px solid ${tB.color}`}}>
              <span className="font-black text-center" style={{fontSize:"clamp(16px,4vw,26px)",color:tB.text}}>{tB.name}</span>
            </div>
          </div>
        </div>
      );
    }

    // ─── App ─────────────────────────────────────────────────────────────────
    function App(){
      const[phase,setPhase]=useState("loading");
      const[tournamentTitle,setTournamentTitle]=useState("Tournament");
      useEffect(()=>{ document.title=tournamentTitle; },[tournamentTitle]);
      const[activeTeamIds,setActiveTeamIds]=useState([]);
      const[courtNumbers,setCourtNumbers]=useState([]);
      const[timerDuration,setTimerDuration]=useState(0);
      const[history,setHistory]=useState([]);
      const[standings,setStandings]=useState([]);
      const[round,setRound]=useState(null);
      const[roundNum,setRoundNum]=useState(1);
      const[activeTab,setActiveTab]=useState("play");
      useEffect(()=>{ if(activeTab==="timer") setActiveTab("play"); },[activeTab]);
      const TAB_ORDER=["play","standings","history"];
      const swipeTouchRef=useRef(null);
      const handleSwipeStart=e=>{const t=e.touches[0];swipeTouchRef.current={x:t.clientX,y:t.clientY};};
      const handleSwipeEnd=e=>{
        if(!swipeTouchRef.current)return;
        const dx=e.changedTouches[0].clientX-swipeTouchRef.current.x;
        const dy=e.changedTouches[0].clientY-swipeTouchRef.current.y;
        swipeTouchRef.current=null;
        if(Math.abs(dx)<50||Math.abs(dx)<Math.abs(dy))return;
        setActiveTab(t=>{const i=TAB_ORDER.indexOf(t);if(i===-1)return t;const ni=i+(dx<0?1:-1);return TAB_ORDER[Math.max(0,Math.min(TAB_ORDER.length-1,ni))];});
      };
      const[pausedIds,setPausedIds]=useState([]);
      const[presence,setPresence]=useState({viewers:0,admins:0});
      const[tournamentMode,setTournamentMode]=useState("swiss");
      const[roundRobinSchedule,setRoundRobinSchedule]=useState(null);
      const[roundRobinCourts,setRoundRobinCourts]=useState(null);
      const[roundRobinStartRoundNum,setRoundRobinStartRoundNum]=useState(null);
      const[roundRobinStartSnapshot,setRoundRobinStartSnapshot]=useState(null);
      const[roundRobinEndSnapshot,setRoundRobinEndSnapshot]=useState(null);
      const[activeRoundExtras,setActiveRoundExtras]=useState([]);
      const[liveAdditions,setLiveAdditions]=useState([]);
      const[breakMode,setBreakMode]=useState(null);
      const[cancelledRoundNums,setCancelledRoundNums]=useState([]);
      const[tournamentFinished,setTournamentFinished]=useState(false);
      const[headerHidden,setHeaderHidden]=useState(false);
      const headerRef=useRef(null);
      const[headerHeight,setHeaderHeight]=useState(140);
      useEffect(()=>{
        const el=headerRef.current;if(!el)return;
        const ro=new ResizeObserver(([e])=>setHeaderHeight(e.contentRect.height+2));
        ro.observe(el);return()=>ro.disconnect();
      },[]);

      // Timer — display only (no controls)
      const timerRunningRef=useRef(false),timerStartedAtRef=useRef(null),timerPausedSecsRef=useRef(0);
      const timerDurationRef=useRef(0),timerTickRef=useRef(null);
      const[timerRunning,setTimerRunning]=useState(false);
      const[timerSecsLeft,setTimerSecsLeft]=useState(0);
      useEffect(()=>{timerDurationRef.current=timerDuration;},[timerDuration]);

      const computeSecsLeft=()=>{
        if(!timerRunningRef.current||!timerStartedAtRef.current)return timerPausedSecsRef.current;
        return Math.max(0,timerPausedSecsRef.current-Math.floor((Date.now()-timerStartedAtRef.current)/1000));
      };
      const applyTimerState=(running,startedAt,pausedSecs)=>{
        timerRunningRef.current=running;timerStartedAtRef.current=startedAt;timerPausedSecsRef.current=pausedSecs;
        const secs=running&&startedAt?Math.max(0,pausedSecs-Math.floor((Date.now()-startedAt)/1000)):pausedSecs;
        setTimerSecsLeft(secs);setTimerRunning(running);
        clearInterval(timerTickRef.current);
        if(running&&startedAt&&secs>0){
          timerTickRef.current=setInterval(()=>{const s=computeSecsLeft();setTimerSecsLeft(s);if(s<=0)clearInterval(timerTickRef.current);},500);
        }
      };

      // Firebase listener (read-only)
      const lastSeenRoundNum=useRef(-1),initialLoadDone=useRef(false);
      const updateAllStates=useCallback((s)=>{
        if(s.teamRegistry&&s.teamRegistry.length>0){}
        if(s.tournamentTitle){setTournamentTitle(s.tournamentTitle);document.title=s.tournamentTitle;}
        const ns=rebuildStandings(s.activeTeamIds,s.history);
        let nr=null;
        if(s.roundData&&s.roundData.courtTeamIds){
          const safe=id=>teamById(id)||{id,name:String(id),color:"#475569",text:"#fff"};
          nr={courts:s.roundData.courtTeamIds.map(p=>p.map(safe)),bye:(s.roundData.byeIds||[]).map(safe),paused:(s.roundData.pausedTeamIds||[]).map(safe)};
        }
        setActiveTeamIds(s.activeTeamIds);setCourtNumbers(s.courtNumbers);
        setTimerDuration(s.timerDuration||0);
        setHistory(s.history);setStandings(ns);setRound(nr);setRoundNum(s.roundNum);
        setPausedIds(s.pausedIds||[]);
        setTournamentMode(s.tournamentMode||"swiss");
        setRoundRobinSchedule(s.roundRobinSchedule||null);
        setRoundRobinCourts(s.roundRobinCourts||null);
        setRoundRobinStartRoundNum(s.roundRobinStartRoundNum??null);
        setRoundRobinStartSnapshot(s.roundRobinStartSnapshot||null);
        setRoundRobinEndSnapshot(s.roundRobinEndSnapshot||null);
        setActiveRoundExtras(s.activeRoundExtras||[]);
        setLiveAdditions(s.liveAdditions||[]);
        setTournamentFinished(!!s.tournamentFinished);
        setBreakMode(s.breakMode||null);
        setCancelledRoundNums(s.cancelledRoundNums||[]);
        const isNew=s.roundNum!==lastSeenRoundNum.current;
        if(isNew){lastSeenRoundNum.current=s.roundNum;}
        const _tRun=s.timerRunning||false,_tSA=s.timerStartedAt||null,_tPS=s.timerPausedSecsLeft??s.timerDuration??0;
        applyTimerState(_tRun,_tSA,_tPS);
        setPhase("play");
      },[]);

      useEffect(()=>{
        const ref=db.ref('current_tournament');
        ref.on('value',snap=>{
          const data=snap.val();
          if(!initialLoadDone.current)initialLoadDone.current=true;
          if(!data){setPhase(p=>p==="play"?"waiting":p);return;}
          if(data.phase!=="play"){setPhase("waiting");return;}
          updateAllStates(normaliseSnapshot(data));
        });
        return()=>ref.off();
      },[updateAllStates]);

      useEffect(()=>{
        const t=setTimeout(()=>{if(!initialLoadDone.current){initialLoadDone.current=true;setPhase("waiting");}},4000);
        return()=>clearTimeout(t);
      },[]);

      // Presence — register as viewer
      const myPresRef=useRef(null);
      useEffect(()=>{
        const ref=db.ref('presence').push();myPresRef.current=ref;
        ref.set({role:'viewer',joinedAt:Date.now()});ref.onDisconnect().remove();
        const h=snap=>{const d=snap.val()||{},e=Object.values(d);setPresence({viewers:e.filter(x=>x&&x.role==='viewer').length,admins:e.filter(x=>x&&x.role==='admin').length});};
        db.ref('presence').on('value',h);return()=>{ref.remove();db.ref('presence').off('value',h);};
      },[]);

      const ranked=rerank(standings);

      return(
        <div className="min-h-screen"
          style={{background:"#fff",fontFamily:"'Trebuchet MS',sans-serif",color:"#1e293b"}}>

          {/* Floating "show header" pill */}
          {headerHidden&&(
            <button onClick={()=>setHeaderHidden(false)}
              style={{position:"fixed",top:8,right:8,zIndex:50,padding:"6px 14px",borderRadius:999,fontWeight:700,fontSize:12,cursor:"pointer",
                background:"rgba(15,76,117,0.9)",color:"#fff",border:"none",boxShadow:"0 2px 8px rgba(0,0,0,0.25)"}}>
              ▼ Show header
            </button>
          )}

          {/* ── Fixed header + nav ── */}
          <div ref={headerRef} style={{position:"fixed",top:0,left:0,right:0,zIndex:40,background:"#fff",borderBottom:"1px solid rgba(0,0,0,0.08)",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",display:headerHidden?"none":undefined}}>
            <div style={{maxWidth:720,margin:"0 auto",padding:"0 clamp(12px,3vw,20px)"}}>
              <div className="flex items-center gap-3 py-3">
                <img src={BALL_ICO} alt="pickleball" style={{width:"clamp(36px,7vw,52px)",height:"clamp(36px,7vw,52px)",borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>
                <div className="flex-1 min-w-0">
                  <h1 className="font-black tracking-tight leading-tight truncate" style={{fontSize:"clamp(16px,4vw,26px)",color:"#0f4c75"}}>
                    {tournamentTitle}
                  </h1>
                  <div className="flex items-center gap-2 flex-wrap">
                    {phase==="play"&&<p className="text-slate-500" style={{fontSize:"clamp(10px,2.5vw,13px)"}}>{activeTeamIds.length} teams · 🔵 Live Viewer</p>}
                    {(phase==="waiting"||phase==="loading")&&<p className="text-slate-500" style={{fontSize:"clamp(10px,2.5vw,13px)"}}>🔵 Live Viewer</p>}
                    {(presence.admins>0||presence.viewers>0)&&(
                      <span className="text-slate-400" style={{fontSize:"clamp(9px,2vw,11px)"}}>
                        {presence.admins>0&&`🟢${presence.admins} `}{presence.viewers>1&&`🔵${presence.viewers}`}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={()=>setHeaderHidden(true)} title="Hide header"
                  style={{flexShrink:0,fontSize:13,padding:"6px 8px",borderRadius:10,fontWeight:700,cursor:"pointer",
                    background:"rgba(0,0,0,0.04)",color:"#94a3b8",border:"1px solid rgba(0,0,0,0.08)"}}>
                  ▲
                </button>
              </div>

              {/* Tab bar — only shown during play */}
              {phase==="play"&&(
                <div className="flex gap-2 pb-2">
                  {[["play","🎾 Play"],["standings","🏆 Standings"],["history","📋 History"]].map(([id,label])=>(
                    <button key={id} onClick={()=>setActiveTab(id)} className="flex-1 rounded-xl font-bold"
                      style={{padding:"clamp(6px,1.5vw,10px) 4px",fontSize:"clamp(11px,2.5vw,14px)",
                        background:activeTab===id?"linear-gradient(90deg,#0f4c75,#1a6fa8)":"rgba(0,0,0,0.05)",
                        color:activeTab===id?"#fff":"#475569",cursor:"pointer",
                        border:activeTab===id?"none":"1px solid rgba(0,0,0,0.08)"}}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {/* Timer bar */}
              {phase==="play"&&(timerDuration>0||breakMode)&&(
                <div className="pb-2">
                  <RoundTimer secsLeft={timerSecsLeft} totalSecs={timerDuration} roundNum={roundNum}
                    timerRunning={timerRunning} breakInfo={breakMode}/>
                </div>
              )}
            </div>
          </div>

          {/* ── Scrollable content ── */}
          <div onTouchStart={phase==="play"?handleSwipeStart:undefined} onTouchEnd={phase==="play"?handleSwipeEnd:undefined}
            style={{maxWidth:720,margin:"0 auto",padding:`${headerHidden?44:headerHeight+8}px clamp(12px,3vw,20px) clamp(16px,3vw,24px)`}}>

            {/* Loading / waiting */}
            {(phase==="loading"||phase==="waiting")&&(
              <div className="rounded-2xl p-10 text-center flex flex-col items-center gap-4" style={{background:"rgba(0,0,0,0.03)",border:"1px solid rgba(0,0,0,0.08)"}}>
                {phase==="loading"
                  ?(<><div className="text-3xl">🔄</div><p className="text-slate-500 text-sm">Connecting to tournament…</p></>)
                  :(<><div className="text-3xl">🏓</div><p className="text-slate-700 font-bold">No active tournament</p><p className="text-slate-500 text-sm">Waiting for the organizer to start.</p></>)}
              </div>
            )}

            {phase==="play"&&(
              <>
                {/* ── Break banner ── */}
                {activeTab==="play"&&breakMode&&(
                  <div className="rounded-2xl flex flex-col gap-2" style={{padding:"clamp(14px,3.5vw,22px)",background:"linear-gradient(135deg,#fef3c7,#fde68a)",border:"1px solid rgba(217,119,6,0.4)"}}>
                    <div className="flex items-center gap-2">
                      <span style={{fontSize:"clamp(22px,5.5vw,32px)"}}>☕</span>
                      <div>
                        <p style={{fontWeight:900,fontSize:"clamp(14px,3.5vw,20px)",color:"#92400e",margin:0}}>{breakMode.message}</p>
                        <p style={{fontSize:"clamp(10px,2.5vw,13px)",color:"#b45309",margin:0}}>Tournament is on a break — matches resume shortly.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Play tab — Tournament FINISHED ── */}
                {activeTab==="play"&&tournamentFinished&&(()=>{
                  const top=ranked.slice(0,3);
                  const podium=[top[1],top[0],top[2]].filter(Boolean);
                  const heights=[120,160,90];
                  const medals=["🥈","🥇","🥉"];
                  const placeFor=t=>top.indexOf(t)+1;
                  return(
                    <div className="flex flex-col" style={{gap:"clamp(10px,2.5vw,16px)"}}>
                      <div className="rounded-2xl text-center"
                        style={{padding:"clamp(16px,4vw,28px)",
                          background:"linear-gradient(135deg,#fef3c7,#fde68a)",
                          border:"1px solid rgba(217,119,6,0.3)"}}>
                        <div style={{fontSize:"clamp(36px,9vw,56px)"}}>🏆</div>
                        <p className="font-black" style={{color:"#92400e",fontSize:"clamp(18px,4.5vw,26px)",margin:"4px 0"}}>Tournament Complete</p>
                        <p style={{color:"#78350f",fontSize:"clamp(11px,2.8vw,14px)",margin:0}}>
                          {history.length} round{history.length!==1?"s":""} played
                        </p>
                      </div>
                      <div className="flex items-end justify-center" style={{gap:"clamp(6px,1.5vw,12px)",padding:"clamp(12px,3vw,20px) 0"}}>
                        {podium.map((t,i)=>{
                          const h=heights[i], place=placeFor(t);
                          return(
                            <div key={t.id} className="flex flex-col items-center" style={{flex:"1 1 0",minWidth:0,maxWidth:160}}>
                              <div style={{fontSize:"clamp(22px,6vw,36px)",marginBottom:4}}>{medals[i]}</div>
                              <div className="rounded-full font-black inline-flex items-center justify-center"
                                style={{background:t.color,color:t.text,
                                  padding:"clamp(6px,1.5vw,10px) clamp(10px,2.5vw,16px)",
                                  fontSize:"clamp(12px,3vw,17px)",
                                  border:"3px solid rgba(255,255,255,0.5)",
                                  whiteSpace:"nowrap",
                                  boxShadow:`0 4px 16px ${t.color}66`}}>
                                {t.name}
                              </div>
                              <div className="rounded-2xl flex items-end justify-center"
                                style={{background:`${t.color}22`,border:`2px solid ${t.color}44`,
                                  width:"100%",height:`${h}px`,marginTop:8}}>
                                <span style={{color:t.color,fontWeight:900,fontSize:"clamp(18px,5vw,28px)",marginBottom:8}}>{ORDINAL(place)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {ranked.length>3&&(
                        <div className="rounded-2xl overflow-hidden" style={{border:"1px solid rgba(0,0,0,0.08)"}}>
                          {ranked.slice(3).map((t,i)=>(
                            <div key={t.id} className="flex items-center gap-3"
                              style={{padding:"clamp(8px,2vw,14px) clamp(12px,3vw,18px)",
                                background:i%2===0?"#fff":"#f8fafc",
                                borderTop:i===0?"none":"1px solid rgba(0,0,0,0.05)"}}>
                              <span className="font-bold text-slate-500" style={{width:32,fontSize:"clamp(12px,3vw,16px)"}}>{ORDINAL(i+4)}</span>
                              <span className="inline-flex items-center rounded-full font-bold"
                                style={{background:t.color,color:t.text,fontSize:"clamp(12px,3vw,16px)",padding:"clamp(4px,1vw,6px) clamp(10px,2.5vw,14px)"}}>
                                {t.name}
                              </span>
                              <span className="ml-auto text-slate-400 font-bold" style={{fontSize:"clamp(11px,2.5vw,14px)"}}>{t.wins}W – {t.losses}L</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── Play tab — no active round (between rounds, Swiss) ── */}
                {activeTab==="play"&&!tournamentFinished&&!round&&tournamentMode==="swiss"&&(
                  <div className="rounded-2xl p-10 text-center flex flex-col items-center gap-3" style={{background:"rgba(0,0,0,0.03)",border:"1px solid rgba(0,0,0,0.08)"}}>
                    <div style={{fontSize:"clamp(28px,7vw,44px)"}}>{roundNum===0?"🏓":"⏳"}</div>
                    <p className="font-bold" style={{color:"#0f4c75",fontSize:"clamp(14px,3.5vw,20px)",margin:0}}>
                      {roundNum===0?"Waiting for Round 1…":"Waiting for next round…"}
                    </p>
                    <p className="text-slate-500" style={{fontSize:"clamp(11px,2.5vw,14px)",margin:0}}>
                      {roundNum===0?"The organizer will start the tournament shortly.":"The organizer is setting up the next round."}
                    </p>
                  </div>
                )}

                {/* ── Play tab — active round (Swiss) ── */}
                {activeTab==="play"&&!tournamentFinished&&round&&tournamentMode==="swiss"&&(
                  <div className="flex flex-col gap-4">
                    <div style={{textAlign:"center"}}>
                      <span className="text-blue-900 font-black" style={{fontSize:"clamp(22px,6vw,32px)"}}>Round {roundNum}</span>
                    </div>
                    {round.courts.map((teams,idx)=>(
                      <ViewerCourtCard key={`court-${idx}`} courtLabel={`Court ${courtNumbers[idx]??idx+1}`} teams={teams}/>
                    ))}
                    {liveAdditions.map((la,i)=>{
                      const tA=teamById(la.teamId1),tB=teamById(la.teamId2);
                      if(!tA||!tB)return null;
                      return <ViewerCourtCard key={`live-${i}`} courtLabel={`Court ${la.courtNumber}`} teams={[tA,tB]}/>;
                    })}
                    {(round.paused?.length>0||round.bye?.length>0)&&(
                      <div className="flex items-center flex-wrap" style={{gap:"clamp(6px,1.5vw,10px)"}}>
                        {round.paused?.length>0&&(
                          <>
                            <span style={{color:"#64748b",fontSize:"clamp(10px,2.5vw,13px)",fontWeight:700,flexShrink:0}}>Paused:</span>
                            {round.paused.map(t=><TeamChip key={t.id} teamId={t.id}/>)}
                          </>
                        )}
                        {round.bye?.length>0&&(
                          <>
                            <span style={{color:"#64748b",fontSize:"clamp(10px,2.5vw,13px)",fontWeight:700,flexShrink:0,marginLeft:round.paused?.length>0?"clamp(6px,1.5vw,10px)":0}}>Bye:</span>
                            {round.bye.map(t=><TeamChip key={t.id} teamId={t.id}/>)}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Play tab — Round Robin mode ── */}
                {activeTab==="play"&&!tournamentFinished&&tournamentMode==="roundrobin"&&roundRobinSchedule&&(()=>{
                  const rrCourts=(roundRobinCourts&&roundRobinCourts.length>0)?roundRobinCourts:courtNumbers;
                  const completedCount=roundRobinSchedule.filter((_,i)=>history.some(h=>h.roundNum===(roundRobinStartRoundNum||1)+i)).length;

                  return(
                  <div className="flex flex-col" style={{gap:"clamp(10px,2.5vw,16px)"}}>
                    <div className="rounded-2xl flex flex-col"
                      style={{padding:"clamp(10px,2.5vw,16px)",gap:"clamp(4px,1vw,8px)",
                        background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.25)"}}>
                      <p className="font-bold" style={{color:"#4338ca",fontSize:"clamp(13px,3.5vw,17px)"}}>
                        🔁 Round Robin
                      </p>
                      <p style={{color:"#64748b",fontSize:"clamp(10px,2.5vw,13px)"}}>
                        {roundRobinSchedule.length} round{roundRobinSchedule.length!==1?"s":""} ·
                        {" "}{roundRobinSchedule.reduce((a,r)=>a+r.length,0)} total matches ·
                        {" "}Courts: {rrCourts.join(", ")}.
                        {" "}{completedCount}/{roundRobinSchedule.length} round{roundRobinSchedule.length!==1?"s":""} complete.
                      </p>
                    </div>

                    {roundRobinSchedule.map((schedRound,srIdx)=>{
                      const labelNum=(roundRobinStartRoundNum||1)+srIdx;
                      const committedEntry=history.find(h=>h.roundNum===labelNum);
                      const isComplete=!!committedEntry;
                      return(
                        <div key={srIdx} className="flex flex-col"
                          style={{gap:"clamp(8px,2vw,12px)",padding:"clamp(10px,2.5vw,14px)",borderRadius:14,
                            background:isComplete?"rgba(34,197,94,0.05)":"rgba(0,0,0,0.02)",
                            border:`1px solid ${isComplete?"rgba(34,197,94,0.25)":"rgba(0,0,0,0.08)"}`}}>
                          <div className="flex items-center justify-between">
                            <span style={{color:isComplete?"#16a34a":"#0f4c75",fontWeight:800,
                              fontSize:"clamp(12px,3vw,15px)",textTransform:"uppercase",letterSpacing:"0.08em"}}>
                              {isComplete?"✓ ":""}Round {labelNum}
                            </span>
                            {isComplete&&<span style={{color:"#16a34a",fontSize:"clamp(10px,2.5vw,13px)",fontWeight:700}}>Complete</span>}
                          </div>

                          {schedRound.map(([idA,idB],mi)=>{
                            const tA=teamById(idA), tB=teamById(idB);
                            if(!tA||!tB)return null;
                            const courtLabel=`Court ${rrCourts[mi]??mi+1}`;
                            const committedGame=isComplete
                              ?committedEntry.games.find(g=>(g.winnerId===idA&&g.loserId===idB)||(g.winnerId===idB&&g.loserId===idA))
                              :null;

                            if(committedGame){
                              const w=teamById(committedGame.winnerId), l=teamById(committedGame.loserId);
                              return(
                                <div key={mi} className="rounded-xl flex items-center"
                                  style={{padding:"clamp(8px,2vw,12px)",gap:"clamp(8px,2vw,12px)",
                                    background:"#fff",border:"1px solid rgba(0,0,0,0.08)"}}>
                                  <span style={{color:"#94a3b8",fontSize:"clamp(10px,2.5vw,12px)",fontWeight:700,minWidth:50}}>{courtLabel}</span>
                                  <span className="inline-flex items-center rounded-full font-bold"
                                    style={{background:w?.color,color:w?.text,padding:"3px 10px",fontSize:"clamp(11px,2.8vw,14px)",whiteSpace:"nowrap"}}>{w?.name}</span>
                                  <span style={{fontWeight:800,color:w?.color,fontSize:"clamp(13px,3vw,16px)"}}>{committedGame.winnerScore}</span>
                                  <span style={{color:"#cbd5e1"}}>–</span>
                                  <span style={{fontWeight:800,color:l?.color,fontSize:"clamp(13px,3vw,16px)"}}>{committedGame.loserScore}</span>
                                  <span className="inline-flex items-center rounded-full font-bold"
                                    style={{background:l?.color,color:l?.text,padding:"3px 10px",fontSize:"clamp(11px,2.8vw,14px)",whiteSpace:"nowrap"}}>{l?.name}</span>
                                </div>
                              );
                            }

                            return(
                              <div key={mi} className="rounded-xl" style={{padding:"clamp(10px,2.5vw,14px)",background:"#fff",border:"1px solid rgba(0,0,0,0.1)"}}>
                                <p style={{fontSize:"clamp(10px,2.5vw,13px)",color:"#0f4c75",fontWeight:800,marginBottom:"clamp(6px,1.5vw,10px)",textTransform:"uppercase",letterSpacing:"0.1em"}}>{courtLabel}</p>
                                <div className="flex items-stretch" style={{gap:"clamp(6px,1.5vw,10px)"}}>
                                  <div className="flex-1 flex items-center justify-center rounded-xl"
                                    style={{padding:"clamp(10px,2.5vw,16px)",background:tA.color,border:`2px solid ${tA.color}`}}>
                                    <span className="font-black text-center" style={{fontSize:"clamp(14px,3.5vw,22px)",color:tA.text}}>{tA.name}</span>
                                  </div>
                                  <div className="flex items-center justify-center flex-shrink-0">
                                    <span style={{color:"#cbd5e1",fontWeight:900,fontSize:"clamp(12px,3vw,18px)"}}>VS</span>
                                  </div>
                                  <div className="flex-1 flex items-center justify-center rounded-xl"
                                    style={{padding:"clamp(10px,2.5vw,16px)",background:tB.color,border:`2px solid ${tB.color}`}}>
                                    <span className="font-black text-center" style={{fontSize:"clamp(14px,3.5vw,22px)",color:tB.text}}>{tB.name}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                  );
                })()}

                {/* ── Standings tab ── */}
                {activeTab==="standings"&&(
                  <div className="rounded-2xl overflow-hidden" style={{border:"1px solid rgba(0,0,0,0.1)",boxShadow:"0 2px 16px rgba(0,0,0,0.06)"}}>
                    <div className="flex items-center font-bold uppercase tracking-widest"
                      style={{background:"#0f4c75",color:"#fff",padding:"clamp(8px,2vw,14px) clamp(10px,2.5vw,18px)",gap:"clamp(6px,1.5vw,12px)",fontSize:"clamp(9px,2vw,12px)"}}>
                      <span style={{width:"clamp(28px,6vw,50px)"}}>Rank</span>
                      <span className="flex-1">Team</span>
                      <span style={{width:"clamp(26px,5.5vw,42px)",textAlign:"center"}}>GP</span>
                      <span style={{width:"clamp(26px,5.5vw,42px)",textAlign:"center",color:"#86efac"}}>W</span>
                      <span style={{width:"clamp(26px,5.5vw,42px)",textAlign:"center",color:"#fca5a5"}}>L</span>
                      <span style={{width:"clamp(30px,6.5vw,50px)",textAlign:"center",color:"#7dd3fc"}}>+/−</span>
                    </div>
                    {ranked.map((team,i)=>{ const diff=team.scoreDiff,paused=pausedIds.includes(team.id); return(
                      <div key={team.id} className="flex items-center"
                        style={{padding:"clamp(10px,2.5vw,18px) clamp(10px,2.5vw,18px)",gap:"clamp(6px,1.5vw,12px)",
                          background:i%2===0?"#fff":"#f8fafc",borderTop:"1px solid rgba(0,0,0,0.05)",opacity:paused?0.45:1}}>
                        <span className="font-black text-slate-500" style={{width:"clamp(28px,6vw,50px)",fontSize:"clamp(14px,3.5vw,22px)"}}>
                          {i===0?"🥇":i===1?"🥈":i===2?"🥉":ORDINAL(i+1)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="inline-flex items-center rounded-full font-black"
                            style={{background:team.color,color:team.text,
                              fontSize:"clamp(13px,3.5vw,20px)",
                              padding:"clamp(4px,1vw,8px) clamp(10px,2.5vw,18px)",
                              border:"2px solid rgba(255,255,255,0.25)",
                              boxShadow:`0 2px 8px ${team.color}44`}}>
                            {team.name}{paused?" ⏸":""}
                          </span>
                        </div>
                        <span style={{width:"clamp(26px,5.5vw,42px)",textAlign:"center",color:"#475569",fontSize:"clamp(14px,3.5vw,22px)",fontWeight:700}}>{team.played}</span>
                        <span style={{width:"clamp(26px,5.5vw,42px)",textAlign:"center",color:"#16a34a",fontWeight:900,fontSize:"clamp(16px,4vw,24px)"}}>{team.wins}</span>
                        <span style={{width:"clamp(26px,5.5vw,42px)",textAlign:"center",color:"#dc2626",fontWeight:900,fontSize:"clamp(16px,4vw,24px)"}}>{team.losses}</span>
                        <span style={{width:"clamp(30px,6.5vw,50px)",textAlign:"center",fontWeight:900,fontSize:"clamp(14px,3.5vw,22px)",
                          color:diff>0?"#16a34a":diff<0?"#dc2626":"#94a3b8"}}>{diff>0?"+":""}{diff}</span>
                      </div>
                    );})}
                  </div>
                )}

                {/* ── History tab ── */}
                {activeTab==="history"&&(()=>{
                  const renderRRSnapshot=()=>{
                    if(!roundRobinStartSnapshot)return null;
                    const {startRoundNum:srn,participatingIds=[],excludedIds=[]}=roundRobinStartSnapshot;
                    const snapHist=history.filter(h=>h.roundNum<srn);
                    const snapRanked=rerank(rebuildStandings(activeTeamIds,snapHist));
                    const chip=(id,faded)=>{
                      const t=teamById(id);if(!t)return null;
                      return(
                        <span key={id} className="inline-flex items-center rounded-full font-bold"
                          style={{background:t.color,color:t.text,
                            fontSize:"clamp(11px,3vw,15px)",padding:"clamp(3px,0.8vw,6px) clamp(8px,2vw,14px)",
                            opacity:faded?0.5:1,
                            textDecoration:faded?"line-through":"none",
                            border:"2px solid rgba(255,255,255,0.2)"}}>
                          {t.name}
                        </span>
                      );
                    };
                    return(
                      <div className="rounded-2xl" style={{background:"#fff",border:"1px solid rgba(99,102,241,0.35)",overflow:"hidden",boxShadow:"0 2px 12px rgba(99,102,241,0.08)"}}>
                        <div style={{padding:"clamp(8px,2vw,12px) clamp(12px,3vw,18px)",background:"linear-gradient(90deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))",borderBottom:"1px solid rgba(99,102,241,0.2)"}}>
                          <span style={{fontSize:"clamp(10px,2.5vw,13px)",color:"#4338ca",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.08em"}}>
                            🔁 Round Robin Started{srn>1?` after Round ${srn-1}`:""}
                          </span>
                        </div>
                        {participatingIds.length>0&&(
                          <div style={{padding:"clamp(8px,2vw,12px) clamp(12px,3vw,18px)",borderBottom:"1px solid rgba(0,0,0,0.07)"}}>
                            <p style={{fontSize:"clamp(9px,2vw,11px)",color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Progressed ({participatingIds.length})</p>
                            <div className="flex flex-wrap" style={{gap:"clamp(4px,1vw,8px)"}}>
                              {participatingIds.map(id=>chip(id,false))}
                            </div>
                          </div>
                        )}
                        {excludedIds.length>0&&(
                          <div style={{padding:"clamp(8px,2vw,12px) clamp(12px,3vw,18px)",borderBottom:"1px solid rgba(0,0,0,0.07)"}}>
                            <p style={{fontSize:"clamp(9px,2vw,11px)",color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Dropped out ({excludedIds.length})</p>
                            <div className="flex flex-wrap" style={{gap:"clamp(4px,1vw,8px)"}}>
                              {excludedIds.map(id=>chip(id,true))}
                            </div>
                          </div>
                        )}
                        {snapRanked.length>0&&(
                          <div style={{padding:"clamp(8px,2vw,12px) clamp(12px,3vw,18px)"}}>
                            <p style={{fontSize:"clamp(9px,2vw,11px)",color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Standings at start of Round Robin</p>
                            <div className="rounded-xl overflow-hidden" style={{border:"1px solid rgba(0,0,0,0.08)"}}>
                              <div className="flex items-center font-bold uppercase tracking-widest"
                                style={{background:"rgba(15,76,117,0.08)",color:"#475569",
                                  padding:"clamp(5px,1.2vw,8px) clamp(8px,2vw,12px)",
                                  gap:"clamp(4px,1vw,8px)",fontSize:"clamp(8px,1.8vw,11px)"}}>
                                <span style={{width:"clamp(20px,4.5vw,32px)"}}>#</span>
                                <span className="flex-1">Team</span>
                                <span style={{width:"clamp(22px,4.5vw,34px)",textAlign:"center"}}>GP</span>
                                <span style={{width:"clamp(22px,4.5vw,34px)",textAlign:"center",color:"#16a34a"}}>W</span>
                                <span style={{width:"clamp(22px,4.5vw,34px)",textAlign:"center",color:"#dc2626"}}>L</span>
                                <span style={{width:"clamp(28px,5.5vw,42px)",textAlign:"center",color:"#0284c7"}}>+/−</span>
                              </div>
                              {snapRanked.map((team,i)=>{
                                const dropped=excludedIds.includes(team.id);
                                return(
                                  <div key={team.id} className="flex items-center"
                                    style={{padding:"clamp(5px,1.2vw,8px) clamp(8px,2vw,12px)",gap:"clamp(4px,1vw,8px)",
                                      background:i%2===0?"#fff":"#f8fafc",borderTop:"1px solid rgba(0,0,0,0.05)",
                                      opacity:dropped?0.5:1}}>
                                    <span style={{width:"clamp(20px,4.5vw,32px)",fontWeight:800,color:"#64748b",fontSize:"clamp(11px,2.5vw,14px)"}}>{i+1}</span>
                                    <div className="flex-1 min-w-0">
                                      <span className="inline-flex items-center rounded-full font-bold"
                                        style={{background:team.color,color:team.text,
                                          fontSize:"clamp(10px,2.5vw,13px)",
                                          padding:"clamp(2px,0.5vw,4px) clamp(7px,1.7vw,12px)",
                                          textDecoration:dropped?"line-through":"none"}}>
                                        {team.name}
                                      </span>
                                    </div>
                                    <span style={{width:"clamp(22px,4.5vw,34px)",textAlign:"center",color:"#475569",fontSize:"clamp(11px,2.5vw,14px)",fontWeight:700}}>{team.played}</span>
                                    <span style={{width:"clamp(22px,4.5vw,34px)",textAlign:"center",color:"#16a34a",fontWeight:800,fontSize:"clamp(11px,2.5vw,14px)"}}>{team.wins}</span>
                                    <span style={{width:"clamp(22px,4.5vw,34px)",textAlign:"center",color:"#dc2626",fontWeight:800,fontSize:"clamp(11px,2.5vw,14px)"}}>{team.losses}</span>
                                    <span style={{width:"clamp(28px,5.5vw,42px)",textAlign:"center",fontWeight:800,fontSize:"clamp(11px,2.5vw,14px)",
                                      color:team.scoreDiff>0?"#16a34a":team.scoreDiff<0?"#dc2626":"#94a3b8"}}>
                                      {team.scoreDiff>0?"+":""}{team.scoreDiff}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  };

                  const renderRREndSnapshot=()=>{
                    if(!roundRobinEndSnapshot)return null;
                    const {endRoundNum:ern,endReason}=roundRobinEndSnapshot;
                    const completed=endReason==="completed";
                    const accent=completed?"rgba(99,102,241,0.35)":"rgba(220,38,38,0.3)";
                    const bg=completed?"linear-gradient(90deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))":"linear-gradient(90deg,rgba(220,38,38,0.08),rgba(239,68,68,0.08))";
                    const textCol=completed?"#4338ca":"#b91c1c";
                    return(
                      <div className="rounded-2xl" style={{background:"#fff",border:`1px solid ${accent}`,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                        <div style={{padding:"clamp(8px,2vw,12px) clamp(12px,3vw,18px)",background:bg,borderBottom:`1px solid ${accent}`}}>
                          <span style={{fontSize:"clamp(10px,2.5vw,13px)",color:textCol,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.08em"}}>
                            {completed?"🏁 Round Robin Complete":"⛔ Round Robin Cancelled"}
                          </span>
                        </div>
                        <div style={{padding:"clamp(8px,2vw,12px) clamp(12px,3vw,18px)"}}>
                          <p style={{fontSize:"clamp(11px,2.5vw,14px)",color:"#475569",margin:0}}>
                            {ern!=null?`${completed?"Completed":"Cancelled"} after Round ${ern}. Standings carry over from this point on.`:"Cancelled before any Round Robin rounds were played."}
                          </p>
                        </div>
                      </div>
                    );
                  };

                  const showSnapshotAtTop=!!roundRobinStartSnapshot
                    &&history.every(h=>h.roundNum<(roundRobinStartSnapshot.startRoundNum||0));
                  const showEndAtTop=!!roundRobinEndSnapshot&&roundRobinEndSnapshot.endRoundNum==null;
                  const _se=[...history].map((h,ri)=>({type:"round",h,ri})).sort((a,b)=>a.h.roundNum-b.h.roundNum);
                  const _committedNums=new Set(history.map(h=>h.roundNum));
                  const _effectiveCancelled=cancelledRoundNums.filter(n=>!_committedNums.has(n));
                  const _allEntries=[..._se,..._effectiveCancelled.map(n=>({type:"cancelled",roundNum:n}))].sort((a,b)=>{const an=a.type==="round"?a.h.roundNum:a.roundNum,bn=b.type==="round"?b.h.roundNum:b.roundNum;return an-bn;});

                  return(
                  <div className="flex flex-col gap-3">
                    {history.length===0&&!roundRobinStartSnapshot&&!roundRobinEndSnapshot&&cancelledRoundNums.length===0&&<div className="text-center text-slate-400 py-8 text-sm">No rounds completed yet.</div>}
                    {showEndAtTop&&renderRREndSnapshot()}
                    {showSnapshotAtTop&&renderRRSnapshot()}
                    {_allEntries.slice().reverse().map((entry,_i)=>{
                      if(entry.type==="cancelled"){return(
                        <div key={`cancelled-${entry.roundNum}`} className="rounded-2xl flex items-center gap-3" style={{padding:"clamp(10px,2.5vw,14px) clamp(12px,3vw,18px)",background:"rgba(220,38,38,0.04)",border:"1px dashed rgba(220,38,38,0.25)"}}>
                          <span style={{fontSize:"clamp(16px,4vw,20px)"}}>✕</span>
                          <span style={{fontSize:"clamp(11px,2.5vw,14px)",color:"#dc2626",fontWeight:700}}>Round {entry.roundNum} cancelled</span>
                        </div>
                      );}
                      const {h,ri}=entry;
                      const _sfi=_se.findIndex(e=>e.ri===ri);
                      const sbf=rebuildStandings(activeTeamIds,_se.slice(0,_sfi).map(e=>e.h)),saf=rebuildStandings(activeTeamIds,_se.slice(0,_sfi+1).map(e=>e.h));
                      const rbf=rerank(sbf),raf=rerank(saf);
                      const rb=id=>rbf.findIndex(t=>t.id===id)+1, ra=id=>raf.findIndex(t=>t.id===id)+1;
                      const played=h.games.flatMap(g=>[g.winnerId,g.loserId]);
                      const hasBye=h.bye?.length>0;
                      const isFirstRR=roundRobinStartSnapshot&&h.roundNum===roundRobinStartSnapshot.startRoundNum;
                      const isLastRR=roundRobinEndSnapshot&&roundRobinEndSnapshot.endRoundNum!=null&&h.roundNum===roundRobinEndSnapshot.endRoundNum;
                      return(
                        <React.Fragment key={ri}>
                        {isLastRR&&renderRREndSnapshot()}
                        <div className="rounded-2xl" style={{background:"#fff",border:"1px solid rgba(0,0,0,0.08)",overflow:"hidden"}}>
                          <div style={{padding:"clamp(8px,2vw,12px) clamp(12px,3vw,18px)",background:"rgba(15,76,117,0.06)",borderBottom:"1px solid rgba(0,0,0,0.07)"}}>
                            <span style={{fontSize:"clamp(10px,2.5vw,13px)",color:"#0f4c75",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.08em"}}>Round {h.roundNum}</span>
                          </div>
                          <div style={{padding:"clamp(8px,2vw,12px) clamp(12px,3vw,18px)"}}>
                            {h.games.map((game,gi)=>{ const w=teamById(game.winnerId),l=teamById(game.loserId); return(
                              <div key={gi} style={{display:"grid",gridTemplateColumns:"clamp(22px,5vw,36px) 1fr clamp(22px,5vw,34px) clamp(10px,2vw,14px) clamp(22px,5vw,34px) 1fr",alignItems:"center",gap:"clamp(4px,1vw,8px)",marginBottom:gi<h.games.length-1?"clamp(6px,1.5vw,10px)":0}}>
                                <span style={{color:"#94a3b8",fontSize:"clamp(10px,2.5vw,13px)",fontWeight:700,textAlign:"center"}}>{game.courtNumber}</span>
                                <div className="flex justify-end">
                                  <span className="inline-flex items-center rounded-full font-bold"
                                    style={{background:w?.color,color:w?.text,fontSize:"clamp(11px,3vw,15px)",padding:"clamp(3px,0.8vw,6px) clamp(8px,2vw,14px)",whiteSpace:"nowrap"}}>
                                    {w?.name}
                                  </span>
                                </div>
                                <span style={{fontWeight:800,textAlign:"right",color:w?.color,fontSize:"clamp(13px,3vw,17px)"}}>{game.winnerScore}</span>
                                <span style={{color:"#cbd5e1",fontSize:"clamp(10px,2.5vw,13px)",textAlign:"center"}}>–</span>
                                <span style={{fontWeight:800,textAlign:"left",color:l?.color,fontSize:"clamp(13px,3vw,17px)"}}>{game.loserScore}</span>
                                <div className="flex justify-start">
                                  <span className="inline-flex items-center rounded-full font-bold"
                                    style={{background:l?.color,color:l?.text,fontSize:"clamp(11px,3vw,15px)",padding:"clamp(3px,0.8vw,6px) clamp(8px,2vw,14px)",whiteSpace:"nowrap"}}>
                                    {l?.name}
                                  </span>
                                </div>
                              </div>
                            );})}
                          </div>
                          {h.paused&&h.paused.length>0&&(
                            <div style={{borderTop:"1px solid rgba(0,0,0,0.07)",padding:"clamp(6px,1.5vw,10px) clamp(12px,3vw,18px)"}}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span style={{color:"#94a3b8",fontSize:"clamp(10px,2.5vw,12px)",fontWeight:700,minWidth:32}}>Paused</span>
                                {h.paused.map(id=>{const t=teamById(id);if(!t)return null;return(
                                  <span key={id} className="inline-flex items-center rounded-full font-bold"
                                    style={{background:"rgba(0,0,0,0.05)",color:"#64748b",fontSize:"clamp(11px,3vw,15px)",padding:"clamp(3px,0.8vw,6px) clamp(8px,2vw,14px)",border:"1px solid rgba(0,0,0,0.1)",textDecoration:"line-through"}}>
                                    {t.name}
                                  </span>
                                );})}
                              </div>
                            </div>
                          )}
                          {hasBye&&(
                            <div style={{borderTop:"1px solid rgba(0,0,0,0.07)",padding:"clamp(6px,1.5vw,10px) clamp(12px,3vw,18px)"}}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span style={{color:"#94a3b8",fontSize:"clamp(10px,2.5vw,12px)",fontWeight:700,minWidth:32}}>Bye</span>
                                {h.bye.map(id=>{const t=teamById(id);if(!t)return null;return(
                                  <span key={id} className="inline-flex items-center rounded-full font-bold"
                                    style={{background:t.color,color:t.text,fontSize:"clamp(11px,3vw,15px)",padding:"clamp(3px,0.8vw,6px) clamp(8px,2vw,14px)"}}>
                                    {t.name}
                                  </span>
                                );})}
                              </div>
                            </div>
                          )}
                          <div style={{borderTop:"1px solid rgba(0,0,0,0.07)",padding:"clamp(6px,1.5vw,10px) clamp(12px,3vw,18px)"}}>
                            <p style={{fontSize:"clamp(9px,2vw,11px)",color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Rankings</p>
                            <div className="flex flex-wrap" style={{gap:"clamp(8px,2vw,16px) clamp(12px,3vw,20px)"}}>
                              {played.map(id=>{ const b=rb(id),a=ra(id),d=b-a,t=teamById(id); if(!t)return null; return(
                                <div key={id} className="flex items-center gap-1" style={{fontSize:"clamp(11px,2.5vw,14px)"}}>
                                  <span style={{color:t.color,fontWeight:700}}>{t.name}</span>
                                  <span style={{color:"#94a3b8"}}>#{b}→</span>
                                  <span style={{fontWeight:700,color:d>0?"#16a34a":d<0?"#dc2626":"#94a3b8"}}>#{a}</span>
                                  {d>0&&<span style={{color:"#16a34a",fontSize:"clamp(9px,2vw,11px)"}}>▲{d}</span>}
                                  {d<0&&<span style={{color:"#dc2626",fontSize:"clamp(9px,2vw,11px)"}}>▼{Math.abs(d)}</span>}
                                </div>
                              );})}
                            </div>
                          </div>
                        </div>
                        {isFirstRR&&renderRRSnapshot()}
                        </React.Fragment>
                      );
                    })}
                  </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      );
    }

    const root=ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App/>);
