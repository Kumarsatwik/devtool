export const WELCOME_HTML = `
<h2>Welcome 👋</h2>
<p>This is a <strong>rich text</strong> note editor with <em>italic</em>, <u>underline</u>, <mark>highlight</mark> and full <strong>Markdown</strong> support.</p>
<ul>
  <li>Use the toolbar to format text, change fonts and sizes</li>
  <li>Insert images — they are embedded right into the note</li>
  <li>Add Mermaid diagrams with a live preview</li>
  <li>Open / save <code>.md</code> files, export to HTML, DOCX, TXT</li>
</ul>
<pre data-type="mermaid"><code>graph LR
  A[Write notes] --> B{Format}
  B --> C[Markdown]
  B --> D[Rich text]
  C --> E[Export: HTML / DOCX / TXT]
  D --> E</code></pre>
<blockquote><p>Tip: switch to the Markdown pane to edit raw markdown side by side.</p></blockquote>
`;
