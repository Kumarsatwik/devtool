"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface Note {
  id: string;
  title: string;
  html: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "notes-app.notes.v1";
const ACTIVE_KEY = "notes-app.active.v1";

const WELCOME_HTML = `
<h2>Welcome to Notes 👋</h2>
<p>This is a <strong>rich text</strong> note editor with <em>italic</em>, <u>underline</u>, <mark>highlight</mark> and full <strong>Markdown</strong> support.</p>
<ul>
  <li>Use the toolbar to format text, change fonts and sizes</li>
  <li>Insert images — they are embedded right into the note</li>
  <li>Add Mermaid diagrams with a live preview</li>
  <li>Open / save <code>.md</code> files, export to PDF, HTML, DOCX, TXT</li>
</ul>
<pre data-type="mermaid"><code>graph LR
  A[Write notes] --> B{Format}
  B --> C[Markdown]
  B --> D[Rich text]
  C --> E[Export: PDF / HTML / DOCX / TXT]
  D --> E</code></pre>
<blockquote><p>Tip: switch to the Markdown pane to edit raw markdown side by side.</p></blockquote>
`;

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createNote(title = "Untitled note", html = "<p></p>"): Note {
  const now = Date.now();
  return { id: makeId(), title, html, createdAt: now, updatedAt: now };
}

const MERMAID_KEYWORDS =
  /^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|mindmap|timeline|gitGraph|quadrantChart)\b/;

/**
 * Repair notes saved by older versions where mermaid blocks were
 * downgraded to plain code blocks (lost their data-type marker).
 */
function migrateMermaidBlocks(html: string): string {
  if (!html.includes("<pre")) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  let changed = false;
  doc.querySelectorAll('pre:not([data-type="mermaid"])').forEach((pre) => {
    if (MERMAID_KEYWORDS.test(pre.textContent ?? "")) {
      pre.setAttribute("data-type", "mermaid");
      changed = true;
    }
  });
  return changed ? doc.body.innerHTML : html;
}

function loadNotes(): Note[] {
  if (typeof window === "undefined") {
    return [createNote("Welcome", WELCOME_HTML)];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Note[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((n) => ({ ...n, html: migrateMermaidBlocks(n.html) }));
      }
    }
  } catch {
    // fall through to default
  }
  return [createNote("Welcome", WELCOME_HTML)];
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [activeId, setActiveId] = useState<string>(() =>
    typeof window === "undefined" ? "" : localStorage.getItem(ACTIVE_KEY) ?? "",
  );
  const saveTimer = useRef<number | undefined>(undefined);

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeId) ?? notes[0],
    [notes, activeId],
  );

  // Debounced persistence
  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    }, 300);
    return () => window.clearTimeout(saveTimer.current);
  }, [notes]);

  useEffect(() => {
    if (activeNote) localStorage.setItem(ACTIVE_KEY, activeNote.id);
  }, [activeNote]);

  const addNote = useCallback((title?: string, html?: string): Note => {
    const note = createNote(title, html);
    setNotes((prev) => [note, ...prev]);
    setActiveId(note.id);
    return note;
  }, []);

  const updateNote = useCallback((id: string, patch: Partial<Pick<Note, "title" | "html">>) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)),
    );
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      return next.length > 0 ? next : [createNote()];
    });
  }, []);

  return { notes, activeNote, setActiveId, addNote, updateNote, deleteNote };
}
