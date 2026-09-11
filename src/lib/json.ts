
export interface ValidationResult {
  valid: boolean;
  error?: string;
  parsed?: unknown;
}

export function validateJSON(jsonText: string): ValidationResult {
  try {
    const parsed = JSON.parse(jsonText.trim());
    return { valid: true, parsed };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Invalid JSON";
    return { valid: false, error };
  }
}

export function beautifyJSON(jsonText: string, spaces: number | string = 2): string {
  const { valid, parsed, error } = validateJSON(jsonText);
  if (!valid) {
    throw new Error(error);
  }
  return JSON.stringify(parsed, null, spaces);
}

export function minifyJSON(jsonText: string): string {
  const { valid, parsed, error } = validateJSON(jsonText);
  if (!valid) {
    throw new Error(error);
  }
  return JSON.stringify(parsed);
}

/**
 * Parse a plain JavaScript object/array literal WITHOUT evaluating it.
 * Accepts only literal syntax (unquoted keys, single/double/backtick strings,
 * comments, trailing commas, hex/octal/binary numbers, undefined, etc.) and
 * throws a descriptive error for anything that would require executing code.
 */
export function parseJSLiteral(jsText: string): unknown {
  const trimmed = jsText.trim();
  if (!trimmed) throw new Error("Input is empty");
  return new JSLiteralParser(trimmed).parse();
}

/**
 * Convert a plain JavaScript object/array literal into strict JSON.
 * The input is parsed, never evaluated, so pasted code cannot execute.
 */
export function jsToJSON(jsText: string, spaces: number | string = 2): string {
  const value = parseJSLiteral(jsText);
  return JSON.stringify(value, null, spaces) ?? "";
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      // assignKey keeps special keys like `__proto__` as own properties
      // instead of silently mutating the object's prototype (which dropped them).
      assignKey(sorted, key, sortKeysDeep((value as Record<string, unknown>)[key]));
    }
    return sorted;
  }
  return value;
}

/** Deep-sort object keys of an already-parsed JSON value and serialize it. */
export function sortJSONValue(value: unknown, spaces: number | string = 2): string {
  return JSON.stringify(sortKeysDeep(value), null, spaces) ?? "";
}

/* ---------------------------------------------------------------------------
 * Safe JavaScript literal parsing (JS → JSON).
 *
 * The original implementation evaluated input with `new Function(...)`, which
 * executed arbitrary pasted code. This recursive-descent parser accepts ONLY
 * plain object/array literal syntax — no variables, function calls, operators
 * or declarations — so pasted input can never execute.
 * ------------------------------------------------------------------------- */

const IDENTIFIER_START = /[\p{ID_Start}$_]/u;
const IDENTIFIER_PART = /[\p{ID_Continue}$\u200C\u200D]/u;

const NUMBER_RE =
  /^(?:0[xX][0-9a-fA-F][0-9a-fA-F_]*|0[oO][0-7][0-7_]*|0[bB][01][01_]*|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][-+]?[\d_]+)?)/;

