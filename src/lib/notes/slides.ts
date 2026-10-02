"use client";

import { resolveDiagrams } from "./diagram-html";
import { escapeHtml } from "./markdown";

/* ---------------- slide model ---------------- */

export type SlideSeparator = "hr" | "heading" | "both";
export type SlideTheme = "dark" | "light" | "navy" | "nord";
export type SlideTransition = "none" | "fade" | "slide" | "zoom" | "flip";

export const SLIDE_TRANSITIONS: { value: SlideTransition; label: string }[] = [
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "zoom", label: "Zoom" },
  { value: "flip", label: "Flip" },
  { value: "none", label: "Instant" },
];

export interface Slide {
  index: number;
  title: string;
  html: string;
}

export interface SplitOptions {
  mode: SlideSeparator;
}

const HEADING_TAGS = new Set(["H1", "H2"]);

function titleOf(html: string, index: number): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const heading = doc.querySelector("h1, h2, h3");
  const fromHeading = heading?.textContent?.trim();
  if (fromHeading) return fromHeading;
  const text = (doc.body.textContent ?? "").trim().split(/\n+/)[0]?.trim() ?? "";
  if (text) return text.length > 80 ? `${text.slice(0, 77)}…` : text;
  return `Slide ${index + 1}`;
}

/**
 * Split rendered editor HTML into slides. Separators (`<hr>` nodes for
 * mode "hr", h1/h2 elements for "heading") are consumed, not rendered.
 * Empty slides are dropped so stray/double separators never produce
 * blank screens mid-deck.
 */
export function splitSlides(editorHtml: string, { mode }: SplitOptions): Slide[] {
  const doc = new DOMParser().parseFromString(editorHtml, "text/html");
  const bodies: HTMLElement[] = [];
  let current = doc.createElement("div");

  const flush = () => {
    if (current.textContent?.trim() || current.querySelector("img, svg, table, .mermaid-diagram")) {
      bodies.push(current);
    }
    current = doc.createElement("div");
  };

  for (const node of Array.from(doc.body.childNodes)) {
    if (node.nodeName === "HR" && (mode === "hr" || mode === "both")) {
      flush();
      continue;
    }
    if (HEADING_TAGS.has((node as Element).tagName ?? "") && (mode === "heading" || mode === "both")) {
      if (current.childNodes.length > 0) flush();
    }
    current.appendChild(node.cloneNode(true));
  }
  flush();

  return bodies.map((el, index) => ({
    index,
    html: el.innerHTML,
    title: titleOf(el.innerHTML, index),
  }));
}

/* ---------------- deck themes & styles ---------------- */

export const SLIDE_THEMES: Record<
  SlideTheme,
  { label: string; stageBg: string; stageText: string; css: string }
> = {
  dark: {
    label: "Obsidian Dark",
    stageBg: "#171b21",
    stageText: "#f4f6f8",
    css: `
      #stage { background: #171b21; color: #f4f6f8; }
      .slide code { background: rgb(127 127 127 / 22%); color: #f4f6f8; }
      .slide pre { background: rgb(127 127 127 / 14%); border: 1px solid rgb(127 127 127 / 30%); }
      .slide blockquote { border-left: 6px solid #7aa2f7; background: rgb(122 162 247 / 12%); color: #e0e6ed; }
      .slide a { color: #8ab4ff; }
      .slide li::marker { color: #7aa2f7; }
    `,
  },
  light: {
    label: "Clean Light",
    stageBg: "#ffffff",
    stageText: "#1f2328",
    css: `
      body { background: #eef1f5; color: #1f2328; }
      #stage { background: #ffffff; color: #1f2328; box-shadow: 0 20px 60px rgb(0 0 0 / 12%); }
      .slide code { background: #f0f3f6; color: #0969da; }
      .slide pre { background: #f6f8fa; border: 1px solid #d0d7de; }
      .slide blockquote { border-left: 6px solid #0969da; background: #f0f7ff; color: #334155; }
      .slide a { color: #0969da; }
      .slide li::marker { color: #0969da; }
      #progress { background: #0969da; }
      #overview .thumb { background: #ffffff; }
      #overview .thumb.is-current { border-color: #0969da; }
    `,
  },
  navy: {
    label: "Corporate Navy",
    stageBg: "#0b192e",
    stageText: "#ccd6f6",
    css: `
      body { background: #060d17; color: #ccd6f6; }
      #stage { background: #0b192e; color: #ccd6f6; box-shadow: 0 24px 80px rgb(0 0 0 / 60%); }
      .slide h1, .slide h2, .slide h3 { color: #e6f1ff; }
      .slide code { background: #112240; color: #64ffda; }
      .slide pre { background: #112240; border: 1px solid #233554; }
      .slide blockquote { border-left: 6px solid #64ffda; background: rgba(100, 255, 218, 0.08); color: #8892b0; }
      .slide a { color: #64ffda; }
      .slide li::marker { color: #64ffda; }
      #progress { background: #64ffda; }
      #overview .thumb { background: #0b192e; }
      #overview .thumb.is-current { border-color: #64ffda; }
    `,
  },
  nord: {
    label: "Nord Frost",
    stageBg: "#2e3440",
    stageText: "#eceff4",
    css: `
      body { background: #242933; color: #eceff4; }
      #stage { background: #2e3440; color: #eceff4; }
      .slide h1, .slide h2, .slide h3 { color: #88c0d0; }
      .slide code { background: #3b4252; color: #81a1c1; }
      .slide pre { background: #3b4252; border: 1px solid #4c566a; }
      .slide blockquote { border-left: 6px solid #88c0d0; background: rgba(136, 192, 208, 0.1); color: #d8dee9; }
      .slide a { color: #88c0d0; }
      .slide li::marker { color: #88c0d0; }
      #progress { background: #88c0d0; }
      #overview .thumb { background: #2e3440; }
      #overview .thumb.is-current { border-color: #88c0d0; }
    `,
  },
};

