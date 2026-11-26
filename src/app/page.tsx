/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Archive, Bell, CalendarDays, ChevronRight, CircleUserRound,
  FolderKanban, LayoutGrid, Library, ListTodo, Menu,
  Network, Plus, Search, Settings, Sparkles, Wifi, X
} from "lucide-react";

type AppId = "overview"|"projects"|"notes"|"tasks"|"calendar"|"activity"|"search"|"mare"|"backups"|"settings";
type WindowState = { id: AppId; x:number; y:number; w:number; h:number; minimized:boolean; maximized:boolean };
type RecordItem = Record<string, any>;

const apps: {id:AppId; name:string; short:string; icon:any}[] = [
  {id:"overview",name:"Global Overview",short:"OVERVIEW",icon:LayoutGrid},
  {id:"projects",name:"Project Control",short:"PROJECTS",icon:FolderKanban},
  {id:"notes",name:"Notes",short:"NOTES",icon:Library},
  {id:"tasks",name:"Tasks",short:"TASKS",icon:ListTodo},
  {id:"calendar",name:"Calendar",short:"CALENDAR",icon:CalendarDays},
  {id:"mare",name:"Mare Ingenii",short:"MARE",icon:Network},
  {id:"activity",name:"Activity",short:"ACTIVITY",icon:Bell},
  {id:"search",name:"Universal Search",short:"SEARCH",icon:Search},
  {id:"backups",name:"Backups",short:"BACKUPS",icon:Archive},
  {id:"settings",name:"System",short:"SYSTEM",icon:Settings},
];

export default function Home() {
  const [phase,setPhase] = useState<"boot"|"login"|"desktop">("boot");
  const [code,setCode] = useState("");
  const [error,setError] = useState("");
  const [windows,setWindows] = useState<WindowState[]>([]);
  const [active,setActive] = useState<AppId|"">("");
  const [clock,setClock] = useState<Date|null>(null);
  const [workspace,setWorkspace] = useState("PRIMARY");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(async () => {
      const res = await fetch("/api/auth");
      const data = await res.json();
      setPhase(data.authenticated ? "desktop" : "login");
      if (data.authenticated) restoreDesktop();
    }, reduced ? 100 : 2400);
    const tick = setInterval(() => setClock(new Date()), 1000);
    return () => { clearTimeout(timer); clearInterval(tick); };
  }, []);

  function restoreDesktop() {
    const saved = localStorage.getItem("aurum.windows");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WindowState[];
        setWindows(parsed.filter(w => !w.minimized));
        if (parsed.length) setActive(parsed[parsed.length-1].id);
      } catch {}
    }
  }

  useEffect(() => {
    localStorage.setItem("aurum.windows", JSON.stringify(windows));
  }, [windows]);

  async function login(e:React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Access rejected."); return; }
    setPhase("desktop");
    restoreDesktop();
  }

  async function logout() {
    await fetch("/api/auth",{method:"DELETE"});
    setWindows([]); setPhase("login");
  }

  function openApp(id:AppId) {
    setWindows(prev => {
      const existing = prev.find(w => w.id===id);
      if (existing) return prev.map(w => w.id===id ? {...w,minimized:false} : w);
      const index = prev.length;
      return [...prev,{id,x:170+(index%5)*28,y:70+(index%5)*22,w:820,h:560,minimized:false,maximized:false}];
    });
    setActive(id);
  }

  function updateWindow(id:AppId, patch:Partial<WindowState>) {
    setWindows(prev => prev.map(w => w.id===id ? {...w,...patch} : w));
  }

  function closeWindow(id:AppId) {
    setWindows(prev => prev.filter(w => w.id!==id));
  }

  if (phase==="boot") return <BootScreen />;
  if (phase==="login") return <LoginScreen code={code} setCode={setCode} error={error} login={login} />;

  return (
    <main className="aurum-desktop">
      <header className="topbar">
        <div className="brand-mark"><span>A</span></div>
        <button className="workspace-switch" onClick={() => setWorkspace(workspace==="PRIMARY"?"SECONDARY":"PRIMARY")}>
          <span>WORKSPACE</span><b>{workspace}</b>
        </button>
        <div className="topbar-status"><Wifi size={14}/><span>LOCAL SYSTEM</span><i /></div>
        <div className="clock">
          <span>{clock ? clock.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"2-digit"}).toUpperCase() : "SYSTEM"}</span>
          <b>{clock ? clock.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}) : "--:--:--"}</b>
        </div>
      </header>

      <div className="desktop-field">
        <nav className="desktop-icons" aria-label="Applications">
          {apps.map((app,index) => {
            const Icon = app.icon;
            return (
              <button key={app.id} className={`desktop-icon ${active===app.id?"selected":""}`} onDoubleClick={() => openApp(app.id)} onClick={() => setActive(app.id)}>
                <div className="icon-surface"><Icon size={24}/><span>{String(index+1).padStart(2,"0")}</span></div>
                <strong>{app.short}</strong>
              </button>
            );
          })}
        </nav>

        {windows.filter(w => !w.minimized).map((win,index) => (
          <DesktopWindow key={win.id} win={win} z={100+index+(active===win.id?500:0)} active={active===win.id}
            onFocus={() => setActive(win.id)} onUpdate={patch=>updateWindow(win.id,patch)} onClose={()=>closeWindow(win.id)}>
            <AppView app={win.id} openApp={openApp}/>
          </DesktopWindow>
        ))}
      </div>

      <footer className="dock">
        <button className="dock-menu" aria-label="System menu"><Menu size={19}/></button>
        {apps.slice(0,7).map(app => {
          const Icon = app.icon;
          const open = windows.some(w=>w.id===app.id && !w.minimized);
          return <button key={app.id} className={`dock-app ${open?"open":""}`} title={app.name} onClick={()=>openApp(app.id)}><Icon size={20}/></button>;
        })}
        <div className="dock-divider"/>
        <button className="dock-app" title="Notifications" onClick={()=>openApp("activity")}><Bell size={19}/><span className="notify-dot"/></button>
        <button className="dock-app" title="Sign out" onClick={logout}><CircleUserRound size={19}/></button>
      </footer>
    </main>
  );
}

