import assert from "node:assert/strict";
import test from "node:test";
import { detectDiagramKind } from "../src/lib/diagrams.ts";
import {
  encodePlantUml,
  plantUmlBackground,
  plantUmlErrorMessage,
} from "../src/lib/plantuml.ts";

// Known-answer vector from the PlantUML URL API (verified against the server).
test("encodes PlantUML source into a stable URL path", async () => {
  assert.equal(
    await encodePlantUml("@startuml\nAlice -> Bob: hello\n@enduml"),
    "SoWkIImgAStDuNBCoKnELT2rKt3AJx9Io4ZDoSddSaZDIm7A0G00",
  );
});

test("detects PlantUML by its @start/@end markers", () => {
  assert.equal(detectDiagramKind("@startuml\nAlice -> Bob\n@enduml", "mermaid"), "plantuml");
  assert.equal(detectDiagramKind("@startgantt\n[X] lasts 5 days\n@endgantt", "mermaid"), "plantuml");
  // Unwrapped sources keep the kind they were created with
  assert.equal(detectDiagramKind("Alice -> Bob: hi", "plantuml"), "plantuml");
  assert.equal(detectDiagramKind("graph TD\n  A --> B", "mermaid"), "mermaid");
  // '@' mid-line (emails in labels) is not a marker
  assert.equal(
    detectDiagramKind('graph TD\n  A --> B\n  click A "mailto:x@start.org"', "mermaid"),
    "mermaid",
  );
});

test("uses the SVG background, falling back to a contrasting backdrop", () => {
  assert.equal(plantUmlBackground('<svg style="background:#1E1E1E;"></svg>'), "#1E1E1E");
  // !theme cyborg emits no background and draws white text
  assert.equal(
    plantUmlBackground('<svg><text fill="#FFF">a</text><text fill="#FFF">b</text></svg>'),
    "#1e1e1e",
  );
  assert.equal(plantUmlBackground('<svg><text fill="#000">a</text></svg>'), "#ffffff");
  assert.equal(plantUmlBackground(""), "#ffffff");
});

test("extracts a readable message from a PlantUML error body", () => {
  // Real 400 bodies lead with boilerplate and end with the actual problem
  assert.equal(
    plantUmlErrorMessage(
      "<svg><text>Welcome to PlantUML!</text><text>[From string (line 2) ]</text>" +
        "<text>Syntax Error? (Assumed &lt;sequence&gt;)</text></svg>",
    ),
    "Syntax Error? (Assumed <sequence>)",
  );
  assert.equal(
    plantUmlErrorMessage("<svg><text>first</text><text>last</text></svg>"),
    "last",
  );
  assert.equal(plantUmlErrorMessage("plain text"), "plain text");
  assert.equal(plantUmlErrorMessage("<svg></svg>"), null);
});