/** Assign a key without triggering the `__proto__` setter — it stays an own data property. */
export function assignKey(target: Record<string, unknown>, key: string, value: unknown): void {
  if (key === "__proto__") {
    Object.defineProperty(target, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  } else {
    target[key] = value;
  }
}

function errorAt(text: string, pos: number, message: string): Error {
  const upto = text.slice(0, Math.min(pos, text.length));
  const lines = upto.split("\n");
  return new Error(`${message} (line ${lines.length}, column ${lines[lines.length - 1].length + 1})`);
}

class JSLiteralParser {
  private readonly text: string;
  private pos = 0;

  constructor(text: string) {
    this.text = text;
  }

  private fail(message: string, pos = this.pos): never {
    throw errorAt(this.text, pos, message);
  }

  private eof(): boolean {
    return this.pos >= this.text.length;
  }

  private peek(offset = 0): string {
    return this.text[this.pos + offset] ?? "";
  }

  /** Skip whitespace and line/block comments. */
  private skipTrivia(): void {
    for (;;) {
      const c = this.peek();
      if (c === " " || c === "\t" || c === "\n" || c === "\r" || c === "\u00A0" || c === "\uFEFF") {
        this.pos++;
      } else if (c === "/" && this.peek(1) === "/") {
        while (!this.eof() && this.peek() !== "\n") this.pos++;
      } else if (c === "/" && this.peek(1) === "*") {
        const end = this.text.indexOf("*/", this.pos + 2);
        if (end === -1) this.fail("Unterminated block comment");
        this.pos = end + 2;
      } else {
        return;
      }
    }
  }

  parse(): unknown {
    this.skipTrivia();
    let value: unknown;
    if (this.peek() === "(") {
      // Allow one level of wrapping parentheses: ({ ... })
      this.pos++;
      this.skipTrivia();
      value = this.parseValue();
      this.skipTrivia();
      if (this.peek() !== ")") this.fail("Expected a closing parenthesis");
      this.pos++;
    } else {
      value = this.parseValue();
    }
    this.skipTrivia();
    if (this.peek() === ";") this.pos++; // allow a single trailing semicolon
    this.skipTrivia();
    if (!this.eof()) {
      this.fail(
        "Unexpected content after the top-level value — only a single object or array literal can be converted",
      );
    }
    return value;
  }

  private parseValue(): unknown {
    this.skipTrivia();
    if (this.eof()) this.fail("Unexpected end of input — expected a value");
    const c = this.peek();
    if (c === "{") return this.parseObject();
    if (c === "[") return this.parseArray();
    if (c === '"' || c === "'" || c === "`") return this.parseString(c);
    if (c === "-" || c === "+" || c === "." || (c >= "0" && c <= "9")) return this.parseNumber();
    if (IDENTIFIER_START.test(c)) return this.parseIdentifier();
    this.fail(`Unexpected character ${JSON.stringify(c)}`);
  }

  private parseObject(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    this.pos++; // consume '{'
    this.skipTrivia();
    if (this.peek() === "}") {
      this.pos++;
      return obj;
    }
    for (;;) {
      this.skipTrivia();
      if (this.peek() === "}") {
        // covers `{}` after the first early-return and trailing commas like `{a: 1,}`
        this.pos++;
        return obj;
      }
      const key = this.parsePropertyKey();
      this.skipTrivia();
      if (this.peek() !== ":") {
        if (this.peek() === "(") {
          this.fail("Methods and functions are not supported — only plain data properties can be converted");
        }
        this.fail(
          "Shorthand properties and computed values are not supported — write the full `key: value` form with a literal value",
        );
      }
      this.pos++; // consume ':'
      assignKey(obj, key, this.parseValue());
      this.skipTrivia();
      if (this.peek() === ",") {
        this.pos++;
        continue;
      }
      if (this.peek() === "}") {
        this.pos++;
        return obj;
      }
      this.fail("Expected ',' or '}' in object literal");
    }
  }

  private parsePropertyKey(): string {
    if (this.eof()) this.fail("Unexpected end of input — expected a property key");
    const c = this.peek();
    if (c === '"' || c === "'" || c === "`") return this.parseString(c);
    if (c === "[") {
      this.fail("Computed property names are not supported — use a plain string or identifier key");
    }
    if (c === "." && this.peek(1) === "." && this.peek(2) === ".") {
      this.fail("Spread syntax (...) is not supported — write the properties out literally");
    }
    if (c === "-" || c === "+" || (c >= "0" && c <= "9")) {
      return String(this.parseNumber()); // numeric keys behave like in JS
    }
    if (IDENTIFIER_START.test(c)) {
      let word = "";
      while (!this.eof() && IDENTIFIER_PART.test(this.peek())) {
        word += this.peek();
        this.pos++;
      }
      return word;
    }
    this.fail("Expected a property key");
  }

  private parseArray(): unknown[] {
    const arr: unknown[] = [];
    this.pos++; // consume '['
    this.skipTrivia();
    if (this.peek() === "]") {
      this.pos++;
      return arr;
    }
    for (;;) {
      this.skipTrivia();
      if (this.peek() === ",") {
        // Sparse-array elision serializes as null, matching JSON.stringify.
        arr.push(undefined);
        this.pos++;
        continue;
      }
      if (this.peek() === "]") {
        this.pos++;
        return arr;
      }
      arr.push(this.parseValue());
      this.skipTrivia();
      if (this.peek() === ",") {
        this.pos++;
        continue;
      }
      if (this.peek() === "]") {
        this.pos++;
        return arr;
      }
      this.fail("Expected ',' or ']' in array literal");
    }
  }

  private parseString(quote: string): string {
    const start = this.pos;
    this.pos++; // consume the opening quote
    let out = "";
    for (;;) {
      if (this.eof()) this.fail("Unterminated string literal", start);
      const c = this.peek();
      if (c === quote) {
        this.pos++;
        return out;
      }
      if (c === "\\") {
        this.pos++;
        if (this.eof()) this.fail("Unterminated string literal", start);
        out += this.parseEscape();
        continue;
      }
      if (quote !== "`" && (c === "\n" || c === "\r")) {
        this.fail("Unterminated string literal — a quoted string cannot span lines", start);
      }
      if (quote === "`" && c === "$" && this.peek(1) === "{") {
        this.fail("Template literal expressions (${…}) are not supported — use a plain string instead");
      }
      out += c;
      this.pos++;
    }
  }

  private parseEscape(): string {
    const esc = this.peek();
    switch (esc) {
      case "n": this.pos++; return "\n";
      case "t": this.pos++; return "\t";
      case "r": this.pos++; return "\r";
      case "b": this.pos++; return "\b";
      case "f": this.pos++; return "\f";
      case "v": this.pos++; return "\v";
      case "0":
        if (/[0-9]/.test(this.peek(1))) {
          this.fail("Legacy octal escape sequences are not supported");
        }
        this.pos++;
        return "\0";
      case "\n":
        this.pos++;
        return ""; // line continuation
      case "\r":
        this.pos++;
        if (this.peek() === "\n") this.pos++;
        return ""; // line continuation
      case "x": {
        const hex = this.text.slice(this.pos + 1, this.pos + 3);
        if (!/^[0-9a-fA-F]{2}$/.test(hex)) this.fail("Invalid \\x escape sequence");
        this.pos += 3;
        return String.fromCharCode(parseInt(hex, 16));
      }
      case "u": {
        if (this.peek(1) === "{") {
          const end = this.text.indexOf("}", this.pos + 2);
          if (end === -1) this.fail("Invalid \\u{...} escape sequence");
          const hex = this.text.slice(this.pos + 2, end);
          if (!/^[0-9a-fA-F]{1,6}$/.test(hex) || parseInt(hex, 16) > 0x10ffff) {
            this.fail("Invalid \\u{...} escape sequence");
          }
          this.pos = end + 1;
          return String.fromCodePoint(parseInt(hex, 16));
        }
        const hex = this.text.slice(this.pos + 1, this.pos + 5);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) this.fail("Invalid \\u escape sequence");
        this.pos += 5;
        return String.fromCharCode(parseInt(hex, 16));
      }
      default:
        // \' \" \` \\ \/ and any other escaped character → the character itself
        this.pos++;
        return esc;
    }
  }

  private parseNumber(): number {
    const start = this.pos;
    let negate = false;
    if (this.peek() === "-" || this.peek() === "+") {
      negate = this.peek() === "-";
      this.pos++;
    }
    const match = NUMBER_RE.exec(this.text.slice(this.pos));
    if (!match) this.fail("Invalid number literal", start);
    const raw = match[0].replace(/_/g, "");
    this.pos += match[0].length;
    if (/^0[0-9]/.test(raw)) {
      this.fail("Legacy octal literals (e.g. 0123) are not supported — use 0o…, 0x…, or a plain decimal", start);
    }
    const value = Number(raw);
    return negate ? -value : value;
  }

  private parseIdentifier(): unknown {
    const start = this.pos;
    let word = "";
    while (!this.eof() && IDENTIFIER_PART.test(this.peek())) {
      word += this.peek();
      this.pos++;
    }
    switch (word) {
      case "true": return true;
      case "false": return false;
      case "null": return null;
      case "undefined": return undefined;
      case "Infinity": return Infinity;
      case "NaN": return NaN;
    }
    if (word === "const" || word === "let" || word === "var") {
      this.fail(
        "Variable declarations are not supported — only plain literal values (numbers, strings, booleans, null, undefined, arrays, objects) can be converted",
        start,
      );
    }
    this.skipTrivia();
    const next = this.peek();
    if (next === "(") {
      this.fail(`Function calls are not supported — "${word}(...)" would have to execute to produce a value`, start);
    }
    if (next === "=") {
      this.fail("Assignments are not supported — only plain literal values can be converted", start);
    }
    this.fail(
      `References to variables are not supported — "${word}" cannot be resolved without executing code. Only literal values (numbers, strings, booleans, null, undefined, arrays, objects) can be converted`,
      start,
    );
  }
}