function BootScreen() {
  return <div className="boot-screen"><div className="boot-orbit"><div className="boot-emblem">A</div></div><div className="boot-name">AURUM</div><div className="boot-line"><i/></div><div className="boot-status">INITIALISING PRIVATE ENVIRONMENT</div></div>;
}

function LoginScreen({code,setCode,error,login}:{code:string;setCode:(v:string)=>void;error:string;login:(e:React.FormEvent)=>void}) {
  return (
    <main className="login-screen">
      <div className="login-emblem"><div>A</div></div>
      <form className="login-card" onSubmit={login}>
        <span className="eyebrow">PRIVATE ACCESS</span>
        <h1>IDENTIFY</h1>
        <p>Enter your numerical access code</p>
        <input aria-label="Access code" type="password" inputMode="numeric" autoComplete="current-password" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,12))} placeholder="••••" autoFocus/>
        {error && <div className="login-error">{error}</div>}
        <button type="submit" disabled={!code}>AUTHENTICATE <ChevronRight size={16}/></button>
      </form>
      <div className="login-foot">AURUM OS <span>•</span> SECURE NODE 01</div>
    </main>
  );
}

function DesktopWindow({win,z,active,onFocus,onUpdate,onClose,children}:{win:WindowState;z:number;active:boolean;onFocus:()=>void;onUpdate:(p:Partial<WindowState>)=>void;onClose:()=>void;children:React.ReactNode}) {
  const drag = useRef<{mx:number;my:number;x:number;y:number}|null>(null);
  const resize = useRef<{mx:number;my:number;w:number;h:number}|null>(null);
  const app = apps.find(a=>a.id===win.id)!;
  const Icon = app.icon;

  useEffect(() => {
    const move = (e:PointerEvent) => {
      if (drag.current) onUpdate({x:Math.max(0,drag.current.x+e.clientX-drag.current.mx),y:Math.max(30,drag.current.y+e.clientY-drag.current.my)});
      if (resize.current) onUpdate({w:Math.max(480,resize.current.w+e.clientX-resize.current.mx),h:Math.max(300,resize.current.h+e.clientY-resize.current.my)});
    };
    const up = () => { drag.current=null; resize.current=null; document.body.classList.remove("dragging"); };
    window.addEventListener("pointermove",move); window.addEventListener("pointerup",up);
    return () => { window.removeEventListener("pointermove",move); window.removeEventListener("pointerup",up); };
  }, [onUpdate]);

  const style = win.maximized ? {left:0,top:38,width:"100%",height:"calc(100% - 38px)",zIndex:z} : {left:win.x,top:win.y,width:win.w,height:win.h,zIndex:z};
  return (
    <section className={`desktop-window ${active?"active":""}`} style={style} onPointerDown={onFocus}>
      <header className="window-bar" onPointerDown={e=>{
        if (win.maximized) return;
        drag.current={mx:e.clientX,my:e.clientY,x:win.x,y:win.y}; document.body.classList.add("dragging");
      }}>
        <div className="window-title"><Icon size={15}/><span>{app.name}</span></div>
        <div className="window-controls">
          <button onClick={()=>onUpdate({minimized:true})} title="Minimise">−</button>
          <button onClick={()=>onUpdate({maximized:!win.maximized})} title={win.maximized?"Restore":"Maximise"}><SquareGlyph/></button>
          <button className="close" onClick={onClose} title="Close"><X size={14}/></button>
        </div>
      </header>
      <div className="window-content">{children}</div>
      {!win.maximized && <div className="resize-grip" onPointerDown={e=>{resize.current={mx:e.clientX,my:e.clientY,w:win.w,h:win.h};e.stopPropagation();document.body.classList.add("dragging");}} />}
    </section>
  );
}