export interface SlideDeckOptions {
  separator: SlideSeparator;
  theme?: SlideTheme;
  transition?: SlideTransition;
  standalone?: boolean;
}

const DECK_BRIDGE_TAG = "__markdownSlides";

const DECK_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data: blob:",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

const BASE_DECK_CSS = `
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: #101418;
    color: #f4f6f8;
    overflow: hidden;
  }
  #deck { position: fixed; inset: 0; width: 100%; height: 100%; overflow: hidden; }
  #stage {
    width: 100%; height: 100%;
    overflow: hidden;
    position: relative;
    --slide-font-size: 30px;
    perspective: 1200px;
  }
  .slide {
    position: absolute;
    inset: 0;
    width: 100%; height: 100%;
    padding: 56px 96px;
    box-sizing: border-box;
    font-size: var(--slide-font-size, 30px);
    line-height: 1.6;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: thin;
    opacity: 0;
    pointer-events: none;
    visibility: hidden;
    transition: opacity 280ms cubic-bezier(0.2, 0.8, 0.2, 1),
                transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1),
                visibility 280ms step-end;
    will-change: transform, opacity;
  }
  .slide.is-active {
    opacity: 1;
    pointer-events: auto;
    visibility: visible;
    transform: translate3d(0, 0, 0) scale(1) rotateY(0deg);
    z-index: 2;
    transition: opacity 280ms cubic-bezier(0.2, 0.8, 0.2, 1),
                transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1),
                visibility 0ms;
  }

  /* Transition: None (Instant) */
  #stage[data-transition="none"] .slide {
    transition: none !important;
  }
  #stage[data-transition="none"] .slide.is-active {
    display: block;
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: none;
  }
  #stage[data-transition="none"] .slide:not(.is-active) {
    display: none;
    opacity: 0;
    visibility: hidden;
  }

  /* Transition: Fade */
  #stage[data-transition="fade"] .slide {
    transform: none !important;
  }
  #stage[data-transition="fade"] .slide.is-past,
  #stage[data-transition="fade"] .slide.is-future {
    opacity: 0;
  }

  /* Transition: Slide (Horizontal push) */
  #stage[data-transition="slide"] .slide.is-past {
    transform: translate3d(-100%, 0, 0);
    opacity: 0;
  }
  #stage[data-transition="slide"] .slide.is-future {
    transform: translate3d(100%, 0, 0);
    opacity: 0;
  }
  #stage[data-transition="slide"] .slide.is-active {
    transform: translate3d(0, 0, 0);
    opacity: 1;
  }

  /* Transition: Zoom */
  #stage[data-transition="zoom"] .slide.is-past {
    transform: scale(1.08);
    opacity: 0;
  }
  #stage[data-transition="zoom"] .slide.is-future {
    transform: scale(0.92);
    opacity: 0;
  }
  #stage[data-transition="zoom"] .slide.is-active {
    transform: scale(1);
    opacity: 1;
  }

  /* Transition: Flip */
  #stage[data-transition="flip"] .slide {
    transform-style: preserve-3d;
    backface-visibility: hidden;
  }
  #stage[data-transition="flip"] .slide.is-past {
    transform: rotateY(-70deg) translate3d(-20%, 0, 0);
    opacity: 0;
  }
  #stage[data-transition="flip"] .slide.is-future {
    transform: rotateY(70deg) translate3d(20%, 0, 0);
    opacity: 0;
  }
  #stage[data-transition="flip"] .slide.is-active {
    transform: rotateY(0deg) translate3d(0, 0, 0);
    opacity: 1;
  }
  .slide > :first-child { margin-top: 0; }
  .slide h1 { font-size: 2.1em; margin: 0 0 0.5em; line-height: 1.15; }
  .slide h2 { font-size: 1.6em; margin: 0 0 0.6em; line-height: 1.2; }
  .slide h3 { font-size: 1.25em; margin: 0 0 0.6em; }
  .slide p { margin: 0 0 0.7em; }
  .slide ul, .slide ol { margin: 0 0 0.7em; padding-left: 1.2em; }
  .slide li { margin: 0.25em 0; }
  .slide li::marker { font-weight: 700; }
  .slide blockquote {
    margin: 0.8em 0; padding: 0.6em 1em;
    border-radius: 0 12px 12px 0;
  }
  .slide code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.72em;
    padding: 0.12em 0.4em; border-radius: 8px;
  }
  .slide pre {
    border-radius: 14px; padding: 22px 26px; font-size: 0.66em;
    line-height: 1.55; overflow: auto;
  }
  .slide pre code { background: transparent; padding: 0; font-size: 1em; }
  .slide table { border-collapse: collapse; width: 100%; margin: 0.6em 0; font-size: 0.8em; }
  .slide th, .slide td { border: 1px solid rgb(127 127 127 / 45%); padding: 10px 18px; text-align: left; }
  .slide th { background: rgb(127 127 127 / 18%); }
  .slide img { max-width: 100%; height: auto; border-radius: 12px; }
  .mermaid-diagram { text-align: center; margin: 0.6em 0; }
  .mermaid-diagram svg { max-width: 100%; height: auto; max-height: 480px; }

  /* Margin navigation arrows */
  .stage-nav {
    position: absolute; top: 0; bottom: 0; width: 70px;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 160ms ease; cursor: pointer;
    user-select: none; z-index: 5;
  }
  .stage-nav-prev { left: 0; }
  .stage-nav-next { right: 0; }
  #stage:hover .stage-nav { opacity: 0.35; }
  .stage-nav:hover { opacity: 0.9 !important; background: rgba(0, 0, 0, 0.15); }
  .stage-nav-arrow { font-size: 28px; font-weight: bold; }

  /* Temporary fading marker canvas */
  #marker-canvas {
    position: fixed; inset: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 60;
  }
  #marker-canvas.is-active {
    pointer-events: auto; cursor: crosshair;
  }
`;

