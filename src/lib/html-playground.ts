/**
 * Injected into the preview before user code. Relays console calls and
 * runtime errors back to the parent page via postMessage. Keep this free
 * of `${` placeholders — it ships as a plain string.
 */
export const CONSOLE_BRIDGE = `<script>
(function () {
  var send = function (level, args) {
    try { parent.postMessage({ __htmlPlayground: true, level: level, args: args }, "*"); } catch (e) {}
  };
  var format = function (value, depth) {
    try {
      if (value instanceof Error) return value.stack || (value.name + ": " + value.message);
      if (typeof value === "function") return "[Function" + (value.name ? ": " + value.name : "") + "]";
      if (typeof value === "string") return value;
      if (value === undefined) return "undefined";
      if (value instanceof Element) return "<" + value.tagName.toLowerCase() + ">";
      if (depth > 3) return "…";
      return JSON.stringify(value, function (key, val) {
        if (typeof val === "function") return "[Function]";
        if (typeof val === "bigint") return String(val) + "n";
        return val;
      }, 2) || String(value);
    } catch (err) { return String(value); }
  };
  ["log", "info", "warn", "error", "debug"].forEach(function (method) {
    var original = console[method].bind(console);
    console[method] = function () {
      var args = Array.prototype.slice.call(arguments).map(function (v) { return format(v, 0); });
      send(method === "debug" ? "log" : method, args);
      original.apply(null, arguments);
    };
  });
  window.addEventListener("error", function (event) {
    send("error", [event.message + "  (" + (event.filename || "inline") + ":" + event.lineno + ":" + event.colno + ")"]);
  });
  window.addEventListener("unhandledrejection", function (event) {
    send("error", ["Unhandled promise rejection: " + format(event.reason, 0)]);
  });
})();
</script>`;

/**
 * Content-Security-Policy compiled into the preview/standalone document.
 * The iframe `sandbox` attribute isolates the origin and storage, but it does
 * NOT block network requests — this CSP denies every external fetch (scripts,
 * styles, images, fonts, XHR/WebSockets, form navigations). Inline code and
 * data:/blob: URLs stay allowed so normal playground code keeps working.
 */
export const PREVIEW_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data: blob:",
  "media-src data: blob:",
  "connect-src data: blob:",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

export function buildDocument(
  html: string,
  css: string,
  js: string,
  includeBridge: boolean,
): string {
  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}" />`,
    "<style>",
    css,
    "</style>",
    "</head>",
    "<body>",
    html,
    includeBridge ? CONSOLE_BRIDGE : "",
    "<script>",
    js,
    "</script>",
    "</body>",
    "</html>",
  ].join("\n");
}