function SquareGlyph() {
  return <span className="square-glyph"/>;
}

function AppView({app,openApp}:{app:AppId;openApp:(id:AppId)=>void}) {
  const [rows,setRows] = useState<RecordItem[]>([]);
  const [loaded,setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    const entity = app==="overview"?"projects":app==="mare"?"articles":app==="search"?"projects":app;
    fetch(`/api/data/${entity}`).then(r=>r.ok?r.json():[]).then(v=>{setRows(Array.isArray(v)?v:[]);setLoaded(true)});
  },[app]);

  if (!loaded) return <div className="loading-state"><div/>SYNCING DATA</div>;

  if (app==="overview") return <Overview rows={rows}/>;
  if (app==="projects") return <Projects rows={rows} refresh={()=>fetch("/api/data/projects").then(r=>r.json()).then(setRows)} />;
  if (app==="notes") return <Notes rows={rows} />;
  if (app==="tasks") return <Tasks rows={rows} />;
  if (app==="calendar") return <CalendarView rows={rows} />;
  if (app==="mare") return <MareIngenii rows={rows} />;
  if (app==="activity") return <ActivityView />;
  if (app==="search") return <UniversalSearch openApp={openApp}/>;
  if (app==="backups") return <Backups />;
  return <SettingsView />;
}

function Overview({rows}:{rows:RecordItem[]}) {
  const active = rows.filter(r=>r.status==="active").length;
  const progress = rows.length ? Math.round(rows.reduce((n,r)=>n+Number(r.progress||0),0)/rows.length) : 0;
  return (
    <div className="app-page overview-page">
      <div className="page-heading"><div><span>GLOBAL ENVIRONMENT</span><h1>System Overview</h1></div><button className="gold-button"><Sparkles size={14}/> SYSTEM NOMINAL</button></div>
      <div className="metric-grid">
        <Metric label="TOTAL PROJECTS" value={rows.length} detail="persistent records"/>
        <Metric label="ACTIVE PROJECTS" value={active} detail="in development"/>
        <Metric label="GLOBAL PROGRESS" value={`${progress}%`} detail="weighted average"/>
        <Metric label="ATTENTION" value="0" detail="no critical issues"/>
      </div>
      <div className="overview-grid">
        <section className="panel"><div className="panel-head"><b>PROJECT VECTOR</b><span>LIVE</span></div>{rows.length ? rows.map(p=><div className="project-line" key={p.id}><i style={{background:p.color}}/><div><strong>{p.name}</strong><span>{p.status}</span></div><b>{p.progress}%</b></div>) : <Empty text="No projects yet. Open Project Control to create one."/>}</section>
        <section className="panel"><div className="panel-head"><b>SYSTEM STATUS</b><span>LOCAL</span></div><StatusRow label="Database" detail="SQLite persistent"/><StatusRow label="Authentication" detail="Protected"/><StatusRow label="Backups" detail="Manual & scheduled-ready"/><StatusRow label="Integrations" detail="Awaiting credentials"/></section>
      </div>
    </div>
  );
}

function Metric({label,value,detail}:{label:string;value:any;detail:string}) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}
function StatusRow({label,detail}:{label:string;detail:string}) {
  return <div className="status-row"><div><i/><strong>{label}</strong></div><span>{detail}</span></div>;
}
function Empty({text}:{text:string}) { return <div className="empty-state">{text}</div>; }