const DECK_CHROME_CSS = `
  /* Deck chrome */
  #hud {
    position: fixed; left: 0; right: 0; bottom: 0;
    display: flex; align-items: center; gap: 14px;
    padding: 10px 20px;
    font-size: 13px; letter-spacing: 0.04em;
    color: rgb(255 255 255 / 75%);
    background: linear-gradient(transparent, rgb(0 0 0 / 55%));
    opacity: 0; transition: opacity 200ms ease;
    pointer-events: none;
  }
  #deck:hover #hud, #hud.is-pinned { opacity: 1; }
  #progress { position: fixed; left: 0; top: 0; height: 4px; background: #7aa2f7; width: 0; }

  /* Overview grid */
  #overview {
    position: fixed; inset: 0; z-index: 70;
    display: none; padding: 40px;
    background: rgb(0 0 0 / 84%);
    overflow: auto;
  }
  #overview.is-open { display: block; }
  #overview .grid {
    display: grid; gap: 26px;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    max-width: 1400px; margin: 0 auto;
  }
  #overview .thumb {
    border: 2px solid transparent; border-radius: 12px;
    overflow: hidden; cursor: pointer; background: #171b21;
  }
  #overview .thumb-inner {
    width: 100%; height: 100%; overflow: hidden;
  }

  /* Empty deck */
  #empty {
    display: none; max-width: 560px; text-align: center;
    color: rgb(255 255 255 / 80%); font-size: 18px; line-height: 1.7;
  }
  #empty.is-open { display: block; }
  #empty code { background: rgb(255 255 255 / 12%); padding: 2px 10px; border-radius: 6px; }
`;

