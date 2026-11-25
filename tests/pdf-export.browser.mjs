// Run against a local dev server:
// node --test tests/pdf-export.browser.mjs
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import puppeteer from "puppeteer";

const baseUrl = process.env.PDF_TEST_URL ?? "http://127.0.0.1:3000";
const pixel =
  "data:image/png;base64," +
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
const samples = [
  {
    name: "formatting",
    markdown: `# Formatting sample

## Heading two
### Heading three
#### Heading four
##### Heading five
###### Heading six

**Bold** and *italic*, ~~strike~~, <u>underline</u>, ==highlight==,
\`inline code\` and [clickable link](https://example.com/document).

<span style="color: #cc0000; font-size: 20px">Styled text</span>

> A blockquote with **emphasis**.

- First bullet
  - Nested bullet
- Second bullet

3. Numbered item
4. Next item

\`\`\`javascript
const message = "<tag> & value";
console.log(message);
\`\`\`

| Name | Value |
| :--- | ---: |
| Alpha | **42** |
| Beta | *99* |

![Embedded image](${pixel})

\`\`\`mermaid
graph LR
  A[Start] --> B[Finish]
\`\`\`

FORMATTING-END`,
  },
  {
    name: "multipage",
    markdown: [
      "# Multipage sample",
      ...Array.from({ length: 70 }, (_, i) =>
        `Paragraph ${i + 1}: ` + "Readable content across page breaks. ".repeat(8),
      ),
      "```text\n" +
        Array.from({ length: 90 }, (_, i) =>
          `CODE-${i + 1} ` + "LongUnbrokenValue".repeat(14),
        ).join("\n") +
        "\nCODE-END\n```",
      "| Row | Long value | Final column |\n| --- | --- | --- |",
      ...Array.from({ length: 80 }, (_, i) =>
        `| ROW-${i + 1} | ${"WideCellContent".repeat(8)} | CELL-END-${i + 1} |`,
      ),
      "\nMULTIPAGE-END",
    ].join("\n\n").replace(/\|\n\n\|/g, "|\n|"),
  },
  { name: "empty", markdown: "" },
];

async function clickButton(page, text) {
  assert.ok((await page.$eval("body", (el) => el.innerText)).includes(text));
  for (const button of await page.$$("button")) {
    if (await button.evaluate((el, label) => el.textContent.trim() === label, text)) {
      await button.click();
      return;
    }
  }
  assert.fail(`Button not found: ${text}`);
}