function Projects({rows,refresh}:{rows:RecordItem[];refresh:()=>void}) {
  const [creating,setCreating] = useState(false);
  async function create(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res=await fetch("/api/data/projects",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:fd.get("name"),description:fd.get("description"),status:"active",progress:0,color:"#d6b36a"})});
    if(res.ok){setCreating(false);refresh();}
  }
  return <div className="app-page"><div className="page-heading"><div><span>CONTROL CENTRE</span><h1>Projects</h1></div><button className="gold-button" onClick={()=>setCreating(true)}><Plus size={14}/> NEW PROJECT</button></div>
    {creating && <form className="inline-form" onSubmit={create}><input name="name" required placeholder="Project name"/><input name="description" placeholder="Description"/><button>Create</button><button type="button" onClick={()=>setCreating(false)}>Cancel</button></form>}
    <div className="card-grid">{rows.map(p=><article className="project-card" key={p.id}><div className="project-card-top"><i style={{background:p.color}}/><span>{p.status}</span></div><h3>{p.name}</h3><p>{p.description||"No description"}</p><div className="progress"><i style={{width:`${p.progress}%`}}/></div><footer><span>{p.progress}% complete</span><ChevronRight size={15}/></footer></article>)}</div>
    {!rows.length && <Empty text="No projects have been created."/>}
  </div>;
}

function Notes({rows}:{rows:RecordItem[]}) {
  const [selected,setSelected] = useState<RecordItem|null>(rows[0]||null);
  async function create() {
    const res=await fetch("/api/data/notes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:"Untitled note",content:"",folder:"Personal"})});
    if(res.ok){location.reload();}
  }
  async function save(note:RecordItem) {
    await fetch("/api/data/notes",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(note)});
  }
  return <div className="split-app"><aside><div className="list-tools"><b>NOTES</b><button onClick={create}><Plus size={15}/></button></div>{rows.map(n=><button key={n.id} className={selected?.id===n.id?"selected":""} onClick={()=>setSelected(n)}><strong>{n.title}</strong><span>{n.folder}</span></button>)}</aside><div className="editor">{selected?<><input value={selected.title} onChange={e=>setSelected({...selected,title:e.target.value})} onBlur={()=>save(selected)} /><textarea value={selected.content} onChange={e=>setSelected({...selected,content:e.target.value})} onBlur={()=>save(selected)} placeholder="Begin writing…"/></>:<Empty text="Create a note to begin."/>}</div></div>;
}

function Tasks({rows}:{rows:RecordItem[]}) {
  async function create(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd=new FormData(e.currentTarget);
    const res=await fetch("/api/data/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:fd.get("title"),priority:fd.get("priority")})});
    if(res.ok) location.reload();
  }
  async function toggle(task:RecordItem) {
    await fetch("/api/data/tasks",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...task,status:task.status==="done"?"open":"done"})});
    location.reload();
  }
  return <div className="app-page"><div className="page-heading"><div><span>EXECUTION SYSTEM</span><h1>Tasks</h1></div></div><form className="task-create" onSubmit={create}><input name="title" required placeholder="Add a task"/><select name="priority" defaultValue="normal"><option>low</option><option>normal</option><option>high</option><option>urgent</option></select><button><Plus size={15}/> ADD</button></form><div className="task-list">{rows.map(t=><div className={`task-row ${t.status==="done"?"done":""}`} key={t.id}><button onClick={()=>toggle(t)} className="task-check">{t.status==="done"?"✓":""}</button><div><strong>{t.title}</strong><span>{t.priority} priority</span></div><b>{t.status}</b></div>)}</div>{!rows.length&&<Empty text="No tasks recorded."/>}</div>;
}