function deckScript(total: number, initialTransition: SlideTransition = "fade"): string {
  return `<script>
(function () {
  var TAG = "${DECK_BRIDGE_TAG}";
  var CMD = "${SLIDE_CMD_TAG}";
  var stage = document.getElementById("stage");
  var slides = Array.prototype.slice.call(stage.querySelectorAll(".slide"));
  var hud = document.getElementById("hud");
  var hudCount = document.getElementById("hud-count");
  var progress = document.getElementById("progress");
  var overview = document.getElementById("overview");
  var grid = overview.querySelector(".grid");
  var canvas = document.getElementById("marker-canvas");
  var ctx = canvas ? canvas.getContext("2d") : null;
  var total = ${total};
  var index = 0;
  var markerActive = false;
  var transition = "${initialTransition}";
  stage.setAttribute("data-transition", transition);

  // Font resize state (base = 30px)
  var baseFontSize = 30;
  var fontScale = 1.0;

  // Temporary marker state: stays while drawing, fades after user stops drawing
  var isDrawing = false;
  var currentStroke = null;
  var strokes = []; // array of { points: [{x, y}] }
  var fadeTimer = null;
  var fadeStartTime = 0;
  var animFrameId = null;

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    renderCanvas(1);
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  function send() {
    try {
      var msg = {
        index: index,
        total: total,
        overview: overview.classList.contains("is-open"),
        marker: markerActive,
        fontScale: Math.round(fontScale * 100),
        transition: stage.getAttribute("data-transition") || transition
      };
      msg[TAG] = true;
      parent.postMessage(msg, "*");
    } catch (e) {}
  }

  function requestClose() {
    try {
      var msg = { close: true };
      msg[TAG] = true;
      parent.postMessage(msg, "*");
    } catch (e) {}
  }

  function stopFade() {
    if (fadeTimer) {
      clearTimeout(fadeTimer);
      fadeTimer = null;
    }
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  function clearStrokes() {
    stopFade();
    strokes = [];
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function paint() {
    clearStrokes();
    slides.forEach(function (s, i) {
      s.classList.toggle("is-active", i === index);
      s.classList.toggle("is-past", i < index);
      s.classList.toggle("is-future", i > index);
    });
    hudCount.textContent = total === 0 ? "0 / 0" : (index + 1) + " / " + total;
    progress.style.width = total === 0 ? "0" : ((index + 1) / total * 100) + "%";
    try { location.hash = "#/" + (index + 1); } catch (e) {}
    Array.prototype.forEach.call(grid.children, function (t, i) {
      t.classList.toggle("is-current", i === index);
    });
    send();
  }

  function openOverview() { overview.classList.add("is-open"); hud.classList.add("is-pinned"); send(); }
  function closeOverview() { overview.classList.remove("is-open"); hud.classList.remove("is-pinned"); send(); }

  function go(i) {
    if (total === 0) return;
    index = Math.max(0, Math.min(total - 1, i));
    closeOverview();
    paint();
  }

  function step(dir) {
    if (total === 0) return;
    index = Math.max(0, Math.min(total - 1, index + dir));
    paint();
  }



  // Font size scaling
  function applyFontSize() {
    var size = Math.round(baseFontSize * fontScale);
    stage.style.setProperty("--slide-font-size", size + "px");
    send();
  }

  function setFontScale(val) {
    fontScale = Math.max(0.6, Math.min(2.0, Math.round(val * 100) / 100));
    applyFontSize();
  }

  function increaseFontSize() { setFontScale(fontScale + 0.1); }
  function decreaseFontSize() { setFontScale(fontScale - 0.1); }
  function resetFontSize() { fontScale = 1.0; applyFontSize(); }

  function toggleMarker() {
    markerActive = !markerActive;
    if (canvas) canvas.classList.toggle("is-active", markerActive);
    send();
  }

  // Render all active strokes with given opacity
  function renderCanvas(opacity) {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (opacity <= 0 || strokes.length === 0) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(255, 60, 80, " + opacity + ")";
    ctx.shadowColor = "rgba(255, 60, 80, " + (opacity * 0.7) + ")";
    ctx.shadowBlur = 8;

    for (var i = 0; i < strokes.length; i++) {
      var pts = strokes[i].points;
      if (!pts || pts.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var p = 1; p < pts.length; p++) {
        ctx.lineTo(pts[p].x, pts[p].y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // Smooth fade-out after stop drawing
  function startFadeOut() {
    fadeStartTime = Date.now();
    var duration = 1200; // 1.2s fade duration

    function stepFade() {
      var elapsed = Date.now() - fadeStartTime;
      var progressVal = elapsed / duration;
      if (progressVal >= 1) {
        clearStrokes();
      } else {
        var op = Math.max(0, 1 - progressVal);
        renderCanvas(op);
        animFrameId = requestAnimationFrame(stepFade);
      }
    }
    animFrameId = requestAnimationFrame(stepFade);
  }

  // When user ceases drawing, wait a few seconds (2.5s) then fade out
  function scheduleFadeAfterStop() {
    stopFade();
    fadeTimer = setTimeout(function () {
      startFadeOut();
    }, 2500);
  }

  if (canvas) {
    canvas.addEventListener("pointerdown", function (e) {
      if (!markerActive) return;
      stopFade();
      isDrawing = true;
      currentStroke = {
        points: [{ x: e.clientX, y: e.clientY }]
      };
      strokes.push(currentStroke);
      renderCanvas(1);
    });

    window.addEventListener("pointermove", function (e) {
      if (!isDrawing || !currentStroke) return;
      currentStroke.points.push({ x: e.clientX, y: e.clientY });
      renderCanvas(1);
    });

    function endDrawing() {
      if (!isDrawing) return;
      isDrawing = false;
      currentStroke = null;
      scheduleFadeAfterStop();
    }

    window.addEventListener("pointerup", endDrawing);
    window.addEventListener("pointercancel", endDrawing);
  }

  function requestPresent() {
    if (window.parent === window && document.documentElement.requestFullscreen) {
      var p = document.documentElement.requestFullscreen();
      if (p && p.catch) p.catch(function () {});
      return;
    }
    try {
      var msg = { fullscreen: true };
      msg[TAG] = true;
      parent.postMessage(msg, "*");
    } catch (e) {}
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      requestClose();
      return;
    }
    if (overview.classList.contains("is-open")) {
      if (e.key === "g" || e.key === "Enter") { e.preventDefault(); closeOverview(); }
      return;
    }
    switch (e.key) {
      case "ArrowRight": case " ": case "PageDown": e.preventDefault(); step(1); break;
      case "ArrowLeft": case "PageUp": e.preventDefault(); step(-1); break;
      case "Home": e.preventDefault(); go(0); break;
      case "End": e.preventDefault(); go(total - 1); break;
      case "g": case "o": openOverview(); break;
      case "f": requestPresent(); break;
      case "m": case "M": toggleMarker(); break;
      case "+": case "=": increaseFontSize(); break;
      case "-": case "_": decreaseFontSize(); break;
      case "0": resetFontSize(); break;
      case "?": hud.classList.toggle("is-pinned"); break;
    }
  });

  // Touch swipe support
  var touchX = null;
  document.addEventListener("touchstart", function (e) {
    touchX = e.touches[0].clientX;
  }, { passive: true });
  document.addEventListener("touchend", function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  // Margin nav clicks
  var prevBtn = document.getElementById("nav-prev");
  var nextBtn = document.getElementById("nav-next");
  if (prevBtn) prevBtn.addEventListener("click", function (e) { e.stopPropagation(); step(-1); });
  if (nextBtn) nextBtn.addEventListener("click", function (e) { e.stopPropagation(); step(1); });

  // Overview thumbnails
  slides.forEach(function (s, i) {
    var thumb = document.createElement("div");
    thumb.className = "thumb";
    thumb.setAttribute("role", "button");
    thumb.setAttribute("tabindex", "0");
    thumb.setAttribute("aria-label", "Go to slide " + (i + 1));
    var inner = document.createElement("div");
    inner.className = "thumb-inner";
    inner.innerHTML = '<div style="padding:16px;font-size:12px;height:100%;overflow:hidden;pointer-events:none;">' + s.innerHTML + "</div>";
    thumb.style.height = "170px";
    thumb.appendChild(inner);
    thumb.addEventListener("click", function () { go(i); });
    thumb.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(i); }
    });
    grid.appendChild(thumb);
  });

  // Parent commands
  window.addEventListener("message", function (e) {
    var data = e.data || {};
    if (!data || !data[CMD]) return;
    var cmd = data[CMD];
    if (cmd === "next") step(1);
    else if (cmd === "prev") step(-1);
    else if (cmd === "toggleOverview") {
      if (overview.classList.contains("is-open")) closeOverview(); else openOverview();
    }
    else if (cmd === "toggleMarker") toggleMarker();
    else if (cmd === "increaseFontSize") increaseFontSize();
    else if (cmd === "decreaseFontSize") decreaseFontSize();
    else if (cmd === "resetFontSize") resetFontSize();
    else if (cmd && (cmd.type === "setTransition" || cmd.action === "setTransition")) {
      var t = cmd.transition || cmd.value;
      if (t) {
        stage.setAttribute("data-transition", t);
        send();
      }
    }
    else if (typeof cmd === "object" && cmd.type === "goTo") go(cmd.index);
  });

  var start = parseInt((location.hash || "").replace("#/", ""), 10);
  if (isFinite(start) && start >= 1 && start <= total) {
    index = start - 1;
  }
  paint();
})();
</script>`;
}