test("PDF export and existing note exports", { timeout: 180_000 }, async (t) => {
  const output = await mkdtemp(path.join(tmpdir(), "notes-pdf-"));
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${baseUrl}/markdown-preview`, {
      waitUntil: "networkidle0",
    });
    await page.waitForSelector(".tiptap");
    // Replace only the OS dialog, retaining production document preparation.
    await page.evaluate(() => {
      const append = document.body.appendChild.bind(document.body);
      document.body.appendChild = (node) => {
        if (node instanceof HTMLIFrameElement && node.title === "PDF export") {
          const onload = node.onload;
          node.onload = (event) => {
            node.contentWindow.print = () => {
              window.pdfCapture = {
                html: node.contentDocument.documentElement.outerHTML,
                sandbox: node.getAttribute("sandbox"),
                images: Array.from(node.contentDocument.images, (image) => ({
                  complete: image.complete,
                  width: image.naturalWidth,
                })),
              };
            };
            onload.call(node, event);
          };
        }
        return append(node);
      };
    });

    async function importMarkdown(name, markdown) {
      const file = path.join(output, `${name}.md`);
      await writeFile(file, markdown);
      const input = await page.$('input[type="file"][accept*=".md"]');
      await input.uploadFile(file);
      await page.waitForFunction(
        (expected) => document.querySelector(".title-input").value === expected,
        {},
        name,
      );
    }

    for (const sample of samples) {
      await t.test(sample.name, async () => {
        await importMarkdown(sample.name, sample.markdown);
        const before = await page.$eval(".tiptap", (el) => el.editor.getHTML());
        await page.evaluate(() => { window.pdfCapture = null; });
        // Inspect current controls before interacting.
        assert.match(await page.$eval(".toolbar", (el) => el.innerText), /Export/);
        await clickButton(page, "⬇ Export");
        assert.match(
          await page.$eval(".tb-menu", (el) => el.innerText),
          /PDF \(Save as PDF\)/,
        );
        await clickButton(page, "PDF (Save as PDF)");
        await clickButton(page, "Continue to PDF");
        await page.waitForFunction(() => window.pdfCapture, { timeout: 30_000 });
        const capture = await page.evaluate(() => window.pdfCapture);
        assert.equal(capture.sandbox, "allow-same-origin allow-modals");
        for (const image of capture.images) {
          assert.ok(image.complete && image.width > 0);
        }
        const printPage = await browser.newPage();
        await printPage.setContent(capture.html, { waitUntil: "networkidle0" });
        await printPage.emulateMediaType("print");
        await printPage.setViewport({ width: 673, height: 1000 });
        const layout = await printPage.evaluate(() => ({
          overflow: document.body.scrollWidth > document.body.clientWidth + 1,
          text: document.body.textContent,
          headings: document.querySelectorAll("h1,h2,h3,h4,h5,h6").length,
          tables: document.querySelectorAll("table").length,
          code: document.querySelectorAll("pre code").length,
          links: document.querySelectorAll('a[href^="https://"]').length,
          diagrams: document.querySelectorAll(".mermaid-diagram svg").length,
          marks: ["strong", "em", "s", "u", "mark"].every(
            (tag) => document.querySelector(tag),
          ),
        }));
        assert.equal(layout.overflow, false, "PDF body must not overflow");
        if (sample.name === "formatting") {
          assert.equal(layout.headings, 7);
          assert.equal(layout.tables, 1);
          assert.equal(layout.code, 1);
          assert.equal(layout.links, 1);
          assert.equal(layout.diagrams, 1);
          assert.equal(layout.marks, true);
          assert.ok(layout.text.includes("FORMATTING-END"));
        }
        if (sample.name === "multipage") {
          for (const marker of ["CODE-END", "CELL-END-80", "MULTIPAGE-END"]) {
            assert.ok(layout.text.includes(marker));
          }
        }
        const pdf = await printPage.pdf({
          path: path.join(output, `${sample.name}.pdf`),
          preferCSSPageSize: true,
          printBackground: true,
          displayHeaderFooter: false,
        });
        const pdfSource = Buffer.from(pdf).toString("latin1");
        assert.ok(pdfSource.startsWith("%PDF-"));
        const pages = (pdfSource.match(/\/Type \/Page\b/g) ?? []).length;
        assert.ok(pages >= 1);
        if (sample.name === "multipage") assert.ok(pages > 2);
        if (sample.name === "formatting") {
          assert.ok(pdfSource.includes("/Subtype /Link"));
        }
        await printPage.close();
        await page.evaluate(() => {
          const frame = document.querySelector('iframe[title="PDF export"]');
          frame.contentWindow.dispatchEvent(new Event("afterprint"));
        });
        await page.waitForFunction(
          () => !document.querySelector('iframe[title="PDF export"]'),
        );
        assert.equal(
          await page.$eval(".tiptap", (el) => el.editor.getHTML()),
          before,
          "PDF export must not mutate the note",
        );
        console.log(`${sample.name}: ${pages} PDF pages`);
      });
    }

    await t.test("PDF omits blank titles and preserves entered titles", async () => {
      await importMarkdown("title-test", "# Original heading\n\nOriginal text");
      for (const title of ["", "   ", "My <note> & title", "Untitled note"]) {
        assert.ok(await page.$(".title-input"));
        await page.bringToFront();
        await page.$eval(".title-input", (input) => {
          input.focus();
          input.select();
        });
        await page.keyboard.press("Backspace");
        if (title) await page.keyboard.type(title);
        await page.waitForFunction(
          (expected) => document.querySelector(".title-input").value === expected,
          {},
          title,
        );
        await page.evaluate(() => { window.pdfCapture = null; });
        await clickButton(page, "⬇ Export");
        await clickButton(page, "PDF (Save as PDF)");
        await clickButton(page, "Continue to PDF");
        await page.waitForFunction(() => window.pdfCapture);
        const result = await page.evaluate(() => {
          const frame = document.querySelector('iframe[title="PDF export"]');
          const doc = frame.contentDocument;
          return {
            title: doc.title,
            headings: Array.from(doc.querySelectorAll("h1"), (el) =>
              el.textContent),
            body: doc.body.textContent,
          };
        });
        assert.equal(result.title, title.trim());
        assert.deepEqual(
          result.headings,
          title.trim()
            ? [title.trim(), "Original heading"]
            : ["Original heading"],
        );
        assert.ok(result.body.includes("Original text"));
        if (!title.trim()) assert.ok(!result.body.includes("Untitled note"));
        await page.evaluate(() => {
          document.querySelector('iframe[title="PDF export"]')
            .contentWindow.dispatchEvent(new Event("afterprint"));
        });
        await page.waitForFunction(
          () => !document.querySelector('iframe[title="PDF export"]'),
        );
      }
    });

    await t.test("broken images fail visibly and clean up", async () => {
      await importMarkdown("broken", "![Broken](data:image/png;base64,broken)");
      const dialogPromise = new Promise((resolve) => {
        page.once("dialog", async (dialog) => {
          const message = dialog.message();
          await dialog.accept();
          resolve(message);
        });
      });
      await clickButton(page, "⬇ Export");
      await clickButton(page, "PDF (Save as PDF)");
      await clickButton(page, "Continue to PDF");
      assert.match(await dialogPromise, /image could not be loaded/);
      await page.waitForFunction(
        () => !document.querySelector('iframe[title="PDF export"]'),
      );
    });

    await t.test("existing formats still download", async () => {
      await importMarkdown("existing-formats", "# Existing export\n\n**Kept**");
      const downloads = await mkdtemp(path.join(output, "downloads-"));
      const session = await page.createCDPSession();
      await session.send("Browser.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: downloads,
        eventsEnabled: true,
      });
      for (const label of ["Markdown (.md)", "HTML", "DOCX", "TXT"]) {
        const completed = new Promise((resolve) => {
          const listener = (event) => {
            if (event.state === "completed") {
              session.off("Browser.downloadProgress", listener);
              resolve();
            }
          };
          session.on("Browser.downloadProgress", listener);
        });
        await clickButton(page, "⬇ Export");
        await clickButton(page, label);
        await completed;
      }
      const files = await readdir(downloads);
      for (const ext of ["md", "html", "docx", "txt"]) {
        assert.ok(files.includes(`existing-formats.${ext}`));
      }
      assert.match(
        await readFile(path.join(downloads, "existing-formats.md"), "utf8"),
        /\*\*Kept\*\*/,
      );
      const html = await readFile(
        path.join(downloads, "existing-formats.html"), "utf8",
      );
      assert.ok(html.includes("<strong>Kept</strong>"));
      assert.ok(!html.includes("@page"), "PDF styles must not affect HTML");
    });

    await t.test("editing, Markdown pane, preview, and slides still work", async () => {
      await clickButton(page, "Ⓜ Markdown");
      await page.waitForSelector(".md-pane-textarea");
      assert.match(
        await page.$eval(".md-pane-textarea", (el) => el.value),
        /Existing export/,
      );
      await clickButton(page, "Ⓜ Markdown");
      await page.locator(".tiptap").click();
      await page.keyboard.press("End");
      await page.keyboard.type(" Edited");
      assert.match(await page.$eval(".tiptap", (el) => el.innerText), /Edited/);
      await clickButton(page, "⛶ Preview");
      await page.waitForFunction(() =>
        document.querySelector('iframe[title^="Preview of"]')
          ?.contentDocument?.body?.textContent.includes("Edited"),
      );
      await page.locator('button[aria-label="Close preview"]').click();
      await clickButton(page, "▤ Slides");
      const slideElement = await page.waitForSelector(
        'iframe[title^="Slides for"]',
      );
      const slideFrame = await slideElement.contentFrame();
      await slideFrame.waitForFunction(() =>
        document.body.textContent.includes("Edited"),
      );
      await page.locator('button[aria-label="Close slides"]').click();
    });
    await t.test("PDF layout controls validate, apply, and remember settings", async () => {
      await importMarkdown("layout", "# Layout sample\n\nFirst paragraph.\n\nSecond.");
      const before = await page.$eval(".tiptap", (el) => el.editor.getHTML());
      await page.bringToFront();
      await page.evaluate(() => { window.pdfCapture = null; });
      await clickButton(page, "⬇ Export");
      await clickButton(page, "PDF (Save as PDF)");
      await page.waitForSelector("dialog[open]");
      assert.equal(await page.$eval('[name="margin"]', (el) => el.value), "16");
      await page.screenshot({ path: path.join(output, "layout-desktop.png") });
      await page.setViewport({ width: 390, height: 844 });
      const fits = await page.$eval("dialog", (el) => {
        const rect = el.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth &&
          el.scrollWidth === el.clientWidth;
      });
      assert.ok(fits, "Settings fit on mobile without horizontal overflow");
      await page.screenshot({ path: path.join(output, "layout-mobile.png") });
      await page.locator('[name="margin"]').fill("80");
      await clickButton(page, "Continue to PDF");
      assert.ok(await page.$("dialog[open]"), "Invalid values prevent export");
      assert.equal(await page.evaluate(() => window.pdfCapture), null);
      for (const [key, value] of Object.entries({
        lineSpacing: "2", paragraphSpacing: "18", margin: "24", padding: "8",
      })) {
        await page.locator(`[name="${key}"]`).fill(value);
      }
      await clickButton(page, "Continue to PDF");
      await page.waitForFunction(() => window.pdfCapture);
      const capture = await page.evaluate(() => window.pdfCapture);
      const printPage = await browser.newPage();
      await printPage.setContent(capture.html, { waitUntil: "networkidle0" });
      const style = await printPage.evaluate(() => ({
        lineHeight: getComputedStyle(document.body).lineHeight,
        fontSize: getComputedStyle(document.body).fontSize,
        paragraphGap: getComputedStyle(document.querySelector("p")).marginBottom,
        pageMargin: Array.from(document.styleSheets[0].cssRules)
          .find((rule) => rule instanceof CSSPageRule).style.margin,
      }));
      assert.ok(Math.abs(parseFloat(style.lineHeight) /
        parseFloat(style.fontSize) - 2) < 0.01);
      assert.equal(style.paragraphGap, "24px");
      assert.equal(style.pageMargin, "32mm");
      await printPage.pdf({
        path: path.join(output, "custom-layout.pdf"),
        preferCSSPageSize: true, printBackground: true,
      });
      await printPage.close();
      await page.evaluate(() => {
        document.querySelector('iframe[title="PDF export"]')
          .contentWindow.dispatchEvent(new Event("afterprint"));
      });
      await page.waitForFunction(
        () => !document.querySelector('iframe[title="PDF export"]'),
      );
      assert.equal(await page.$eval(".tiptap", (el) => el.editor.getHTML()), before);
      await page.bringToFront();
      await clickButton(page, "⬇ Export");
      await clickButton(page, "PDF (Save as PDF)");
      assert.equal(await page.$eval('[name="padding"]', (el) => el.value), "8");
      await clickButton(page, "Cancel");
      assert.equal(await page.$("dialog[open]"), null);
      await clickButton(page, "⬇ Export");
      await clickButton(page, "PDF (Save as PDF)");
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector("dialog[open]"));
    });
    assert.deepEqual(errors, [], "No browser runtime errors");
    console.log(`PDF test artifacts: ${output}`);
  } finally {
    await browser.close();
  }
});
