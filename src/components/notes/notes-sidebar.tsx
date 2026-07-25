"use client";

import type { Note } from "@/hooks/use-notes";

interface SidebarProps {
  notes: Note[];
  activeId: string | undefined;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

function snippet(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll('pre[data-type="mermaid"]').forEach((el) => {
    el.textContent = "◈ diagram";
  });
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotesSidebar({ notes, activeId, onSelect, onAdd, onDelete }: SidebarProps) {
  return (
    <aside className="notes-sidebar">
      <div className="notes-sidebar-header">
        <h2 className="notes-sidebar-title">📝 Notes</h2>
        <button className="notes-sidebar-add" title="New note" onClick={onAdd}>＋</button>
      </div>
      <div className="notes-sidebar-list">
        {notes.map((note) => (
          <div
            key={note.id}
            className={`note-item${note.id === activeId ? " is-active" : ""}`}
            onClick={() => onSelect(note.id)}
          >
            <div className="note-item-top">
              <span className="note-item-title">{note.title || "Untitled note"}</span>
              <button
                className="note-item-delete"
                title="Delete note"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete "${note.title || "Untitled note"}"?`)) {
                    onDelete(note.id);
                  }
                }}
              >
                ✕
              </button>
            </div>
            <div className="note-item-snippet">{snippet(note.html) || "Empty note"}</div>
            <div className="note-item-date">{formatDate(note.updatedAt)}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}