/* ---------------- public builders ---------------- */

export const SLIDE_BRIDGE_TAG = DECK_BRIDGE_TAG;
export const SLIDE_CMD_TAG = "__markdownSlidesCmd";

export interface SlideDeckInfo {
  deckTitle: string;
  slides: Slide[];
}

function sectionHtml(slide: Slide, total: number): string {
  return `<section class="slide" data-index="${slide.index}" data-title="${escapeHtml(
    slide.title,
  )}" aria-label="Slide ${slide.index + 1} of ${total}">${slide.html}</section>`;
}

function slideDoc(
  deckTitle: string,
  slides: Slide[],
  script: string,
  options: { theme?: SlideTheme },
): string {
  const theme = options.theme ?? "dark";
  const themeConfig = SLIDE_THEMES[theme] ?? SLIDE_THEMES.dark;

  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<meta http-equiv="Content-Security-Policy" content="${DECK_CSP}" />`,
    `<title>${escapeHtml(deckTitle)} — Slides</title>`,
    "<style>",
    BASE_DECK_CSS,
    themeConfig.css,
    DECK_CHROME_CSS,
    "</style>",
    "</head>",
    "<body>",
    '<div id="deck">',
    '<div id="stage">',
    slides.map((s) => sectionHtml(s, slides.length)).join("\n"),
    '<div id="nav-prev" class="stage-nav stage-nav-prev" title="Previous slide (Left Arrow)"><span class="stage-nav-arrow">‹</span></div>',
    '<div id="nav-next" class="stage-nav stage-nav-next" title="Next slide (Right Arrow)"><span class="stage-nav-arrow">›</span></div>',
    "</div>",
    '<canvas id="marker-canvas"></canvas>',
    '<div id="empty"><p>This note has no slides yet.</p><p>Add <code>---</code> on its own line between sections to split the note into slides.</p></div>',
    '<div id="progress"></div>',
    '<div id="hud"><span id="hud-count">0 / 0</span><span>←/→ page by page · G overview · M marker (temporary) · +/− font size · F fullscreen</span></div>',
    '<div id="overview" role="dialog" aria-label="Slide overview"><div class="grid"></div></div>',
    "</div>",
    script,
    "</body>",
    "</html>",
  ].join("\n");
}

/**
 * Build the interactive deck for the in-app present overlay.
 * Diagrams are resolved once on the full document before slicing.
 * Supports configurable transitions (instant, fade, slide, zoom, flip).
 */
export async function buildSlideDeck(
  title: string,
  editorHtml: string,
  options: SlideDeckOptions,
): Promise<{ doc: string; info: SlideDeckInfo }> {
  const { separator, theme = "dark", transition = "fade" } = options;
  const deckTitle = title.trim() || "Untitled note";
  const resolvedHtml = await resolveDiagrams(editorHtml);
  const slides = splitSlides(resolvedHtml, { mode: separator });
  const script = deckScript(slides.length, transition);
  const doc = slideDoc(deckTitle, slides, script, { theme });
  return { doc, info: { deckTitle, slides } };
}