function CalendarView({rows}:{rows:RecordItem[]}) {
  const [title,setTitle]=useState("");
  async function add() {
    if(!title.trim())return;
    await fetch("/api/data/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,starts_at:Date.now()})});
    location.reload();
  }
  const days=Array.from({length:35},(_,i)=>i+1);
  return <div className="app-page"><div className="page-heading"><div><span>CHRONOLOGY</span><h1>Current Month</h1></div><div className="quick-add"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="New event"/><button onClick={add}><Plus size={15}/></button></div></div><div className="calendar"><div className="weekdays">{["MON","TUE","WED","THU","FRI","SAT","SUN"].map(d=><b key={d}>{d}</b>)}</div><div className="month-grid">{days.map(d=><div key={d}><span>{d<=31?d:""}</span>{rows.filter(r=>new Date(r.starts_at).getDate()===d).slice(0,2).map(r=><i key={r.id}>{r.title}</i>)}</div>)}</div></div></div>;
}

function MareIngenii({rows}:{rows:RecordItem[]}) {
  async function newArticle() {
    await fetch("/api/data/articles",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:"Untitled article",content:"",status:"draft"})});
    location.reload();
  }
  return <div className="app-page mare-page"><div className="page-heading"><div><span>PROJECT WORKSPACE</span><h1>Mare Ingenii</h1></div><button className="gold-button" onClick={newArticle}><Plus size={14}/> NEW ARTICLE</button></div><div className="mare-status"><div><span>PUBLICATION STATE</span><strong>UNPUBLISHED</strong></div><p>All content remains private until explicitly published by the owner.</p></div><div className="article-grid">{rows.map(a=><article className="article-card" key={a.id}><span>{a.status}</span><h3>{a.title}</h3><p>{a.category}</p></article>)}</div>{!rows.length&&<Empty text="No private articles. Your authorship begins here."/>}</div>;
}

function ActivityView() {
  const [rows,setRows]=useState<RecordItem[]>([]);
  useEffect(()=>{fetch("/api/data/activities").then(r=>r.json()).then(v=>setRows(Array.isArray(v)?v:[]));},[]);
  return <div className="app-page"><div className="page-heading"><div><span>NOTIFICATIONS & LOG</span><h1>Activity</h1></div></div><div className="activity-list">{rows.length?rows.map(r=><div className="activity-row" key={r.id}><i/><div><strong>{r.action}</strong><span>{r.application}</span></div><time>{new Date(r.created_at).toLocaleString()}</time></div>):<Empty text="No activity has been recorded."/>}</div></div>;
}

function UniversalSearch({openApp}:{openApp:(id:AppId)=>void}) {
  const [query,setQuery]=useState("");
  const [rows,setRows]=useState<RecordItem[]>([]);
  useEffect(()=>{
    if(!query.trim()){setRows([]);return;}
    Promise.all(["projects","notes","tasks","articles"].map(e=>fetch(`/api/data/${e}`).then(r=>r.ok?r.json():[]))).then(groups=>{
      const matches=groups.flatMap((g,i)=>g.filter((r:RecordItem)=>`${r.name||r.title||r.content||""}`.toLowerCase().includes(query.toLowerCase())).map((r:RecordItem)=>({...r,_group:["Projects","Notes","Tasks","Articles"][i]})));
      setRows(matches.slice(0,30));
    });
  },[query]);
  return <div className="app-page search-page"><div className="search-box"><Search size={18}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search Aurum…"/></div><div className="search-results">{rows.length?rows.map(r=><button key={r.id} onClick={()=>openApp(r._group==="Notes"?"notes":r._group==="Tasks"?"tasks":r._group==="Articles"?"mare":"projects")}><div><span>{r._group}</span><strong>{r.name||r.title}</strong></div><ChevronRight size={15}/></button>):<Empty text={query?"No matching records.":"Search projects, notes, tasks and articles."}/>}</div></div>;
}

async function runBackup() {
  await fetch("/api/data/backups",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({label:"Manual backup"})});
  location.reload();
}
function Backups() {
  const [rows,setRows]=useState<RecordItem[]>([]);
  useEffect(()=>{fetch("/api/data/backups").then(r=>r.json()).then(v=>setRows(Array.isArray(v)?v:[]));},[]);
  return <div className="app-page"><div className="page-heading"><div><span>DATA PROTECTION</span><h1>Backups</h1></div><button className="gold-button" onClick={runBackup}><Archive size={14}/> CREATE BACKUP</button></div><div className="backup-list">{rows.map(r=><div className="backup-row" key={r.id}><Archive size={18}/><div><strong>{r.label}</strong><span>{new Date(r.created_at).toLocaleString()}</span></div></div>)}</div>{!rows.length&&<Empty text="No backup records. Create the first persistent snapshot."/>}</div>;
}

function SettingsView() {
  async function revoke() {
    await fetch("/api/data/session",{method:"DELETE"});
    location.reload();
  }
  return <div className="app-page"><div className="page-heading"><div><span>ESSENTIAL CONFIGURATION</span><h1>System</h1></div></div><section className="settings-panel"><StatusRow label="Access mode" detail="Numerical code"/><StatusRow label="Session policy" detail="30 days"/><StatusRow label="Desktop state" detail="Persisted locally"/><button className="danger-button" onClick={revoke}>REVOKE ALL SESSIONS</button></section></div>;
}
