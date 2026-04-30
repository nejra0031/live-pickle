
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

    // CUSTOM_TEAMS stores ALL teams for the current tournament (including renamed colour teams).
    // teamById first checks here, so custom names take effect everywhere.
    let CUSTOM_TEAMS = [];
    const teamById = (id) => {
      const c = CUSTOM_TEAMS.find(t => t.id === id);
      if (c) return c;
      return ALL_TEAMS.find(t => t.id === id);
    };
    // registerTeams stores the full registry (including colour teams with custom names)
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
      const presets = s.nextRoundPresets ? toArr(s.nextRoundPresets) : [];
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
        nextRoundPresets:presets,
        liveAdditions:liveAdds,
        cancelledRoundNums:cancelled,
        tournamentFinished:!!s.tournamentFinished };
    }

    // ─── Persistence ────────────────────────────────────────────────────────
    const SAVE_KEY = "pickleball_tournament_v1";
    function saveState(s){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(s)); }catch(e){} }
    function loadState(){ try{ const r=localStorage.getItem(SAVE_KEY); return r?JSON.parse(r):null; }catch(e){ return null; } }
    function clearSave(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }

    // ─── Alarm ──────────────────────────────────────────────────────────────
    let _audioCtx=null;
    function getAudioCtx(){ if(!_audioCtx||_audioCtx.state==="closed") _audioCtx=new(window.AudioContext||window.webkitAudioContext)(); return _audioCtx; }

    // Short double-beep warning (played at 3 min and 1 min remaining)
    function playWarningBeep(){
      try{
        const ctx=getAudioCtx();
        const fire=()=>{
          for(let i=0;i<2;i++){
            const osc=ctx.createOscillator(),gain=ctx.createGain();
            osc.connect(gain);gain.connect(ctx.destination);
            osc.type="sine";osc.frequency.value=880;
            const t=ctx.currentTime+i*0.28;
            gain.gain.setValueAtTime(0,t);
            gain.gain.linearRampToValueAtTime(0.6,t+0.01);
            gain.gain.exponentialRampToValueAtTime(0.001,t+0.2);
            osc.start(t);osc.stop(t+0.22);
          }
        };
        ctx.state==="suspended"?ctx.resume().then(fire):fire();
      }catch(e){}
    }

    // Long, very loud round-end siren
    function playAlarm(){
      try{
        const ctx=getAudioCtx();
        const fire=()=>{
          // Three long descending blasts — loud and unmistakable
          const blasts=[
            {freq:1200,dur:0.55,gap:0.15},
            {freq:900, dur:0.55,gap:0.15},
            {freq:600, dur:0.9, gap:0},
          ];
          let t=ctx.currentTime+0.05;
          blasts.forEach(({freq,dur,gap})=>{
            const osc=ctx.createOscillator(),gain=ctx.createGain();
            // Add a second osc for richness
            const osc2=ctx.createOscillator();
            osc.connect(gain);osc2.connect(gain);gain.connect(ctx.destination);
            osc.type="sawtooth";osc.frequency.value=freq;
            osc2.type="square";osc2.frequency.value=freq*1.5;
            gain.gain.setValueAtTime(0,t);
            gain.gain.linearRampToValueAtTime(1.0,t+0.02);
            gain.gain.setValueAtTime(1.0,t+dur-0.08);
            gain.gain.exponentialRampToValueAtTime(0.001,t+dur);
            osc.start(t);osc.stop(t+dur);
            osc2.start(t);osc2.stop(t+dur);
            t+=dur+gap;
          });
        };
        ctx.state==="suspended"?ctx.resume().then(fire):fire();
      }catch(e){}
    }
    function warmUpAudio(){ try{ getAudioCtx(); }catch(e){} }

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

    function combinations(arr,k){
      if(k===0)return[[]]; if(arr.length<k)return [];
      const[f,...r]=arr; return [...combinations(r,k-1).map(c=>[f,...c]),...combinations(r,k)];
    }
    function buildMatchupCounts(history){
      const c={};
      history.forEach(rd=>rd.games.forEach(g=>{ const key=[g.winnerId,g.loserId].sort().join("|"); c[key]=(c[key]||0)+1; }));
      return c;
    }
    function getLastRoundMatchups(history){
      if(!history.length)return new Set();
      const s=new Set(); history[history.length-1].games.forEach(g=>s.add([g.winnerId,g.loserId].sort().join("|"))); return s;
    }
    function buildByeCounts(history){
      const solo={},pairs={};
      history.forEach(rd=>{ const ids=rd.bye||[];
        ids.forEach(id=>{ solo[id]=(solo[id]||0)+1; });
        for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){ const k=[ids[i],ids[j]].sort().join("|"); pairs[k]=(pairs[k]||0)+1; }
      });
      return{solo,pairs};
    }
    function scoreByeGroup(ids,{solo,pairs}){
      let ps=0,ss=0;
      for(let i=0;i<ids.length;i++){ ss+=solo[ids[i]]||0; for(let j=i+1;j<ids.length;j++){ const k=[ids[i],ids[j]].sort().join("|"); ps+=pairs[k]||0; } }
      return ps*1000+ss;
    }

    // ── Cross-group matching helpers ─────────────────────────────────────────
    function scoreCourtPairings(courts, mc, lrm){
      let s=0;
      courts.forEach(([a,b])=>{
        const k=[a.id,b.id].sort().join("|");
        if(lrm.has(k))s+=100000;
        s+=(mc[k]||0)*1000;
      });
      return s;
    }

    // Main pairing function
    function pairBottomUp(playing, allStandings, mc, lrm, isFirstRound){
      if(isFirstRound){
        const shuffled=[...playing].sort(()=>Math.random()-0.5);
        const def=[];
        for(let c=0;c<Math.floor(shuffled.length/2);c++){
          def.push([shuffled[c*2],shuffled[c*2+1]]);
        }
        return def;
      }

      const ranked=rerank(allStandings);
      const rankOf=id=>{ const i=ranked.findIndex(t=>t.id===id); return i===-1?9999:i; };

      // No constraint — simple bottom-up
      const byRankWorstFirst=[...playing].sort((a,b)=>rankOf(b.id)-rankOf(a.id));
      const def=[];
      for(let c=0;c<Math.floor(byRankWorstFirst.length/2);c++){
        def.push([byRankWorstFirst[c*2],byRankWorstFirst[c*2+1]]);
      }
      // Swap pass: fix last-round repeat matchups
      let best=def, bs=scoreCourtPairings(def,mc,lrm);
      for(let c=0;c<def.length-1;c++){
        const s1=def.map(p=>[...p]); [s1[c][1],s1[c+1][0]]=[s1[c+1][0],s1[c][1]];
        const sc1=scoreCourtPairings(s1,mc,lrm); if(sc1<bs){bs=sc1;best=s1;}
        const s2=def.map(p=>[...p]); [s2[c][1],s2[c+1][1]]=[s2[c+1][1],s2[c][1]];
        const sc2=scoreCourtPairings(s2,mc,lrm); if(sc2<bs){bs=sc2;best=s2;}
      }
      return best;
    }

    function generateRound(allSt,numCourts,roundIdx,history=[],pausedIds=[],finalRound=false){
      const pSet=new Set(pausedIds);
      const active=allSt.filter(t=>!pSet.has(t.id));
      const mc=buildMatchupCounts(history), lrm=getLastRoundMatchups(history);
      const lastByeSet=history.length>0?new Set(history[history.length-1].bye||[]):new Set();
      const isFirstRound=history.length===0;

      // Determine effective court count (final round mode)
      let ec=numCourts;
      if(finalRound&&active.length>0){
        const minP=Math.min(...active.map(t=>t.played));
        const need=active.filter(t=>t.played===minP);
        if(need.length<active.length){ ec=Math.min(numCourts,Math.floor(need.length/2)); if(ec===0)ec=1; }
      }

      // ── STEP 1: Byes ─────────────────────────────────────────────────────────
      const numBye=active.length-ec*2;

      if(numBye<=0){
        return{
          courts:pairBottomUp(active,allSt,mc,lrm,isFirstRound),
          bye:[],
          paused:allSt.filter(t=>pSet.has(t.id))
        };
      }

      const byeCounts=buildByeCounts(history);
      const hadBye=active.filter(t=>lastByeSet.has(t.id));
      const didnt=active.filter(t=>!lastByeSet.has(t.id));

      function scoreByeSelection(proposed){
        return scoreByeGroup(proposed.map(t=>t.id),byeCounts);
      }

      let byeGroup=[];
      if(isFirstRound){
        const shuffled=[...active].sort(()=>Math.random()-0.5);
        byeGroup=shuffled.slice(0,numBye);
      }else if(didnt.length>=numBye){
        const byMostPlayed=[...didnt].sort((a,b)=>b.played-a.played);
        let idx=0;
        while(byeGroup.length<numBye&&idx<byMostPlayed.length){
          const cur=byMostPlayed[idx].played, tier=[];
          while(idx<byMostPlayed.length&&byMostPlayed[idx].played===cur) tier.push(byMostPlayed[idx++]);
          const sl=numBye-byeGroup.length;
          if(tier.length<=sl){
            byeGroup.push(...tier);
          } else {
            const cs=combinations(tier,sl);
            let bc=cs[0], bestBs=Infinity;
            for(const c of cs){
              const sc=scoreByeSelection([...byeGroup,...c]);
              if(sc<bestBs){bestBs=sc;bc=c;}
            }
            byeGroup.push(...bc);
          }
        }
      } else {
        byeGroup=[...didnt];
        byeGroup.push(...[...hadBye].sort((a,b)=>b.played-a.played).slice(0,numBye-byeGroup.length));
      }

      // ── STEP 2: Pair playing teams ────────────────────────────────────────────
      const byeSet=new Set(byeGroup.map(t=>t.id));
      const playing=active.filter(t=>!byeSet.has(t.id));

      return{
        courts:pairBottomUp(playing,allSt,mc,lrm,isFirstRound),
        bye:byeGroup,
        paused:allSt.filter(t=>pSet.has(t.id))
      };
    }

    // ─── Round-Robin schedule generator ─────────────────────────────────────
    // Circle-method round-robin → flattened into court-sized scheduling rounds.
    // Returns array of scheduling rounds; each is an array of [teamIdA, teamIdB] pairs.
    function generateRoundRobinSchedule(teamIds, numCourts){
      if(!teamIds||teamIds.length<2)return[];
      const teams=[...teamIds];
      const odd=teams.length%2===1;
      if(odd)teams.push(null); // placeholder to handle odd count
      const n=teams.length;
      const naturalRounds=[];
      for(let r=0;r<n-1;r++){
        const matches=[];
        for(let i=0;i<n/2;i++){
          const a=teams[i], b=teams[n-1-i];
          if(a&&b)matches.push([a,b]);
        }
        naturalRounds.push(matches);
        // rotate keeping teams[0] fixed
        teams.splice(1,0,teams.pop());
      }
      const courts=Math.max(1,numCourts||1);
      const scheduledRounds=[];
      for(const matches of naturalRounds){
        for(let i=0;i<matches.length;i+=courts){
          scheduledRounds.push(matches.slice(i,i+courts));
        }
      }
      return scheduledRounds;
    }

    // ─── Helpers ────────────────────────────────────────────────────────────
    const ORDINAL=n=>{const s=["th","st","nd","rd"],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);};
    function TeamChip({teamId}){
      const t=teamById(teamId); if(!t)return null;
      return <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold"
        style={{background:t.color,color:t.text,border:"2px solid rgba(255,255,255,0.15)"}}>{t.name}</span>;
    }
    function NumInput({value,onChange}){
      return <input type="number" min={0} max={99} value={value}
        onChange={e=>onChange(e.target.value===""?"":Number(e.target.value))}
        style={{width:"clamp(44px,11vw,64px)",textAlign:"center",padding:"clamp(5px,1.5vw,9px) 0",
          background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.15)",
          borderRadius:8,color:"#1e293b",fontWeight:800,fontSize:"clamp(14px,3.5vw,20px)",outline:"none"}}/>;
    }

    // ─── PIN Modal ───────────────────────────────────────────────────────────
    function PinModal({title="Admin PIN",correctPin,pinLoaded,onSuccess,onClose}){
      const[pin,setPin]=useState(""); const[err,setErr]=useState(false);
      const check=()=>{
        if(!pinLoaded)return;
        if(!correctPin){setErr(true);setTimeout(()=>setErr(false),1200);return;}
        if(pin===String(correctPin))onSuccess();
        else{setErr(true);setPin("");setTimeout(()=>setErr(false),1200);}
      };
      return(
        <div className="modal-overlay" onClick={onClose}>
          <div className="rounded-2xl p-6 w-full max-w-xs flex flex-col gap-4" style={{background:"#1e293b",border:`1px solid ${err?"#ef4444":"rgba(99,102,241,0.4)"}`}} onClick={e=>e.stopPropagation()}>
            <div className="text-center"><div className="text-2xl mb-1">🔐</div><div className="text-sm font-bold text-indigo-300">{title}</div>{err&&<div className="text-xs text-red-400 mt-1">Incorrect PIN</div>}</div>
            {!pinLoaded
              ? <div style={{textAlign:"center",color:"#64748b",fontSize:13,padding:"8px 0"}}>Loading…</div>
              : <input type="password" inputMode="numeric" maxLength={4} value={pin} placeholder="••••" onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==="Enter"&&check()} autoFocus
                  style={{textAlign:"center",padding:"10px",borderRadius:10,fontSize:20,letterSpacing:6,background:"rgba(255,255,255,0.07)",border:`1px solid ${err?"#ef4444":"rgba(255,255,255,0.15)"}`,color:"#e2e8f0",outline:"none"}}/>
            }
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
              <button onClick={check} disabled={!pinLoaded} className="flex-1 py-2 rounded-xl text-sm font-bold" style={{background:pinLoaded?"linear-gradient(90deg,#6366f1,#8b5cf6)":"rgba(255,255,255,0.08)",color:pinLoaded?"#fff":"#475569",cursor:pinLoaded?"pointer":"not-allowed"}}>Unlock</button>
            </div>
          </div>
        </div>
      );
    }

    // ─── Timer Settings Modal ────────────────────────────────────────────────
    function TimerSettingsModal({currentMins,onSave,onClose}){
      const[mins,setMins]=useState(currentMins);
      return(
        <div className="modal-overlay" onClick={onClose}>
          <div className="rounded-2xl p-6 w-full max-w-xs flex flex-col gap-4 modal-box"  onClick={e=>e.stopPropagation()}>
            <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">⚙️ Timer Settings</div>
            <div className="flex items-center gap-3">
              <input type="number" min={1} max={99} value={mins} onChange={e=>setMins(Math.max(1,Number(e.target.value)))}
                style={{width:70,textAlign:"center",padding:"8px",borderRadius:8,fontSize:18,fontWeight:700,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.2)",color:"#e2e8f0",outline:"none"}}/>
              <span className="text-slate-400 text-sm">minutes per round</span>
            </div>
            <p className="text-slate-500 text-xs">Applies after next ↺ reset.</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
              <button onClick={()=>{onSave(mins);onClose();}} className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo" >Save</button>
            </div>
          </div>
        </div>
      );
    }

    // ─── Break Modal ─────────────────────────────────────────────────────────
    function BreakModal({onStart,onClose}){
      const[message,setMessage]=useState("Taking a short break!");
      const[mins,setMins]=useState(5);
      const valid=message.trim()&&mins>=1;
      return(
        <div className="modal-overlay" onClick={onClose}>
          <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4" style={{background:"#1e293b",border:"1px solid rgba(251,191,36,0.4)"}} onClick={e=>e.stopPropagation()}>
            <div className="text-sm font-bold uppercase tracking-widest" style={{color:"#fbbf24"}}>☕ Start Break</div>
            <div>
              <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wide">Message (shown above games)</p>
              <input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Break message…"
                style={{width:"100%",padding:"8px 12px",borderRadius:10,fontSize:14,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.15)",color:"#e2e8f0",outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wide">Duration (minutes)</p>
              <input type="number" value={mins} min={1} max={120} onChange={e=>setMins(Math.max(1,Number(e.target.value)))}
                style={{width:"100%",padding:"8px 12px",borderRadius:10,fontSize:14,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.15)",color:"#e2e8f0",outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
              <button onClick={()=>valid&&onStart(message.trim(),mins*60)} disabled={!valid} className="flex-1 py-2 rounded-xl text-sm font-bold btn-amber"
                >
                Start Break ☕
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ─── Compact timer bar ───────────────────────────────────────────────────
    function RoundTimer({secsLeft,totalSecs,roundNum,timerRunning,isAdmin,onToggle,onRestart,onOpenSettings,breakInfo,onEndBreak}){
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
            {isAdmin&&<button onClick={onEndBreak}
              style={{fontSize:"clamp(10px,2.5vw,13px)",padding:"clamp(4px,1vw,7px) clamp(8px,2vw,12px)",borderRadius:8,fontWeight:700,cursor:"pointer",
                background:"rgba(251,191,36,0.2)",color:"#92400e",border:"1px solid rgba(251,191,36,0.5)"}}>
              End Break
            </button>}
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
          {isAdmin&&(
            <div className="flex" style={{gap:"clamp(4px,1vw,8px)"}}>
              <button onClick={onToggle}
                style={{fontSize:"clamp(11px,2.5vw,14px)",padding:"clamp(4px,1vw,7px) clamp(8px,2vw,12px)",borderRadius:8,fontWeight:700,cursor:"pointer",
                  background:timerRunning?"rgba(220,38,38,0.1)":"rgba(15,76,117,0.1)",
                  color:timerRunning?"#dc2626":"#0f4c75",
                  border:`1px solid ${timerRunning?"rgba(220,38,38,0.25)":"rgba(15,76,117,0.25)"}`}}>
                {timerRunning?"⏸":"▶"}
              </button>
              <button onClick={onRestart}
                style={{fontSize:"clamp(11px,2.5vw,14px)",padding:"clamp(4px,1vw,7px) clamp(8px,2vw,12px)",borderRadius:8,fontWeight:700,cursor:"pointer",background:"rgba(0,0,0,0.05)",color:"#64748b",border:"1px solid rgba(0,0,0,0.1)"}}>↺</button>
              <button onClick={onOpenSettings}
                style={{fontSize:"clamp(11px,2.5vw,14px)",padding:"clamp(4px,1vw,7px) clamp(8px,2vw,12px)",borderRadius:8,fontWeight:700,cursor:"pointer",background:"rgba(0,0,0,0.05)",color:"#64748b",border:"1px solid rgba(0,0,0,0.1)"}}>⚙</button>
            </div>
          )}
        </div>
      );
    }

    // ─── Play-tab Timer Widget ────────────────────────────────────────────────
    // Sits at the top of the Play tab. Sized to fit comfortably on a phone/tablet
    // without taking over the whole screen — ring is 55vw max 280px.
    function FullScreenTimer({secsLeft,totalSecs,roundNum,timerRunning,isAdmin,timerDuration,onToggle,onRestart,onOpenSettings}){
      const mins=Math.floor(secsLeft/60),secs=secsLeft%60;
      const pct=totalSecs>0?secsLeft/totalSecs:1;
      const expired=secsLeft===0,urgent=pct<0.2&&!expired;
      const color=expired?"#dc2626":urgent?"#ea580c":"#0f4c75";
      const SZ=500,SW=24,R=218,cx=250,cy=250;
      const circ=2*Math.PI*R;
      return(
        <div className="flex flex-col items-center" style={{gap:"clamp(8px,2vw,16px)",paddingTop:"clamp(4px,1vw,8px)"}}>
          {/* Ring */}
          <div style={{position:"relative",width:"min(55vw,280px)",aspectRatio:"1"}}>
            <svg viewBox={`0 0 ${SZ} ${SZ}`} width="100%" height="100%" style={{display:"block"}}>
              <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={SW}/>
              <circle cx={cx} cy={cy} r={R} fill="none" stroke={color} strokeWidth={SW}
                strokeDasharray={circ} strokeDashoffset={-circ*(1-pct)} strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{transition:"stroke-dashoffset 1s linear,stroke 0.4s"}}/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:`${SW+8}px`}}>
              <div style={{
                fontFamily:"'Courier New',monospace",
                fontSize:expired?"clamp(18px,6vw,38px)":"clamp(32px,10vw,72px)",
                fontWeight:900,color,lineHeight:1,
                letterSpacing:expired?1:3,
                transition:"color 0.4s",textAlign:"center",
              }}>
                {expired?"TIME'S UP":`${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`}
              </div>
            </div>
          </div>
          {/* Admin controls */}
          {isAdmin&&(
            <div className="flex flex-wrap justify-center" style={{gap:"clamp(6px,1.5vw,10px)"}}>
              <button onClick={onToggle}
                style={{padding:"clamp(8px,2vw,12px) clamp(16px,4vw,28px)",borderRadius:12,fontWeight:800,
                  fontSize:"clamp(12px,3vw,16px)",cursor:"pointer",
                  background:timerRunning?"rgba(220,38,38,0.1)":"rgba(15,76,117,0.1)",
                  color:timerRunning?"#dc2626":"#0f4c75",
                  border:`2px solid ${timerRunning?"rgba(220,38,38,0.25)":"rgba(15,76,117,0.25)"}`}}>
                {timerRunning?"⏸ Pause":"▶ Resume"}
              </button>
              <button onClick={onRestart}
                style={{padding:"clamp(8px,2vw,12px) clamp(12px,3vw,20px)",borderRadius:12,fontWeight:800,
                  fontSize:"clamp(12px,3vw,16px)",cursor:"pointer",background:"rgba(0,0,0,0.05)",color:"#64748b",border:"1px solid rgba(0,0,0,0.1)"}}>
                ↺ Reset
              </button>
              <button onClick={onOpenSettings}
                style={{padding:"clamp(8px,2vw,12px) clamp(12px,3vw,20px)",borderRadius:12,fontWeight:800,
                  fontSize:"clamp(12px,3vw,16px)",cursor:"pointer",background:"rgba(0,0,0,0.05)",color:"#64748b",border:"1px solid rgba(0,0,0,0.1)"}}>
                ⚙
              </button>
            </div>
          )}
          {timerDuration===0&&<div style={{color:"#94a3b8",fontSize:"clamp(11px,2.5vw,14px)",textAlign:"center"}}>No timer — enable in ⚙ settings.</div>}
        </div>
      );
    }

    // ─── CourtCard ───────────────────────────────────────────────────────────
    function CourtCard({courtLabel,teams,onResult,done}){
      const[s0,setS0]=useState(""), [s1,setS1]=useState("");
      const valid=s0!==""&&s1!==""&&Number(s0)!==Number(s1);
      const wIdx=valid?(Number(s0)>Number(s1)?0:1):null;
      const confirm=()=>{ if(!valid)return; const w=teams[wIdx],l=teams[1-wIdx];
        onResult({winnerId:w.id,loserId:l.id,winnerScore:wIdx===0?Number(s0):Number(s1),loserScore:wIdx===0?Number(s1):Number(s0)}); };
      if(done)return(
        <div className="rounded-2xl flex items-center gap-3"
          style={{padding:"clamp(10px,2.5vw,16px)",background:"#f0fdf4",border:"1px solid rgba(34,197,94,0.3)"}}>
          <span style={{color:"#16a34a",fontSize:"clamp(16px,4vw,22px)"}}>✓</span>
          <span style={{color:"#475569",fontSize:"clamp(12px,3vw,15px)"}}>{courtLabel} result logged</span>
        </div>
      );
      return(
        <div className="rounded-2xl flex flex-col"
          style={{padding:"clamp(12px,3vw,20px)",gap:"clamp(8px,2vw,14px)",background:"#fff",border:"1px solid rgba(0,0,0,0.1)",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
          <div className="flex items-center gap-2">
            <span style={{color:"#0f4c75",fontWeight:800,fontSize:"clamp(10px,2.5vw,13px)",textTransform:"uppercase",letterSpacing:"0.08em"}}>{courtLabel}</span>
            <div className="flex-1 h-px" style={{background:"rgba(0,0,0,0.08)"}}/>
          </div>
          {teams.map((team,i)=>{ const iw=wIdx===i; return(
            <div key={team.id}>
              <div className="flex items-center" style={{gap:"clamp(6px,1.5vw,12px)"}}>
                <div className="flex-1 flex items-center rounded-xl"
                  style={{gap:"clamp(6px,1.5vw,10px)",padding:"clamp(8px,2vw,14px) clamp(10px,2.5vw,16px)",
                    background:iw?team.color:"rgba(0,0,0,0.03)",border:`1.5px solid ${iw?team.color:"rgba(0,0,0,0.08)"}`}}>
                  <div style={{width:"clamp(10px,2.5vw,14px)",height:"clamp(10px,2.5vw,14px)",borderRadius:"50%",flexShrink:0,
                    background:team.color,boxShadow:iw?"none":`0 0 0 2px ${team.color}44`}}/>
                  <span style={{fontWeight:800,fontSize:"clamp(14px,3.5vw,20px)",flex:1,color:iw?team.text:"#1e293b"}}>{team.name}</span>
                  {iw&&<span style={{fontSize:"clamp(10px,2.5vw,13px)",fontWeight:700,color:team.text}}>WIN</span>}
                </div>
                <NumInput value={i===0?s0:s1} onChange={i===0?setS0:setS1}/>
              </div>
              {i===0&&<div style={{textAlign:"center",color:"#94a3b8",fontSize:"clamp(10px,2.5vw,13px)",fontWeight:700,margin:"clamp(3px,0.8vw,6px) 0"}}>VS</div>}
            </div>
          );})}
          {s0!==""&&s1!==""&&!valid&&<p style={{fontSize:"clamp(10px,2.5vw,13px)",color:"#d97706",textAlign:"center"}}>Scores cannot be equal.</p>}
          <button onClick={confirm} disabled={!valid}
            style={{width:"100%",padding:"clamp(10px,2.5vw,14px)",borderRadius:12,fontWeight:800,
              fontSize:"clamp(13px,3.5vw,18px)",cursor:valid?"pointer":"not-allowed",
              background:valid?"linear-gradient(90deg,#0f4c75,#1a6fa8)":"rgba(0,0,0,0.05)",
              color:valid?"#fff":"#94a3b8",border:valid?"none":"1px solid rgba(0,0,0,0.07)"}}>
            {valid?`✓ Confirm — ${teams[wIdx].name} wins`:"Enter scores to confirm"}
          </button>
        </div>
      );
    }

    // ─── EditGameModal — change teams AND scores for a historical game ─────────
    // When teams change, byes for that round are recomputed so history stays consistent.
    function EditGameModal({game,roundEntry,allTeamIds,label,onSave,onClose}){
      const[teamAId,setTeamAId]=useState(game.winnerId);
      const[teamBId,setTeamBId]=useState(game.loserId);
      const[scoreA,setScoreA]=useState(game.winnerScore);
      const[scoreB,setScoreB]=useState(game.loserScore);

      const teamA=teamById(teamAId), teamB=teamById(teamBId);
      const scoresValid=scoreA!==""&&scoreB!==""&&Number(scoreA)!==Number(scoreB);
      const teamsValid=teamAId&&teamBId&&teamAId!==teamBId;
      const valid=scoresValid&&teamsValid;
      const aWins=valid&&Number(scoreA)>Number(scoreB);
      const newWinnerId=valid?(aWins?teamAId:teamBId):null;
      const newLoserId =valid?(aWins?teamBId:teamAId):null;
      const newWinnerScore=valid?Math.max(Number(scoreA),Number(scoreB)):null;
      const newLoserScore =valid?Math.min(Number(scoreA),Number(scoreB)):null;
      const teamsChanged=teamAId!==game.winnerId||teamBId!==game.loserId;

      // Teams playing in OTHER games of this round — used only to recompute byes, not to restrict selection.
      // Admin can pick ANY team (including paused / bye teams) to correct a mistake.
      const lockedIds=new Set(roundEntry.games.flatMap(g=>[g.winnerId,g.loserId]).filter(id=>id!==game.winnerId&&id!==game.loserId));
      // All teams are eligible — no restrictions
      const eligible=allTeamIds;

      const save=()=>{
        if(!valid)return;
        // Recompute byes: everyone not playing any game after the edit, excluding paused teams
        const playingAfter=new Set([...lockedIds,teamAId,teamBId]);
        const pausedInRound=new Set(toArr(roundEntry.paused||[]));
        const newBye=allTeamIds.filter(id=>!playingAfter.has(id)&&!pausedInRound.has(id));
        onSave({game:{winnerId:newWinnerId,loserId:newLoserId,winnerScore:newWinnerScore,loserScore:newLoserScore,courtNumber:game.courtNumber},newBye});
      };

      const chipBtn=(id,active,onClick)=>{
        const t=teamById(id); if(!t)return null;
        return(
          <button key={id} onClick={onClick}
            style={{padding:"5px 10px",borderRadius:999,fontSize:12,fontWeight:700,cursor:"pointer",
              background:active?t.color+"bb":"rgba(255,255,255,0.05)",
              color:active?t.text:"#64748b",
              border:`2px solid ${active?t.color:"rgba(255,255,255,0.1)"}`}}>
            {t.name}
          </button>
        );
      };

      return(
        <div className="modal-overlay" onClick={onClose}>
          <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 my-4 modal-box"  onClick={e=>e.stopPropagation()}>
            <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">{label} — Edit</div>

            {/* Team A */}
            <div>
              <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Team A</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
                {eligible.map(id=>chipBtn(id,teamAId===id,()=>{ setTeamAId(id); if(teamBId===id)setTeamBId(teamAId); }))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{background:teamA?`${teamA.color}22`:"rgba(255,255,255,0.04)",border:`1.5px solid ${teamA?teamA.color:"rgba(255,255,255,0.1)"}`}}>
                {teamA&&<div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:teamA.color}}/>}
                <span className="font-bold text-sm flex-1">{teamA?.name||"—"}</span>
              </div>
              <NumInput value={scoreA} onChange={setScoreA}/>
            </div>

            <div className="text-center text-slate-600 text-xs font-bold my-0.5">VS</div>

            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{background:teamB?`${teamB.color}22`:"rgba(255,255,255,0.04)",border:`1.5px solid ${teamB?teamB.color:"rgba(255,255,255,0.1)"}`}}>
                {teamB&&<div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:teamB.color}}/>}
                <span className="font-bold text-sm flex-1">{teamB?.name||"—"}</span>
              </div>
              <NumInput value={scoreB} onChange={setScoreB}/>
            </div>

            {/* Team B */}
            <div>
              <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Team B</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
                {eligible.map(id=>chipBtn(id,teamBId===id,()=>{ setTeamBId(id); if(teamAId===id)setTeamAId(teamBId); }))}
              </div>
            </div>

            {teamsChanged&&<div className="notice-amber">⚠️ Teams changed — byes for this round will be recalculated.</div>}
            {valid&&newWinnerId&&<p className="text-xs text-green-400 text-center">→ {teamById(newWinnerId)?.name} wins {newWinnerScore}–{newLoserScore}</p>}
            {!scoresValid&&scoreA!==""&&scoreB!==""&&<p className="text-xs text-amber-400 text-center">Scores can't be equal.</p>}
            {!teamsValid&&teamAId===teamBId&&<p className="text-xs text-amber-400 text-center">Teams must be different.</p>}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
              <button onClick={save} disabled={!valid} className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo"
                >Save</button>
            </div>
          </div>
        </div>
      );
    }

    // ─── EditActiveCourtModal — change teams and/or court for an ongoing game ──
    function EditActiveCourtModal({courtIdx,courtNumbers,currentCourts,allTeamIds,hasPending,usedCourtNumbers=[],onSave,onClose}){
      const cur=currentCourts[courtIdx]||[];
      const currentCourtNum=courtNumbers[courtIdx]??courtIdx+1;
      const[teamAId,setTeamAId]=useState(cur[0]?.id||"");
      const[teamBId,setTeamBId]=useState(cur[1]?.id||"");
      const[selCourt,setSelCourt]=useState(currentCourtNum);
      // Teams locked on OTHER courts (admin can still pick them to correct a mistake)
      const otherIds=new Set(currentCourts.flatMap((p,i)=>i!==courtIdx?p.map(t=>t.id):[]));
      // Courts locked by live additions — can't move a game there (would create a duplicate court label)
      const liveCourtSet=new Set(usedCourtNumbers.map(String));
      const eligible=allTeamIds;
      const teamsValid=teamAId&&teamBId&&teamAId!==teamBId;
      const newCourtIdx=courtNumbers.indexOf(selCourt);
      const save=()=>{ if(!teamsValid)return; onSave({courtIdx,teamAId,teamBId,newCourtIdx:newCourtIdx>=0?newCourtIdx:courtIdx}); };
      const chip=(id,active,onClick)=>{
        const t=teamById(id); if(!t)return null;
        const warn=active?false:otherIds.has(id);
        return(<button key={id} onClick={onClick}
          style={{padding:"5px 10px",borderRadius:999,fontSize:12,fontWeight:700,cursor:"pointer",
            background:active?t.color+"bb":warn?"rgba(220,38,38,0.08)":"rgba(255,255,255,0.05)",
            color:active?t.text:warn?"#dc2626":"#64748b",
            border:`2px solid ${active?t.color:warn?"rgba(220,38,38,0.3)":"rgba(255,255,255,0.1)"}`}}>
          {t.name}{warn?" ⚠":""}
        </button>);
      };
      return(
        <div className="modal-overlay" onClick={onClose}>
          <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 my-4 modal-box"  onClick={e=>e.stopPropagation()}>
            <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">Court {currentCourtNum} — Edit</div>
            {hasPending&&<div className="notice-amber">⚠️ Entered score will be cleared.</div>}
            <div>
              <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Court</p>
              <div className="flex flex-wrap gap-1.5">
                {courtNumbers.map(cn=>{
                  const sel=selCourt===cn;
                  const locked=liveCourtSet.has(String(cn))&&String(cn)!==String(currentCourtNum);
                  return(<button key={cn} onClick={locked?undefined:()=>setSelCourt(cn)} disabled={locked}
                    title={locked?"This court already has a live game added to it":undefined}
                    style={{padding:"5px 10px",borderRadius:999,fontSize:12,fontWeight:700,cursor:locked?"not-allowed":"pointer",
                      opacity:locked?0.4:1,
                      background:sel?"rgba(99,102,241,0.7)":"rgba(255,255,255,0.05)",
                      color:sel?"#fff":"#64748b",
                      border:`2px solid ${sel?"#6366f1":"rgba(255,255,255,0.1)"}`}}>Court {cn}{locked?" 🔒":""}</button>);
                })}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Team A</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
                {eligible.map(id=>chip(id,teamAId===id,()=>{setTeamAId(id);if(teamBId===id)setTeamBId(teamAId);}))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Team B</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
                {eligible.map(id=>chip(id,teamBId===id,()=>{setTeamBId(id);if(teamAId===id)setTeamAId(teamBId);}))}
              </div>
            </div>
            {!teamsValid&&teamAId===teamBId&&<p className="text-xs text-amber-400 text-center">Teams must be different.</p>}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
              <button onClick={save} disabled={!teamsValid} className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo"
                >Save</button>
            </div>
          </div>
        </div>
      );
    }

    // ─── Setup Screen ────────────────────────────────────────────────────────
    // Named Teams textarea removed. Rename via ✏️ chip inline editor.
    // FIX: customName is now stored in the team object that goes into teamRegistry,
    //      so Firebase and CUSTOM_TEAMS always reflect the actual display name.
    function SetupScreen({onStart}){
      const[colorTeams,setColorTeams]=useState(
        ALL_TEAMS.map(t=>({...t,selected:false,customName:t.name}))
      );
      const[editingId,setEditingId]=useState(null);
      const[courts,setCourts]=useState([]);
      const[courtInput,setCourtInput]=useState("");
      const[timerMins,setTimerMins]=useState(12);
      const[timerEnabled,setTimerEnabled]=useState(true);
      const[title,setTitle]=useState("Tournament");

      // Build full team objects with customName → name
      // These go into teamRegistry so CUSTOM_TEAMS always has the right names.
      const selectedTeams=colorTeams.filter(t=>t.selected).map(t=>({id:t.id,name:t.customName||t.name,color:t.color,text:t.text}));
      const allTeamIds=selectedTeams.map(t=>t.id);

      const PRESET=["1","2","3","4","5","6","7","8","9","10","11","12"];
      const addCourt=()=>{ const v=courtInput.trim(); if(!v||courts.includes(v)){setCourtInput("");return;} setCourts(p=>[...p,v]); setCourtInput(""); };
      const toggleCourt=v=>{ if(courts.includes(v)){setCourts(p=>p.filter(x=>x!==v));}
        else setCourts(p=>[...p,v].sort((a,b)=>{const na=Number(a),nb=Number(b);return(na&&nb)?na-nb:a.localeCompare(b);})); };

      const canStart=allTeamIds.length>=3&&courts.length>=1;
      const iS={padding:"6px 10px",borderRadius:8,fontSize:13,fontWeight:700,background:"rgba(255,255,255,0.7)",border:"1px solid rgba(0,0,0,0.12)",color:"#1e293b",outline:"none"};

      return(
        <div className="rounded-2xl p-6 flex flex-col gap-6" style={{background:"rgba(255,255,255,0.5)",border:"1px solid rgba(255,255,255,0.7)",backdropFilter:"blur(8px)"}}>
          <div>
            <p className="text-sm font-bold text-slate-700 mb-1">Tournament Name</p>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Tournament"
              style={{...iS,width:"100%",fontSize:15,fontWeight:800,color:"#0f4c75",background:"rgba(255,255,255,0.7)",border:"1px solid rgba(15,76,117,0.2)"}}/>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700 mb-1">Teams</p>
            <p className="text-slate-500 text-xs mb-3">Tap to select · Tap ✏️ to rename</p>
            <div className="flex flex-wrap gap-2">
              {colorTeams.map(t=>{
                const sel=t.selected, editing=editingId===t.id;
                return(
                  <div key={t.id}>
                    {editing?(
                      <div className="flex items-center gap-1 rounded-full px-2 py-1" style={{background:t.color,border:`2px solid ${t.color}`}}>
                        <input autoFocus value={t.customName}
                          onChange={e=>setColorTeams(p=>p.map(x=>x.id===t.id?{...x,customName:e.target.value}:x))}
                          onBlur={()=>setEditingId(null)} onKeyDown={e=>{if(e.key==="Enter"||e.key==="Escape")setEditingId(null);}}
                          style={{width:Math.max(50,(t.customName||"").length*8+16),background:"rgba(255,255,255,0.2)",border:"none",borderRadius:99,padding:"2px 6px",color:t.text,fontWeight:700,fontSize:12,outline:"none"}}/>
                      </div>
                    ):(
                      <button className="rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1"
                        style={{background:sel?t.color:"rgba(0,0,0,0.06)",color:sel?t.text:"#64748b",border:"2px solid "+(sel?t.color:"rgba(0,0,0,0.12)"),cursor:"pointer"}}>
                        <span onClick={()=>setColorTeams(p=>p.map(x=>x.id===t.id?{...x,selected:!x.selected}:x))}>{t.customName||t.name}</span>
                        {sel&&<span onClick={e=>{e.stopPropagation();setEditingId(t.id);}} style={{cursor:"text",opacity:0.7,fontSize:10,marginLeft:2}} title="Rename">✏️</span>}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-slate-600 text-xs mt-3 font-bold">{allTeamIds.length} team{allTeamIds.length!==1?"s":""} selected</p>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-700 mb-3">Courts to Use</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET.map(n=>{ const s=courts.includes(n); return(
                <button key={n} onClick={()=>toggleCourt(n)} className="rounded-full px-3 py-1 text-xs font-bold"
                  style={{background:s?"rgba(15,76,117,0.15)":"rgba(0,0,0,0.06)",color:s?"#0f4c75":"#64748b",
                    border:"2px solid "+(s?"rgba(15,76,117,0.5)":"rgba(0,0,0,0.1)"),cursor:"pointer"}}>{n}</button>
              );})}
            </div>
            {courts.filter(c=>!PRESET.includes(c)).length>0&&(
              <div className="flex flex-wrap gap-2 mb-3">
                {courts.filter(c=>!PRESET.includes(c)).map(c=>(
                  <div key={c} className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold"
                    style={{background:"rgba(15,76,117,0.15)",color:"#0f4c75",border:"2px solid rgba(15,76,117,0.4)"}}>
                    {c}<button onClick={()=>setCourts(p=>p.filter(x=>x!==c))} style={{cursor:"pointer",marginLeft:4,fontWeight:900,background:"none",border:"none",color:"#0f4c75"}}>×</button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-slate-500 text-xs mb-2">Or enter any custom court name:</p>
            <div className="flex gap-2">
              <input placeholder="Name or number" value={courtInput} onChange={e=>setCourtInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCourt()} style={{...iS,flex:1,background:"rgba(255,255,255,0.7)",color:"#1e293b",border:"1px solid rgba(0,0,0,0.15)"}}/>
              <button onClick={addCourt} className="px-3 py-1 rounded-lg text-xs font-bold" style={{background:"rgba(15,76,117,0.15)",color:"#0f4c75",cursor:"pointer",border:"1px solid rgba(15,76,117,0.3)"}}>+ Add</button>
            </div>
            <p className="text-slate-500 text-xs mt-2">{courts.length} court{courts.length!==1?"s":""}: {courts.join(", ")}</p>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-2">
              <p className="text-sm font-bold text-slate-700">Round Timer</p>
              <button onClick={()=>setTimerEnabled(p=>!p)} className="text-xs px-2 py-1 rounded-lg font-bold"
                style={{background:timerEnabled?"rgba(15,76,117,0.15)":"rgba(0,0,0,0.06)",color:timerEnabled?"#0f4c75":"#94a3b8",cursor:"pointer",border:"1px solid "+(timerEnabled?"rgba(15,76,117,0.4)":"rgba(0,0,0,0.1)")}}>
                {timerEnabled?"On":"Off"}
              </button>
            </div>
            {timerEnabled&&<div className="flex items-center gap-3">
              <input type="number" min={1} max={99} value={timerMins} onChange={e=>setTimerMins(Math.max(1,Number(e.target.value)))} style={{...iS,width:64,textAlign:"center",fontSize:14,background:"rgba(255,255,255,0.7)",color:"#1e293b",border:"1px solid rgba(0,0,0,0.15)"}}/>
              <span className="text-slate-600 text-sm">minutes per round</span>
            </div>}
            {timerEnabled&&<p className="text-slate-500 text-xs mt-2">A loud alarm sounds when time runs out.</p>}
          </div>

          <div className="rounded-xl p-3 text-xs leading-relaxed" style={{background:"rgba(0,0,0,0.06)",border:"1px solid rgba(0,0,0,0.08)",color:"#475569"}}>
            {courts.length} court{courts.length!==1?"s":""} → {courts.length*2} play, {Math.max(0,allTeamIds.length-courts.length*2)} bye per round{timerEnabled?" · "+timerMins+" min rounds":""}.<br/>
            No back-to-back byes. Bye partnerships rotate.
          </div>
          {!canStart&&<p className="text-amber-600 text-xs text-center">{allTeamIds.length<3?"Need at least 3 teams.":courts.length<1?"Need at least 1 court.":""}</p>}
          <button onClick={()=>canStart&&onStart(selectedTeams,allTeamIds,courts,timerEnabled?timerMins*60:0,title)} disabled={!canStart}
            className="w-full py-3 rounded-xl font-bold text-base btn-blue"
            >
            Start Tournament 🚀
          </button>
        </div>
      );
    }

    // ─── Select Round-Robin Teams Modal ───────────────────────────────────────
    // Shows teams in current standings order with checkboxes to pick participants
    // and a court-subset picker.
    function SelectRoundRobinTeamsModal({rankedTeamIds,tournamentCourts,onConfirm,onClose}){
      const[selectedTeams,setSelectedTeams]=useState(()=>new Set());
      const[selectedCourts,setSelectedCourts]=useState(()=>new Set());
      const toggleTeam=id=>setSelectedTeams(p=>{const n=new Set(p);if(n.has(id))n.delete(id);else n.add(id);return n;});
      const toggleCourt=c=>setSelectedCourts(p=>{const n=new Set(p);if(n.has(c))n.delete(c);else n.add(c);return n;});
      const teamCount=selectedTeams.size, courtCount=selectedCourts.size;
      const canConfirm=teamCount>=2 && courtCount>=1;
      const orderedCourts=tournamentCourts.filter(c=>selectedCourts.has(c));
      return(
        <div className="modal-overlay" onClick={onClose}>
          <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 my-4 modal-box"  onClick={e=>e.stopPropagation()}>
            <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">🔁 Start Round Robin</div>

            {/* Teams */}
            <div>
              <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wide">Teams (standings order)</p>
              <div className="flex flex-col gap-2" style={{maxHeight:260,overflowY:"auto"}}>
                {rankedTeamIds.map((id,i)=>{
                  const t=teamById(id);if(!t)return null;
                  const sel=selectedTeams.has(id);
                  return(
                    <button key={id} onClick={()=>toggleTeam(id)}
                      className="flex items-center gap-3 rounded-xl text-left"
                      style={{padding:"8px 12px",cursor:"pointer",
                        background:sel?`${t.color}22`:"rgba(255,255,255,0.04)",
                        border:`1.5px solid ${sel?t.color:"rgba(255,255,255,0.1)"}`}}>
                      <span className="font-bold text-slate-500" style={{width:24,fontSize:12}}>#{i+1}</span>
                      <span style={{width:14,height:14,borderRadius:4,flexShrink:0,
                        background:sel?t.color:"transparent",
                        border:`2px solid ${sel?t.color:"rgba(255,255,255,0.25)"}`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        color:t.text,fontSize:10,fontWeight:900}}>{sel?"✓":""}</span>
                      <span className="inline-flex items-center rounded-full font-bold flex-1"
                        style={{background:t.color,color:t.text,padding:"4px 10px",fontSize:13,
                          opacity:sel?1:0.55}}>
                        {t.name}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-1">{teamCount} of {rankedTeamIds.length} team{rankedTeamIds.length!==1?"s":""} selected</p>
            </div>

            {/* Courts */}
            <div>
              <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wide">Courts to use</p>
              <div className="flex flex-wrap gap-2">
                {tournamentCourts.map(c=>{
                  const sel=selectedCourts.has(c);
                  return(
                    <button key={c} onClick={()=>toggleCourt(c)}
                      className="rounded-full font-bold"
                      style={{padding:"5px 12px",fontSize:12,cursor:"pointer",
                        background:sel?"rgba(99,102,241,0.25)":"rgba(255,255,255,0.04)",
                        color:sel?"#a5b4fc":"#64748b",
                        border:`2px solid ${sel?"rgba(99,102,241,0.5)":"rgba(255,255,255,0.1)"}`}}>
                      {c}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-1">{courtCount} of {tournamentCourts.length} court{tournamentCourts.length!==1?"s":""} selected</p>
            </div>

            {!canConfirm&&<p className="text-xs text-amber-400 text-center">{teamCount<2?"Need at least 2 teams.":"Need at least 1 court."}</p>}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
              <button onClick={()=>canConfirm&&onConfirm([...selectedTeams],orderedCourts)} disabled={!canConfirm}
                className="flex-1 py-2 rounded-xl text-sm font-bold"
                style={{background:canConfirm?"linear-gradient(90deg,#6366f1,#8b5cf6)":"rgba(255,255,255,0.04)",
                  color:canConfirm?"#fff":"#475569",cursor:canConfirm?"pointer":"not-allowed"}}>
                Start →
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ─── Manage Courts Modal (admin, mid-tournament) ──────────────────────────
    function ManageCourtsModal({courtNumbers,onSave,onClose}){
      const[local,setLocal]=useState(courtNumbers.map(c=>String(c)));
      const rename=(i,v)=>setLocal(p=>p.map((c,j)=>j===i?v:c));
      const remove=(i)=>setLocal(p=>p.filter((_,j)=>j!==i));
      const addCourt=()=>setLocal(p=>[...p,String(p.length+1)]);
      const valid=local.length>=1&&local.every(v=>v.trim()!=="")&&new Set(local.map(v=>v.trim())).size===local.length;
      return(
        <div className="modal-overlay" onClick={onClose}>
          <div className="rounded-2xl p-5 w-full max-w-xs flex flex-col gap-4 my-4 modal-box"  onClick={e=>e.stopPropagation()}>
            <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">🏟️ Manage Courts</div>
            <p className="text-xs text-slate-500">Rename, add, or remove courts. Changes take effect immediately.</p>
            <div className="flex flex-col gap-2">
              {local.map((c,i)=>(
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-bold" style={{width:20,textAlign:"right"}}>{i+1}.</span>
                  <input value={c} onChange={e=>rename(i,e.target.value)}
                    style={{flex:1,padding:"6px 10px",borderRadius:8,fontSize:13,fontWeight:700,
                      background:"rgba(255,255,255,0.08)",border:`1px solid ${c.trim()===""||local.filter((_,j)=>j!==i).map(v=>v.trim()).includes(c.trim())?"#ef4444":"rgba(255,255,255,0.15)"}`,
                      color:"#e2e8f0",outline:"none"}}/>
                  <button onClick={()=>remove(i)} disabled={local.length<=1}
                    style={{padding:"4px 8px",borderRadius:6,fontSize:13,fontWeight:700,cursor:local.length<=1?"not-allowed":"pointer",
                      background:"rgba(220,38,38,0.15)",color:local.length<=1?"#475569":"#f87171",border:"1px solid rgba(220,38,38,0.3)"}}>×</button>
                </div>
              ))}
            </div>
            <button onClick={addCourt}
              style={{padding:"6px 12px",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",
                background:"rgba(99,102,241,0.15)",color:"#a5b4fc",border:"1px solid rgba(99,102,241,0.3)"}}>
              + Add Court
            </button>
            {!valid&&<p className="text-xs text-amber-400">Court names must be unique and non-empty.</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
              <button onClick={()=>valid&&onSave(local.map(v=>v.trim()))} disabled={!valid} className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo"
                >Save</button>
            </div>
          </div>
        </div>
      );
    }

    // ─── Preset Match Modal ───────────────────────────────────────────────────
    // Lets admin lock in a specific matchup for the next generated round.
    function PresetMatchModal({allTeamIds,courtNumbers,usedTeamIds,usedCourtNumbers=[],onSave,onClose}){
      const[teamAId,setTeamAId]=useState("");
      const[teamBId,setTeamBId]=useState("");
      const usedSet=new Set(usedTeamIds);
      const usedCourtSet=new Set(usedCourtNumbers.map(String));
      const[courtNumber,setCourtNumber]=useState(()=>courtNumbers.find(c=>!usedCourtSet.has(String(c)))||courtNumbers[0]||"");
      const courtInUse=courtNumber&&usedCourtSet.has(String(courtNumber));
      const valid=teamAId&&teamBId&&teamAId!==teamBId&&courtNumber&&!courtInUse;
      const chip=(id,active,onClick)=>{
        const t=teamById(id);if(!t)return null;
        const disabled=!active&&usedSet.has(id);
        return(
          <button key={id} onClick={disabled?undefined:onClick} disabled={disabled}
            style={{padding:"5px 10px",borderRadius:999,fontSize:12,fontWeight:700,cursor:disabled?"not-allowed":"pointer",
              opacity:disabled?0.35:1,
              background:active?t.color+"bb":"rgba(255,255,255,0.05)",
              color:active?t.text:"#64748b",
              border:`2px solid ${active?t.color:"rgba(255,255,255,0.1)"}`}}>
            {t.name}
          </button>
        );
      };
      return(
        <div className="modal-overlay" onClick={onClose}>
          <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 my-4 modal-box"  onClick={e=>e.stopPropagation()}>
            <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">📌 Pre-set Matchup</div>
            <p className="text-xs text-slate-500">Lock in a game for the next round. Remaining courts are filled by the algorithm.</p>
            <div>
              <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Team A</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
                {allTeamIds.map(id=>chip(id,teamAId===id,()=>{setTeamAId(id);if(teamBId===id)setTeamBId("");}))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Team B</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
                {allTeamIds.map(id=>chip(id,teamBId===id,()=>{setTeamBId(id);if(teamAId===id)setTeamAId("");}))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Court</p>
              <select value={courtNumber} onChange={e=>setCourtNumber(e.target.value)}
                style={{width:"100%",padding:"8px 12px",borderRadius:10,fontSize:14,fontWeight:700,
                  background:"#0f172a",border:"1px solid rgba(255,255,255,0.2)",color:"#e2e8f0",outline:"none"}}>
                <option value="">Select court…</option>
                {courtNumbers.map(c=>{const inUse=usedCourtSet.has(String(c));return(<option key={c} value={c} disabled={inUse}>{c}{inUse?" (in use)":""}</option>);})}
              </select>
            </div>
            {courtInUse&&<p className="text-xs text-amber-400 text-center">Court {courtNumber} is already in use — pick another.</p>}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
              <button onClick={()=>valid&&onSave({teamId1:teamAId,teamId2:teamBId,courtNumber})} disabled={!valid} className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo"
                >
                Lock In →
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ─── Manage Teams Modal (admin, mid-tournament) ───────────────────────────
    // Allows renaming existing teams and adding new teams from unused colour slots.
    function ManageTeamsModal({activeTeamIds,tournamentTeams,onSave,onClose}){
      const[localTeams,setLocalTeams]=useState(
        activeTeamIds.map(id=>{
          const t=teamById(id);
          return{id,name:t?t.name:id,color:t?t.color:"#475569",text:t?t.text:"#fff"};
        })
      );
      const[addId,setAddId]=useState("");

      const usedIds=new Set(localTeams.map(t=>t.id));
      const available=ALL_TEAMS.filter(t=>!usedIds.has(t.id));

      const rename=(id,name)=>setLocalTeams(p=>p.map(t=>t.id===id?{...t,name}:t));

      const addTeam=()=>{
        if(!addId)return;
        const base=ALL_TEAMS.find(t=>t.id===addId);
        if(!base)return;
        setLocalTeams(p=>[...p,{id:base.id,name:base.name,color:base.color,text:base.text}]);
        setAddId("");
      };

      const save=()=>{
        // Build updated registry: existing tournament teams updated with new names,
        // plus any newly added teams
        const registry=localTeams.map(t=>{
          const orig=tournamentTeams.find(x=>x.id===t.id);
          return{id:t.id,name:t.name.trim()||t.id,color:t.color,text:t.text,...(orig?{color:orig.color,text:orig.text}:{})};
        });
        onSave(registry,localTeams.map(t=>t.id));
      };

      return(
        <div className="modal-overlay" onClick={onClose}>
          <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 my-4 modal-box"  onClick={e=>e.stopPropagation()}>
            <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">✏️ Manage Teams</div>

            {/* Existing teams — rename only */}
            <div className="flex flex-col gap-2" style={{maxHeight:260,overflowY:"auto"}}>
              {localTeams.map(t=>(
                <div key={t.id} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{background:t.color}}/>
                  <input value={t.name} onChange={e=>rename(t.id,e.target.value)}
                    style={{flex:1,padding:"6px 10px",borderRadius:8,fontSize:13,fontWeight:700,
                      background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",
                      color:"#e2e8f0",outline:"none"}}/>
                </div>
              ))}
            </div>

            {/* Add a new team */}
            {available.length>0&&(
              <div>
                <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Add a team</p>
                <div className="flex gap-2">
                  <select value={addId} onChange={e=>setAddId(e.target.value)}
                    style={{flex:1,padding:"6px 8px",borderRadius:8,fontSize:13,fontWeight:700,
                      background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",
                      color:"#e2e8f0",outline:"none"}}>
                    <option value="">— choose colour —</option>
                    {available.map(t=><option key={t.id} value={t.id} style={{background:"#1e293b"}}>{t.name}</option>)}
                  </select>
                  <button onClick={addTeam} disabled={!addId}
                    style={{padding:"6px 14px",borderRadius:8,fontWeight:700,fontSize:13,cursor:addId?"pointer":"not-allowed",
                      background:addId?"rgba(99,102,241,0.25)":"rgba(255,255,255,0.04)",
                      color:addId?"#a5b4fc":"#475569",border:"1px solid rgba(99,102,241,0.3)"}}>
                    + Add
                  </button>
                </div>
                <p className="text-xs text-slate-600 mt-1">New teams start with 0 wins and join the rotation immediately.</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
              <button onClick={save} className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo" >Save</button>
            </div>
          </div>
        </div>
      );
    }

    // ─── Add-Game Modal ──────────────────────────────────────────────────────
    // Lets admin manually add a game to a round (active or historical).
    function AddGameModal({allTeamIds,defaultCourt,label,courtNumbers=[],usedCourtNumbers=[],onSave,onClose}){
      const[teamAId,setTeamAId]=useState("");
      const[teamBId,setTeamBId]=useState("");
      const[scoreA,setScoreA]=useState("");
      const[scoreB,setScoreB]=useState("");
      const usedCourtSet=new Set(usedCourtNumbers.map(String));
      const[courtNumber,setCourtNumber]=useState(()=>{
        if(defaultCourt&&!usedCourtSet.has(String(defaultCourt)))return defaultCourt;
        return courtNumbers.find(c=>!usedCourtSet.has(String(c)))||defaultCourt||"";
      });

      const teamA=teamById(teamAId), teamB=teamById(teamBId);
      const scoresValid=scoreA!==""&&scoreB!==""&&Number(scoreA)!==Number(scoreB);
      const teamsValid=teamAId&&teamBId&&teamAId!==teamBId;
      const courtInUse=String(courtNumber).trim()!==""&&usedCourtSet.has(String(courtNumber).trim());
      const courtValid=String(courtNumber).trim()!==""&&!courtInUse;
      const valid=scoresValid&&teamsValid&&courtValid;
      const aWins=valid&&Number(scoreA)>Number(scoreB);
      const winnerId=valid?(aWins?teamAId:teamBId):null;
      const loserId =valid?(aWins?teamBId:teamAId):null;
      const winnerScore=valid?Math.max(Number(scoreA),Number(scoreB)):null;
      const loserScore =valid?Math.min(Number(scoreA),Number(scoreB)):null;

      const chip=(id,active,onClick)=>{
        const t=teamById(id);if(!t)return null;
        return(
          <button key={id} onClick={onClick}
            style={{padding:"5px 10px",borderRadius:999,fontSize:12,fontWeight:700,cursor:"pointer",
              background:active?t.color+"bb":"rgba(255,255,255,0.05)",
              color:active?t.text:"#64748b",
              border:`2px solid ${active?t.color:"rgba(255,255,255,0.1)"}`}}>
            {t.name}
          </button>
        );
      };

      const save=()=>{
        if(!valid)return;
        onSave({winnerId,loserId,winnerScore,loserScore,courtNumber:String(courtNumber).trim()});
      };

      return(
        <div className="modal-overlay" onClick={onClose}>
          <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 my-4 modal-box"  onClick={e=>e.stopPropagation()}>
            <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">➕ Add Game{label?` — ${label}`:""}</div>

            <div>
              <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Team A</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
                {allTeamIds.map(id=>chip(id,teamAId===id,()=>{ setTeamAId(id); if(teamBId===id)setTeamBId(teamAId); }))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{background:teamA?`${teamA.color}22`:"rgba(255,255,255,0.04)",border:`1.5px solid ${teamA?teamA.color:"rgba(255,255,255,0.1)"}`}}>
                {teamA&&<div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:teamA.color}}/>}
                <span className="font-bold text-sm flex-1">{teamA?.name||"—"}</span>
              </div>
              <NumInput value={scoreA} onChange={setScoreA}/>
            </div>

            <div className="text-center text-slate-600 text-xs font-bold my-0.5">VS</div>

            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{background:teamB?`${teamB.color}22`:"rgba(255,255,255,0.04)",border:`1.5px solid ${teamB?teamB.color:"rgba(255,255,255,0.1)"}`}}>
                {teamB&&<div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:teamB.color}}/>}
                <span className="font-bold text-sm flex-1">{teamB?.name||"—"}</span>
              </div>
              <NumInput value={scoreB} onChange={setScoreB}/>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Team B</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
                {allTeamIds.map(id=>chip(id,teamBId===id,()=>{ setTeamBId(id); if(teamAId===id)setTeamAId(teamBId); }))}
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Court</p>
              {courtNumbers.length>0?(
                <select value={courtNumber} onChange={e=>setCourtNumber(e.target.value)}
                  style={{width:"100%",padding:"8px 12px",borderRadius:10,fontSize:14,fontWeight:700,
                    background:"#0f172a",border:"1px solid rgba(255,255,255,0.2)",color:"#e2e8f0",outline:"none"}}>
                  <option value="">Select court…</option>
                  {courtNumbers.map(c=>{const inUse=usedCourtSet.has(String(c));return(<option key={c} value={c} disabled={inUse}>{c}{inUse?" (in use)":""}</option>);})}
                </select>
              ):(
                <input value={courtNumber} onChange={e=>setCourtNumber(e.target.value)} placeholder="Court name or number"
                  style={{width:"100%",padding:"8px 12px",borderRadius:10,fontSize:14,fontWeight:700,
                    background:"#0f172a",border:"1px solid rgba(255,255,255,0.2)",color:"#e2e8f0",outline:"none"}}/>
              )}
              {courtInUse&&<p className="text-xs text-amber-400 mt-1">Court {courtNumber} is already in use — pick another.</p>}
            </div>

            {valid&&winnerId&&<p className="text-xs text-green-400 text-center">→ {teamById(winnerId)?.name} wins {winnerScore}–{loserScore}</p>}
            {!scoresValid&&scoreA!==""&&scoreB!==""&&<p className="text-xs text-amber-400 text-center">Scores can't be equal.</p>}
            {!teamsValid&&teamAId&&teamBId&&<p className="text-xs text-amber-400 text-center">Teams must be different.</p>}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
              <button onClick={save} disabled={!valid} className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo"
                >Add</button>
            </div>
          </div>
        </div>
      );
    }

    // ─── Pause Panel ─────────────────────────────────────────────────────────
    function PausePanel({activeTeamIds,pausedIds,onTogglePause}){
      return(
        <div className="rounded-2xl" style={{padding:"clamp(10px,2.5vw,16px)",background:"#f8fafc",border:"1px solid rgba(0,0,0,0.08)"}}>
          <p style={{fontSize:"clamp(9px,2vw,12px)",fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"clamp(8px,2vw,12px)"}}>🩹 Team Status</p>
          <div className="flex flex-wrap" style={{gap:"clamp(6px,1.5vw,10px)"}}>
            {activeTeamIds.map(id=>{ const t=teamById(id),p=pausedIds.includes(id); return(
              <button key={id} onClick={()=>onTogglePause(id)} title={p?"Return to rotation":"Pause (injury/break)"}
                className="flex items-center rounded-full font-bold"
                style={{gap:"clamp(4px,1vw,6px)",padding:"clamp(5px,1.2vw,8px) clamp(10px,2.5vw,16px)",
                  fontSize:"clamp(12px,3vw,16px)",
                  background:p?"rgba(0,0,0,0.05)":t.color,color:p?"#94a3b8":t.text,
                  border:`2px solid ${p?"rgba(0,0,0,0.08)":t.color}`,cursor:"pointer",opacity:p?0.6:1,
                  textDecoration:p?"line-through":"none"}}>
                {p?"⏸ ":""}{t.name}
              </button>
            );})}
          </div>
          {pausedIds.length>0&&<p style={{fontSize:"clamp(10px,2.5vw,13px)",color:"#d97706",marginTop:"clamp(6px,1.5vw,10px)"}}>{pausedIds.map(id=>teamById(id)?.name).join(", ")} paused — excluded from rotation.</p>}
        </div>
      );
    }

    // ─── Restore Banner ──────────────────────────────────────────────────────
    function RestoreBanner({saved,onRestore,onDiscard}){
      const d=new Date(saved.savedAt);
      return(
        <div className="rounded-2xl p-4 mb-4 flex flex-col gap-3" style={{background:"rgba(15,76,117,0.08)",border:"1px solid rgba(15,76,117,0.25)"}}>
          <div>
            <p className="text-sm font-bold text-blue-800">💾 Saved tournament found</p>
            <p className="text-xs text-slate-500 mt-1">Round {saved.roundNum} · {saved.activeTeamIds?.length} teams · Courts {saved.courtNumbers?.join(", ")}<br/>
              Saved at {d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} on {d.toLocaleDateString([],{month:"short",day:"numeric"})}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onDiscard} className="flex-1 py-2 rounded-xl text-sm font-bold" style={{background:"rgba(0,0,0,0.06)",color:"#64748b",cursor:"pointer",border:"1px solid rgba(0,0,0,0.1)"}}>Discard</button>
            <button onClick={onRestore} className="flex-1 py-2 rounded-xl text-sm font-bold btn-blue" >Restore →</button>
          </div>
        </div>
      );
    }

    // ─── Main App ─────────────────────────────────────────────────────────────
    function App(){
      const[phase,setPhase]=useState("loading");
      const[tournamentTitle,setTournamentTitle]=useState("Tournament");
      useEffect(()=>{ document.title=tournamentTitle; },[tournamentTitle]);
      const[activeTeamIds,setActiveTeamIds]=useState([]);
      const[tournamentTeams,setTournamentTeams]=useState([]);
      const[courtNumbers,setCourtNumbers]=useState([]);
      const[timerDuration,setTimerDuration]=useState(0);
      const[timerDefaultMins,setTimerDefaultMins]=useState(12);
      const[history,setHistory]=useState([]);
      const[standings,setStandings]=useState([]);
      const[round,setRound]=useState(null);
      const[roundNum,setRoundNum]=useState(1);
      const[pending,setPending]=useState({});
      const pendingRef=useRef({});    // always in sync with pending; safe to read in async handlers
      const[roundComplete,setRoundComplete]=useState(false);
      const[roundKey,setRoundKey]=useState(0);
      const[activeTab,setActiveTab]=useState("play");
      // Guard: timer tab no longer exists, reset if somehow loaded from old state
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
      const[editTarget,setEditTarget]=useState(null);
      const[editActiveCourt,setEditActiveCourt]=useState(null);
      const[pausedIds,setPausedIds]=useState([]);
      const[isAdmin,setIsAdmin]=useState(false);
      const isAdminRef=useRef(false);
      useEffect(()=>{isAdminRef.current=isAdmin;},[isAdmin]);
      const[pinPurpose,setPinPurpose]=useState(null);
      const[presence,setPresence]=useState({viewers:0,admins:0});
      const[showTimerSettings,setShowTimerSettings]=useState(false);
      const[showManageTeams,setShowManageTeams]=useState(false);
      const[showManageCourts,setShowManageCourts]=useState(false);
      const[savedState,setSavedState]=useState(null);
      const[finalRound,setFinalRound]=useState(false);
      const[tournamentMode,setTournamentMode]=useState("swiss");
      const[roundRobinSchedule,setRoundRobinSchedule]=useState(null);
      const[roundRobinCourts,setRoundRobinCourts]=useState(null);
      const[roundRobinStartRoundNum,setRoundRobinStartRoundNum]=useState(null);
      const[roundRobinStartSnapshot,setRoundRobinStartSnapshot]=useState(null);
      const[roundRobinEndSnapshot,setRoundRobinEndSnapshot]=useState(null);
      const[activeRoundExtras,setActiveRoundExtras]=useState([]);
      const[liveAdditions,setLiveAdditions]=useState([]);
      const[showLiveAddGame,setShowLiveAddGame]=useState(false);
      const[breakMode,setBreakMode]=useState(null);
      const[showBreakModal,setShowBreakModal]=useState(false);
      const[removeGameTarget,setRemoveGameTarget]=useState(null);
      const[headerHidden,setHeaderHidden]=useState(false);
      const[cancelledRoundNums,setCancelledRoundNums]=useState([]);
      const headerRef=useRef(null);
      const[headerHeight,setHeaderHeight]=useState(140);
      useEffect(()=>{
        const el=headerRef.current;if(!el)return;
        const ro=new ResizeObserver(([e])=>setHeaderHeight(e.contentRect.height+2));
        ro.observe(el);return()=>ro.disconnect();
      },[]);
      const[nextRoundPresets,setNextRoundPresets]=useState([]);
      const[showPresetMatch,setShowPresetMatch]=useState(false);
      const[tournamentFinished,setTournamentFinished]=useState(false);
      const[showAddGame,setShowAddGame]=useState(null);// {target:"active"|ri, defaultCourt}
      const[showSelectRRTeams,setShowSelectRRTeams]=useState(false);
      const[adminPin,setAdminPin]=useState(null); // loaded from Firebase config/adminPin
      const[adminPinLoaded,setAdminPinLoaded]=useState(false);

      // Fetch admin PIN from Firebase once on mount
      useEffect(()=>{
        db.ref('config/adminPin').once('value').then(snap=>{
          const val=snap.val();
          if(val)setAdminPin(String(val));
          setAdminPinLoaded(true);
        }).catch(()=>{setAdminPinLoaded(true);}); // mark loaded even on error so modal isn't stuck
      },[]);

      // Timer refs + state
      const timerRunningRef=useRef(false),timerStartedAtRef=useRef(null),timerPausedSecsRef=useRef(0);
      const timerDurationRef=useRef(0),alarmFiredRef=useRef(false),timerTickRef=useRef(null);
      // Track which warning beeps have already fired this round (set of seconds thresholds)
      const warningsFiredRef=useRef(new Set());
      const[timerRunning,setTimerRunning]=useState(false);
      const[timerPausedSecsLeft,setTimerPausedSecsLeft]=useState(0);
      const[timerAlarmed,setTimerAlarmed]=useState(false);
      const[timerSecsLeft,setTimerSecsLeft]=useState(0);
      useEffect(()=>{timerDurationRef.current=timerDuration;},[timerDuration]);

      const computeSecsLeft=()=>{
        if(!timerRunningRef.current||!timerStartedAtRef.current)return timerPausedSecsRef.current;
        return Math.max(0,timerPausedSecsRef.current-Math.floor((Date.now()-timerStartedAtRef.current)/1000));
      };
      const applyTimerState=(running,startedAt,pausedSecs)=>{
        timerRunningRef.current=running;timerStartedAtRef.current=startedAt;timerPausedSecsRef.current=pausedSecs;
        const secs=running&&startedAt?Math.max(0,pausedSecs-Math.floor((Date.now()-startedAt)/1000)):pausedSecs;
        setTimerSecsLeft(secs);setTimerRunning(running);setTimerPausedSecsLeft(pausedSecs);
        clearInterval(timerTickRef.current);
        if(running&&startedAt&&secs>0){
          timerTickRef.current=setInterval(()=>{
            const s=computeSecsLeft();setTimerSecsLeft(s);
            // Warning beeps at 3 min and 1 min remaining (only if timer was longer than those)
            const WARNINGS=[180,60]; // seconds
            WARNINGS.forEach(thresh=>{
              if(s<=thresh&&!warningsFiredRef.current.has(thresh)&&timerDurationRef.current>thresh){
                warningsFiredRef.current.add(thresh);
                playWarningBeep();
              }
            });
            if(s<=0){clearInterval(timerTickRef.current);
              if(!alarmFiredRef.current&&timerDurationRef.current>0){alarmFiredRef.current=true;playAlarm();timerRunningRef.current=false;setTimerRunning(false);setTimerAlarmed(true);}}
          },500);
        }
      };

      // Firebase write tokens — keep a Set so rapid successive writes don't break echo suppression
      const recentWriteTokens=useRef(new Set());
      const pushSnapshot=useCallback((snapshot)=>{
        const tok=Math.random().toString(36).slice(2); recentWriteTokens.current.add(tok);
        if(!snapshot){db.ref('current_tournament').set({phase:"ended",_writeToken:tok});return;}
        db.ref('current_tournament').set({...snapshot,_writeToken:tok});
      },[]);
      const pushAtomicUpdate=useCallback((fields)=>{
        const tok=Math.random().toString(36).slice(2); recentWriteTokens.current.add(tok);
        db.ref('current_tournament').update({...fields,_writeToken:tok});
      },[]);

      // Listener
      const lastSeenRoundNum=useRef(-1),initialLoadDone=useRef(false);
      const updateAllStates=useCallback((s)=>{
        if(s.teamRegistry&&s.teamRegistry.length>0)setTournamentTeams(s.teamRegistry);
        if(s.tournamentTitle){setTournamentTitle(s.tournamentTitle);document.title=s.tournamentTitle;}
        const ns=rebuildStandings(s.activeTeamIds,s.history);
        let nr;
        if(s.roundData&&s.roundData.courtTeamIds){
          const safe=id=>teamById(id)||{id,name:String(id),color:"#475569",text:"#fff"};
          nr={courts:s.roundData.courtTeamIds.map(p=>p.map(safe)),bye:(s.roundData.byeIds||[]).map(safe),paused:(s.roundData.pausedTeamIds||[]).map(safe)};
        } else if(s.roundNum===0||!s.roundData){
          nr=null;
        } else {
          nr=generateRound(ns,s.courtNumbers.length,s.history.length,s.history,s.pausedIds||[]);
        }
        setActiveTeamIds(s.activeTeamIds);setCourtNumbers(s.courtNumbers);
        setTimerDuration(s.timerDuration||0);setTimerDefaultMins(s.timerDefaultMins||12);
        setHistory(s.history);setStandings(ns);setRound(nr);setRoundNum(s.roundNum);
        setPausedIds(s.pausedIds||[]);setRoundComplete(s.roundComplete||false);
        setTournamentMode(s.tournamentMode||"swiss");
        setRoundRobinSchedule(s.roundRobinSchedule||null);
        setRoundRobinCourts(s.roundRobinCourts||null);
        setRoundRobinStartRoundNum(s.roundRobinStartRoundNum??null);
        setRoundRobinStartSnapshot(s.roundRobinStartSnapshot||null);
        setRoundRobinEndSnapshot(s.roundRobinEndSnapshot||null);
        setActiveRoundExtras(s.activeRoundExtras||[]);
        setLiveAdditions(s.liveAdditions||[]);
        setNextRoundPresets(s.nextRoundPresets||[]);
        setTournamentFinished(!!s.tournamentFinished);
        setBreakMode(s.breakMode||null);
        setCancelledRoundNums(s.cancelledRoundNums||[]);
        const isNew=s.roundNum!==lastSeenRoundNum.current;
        if(isNew){lastSeenRoundNum.current=s.roundNum;pendingRef.current={};setPending({});setRoundKey(k=>k+1);}
        alarmFiredRef.current=false;
        const _tRun=s.timerRunning||false,_tSA=s.timerStartedAt||null,_tPS=s.timerPausedSecsLeft??s.timerDuration??0,_tDur=s.timerDuration||0;
        const _curSecs=_tRun&&_tSA?Math.max(0,_tPS-Math.floor((Date.now()-_tSA)/1000)):_tPS;
        [180,60].forEach(thresh=>{if(_tDur>thresh&&_curSecs<=thresh)warningsFiredRef.current.add(thresh);});
        // Alarm should ONLY fire on a live transition to 0, never on page load with timer already expired.
        if(_curSecs<=0&&_tDur>0)alarmFiredRef.current=true;
        applyTimerState(_tRun,_tSA,_tPS);
        setPhase("play");
      },[]);

      // When the page wakes from sleep/background, silently catch up: mark any
      // thresholds that were crossed while hidden so the interval doesn't fire them.
      useEffect(()=>{
        const onVisible=()=>{
          if(document.visibilityState!=="visible")return;
          if(!timerRunningRef.current||!timerStartedAtRef.current)return;
          const s=computeSecsLeft();
          [180,60].forEach(thresh=>{if(s<=thresh)warningsFiredRef.current.add(thresh);});
          if(s<=0&&!alarmFiredRef.current){alarmFiredRef.current=true;}
        };
        document.addEventListener("visibilitychange",onVisible);
        return()=>document.removeEventListener("visibilitychange",onVisible);
      },[]);

      useEffect(()=>{
        const ref=db.ref('current_tournament');
        ref.on('value',snap=>{
          const data=snap.val();
          if(!initialLoadDone.current)initialLoadDone.current=true;
          if(!data){setPhase(p=>p==="play"?"waiting":p);return;}
          if(data._writeToken&&recentWriteTokens.current.has(data._writeToken))return;
          if(data.phase!=="play"){setPhase("waiting");return;}
          updateAllStates(normaliseSnapshot(data));
        });
        return()=>ref.off();
      },[updateAllStates]);

      useEffect(()=>{
        const ref=db.ref('current_tournament/pendingResults');
        ref.on('value',snap=>{const d=snap.val();if(!d)return;setPending(prev=>{const m={...prev};Object.keys(d).forEach(k=>{if(!m[k])m[k]=d[k];});pendingRef.current=m;return m;});});
        return()=>ref.off();
      },[]);

      useEffect(()=>{
        const saved=loadState();if(saved&&saved.phase==="play")setSavedState(saved);
        const t=setTimeout(()=>{if(!initialLoadDone.current){initialLoadDone.current=true;setPhase("waiting");}},4000);
        return()=>clearTimeout(t);
      },[]);

      const myPresRef=useRef(null);
      useEffect(()=>{
        const ref=db.ref('presence').push();myPresRef.current=ref;
        ref.set({role:'viewer',joinedAt:Date.now()});ref.onDisconnect().remove();
        const h=snap=>{const d=snap.val()||{},e=Object.values(d);setPresence({viewers:e.filter(x=>x&&x.role==='viewer').length,admins:e.filter(x=>x&&x.role==='admin').length});};
        db.ref('presence').on('value',h);return()=>{ref.remove();db.ref('presence').off('value',h);};
      },[]);
      useEffect(()=>{if(myPresRef.current)myPresRef.current.update({role:isAdmin?'admin':'viewer'});},[isAdmin]);

      // Local auto-save only
      useEffect(()=>{
        if(phase!=="play")return;
        const rd=(round&&round.courts&&round.courts.length>0)?{courtTeamIds:round.courts.map(p=>p.map(t=>t&&t.id).filter(Boolean)),byeIds:(round.bye||[]).map(t=>t&&t.id).filter(Boolean),pausedTeamIds:(round.paused||[]).map(t=>t&&t.id).filter(Boolean)}:null;
        // Compute the true remaining seconds at save time so that restoring never
        // tries to resume a timer whose epoch is in the past (which would instantly
        // trigger the end-of-round alarm on restore).
        const savedSecsLeft=timerRunningRef.current&&timerStartedAtRef.current
          ?Math.max(0,timerPausedSecsRef.current-Math.floor((Date.now()-timerStartedAtRef.current)/1000))
          :timerPausedSecsRef.current;
        saveState({phase,activeTeamIds,courtNumbers,timerDuration,timerDefaultMins,history,roundNum,pausedIds,roundData:rd,teamRegistry:tournamentTeams,tournamentTitle,
          tournamentMode,roundRobinSchedule,roundRobinCourts,roundRobinStartRoundNum,roundRobinStartSnapshot,roundRobinEndSnapshot,activeRoundExtras,liveAdditions,nextRoundPresets,tournamentFinished,breakMode,cancelledRoundNums,
          timerRunning:false,timerStartedAt:null,timerPausedSecsLeft:savedSecsLeft,savedAt:Date.now()});
      },[phase,history,roundNum,pausedIds,activeTeamIds,courtNumbers,timerDuration,tournamentMode,roundRobinSchedule,roundRobinCourts,roundRobinStartRoundNum,roundRobinStartSnapshot,roundRobinEndSnapshot,activeRoundExtras,liveAdditions,nextRoundPresets,tournamentFinished,breakMode,cancelledRoundNums]);

      const handleRestore=()=>{ const s=savedState;setSavedState(null);updateAllStates(normaliseSnapshot(s));setActiveTab("play"); };

      const pushTimerState=(r,sa,ps)=>pushAtomicUpdate({timerRunning:r,timerStartedAt:sa,timerPausedSecsLeft:ps});
      const resetTimer=(ns)=>{ alarmFiredRef.current=false; warningsFiredRef.current=new Set(); const s=ns??timerDuration;setTimerAlarmed(false);applyTimerState(false,null,s);if(isAdmin)pushTimerState(false,null,s); };
      const timerToggle=()=>{
        if(!timerRunning){const sa=Date.now();applyTimerState(true,sa,timerPausedSecsRef.current);if(isAdmin)pushTimerState(true,sa,timerPausedSecsRef.current);}
        else{const s=computeSecsLeft();applyTimerState(false,null,s);if(isAdmin)pushTimerState(false,null,s);}
      };

      const numCourts=courtNumbers.length, courtKey=idx=>`court_${idx}`, liveKey=i=>`live_${i}`;

      const handleStart=(allTeams,teamIds,courts,durSecs,title)=>{
        registerTeams(allTeams);setTournamentTeams(allTeams);
        const resolvedTitle=title||"Tournament";
        setTournamentTitle(resolvedTitle);
        const s=mkStandings(teamIds);
        const snap={phase:"play",activeTeamIds:teamIds,courtNumbers:courts,teamRegistry:allTeams,tournamentTitle:resolvedTitle,timerDuration:durSecs,timerDefaultMins:durSecs>0?Math.round(durSecs/60):12,history:[],roundNum:0,pausedIds:[],timerRunning:false,timerStartedAt:null,timerPausedSecsLeft:durSecs,roundData:null,roundComplete:false,tournamentMode:"swiss",roundRobinSchedule:null,roundRobinCourts:null,roundRobinStartRoundNum:null,roundRobinStartSnapshot:null,roundRobinEndSnapshot:null,activeRoundExtras:[],tournamentFinished:false,savedAt:Date.now()};
        saveState(snap);pushSnapshot(snap);setIsAdmin(true);
        setActiveTeamIds(teamIds);setCourtNumbers(courts);setTimerDuration(durSecs);
        setStandings(s);setRound(null);setRoundNum(0);setHistory([]);
        lastSeenRoundNum.current=0;pendingRef.current={};setPending({});setPausedIds([]);setRoundKey(0);setRoundComplete(false);
        setTournamentMode("swiss");setRoundRobinSchedule(null);setRoundRobinCourts(null);setRoundRobinStartRoundNum(null);setRoundRobinStartSnapshot(null);setRoundRobinEndSnapshot(null);setActiveRoundExtras([]);setTournamentFinished(false);
        alarmFiredRef.current=false; warningsFiredRef.current=new Set(); setTimerAlarmed(false);applyTimerState(false,null,durSecs);
        setPhase("play");setActiveTab("play");
      };

      const handleBreakStart=(message,durationSecs)=>{
        const bm={message,endAt:Date.now()+durationSecs*1000};
        setBreakMode(bm);setShowBreakModal(false);
        if(isAdmin)pushAtomicUpdate({breakMode:bm});
      };
      const handleBreakEnd=()=>{
        setBreakMode(null);
        if(isAdmin)pushAtomicUpdate({breakMode:null});
      };

      const handlePinSuccess=()=>{
        if(pinPurpose==="admin")setIsAdmin(true);
        else if(pinPurpose==="reset"){clearSave();pushSnapshot(null);lastSeenRoundNum.current=-1;setPhase("setup");setIsAdmin(false);setHistory([]);setStandings([]);setRound(null);setPausedIds([]);pendingRef.current={};setPending({});setTournamentMode("swiss");setRoundRobinSchedule(null);setRoundRobinCourts(null);setRoundRobinStartRoundNum(null);setRoundRobinStartSnapshot(null);setRoundRobinEndSnapshot(null);setActiveRoundExtras([]);setLiveAdditions([]);setNextRoundPresets([]);setTournamentFinished(false);setBreakMode(null);setCancelledRoundNums([]);resetTimer(0);}
        else if(pinPurpose==="regenerate"){doRegenerateRound();}
        else if(pinPurpose==="exitRR"){doExitRoundRobin();}
        else if(pinPurpose==="cancelRound"){doCancelRound();}
        else if(pinPurpose==="removeGame"&&removeGameTarget){
          const{ri,gameIdx}=removeGameTarget;
          const nh=history.map((h,i)=>i!==ri?h:{...h,games:h.games.filter((_,gi)=>gi!==gameIdx)});
          const ns=rebuildStandings(activeTeamIds,nh);
          if(isAdmin)pushAtomicUpdate({history:nh});
          setHistory(nh);setStandings(ns);setRemoveGameTarget(null);
        }
        setPinPurpose(null);
      };

      const handleManageTeamsSave=(newRegistry,newActiveIds)=>{
        registerTeams(newRegistry);
        setTournamentTeams(newRegistry);
        setActiveTeamIds(newActiveIds);
        const ns=rebuildStandings(newActiveIds,history);
        setStandings(ns);
        setShowManageTeams(false);
        if(isAdmin)pushAtomicUpdate({teamRegistry:newRegistry,activeTeamIds:newActiveIds});
      };

            const handleManageCourtsSave=(newCourts)=>{
        const update={courtNumbers:newCourts};
        if(tournamentMode==="roundrobin"&&roundRobinCourts){
          const mapped=roundRobinCourts.map(old=>{const idx=courtNumbers.indexOf(old);return idx>=0&&idx<newCourts.length?newCourts[idx]:old;});
          setRoundRobinCourts(mapped);update.roundRobinCourts=mapped;
        }
        setCourtNumbers(newCourts);
        setShowManageCourts(false);
        if(isAdmin)pushAtomicUpdate(update);
      };

      const handleTogglePause=id=>{
        const np=pausedIds.includes(id)?pausedIds.filter(x=>x!==id):[...pausedIds,id];
        setPausedIds(np);
        if(isAdmin)pushAtomicUpdate({pausedIds:np});
      };

      const handleResult=(ci,result)=>{
        warmUpAudio(); const key=courtKey(ci);
        const np={...pendingRef.current,[key]:result};
        pendingRef.current=np;
        setPending(np);
        if(isAdmin)pushAtomicUpdate({[`pendingResults/${key}`]:result});
        if(round.courts.every((_,i)=>np[courtKey(i)])&&liveAdditions.every((_,i)=>np[liveKey(i)])){
          const officialGames=round.courts.map((_,i)=>({...np[courtKey(i)],courtNumber:courtNumbers[i]??i+1}));
          const liveGames=liveAdditions.map((la,i)=>({...np[liveKey(i)],courtNumber:la.courtNumber}));
          const games=[...officialGames,...liveGames,...activeRoundExtras];
          const entry={roundNum,games,bye:round.bye.map(t=>t.id),paused:(round.paused||[]).map(t=>t.id)};
          const nh=[...history,entry], ns=rebuildStandings(activeTeamIds,nh);
          if(isAdmin){const snap={phase:"play",activeTeamIds,courtNumbers,teamRegistry:tournamentTeams,tournamentTitle,timerDuration,timerDefaultMins,history:nh,roundNum,pausedIds,roundComplete:true,timerRunning:false,timerStartedAt:null,timerPausedSecsLeft:timerDuration,roundData:null,tournamentMode,roundRobinSchedule,roundRobinCourts,roundRobinStartRoundNum,roundRobinStartSnapshot,roundRobinEndSnapshot,activeRoundExtras:[],liveAdditions:[],nextRoundPresets,tournamentFinished,savedAt:Date.now()};saveState(snap);pushSnapshot(snap);}
          setHistory(nh);setStandings(ns);setRound(null);setRoundComplete(true);setActiveRoundExtras([]);setLiveAdditions([]);alarmFiredRef.current=false;setTimerAlarmed(false);applyTimerState(false,null,timerDuration);
        }
      };

      const handleLiveResult=(i,result)=>{
        warmUpAudio();const key=liveKey(i);
        const np={...pendingRef.current,[key]:result};
        pendingRef.current=np;setPending(np);
        if(isAdmin)pushAtomicUpdate({[`pendingResults/${key}`]:result});
        if(round.courts.every((_,ci)=>np[courtKey(ci)])&&liveAdditions.every((_,li)=>np[liveKey(li)])){
          const officialGames=round.courts.map((_,ci)=>({...np[courtKey(ci)],courtNumber:courtNumbers[ci]??ci+1}));
          const liveGames=liveAdditions.map((la,li)=>({...np[liveKey(li)],courtNumber:la.courtNumber}));
          const games=[...officialGames,...liveGames,...activeRoundExtras];
          const entry={roundNum,games,bye:round.bye.map(t=>t.id),paused:(round.paused||[]).map(t=>t.id)};
          const nh=[...history,entry],ns=rebuildStandings(activeTeamIds,nh);
          if(isAdmin){const snap={phase:"play",activeTeamIds,courtNumbers,teamRegistry:tournamentTeams,tournamentTitle,timerDuration,timerDefaultMins,history:nh,roundNum,pausedIds,roundComplete:true,timerRunning:false,timerStartedAt:null,timerPausedSecsLeft:timerDuration,roundData:null,tournamentMode,roundRobinSchedule,roundRobinCourts,roundRobinStartRoundNum,roundRobinStartSnapshot,roundRobinEndSnapshot,activeRoundExtras:[],liveAdditions:[],nextRoundPresets,tournamentFinished,savedAt:Date.now()};saveState(snap);pushSnapshot(snap);}
          setHistory(nh);setStandings(ns);setRound(null);setRoundComplete(true);setActiveRoundExtras([]);setLiveAdditions([]);alarmFiredRef.current=false;setTimerAlarmed(false);applyTimerState(false,null,timerDuration);
        }
      };

      // Regenerate current round — requires PIN if any scores already entered
      const handleRegenerateRound=()=>{
        if(Object.keys(pending).length>0){setPinPurpose("regenerate");return;}
        doRegenerateRound();
      };
      const doRegenerateRound=()=>{
        const ns=rebuildStandings(activeTeamIds,history);
        const nr=generateRound(ns,numCourts,history.length,history,pausedIds,finalRound);
        if(isAdmin){const rd={courtTeamIds:nr.courts.map(p=>p.map(t=>t.id)),byeIds:nr.bye.map(t=>t.id),pausedTeamIds:(nr.paused||[]).map(t=>t.id)};pushAtomicUpdate({roundData:rd,pendingResults:null});}
        setRound(nr);pendingRef.current={};setPending({});setRoundKey(k=>k+1);setLiveAdditions([]);
      };

      const doCancelRound=()=>{
        const prevRN=Math.max(0,roundNum-1);
        const prevRC=history.length>0;
        const newCancelled=[...cancelledRoundNums,roundNum];
        const snap={phase:"play",activeTeamIds,courtNumbers,teamRegistry:tournamentTeams,tournamentTitle,
          timerDuration,timerDefaultMins,history,roundNum:prevRN,pausedIds,roundComplete:prevRC,
          timerRunning:false,timerStartedAt:null,timerPausedSecsLeft:timerDuration,
          roundData:null,tournamentMode,roundRobinSchedule,roundRobinCourts,roundRobinStartRoundNum,
          roundRobinStartSnapshot,roundRobinEndSnapshot,activeRoundExtras:[],liveAdditions:[],nextRoundPresets,tournamentFinished,cancelledRoundNums:newCancelled,savedAt:Date.now()};
        lastSeenRoundNum.current=prevRN;saveState(snap);pushSnapshot(snap);
        setCancelledRoundNums(newCancelled);
        setRound(null);setRoundNum(prevRN);setRoundComplete(prevRC);
        pendingRef.current={};setPending({});setActiveRoundExtras([]);setRoundKey(k=>k+1);
        alarmFiredRef.current=false;warningsFiredRef.current=new Set();setTimerAlarmed(false);
        applyTimerState(false,null,timerDuration);
      };

      // Advance to next round (or generate round 1 from roundNum=0)
      const handleGenerateRound=()=>{
        const ns=rebuildStandings(activeTeamIds,history);
        // Apply presets: lock specified teams to their courts, let algorithm fill the rest
        const validPresets=nextRoundPresets.filter(p=>
          !pausedIds.includes(p.teamId1)&&!pausedIds.includes(p.teamId2)&&
          activeTeamIds.includes(p.teamId1)&&activeTeamIds.includes(p.teamId2)
        );
        const presetTeamSet=new Set(validPresets.flatMap(p=>[p.teamId1,p.teamId2]));
        const nsFiltered=ns.filter(t=>!presetTeamSet.has(t.id));
        const numAlgCourts=Math.max(0,numCourts-validPresets.length);
        const nr=generateRound(nsFiltered,numAlgCourts,history.length,history,pausedIds,finalRound);
        // Merge presets at their specified court indices; algorithm courts fill gaps
        const safe=id=>ns.find(t=>t.id===id)||teamById(id)||{id,name:String(id),color:"#475569",text:"#fff"};
        const allCourts=new Array(numCourts).fill(null);
        validPresets.forEach(p=>{const idx=courtNumbers.indexOf(p.courtNumber);if(idx>=0&&idx<numCourts&&!allCourts[idx])allCourts[idx]=[safe(p.teamId1),safe(p.teamId2)];});
        let algI=0;
        for(let i=0;i<numCourts;i++){if(!allCourts[i]&&algI<nr.courts.length)allCourts[i]=nr.courts[algI++];}
        while(algI<nr.courts.length)allCourts.push(nr.courts[algI++]);
        const finalCourts=allCourts.filter(Boolean);
        const mergedNr={...nr,courts:finalCourts};
        const newRN=roundNum===0?1:roundNum+1;
        if(isAdmin){
          const rd={courtTeamIds:mergedNr.courts.map(p=>p.map(t=>t.id)),byeIds:nr.bye.map(t=>t.id),pausedTeamIds:(nr.paused||[]).map(t=>t.id)};
          const sa=timerDuration>0?Date.now():null;
          const snap={phase:"play",activeTeamIds,courtNumbers,teamRegistry:tournamentTeams,tournamentTitle,timerDuration,timerDefaultMins,history,roundNum:newRN,pausedIds,roundComplete:false,timerRunning:timerDuration>0,timerStartedAt:sa,timerPausedSecsLeft:timerDuration,roundData:rd,tournamentMode,roundRobinSchedule,roundRobinCourts,roundRobinStartRoundNum,roundRobinStartSnapshot,roundRobinEndSnapshot,activeRoundExtras,liveAdditions:[],nextRoundPresets:[],tournamentFinished,savedAt:Date.now()};
          lastSeenRoundNum.current=newRN;saveState(snap);pushSnapshot(snap);
        }
        setRound(mergedNr);setRoundNum(newRN);pendingRef.current={};setPending({});setRoundKey(k=>k+1);setRoundComplete(false);setFinalRound(false);setActiveRoundExtras([]);setNextRoundPresets([]);
        alarmFiredRef.current=false; warningsFiredRef.current=new Set();
        const sa=timerDuration>0?Date.now():null;applyTimerState(timerDuration>0,sa,timerDuration);
      };

      // ── Round-Robin: start (called from team-selection modal) ─────────────
      const handleStartRoundRobin=(participatingIds,courtsForRR)=>{
        const courts=(courtsForRR&&courtsForRR.length>0)?courtsForRR:courtNumbers;
        const schedule=generateRoundRobinSchedule(participatingIds,courts.length);
        const rrStart=(roundNum||0)+1;
        const partSet=new Set(participatingIds);
        const excludedIds=activeTeamIds.filter(id=>!partSet.has(id));
        const snapshot={startRoundNum:rrStart,participatingIds:[...participatingIds],excludedIds};
        setTournamentMode("roundrobin");
        setRoundRobinSchedule(schedule);
        setRoundRobinCourts(courts);
        setRoundRobinStartRoundNum(rrStart);
        setRoundRobinStartSnapshot(snapshot);
        setRoundRobinEndSnapshot(null);
        setShowSelectRRTeams(false);
        if(isAdmin){
          pushAtomicUpdate({
            tournamentMode:"roundrobin",
            roundNum:rrStart,
            roundRobinSchedule:schedule,
            roundRobinCourts:courts,
            roundRobinStartRoundNum:rrStart,
            roundRobinStartSnapshot:snapshot,
            roundRobinEndSnapshot:null,
            roundData:null,
            roundComplete:false,
            pendingResults:null,
          });
        }
        setRoundNum(rrStart);lastSeenRoundNum.current=rrStart;
        pendingRef.current={};setPending({});setRound(null);setRoundComplete(false);
      };

      // ── Round-Robin: exit (revert to swiss; preserve history) ─────────────
      // PIN-gated to avoid accidental exits losing the schedule.
      const handleExitRoundRobin=()=>{ setPinPurpose("exitRR"); };
      const doExitRoundRobin=(reason="manual")=>{
        // Always record an end-snapshot so the History tab can show the marker.
        // endRoundNum is null when no RR rounds were committed (exited before playing).
        const srn=roundRobinStartRoundNum||0;
        const rrRoundsInHistory=history.filter(h=>h.roundNum>=srn);
        const lastRRNum=rrRoundsInHistory.length>0?rrRoundsInHistory.reduce((m,h)=>Math.max(m,h.roundNum),0):null;
        const endSnap={endRoundNum:lastRRNum,endReason:reason};
        setTournamentMode("swiss");
        setRoundRobinSchedule(null);
        setRoundRobinCourts(null);
        setRoundRobinStartRoundNum(null);
        setRoundRobinEndSnapshot(endSnap);
        // Clear any uncommitted RR pending entries
        const cleared={};
        Object.keys(pendingRef.current).forEach(k=>{if(!k.startsWith("rr_"))cleared[k]=pendingRef.current[k];});
        pendingRef.current=cleared;setPending(cleared);
        if(isAdmin){
          pushAtomicUpdate({
            tournamentMode:"swiss",
            roundRobinSchedule:null,
            roundRobinCourts:null,
            roundRobinStartRoundNum:null,
            roundRobinEndSnapshot:endSnap,
            pendingResults:null,
          });
        }
      };

      // ── Round-Robin: per-match score submission ────────────────────────────
      // Each match keyed by `rr_<schedRoundIdx>_<matchIdx>`. When all matches
      // of a scheduling round are filled, that round commits to history.
      const rrMatchKey=(sr,mi)=>`rr_${sr}_${mi}`;
      const handleRRMatchResult=(srIdx,matchIdx,result)=>{
        warmUpAudio();
        const key=rrMatchKey(srIdx,matchIdx);
        const np={...pendingRef.current,[key]:result};
        pendingRef.current=np;setPending(np);
        if(isAdmin)pushAtomicUpdate({[`pendingResults/${key}`]:result});

        // Check if this scheduling round is now complete
        const schedRound=roundRobinSchedule[srIdx]||[];
        const allFilled=schedRound.every((_,mi)=>np[rrMatchKey(srIdx,mi)]);
        if(allFilled){
          const targetRoundNum=(roundRobinStartRoundNum||1)+srIdx;
          // Avoid double-commit if already in history
          if(history.some(h=>h.roundNum===targetRoundNum))return;
          const rrCourts=(roundRobinCourts&&roundRobinCourts.length>0)?roundRobinCourts:courtNumbers;
          const games=schedRound.map((_,mi)=>{
            const r=np[rrMatchKey(srIdx,mi)];
            return{...r,courtNumber:rrCourts[mi]??mi+1};
          });
          const entry={roundNum:targetRoundNum,games,bye:[],paused:[]};
          const nh=[...history,entry], ns=rebuildStandings(activeTeamIds,nh);
          // Remove this scheduling round's pending keys
          const cleared={...np};
          schedRound.forEach((_,mi)=>{delete cleared[rrMatchKey(srIdx,mi)];});
          pendingRef.current=cleared;setPending(cleared);
          setHistory(nh);setStandings(ns);
          // Track max round committed (admin may score scheduling rounds out of order)
          const newRoundNum=Math.max(roundNum||0,targetRoundNum);
          // Detect if every scheduling round is now committed → write the end-snapshot
          const totalSched=roundRobinSchedule.length;
          const allDone=roundRobinSchedule.every((_,i)=>nh.some(hh=>hh.roundNum===(roundRobinStartRoundNum||1)+i));
          let endSnap=null;
          if(allDone&&totalSched>0){
            const lastRRNum=(roundRobinStartRoundNum||1)+totalSched-1;
            endSnap={endRoundNum:lastRRNum,endReason:"completed"};
            setRoundRobinEndSnapshot(endSnap);
          }
          if(isAdmin){
            const pendingClear={};
            schedRound.forEach((_,mi)=>{pendingClear[`pendingResults/${rrMatchKey(srIdx,mi)}`]=null;});
            pushAtomicUpdate({history:nh,roundNum:newRoundNum,...pendingClear,...(endSnap?{roundRobinEndSnapshot:endSnap}:{})});
          }
          setRoundNum(newRoundNum);
          lastSeenRoundNum.current=newRoundNum;
        }
      };

      // Edit historical game (teams + scores) + recompute byes for that round
      const handleEditSave=(ri,gameIdx,{game:ng,newBye})=>{
        const nh=history.map((h,i)=>i!==ri?h:{...h,games:h.games.map((g,gi)=>gi!==gameIdx?g:{...ng}),bye:newBye});
        const ns=rebuildStandings(activeTeamIds,nh);
        if(isAdmin)pushAtomicUpdate({history:nh});
        // Never touch round — active round stays intact; between rounds stays null
        // and will be generated fresh when the admin advances.
        setHistory(nh);setStandings(ns);setEditTarget(null);
      };

      // Edit an ongoing court (change teams and/or move to a different court number)
      const handleEditActiveCourt=({courtIdx,teamAId,teamBId,newCourtIdx})=>{
        const tA=teamById(teamAId),tB=teamById(teamBId);
        if(!tA||!tB||!round)return;
        const newCourts=round.courts.map(p=>[...p]);
        if(newCourtIdx!==courtIdx){
          // Swap: displaced pair goes to old position, new pair goes to newCourtIdx
          const displaced=newCourts[newCourtIdx];
          newCourts[courtIdx]=displaced;
          newCourts[newCourtIdx]=[tA,tB];
        }else{
          newCourts[courtIdx]=[tA,tB];
        }
        const newRound={...round,courts:newCourts};
        setRound(newRound);
        // Clear pending results for affected courts
        const np={...pendingRef.current};
        delete np[courtKey(courtIdx)];
        if(newCourtIdx!==courtIdx)delete np[courtKey(newCourtIdx)];
        pendingRef.current=np;setPending(np);
        if(isAdmin){
          const rd={courtTeamIds:newCourts.map(p=>p.map(t=>t.id)),byeIds:(round.bye||[]).map(t=>t.id),pausedTeamIds:(round.paused||[]).map(t=>t.id)};
          const clr={};
          clr[`pendingResults/${courtKey(courtIdx)}`]=null;
          if(newCourtIdx!==courtIdx)clr[`pendingResults/${courtKey(newCourtIdx)}`]=null;
          pushAtomicUpdate({roundData:rd,...clr});
        }
        setEditActiveCourt(null);
      };

      // ── Manually add a game ─────────────────────────────────────────────────
      // target: "active" → adds to the currently-active round's extras (committed when round commits)
      //         number  → history index — modifies that history entry directly
      const handleAddGameSave=(target,game)=>{
        if(target==="active"){
          // If the round is currently active, store as an extra (will commit with the round).
          // If round is null but we want to attach to most-recent history entry, fall through.
          if(round){
            const ne=[...activeRoundExtras,game];
            setActiveRoundExtras(ne);
            if(isAdmin)pushAtomicUpdate({activeRoundExtras:ne});
          }else if(history.length>0){
            // No active round — append to the most recent history entry.
            const ri=history.length-1;
            const nh=history.map((h,i)=>i!==ri?h:{...h,games:[...h.games,game]});
            const ns=rebuildStandings(activeTeamIds,nh);
            setHistory(nh);setStandings(ns);
            if(isAdmin)pushAtomicUpdate({history:nh});
          }
        }else{
          const ri=Number(target);
          const nh=history.map((h,i)=>i!==ri?h:{...h,games:[...h.games,game]});
          const ns=rebuildStandings(activeTeamIds,nh);
          setHistory(nh);setStandings(ns);
          if(isAdmin)pushAtomicUpdate({history:nh});
        }
        setShowAddGame(null);
      };

      // ── Tournament finish / resume ──────────────────────────────────────────
      const handleFinishTournament=()=>{
        const s=computeSecsLeft();
        applyTimerState(false,null,s);
        setBreakMode(null);
        setTournamentFinished(true);
        if(isAdmin)pushAtomicUpdate({tournamentFinished:true,timerRunning:false,timerStartedAt:null,timerPausedSecsLeft:s,breakMode:null});
      };
      const handleResumeTournament=()=>{
        setTournamentFinished(false);
        if(isAdmin)pushAtomicUpdate({tournamentFinished:false});
      };

      // ── Post-RR-completion shortcut: continue with Swiss ────────────────────
      // Called from the post-RR "What's next?" panel — no PIN required because
      // RR already finished naturally; the schedule is empty of unplayed work.
      const handleContinueSwissAfterRR=()=>{ doExitRoundRobin("completed"); };

      const ranked=rerank(standings);

      return(
        <div className="min-h-screen" onClick={warmUpAudio}
          style={{background:"#fff",fontFamily:"'Trebuchet MS',sans-serif",color:"#1e293b"}}>

          {pinPurpose&&<PinModal title={pinPurpose==="reset"?"PIN required to reset":pinPurpose==="exitRR"?"PIN required to exit Round Robin":pinPurpose==="cancelRound"?"PIN required to cancel round":pinPurpose==="removeGame"?"PIN required to delete game":"Admin PIN"} correctPin={adminPin} pinLoaded={adminPinLoaded} onSuccess={handlePinSuccess} onClose={()=>{setPinPurpose(null);setRemoveGameTarget(null);}}/>}
          {showBreakModal&&<BreakModal onStart={handleBreakStart} onClose={()=>setShowBreakModal(false)}/>}
          {showTimerSettings&&<TimerSettingsModal currentMins={timerDefaultMins} onSave={m=>{setTimerDefaultMins(m);setTimerDuration(m*60);if(isAdmin)pushAtomicUpdate({timerDefaultMins:m,timerDuration:m*60});}} onClose={()=>setShowTimerSettings(false)}/>}
          {showManageTeams&&<ManageTeamsModal activeTeamIds={activeTeamIds} tournamentTeams={tournamentTeams} onSave={handleManageTeamsSave} onClose={()=>setShowManageTeams(false)}/>}
          {showManageCourts&&<ManageCourtsModal courtNumbers={courtNumbers} onSave={handleManageCourtsSave} onClose={()=>setShowManageCourts(false)}/>}
          {showSelectRRTeams&&<SelectRoundRobinTeamsModal rankedTeamIds={ranked.map(t=>t.id)} tournamentCourts={courtNumbers} onConfirm={handleStartRoundRobin} onClose={()=>setShowSelectRRTeams(false)}/>}
          {showAddGame&&<AddGameModal
            allTeamIds={activeTeamIds}
            defaultCourt={showAddGame.defaultCourt||""}
            courtNumbers={courtNumbers}
            usedCourtNumbers={showAddGame.target==="active"
              ?[...(round?.courts.map((_,i)=>String(courtNumbers[i]??i+1))||[]),...liveAdditions.map(la=>String(la.courtNumber)),...activeRoundExtras.map(g=>String(g.courtNumber))]
              :(()=>{const ri=Number(showAddGame.target);return(!isNaN(ri)&&history[ri])?history[ri].games.map(g=>String(g.courtNumber)):[];})()}
            label={showAddGame.target==="active"?(round?`Round ${roundNum}`:(history.length>0?`Round ${history[history.length-1].roundNum}`:"")):`Round ${history[Number(showAddGame.target)]?.roundNum||""}`}
            onSave={g=>handleAddGameSave(showAddGame.target,g)}
            onClose={()=>setShowAddGame(null)}/>}
          {showPresetMatch&&<PresetMatchModal
            allTeamIds={activeTeamIds}
            courtNumbers={courtNumbers}
            usedTeamIds={nextRoundPresets.flatMap(p=>[p.teamId1,p.teamId2])}
            usedCourtNumbers={nextRoundPresets.map(p=>String(p.courtNumber))}
            onSave={p=>{const np=[...nextRoundPresets,p];setNextRoundPresets(np);if(isAdmin)pushAtomicUpdate({nextRoundPresets:np});setShowPresetMatch(false);}}
            onClose={()=>setShowPresetMatch(false)}/>}
          {showLiveAddGame&&<PresetMatchModal
            allTeamIds={activeTeamIds}
            courtNumbers={courtNumbers}
            usedTeamIds={[...(round?.courts.flatMap(p=>p.map(t=>t.id))||[]),...liveAdditions.flatMap(la=>[la.teamId1,la.teamId2])]}
            usedCourtNumbers={[...(round?.courts.map((_,i)=>String(courtNumbers[i]??i+1))||[]),...liveAdditions.map(la=>String(la.courtNumber))]}
            onSave={la=>{const nl=[...liveAdditions,la];setLiveAdditions(nl);if(isAdmin)pushAtomicUpdate({liveAdditions:nl});setShowLiveAddGame(false);}}
            onClose={()=>setShowLiveAddGame(false)}/>}
          {editTarget&&history[editTarget.ri]&&(
            <EditGameModal
              game={history[editTarget.ri].games[editTarget.gameIdx]}
              roundEntry={history[editTarget.ri]}
              allTeamIds={activeTeamIds}
              label={`Round ${history[editTarget.ri].roundNum} · Court ${history[editTarget.ri].games[editTarget.gameIdx].courtNumber}`}
              onSave={d=>handleEditSave(editTarget.ri,editTarget.gameIdx,d)}
              onClose={()=>setEditTarget(null)}/>
          )}
          {editActiveCourt!==null&&round&&(
            <EditActiveCourtModal
              courtIdx={editActiveCourt}
              courtNumbers={courtNumbers}
              currentCourts={round.courts}
              allTeamIds={activeTeamIds}
              hasPending={!!pending[courtKey(editActiveCourt)]}
              usedCourtNumbers={liveAdditions.map(la=>String(la.courtNumber))}
              onSave={handleEditActiveCourt}
              onClose={()=>setEditActiveCourt(null)}/>
          )}

          {/* Floating "show header" pill — only when header is hidden */}
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
              {/* Title bar */}
              <div className="flex items-center gap-3 py-3">
                <img src={BALL_ICO} alt="pickleball" style={{width:"clamp(36px,7vw,52px)",height:"clamp(36px,7vw,52px)",borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>
                <div className="flex-1 min-w-0">
                  <h1 className="font-black tracking-tight leading-tight truncate" style={{fontSize:"clamp(16px,4vw,26px)",color:"#0f4c75"}}>
                    {tournamentTitle}
                  </h1>
                  <div className="flex items-center gap-2 flex-wrap">
                    {phase==="play"&&<p className="text-slate-500" style={{fontSize:"clamp(10px,2.5vw,13px)"}}>{activeTeamIds.length} teams · {isAdmin?'🟢 Admin':'🔵 Viewer'}</p>}
                    {phase==="setup"&&<p className="text-slate-500" style={{fontSize:"clamp(10px,2.5vw,13px)"}}>Setup</p>}
                    {(phase==="waiting"||phase==="loading")&&!isAdmin&&<p className="text-slate-500" style={{fontSize:"clamp(10px,2.5vw,13px)"}}>🔵 Live Viewer</p>}
                    {(presence.admins>0||presence.viewers>0)&&(
                      <span className="text-slate-400" style={{fontSize:"clamp(9px,2vw,11px)"}}>
                        {(presence.admins-(isAdmin?1:0))>0&&`🟢${presence.admins-(isAdmin?1:0)} `}{(presence.viewers-(isAdmin?0:1))>0&&`🔵${presence.viewers-(isAdmin?0:1)}`}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={()=>{if(isAdmin)setIsAdmin(false);else setPinPurpose("admin");}}
                  style={{flexShrink:0,fontSize:"clamp(10px,2.5vw,13px)",padding:"6px 10px",borderRadius:10,fontWeight:700,cursor:"pointer",
                    background:isAdmin?"rgba(251,191,36,0.18)":"rgba(0,0,0,0.06)",
                    color:isAdmin?"#92400e":"#64748b",
                    border:`1px solid ${isAdmin?"rgba(251,191,36,0.5)":"rgba(0,0,0,0.12)"}`}}>
                  {isAdmin?"🔓 Admin":"🔒"}
                </button>
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
              {/* Compact timer / break bar pinned to the fixed header */}
              {phase==="play"&&(timerDuration>0||breakMode)&&(
                <div className="pb-2">
                  <RoundTimer secsLeft={timerSecsLeft} totalSecs={timerDuration} roundNum={roundNum}
                    timerRunning={timerRunning} isAdmin={isAdmin}
                    onToggle={timerToggle} onRestart={()=>resetTimer(timerDuration)} onOpenSettings={()=>setShowTimerSettings(true)}
                    breakInfo={breakMode} onEndBreak={handleBreakEnd}/>
                </div>
              )}
            </div>
          </div>

          {/* ── Scrollable content, padded below fixed header ── */}
          {/* Header height: ~80px title + ~40px tabs (+ ~70px timer when enabled) when play; ~80px otherwise */}
          <div onTouchStart={phase==="play"?handleSwipeStart:undefined} onTouchEnd={phase==="play"?handleSwipeEnd:undefined}
            style={{maxWidth:720,margin:"0 auto",padding:`${headerHidden?44:headerHeight+8}px clamp(12px,3vw,20px) clamp(16px,3vw,24px)`}}>

            {(phase==="loading"||phase==="waiting")&&!isAdmin&&(
              <div className="rounded-2xl p-10 text-center flex flex-col items-center gap-4" style={{background:"rgba(0,0,0,0.03)",border:"1px solid rgba(0,0,0,0.08)"}}>
                {phase==="loading"?(<><div className="text-3xl">🔄</div><p className="text-slate-500 text-sm">Connecting to tournament…</p></>)
                  :(<><div className="text-3xl">🏓</div><p className="text-slate-700 font-bold">No active tournament</p><p className="text-slate-500 text-sm">Waiting for the admin to start a game.</p>{savedState&&<RestoreBanner saved={savedState} onRestore={handleRestore} onDiscard={()=>{setSavedState(null);clearSave();}}/>}</>)}
              </div>
            )}
            {(phase==="loading"||phase==="waiting"||phase==="setup")&&isAdmin&&(
              <>{savedState&&<RestoreBanner saved={savedState} onRestore={handleRestore} onDiscard={()=>{setSavedState(null);clearSave();}}/>}<SetupScreen onStart={handleStart}/></>
            )}

            {phase==="play"&&(
              <>
                {/* The compact RoundTimer used to live here (non-play tabs only); it now sits
                    in the fixed header on every tab — see the timer block above the content. */}

                {/* ── Break banner — shown on Play tab when break is active ── */}
                {activeTab==="play"&&breakMode&&(
                  <div className="rounded-2xl flex flex-col gap-2" style={{padding:"clamp(14px,3.5vw,22px)",background:"linear-gradient(135deg,#fef3c7,#fde68a)",border:"1px solid rgba(217,119,6,0.4)"}}>
                    <div className="flex items-center gap-2">
                      <span style={{fontSize:"clamp(22px,5.5vw,32px)"}}>☕</span>
                      <div>
                        <p style={{fontWeight:900,fontSize:"clamp(14px,3.5vw,20px)",color:"#92400e",margin:0}}>{breakMode.message}</p>
                        <p style={{fontSize:"clamp(10px,2.5vw,13px)",color:"#b45309",margin:0}}>Tournament is on a break — matches resume shortly.</p>
                      </div>
                    </div>
                    {isAdmin&&<button onClick={handleBreakEnd}
                      style={{alignSelf:"flex-start",padding:"6px 16px",borderRadius:8,fontWeight:700,fontSize:"clamp(11px,2.5vw,13px)",cursor:"pointer",
                        background:"rgba(146,64,14,0.15)",color:"#92400e",border:"1px solid rgba(146,64,14,0.3)"}}>
                      End Break
                    </button>}
                  </div>
                )}

                {/* ── Play tab — Tournament FINISHED (top priority) ── */}
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
                                  boxShadow:`0 4px 16px ${t.color}55`,
                                  maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                {t.name}
                              </div>
                              <div style={{fontSize:"clamp(10px,2.5vw,13px)",color:"#64748b",fontWeight:700,marginTop:6}}>
                                {t.wins}W · {t.losses}L · {t.scoreDiff>0?"+":""}{t.scoreDiff}
                              </div>
                              <div style={{
                                width:"100%",height:`clamp(${h*0.5}px,${h*0.18}vw,${h}px)`,
                                marginTop:8,borderRadius:"8px 8px 0 0",
                                background:place===1?"linear-gradient(180deg,#fbbf24,#d97706)":place===2?"linear-gradient(180deg,#cbd5e1,#94a3b8)":"linear-gradient(180deg,#f59e42,#b45309)",
                                display:"flex",alignItems:"center",justifyContent:"center",
                                color:"#fff",fontWeight:900,fontSize:"clamp(20px,5vw,32px)",
                                textShadow:"0 2px 4px rgba(0,0,0,0.3)"}}>
                                {place}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {isAdmin&&<button onClick={handleResumeTournament}
                        style={{padding:"clamp(8px,2vw,12px)",borderRadius:12,fontWeight:700,
                          fontSize:"clamp(12px,3vw,15px)",cursor:"pointer",
                          background:"rgba(0,0,0,0.05)",color:"#475569",border:"1px solid rgba(0,0,0,0.1)"}}>
                        ↩ Resume tournament
                      </button>}
                      {isAdmin&&<button onClick={()=>setPinPurpose("reset")} style={{cursor:"pointer",background:"none",border:"none",color:"#94a3b8",fontSize:12,textDecoration:"underline"}}>↩ Back to setup (resets tournament)</button>}
                    </div>
                  );
                })()}

                {/* ── Play tab — no active round (pre-start or between rounds) ── */}
                {activeTab==="play"&&!tournamentFinished&&!round&&tournamentMode==="swiss"&&(
                  <div className="flex flex-col gap-4">
                    {isAdmin?(
                      <div className="rounded-2xl flex flex-col" style={{padding:"clamp(12px,3vw,20px)",gap:"clamp(8px,2vw,14px)",background:"#f8fafc",border:"1px solid rgba(0,0,0,0.08)"}}>
                        <p className="font-bold text-center" style={{color:"#0f4c75",fontSize:"clamp(13px,3.5vw,18px)"}}>
                          {roundNum===0?"🏓 Ready to start":"✓ Round "+roundNum+" complete"}
                        </p>
                        <p style={{color:"#475569",fontSize:"clamp(11px,2.5vw,14px)",textAlign:"center"}}>
                          {roundNum===0?"Adjust team statuses below, then generate Round 1.":"Adjust team statuses below, then generate the next round."}
                        </p>
                        {roundNum>0&&(
                          <div className="flex items-center justify-between gap-3 rounded-xl"
                            style={{padding:"clamp(10px,2.5vw,16px)",background:finalRound?"rgba(251,191,36,0.1)":"rgba(0,0,0,0.03)",border:`1px solid ${finalRound?"rgba(251,191,36,0.4)":"rgba(0,0,0,0.07)"}`}}>
                            <div>
                              <div style={{fontSize:"clamp(12px,3vw,16px)",fontWeight:700,color:finalRound?"#92400e":"#475569"}}>🏁 Final Round Mode</div>
                              <div style={{fontSize:"clamp(10px,2.5vw,13px)",color:"#94a3b8",marginTop:2}}>Schedules fewer games to equalize games played</div>
                            </div>
                            <button onClick={()=>setFinalRound(f=>!f)}
                              style={{fontSize:"clamp(11px,2.5vw,14px)",padding:"clamp(6px,1.5vw,10px) clamp(10px,2.5vw,16px)",borderRadius:10,fontWeight:700,cursor:"pointer",flexShrink:0,
                                background:finalRound?"rgba(251,191,36,0.25)":"rgba(0,0,0,0.06)",
                                color:finalRound?"#92400e":"#64748b",
                                border:`1px solid ${finalRound?"rgba(251,191,36,0.5)":"rgba(0,0,0,0.1)"}`}}>
                              {finalRound?"✓ On":"Off"}
                            </button>
                          </div>
                        )}
                        <button onClick={handleGenerateRound}
                          style={{width:"100%",padding:"clamp(10px,2.5vw,16px)",borderRadius:12,fontWeight:800,fontSize:"clamp(14px,3.5vw,18px)",cursor:"pointer",
                            background:finalRound?"linear-gradient(90deg,#d97706,#f59e0b)":"linear-gradient(90deg,#0f4c75,#1a6fa8)",color:"#fff"}}>
                          {roundNum===0?"Generate Round 1 →":finalRound?"🏁 Generate Final Round →":`Generate Round ${roundNum+1} →`}
                        </button>
                        <button onClick={()=>setShowSelectRRTeams(true)}
                          style={{width:"100%",padding:"clamp(8px,2vw,12px)",borderRadius:12,fontWeight:700,fontSize:"clamp(12px,3vw,15px)",cursor:"pointer",
                            background:"linear-gradient(90deg,#6366f1,#8b5cf6)",color:"#fff",border:"none"}}>
                          🔁 Start Round Robin →
                        </button>
                        <button onClick={()=>setShowPresetMatch(true)}
                          style={{width:"100%",padding:"clamp(8px,2vw,12px)",borderRadius:12,fontWeight:700,fontSize:"clamp(12px,3vw,15px)",cursor:"pointer",
                            background:"rgba(99,102,241,0.1)",color:"#4338ca",border:"1px solid rgba(99,102,241,0.3)"}}>
                          📌 Pre-set Game for Round {roundNum===0?1:roundNum+1}
                        </button>
                        {nextRoundPresets.length>0&&(
                          <div className="rounded-xl" style={{padding:"clamp(8px,2vw,12px)",background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.2)"}}>
                            <p style={{fontSize:"clamp(9px,2vw,11px)",color:"#4338ca",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Pre-set matchups ({nextRoundPresets.length})</p>
                            <div className="flex flex-col gap-1">
                              {nextRoundPresets.map((p,pi)=>{const t1=teamById(p.teamId1),t2=teamById(p.teamId2);return(
                                <div key={pi} className="flex items-center" style={{gap:"clamp(4px,1vw,8px)",fontSize:"clamp(11px,2.5vw,13px)"}}>
                                  <span style={{color:"#94a3b8",minWidth:50}}>Court {p.courtNumber}</span>
                                  <span style={{color:t1?.color,fontWeight:700}}>{t1?.name}</span>
                                  <span style={{color:"#cbd5e1"}}>vs</span>
                                  <span style={{color:t2?.color,fontWeight:700}}>{t2?.name}</span>
                                  <button onClick={()=>{const np=nextRoundPresets.filter((_,i)=>i!==pi);setNextRoundPresets(np);if(isAdmin)pushAtomicUpdate({nextRoundPresets:np});}}
                                    style={{marginLeft:"auto",fontSize:11,padding:"2px 8px",borderRadius:6,background:"rgba(220,38,38,0.1)",color:"#dc2626",border:"1px solid rgba(220,38,38,0.2)",cursor:"pointer"}}>×</button>
                                </div>
                              );})}
                            </div>
                          </div>
                        )}
                        <button onClick={()=>setShowBreakModal(true)}
                          style={{width:"100%",padding:"clamp(8px,2vw,12px)",borderRadius:12,fontWeight:700,fontSize:"clamp(12px,3vw,15px)",cursor:"pointer",
                            background:"rgba(217,119,6,0.1)",color:"#92400e",border:"1px solid rgba(217,119,6,0.3)"}}>
                          ☕ Pause Tournament (Break)
                        </button>
                        {isAdmin&&<button onClick={handleFinishTournament}
                          style={{width:"100%",padding:"clamp(8px,2vw,12px)",borderRadius:12,fontWeight:700,fontSize:"clamp(12px,3vw,15px)",cursor:"pointer",
                            background:"linear-gradient(90deg,#d97706,#f59e0b)",color:"#fff",border:"none"}}>
                          🏁 Finish Tournament
                        </button>}
                      </div>
                    ):(
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
                    {isAdmin&&<PausePanel activeTeamIds={activeTeamIds} pausedIds={pausedIds} onTogglePause={handleTogglePause}/>}
                    {isAdmin&&<button onClick={()=>setPinPurpose("reset")} style={{cursor:"pointer",background:"none",border:"none",color:"#94a3b8",fontSize:12,textDecoration:"underline"}}>↩ Back to setup (resets tournament)</button>}
                    {isAdmin&&<button onClick={()=>setShowManageTeams(true)} style={{cursor:"pointer",background:"none",border:"none",color:"#6366f1",fontSize:12,textDecoration:"underline"}}>✏️ Manage teams (rename / add)</button>}
                    {isAdmin&&<button onClick={()=>setShowManageCourts(true)} style={{cursor:"pointer",background:"none",border:"none",color:"#6366f1",fontSize:12,textDecoration:"underline"}}>🏟️ Manage courts (rename)</button>}
                  </div>
                )}

                {/* ── Play tab — active round (Swiss only) ── */}
                {activeTab==="play"&&!tournamentFinished&&round&&tournamentMode==="swiss"&&(
                  <div className="flex flex-col gap-4">
                    {/* Full-screen timer removed from the Play tab on 2026-04-29.
                        Compact RoundTimer now lives in the fixed header instead.
                        Keeping the original code below as a reference — may want
                        to bring it back later or reuse for a different surface.
                        {timerDuration>0&&(
                          <FullScreenTimer secsLeft={timerSecsLeft} totalSecs={timerDuration} roundNum={roundNum}
                            timerRunning={timerRunning} isAdmin={isAdmin} timerDuration={timerDuration}
                            onToggle={timerToggle} onRestart={()=>resetTimer(timerDuration)} onOpenSettings={()=>setShowTimerSettings(true)}/>
                        )}
                    */}

                    <div style={{textAlign:"center"}}>
                      <span className="text-blue-900 font-black" style={{fontSize:"clamp(22px,6vw,32px)"}}>Round {roundNum}</span>
                    </div>

                    {isAdmin?(
                      /* Active round — admin */
                      <>
                        {round.courts.map((teams,idx)=>(
                          <div key={`${roundKey}-court-${idx}`} className="flex flex-col" style={{gap:4}}>
                            <CourtCard courtLabel={`Court ${courtNumbers[idx]??idx+1}`}
                              teams={teams} onResult={r=>handleResult(idx,r)} done={!!pending[courtKey(idx)]}/>
                            <button onClick={()=>setEditActiveCourt(idx)}
                              style={{alignSelf:"flex-end",fontSize:"clamp(10px,2vw,12px)",padding:"3px 10px",borderRadius:6,fontWeight:600,cursor:"pointer",background:"rgba(99,102,241,0.08)",color:"#6366f1",border:"1px solid rgba(99,102,241,0.25)"}}>
                              ✏ Edit
                            </button>
                          </div>
                        ))}
                        {liveAdditions.map((la,i)=>{
                          const tA=teamById(la.teamId1),tB=teamById(la.teamId2);
                          if(!tA||!tB)return null;
                          return <CourtCard key={`live-${i}`} courtLabel={`Court ${la.courtNumber}`}
                            teams={[tA,tB]} onResult={r=>handleLiveResult(i,r)} done={!!pending[liveKey(i)]}/>;
                        })}
                        <div className="rounded-2xl flex flex-col" style={{padding:"clamp(10px,2.5vw,16px)",gap:"clamp(8px,2vw,12px)",background:"#f8fafc",border:"1px solid rgba(0,0,0,0.08)"}}>
                          <p style={{fontSize:"clamp(9px,2vw,12px)",color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>Round Options</p>
                          <div className="flex flex-wrap" style={{gap:"clamp(6px,1.5vw,10px)"}}>
                            <button onClick={()=>setFinalRound(f=>!f)}
                              style={{fontSize:"clamp(11px,2.5vw,14px)",padding:"clamp(6px,1.5vw,10px) clamp(10px,2.5vw,16px)",borderRadius:10,fontWeight:700,cursor:"pointer",
                                background:finalRound?"rgba(251,191,36,0.2)":"rgba(0,0,0,0.05)",
                                color:finalRound?"#92400e":"#64748b",
                                border:`1px solid ${finalRound?"rgba(251,191,36,0.5)":"rgba(0,0,0,0.1)"}`}}>
                              🏁 Final Round: {finalRound?"On":"Off"}
                            </button>
                            <button onClick={handleRegenerateRound}
                              style={{fontSize:"clamp(11px,2.5vw,14px)",padding:"clamp(6px,1.5vw,10px) clamp(10px,2.5vw,16px)",borderRadius:10,fontWeight:700,cursor:"pointer",
                                background:"rgba(15,76,117,0.08)",color:"#0f4c75",border:"1px solid rgba(15,76,117,0.2)"}}>
                              🔀 Regenerate Round
                            </button>
                            <button onClick={()=>setShowLiveAddGame(true)}
                              style={{fontSize:"clamp(11px,2.5vw,14px)",padding:"clamp(6px,1.5vw,10px) clamp(10px,2.5vw,16px)",borderRadius:10,fontWeight:700,cursor:"pointer",
                                background:"rgba(99,102,241,0.1)",color:"#4338ca",border:"1px solid rgba(99,102,241,0.3)"}}>
                              ➕ Add Game
                            </button>
                            <button onClick={()=>setShowBreakModal(true)}
                              style={{fontSize:"clamp(11px,2.5vw,14px)",padding:"clamp(6px,1.5vw,10px) clamp(10px,2.5vw,16px)",borderRadius:10,fontWeight:700,cursor:"pointer",
                                background:"rgba(217,119,6,0.1)",color:"#92400e",border:"1px solid rgba(217,119,6,0.3)"}}>
                              ☕ Break
                            </button>
                            <button onClick={()=>setPinPurpose("cancelRound")}
                              style={{fontSize:"clamp(11px,2.5vw,14px)",padding:"clamp(6px,1.5vw,10px) clamp(10px,2.5vw,16px)",borderRadius:10,fontWeight:700,cursor:"pointer",
                                background:"rgba(220,38,38,0.08)",color:"#dc2626",border:"1px solid rgba(220,38,38,0.25)"}}>
                              ✕ Cancel Round
                            </button>
                            <button onClick={handleFinishTournament}
                              style={{fontSize:"clamp(11px,2.5vw,14px)",padding:"clamp(6px,1.5vw,10px) clamp(10px,2.5vw,16px)",borderRadius:10,fontWeight:700,cursor:"pointer",
                                background:"linear-gradient(90deg,#d97706,#f59e0b)",color:"#fff",border:"none"}}>
                              🏁 Finish Tournament
                            </button>
                          </div>
                          <p style={{fontSize:"clamp(10px,2.5vw,13px)",color:"#94a3b8"}}>Regenerate if matchups need adjusting.{Object.keys(pending).length>0?" PIN required — scores already entered.":""}</p>
                          {activeRoundExtras.length>0&&(
                            <div className="rounded-xl" style={{padding:"clamp(8px,2vw,12px)",background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.2)"}}>
                              <p style={{fontSize:"clamp(9px,2vw,11px)",color:"#4338ca",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Manually added ({activeRoundExtras.length})</p>
                              <div className="flex flex-col gap-1">
                                {activeRoundExtras.map((g,gi)=>{const w=teamById(g.winnerId),l=teamById(g.loserId);return(
                                  <div key={gi} className="flex items-center" style={{gap:"clamp(4px,1vw,8px)",fontSize:"clamp(11px,2.5vw,13px)"}}>
                                    <span style={{color:"#94a3b8",minWidth:50}}>Court {g.courtNumber}</span>
                                    <span style={{color:w?.color,fontWeight:700}}>{w?.name}</span>
                                    <span style={{color:w?.color,fontWeight:800}}>{g.winnerScore}</span>
                                    <span style={{color:"#cbd5e1"}}>–</span>
                                    <span style={{color:l?.color,fontWeight:800}}>{g.loserScore}</span>
                                    <span style={{color:l?.color,fontWeight:700}}>{l?.name}</span>
                                    <button onClick={()=>{const ne=activeRoundExtras.filter((_,i)=>i!==gi);setActiveRoundExtras(ne);if(isAdmin)pushAtomicUpdate({activeRoundExtras:ne});}}
                                      style={{marginLeft:"auto",fontSize:11,padding:"2px 8px",borderRadius:6,background:"rgba(220,38,38,0.1)",color:"#dc2626",border:"1px solid rgba(220,38,38,0.2)",cursor:"pointer"}}>×</button>
                                  </div>
                                );})}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ):(
                      /* Active round — viewer */
                      <div className="flex flex-col" style={{gap:"clamp(10px,2.5vw,16px)"}}>
                        {round.courts.map((teams,idx)=>(
                          <div key={idx} className="rounded-2xl" style={{padding:"clamp(12px,3vw,20px)",background:"#fff",border:"1px solid rgba(0,0,0,0.1)",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                            <p style={{fontSize:"clamp(10px,2.5vw,13px)",color:"#0f4c75",fontWeight:800,marginBottom:"clamp(8px,2vw,14px)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Court {courtNumbers[idx]??idx+1}</p>
                            <div className="flex items-stretch" style={{gap:"clamp(8px,2vw,14px)"}}>
                              <div className="flex-1 flex items-center justify-center rounded-2xl"
                                style={{padding:"clamp(14px,3.5vw,24px) clamp(10px,2.5vw,16px)",background:teams[0].color,border:`2px solid ${teams[0].color}`}}>
                                <span className="font-black text-center leading-tight" style={{fontSize:"clamp(18px,5vw,36px)",color:teams[0].text}}>{teams[0].name}</span>
                              </div>
                              <div className="flex items-center justify-center flex-shrink-0">
                                <span style={{color:"#cbd5e1",fontWeight:900,fontSize:"clamp(14px,3.5vw,22px)"}}>VS</span>
                              </div>
                              <div className="flex-1 flex items-center justify-center rounded-2xl"
                                style={{padding:"clamp(14px,3.5vw,24px) clamp(10px,2.5vw,16px)",background:teams[1].color,border:`2px solid ${teams[1].color}`}}>
                                <span className="font-black text-center leading-tight" style={{fontSize:"clamp(18px,5vw,36px)",color:teams[1].text}}>{teams[1].name}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {liveAdditions.map((la,i)=>{
                          const tA=teamById(la.teamId1),tB=teamById(la.teamId2);
                          if(!tA||!tB)return null;
                          return(
                            <div key={`live-${i}`} className="rounded-2xl" style={{padding:"clamp(12px,3vw,20px)",background:"#fff",border:"1px solid rgba(0,0,0,0.1)",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                              <p style={{fontSize:"clamp(10px,2.5vw,13px)",color:"#0f4c75",fontWeight:800,marginBottom:"clamp(8px,2vw,14px)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Court {la.courtNumber}</p>
                              <div className="flex items-stretch" style={{gap:"clamp(8px,2vw,14px)"}}>
                                <div className="flex-1 flex items-center justify-center rounded-2xl"
                                  style={{padding:"clamp(14px,3.5vw,24px) clamp(10px,2.5vw,16px)",background:tA.color,border:`2px solid ${tA.color}`}}>
                                  <span className="font-black text-center leading-tight" style={{fontSize:"clamp(18px,5vw,36px)",color:tA.text}}>{tA.name}</span>
                                </div>
                                <div className="flex items-center justify-center flex-shrink-0">
                                  <span style={{color:"#cbd5e1",fontWeight:900,fontSize:"clamp(14px,3.5vw,22px)"}}>VS</span>
                                </div>
                                <div className="flex-1 flex items-center justify-center rounded-2xl"
                                  style={{padding:"clamp(14px,3.5vw,24px) clamp(10px,2.5vw,16px)",background:tB.color,border:`2px solid ${tB.color}`}}>
                                  <span className="font-black text-center leading-tight" style={{fontSize:"clamp(18px,5vw,36px)",color:tB.text}}>{tB.name}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Paused / Bye row — shown below the courts/games */}
                    {(round.paused?.length>0||round.bye?.length>0)&&(
                      <div className="flex flex-col" style={{gap:"clamp(4px,1vw,8px)"}}>
                        {round.paused?.length>0&&(
                          <div className="flex items-center flex-wrap" style={{gap:"clamp(4px,1vw,6px)"}}>
                            <span style={{color:"#64748b",fontSize:"clamp(10px,2.5vw,13px)",fontWeight:700,flexShrink:0}}>Paused:</span>
                            {round.paused.map(t=><TeamChip key={t.id} teamId={t.id}/>)}
                          </div>
                        )}
                        {round.bye?.length>0&&(
                          <div className="flex items-center flex-wrap" style={{gap:"clamp(4px,1vw,6px)"}}>
                            <span style={{color:"#64748b",fontSize:"clamp(10px,2.5vw,13px)",fontWeight:700,flexShrink:0}}>Bye:</span>
                            {round.bye.map(t=><TeamChip key={t.id} teamId={t.id}/>)}
                          </div>
                        )}
                      </div>
                    )}

                    {isAdmin&&<PausePanel activeTeamIds={activeTeamIds} pausedIds={pausedIds} onTogglePause={handleTogglePause}/>}
                    {isAdmin&&<button onClick={()=>setPinPurpose("reset")} style={{cursor:"pointer",background:"none",border:"none",color:"#94a3b8",fontSize:12,textDecoration:"underline"}}>↩ Back to setup (resets tournament)</button>}
                    {isAdmin&&<button onClick={()=>setShowManageTeams(true)} style={{cursor:"pointer",background:"none",border:"none",color:"#6366f1",fontSize:12,textDecoration:"underline"}}>✏️ Manage teams (rename / add)</button>}
                    {isAdmin&&<button onClick={()=>setShowManageCourts(true)} style={{cursor:"pointer",background:"none",border:"none",color:"#6366f1",fontSize:12,textDecoration:"underline"}}>🏟️ Manage courts (rename)</button>}
                  </div>
                )}

                {/* ── Play tab — Round Robin mode ── */}
                {activeTab==="play"&&!tournamentFinished&&tournamentMode==="roundrobin"&&roundRobinSchedule&&(()=>{
                  const rrCourts=(roundRobinCourts&&roundRobinCourts.length>0)?roundRobinCourts:courtNumbers;
                  const completedCount=roundRobinSchedule.filter((_,i)=>history.some(h=>h.roundNum===(roundRobinStartRoundNum||1)+i)).length;
                  const allDone=completedCount===roundRobinSchedule.length&&roundRobinSchedule.length>0;

                  return(
                  <div className="flex flex-col" style={{gap:"clamp(10px,2.5vw,16px)"}}>
                    {/* Full-screen timer removed from the Play tab on 2026-04-29.
                        Compact RoundTimer now lives in the fixed header instead.
                        Keeping the original code below as a reference — may want
                        to bring it back later or reuse for a different surface.
                        {timerDuration>0&&(
                          <FullScreenTimer secsLeft={timerSecsLeft} totalSecs={timerDuration} roundNum={roundNum}
                            timerRunning={timerRunning} isAdmin={isAdmin} timerDuration={timerDuration}
                            onToggle={timerToggle} onRestart={()=>resetTimer(timerDuration)} onOpenSettings={()=>setShowTimerSettings(true)}/>
                        )}
                    */}
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
                          style={{gap:"clamp(8px,2vw,12px)",
                            padding:"clamp(10px,2.5vw,14px)",
                            borderRadius:14,
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
                            // If round is committed, find the matching game from history
                            const committedGame=isComplete
                              ?committedEntry.games.find(g=>(g.winnerId===idA&&g.loserId===idB)||(g.winnerId===idB&&g.loserId===idA))
                              :null;
                            const pendingKey=rrMatchKey(srIdx,mi);
                            const pendingResult=pending[pendingKey];

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

                            if(isAdmin){
                              return(
                                <CourtCard key={`rr-${srIdx}-${mi}-${pendingResult?'done':'open'}`}
                                  courtLabel={courtLabel}
                                  teams={[tA,tB]}
                                  onResult={r=>handleRRMatchResult(srIdx,mi,r)}
                                  done={!!pendingResult}/>
                              );
                            }
                            // Viewer (read-only)
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

                    {allDone&&isAdmin&&(
                      <div className="rounded-2xl flex flex-col"
                        style={{padding:"clamp(12px,3vw,18px)",gap:"clamp(8px,2vw,12px)",
                          background:"linear-gradient(135deg,#fef3c7,#fde68a)",border:"1px solid rgba(217,119,6,0.3)"}}>
                        <p className="font-black text-center" style={{color:"#92400e",fontSize:"clamp(15px,3.5vw,20px)",margin:0}}>🏆 Round Robin Complete</p>
                        <p className="text-center" style={{color:"#78350f",fontSize:"clamp(11px,2.8vw,14px)",margin:0}}>
                          {roundRobinSchedule.length} round{roundRobinSchedule.length!==1?"s":""} · {roundRobinSchedule.reduce((a,r)=>a+r.length,0)} matches played
                        </p>
                        <button onClick={handleContinueSwissAfterRR}
                          style={{padding:"clamp(10px,2.5vw,14px)",borderRadius:12,fontWeight:800,fontSize:"clamp(13px,3vw,16px)",cursor:"pointer",
                            background:"linear-gradient(90deg,#0f4c75,#1a6fa8)",color:"#fff",border:"none"}}>
                          ↩ Continue with Swiss
                        </button>
                        <button onClick={()=>{doExitRoundRobin("completed");setShowSelectRRTeams(true);}}
                          style={{padding:"clamp(10px,2.5vw,14px)",borderRadius:12,fontWeight:800,fontSize:"clamp(13px,3vw,16px)",cursor:"pointer",
                            background:"linear-gradient(90deg,#6366f1,#8b5cf6)",color:"#fff",border:"none"}}>
                          🔁 Start a new Round Robin
                        </button>
                        <button onClick={handleFinishTournament}
                          style={{padding:"clamp(10px,2.5vw,14px)",borderRadius:12,fontWeight:800,fontSize:"clamp(13px,3vw,16px)",cursor:"pointer",
                            background:"linear-gradient(90deg,#d97706,#f59e0b)",color:"#fff",border:"none"}}>
                          🏁 Finish Tournament
                        </button>
                      </div>
                    )}
                    {isAdmin&&!allDone&&<button onClick={handleExitRoundRobin}
                      style={{padding:"clamp(8px,2vw,12px)",borderRadius:12,fontWeight:700,
                        fontSize:"clamp(12px,3vw,15px)",cursor:"pointer",
                        background:"rgba(0,0,0,0.05)",color:"#475569",border:"1px solid rgba(0,0,0,0.1)"}}>
                      ↩ Exit Round Robin (back to Swiss)
                    </button>}
                    {isAdmin&&<button onClick={handleFinishTournament}
                      style={{padding:"clamp(8px,2vw,12px)",borderRadius:12,fontWeight:700,fontSize:"clamp(12px,3vw,15px)",cursor:"pointer",
                        background:"linear-gradient(90deg,#d97706,#f59e0b)",color:"#fff",border:"none",display:allDone?"none":"block"}}>
                      🏁 Finish Tournament
                    </button>}
                    {isAdmin&&<button onClick={()=>setPinPurpose("reset")} style={{cursor:"pointer",background:"none",border:"none",color:"#94a3b8",fontSize:12,textDecoration:"underline"}}>↩ Back to setup (resets tournament)</button>}
                    {isAdmin&&<button onClick={()=>setShowManageCourts(true)} style={{cursor:"pointer",background:"none",border:"none",color:"#6366f1",fontSize:12,textDecoration:"underline"}}>🏟️ Manage courts (rename)</button>}
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
                  // Snapshot card shown at the round-robin transition point.
                  // Standings rebuilt from history entries with roundNum < startRoundNum.
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

                        {/* Progressing teams */}
                        {participatingIds.length>0&&(
                          <div style={{padding:"clamp(8px,2vw,12px) clamp(12px,3vw,18px)",borderBottom:"1px solid rgba(0,0,0,0.07)"}}>
                            <p style={{fontSize:"clamp(9px,2vw,11px)",color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Progressed ({participatingIds.length})</p>
                            <div className="flex flex-wrap" style={{gap:"clamp(4px,1vw,8px)"}}>
                              {participatingIds.map(id=>chip(id,false))}
                            </div>
                          </div>
                        )}

                        {/* Dropped-out teams */}
                        {excludedIds.length>0&&(
                          <div style={{padding:"clamp(8px,2vw,12px) clamp(12px,3vw,18px)",borderBottom:"1px solid rgba(0,0,0,0.07)"}}>
                            <p style={{fontSize:"clamp(9px,2vw,11px)",color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Dropped out ({excludedIds.length})</p>
                            <div className="flex flex-wrap" style={{gap:"clamp(4px,1vw,8px)"}}>
                              {excludedIds.map(id=>chip(id,true))}
                            </div>
                          </div>
                        )}

                        {/* Standings snapshot at start of RR */}
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
                                    <span style={{width:"clamp(20px,4.5vw,32px)",fontWeight:800,color:"#64748b",fontSize:"clamp(11px,2.5vw,14px)"}}>
                                      {i+1}
                                    </span>
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

                  // End-snapshot card: rendered above the LAST RR round in reversed display.
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

                  // If no RR rounds have been committed yet but the snapshot exists, the
                  // snapshot represents the current/most-recent state — render it at the top.
                  const showSnapshotAtTop=!!roundRobinStartSnapshot
                    &&history.every(h=>h.roundNum<(roundRobinStartSnapshot.startRoundNum||0));
                  // End card at top when RR was exited before any rounds were played.
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
                          {/* Round label */}
                          <div className="flex items-center justify-between" style={{padding:"clamp(8px,2vw,12px) clamp(12px,3vw,18px)",background:"rgba(15,76,117,0.06)",borderBottom:"1px solid rgba(0,0,0,0.07)"}}>
                            <span style={{fontSize:"clamp(10px,2.5vw,13px)",color:"#0f4c75",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.08em"}}>Round {h.roundNum}</span>
                            {isAdmin&&<button onClick={()=>setShowAddGame({target:String(ri),defaultCourt:""})}
                              style={{fontSize:"clamp(10px,2.5vw,12px)",padding:"clamp(3px,0.8vw,5px) clamp(8px,2vw,12px)",borderRadius:8,fontWeight:700,cursor:"pointer",
                                background:"rgba(99,102,241,0.1)",color:"#4338ca",border:"1px solid rgba(99,102,241,0.3)"}}>
                              ➕ Add Game
                            </button>}
                          </div>

                          {/* Games */}
                          <div style={{padding:"clamp(8px,2vw,12px) clamp(12px,3vw,18px)"}}>
                            {h.games.map((game,gi)=>{ const w=teamById(game.winnerId),l=teamById(game.loserId); return(
                              <div key={gi} style={{display:"grid",gridTemplateColumns:"clamp(22px,5vw,36px) 1fr clamp(22px,5vw,34px) clamp(10px,2vw,14px) clamp(22px,5vw,34px) 1fr auto",alignItems:"center",gap:"clamp(4px,1vw,8px)",marginBottom:gi<h.games.length-1?"clamp(6px,1.5vw,10px)":0}}>
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
                                <div className="flex gap-1">{isAdmin&&<><button onClick={()=>setEditTarget({ri,gameIdx:gi})}
                                  style={{fontSize:"clamp(10px,2.5vw,13px)",padding:"clamp(3px,0.8vw,6px) clamp(6px,1.5vw,10px)",borderRadius:8,
                                    background:"rgba(15,76,117,0.08)",color:"#0f4c75",border:"1px solid rgba(15,76,117,0.2)",cursor:"pointer",whiteSpace:"nowrap"}}>✏️</button>
                                  <button onClick={()=>{setRemoveGameTarget({ri,gameIdx:gi});setPinPurpose("removeGame");}}
                                    style={{fontSize:"clamp(10px,2.5vw,13px)",padding:"clamp(3px,0.8vw,6px) clamp(6px,1.5vw,10px)",borderRadius:8,
                                      background:"rgba(220,38,38,0.08)",color:"#dc2626",border:"1px solid rgba(220,38,38,0.2)",cursor:"pointer",whiteSpace:"nowrap"}}>×</button>
                                </>}</div>
                              </div>
                            );})}
                          </div>

                          {/* Paused — with top separator */}
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

                          {/* Byes — with top separator */}
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

                          {/* Rankings — with top separator */}
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
  