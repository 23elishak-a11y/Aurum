import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { isAuthenticated, revokeAllSessions } from "@/lib/auth";
import { randomUUID } from "node:crypto";

const allowed = new Set(["projects","notes","tasks","events","activities","notifications","workspaces","articles","backups"]);

function table(entity: string) {
  return allowed.has(entity) ? entity : null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ entity: string }> }) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { entity } = await context.params;
  const name = table(entity);
  if (!name) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  const project = request.nextUrl.searchParams.get("project");
  if (project && ["notes","tasks","events","activities"].includes(name)) {
    const rows = db.prepare(`SELECT * FROM ${name} WHERE project_id=? ORDER BY created_at DESC`).all(project);
    return NextResponse.json(rows);
  }
  const rows = db.prepare(`SELECT * FROM ${name} ORDER BY rowid DESC`).all();
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest, context: { params: Promise<{ entity: string }> }) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { entity } = await context.params;
  const name = table(entity);
  if (!name) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (name === "projects") {
    const id = randomUUID();
    db.prepare("INSERT INTO projects (id,name,description,status,progress,color,icon,created_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(id, String(body.name || "Untitled project").slice(0,120), String(body.description || "").slice(0,4000), String(body.status || "active"), Number(body.progress || 0), String(body.color || "#d6b36a"), String(body.icon || "project"), Date.now());
  } else if (name === "notes") {
    const id = randomUUID();
    db.prepare("INSERT INTO notes (id,title,content,folder,project_id,tags,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(id, String(body.title || "Untitled").slice(0,200), String(body.content || "").slice(0,100000), String(body.folder || "Personal"), body.project_id || null, JSON.stringify(body.tags || []), Date.now(), Date.now());
  } else if (name === "tasks") {
    const id = randomUUID();
    db.prepare("INSERT INTO tasks (id,title,description,status,priority,due_at,project_id,created_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(id, String(body.title || "Untitled task").slice(0,200), String(body.description || "").slice(0,4000), String(body.status || "open"), String(body.priority || "normal"), body.due_at ? Number(body.due_at) : null, body.project_id || null, Date.now());
  } else if (name === "events") {
    const id = randomUUID();
    db.prepare("INSERT INTO events (id,title,description,starts_at,ends_at,project_id,kind) VALUES (?,?,?,?,?,?,?)")
      .run(id, String(body.title || "Untitled event").slice(0,200), String(body.description || ""), Number(body.starts_at || Date.now()), body.ends_at ? Number(body.ends_at) : null, body.project_id || null, String(body.kind || "event"));
  } else if (name === "notifications") {
    const id = randomUUID();
    db.prepare("INSERT INTO notifications (id,title,body,level,read,created_at) VALUES (?,?,?,?,0,?)")
      .run(id, String(body.title || "Notification").slice(0,200), String(body.body || ""), String(body.level || "info"), Date.now());
  } else if (name === "activities") {
    const id = randomUUID();
    db.prepare("INSERT INTO activities (id,action,application,description,project_id,created_at) VALUES (?,?,?,?,?,?)")
      .run(id, String(body.action || "Updated"), String(body.application || "Aurum"), String(body.description || ""), body.project_id || null, Date.now());
  } else if (name === "workspaces") {
    const id = String(body.id || "primary");
    db.prepare("INSERT INTO workspaces (id,name,state,updated_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,state=excluded.state,updated_at=excluded.updated_at")
      .run(id, String(body.name || "Workspace").slice(0,100), JSON.stringify(body.state || {}), Date.now());
  } else if (name === "articles") {
    const id = randomUUID();
    db.prepare("INSERT INTO articles (id,title,content,status,category,citations,updated_at) VALUES (?,?,?,?,?,?,?)")
      .run(id, String(body.title || "Untitled article").slice(0,200), String(body.content || ""), String(body.status || "draft"), String(body.category || "Uncategorised"), JSON.stringify(body.citations || []), Date.now());
  } else if (name === "backups") {
    const id = randomUUID();
    const snapshot = JSON.stringify({
      projects: db.prepare("SELECT * FROM projects").all(), notes: db.prepare("SELECT * FROM notes").all(),
      tasks: db.prepare("SELECT * FROM tasks").all(), events: db.prepare("SELECT * FROM events").all(),
      workspaces: db.prepare("SELECT * FROM workspaces").all()
    });
    db.prepare("INSERT INTO backups (id,label,data,created_at) VALUES (?,?,?,?)")
      .run(id, String(body.label || "Manual backup"), snapshot, Date.now());
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ entity: string }> }) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { entity } = await context.params;
  if (entity === "session") { await revokeAllSessions(); return NextResponse.json({ ok: true }); }
  const id = request.nextUrl.searchParams.get("id");
  const name = table(entity);
  if (!id || !name) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  db.prepare(`DELETE FROM ${name} WHERE id=?`).run(id);
  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ entity: string }> }) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { entity } = await context.params;
  const name = table(entity);
  const body = await request.json().catch(() => null);
  if (!name || !body?.id) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (name === "notes") {
    db.prepare("UPDATE notes SET title=?,content=?,folder=?,project_id=?,tags=?,updated_at=? WHERE id=?")
      .run(String(body.title || "Untitled"), String(body.content || ""), String(body.folder || "Personal"), body.project_id || null, JSON.stringify(body.tags || []), Date.now(), body.id);
  } else if (name === "tasks") {
    db.prepare("UPDATE tasks SET title=?,description=?,status=?,priority=?,due_at=?,project_id=? WHERE id=?")
      .run(String(body.title || "Untitled task"), String(body.description || ""), String(body.status || "open"), String(body.priority || "normal"), body.due_at ? Number(body.due_at) : null, body.project_id || null, body.id);
  } else if (name === "projects") {
    db.prepare("UPDATE projects SET name=?,description=?,status=?,progress=?,color=?,icon=? WHERE id=?")
      .run(String(body.name || "Untitled project"), String(body.description || ""), String(body.status || "active"), Number(body.progress || 0), String(body.color || "#d6b36a"), String(body.icon || "project"), body.id);
  } else if (name === "articles") {
    db.prepare("UPDATE articles SET title=?,content=?,status=?,category=?,citations=?,updated_at=? WHERE id=?")
      .run(String(body.title || "Untitled article"), String(body.content || ""), String(body.status || "draft"), String(body.category || "Uncategorised"), JSON.stringify(body.citations || []), Date.now(), body.id);
  } else {
    return NextResponse.json({ error: "Resource cannot be updated" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
