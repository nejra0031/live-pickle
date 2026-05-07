export const CONNECT_TIMEOUT_MS = 6000;
export const SAVE_KEY = 'pickleball_tournament_v1';

// Key helpers at module level so they are never recreated inside renders
export const courtKey = idx => `court_${idx}`;
export const liveKey  = i   => `live_${i}`;

// Safe for any integer including 0 and negatives
export const ORDINAL = n => {
  if (n < 1) return String(n);
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const ALL_TEAMS = [
  { id:'red',    name:'Red',    color:'#ef4444', text:'#fff' },
  { id:'blue',   name:'Blue',   color:'#3b82f6', text:'#fff' },
  { id:'yellow', name:'Yellow', color:'#eab308', text:'#000' },
  { id:'green',  name:'Green',  color:'#22c55e', text:'#fff' },
  { id:'orange', name:'Orange', color:'#f97316', text:'#fff' },
  { id:'purple', name:'Purple', color:'#a855f7', text:'#fff' },
  { id:'pink',   name:'Pink',   color:'#ec4899', text:'#fff' },
  { id:'grey',   name:'Grey',   color:'#6b7280', text:'#fff' },
  { id:'brown',  name:'Brown',  color:'#92400e', text:'#fff' },
  { id:'teal',   name:'Teal',   color:'#14b8a6', text:'#fff' },
  { id:'lime',   name:'Lime',   color:'#84cc16', text:'#000' },
  { id:'cyan',   name:'Cyan',   color:'#06b6d4', text:'#000' },
  { id:'indigo', name:'Indigo', color:'#6366f1', text:'#fff' },
  { id:'rose',   name:'Rose',   color:'#f43f5e', text:'#fff' },
  { id:'amber',  name:'Amber',  color:'#f59e0b', text:'#000' },
  { id:'navy',   name:'Navy',   color:'#1e40af', text:'#fff' },
  { id:'mint',   name:'Mint',   color:'#6ee7b7', text:'#000' },
  { id:'coral',  name:'Coral',  color:'#fb7185', text:'#fff' },
  { id:'sky',    name:'Sky',    color:'#38bdf8', text:'#000' },
  { id:'gold',   name:'Gold',   color:'#d97706', text:'#fff' },
];

// Fallback lookup used by non-React algorithm code that doesn't have context access.
// Updated whenever App sets tournament teams.
let _moduleRegistry = [];
export const setModuleRegistry = r => { _moduleRegistry = r || []; };
export const teamByIdModule = id =>
  _moduleRegistry.find(t => t.id === id) || ALL_TEAMS.find(t => t.id === id);
