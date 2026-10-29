"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode5 = __toESM(require("vscode"));

// src/commands/codeReviewerCommand.ts
var vscode4 = __toESM(require("vscode"));
var import_child_process2 = require("child_process");

// src/config/configLoader.ts
var vscode = __toESM(require("vscode"));

// node_modules/balanced-match/dist/esm/index.js
var balanced = (a, b, str) => {
  const ma = a instanceof RegExp ? maybeMatch(a, str) : a;
  const mb = b instanceof RegExp ? maybeMatch(b, str) : b;
  const r = ma !== null && mb != null && range(ma, mb, str);
  return r && {
    start: r[0],
    end: r[1],
    pre: str.slice(0, r[0]),
    body: str.slice(r[0] + ma.length, r[1]),
    post: str.slice(r[1] + mb.length)
  };
};
var maybeMatch = (reg, str) => {
  const m = str.match(reg);
  return m ? m[0] : null;
};
var range = (a, b, str) => {
  let begs, beg, left, right = void 0, result;
  let ai = str.indexOf(a);
  let bi = str.indexOf(b, ai + 1);
  let i = ai;
  if (ai >= 0 && bi > 0) {
    if (a === b) {
      return [ai, bi];
    }
    begs = [];
    left = str.length;
    while (i >= 0 && !result) {
      if (i === ai) {
        begs.push(i);
        ai = str.indexOf(a, i + 1);
      } else if (begs.length === 1) {
        const r = begs.pop();
        if (r !== void 0)
          result = [r, bi];
      } else {
        beg = begs.pop();
        if (beg !== void 0 && beg < left) {
          left = beg;
          right = bi;
        }
        bi = str.indexOf(b, i + 1);
      }
      i = ai < bi && ai >= 0 ? ai : bi;
    }
    if (begs.length && right !== void 0) {
      result = [left, right];
    }
  }
  return result;
};

// node_modules/brace-expansion/dist/esm/index.js
var escSlash = "\0SLASH" + Math.random() + "\0";
var escOpen = "\0OPEN" + Math.random() + "\0";
var escClose = "\0CLOSE" + Math.random() + "\0";
var escComma = "\0COMMA" + Math.random() + "\0";
var escPeriod = "\0PERIOD" + Math.random() + "\0";
var escSlashPattern = new RegExp(escSlash, "g");
var escOpenPattern = new RegExp(escOpen, "g");
var escClosePattern = new RegExp(escClose, "g");
var escCommaPattern = new RegExp(escComma, "g");
var escPeriodPattern = new RegExp(escPeriod, "g");
var slashPattern = /\\\\/g;
var openPattern = /\\{/g;
var closePattern = /\\}/g;
var commaPattern = /\\,/g;
var periodPattern = /\\\./g;
var EXPANSION_MAX = 1e5;
var EXPANSION_MAX_LENGTH = 4e6;
function numeric(str) {
  return !isNaN(str) ? parseInt(str, 10) : str.charCodeAt(0);
}
function escapeBraces(str) {
  return str.replace(slashPattern, escSlash).replace(openPattern, escOpen).replace(closePattern, escClose).replace(commaPattern, escComma).replace(periodPattern, escPeriod);
}
function unescapeBraces(str) {
  return str.replace(escSlashPattern, "\\").replace(escOpenPattern, "{").replace(escClosePattern, "}").replace(escCommaPattern, ",").replace(escPeriodPattern, ".");
}
function parseCommaParts(str) {
  if (!str) {
    return [""];
  }
  const parts = [];
  const m = balanced("{", "}", str);
  if (!m) {
    return str.split(",");
  }
  const { pre, body, post } = m;
  const p = pre.split(",");
  p[p.length - 1] += "{" + body + "}";
  const postParts = parseCommaParts(post);
  if (post.length) {
    ;
    p[p.length - 1] += postParts.shift();
    p.push.apply(p, postParts);
  }
  parts.push.apply(parts, p);
  return parts;
}
function expand(str, options = {}) {
  if (!str) {
    return [];
  }
  const { max = EXPANSION_MAX, maxLength = EXPANSION_MAX_LENGTH } = options;
  if (str.slice(0, 2) === "{}") {
    str = "\\{\\}" + str.slice(2);
  }
  return expand_(escapeBraces(str), max, maxLength, true).map(unescapeBraces);
}
function embrace(str) {
  return "{" + str + "}";
}
function isPadded(el) {
  return /^-?0\d/.test(el);
}
function lte(i, y) {
  return i <= y;
}
function gte(i, y) {
  return i >= y;
}
function combine(acc, pre, values, max, maxLength, dropEmpties) {
  const out = [];
  let length = 0;
  for (let a = 0; a < acc.length; a++) {
    for (let v = 0; v < values.length; v++) {
      if (out.length >= max)
        return out;
      const expansion = acc[a] + pre + values[v];
      if (dropEmpties && !expansion)
        continue;
      if (length + expansion.length > maxLength)
        return out;
      out.push(expansion);
      length += expansion.length;
    }
  }
  return out;
}
function expandSequence(body, isAlphaSequence, max, maxLength) {
  const n = body.split(/\.\./);
  const N = [];
  if (n[0] === void 0 || n[1] === void 0) {
    return N;
  }
  const x = numeric(n[0]);
  const y = numeric(n[1]);
  const width = Math.max(n[0].length, n[1].length);
  let incr = n.length === 3 && n[2] !== void 0 ? Math.max(Math.abs(numeric(n[2])), 1) : 1;
  let test = lte;
  const reverse = y < x;
  if (reverse) {
    incr *= -1;
    test = gte;
  }
  const pad = n.some(isPadded);
  let length = 0;
  for (let i = x; test(i, y) && N.length < max; i += incr) {
    let c;
    if (isAlphaSequence) {
      c = String.fromCharCode(i);
      if (c === "\\") {
        c = "";
      }
    } else {
      c = String(i);
      if (pad) {
        const need = width - c.length;
        if (need > 0) {
          const z = new Array(need + 1).join("0");
          if (i < 0) {
            c = "-" + z + c.slice(1);
          } else {
            c = z + c;
          }
        }
      }
    }
    if (length + c.length > maxLength)
      break;
    N.push(c);
    length += c.length;
  }
  return N;
}
function expand_(str, max, maxLength, isTop) {
  let acc = [""];
  let dropEmpties = false;
  let firstGroup = true;
  for (; ; ) {
    const m = balanced("{", "}", str);
    if (!m) {
      return combine(acc, str, [""], max, maxLength, dropEmpties);
    }
    const pre = m.pre;
    if (/\$$/.test(pre)) {
      acc = combine(acc, pre + "{" + m.body + "}", [""], max, maxLength, dropEmpties && !m.post.length);
      firstGroup = false;
      if (!m.post.length)
        break;
      str = m.post;
      continue;
    }
    const isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
    const isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
    const isSequence = isNumericSequence || isAlphaSequence;
    const isOptions = m.body.indexOf(",") >= 0;
    if (!isSequence && !isOptions) {
      if (m.post.match(/,(?!,).*\}/)) {
        str = m.pre + "{" + m.body + escClose + m.post;
        isTop = true;
        continue;
      }
      return combine(acc, pre + "{" + m.body + "}" + m.post, [""], max, maxLength, dropEmpties);
    }
    if (firstGroup) {
      dropEmpties = isTop && !isSequence;
      firstGroup = false;
    }
    let values;
    if (isSequence) {
      values = expandSequence(m.body, isAlphaSequence, max, maxLength);
    } else {
      let n = parseCommaParts(m.body);
      if (n.length === 1 && n[0] !== void 0) {
        n = expand_(n[0], max, maxLength, false).map(embrace);
        if (n.length === 1) {
          acc = combine(acc, pre + n[0], [""], max, maxLength, dropEmpties && !m.post.length);
          if (!m.post.length)
            break;
          str = m.post;
          continue;
        }
      }
      let dropsEmpties = dropEmpties && !m.post.length && !pre;
      for (let d = 0; dropsEmpties && d < acc.length; d++) {
        if (acc[d]) {
          dropsEmpties = false;
        }
      }
      values = [];
      let valuesLength = 0;
      outer: for (let j = 0; j < n.length; j++) {
        const expanded = expand_(n[j], max, maxLength, false);
        for (let k = 0; k < expanded.length; k++) {
          const v = expanded[k];
          if (dropsEmpties && !v)
            continue;
          if (values.length >= max || valuesLength + v.length > maxLength) {
            break outer;
          }
          values.push(v);
          valuesLength += v.length;
        }
      }
    }
    acc = combine(acc, pre, values, max, maxLength, dropEmpties && !m.post.length);
    if (!m.post.length)
      break;
    str = m.post;
  }
  return acc;
}

// node_modules/minimatch/dist/esm/assert-valid-pattern.js
var MAX_PATTERN_LENGTH = 1024 * 64;
var assertValidPattern = (pattern) => {
  if (typeof pattern !== "string") {
    throw new TypeError("invalid pattern");
  }
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new TypeError("pattern is too long");
  }
};

// node_modules/minimatch/dist/esm/brace-expressions.js
var posixClasses = {
  "[:alnum:]": ["\\p{L}\\p{Nl}\\p{Nd}", true],
  "[:alpha:]": ["\\p{L}\\p{Nl}", true],
  "[:ascii:]": ["\\x00-\\x7f", false],
  "[:blank:]": ["\\p{Zs}\\t", true],
  "[:cntrl:]": ["\\p{Cc}", true],
  "[:digit:]": ["\\p{Nd}", true],
  "[:graph:]": ["\\p{Z}\\p{C}", true, true],
  "[:lower:]": ["\\p{Ll}", true],
  "[:print:]": ["\\p{C}", true],
  "[:punct:]": ["\\p{P}", true],
  "[:space:]": ["\\p{Z}\\t\\r\\n\\v\\f", true],
  "[:upper:]": ["\\p{Lu}", true],
  "[:word:]": ["\\p{L}\\p{Nl}\\p{Nd}\\p{Pc}", true],
  "[:xdigit:]": ["A-Fa-f0-9", false]
};
var braceEscape = (s) => s.replace(/[[\]\\-]/g, "\\$&");
var regexpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var rangesToString = (ranges) => ranges.join("");
var parseClass = (glob, position) => {
  const pos = position;
  if (glob.charAt(pos) !== "[") {
    throw new Error("not in a brace expression");
  }
  const ranges = [];
  const negs = [];
  let i = pos + 1;
  let sawStart = false;
  let uflag = false;
  let escaping = false;
  let negate = false;
  let endPos = pos;
  let rangeStart = "";
  WHILE: while (i < glob.length) {
    const c = glob.charAt(i);
    if ((c === "!" || c === "^") && i === pos + 1) {
      negate = true;
      i++;
      continue;
    }
    if (c === "]" && sawStart && !escaping) {
      endPos = i + 1;
      break;
    }
    sawStart = true;
    if (c === "\\") {
      if (!escaping) {
        escaping = true;
        i++;
        continue;
      }
    }
    if (c === "[" && !escaping) {
      for (const [cls, [unip, u, neg]] of Object.entries(posixClasses)) {
        if (glob.startsWith(cls, i)) {
          if (rangeStart) {
            return ["$.", false, glob.length - pos, true];
          }
          i += cls.length;
          if (neg)
            negs.push(unip);
          else
            ranges.push(unip);
          uflag = uflag || u;
          continue WHILE;
        }
      }
    }
    escaping = false;
    if (rangeStart) {
      if (c > rangeStart) {
        ranges.push(braceEscape(rangeStart) + "-" + braceEscape(c));
      } else if (c === rangeStart) {
        ranges.push(braceEscape(c));
      }
      rangeStart = "";
      i++;
      continue;
    }
    if (glob.startsWith("-]", i + 1)) {
      ranges.push(braceEscape(c + "-"));
      i += 2;
      continue;
    }
    if (glob.startsWith("-", i + 1)) {
      rangeStart = c;
      i += 2;
      continue;
    }
    ranges.push(braceEscape(c));
    i++;
  }
  if (endPos < i) {
    return ["", false, 0, false];
  }
  if (!ranges.length && !negs.length) {
    return ["$.", false, glob.length - pos, true];
  }
  if (negs.length === 0 && ranges.length === 1 && /^\\?.$/.test(ranges[0]) && !negate) {
    const r = ranges[0].length === 2 ? ranges[0].slice(-1) : ranges[0];
    return [regexpEscape(r), false, endPos - pos, false];
  }
  const sranges = "[" + (negate ? "^" : "") + rangesToString(ranges) + "]";
  const snegs = "[" + (negate ? "" : "^") + rangesToString(negs) + "]";
  const comb = ranges.length && negs.length ? "(" + sranges + "|" + snegs + ")" : ranges.length ? sranges : snegs;
  return [comb, uflag, endPos - pos, true];
};

// node_modules/minimatch/dist/esm/unescape.js
var unescape = (s, { windowsPathsNoEscape = false, magicalBraces = true } = {}) => {
  if (magicalBraces) {
    return windowsPathsNoEscape ? s.replace(/\[([^/\\])\]/g, "$1") : s.replace(/((?!\\).|^)\[([^/\\])\]/g, "$1$2").replace(/\\([^/])/g, "$1");
  }
  return windowsPathsNoEscape ? s.replace(/\[([^/\\{}])\]/g, "$1") : s.replace(/((?!\\).|^)\[([^/\\{}])\]/g, "$1$2").replace(/\\([^/{}])/g, "$1");
};

// node_modules/minimatch/dist/esm/ast.js
var _a;
var types = /* @__PURE__ */ new Set(["!", "?", "+", "*", "@"]);
var isExtglobType = (c) => types.has(c);
var isExtglobAST = (c) => isExtglobType(c.type);
var adoptionMap = /* @__PURE__ */ new Map([
  ["!", ["@"]],
  ["?", ["?", "@"]],
  ["@", ["@"]],
  ["*", ["*", "+", "?", "@"]],
  ["+", ["+", "@"]]
]);
var adoptionWithSpaceMap = /* @__PURE__ */ new Map([
  ["!", ["?"]],
  ["@", ["?"]],
  ["+", ["?", "*"]]
]);
var adoptionAnyMap = /* @__PURE__ */ new Map([
  ["!", ["?", "@"]],
  ["?", ["?", "@"]],
  ["@", ["?", "@"]],
  ["*", ["*", "+", "?", "@"]],
  ["+", ["+", "@", "?", "*"]]
]);
var usurpMap = /* @__PURE__ */ new Map([
  ["!", /* @__PURE__ */ new Map([["!", "@"]])],
  [
    "?",
    /* @__PURE__ */ new Map([
      ["*", "*"],
      ["+", "*"]
    ])
  ],
  [
    "@",
    /* @__PURE__ */ new Map([
      ["!", "!"],
      ["?", "?"],
      ["@", "@"],
      ["*", "*"],
      ["+", "+"]
    ])
  ],
  [
    "+",
    /* @__PURE__ */ new Map([
      ["?", "*"],
      ["*", "*"]
    ])
  ]
]);
var startNoTraversal = "(?!(?:^|/)\\.\\.?(?:$|/))";
var startNoDot = "(?!\\.)";
var addPatternStart = /* @__PURE__ */ new Set(["[", "."]);
var justDots = /* @__PURE__ */ new Set(["..", "."]);
var reSpecials = new Set("().*{}+?[]^$\\!");
var regExpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var qmark = "[^/]";
var star = qmark + "*?";
var starNoEmpty = qmark + "+?";
var ID = 0;
var AST = class {
  type;
  #root;
  #hasMagic;
  #uflag = false;
  #parts = [];
  #parent;
  #parentIndex;
  #negs;
  #filledNegs = false;
  #options;
  #toString;
  // set to true if it's an extglob with no children
  // (which really means one child of '')
  #emptyExt = false;
  id = ++ID;
  get depth() {
    return (this.#parent?.depth ?? -1) + 1;
  }
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    return {
      "@@type": "AST",
      id: this.id,
      type: this.type,
      root: this.#root.id,
      parent: this.#parent?.id,
      depth: this.depth,
      partsLength: this.#parts.length,
      parts: this.#parts
    };
  }
  constructor(type, parent, options = {}) {
    this.type = type;
    if (type)
      this.#hasMagic = true;
    this.#parent = parent;
    this.#root = this.#parent ? this.#parent.#root : this;
    this.#options = this.#root === this ? options : this.#root.#options;
    this.#negs = this.#root === this ? [] : this.#root.#negs;
    if (type === "!" && !this.#root.#filledNegs)
      this.#negs.push(this);
    this.#parentIndex = this.#parent ? this.#parent.#parts.length : 0;
  }
  get hasMagic() {
    if (this.#hasMagic !== void 0)
      return this.#hasMagic;
    for (const p of this.#parts) {
      if (typeof p === "string")
        continue;
      if (p.type || p.hasMagic)
        return this.#hasMagic = true;
    }
    return this.#hasMagic;
  }
  // reconstructs the pattern
  toString() {
    return this.#toString !== void 0 ? this.#toString : !this.type ? this.#toString = this.#parts.map((p) => String(p)).join("") : this.#toString = this.type + "(" + this.#parts.map((p) => String(p)).join("|") + ")";
  }
  #fillNegs() {
    if (this !== this.#root)
      throw new Error("should only call on root");
    if (this.#filledNegs)
      return this;
    this.toString();
    this.#filledNegs = true;
    let n;
    while (n = this.#negs.pop()) {
      if (n.type !== "!")
        continue;
      let p = n;
      let pp = p.#parent;
      while (pp) {
        for (let i = p.#parentIndex + 1; !pp.type && i < pp.#parts.length; i++) {
          for (const part of n.#parts) {
            if (typeof part === "string") {
              throw new Error("string part in extglob AST??");
            }
            part.copyIn(pp.#parts[i]);
          }
        }
        p = pp;
        pp = p.#parent;
      }
    }
    return this;
  }
  push(...parts) {
    for (const p of parts) {
      if (p === "")
        continue;
      if (typeof p !== "string" && !(p instanceof _a && p.#parent === this)) {
        throw new Error("invalid part: " + p);
      }
      this.#parts.push(p);
    }
  }
  toJSON() {
    const ret = this.type === null ? this.#parts.slice().map((p) => typeof p === "string" ? p : p.toJSON()) : [this.type, ...this.#parts.map((p) => p.toJSON())];
    if (this.isStart() && !this.type)
      ret.unshift([]);
    if (this.isEnd() && (this === this.#root || this.#root.#filledNegs && this.#parent?.type === "!")) {
      ret.push({});
    }
    return ret;
  }
  isStart() {
    if (this.#root === this)
      return true;
    if (!this.#parent?.isStart())
      return false;
    if (this.#parentIndex === 0)
      return true;
    const p = this.#parent;
    for (let i = 0; i < this.#parentIndex; i++) {
      const pp = p.#parts[i];
      if (!(pp instanceof _a && pp.type === "!")) {
        return false;
      }
    }
    return true;
  }
  isEnd() {
    if (this.#root === this)
      return true;
    if (this.#parent?.type === "!")
      return true;
    if (!this.#parent?.isEnd())
      return false;
    if (!this.type)
      return this.#parent?.isEnd();
    const pl = this.#parent ? this.#parent.#parts.length : 0;
    return this.#parentIndex === pl - 1;
  }
  copyIn(part) {
    if (typeof part === "string")
      this.push(part);
    else
      this.push(part.clone(this));
  }
  clone(parent) {
    const c = new _a(this.type, parent);
    for (const p of this.#parts) {
      c.copyIn(p);
    }
    return c;
  }
  static #parseAST(str, ast, pos, opt, extDepth) {
    const maxDepth = opt.maxExtglobRecursion ?? 2;
    let escaping = false;
    let inBrace = false;
    let braceStart = -1;
    let braceNeg = false;
    if (ast.type === null) {
      let i2 = pos;
      let acc2 = "";
      while (i2 < str.length) {
        const c = str.charAt(i2++);
        if (escaping || c === "\\") {
          escaping = !escaping;
          acc2 += c;
          continue;
        }
        if (inBrace) {
          if (i2 === braceStart + 1) {
            if (c === "^" || c === "!") {
              braceNeg = true;
            }
          } else if (c === "]" && !(i2 === braceStart + 2 && braceNeg)) {
            inBrace = false;
          }
          acc2 += c;
          continue;
        } else if (c === "[") {
          inBrace = true;
          braceStart = i2;
          braceNeg = false;
          acc2 += c;
          continue;
        }
        const doRecurse = !opt.noext && isExtglobType(c) && str.charAt(i2) === "(" && extDepth <= maxDepth;
        if (doRecurse) {
          ast.push(acc2);
          acc2 = "";
          const ext2 = new _a(c, ast);
          i2 = _a.#parseAST(str, ext2, i2, opt, extDepth + 1);
          ast.push(ext2);
          continue;
        }
        acc2 += c;
      }
      ast.push(acc2);
      return i2;
    }
    let i = pos + 1;
    let part = new _a(null, ast);
    const parts = [];
    let acc = "";
    while (i < str.length) {
      const c = str.charAt(i++);
      if (escaping || c === "\\") {
        escaping = !escaping;
        acc += c;
        continue;
      }
      if (inBrace) {
        if (i === braceStart + 1) {
          if (c === "^" || c === "!") {
            braceNeg = true;
          }
        } else if (c === "]" && !(i === braceStart + 2 && braceNeg)) {
          inBrace = false;
        }
        acc += c;
        continue;
      } else if (c === "[") {
        inBrace = true;
        braceStart = i;
        braceNeg = false;
        acc += c;
        continue;
      }
      const doRecurse = !opt.noext && isExtglobType(c) && str.charAt(i) === "(" && /* c8 ignore start - the maxDepth is sufficient here */
      (extDepth <= maxDepth || ast && ast.#canAdoptType(c));
      if (doRecurse) {
        const depthAdd = ast && ast.#canAdoptType(c) ? 0 : 1;
        part.push(acc);
        acc = "";
        const ext2 = new _a(c, part);
        part.push(ext2);
        i = _a.#parseAST(str, ext2, i, opt, extDepth + depthAdd);
        continue;
      }
      if (c === "|") {
        part.push(acc);
        acc = "";
        parts.push(part);
        part = new _a(null, ast);
        continue;
      }
      if (c === ")") {
        if (acc === "" && ast.#parts.length === 0) {
          ast.#emptyExt = true;
        }
        part.push(acc);
        acc = "";
        ast.push(...parts, part);
        return i;
      }
      acc += c;
    }
    ast.type = null;
    ast.#hasMagic = void 0;
    ast.#parts = [str.substring(pos - 1)];
    return i;
  }
  #canAdoptWithSpace(child) {
    return this.#canAdopt(child, adoptionWithSpaceMap);
  }
  #canAdopt(child, map = adoptionMap) {
    if (!child || typeof child !== "object" || child.type !== null || child.#parts.length !== 1 || this.type === null) {
      return false;
    }
    const gc = child.#parts[0];
    if (!gc || typeof gc !== "object" || gc.type === null) {
      return false;
    }
    return this.#canAdoptType(gc.type, map);
  }
  #canAdoptType(c, map = adoptionAnyMap) {
    return !!map.get(this.type)?.includes(c);
  }
  #adoptWithSpace(child, index) {
    const gc = child.#parts[0];
    const blank = new _a(null, gc, this.options);
    blank.#parts.push("");
    gc.push(blank);
    this.#adopt(child, index);
  }
  #adopt(child, index) {
    const gc = child.#parts[0];
    this.#parts.splice(index, 1, ...gc.#parts);
    for (const p of gc.#parts) {
      if (typeof p === "object")
        p.#parent = this;
    }
    this.#toString = void 0;
  }
  #canUsurpType(c) {
    const m = usurpMap.get(this.type);
    return !!m?.has(c);
  }
  #canUsurp(child) {
    if (!child || typeof child !== "object" || child.type !== null || child.#parts.length !== 1 || this.type === null || this.#parts.length !== 1) {
      return false;
    }
    const gc = child.#parts[0];
    if (!gc || typeof gc !== "object" || gc.type === null) {
      return false;
    }
    return this.#canUsurpType(gc.type);
  }
  #usurp(child) {
    const m = usurpMap.get(this.type);
    const gc = child.#parts[0];
    const nt = m?.get(gc.type);
    if (!nt)
      return false;
    this.#parts = gc.#parts;
    for (const p of this.#parts) {
      if (typeof p === "object") {
        p.#parent = this;
      }
    }
    this.type = nt;
    this.#toString = void 0;
    this.#emptyExt = false;
  }
  static fromGlob(pattern, options = {}) {
    const ast = new _a(null, void 0, options);
    _a.#parseAST(pattern, ast, 0, options, 0);
    return ast;
  }
  // returns the regular expression if there's magic, or the unescaped
  // string if not.
  toMMPattern() {
    if (this !== this.#root)
      return this.#root.toMMPattern();
    const glob = this.toString();
    const [re, body, hasMagic, uflag] = this.toRegExpSource();
    const anyMagic = hasMagic || this.#hasMagic || this.#options.nocase && !this.#options.nocaseMagicOnly && glob.toUpperCase() !== glob.toLowerCase();
    if (!anyMagic) {
      return body;
    }
    const flags = (this.#options.nocase ? "i" : "") + (uflag ? "u" : "");
    return Object.assign(new RegExp(`^${re}$`, flags), {
      _src: re,
      _glob: glob
    });
  }
  get options() {
    return this.#options;
  }
  // returns the string match, the regexp source, whether there's magic
  // in the regexp (so a regular expression is required) and whether or
  // not the uflag is needed for the regular expression (for posix classes)
  // TODO: instead of injecting the start/end at this point, just return
  // the BODY of the regexp, along with the start/end portions suitable
  // for binding the start/end in either a joined full-path makeRe context
  // (where we bind to (^|/), or a standalone matchPart context (where
  // we bind to ^, and not /).  Otherwise slashes get duped!
  //
  // In part-matching mode, the start is:
  // - if not isStart: nothing
  // - if traversal possible, but not allowed: ^(?!\.\.?$)
  // - if dots allowed or not possible: ^
  // - if dots possible and not allowed: ^(?!\.)
  // end is:
  // - if not isEnd(): nothing
  // - else: $
  //
  // In full-path matching mode, we put the slash at the START of the
  // pattern, so start is:
  // - if first pattern: same as part-matching mode
  // - if not isStart(): nothing
  // - if traversal possible, but not allowed: /(?!\.\.?(?:$|/))
  // - if dots allowed or not possible: /
  // - if dots possible and not allowed: /(?!\.)
  // end is:
  // - if last pattern, same as part-matching mode
  // - else nothing
  //
  // Always put the (?:$|/) on negated tails, though, because that has to be
  // there to bind the end of the negated pattern portion, and it's easier to
  // just stick it in now rather than try to inject it later in the middle of
  // the pattern.
  //
  // We can just always return the same end, and leave it up to the caller
  // to know whether it's going to be used joined or in parts.
  // And, if the start is adjusted slightly, can do the same there:
  // - if not isStart: nothing
  // - if traversal possible, but not allowed: (?:/|^)(?!\.\.?$)
  // - if dots allowed or not possible: (?:/|^)
  // - if dots possible and not allowed: (?:/|^)(?!\.)
  //
  // But it's better to have a simpler binding without a conditional, for
  // performance, so probably better to return both start options.
  //
  // Then the caller just ignores the end if it's not the first pattern,
  // and the start always gets applied.
  //
  // But that's always going to be $ if it's the ending pattern, or nothing,
  // so the caller can just attach $ at the end of the pattern when building.
  //
  // So the todo is:
  // - better detect what kind of start is needed
  // - return both flavors of starting pattern
  // - attach $ at the end of the pattern when creating the actual RegExp
  //
  // Ah, but wait, no, that all only applies to the root when the first pattern
  // is not an extglob. If the first pattern IS an extglob, then we need all
  // that dot prevention biz to live in the extglob portions, because eg
  // +(*|.x*) can match .xy but not .yx.
  //
  // So, return the two flavors if it's #root and the first child is not an
  // AST, otherwise leave it to the child AST to handle it, and there,
  // use the (?:^|/) style of start binding.
  //
  // Even simplified further:
  // - Since the start for a join is eg /(?!\.) and the start for a part
  // is ^(?!\.), we can just prepend (?!\.) to the pattern (either root
  // or start or whatever) and prepend ^ or / at the Regexp construction.
  toRegExpSource(allowDot) {
    const dot = allowDot ?? !!this.#options.dot;
    if (this.#root === this) {
      this.#flatten();
      this.#fillNegs();
    }
    if (!isExtglobAST(this)) {
      const noEmpty = this.isStart() && this.isEnd() && !this.#parts.some((s) => typeof s !== "string");
      const src = this.#parts.map((p) => {
        const [re, _, hasMagic, uflag] = typeof p === "string" ? _a.#parseGlob(p, this.#hasMagic, noEmpty) : p.toRegExpSource(allowDot);
        this.#hasMagic = this.#hasMagic || hasMagic;
        this.#uflag = this.#uflag || uflag;
        return re;
      }).join("");
      let start2 = "";
      if (this.isStart()) {
        if (typeof this.#parts[0] === "string") {
          const dotTravAllowed = this.#parts.length === 1 && justDots.has(this.#parts[0]);
          if (!dotTravAllowed) {
            const aps = addPatternStart;
            const needNoTrav = (
              // dots are allowed, and the pattern starts with [ or .
              dot && aps.has(src.charAt(0)) || // the pattern starts with \., and then [ or .
              src.startsWith("\\.") && aps.has(src.charAt(2)) || // the pattern starts with \.\., and then [ or .
              src.startsWith("\\.\\.") && aps.has(src.charAt(4))
            );
            const needNoDot = !dot && !allowDot && aps.has(src.charAt(0));
            start2 = needNoTrav ? startNoTraversal : needNoDot ? startNoDot : "";
          }
        }
      }
      let end = "";
      if (this.isEnd() && this.#root.#filledNegs && this.#parent?.type === "!") {
        end = "(?:$|\\/)";
      }
      const final2 = start2 + src + end;
      return [
        final2,
        unescape(src),
        this.#hasMagic = !!this.#hasMagic,
        this.#uflag
      ];
    }
    const repeated = this.type === "*" || this.type === "+";
    const start = this.type === "!" ? "(?:(?!(?:" : "(?:";
    let body = this.#partsToRegExp(dot);
    if (this.isStart() && this.isEnd() && !body && this.type !== "!") {
      const s = this.toString();
      const me = this;
      me.#parts = [s];
      me.type = null;
      me.#hasMagic = void 0;
      return [s, unescape(this.toString()), false, false];
    }
    let bodyDotAllowed = !repeated || allowDot || dot || !startNoDot ? "" : this.#partsToRegExp(true);
    if (bodyDotAllowed === body) {
      bodyDotAllowed = "";
    }
    if (bodyDotAllowed) {
      body = `(?:${body})(?:${bodyDotAllowed})*?`;
    }
    let final = "";
    if (this.type === "!" && this.#emptyExt) {
      final = (this.isStart() && !dot ? startNoDot : "") + starNoEmpty;
    } else {
      const close = this.type === "!" ? (
        // !() must match something,but !(x) can match ''
        "))" + (this.isStart() && !dot && !allowDot ? startNoDot : "") + star + ")"
      ) : this.type === "@" ? ")" : this.type === "?" ? ")?" : this.type === "+" && bodyDotAllowed ? ")" : this.type === "*" && bodyDotAllowed ? `)?` : `)${this.type}`;
      final = start + body + close;
    }
    return [
      final,
      unescape(body),
      this.#hasMagic = !!this.#hasMagic,
      this.#uflag
    ];
  }
  #flatten() {
    if (!isExtglobAST(this)) {
      for (const p of this.#parts) {
        if (typeof p === "object") {
          p.#flatten();
        }
      }
    } else {
      let iterations = 0;
      let done = false;
      do {
        done = true;
        for (let i = 0; i < this.#parts.length; i++) {
          const c = this.#parts[i];
          if (typeof c === "object") {
            c.#flatten();
            if (this.#canAdopt(c)) {
              done = false;
              this.#adopt(c, i);
            } else if (this.#canAdoptWithSpace(c)) {
              done = false;
              this.#adoptWithSpace(c, i);
            } else if (this.#canUsurp(c)) {
              done = false;
              this.#usurp(c);
            }
          }
        }
      } while (!done && ++iterations < 10);
    }
    this.#toString = void 0;
  }
  #partsToRegExp(dot) {
    return this.#parts.map((p) => {
      if (typeof p === "string") {
        throw new Error("string type in extglob ast??");
      }
      const [re, _, _hasMagic, uflag] = p.toRegExpSource(dot);
      this.#uflag = this.#uflag || uflag;
      return re;
    }).filter((p) => !(this.isStart() && this.isEnd()) || !!p).join("|");
  }
  static #parseGlob(glob, hasMagic, noEmpty = false) {
    let escaping = false;
    let re = "";
    let uflag = false;
    let inStar = false;
    for (let i = 0; i < glob.length; i++) {
      const c = glob.charAt(i);
      if (escaping) {
        escaping = false;
        re += (reSpecials.has(c) ? "\\" : "") + c;
        continue;
      }
      if (c === "*") {
        if (inStar)
          continue;
        inStar = true;
        re += noEmpty && /^[*]+$/.test(glob) ? starNoEmpty : star;
        hasMagic = true;
        continue;
      } else {
        inStar = false;
      }
      if (c === "\\") {
        if (i === glob.length - 1) {
          re += "\\\\";
        } else {
          escaping = true;
        }
        continue;
      }
      if (c === "[") {
        const [src, needUflag, consumed, magic] = parseClass(glob, i);
        if (consumed) {
          re += src;
          uflag = uflag || needUflag;
          i += consumed - 1;
          hasMagic = hasMagic || magic;
          continue;
        }
      }
      if (c === "?") {
        re += qmark;
        hasMagic = true;
        continue;
      }
      re += regExpEscape(c);
    }
    return [re, unescape(glob), !!hasMagic, uflag];
  }
};
_a = AST;

// node_modules/minimatch/dist/esm/escape.js
var escape = (s, { windowsPathsNoEscape = false, magicalBraces = false } = {}) => {
  if (magicalBraces) {
    return windowsPathsNoEscape ? s.replace(/[?*()[\]{}]/g, "[$&]") : s.replace(/[?*()[\]\\{}]/g, "\\$&");
  }
  return windowsPathsNoEscape ? s.replace(/[?*()[\]]/g, "[$&]") : s.replace(/[?*()[\]\\]/g, "\\$&");
};

// node_modules/minimatch/dist/esm/index.js
var minimatch = (p, pattern, options = {}) => {
  assertValidPattern(pattern);
  if (!options.nocomment && pattern.charAt(0) === "#") {
    return false;
  }
  return new Minimatch(pattern, options).match(p);
};
var starDotExtRE = /^\*+([^+@!?*[(]*)$/;
var starDotExtTest = (ext2) => (f) => !f.startsWith(".") && f.endsWith(ext2);
var starDotExtTestDot = (ext2) => (f) => f.endsWith(ext2);
var starDotExtTestNocase = (ext2) => {
  ext2 = ext2.toLowerCase();
  return (f) => !f.startsWith(".") && f.toLowerCase().endsWith(ext2);
};
var starDotExtTestNocaseDot = (ext2) => {
  ext2 = ext2.toLowerCase();
  return (f) => f.toLowerCase().endsWith(ext2);
};
var starDotStarRE = /^\*+\.\*+$/;
var starDotStarTest = (f) => !f.startsWith(".") && f.includes(".");
var starDotStarTestDot = (f) => f !== "." && f !== ".." && f.includes(".");
var dotStarRE = /^\.\*+$/;
var dotStarTest = (f) => f !== "." && f !== ".." && f.startsWith(".");
var starRE = /^\*+$/;
var starTest = (f) => f.length !== 0 && !f.startsWith(".");
var starTestDot = (f) => f.length !== 0 && f !== "." && f !== "..";
var qmarksRE = /^\?+([^+@!?*[(]*)?$/;
var qmarksTestNocase = ([$0, ext2 = ""]) => {
  const noext = qmarksTestNoExt([$0]);
  if (!ext2)
    return noext;
  ext2 = ext2.toLowerCase();
  return (f) => noext(f) && f.toLowerCase().endsWith(ext2);
};
var qmarksTestNocaseDot = ([$0, ext2 = ""]) => {
  const noext = qmarksTestNoExtDot([$0]);
  if (!ext2)
    return noext;
  ext2 = ext2.toLowerCase();
  return (f) => noext(f) && f.toLowerCase().endsWith(ext2);
};
var qmarksTestDot = ([$0, ext2 = ""]) => {
  const noext = qmarksTestNoExtDot([$0]);
  return !ext2 ? noext : (f) => noext(f) && f.endsWith(ext2);
};
var qmarksTest = ([$0, ext2 = ""]) => {
  const noext = qmarksTestNoExt([$0]);
  return !ext2 ? noext : (f) => noext(f) && f.endsWith(ext2);
};
var qmarksTestNoExt = ([$0]) => {
  const len = $0.length;
  return (f) => f.length === len && !f.startsWith(".");
};
var qmarksTestNoExtDot = ([$0]) => {
  const len = $0.length;
  return (f) => f.length === len && f !== "." && f !== "..";
};
var defaultPlatform = typeof process === "object" && process ? typeof process.env === "object" && process.env && process.env.__MINIMATCH_TESTING_PLATFORM__ || process.platform : "posix";
var path = {
  win32: { sep: "\\" },
  posix: { sep: "/" }
};
var sep = defaultPlatform === "win32" ? path.win32.sep : path.posix.sep;
minimatch.sep = sep;
var GLOBSTAR = /* @__PURE__ */ Symbol("globstar **");
minimatch.GLOBSTAR = GLOBSTAR;
var qmark2 = "[^/]";
var star2 = qmark2 + "*?";
var twoStarDot = "(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?";
var twoStarNoDot = "(?:(?!(?:\\/|^)\\.).)*?";
var filter = (pattern, options = {}) => (p) => minimatch(p, pattern, options);
minimatch.filter = filter;
var ext = (a, b = {}) => Object.assign({}, a, b);
var defaults = (def) => {
  if (!def || typeof def !== "object" || !Object.keys(def).length) {
    return minimatch;
  }
  const orig = minimatch;
  const m = (p, pattern, options = {}) => orig(p, pattern, ext(def, options));
  return Object.assign(m, {
    Minimatch: class Minimatch extends orig.Minimatch {
      constructor(pattern, options = {}) {
        super(pattern, ext(def, options));
      }
      static defaults(options) {
        return orig.defaults(ext(def, options)).Minimatch;
      }
    },
    AST: class AST extends orig.AST {
      /* c8 ignore start */
      constructor(type, parent, options = {}) {
        super(type, parent, ext(def, options));
      }
      /* c8 ignore stop */
      static fromGlob(pattern, options = {}) {
        return orig.AST.fromGlob(pattern, ext(def, options));
      }
    },
    unescape: (s, options = {}) => orig.unescape(s, ext(def, options)),
    escape: (s, options = {}) => orig.escape(s, ext(def, options)),
    filter: (pattern, options = {}) => orig.filter(pattern, ext(def, options)),
    defaults: (options) => orig.defaults(ext(def, options)),
    makeRe: (pattern, options = {}) => orig.makeRe(pattern, ext(def, options)),
    braceExpand: (pattern, options = {}) => orig.braceExpand(pattern, ext(def, options)),
    match: (list, pattern, options = {}) => orig.match(list, pattern, ext(def, options)),
    sep: orig.sep,
    GLOBSTAR
  });
};
minimatch.defaults = defaults;
var braceExpand = (pattern, options = {}) => {
  assertValidPattern(pattern);
  if (options.nobrace || !/\{(?:(?!\{).)*\}/.test(pattern)) {
    return [pattern];
  }
  return expand(pattern, { max: options.braceExpandMax });
};
minimatch.braceExpand = braceExpand;
var makeRe = (pattern, options = {}) => new Minimatch(pattern, options).makeRe();
minimatch.makeRe = makeRe;
var match = (list, pattern, options = {}) => {
  const mm = new Minimatch(pattern, options);
  list = list.filter((f) => mm.match(f));
  if (mm.options.nonull && !list.length) {
    list.push(pattern);
  }
  return list;
};
minimatch.match = match;
var globMagic = /[?*]|[+@!]\(.*?\)|\[|\]/;
var regExpEscape2 = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var Minimatch = class {
  options;
  set;
  pattern;
  windowsPathsNoEscape;
  nonegate;
  negate;
  comment;
  empty;
  preserveMultipleSlashes;
  partial;
  globSet;
  globParts;
  nocase;
  isWindows;
  platform;
  windowsNoMagicRoot;
  maxGlobstarRecursion;
  regexp;
  constructor(pattern, options = {}) {
    assertValidPattern(pattern);
    options = options || {};
    this.options = options;
    this.maxGlobstarRecursion = options.maxGlobstarRecursion ?? 200;
    this.pattern = pattern;
    this.platform = options.platform || defaultPlatform;
    this.isWindows = this.platform === "win32";
    const awe = "allowWindowsEscape";
    this.windowsPathsNoEscape = !!options.windowsPathsNoEscape || options[awe] === false;
    if (this.windowsPathsNoEscape) {
      this.pattern = this.pattern.replace(/\\/g, "/");
    }
    this.preserveMultipleSlashes = !!options.preserveMultipleSlashes;
    this.regexp = null;
    this.negate = false;
    this.nonegate = !!options.nonegate;
    this.comment = false;
    this.empty = false;
    this.partial = !!options.partial;
    this.nocase = !!this.options.nocase;
    this.windowsNoMagicRoot = options.windowsNoMagicRoot !== void 0 ? options.windowsNoMagicRoot : !!(this.isWindows && this.nocase);
    this.globSet = [];
    this.globParts = [];
    this.set = [];
    this.make();
  }
  hasMagic() {
    if (this.options.magicalBraces && this.set.length > 1) {
      return true;
    }
    for (const pattern of this.set) {
      for (const part of pattern) {
        if (typeof part !== "string")
          return true;
      }
    }
    return false;
  }
  debug(..._) {
  }
  make() {
    const pattern = this.pattern;
    const options = this.options;
    if (!options.nocomment && pattern.charAt(0) === "#") {
      this.comment = true;
      return;
    }
    if (!pattern) {
      this.empty = true;
      return;
    }
    this.parseNegate();
    this.globSet = [...new Set(this.braceExpand())];
    if (options.debug) {
      this.debug = (...args) => console.error(...args);
    }
    this.debug(this.pattern, this.globSet);
    const rawGlobParts = this.globSet.map((s) => this.slashSplit(s));
    this.globParts = this.preprocess(rawGlobParts);
    this.debug(this.pattern, this.globParts);
    let set = this.globParts.map((s, _, __) => {
      if (this.isWindows && this.windowsNoMagicRoot) {
        const isUNC = s[0] === "" && s[1] === "" && (s[2] === "?" || !globMagic.test(s[2])) && !globMagic.test(s[3]);
        const isDrive = /^[a-z]:/i.test(s[0]);
        if (isUNC) {
          return [
            ...s.slice(0, 4),
            ...s.slice(4).map((ss) => this.parse(ss))
          ];
        } else if (isDrive) {
          return [s[0], ...s.slice(1).map((ss) => this.parse(ss))];
        }
      }
      return s.map((ss) => this.parse(ss));
    });
    this.debug(this.pattern, set);
    this.set = set.filter((s) => s.indexOf(false) === -1);
    if (this.isWindows) {
      for (let i = 0; i < this.set.length; i++) {
        const p = this.set[i];
        if (p[0] === "" && p[1] === "" && this.globParts[i][2] === "?" && typeof p[3] === "string" && /^[a-z]:$/i.test(p[3])) {
          p[2] = "?";
        }
      }
    }
    this.debug(this.pattern, this.set);
  }
  // various transforms to equivalent pattern sets that are
  // faster to process in a filesystem walk.  The goal is to
  // eliminate what we can, and push all ** patterns as far
  // to the right as possible, even if it increases the number
  // of patterns that we have to process.
  preprocess(globParts) {
    if (this.options.noglobstar) {
      for (const partset of globParts) {
        for (let j = 0; j < partset.length; j++) {
          if (partset[j] === "**") {
            partset[j] = "*";
          }
        }
      }
    }
    const { optimizationLevel = 1 } = this.options;
    if (optimizationLevel >= 2) {
      globParts = this.firstPhasePreProcess(globParts);
      globParts = this.secondPhasePreProcess(globParts);
    } else if (optimizationLevel >= 1) {
      globParts = this.levelOneOptimize(globParts);
    } else {
      globParts = this.adjascentGlobstarOptimize(globParts);
    }
    return globParts;
  }
  // just get rid of adjascent ** portions
  adjascentGlobstarOptimize(globParts) {
    return globParts.map((parts) => {
      let gs = -1;
      while (-1 !== (gs = parts.indexOf("**", gs + 1))) {
        let i = gs;
        while (parts[i + 1] === "**") {
          i++;
        }
        if (i !== gs) {
          parts.splice(gs, i - gs);
        }
      }
      return parts;
    });
  }
  // get rid of adjascent ** and resolve .. portions
  levelOneOptimize(globParts) {
    return globParts.map((parts) => {
      parts = parts.reduce((set, part) => {
        const prev = set[set.length - 1];
        if (part === "**" && prev === "**") {
          return set;
        }
        if (part === "..") {
          if (prev && prev !== ".." && prev !== "." && prev !== "**") {
            set.pop();
            return set;
          }
        }
        set.push(part);
        return set;
      }, []);
      return parts.length === 0 ? [""] : parts;
    });
  }
  levelTwoFileOptimize(parts) {
    if (!Array.isArray(parts)) {
      parts = this.slashSplit(parts);
    }
    let didSomething = false;
    do {
      didSomething = false;
      if (!this.preserveMultipleSlashes) {
        for (let i = 1; i < parts.length - 1; i++) {
          const p = parts[i];
          if (i === 1 && p === "" && parts[0] === "")
            continue;
          if (p === "." || p === "") {
            didSomething = true;
            parts.splice(i, 1);
            i--;
          }
        }
        if (parts[0] === "." && parts.length === 2 && (parts[1] === "." || parts[1] === "")) {
          didSomething = true;
          parts.pop();
        }
      }
      let dd = 0;
      while (-1 !== (dd = parts.indexOf("..", dd + 1))) {
        const p = parts[dd - 1];
        if (p && p !== "." && p !== ".." && p !== "**" && !(this.isWindows && /^[a-z]:$/i.test(p))) {
          didSomething = true;
          parts.splice(dd - 1, 2);
          dd -= 2;
        }
      }
    } while (didSomething);
    return parts.length === 0 ? [""] : parts;
  }
  // First phase: single-pattern processing
  // <pre> is 1 or more portions
  // <rest> is 1 or more portions
  // <p> is any portion other than ., .., '', or **
  // <e> is . or ''
  //
  // **/.. is *brutal* for filesystem walking performance, because
  // it effectively resets the recursive walk each time it occurs,
  // and ** cannot be reduced out by a .. pattern part like a regexp
  // or most strings (other than .., ., and '') can be.
  //
  // <pre>/**/../<p>/<p>/<rest> -> {<pre>/../<p>/<p>/<rest>,<pre>/**/<p>/<p>/<rest>}
  // <pre>/<e>/<rest> -> <pre>/<rest>
  // <pre>/<p>/../<rest> -> <pre>/<rest>
  // **/**/<rest> -> **/<rest>
  //
  // **/*/<rest> -> */**/<rest> <== not valid because ** doesn't follow
  // this WOULD be allowed if ** did follow symlinks, or * didn't
  firstPhasePreProcess(globParts) {
    let didSomething = false;
    do {
      didSomething = false;
      for (let parts of globParts) {
        let gs = -1;
        while (-1 !== (gs = parts.indexOf("**", gs + 1))) {
          let gss = gs;
          while (parts[gss + 1] === "**") {
            gss++;
          }
          if (gss > gs) {
            parts.splice(gs + 1, gss - gs);
          }
          let next = parts[gs + 1];
          const p = parts[gs + 2];
          const p2 = parts[gs + 3];
          if (next !== "..")
            continue;
          if (!p || p === "." || p === ".." || !p2 || p2 === "." || p2 === "..") {
            continue;
          }
          didSomething = true;
          parts.splice(gs, 1);
          const other = parts.slice(0);
          other[gs] = "**";
          globParts.push(other);
          gs--;
        }
        if (!this.preserveMultipleSlashes) {
          for (let i = 1; i < parts.length - 1; i++) {
            const p = parts[i];
            if (i === 1 && p === "" && parts[0] === "")
              continue;
            if (p === "." || p === "") {
              didSomething = true;
              parts.splice(i, 1);
              i--;
            }
          }
          if (parts[0] === "." && parts.length === 2 && (parts[1] === "." || parts[1] === "")) {
            didSomething = true;
            parts.pop();
          }
        }
        let dd = 0;
        while (-1 !== (dd = parts.indexOf("..", dd + 1))) {
          const p = parts[dd - 1];
          if (p && p !== "." && p !== ".." && p !== "**") {
            didSomething = true;
            const needDot = dd === 1 && parts[dd + 1] === "**";
            const splin = needDot ? ["."] : [];
            parts.splice(dd - 1, 2, ...splin);
            if (parts.length === 0)
              parts.push("");
            dd -= 2;
          }
        }
      }
    } while (didSomething);
    return globParts;
  }
  // second phase: multi-pattern dedupes
  // {<pre>/*/<rest>,<pre>/<p>/<rest>} -> <pre>/*/<rest>
  // {<pre>/<rest>,<pre>/<rest>} -> <pre>/<rest>
  // {<pre>/**/<rest>,<pre>/<rest>} -> <pre>/**/<rest>
  //
  // {<pre>/**/<rest>,<pre>/**/<p>/<rest>} -> <pre>/**/<rest>
  // ^-- not valid because ** doens't follow symlinks
  secondPhasePreProcess(globParts) {
    for (let i = 0; i < globParts.length - 1; i++) {
      for (let j = i + 1; j < globParts.length; j++) {
        const matched = this.partsMatch(globParts[i], globParts[j], !this.preserveMultipleSlashes);
        if (matched) {
          globParts[i] = [];
          globParts[j] = matched;
          break;
        }
      }
    }
    return globParts.filter((gs) => gs.length);
  }
  partsMatch(a, b, emptyGSMatch = false) {
    let ai = 0;
    let bi = 0;
    let result = [];
    let which = "";
    while (ai < a.length && bi < b.length) {
      if (a[ai] === b[bi]) {
        result.push(which === "b" ? b[bi] : a[ai]);
        ai++;
        bi++;
      } else if (emptyGSMatch && a[ai] === "**" && b[bi] === a[ai + 1]) {
        result.push(a[ai]);
        ai++;
      } else if (emptyGSMatch && b[bi] === "**" && a[ai] === b[bi + 1]) {
        result.push(b[bi]);
        bi++;
      } else if (a[ai] === "*" && b[bi] && (this.options.dot || !b[bi].startsWith(".")) && b[bi] !== "**") {
        if (which === "b")
          return false;
        which = "a";
        result.push(a[ai]);
        ai++;
        bi++;
      } else if (b[bi] === "*" && a[ai] && (this.options.dot || !a[ai].startsWith(".")) && a[ai] !== "**") {
        if (which === "a")
          return false;
        which = "b";
        result.push(b[bi]);
        ai++;
        bi++;
      } else {
        return false;
      }
    }
    return a.length === b.length && result;
  }
  parseNegate() {
    if (this.nonegate)
      return;
    const pattern = this.pattern;
    let negate = false;
    let negateOffset = 0;
    for (let i = 0; i < pattern.length && pattern.charAt(i) === "!"; i++) {
      negate = !negate;
      negateOffset++;
    }
    if (negateOffset)
      this.pattern = pattern.slice(negateOffset);
    this.negate = negate;
  }
  // set partial to true to test if, for example,
  // "/a/b" matches the start of "/*/b/*/d"
  // Partial means, if you run out of file before you run
  // out of pattern, then that's fine, as long as all
  // the parts match.
  matchOne(file, pattern, partial = false) {
    let fileStartIndex = 0;
    let patternStartIndex = 0;
    if (this.isWindows) {
      const fileDrive = typeof file[0] === "string" && /^[a-z]:$/i.test(file[0]);
      const fileUNC = !fileDrive && file[0] === "" && file[1] === "" && file[2] === "?" && /^[a-z]:$/i.test(file[3]);
      const patternDrive = typeof pattern[0] === "string" && /^[a-z]:$/i.test(pattern[0]);
      const patternUNC = !patternDrive && pattern[0] === "" && pattern[1] === "" && pattern[2] === "?" && typeof pattern[3] === "string" && /^[a-z]:$/i.test(pattern[3]);
      const fdi = fileUNC ? 3 : fileDrive ? 0 : void 0;
      const pdi = patternUNC ? 3 : patternDrive ? 0 : void 0;
      if (typeof fdi === "number" && typeof pdi === "number") {
        const [fd, pd] = [
          file[fdi],
          pattern[pdi]
        ];
        if (fd.toLowerCase() === pd.toLowerCase()) {
          pattern[pdi] = fd;
          patternStartIndex = pdi;
          fileStartIndex = fdi;
        }
      }
    }
    const { optimizationLevel = 1 } = this.options;
    if (optimizationLevel >= 2) {
      file = this.levelTwoFileOptimize(file);
    }
    if (pattern.includes(GLOBSTAR)) {
      return this.#matchGlobstar(file, pattern, partial, fileStartIndex, patternStartIndex);
    }
    return this.#matchOne(file, pattern, partial, fileStartIndex, patternStartIndex);
  }
  #matchGlobstar(file, pattern, partial, fileIndex, patternIndex) {
    const firstgs = pattern.indexOf(GLOBSTAR, patternIndex);
    const lastgs = pattern.lastIndexOf(GLOBSTAR);
    const [head, body, tail] = partial ? [
      pattern.slice(patternIndex, firstgs),
      pattern.slice(firstgs + 1),
      []
    ] : [
      pattern.slice(patternIndex, firstgs),
      pattern.slice(firstgs + 1, lastgs),
      pattern.slice(lastgs + 1)
    ];
    if (head.length) {
      const fileHead = file.slice(fileIndex, fileIndex + head.length);
      if (!this.#matchOne(fileHead, head, partial, 0, 0)) {
        return false;
      }
      fileIndex += head.length;
      patternIndex += head.length;
    }
    let fileTailMatch = 0;
    if (tail.length) {
      if (tail.length + fileIndex > file.length)
        return false;
      let tailStart = file.length - tail.length;
      if (this.#matchOne(file, tail, partial, tailStart, 0)) {
        fileTailMatch = tail.length;
      } else {
        if (file[file.length - 1] !== "" || fileIndex + tail.length === file.length) {
          return false;
        }
        tailStart--;
        if (!this.#matchOne(file, tail, partial, tailStart, 0)) {
          return false;
        }
        fileTailMatch = tail.length + 1;
      }
    }
    if (!body.length) {
      let sawSome = !!fileTailMatch;
      for (let i2 = fileIndex; i2 < file.length - fileTailMatch; i2++) {
        const f = String(file[i2]);
        sawSome = true;
        if (f === "." || f === ".." || !this.options.dot && f.startsWith(".")) {
          return false;
        }
      }
      return partial || sawSome;
    }
    const bodySegments = [[[], 0]];
    let currentBody = bodySegments[0];
    let nonGsParts = 0;
    const nonGsPartsSums = [0];
    for (const b of body) {
      if (b === GLOBSTAR) {
        nonGsPartsSums.push(nonGsParts);
        currentBody = [[], 0];
        bodySegments.push(currentBody);
      } else {
        currentBody[0].push(b);
        nonGsParts++;
      }
    }
    let i = bodySegments.length - 1;
    const fileLength = file.length - fileTailMatch;
    for (const b of bodySegments) {
      b[1] = fileLength - (nonGsPartsSums[i--] + b[0].length);
    }
    return !!this.#matchGlobStarBodySections(file, bodySegments, fileIndex, 0, partial, 0, !!fileTailMatch);
  }
  // return false for "nope, not matching"
  // return null for "not matching, cannot keep trying"
  #matchGlobStarBodySections(file, bodySegments, fileIndex, bodyIndex, partial, globStarDepth, sawTail) {
    const bs = bodySegments[bodyIndex];
    if (!bs) {
      for (let i = fileIndex; i < file.length; i++) {
        sawTail = true;
        const f = file[i];
        if (f === "." || f === ".." || !this.options.dot && f.startsWith(".")) {
          return false;
        }
      }
      return sawTail;
    }
    const [body, after] = bs;
    while (fileIndex <= after) {
      const m = this.#matchOne(file.slice(0, fileIndex + body.length), body, partial, fileIndex, 0);
      if (m && globStarDepth < this.maxGlobstarRecursion) {
        const sub = this.#matchGlobStarBodySections(file, bodySegments, fileIndex + body.length, bodyIndex + 1, partial, globStarDepth + 1, sawTail);
        if (sub !== false) {
          return sub;
        }
      }
      const f = file[fileIndex];
      if (f === "." || f === ".." || !this.options.dot && f.startsWith(".")) {
        return false;
      }
      fileIndex++;
    }
    return partial || null;
  }
  #matchOne(file, pattern, partial, fileIndex, patternIndex) {
    let fi;
    let pi;
    let pl;
    let fl;
    for (fi = fileIndex, pi = patternIndex, fl = file.length, pl = pattern.length; fi < fl && pi < pl; fi++, pi++) {
      this.debug("matchOne loop");
      let p = pattern[pi];
      let f = file[fi];
      this.debug(pattern, p, f);
      if (p === false || p === GLOBSTAR) {
        return false;
      }
      let hit;
      if (typeof p === "string") {
        hit = f === p;
        this.debug("string match", p, f, hit);
      } else {
        hit = p.test(f);
        this.debug("pattern match", p, f, hit);
      }
      if (!hit)
        return false;
    }
    if (fi === fl && pi === pl) {
      return true;
    } else if (fi === fl) {
      return partial;
    } else if (pi === pl) {
      return fi === fl - 1 && file[fi] === "";
    } else {
      throw new Error("wtf?");
    }
  }
  braceExpand() {
    return braceExpand(this.pattern, this.options);
  }
  parse(pattern) {
    assertValidPattern(pattern);
    const options = this.options;
    if (pattern === "**")
      return GLOBSTAR;
    if (pattern === "")
      return "";
    let m;
    let fastTest = null;
    if (m = pattern.match(starRE)) {
      fastTest = options.dot ? starTestDot : starTest;
    } else if (m = pattern.match(starDotExtRE)) {
      fastTest = (options.nocase ? options.dot ? starDotExtTestNocaseDot : starDotExtTestNocase : options.dot ? starDotExtTestDot : starDotExtTest)(m[1]);
    } else if (m = pattern.match(qmarksRE)) {
      fastTest = (options.nocase ? options.dot ? qmarksTestNocaseDot : qmarksTestNocase : options.dot ? qmarksTestDot : qmarksTest)(m);
    } else if (m = pattern.match(starDotStarRE)) {
      fastTest = options.dot ? starDotStarTestDot : starDotStarTest;
    } else if (m = pattern.match(dotStarRE)) {
      fastTest = dotStarTest;
    }
    const re = AST.fromGlob(pattern, this.options).toMMPattern();
    if (fastTest && typeof re === "object") {
      Reflect.defineProperty(re, "test", { value: fastTest });
    }
    return re;
  }
  makeRe() {
    if (this.regexp || this.regexp === false)
      return this.regexp;
    const set = this.set;
    if (!set.length) {
      this.regexp = false;
      return this.regexp;
    }
    const options = this.options;
    const twoStar = options.noglobstar ? star2 : options.dot ? twoStarDot : twoStarNoDot;
    const flags = new Set(options.nocase ? ["i"] : []);
    let re = set.map((pattern) => {
      const pp = pattern.map((p) => {
        if (p instanceof RegExp) {
          for (const f of p.flags.split(""))
            flags.add(f);
        }
        return typeof p === "string" ? regExpEscape2(p) : p === GLOBSTAR ? GLOBSTAR : p._src;
      });
      pp.forEach((p, i) => {
        const next = pp[i + 1];
        const prev = pp[i - 1];
        if (p !== GLOBSTAR || prev === GLOBSTAR) {
          return;
        }
        if (prev === void 0) {
          if (next !== void 0 && next !== GLOBSTAR) {
            pp[i + 1] = "(?:\\/|" + twoStar + "\\/)?" + next;
          } else {
            pp[i] = twoStar;
          }
        } else if (next === void 0) {
          pp[i - 1] = prev + "(?:\\/|\\/" + twoStar + ")?";
        } else if (next !== GLOBSTAR) {
          pp[i - 1] = prev + "(?:\\/|\\/" + twoStar + "\\/)" + next;
          pp[i + 1] = GLOBSTAR;
        }
      });
      const filtered = pp.filter((p) => p !== GLOBSTAR);
      if (this.partial && filtered.length >= 1) {
        const prefixes = [];
        for (let i = 1; i <= filtered.length; i++) {
          prefixes.push(filtered.slice(0, i).join("/"));
        }
        return "(?:" + prefixes.join("|") + ")";
      }
      return filtered.join("/");
    }).join("|");
    const [open, close] = set.length > 1 ? ["(?:", ")"] : ["", ""];
    re = "^" + open + re + close + "$";
    if (this.partial) {
      re = "^(?:\\/|" + open + re.slice(1, -1) + close + ")$";
    }
    if (this.negate)
      re = "^(?!" + re + ").+$";
    try {
      this.regexp = new RegExp(re, [...flags].join(""));
    } catch {
      this.regexp = false;
    }
    return this.regexp;
  }
  slashSplit(p) {
    if (this.preserveMultipleSlashes) {
      return p.split("/");
    } else if (this.isWindows && /^\/\/[^/]+/.test(p)) {
      return ["", ...p.split(/\/+/)];
    } else {
      return p.split(/\/+/);
    }
  }
  match(f, partial = this.partial) {
    this.debug("match", f, this.pattern);
    if (this.comment) {
      return false;
    }
    if (this.empty) {
      return f === "";
    }
    if (f === "/" && partial) {
      return true;
    }
    const options = this.options;
    if (this.isWindows) {
      f = f.split("\\").join("/");
    }
    const ff = this.slashSplit(f);
    this.debug(this.pattern, "split", ff);
    const set = this.set;
    this.debug(this.pattern, "set", set);
    let filename = ff[ff.length - 1];
    if (!filename) {
      for (let i = ff.length - 2; !filename && i >= 0; i--) {
        filename = ff[i];
      }
    }
    for (const pattern of set) {
      let file = ff;
      if (options.matchBase && pattern.length === 1) {
        file = [filename];
      }
      const hit = this.matchOne(file, pattern, partial);
      if (hit) {
        if (options.flipNegate) {
          return true;
        }
        return !this.negate;
      }
    }
    if (options.flipNegate) {
      return false;
    }
    return this.negate;
  }
  static defaults(def) {
    return minimatch.defaults(def).Minimatch;
  }
};
minimatch.AST = AST;
minimatch.Minimatch = Minimatch;
minimatch.escape = escape;
minimatch.unescape = unescape;

// src/config/configLoader.ts
var CONFIG_FILE_NAME = "code-advisor.config.json";
var DEFAULT_CONFIG = {
  exclude: ["**/node_modules/**", "**/dist/**", "**/out/**", "**/.git/**", "**/build/**"],
  rules: {
    dtoAutoMapper: { enabled: true, maxProperties: 15, minManualAssignments: 3 },
    parameters: { enabled: true, maxInLineParams: 2, maxLineLength: 120 },
    linq: {
      enabled: true,
      suggestions: { whereSelect: true, select: true, count: true, sum: true, firstOrDefault: true }
    },
    requestModels: {
      enabled: true,
      suffixes: ["Request", "Dto", "Input", "Command", "Query", "Payload"],
      folders: ["request", "dtos", "inputs", "contracts"],
      checkOptionalProperties: true,
      checkReadonlyProperties: true
    },
    objectUsage: {
      enabled: true,
      csharp: { watchedTypes: ["object"], exemptPatterns: ["Equals\\s*\\(\\s*object\\s+\\w+\\s*\\)"] },
      typescript: { watchedTypes: ["object", "Object"], exemptPatterns: [] },
      javascript: { watchedTypes: ["Object"], exemptPatterns: [] }
    },
    layers: {
      enabled: true,
      layers: [
        { name: "controladores", folders: ["controllers", "controladores"], required: true },
        { name: "Interface", folders: ["interfaces"], required: true },
        { name: "Servicios", folders: ["services", "servicios"], required: true },
        { name: "Utils", folders: ["utils", "helpers", "utilidades"], required: true },
        {
          name: "Repositorios",
          folders: ["repositories", "repositorios"],
          required: false,
          requiredIfDatabaseDetected: true
        }
      ],
      databaseUsagePatterns: [
        "DbContext",
        "SqlConnection",
        "mongoose",
        "PrismaClient",
        "typeorm",
        "sequelize",
        "mysqli_\\w+",
        "new\\s+PDO"
      ]
    },
    interfaces: {
      enabled: true,
      contractFolders: ["models", "model", "interfaces", "interface"],
      includeAbstractClasses: true,
      lenguages: ["cs", "ts", "tsx", "js", "jsx"]
    },
    duplicateCode: {
      enabled: true,
      minLines: 5,
      minOccurrences: 2
    },
    requestHandlers: {
      enabled: true,
      next: { expected: "fetch" },
      react: { expected: "axios" },
      reactNative: { expected: "axios" },
      legacyJs: { expected: "fetch" }
    },
    componentLocation: {
      enabled: true,
      folders: ["component", "components"],
      exemptFolders: ["app", "pages", "screens", "views"],
      exemptFiles: ["App", "main", "index", "_app", "_document"]
    },
    indentation: { enabled: true },
    ifBraces: { enabled: true },
    ternaries: { enabled: true },
    varUsage: { enabled: true },
    async: { enabled: true },
    stringInterpolation: { enabled: true },
    exceptionHandling: { enabled: true },
    naming: { enabled: true },
    envNaming: { enabled: true },
    fileNaming: { enabled: true },
    cssClassNaming: { enabled: true }
  }
};
function deepMerge(base, override) {
  if (override === void 0) {
    return base;
  }
  if (override === null || typeof override !== "object" || Array.isArray(override)) {
    return override;
  }
  const result = { ...base };
  for (const key of Object.keys(override)) {
    result[key] = deepMerge(base?.[key], override[key]);
  }
  return result;
}
async function loadConfig(workspaceRoot) {
  const configUri = vscode.Uri.joinPath(workspaceRoot, CONFIG_FILE_NAME);
  try {
    const bytes = await vscode.workspace.fs.readFile(configUri);
    const userConfig = JSON.parse(Buffer.from(bytes).toString("utf8"));
    return deepMerge(DEFAULT_CONFIG, userConfig);
  } catch (error) {
    if (error.code !== "FileNotFound") {
      vscode.window.showWarningMessage(
        `Code Advisor: no se pude leer "${CONFIG_FILE_NAME}" (${error.message}); se uso la configuracion por defecto.`
      );
    }
    return DEFAULT_CONFIG;
  }
}
function buildExcludeMatchers(config) {
  return config.exclude.map((pattern) => new Minimatch(pattern, { dot: true }));
}
function isExluded(fileLabel, matchers) {
  const normalized = fileLabel.replace(/\\/g, "/");
  return matchers.some((matcher) => matcher.match(normalized));
}

// src/shared/diffUtils.ts
var import_child_process = require("child_process");
function getChangedLineNumbers(workspaceRoot, baseBranch, filePath) {
  const changedLines = /* @__PURE__ */ new Set();
  let output;
  try {
    output = (0, import_child_process.execFileSync)(
      "git",
      ["diff", "--unified=0", "--diff-filter=ACMR", `origin/${baseBranch}...HEAD`, "--", filePath],
      { cwd: workspaceRoot, encoding: "utf8" }
    );
  } catch (error) {
    throw new Error(`No se pudo obtener el diff de linea para "${filePath}": ${error.message}`);
  }
  const hunkHeaderPattern = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;
  for (const line of output.split("\n")) {
    const match2 = line.match(hunkHeaderPattern);
    if (!match2) {
      continue;
    }
    const newStart = parseInt(match2[1], 10);
    const newCount = match2[2] !== void 0 ? parseInt(match2[2], 10) : 1;
    for (let lineNumber = newStart; lineNumber < newStart + newCount; lineNumber++) {
      changedLines.add(lineNumber);
    }
  }
  return changedLines;
}
function rangeIntersectChangedLines(changedLines, startLine, endLineInclusive) {
  for (let line = startLine; line <= endLineInclusive; line++) {
    if (changedLines.has(line)) {
      return true;
    }
  }
  return false;
}

// src/config/namingConfig.ts
function matchesCase(name, caseStyle) {
  switch (caseStyle) {
    case "PascalCase":
      return /^[A-Z][a-zA-Z0-9]*$/.test(name) && /[a-z]/.test(name);
    case "camelCase":
      return /^[a-z][a-zA-Z0-9]*$/.test(name);
    case "UPPER_SNAKE_CASE":
      return /^[A-Z][A-Z0-9_]*$/.test(name);
    case "kebab-case":
      return /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name);
  }
}
var CONTROL_FLOW_KEYWORDS = /* @__PURE__ */ new Set(["if", "for", "while", "switch", "catch", "do", "try", "finally", "foreach", "using", "lock"]);
var JS_TS_NAMING_CONFIG = {
  //Estilo de nombres
  classCase: "PascalCase",
  functionCase: "camelCase",
  methodCase: "camelCase",
  variableCase: "camelCase",
  constantCase: "camelCase",
  componentCase: "PascalCase",
  //Busca la palabra class y descarta export, default y abstract, y captura el nombre
  classPatterns: [
    /^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][A-Za-z0-9_$]*)/
  ],
  //Busca function y descarta export, default y async, y captura el nombre
  functionPatterns: [
    /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s+([A-Za-z_$][A-Za-z0-9_$]*)/
  ],
  //Busca un nombre seguido de (argumentos) y luego { o ;
  methodPatterns: [
    /^(?:(?:public|private|protected|static|readonly|abstract|override|async)\s+)*(?:get\s+|set\s+)?\*?\s*([A-Za-z_$#][A-Za-z0-9_$]*)\s*\([^()]*\)\s*(?::\s*[^{;]+)?[{;]/
  ],
  //Busca el nombre con let o var al inicio de la linea
  variablePatterns: [
    /^(?:export\s+)?(?:let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/
  ],
  //Busca el nombre con const al inicio de la linea
  constantPatterns: [
    /^(?:export\s+)?const\s+([A-Za-z_$][A-Za-z0-9_$]*)/
  ],
  methodNameBlacklist: CONTROL_FLOW_KEYWORDS
};
var PHP_NAMING_CONFIG = {
  //Estilo para los nombres
  classCase: "PascalCase",
  functionCase: "camelCase",
  methodCase: "camelCase",
  variableCase: "camelCase",
  constantCase: "camelCase",
  //Busca el nombre con posible abstract o final antes
  classPatterns: [
    /^(?:abstract\s+|final\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/
  ],
  functionPatterns: [
    /^function\s*&?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/
  ],
  methodPatterns: [
    /^(?:(?:public|private|protected|static|abstract|final)\s+)*function\s*&?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/
  ],
  variablePatterns: [
    // Asignacion simple: $nombre = valor;
    /^\$([A-Za-z_][A-Za-z0-9_]*)\s*=(?!=)/,
    // Propiedad de clase, con modificadores y/o tipo opcionales: private ?string $nombre = valor;
    // El tipo solo puede ser un primitivo conocido o un identificador con mayuscula inicial (nombre de clase),
    // para no confundir palabras como "return"/"if"/"echo" con un tipo. Debe terminar en ";", "," o "=" y no en
    // "->" para no capturar usos como $this->nombre o $obj->metodo().
    /^(?:(?:public|private|protected|static|readonly)\s+)*(?:\??(?:int|float|string|bool|array|object|callable|iterable|mixed|void|never|self|static|parent|[A-Z][A-Za-z0-9_\\]*)\s+)?\$([A-Za-z_][A-Za-z0-9_]*)\s*(?:[;,]|=(?!=))/
  ],
  //Busca el nombre ante las dos formas de declarar constantes en php con const o con define
  constantPatterns: [
    /^(?:(?:public|private|protected)\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/,
    /^define\s*\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/
  ],
  // PHP obliga estos nombres exactos para los metodos magicos; no son una eleccion de estilo del desarrollador
  methodNameExempt: /^__[A-Za-z]/
};
var CSHARP_MODIFIERS = "(?:public|private|protected|internal|static|virtual|override|async|abstract|sealed|new|extern)";
var CSHARP_NAMING_CONFIG = {
  //Estilo para los nombres
  classCase: "PascalCase",
  functionCase: "camelCase",
  methodCase: "camelCase",
  variableCase: "camelCase",
  constantCase: "camelCase",
  //Buscan el nombre con class antes
  classPatterns: [
    /^(?:(?:public|private|protected|internal|static|abstract|sealed|partial)\s+)*class\s+([A-Za-z_][A-Za-z0-9_]*)/
  ],
  //vacio porque c# no tiene funciones fuera de una clase, todo es metodo
  functionPatterns: [],
  //Exige el menos un modificador de acceso, luego un tipo de retorno, luego el nombre y (parametros)
  methodPatterns: [
    new RegExp(`^(?:${CSHARP_MODIFIERS}\\s+)+[\\w<>\\[\\],.?]+\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*\\([^()]*\\)\\s*(?:\\{|;|=>|$)`)
  ],
  //Busca el nombre con un tipo antes
  variablePatterns: [
    /^(?:var|int|string|bool|double|float|long|short|byte|char|decimal|object|dynamic|uint|ulong|ushort|sbyte)\s+([A-Za-z_][A-Za-z0-9_]*)\s*[=;]/
  ],
  //Buscan el nombre con const y modificadores opcionales antes
  constantPatterns: [
    /^(?:(?:public|private|protected|internal|static|readonly)\s+)*const\s+[\w<>\[\],.?]+\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/
  ],
  methodNameBlacklist: CONTROL_FLOW_KEYWORDS
};
var LANGUAGE_NAMING_CONFIGS = {
  javascript: JS_TS_NAMING_CONFIG,
  javascriptreact: JS_TS_NAMING_CONFIG,
  typescript: JS_TS_NAMING_CONFIG,
  typescriptreact: JS_TS_NAMING_CONFIG,
  php: PHP_NAMING_CONFIG,
  csharp: CSHARP_NAMING_CONFIG
};
var EXTENSION_TO_LANGUAGE_ID = {
  ts: "typescript",
  tsx: "typescriptreact",
  js: "javascript",
  jsx: "javascriptreact",
  php: "php",
  cs: "csharp"
};

// src/analyzers/style/namingAnalyzer.ts
function matchFirstGroup(text, patterns) {
  for (const pattern of patterns) {
    const match2 = text.match(pattern);
    if (match2) {
      return match2[1];
    }
  }
  return null;
}
function startsWithUpperCase(name) {
  return /^[A-Z]/.test(name);
}
var HOOK_NAME_PATTERN = /^use[A-Z]/;
function isHookName(name) {
  return HOOK_NAME_PATTERN.test(name);
}
function extractNamesByCategory(lines, config) {
  const classNames = [];
  const functionNames = [];
  const methodNames = [];
  const variableNames = [];
  const constantNames = [];
  const componentNames = [];
  const hookNames = [];
  let braceDepth = 0;
  const classOuterDepths = [];
  let pendingClassOuterDepth = null;
  for (const rawLine of lines) {
    const commentIndex = rawLine.indexOf("//");
    const line = commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
    const trimmed = line.trim();
    while (classOuterDepths.length > 0 && braceDepth <= classOuterDepths[classOuterDepths.length - 1]) {
      classOuterDepths.pop();
    }
    const insideClass = classOuterDepths.length > 0;
    const classMatch = matchFirstGroup(trimmed, config.classPatterns);
    if (classMatch) {
      classNames.push(classMatch);
    }
    if (insideClass) {
      const methodMatch = matchFirstGroup(trimmed, config.methodPatterns);
      if (methodMatch && !config.methodNameBlacklist?.has(methodMatch) && !config.methodNameExempt?.test(methodMatch)) {
        methodNames.push(methodMatch);
      }
    } else {
      const functionMatch = matchFirstGroup(trimmed, config.functionPatterns);
      if (functionMatch) {
        if (config.componentCase && isHookName(functionMatch)) {
          hookNames.push(functionMatch);
        } else if (config.componentCase && startsWithUpperCase(functionMatch)) {
          componentNames.push(functionMatch);
        } else {
          functionNames.push(functionMatch);
        }
      }
    }
    const variableMatch = matchFirstGroup(trimmed, config.variablePatterns);
    if (variableMatch) {
      variableNames.push(variableMatch);
    }
    const constantMatch = matchFirstGroup(trimmed, config.constantPatterns);
    if (constantMatch) {
      if (config.componentCase && isHookName(constantMatch)) {
        hookNames.push(constantMatch);
      } else if (config.componentCase && startsWithUpperCase(constantMatch)) {
        componentNames.push(constantMatch);
      } else {
        constantNames.push(constantMatch);
      }
    }
    if (classMatch) {
      pendingClassOuterDepth = braceDepth;
    }
    const opens = (line.match(/\{/g) ?? []).length;
    const closes = (line.match(/\}/g) ?? []).length;
    braceDepth += opens - closes;
    if (pendingClassOuterDepth !== null && opens > 0) {
      classOuterDepths.push(pendingClassOuterDepth);
      pendingClassOuterDepth = null;
    }
  }
  return { classNames, functionNames, methodNames, variableNames, constantNames, componentNames, hookNames };
}
function reportInvalidNames(names, caseStyle, label, fileLabel, findings) {
  names.forEach((name) => {
    if (!matchesCase(name, caseStyle)) {
      findings.push(fileLabel + " - " + label + " " + name + " no usa " + caseStyle);
    }
  });
}
function analyzeNaming(lines, languageId, fileLabel, findings) {
  const namingConfig = LANGUAGE_NAMING_CONFIGS[languageId];
  if (!namingConfig) {
    return;
  }
  const { classNames, functionNames, methodNames, variableNames, constantNames, componentNames, hookNames } = extractNamesByCategory(lines, namingConfig);
  reportInvalidNames(classNames, namingConfig.classCase, "La clase", fileLabel, findings);
  reportInvalidNames(functionNames, namingConfig.functionCase, "La funci\xF3n", fileLabel, findings);
  reportInvalidNames(methodNames, namingConfig.methodCase, "El m\xE9todo", fileLabel, findings);
  reportInvalidNames(variableNames, namingConfig.variableCase, "La variable", fileLabel, findings);
  reportInvalidNames(constantNames, namingConfig.constantCase, "La constante", fileLabel, findings);
  if (namingConfig.componentCase) {
    reportInvalidNames(componentNames, namingConfig.componentCase, "El componente", fileLabel, findings);
    reportInvalidNames(hookNames, namingConfig.functionCase, "El hook", fileLabel, findings);
  }
}

// src/analyzers/style/indentationAnalyzer.ts
var BAKEND_TAB_SIZE = 4;
var FRONTEND_TAB_SIZE = 2;
var FRONTEND_EXTENSIONS = ["ts", "tsx", "js", "jsx"];
function countWidth(indent, tabSize) {
  let ancho = 0;
  for (const char of indent) {
    ancho += char === "	" ? tabSize : 1;
  }
  return ancho;
}
function getExtension(fileLabel) {
  return fileLabel.split(".").pop()?.toLowerCase() ?? "";
}
function analyzeIndentation(lines, fileLabel, findings, changedLines) {
  const tabSize = FRONTEND_EXTENSIONS.includes(getExtension(fileLabel)) ? FRONTEND_TAB_SIZE : BAKEND_TAB_SIZE;
  let indentationPrevious = "";
  lines.forEach((line, i) => {
    if (line.trim() === "") {
      return;
    }
    const indentMatch = line.match(/^[ \t]*/)?.[0] ?? "";
    const currentWide = countWidth(indentMatch, tabSize);
    const previousWide = countWidth(indentationPrevious, tabSize);
    if (changedLines.has(i + 1)) {
      const newPart = currentWide > previousWide ? indentMatch.slice(indentationPrevious.length) : indentMatch;
      if (newPart.includes(" ")) {
        findings.push(fileLabel + ":" + (i + 1) + " - La linea debio usar tabulaciones en lugar de espacios para la identacion");
      }
    }
    indentationPrevious = indentMatch;
  });
}

// src/analyzers/env/envAnalyzer.ts
function analyzeEnvVariables(lines, fileLabel, findings) {
  const variables = [];
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      return;
    }
    const variableName = trimmed.split("=")[0].trim();
    variables.push(variableName);
  });
  variables.forEach((name) => {
    const isUpperCase = /^[A-Z][A-Z0-9_]*$/.test(name);
    if (!isUpperCase) {
      findings.push(fileLabel + " - La variable " + name + " no usa UPPER_SNAKE_CASE");
    }
  });
}

// src/analyzers/style/ifAnalyzer.ts
function stripLineComment(rawLine) {
  const commentIndex = rawLine.indexOf("//");
  return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}
function findMatchingParenClose(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === "(") {
      depth++;
    } else if (text[i] === ")") {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}
function checkBraceUsage(bodyOnSameLine, keywordLineIndex, lines, label, fileLabel, findings) {
  if (bodyOnSameLine !== "") {
    if (!bodyOnSameLine.startsWith("{")) {
      findings.push(fileLabel + ":" + (keywordLineIndex + 1) + " - El " + label + " de una sola instruccion debe usar llaves {}");
    }
    return;
  }
  for (let j = keywordLineIndex + 1; j < lines.length; j++) {
    const nextTrimmed = stripLineComment(lines[j]).trim();
    if (nextTrimmed === "") {
      continue;
    }
    if (!nextTrimmed.startsWith("{")) {
      findings.push(fileLabel + ":" + (keywordLineIndex + 1) + " - El " + label + " de una sola instruccion debe usar llaves {}");
    }
    break;
  }
}
function countTernaryOperators(trimmedLine) {
  return (trimmedLine.match(/(?<!\?)\?(?!\.|\?)/g) ?? []).length;
}
function isTernaryContinuation(trimmedLine) {
  return /^\?(?!\.|\?)/.test(trimmedLine) || trimmedLine.startsWith(":");
}
var LINQ_LAMBDA_PATTERN = /=>/;
var LINQ_QUERY_PATTERN = /^from\s+\w+\s+in\b/;
function splitIntoExpressionSegments(text) {
  if (LINQ_QUERY_PATTERN.test(text)) {
    return text.split(/\b(?:from|where|select|orderby|grouo|join|let)\b/);
  }
  if (LINQ_LAMBDA_PATTERN.test(text)) {
    return text.split("=>");
  }
  return [text];
}
function checkNestedTernaries(lines, fileLabel, findings, changedLines) {
  let i = 0;
  while (i < lines.length) {
    const trimmed = stripLineComment(lines[i]).trim();
    let totalTernaryCount = countTernaryOperators(trimmed);
    if (countTernaryOperators(trimmed)) {
      i++;
      continue;
    }
    let chainText = trimmed;
    let j = i + 1;
    while (j < lines.length) {
      const nextTrimmed = stripLineComment(lines[j]).trim();
      if (!isTernaryContinuation(nextTrimmed)) {
        break;
      }
      chainText += " " + nextTrimmed;
      j++;
    }
    const segments = splitIntoExpressionSegments(chainText);
    const hasRealNesting = segments.some((segment) => countTernaryOperators(segment) >= 2);
    if (hasRealNesting && changedLines.has(i + 1)) {
      findings.push(fileLabel + ":" + (i + 1) + ' - Se encontraron operadores ternarios anidados, evita anidar "?:"');
    }
    i = j;
  }
}
function analyzeIfStatements(lines, fileLabel, findings, changedLines) {
  lines.forEach((rawLine, i) => {
    if (!changedLines.has(i + 1)) {
      return;
    }
    const line = stripLineComment(rawLine);
    const trimmed = line.trim();
    const elseCandidate = trimmed.startsWith("}") ? trimmed.replace(/^\}\s*/, "") : trimmed;
    const ifMatch = trimmed.match(/^if\s*\(/);
    const elseIfMatch = elseCandidate.match(/^else\s+if\s*\(/);
    if (ifMatch || elseIfMatch) {
      const source = ifMatch ? trimmed : elseCandidate;
      const label = ifMatch ? "if" : "else if";
      const openIndex = (ifMatch ? ifMatch[0] : elseIfMatch[0]).length - 1;
      const closeIndex = findMatchingParenClose(source, openIndex);
      if (closeIndex !== -1) {
        const bodyOnSameLine = source.slice(closeIndex + 1).trim();
        checkBraceUsage(bodyOnSameLine, i, lines, label, fileLabel, findings);
      }
    } else if (/^else\b/.test(elseCandidate)) {
      const bodyOnSameLine = elseCandidate.slice("else".length).trim();
      checkBraceUsage(bodyOnSameLine, i, lines, "else", fileLabel, findings);
    }
  });
  checkNestedTernaries(lines, fileLabel, findings, changedLines);
}

// src/analyzers/style/parameterAnalyzer.ts
function stripLineComment2(rawLine) {
  const commentIndex = rawLine.indexOf("//");
  return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}
function findClosingParen(lines, lineIndex, openIndex) {
  let depth = 0;
  for (let i = lineIndex; i < lines.length; i++) {
    const text = stripLineComment2(lines[i]);
    const start = i === lineIndex ? openIndex : 0;
    for (let col = start; col < text.length; col++) {
      if (text[col] === "(") {
        depth++;
      } else if (text[col] === ")") {
        depth--;
        if (depth === 0) {
          return { line: i, col };
        }
      }
    }
  }
  return null;
}
function countTopLevelParams(paramsText) {
  const trimmed = paramsText.trim();
  if (trimmed === "") {
    return 0;
  }
  let depth = 0;
  let count = 1;
  for (const char of trimmed) {
    if ("([{<".includes(char)) {
      depth++;
    } else if (")]}>".includes(char)) {
      depth--;
    } else if (char === "," && depth === 0) {
      count++;
    }
  }
  return count;
}
function analyzeParameters(lines, fileLabel, findings, changedLines, config) {
  const { maxInLineParams, maxLineLength } = config;
  lines.forEach((rawLine, i) => {
    if (!changedLines.has(i + 1)) {
      return;
    }
    const line = stripLineComment2(rawLine);
    const match2 = line.match(/\b[A-Za-z_$][\w$]*\s*\(/);
    if (!match2 || match2.index === void 0) {
      return;
    }
    const openIndex = match2.index + match2[0].length - 1;
    const closing = findClosingParen(lines, i, openIndex);
    if (!closing) {
      return;
    }
    let paramsText = closing.line === i ? line.slice(openIndex + 1, closing.col) : line.slice(openIndex + 1);
    if (closing.line !== i) {
      for (let j = i + 1; j < closing.line; j++) {
        paramsText += " " + stripLineComment2(lines[j]);
      }
      paramsText += " " + stripLineComment2(lines[closing.line]).slice(0, closing.col);
    }
    const paramCount = countTopLevelParams(paramsText);
    if (paramCount <= maxInLineParams) {
      return;
    }
    if (closing.line === i) {
      findings.push(fileLabel + ":" + (i + 1) + " - El metodo tiene mas de " + maxInLineParams + " parametros, separalos en una linea por parametro con su tabulador");
    }
    if (rawLine.length > maxLineLength) {
      findings.push(fileLabel + ":" + (i + 1) + " - La linea es muy larga (" + rawLine.length + "caracteres), evita lienas demasiado largas");
    }
  });
}

// src/analyzers/structure/requestModelAnalyzer.ts
function stripLineComment3(rawLine) {
  const commentIndex = rawLine.indexOf("//");
  return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}
function isRequestClassName(className, suffixes) {
  return suffixes.some((suffix) => new RegExp(`${suffix}$`, "i").test(className));
}
function isInRequestFolder(fileLabel, folders) {
  const normalized = fileLabel.toLowerCase().replace(/\\/g, "/");
  return folders.some((folder) => normalized.includes(`/${folder}/`));
}
function extendsOrImplementsRequest(classDeclarationLine) {
  return /\b(?:extends|implements|:)\s+[\w<>,\s]*Request/i.test(classDeclarationLine);
}
function isRequestModel(className, classDeclarationLine, fileLabel, config) {
  return isRequestClassName(className, config.suffixes) || isInRequestFolder(fileLabel, config.folders) || extendsOrImplementsRequest(classDeclarationLine);
}
var CSHARP_CONFIG = {
  classPattern: /^(?:(?:public|private|protected|internal|static|abstract|sealed|partial)\s+)*class\s+([A-Za-z0-9_]*)/,
  // public int Cantidad { get; set; } (sin "= valor" antes del ";")
  missingDefaultPattern: /^(?:public|private|protected|internal)\s+(?:readonly\s+)?[\w<>[\],.?]+\s+[A-Za-z_][A-Za-z0-9_]*\s*\{\s*get;\s*(?:set;|init;)\s*\}\s*;?\s*$/
};
var TS_CONFIG = {
  classPattern: /^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
  // "nombreCliente: string;" (si "= valor" antes del ";")
  missingDefaultPattern: /^(?:public|private|protected|readonly\s+)*[A-Za-z_$][A-Za-z0-9_$]*\??\s*:\s*[^=;]+;\s*$/
};
var JS_CONFIG = {
  classPattern: /^(?:export\s+)?(?:default\s+)?class\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
  // "cantidad;" (campo de clase sin inicializador; JS no tiene tipos que validar)
  missingDefaultPattern: /^[A-Za-z_$][A-Za-z0-9_$]*\s*;\s*$/
};
var PHP_CONFIG = {
  classPattern: /^(?:abstract\s+|final\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/,
  // "public int $cantidad;" (sin "= valor" antes del ";")
  missingDefaultPattern: /^(?:public|private|protected)\s+\??(?:int|float|string|bool|array|object|mixed|[A-Z][A-Za-z0-9_]*)\s+\$[A-Za-z_][A-Za-z0-9_]*\s*;\s*$/
};
var EXTENSION_TO_CONFIG = {
  cs: CSHARP_CONFIG,
  ts: TS_CONFIG,
  js: JS_CONFIG,
  php: PHP_CONFIG
};
function analyzeRequestModels(lines, fileLabel, findings, changedLines, config) {
  const extension = fileLabel.split(".").pop() ?? "";
  const extensionConfig = EXTENSION_TO_CONFIG[extension];
  if (!extensionConfig) {
    return;
  }
  let insideRequestClass = false;
  let depth = 0;
  lines.forEach((rawLine, i) => {
    const line = stripLineComment3(rawLine).trim();
    const classMatch = line.match(extensionConfig.classPattern);
    if (classMatch) {
      insideRequestClass = isRequestModel(classMatch[1], line, fileLabel, config);
      depth = 0;
    }
    if (!insideRequestClass) {
      return;
    }
    if (line.includes("{")) {
      depth++;
    }
    if (line.includes("}")) {
      depth--;
      if (depth <= 0) {
        insideRequestClass = false;
        return;
      }
    }
    const isOptionalProperty = /\?\s*:/.test(line);
    const isReadonlyProperty = /\breadonly\b/.test(line);
    if (extensionConfig.missingDefaultPattern.test(line) && changedLines.has(i + 1)) {
      const skipOptional = isOptionalProperty && !config.checkOptionalProperties;
      const skipReadonly = isReadonlyProperty && !config.checkReadonlyProperties;
      if (!skipOptional && !skipReadonly) {
        findings.push(fileLabel + ":" + (i + 1) + ' - La propiedad debe inicializar con un valor por default (ej. 0, "", string.Empty)');
      }
    }
  });
}

// src/analyzers/structure/dtoAutoMapperAnalyzer.ts
function stripLineComment4(rawLine) {
  const commentIndex = rawLine.indexOf("//");
  return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}
var CLASS_PATTERN = /^(?:(?:public|private|protected|internal|static|abstract|sealed|partial)\s+)*class\s+([A-Za-z0-9_]*)/;
var PROPERTY_PATTERN = /^(?:public|private|protected|internal)\s+(?:readonly\s+)?[\w<>[\],.?]+\s+[A-Za-z_][A-Za-z0-9_]*\s*\{\s*get;\s*(?:set;|init;)?\s*\}/;
var NEW_INSTANCE_PATTERN = /\b(?:var|[A-Za-z_][A-Za-z0-9_<>]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*new\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/;
var MANUAL_ASSIGNMENT_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)\.\w+\s*=\s*([A-Za-z_][A-Za-z0-9_]*)\.\w+\s*;/;
function analyzeDtoAutoMapper(lines, fileLabel, findings, changedLines, config) {
  const { maxProperties, minManualAssignments } = config;
  if (!fileLabel.endsWith(".cs")) {
    return;
  }
  const bigClasses = /* @__PURE__ */ new Set();
  const variableTypes = /* @__PURE__ */ new Map();
  let currentClassName = null;
  let propertyCount = 0;
  let depth = 0;
  lines.forEach((rawLine) => {
    const line = stripLineComment4(rawLine).trim();
    const classMatch = line.match(CLASS_PATTERN);
    if (classMatch) {
      currentClassName = classMatch[1];
      propertyCount = 0;
      depth = 0;
    }
    if (currentClassName) {
      if (PROPERTY_PATTERN.test(line)) {
        propertyCount++;
      }
      if (line.includes("{")) {
        depth++;
      }
      if (line.includes("}")) {
        depth--;
        if (depth <= 0) {
          if (propertyCount >= maxProperties) {
            bigClasses.add(currentClassName);
          }
          currentClassName = null;
        }
      }
    }
  });
  let streak = 0;
  let streakTarget = "";
  let streakStartLine = 0;
  lines.forEach((rawLine, i) => {
    const line = stripLineComment4(rawLine).trim();
    const newInstanceMatch = line.match(NEW_INSTANCE_PATTERN);
    if (newInstanceMatch) {
      variableTypes.set(newInstanceMatch[1], newInstanceMatch[2]);
    }
    const assignMatch = line.match(MANUAL_ASSIGNMENT_PATTERN);
    if (assignMatch && assignMatch[1] === streakTarget) {
      streak++;
    } else if (assignMatch) {
      streak = 1;
      streakTarget = assignMatch[1];
      streakStartLine = i;
    } else {
      streak = 0;
      streakTarget = "";
    }
    const nextLine = lines[i + 1] ? stripLineComment4(lines[i + 1]).trim() : "";
    const blockEnds = !MANUAL_ASSIGNMENT_PATTERN.test(nextLine);
    if (assignMatch && blockEnds && streak >= minManualAssignments) {
      const targetClass = variableTypes.get(streakTarget);
      if (targetClass && bigClasses.has(targetClass) && rangeIntersectChangedLines(changedLines, streakStartLine + 1, i + 1)) {
        findings.push(
          fileLabel + ":" + (streakStartLine + 1) + ' - "' + targetClass + '" tiene mas de ' + maxProperties + " propiedades, usa AutoMapper (_mapper.Map<" + targetClass + ">(...)) en lugar de asignar cada propiedad manualmente"
        );
      }
    }
  });
}

// src/analyzers/structure/linqAnalyzer.ts
var FOREACH_PATTERN = /^foreach\s*\(\s*(?:var|[\w<>[\],.]+)\s+([A-Za-z_]\w*)\s+in\s+([A-Za-z_][\w.]*)\s*\)/;
var FOR_INDEXED_PATTERN = /^for\s*\(\s*int\s+([A-Za-z_]\w*)\s*=\s*0\s*;\s*\1\s*<\s*([A-Za-z_][\w.]*)\.Count\s*;\s*\1\+\+\s*\)/;
var IF_PATTERN = /^if\s*\((.+)\)/;
var ADD_CALL_PATTERN = /^([A-Za-z_]\w*)\.Add\(\s*(.+?)\s*\)\s*;/;
var INCREMENT_PATTERN = /^([A-Za-z_]\w*)\s*(?:\+\+|\+=\s*1\s*;)/;
var ACCUMULATE_PATTERN = /^([A-Za-z_]\w*)\s*\+=\s*(.+?)\s*;/;
var ASSING_PATTERN = /^([A-Za-z_]\w*)\s*=\s*(.+?)\s*;/;
var BREAK_PATTERN = /^break\s*;/;
function analyzeLinqUsage(lines, fileLabel, findings, changedLines, config) {
  if (!fileLabel.endsWith(".cs")) {
    return;
  }
  let depth = 0;
  let insideLoop = false;
  let loopStartLine = 0;
  let loopVar = "";
  let sourceCollection = "";
  let sawIf = false;
  let sawAdd = false;
  let sawIncrement = false;
  let sawSum = false;
  let sawAssignThenBreak = false;
  let lastAssignVar = null;
  lines.forEach((rawLine, i) => {
    const line = rawLine.trim();
    const foreachMatch = line.match(FOREACH_PATTERN);
    const forMatch = line.match(FOR_INDEXED_PATTERN);
    if ((foreachMatch || forMatch) && !insideLoop) {
      insideLoop = true;
      loopStartLine = i;
      loopVar = foreachMatch ? foreachMatch[1] : forMatch[1];
      sourceCollection = foreachMatch ? foreachMatch[2] : forMatch[2];
      depth = 0;
      sawIf = sawAdd = sawIncrement = sawSum = sawAssignThenBreak = false;
      lastAssignVar = null;
    }
    if (insideLoop) {
      if (IF_PATTERN.test(line)) {
        sawIf = true;
      }
      if (ADD_CALL_PATTERN.test(line)) {
        sawAdd = true;
      }
      if (INCREMENT_PATTERN.test(line)) {
        sawIncrement = true;
      } else {
        const accumulateMatch = line.match(ACCUMULATE_PATTERN);
        if (accumulateMatch) {
          sawSum = true;
        }
      }
      const assignMatch = line.match(ASSING_PATTERN);
      if (assignMatch) {
        lastAssignVar = assignMatch[1];
      }
      if (BREAK_PATTERN.test(line) && lastAssignVar) {
        sawAssignThenBreak = true;
      }
      if (line.includes("{")) {
        depth++;
      }
      if (line.includes("}")) {
        depth--;
        if (depth <= 0) {
          if (rangeIntersectChangedLines(changedLines, loopStartLine + 1, i + 1)) {
            if (config.suggestions.whereSelect && sawIf && sawAdd) {
              findings.push(
                fileLabel + ":" + (loopStartLine + 1) + ' - reemplaza el loop manual por "' + sourceCollection + ".Where(" + loopVar + " => condicion).Select(" + loopVar + ' => valor).ToList()" para mejorar la legibilidad'
              );
            } else if (config.suggestions.select && sawAdd) {
              findings.push(
                fileLabel + ":" + (loopStartLine + 1) + ' - reemplaza la transformacion manual por "' + sourceCollection + ".Select(" + loopVar + ' => valor).ToList()" en lugar de usar Add() dentro del loop'
              );
            } else if (config.suggestions.count && sawIf && sawIncrement) {
              findings.push(
                fileLabel + ":" + (loopStartLine + 1) + ' - reemplaza el conteo manual por "' + sourceCollection + ".Count(" + loopVar + ' => condicion)"'
              );
            } else if (config.suggestions.sum && sawSum) {
              findings.push(
                fileLabel + ":" + (loopStartLine + 1) + ' - reemplaza la acumulacion manual por "' + sourceCollection + ".Sum(" + loopVar + ' => valor)" en lugar de sumar dentro de un loop'
              );
            } else if (config.suggestions.firstOrDefault && sawIf && sawAssignThenBreak) {
              findings.push(
                fileLabel + ":" + (loopStartLine + 1) + ' - reemplaza la busqueda manual por "' + sourceCollection + ".FirstOrDefault(" + loopVar + ' => condicion)"'
              );
            }
          }
          insideLoop = false;
        }
      }
    }
  });
}

// src/analyzers/structure/asyncAnalyzer.ts
var METHOD_PATTERN = /^(?:public|private|protected|internal|static)(?:\s+(?:public|private|protected|internal|static|virtual|override|sealed))*\s+(async\s+)?([\w<>[\],.?\s]+?)\s+([A-Za-z_]\w*)\s*\(/;
var EVENT_HANDLER_PATTERN = /\(\s*object\s+\w+\s*,\s*\w*EventArgs\s+\w+\s*\)/;
var AWAIT_PATTERN = /\bawait\b/;
var BLOCKING_PATTERN = /\.Result\b|\.Wait\(\s*\)|\.GetAwaiter\(\)\.GetResult\(\)/;
var THREAD_SLEEP_PATTERN = /\bThread\.Sleep\s*\(/;
var ASYNC_CALL_PATTERN = /\b([A-Za-z_]\w*Async)\s*\(/;
var ASYNC_CALL_HANDLED_PATTERN = /\bawait\b|\breturn\b|=\s*[^=]|Task\.(?:WhenAll|WhenAny)/;
var SYNC_IO_CALLS = [
  [/\.SaveChanges\s*\(/, "SaveChanges", "SaveChangesAsync"],
  [/\bFile\.ReadAllText\s*\(/, "File.ReadAllText", "File.ReadAllTextAsync"],
  [/\bFile\.WriteAllText\s*\(/, "File.WriteAllText", "File.WriteAllTextAsync"],
  [/\bFile\.AppendAllText\s*\(/, "File.AppendAllText", "File.AppendAllTextAsync"],
  [/\bFile\.ReadAllBytes\s*\(/, "File.ReadAllBytes", "File.ReadAllBytesAsync"],
  [/\.ReadToEnd\s*\(/, "ReadToEnd", "ReadToEndAsync"],
  [/\.ExecuteReader\s*\(/, "ExecuteReader", "ExecuteReaderAsync"],
  [/\.ExecuteNonQuery\s*\(/, "ExecuteNonQuery", "ExecuteNonQueryAsync"],
  [/\.Send\s*\(\s*\w*[Rr]equest/, "HttpClient.Send", "SendAsync"]
];
var EF_CONTEXT_PATTERN = /\b_?(?:context|db|dbContext)\b\./i;
var EF_SYNC_QUERY_PATTERN = /\.(ToList|FirstOrDefault|SingleOrDefault|Any|Count|Find)\s*\(/;
function analyzeCSharpAsync(lines, fileLabel, findings, changedLines) {
  let insideMethod = false;
  let methodStartLine = 0;
  let methodName = "";
  let isAsync = false;
  let sawAwait = false;
  let depth = 0;
  let bodyStarted = false;
  lines.forEach((rawLine, i) => {
    const line = rawLine.trim();
    const where = fileLabel + ":" + (i + 1);
    const methodMatch = line.match(METHOD_PATTERN);
    if (methodMatch && !insideMethod) {
      insideMethod = true;
      methodStartLine = i;
      isAsync = !!methodMatch[1];
      methodName = methodMatch[3];
      sawAwait = false;
      depth = 0;
      bodyStarted = false;
      const returnType = methodMatch[2].trim();
      if (isAsync && returnType === "void" && !EVENT_HANDLER_PATTERN.test(line) && changedLines.has(i + 1)) {
        findings.push(where + ' - el metodo"' + methodName + '"es async void; cambialo a "async Task" para poder esperarlo y capturar sus excepciones');
      }
    }
    if (!insideMethod) {
      return;
    }
    if (AWAIT_PATTERN.test(line)) {
      sawAwait = true;
    }
    if (BLOCKING_PATTERN.test(line) && changedLines.has(i + 1)) {
      findings.push(where + ' - evita bloquear con .Result/.Wait()/GetResult(); usa "await" para no provocar deadlocks');
    }
    if (isAsync && THREAD_SLEEP_PATTERN.test(line) && changedLines.has(i + 1)) {
      findings.push(where + ' - usa "await Task.Delay(...)" en lugar de Thread.Sleep dentro de un metodo async');
    }
    const asyncCall = line.match(ASYNC_CALL_PATTERN);
    if (asyncCall && asyncCall[1] !== methodName && !ASYNC_CALL_HANDLED_PATTERN.test(line) && changedLines.has(i + 1)) {
      findings.push(where + ' - la llamada a "' + asyncCall[1] + '" no se espera; agrega "await" para no dejar la tarea sin controlar');
    }
    if (changedLines.has(i + 1)) {
      for (const [pattern, syncName, asyncName] of SYNC_IO_CALLS) {
        if (pattern.test(line) && !line.includes(asyncName)) {
          findings.push(where + ' - "' + asyncName + '"es una operacion de E/S sincrona; usa "await ' + asyncName + '(...)" y marca el metodo como async');
        }
      }
    }
    const efMatch = line.match(EF_SYNC_QUERY_PATTERN);
    if (efMatch && EF_CONTEXT_PATTERN.test(line) && changedLines.has(i + 1)) {
      findings.push(where + ' - la consulta a base de datos usa "' + efMatch[1] + '()"; usa "await ' + efMatch[1] + 'Async()" de EF Core');
    }
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;
    if (opens > 0) {
      bodyStarted = true;
    }
    depth += opens - closes;
    const isExpressionBodied = !bodyStarted && line.includes("=>") && line.endsWith(";");
    if (bodyStarted && depth <= 0 || isExpressionBodied) {
      if (isAsync && !sawAwait && rangeIntersectChangedLines(changedLines, methodStartLine + 1, i + 1)) {
        findings.push(fileLabel + ":" + (methodStartLine + 1) + ' - el metodo "' + methodName + '" es async pero no contiene ningun await; quita "async" o espera la operacion de E/S');
      }
      insideMethod = false;
    }
  });
}
var JS_RESERVED_KEYWORDS = /^(if|for|while|switch|catch|function|return|new|typeof)$/;
var JS_FUNCTION_DECL_PATTERN = /^(async\s+)?function\s*([A-Za-z_$][\w$]*)?\s*\(/;
var JS_ARROW_FUNCTION_PATTERN = /^(?:export\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(async\s+)?\([^)]*\)\s*=>/;
var JS_CLASS_METHOD_PATTERN = /^(async\s+)?(?:static\s+)?(?:get\s+|set\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/;
var JS_SYNC_IO_CALLS = [
  [/\bfs\.readFileSync\s*\(/, "fs.readFileSync", "fs.promises.readFile"],
  [/\bfs\.writeFileSync\s*\(/, "fs.writeFileSync", "fs.promises.writeFile"],
  [/\bexecSync\s*\(/, "execSync", "exec (promisify)"]
];
var JS_ASYNC_CALL_PATTERN = /\b([A-Za-z_$][\w$]*Async)\s*\(/;
var JS_ASYNC_CALL_HANDLED_PATTERN = /\bawait\b|\breturn\b|\.then\s*\(|=\s*[^=]/;
var JS_BLOCKING_PATTERN = /\bdeasync\s*\(|\.open\s*\(\s*['"][A-Z]+['"]\s*,\s*[^,]+,\s*false\s*\)/;
function analyzeJsTsAsync(lines, fileLabel, findings, changedLines) {
  let insideFunction = false;
  let functionStartLine = 0;
  let functionName = "";
  let isAsync = false;
  let sawAwait = false;
  let depth = 0;
  let bodyStarted = false;
  lines.forEach((rawLine, i) => {
    const line = rawLine.trim();
    const where = fileLabel + ":" + (i + 1);
    if (!insideFunction) {
      let match2 = line.match(JS_FUNCTION_DECL_PATTERN);
      let candidateAsync = false;
      let candidateName = "";
      if (match2) {
        candidateAsync = !!match2[1];
        candidateName = match2[2] || "(anonima)";
      } else {
        match2 = line.match(JS_ARROW_FUNCTION_PATTERN);
        if (match2) {
          candidateName = match2[1];
          candidateAsync = !!match2[2];
        } else {
          match2 = line.match(JS_ARROW_FUNCTION_PATTERN);
          if (match2) {
            candidateName = match2[1];
            candidateAsync = !!match2[2];
          } else {
            const classMatch = line.match(JS_CLASS_METHOD_PATTERN);
            if (classMatch && !JS_RESERVED_KEYWORDS.test(classMatch[2])) {
              match2 = classMatch;
              candidateAsync = !!classMatch[1];
              candidateName = classMatch[2];
            } else {
              match2 = null;
            }
          }
        }
        if (match2) {
          insideFunction = true;
          functionStartLine = i;
          functionName = candidateName;
          isAsync = candidateAsync;
          sawAwait = false;
          depth = 0;
          bodyStarted = false;
        }
      }
    }
    if (!insideFunction) {
      return;
    }
    if (AWAIT_PATTERN.test(line)) {
      sawAwait = true;
    }
    if (JS_BLOCKING_PATTERN.test(line) && changedLines.has(i + 1)) {
      findings.push(where + ' - evitar bloquear la ejecucion (deasync, XHR sincrono); usa "await" con una API asincrona');
    }
    const asyncCall = line.match(JS_ASYNC_CALL_PATTERN);
    if (asyncCall && asyncCall[1] !== functionName && !JS_ASYNC_CALL_HANDLED_PATTERN.test(line) && changedLines.has(i + 1)) {
      findings.push(where + ' - la llamada a "' + asyncCall[1] + '" no se espera; agrega "await" para no dejar la promesa sin controlar');
    }
    if (changedLines.has(i + 1)) {
      for (const [pattern, syncName, asyncName] of JS_SYNC_IO_CALLS) {
        if (pattern.test(line)) {
          findings.push(where + ' -"' + syncName + '" es una operacion de E/S sincrona; usa "await ' + asyncName + '(...)" en su lugar');
        }
      }
    }
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;
    if (opens > 0) {
      bodyStarted = true;
    }
    depth += opens - closes;
    const isExpressionBodied = !bodyStarted && line.includes("=>") && line.endsWith(";");
    if (bodyStarted && depth <= 0 || isExpressionBodied) {
      if (isAsync && !sawAwait && rangeIntersectChangedLines(changedLines, functionStartLine + 1, i + 1)) {
        findings.push(fileLabel + ":" + (functionStartLine + 1) + ' - la funcion "' + functionName + '" es async pero no contiene ningun await; quita "async" o espera la operacion de E/S');
      }
      insideFunction = false;
    }
  });
}
function analyzeAsyncUsage(lines, fileLabel, findings, changedLines) {
  if (fileLabel.endsWith(".cs")) {
    analyzeCSharpAsync(lines, fileLabel, findings, changedLines);
  } else if (fileLabel.endsWith(".ts") || fileLabel.endsWith(".js")) {
    analyzeJsTsAsync(lines, fileLabel, findings, changedLines);
  }
}

// src/analyzers/style/varAnalyze.ts
var VAR_DECL_PATTERN = /^var\s+([A-Za-z_]\w*)\s*=\s*(.+?)\s*;\s*$/;
var EXPLICIT_DECL_PATTERN = /^([A-Za-z_][\w<>[\],.?]*)\s+([A-Za-z_]\w*)\s*=\s*(.+?)\s*;\s*$/;
var NEW_OBJECT_PATTERN = /^new\s+([A-Za-z_][\w<>[\],.]*)\s*[\(\{]/;
var EXPLICIT_CAST_PATTERN = /^\(\s*[A-Za-z_][\w<>[\],.]*\s*\)\s*\S/;
var LITERAL_PATTERN = /^(-?\d+(\.\d+)?[mMfFdDlLuU]?|true|false|null|'.'|".*")$/;
var ASYNC_CALL_PATTERN2 = /\b[A-Za-z_]\w*Async\s*\(/;
var METHOD_PATTERN2 = /^(?:public|private|protected|internal|static)(?:\s+(?:public|private|protected|internal|static|virtual|override|sealed))*\s+(async\s+)?([\w<>[\],.?\s]+?)\s+([A-Za-z_]\w*)\s*\(/;
var RETURN_NEW_PATTERN = /^return\s+new\s+([A-Za-z_]\w*)\s*[\(\{]/;
function analyzeVarUsage(lines, fileLabel, findings, changedLines) {
  if (!fileLabel.endsWith("cs")) {
    return;
  }
  let insideMethod = false;
  let isAsyncMethod = false;
  let methodStartLine = 0;
  let depth = 0;
  let bodyStarted = false;
  const returnedTypes = /* @__PURE__ */ new Set();
  lines.forEach((rawLine, i) => {
    const line = rawLine.trim();
    const codeLine = line.replace(/\/\/.*$/, "").trim();
    const where = fileLabel + ":" + (i + 1);
    const methodMatch = line.match(METHOD_PATTERN2);
    if (methodMatch && !insideMethod) {
      insideMethod = true;
      isAsyncMethod = !!methodMatch[1];
      methodStartLine = i;
      depth = 0;
      bodyStarted = false;
      returnedTypes.clear();
    }
    if (insideMethod) {
      const returnMatch = line.match(RETURN_NEW_PATTERN);
      if (returnMatch) {
        returnedTypes.add(returnMatch[1]);
      }
      const opens = (line.match(/{/g) || []).length;
      const closes = (line.match(/}/g) || []).length;
      if (opens > 0) {
        bodyStarted = true;
      }
      depth += opens - closes;
      if (bodyStarted && depth <= 0) {
        if (isAsyncMethod && returnedTypes.size > 1 && rangeIntersectChangedLines(changedLines, methodStartLine + 1, i + 1)) {
          findings.push(
            fileLabel + ":" + (methodStartLine + 1) + " - este metodo async retorna distintos tipos concretos (" + Array.from(returnedTypes).join(", ") + '); evita "var" al capturar su resultado y usa el tipo de retorno explicito'
          );
        }
        insideMethod = false;
      }
    }
    const varMatch = codeLine.match(VAR_DECL_PATTERN);
    if (varMatch) {
      const [, varName, rhs] = varMatch;
      if (LITERAL_PATTERN.test(rhs)) {
        findings.push(
          where + ' - "var ' + varName + '" se asigna un literal simple; declara el tipo primitivo explicito en vez de "var"'
        );
      } else if (!NEW_OBJECT_PATTERN.test(rhs) && !EXPLICIT_CAST_PATTERN.test(rhs) && !ASYNC_CALL_PATTERN2.test(rhs)) {
        findings.push(
          where + ' - "var ' + varName + '" no deja ver el tipo con solo leer la linea; usa el tipo explicito en vez de "var"'
        );
      }
      return;
    }
    const explicitMatch = codeLine.match(EXPLICIT_DECL_PATTERN);
    if (explicitMatch && changedLines.has(i + 1)) {
      const [, declaredType, varName, rhs] = explicitMatch;
      if (declaredType === "var") {
        return;
      }
      const newObjectMatch = rhs.match(NEW_OBJECT_PATTERN);
      if (newObjectMatch && newObjectMatch[1] === declaredType) {
        findings.push(
          where + ' - "' + declaredType + " " + varName + '" repite el tipo que ya es evidente por "new ' + declaredType + '(...)"; usa "var" en vez del tipo explicito'
        );
      } else if (ASYNC_CALL_PATTERN2.test(rhs)) {
        findings.push(
          where + ' - "' + declaredType + " " + varName + '" declara el tipo de retorno de una llamada asincrona; usa "var" en vez de repetirlo'
        );
      }
    }
  });
}

// src/analyzers/structure/objectAnalyzer.ts
function stripLineComment5(rawLine) {
  const commentIndex = rawLine.indexOf("//");
  return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}
function buildObjectPatterns(watchedTypes) {
  const typesGroup = watchedTypes.join("|");
  return {
    decl: new RegExp(`^(?:(?:public|private|protected|internal|static|readonly|const)\\s+)*(?:${typesGroup})\\s+([A-Za-z_]\\w*)\\s*[=;]`),
    param: new RegExp(`\\b(?:${typesGroup})\\s+([A-Za-z_]\\w*)\\s*[,)]`),
    returnType: new RegExp(`^(?:(?:public|private|protected|internal|static|virtual|override|async)\\s+)+(?:${typesGroup})\\s+([A-Za-z_]\\w*)\\s*\\(`)
  };
}
function analyzeCSharpObjectUsage(lines, fileLabel, findings, changedLines, config) {
  const patterns = buildObjectPatterns(config.watchedTypes);
  const exemptPatterns = config.exemptPatterns.map((p) => new RegExp(p));
  const newObjectPattern = /\bnew\s+object\s*\(\s*\)/;
  lines.forEach((rawLine, i) => {
    if (!changedLines.has(i + 1)) {
      return;
    }
    const line = stripLineComment5(rawLine).trim();
    const where = fileLabel + ":" + (i + 1);
    if (exemptPatterns.some((p) => p.test(line))) {
      return;
    }
    const declMatch = line.match(patterns.decl);
    if (declMatch) {
      findings.push(where + ' -"' + declMatch[1] + '" se declara como "object"; usa el tipo concreto que se va a guardar');
    }
    if (newObjectPattern.test(line)) {
      findings.push(where + ' - "new object()" no aporta nada; instancia el tipo real que necesitas');
    }
    const returnMatch = line.match(patterns.returnType);
    if (returnMatch) {
      findings.push(where + ' - el metodo "' + returnMatch[1] + '" retorna "object"; declara el tipo real que retorna');
    } else {
      const paramMatch = line.match(patterns.param);
      if (paramMatch && !/object\s*\[\]/.test(line)) {
        findings.push(where + ' - el parametro "' + paramMatch[1] + '" es de tipo "object"; usa el tipo concreto que se espera recibir');
      }
    }
  });
}
var TS_NEW_OBJECT_PATTERN = /\bnew\s+Object\s*\(\s*\)/;
function buildTsObjectPattern(whatchedtypes) {
  const typesGroup = whatchedtypes.join("|");
  return new RegExp(`:\\s*(${typesGroup})\\b(?!\\s*[.\\w])`);
}
function analyzeTsObjectUsage(lines, fileLabel, findings, changedLines, config) {
  const typePattern = buildTsObjectPattern(config.watchedTypes);
  const exemptPatterns = config.exemptPatterns.map((p) => new RegExp(p));
  lines.forEach((rawLine, i) => {
    if (!changedLines.has(i + 1)) {
      return;
    }
    const line = stripLineComment5(rawLine).trim();
    const where = fileLabel + ":" + (i + 1);
    if (exemptPatterns.some((p) => p.test(line))) {
      return;
    }
    const typeMatch = line.match(typePattern);
    if (typeMatch) {
      findings.push(where + ' - se usa"' + typeMatch[1] + '" como tipo; declara una interfaz/type con las propiedades reales');
    }
    if (TS_NEW_OBJECT_PATTERN.test(line)) {
      findings.push(where + ' - "new Object()" no aporta nada; usa un literal "{}" o una clase concreta');
    }
  });
}
var JS_NEW_OBJECT_PATTERN = /\bnew\s+Object\s*\(\s*\)/;
function buildJsDocObjectPattern(watchedTypes) {
  const typesGroup = watchedTypes.join("|");
  return new RegExp(`@(?:param|returns?|type)\\s*\\{\\s*(?:${typesGroup})\\s*\\}`);
}
function analyzeJsObjectUsage(lines, fileLabel, findings, changedLines, config) {
  const jsdocPattern = buildJsDocObjectPattern(config.watchedTypes);
  const exemptPatterns = config.exemptPatterns.map((p) => new RegExp(p));
  lines.forEach((rawLine, i) => {
    if (!changedLines.has(i + 1)) {
      return;
    }
    const strippedLine = stripLineComment5(rawLine).trim();
    const line = rawLine.trim();
    const where = fileLabel + ":" + (i + 1);
    if (exemptPatterns.some((p) => p.test(strippedLine))) {
      return;
    }
    if (JS_NEW_OBJECT_PATTERN.test(strippedLine)) {
      findings.push(where + ' - "new Object()" no aporta nada; usa un literal "{}" o una clase concreta');
    }
    if (jsdocPattern.test(line)) {
      findings.push(where + ' - el JSDoc documenta el tipo como "Object"; describe la forma real del dato con un @typedef');
    }
  });
}
function analyzeObjectUsage(lines, fileLabel, findings, changedLines, config) {
  if (fileLabel.endsWith(".cs")) {
    analyzeCSharpObjectUsage(lines, fileLabel, findings, changedLines, config.csharp);
  } else if (fileLabel.endsWith(".ts")) {
    analyzeTsObjectUsage(lines, fileLabel, findings, changedLines, config.typescript);
  } else if (fileLabel.endsWith(".js")) {
    analyzeJsObjectUsage(lines, fileLabel, findings, changedLines, config.javascript);
  }
}

// src/analyzers/style/stringInterpolationAnalyzer.ts
function stripLineComment6(rawLine) {
  const commentIndex = rawLine.indexOf("//");
  return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}
var STRING_LITERAL = `["'][^"']*["']`;
var CS_CONCAT_PATTERN = new RegExp(
  `(?<!\\$)(?:${STRING_LITERAL})\\s*\\+\\s*[A-Za-z_]\\w*|[A-Za-z_]\\w*\\s*\\+\\s*(?<!\\$)(?:${STRING_LITERAL})`
);
var CS_SELF_CONCAT_PATTERN = /^([A-Za-z_]\w*)\s*(\+=|=\s*\1\s*\+)/;
function analyzeCSharpConcat(lines, fileLabel, findings, changedLines) {
  lines.forEach((rawLine, i) => {
    if (!changedLines.has(i + 1)) {
      return;
    }
    const line = stripLineComment6(rawLine).trim();
    const where = fileLabel + ":" + (i + 1);
    if (CS_SELF_CONCAT_PATTERN.test(line)) {
      return;
    }
    if (CS_CONCAT_PATTERN.test(line)) {
      findings.push(where + ' - se concatena con "+"; usa un string interpolado ($"...") en vez de concatenar');
    }
  });
}
var JS_CONCAT_PATTERN = new RegExp(
  `(?:${STRING_LITERAL})\\s*\\+\\s*[A-Za-z_$][\\w$]*|[A-Za-z_$][\\w$]*\\s*\\+\\s*(?:${STRING_LITERAL})`
);
var JS_SELF_CONCAT_PATTERN = /^([A-Za-z_$][\w$]*)\s*(\+=|=\s*\1\s*\+)/;
function analyzeJsTsConcat(lines, fileLabel, findings, changedLines) {
  lines.forEach((rawLine, i) => {
    if (!changedLines.has(i + 1)) {
      return;
    }
    const line = stripLineComment6(rawLine).trim();
    const where = fileLabel + ":" + (i + 1);
    if (JS_SELF_CONCAT_PATTERN.test(line)) {
      return;
    }
    if (JS_CONCAT_PATTERN.test(line)) {
      findings.push(where + ' - se concatena con "+"; usa un template literal (`....${variable}...`) en vez de concatenar');
    }
  });
}
var PHP_CONCAT_PATTERN = new RegExp(
  `(?:${STRING_LITERAL})\\s*\\.\\s*\\$[A-Za-z_]\\w*|\\$[A-Za-z_]\\w*\\s*\\.\\s*(?:${STRING_LITERAL})`
);
var PHP_SELF_CONCAT_PATTERN = /^(\$[A-Za-z_]\w*)\s*(\.=|=\s*\1\s*\.)/;
function analyzePhpConcat(lines, fileLabel, findings, changedLines) {
  lines.forEach((rawLine, i) => {
    if (!changedLines.has(i + 1)) {
      return;
    }
    const line = stripLineComment6(rawLine).trim();
    const where = fileLabel + ":" + (i + 1);
    if (PHP_SELF_CONCAT_PATTERN.test(line)) {
      return;
    }
    if (PHP_CONCAT_PATTERN.test(line)) {
      findings.push(where + ' - se concatena con "."; usa interpolacion nativa ("...$variable...") en vez de concatenar');
    }
  });
}
function analyzeStringInterpolation(lines, fileLabel, findings, changedLines) {
  if (fileLabel.endsWith(".cs")) {
    analyzeCSharpConcat(lines, fileLabel, findings, changedLines);
  } else if (fileLabel.endsWith(".ts") || fileLabel.endsWith(".js")) {
    analyzeJsTsConcat(lines, fileLabel, findings, changedLines);
  } else if (fileLabel.endsWith(".php")) {
    analyzePhpConcat(lines, fileLabel, findings, changedLines);
  }
}

// src/analyzers/structure/exceptionHandlingAnalyzer.ts
function stripLineComment7(rawLine) {
  const commentIndex = rawLine.indexOf("//");
  return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}
function checkRiskyPatterns(line, where, findings, tables) {
  for (const table of tables) {
    for (const [pattern, label] of table) {
      if (pattern.test(line)) {
        findings.push(where + ' - "' + label + '" se usa fuera de un try-catch; envuelve esta operacion para controlar sus excepciones');
      }
    }
  }
}
var CS_TRY_PATTERN = /\btry\b/;
var CS_CATCH_PATTERN = /\bcatch\b/;
var CS_LOG_PATTERN = /\b(_?logger|Log|Trace)\.(Log|Error|Warn|Fatal|WriteLine)\s*\(/i;
var CS_DB_PATTERNS = [
  [/\bSqlCommand\b/, "SqlCommand"],
  [/\.ExecuteReader\s*\(/, "ExecuteReader"],
  [/\.ExecuteNonQuery\s*\(/, "ExecuteNonQuey"],
  [/\.ExecuteScalar\s*\(/, "ExecuteScalar"],
  [/\.SaveChanges\s*\(/, "SaveChanges"]
];
var CS_TX_PATTERNS = [
  [/\bBeginTransaction\s*\(/, "BeginTransaction"],
  [/\bTransactionScope\b/, "TrnsactionScope"],
  [/\.Commit\s*\(\s*\)/, "Commit"],
  [/\.Rollback\s*\(\s*\)/, "Rollback"]
];
var CS_THREAD_PATTERNS = [
  [/\bnew\s+Thread\s*\(/, "new Thread"],
  [/\bTask\.Run\s*\(/, "Task.Run"],
  [/\bParallel\.(For|ForEach)\s*\(/, "Parallel.For/ForEach"],
  [/\bThreadPool\.QueueUserWorkItem\s*\(/, "ThreadPool.QueueUserWorkItem"]
];
function analyzeCSharpExceptionHandling(lines, fileLabel, findings, changedLines) {
  let depth = 0;
  const tryDepths = [];
  let insideCatch = false;
  let catchDepth = 0;
  let catchStartLine = 0;
  let catchHasBody = false;
  let catchLogged = false;
  lines.forEach((rawLine, i) => {
    const line = stripLineComment7(rawLine).trim();
    const where = fileLabel + ":" + (i + 1);
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;
    if (insideCatch) {
      if (line.length > 0 && line !== "{" && line !== "}") {
        catchHasBody = true;
      }
      if (CS_LOG_PATTERN.test(line)) {
        catchLogged = true;
      }
    }
    if (CS_CATCH_PATTERN.test(line)) {
      insideCatch = true;
      catchDepth = depth + opens;
      catchStartLine = i;
      catchHasBody = false;
      catchLogged = false;
    }
    if (CS_TRY_PATTERN.test(line)) {
      tryDepths.push(depth + opens);
    }
    const insideTry = tryDepths.length > 0;
    if (!insideTry && changedLines.has(i + 1)) {
      checkRiskyPatterns(line, where, findings, [CS_DB_PATTERNS, CS_TX_PATTERNS, CS_THREAD_PATTERNS]);
    }
    depth += opens - closes;
    if (tryDepths.length > 0 && depth < tryDepths[tryDepths.length - 1]) {
      tryDepths.pop();
    }
    if (insideCatch && depth < catchDepth) {
      if (rangeIntersectChangedLines(changedLines, catchStartLine + 1, i + 1)) {
        if (!catchHasBody) {
          findings.push(fileLabel + ":" + (catchStartLine + 1) + " - el catch esta vacio; maneja o registra la excepcion");
        } else if (!catchLogged) {
          findings.push(fileLabel + ":" + (catchStartLine + 1) + " - el catch no registra el error en bitacora; agrega un logger.Error/_logger.LogError");
        }
      }
      insideCatch = false;
    }
  });
}
var JS_TRY_PATTERN = /\btry\b/;
var JS_CATCH_PATTERN = /\bcatch\b/;
var JS_LOG_PATTERN = /\b(console\.(error|warn)|logger\.(error|warn)|log\.(error|warn))\s*\(/i;
var JS_DB_PATTERNS = [
  [/\.query\s*\(/, ".query"],
  [/\.execute\s*\(/, ".execute"],
  [/\bpool\.query\s*\(/, "pool.query"],
  [/\.findOne\s*\(/, ".findOne"],
  [/\.save\s*\(/, ".save"]
];
var JS_TX_PATTERNS = [
  [/\bsequelize\.transaction\s*\(/, "sequelize.transaction"],
  [/\.startTransaction\s*\(/, "startTransaction"],
  [/\.commitTransaction\s*\(/, "commitTransaction"],
  [/\.abortTransaction\s*\(/, "abortTransaction"]
];
var JS_THREAD_PATTERNS = [
  [/\bnew\s+Worker\s*\(/, "new Worker"],
  [/\bcluster\.fork\s*\(/, "cluster.fork"],
  [/\bchild_process\.fork\s*\(/, "child_process.fork"]
];
function analyzeJsTsExceptionHandling(lines, fileLabel, findings, changedLines) {
  let depth = 0;
  const tryDepths = [];
  let insideCatch = false;
  let catchDepth = 0;
  let catchStartLine = 0;
  let catchHasBody = false;
  let catchLogged = false;
  lines.forEach((rawLine, i) => {
    const line = stripLineComment7(rawLine).trim();
    const where = fileLabel + ":" + (i + 1);
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;
    if (insideCatch) {
      if (line.length > 0 && line !== "{" && line !== "}") {
        catchHasBody = true;
      }
      ;
      if (JS_LOG_PATTERN.test(line)) {
        catchLogged = true;
      }
    }
    if (JS_CATCH_PATTERN.test(line)) {
      insideCatch = true;
      catchDepth = depth + opens;
      catchStartLine = i;
      catchHasBody = false;
      catchLogged = false;
    }
    if (JS_TRY_PATTERN.test(line)) {
      tryDepths.push(depth + opens);
    }
    const insideTry = tryDepths.length > 0;
    if (!insideTry && changedLines.has(i + 1)) {
      checkRiskyPatterns(line, where, findings, [JS_DB_PATTERNS, JS_TX_PATTERNS, JS_THREAD_PATTERNS]);
    }
    depth += opens - closes;
    if (tryDepths.length > 0 && depth < tryDepths[tryDepths.length - 1]) {
      tryDepths.pop();
    }
    if (insideCatch && depth < catchDepth) {
      if (rangeIntersectChangedLines(changedLines, catchStartLine + 1, i + 1)) {
        if (!catchHasBody) {
          findings.push(fileLabel + ":" + (catchStartLine + 1) + " - el catch esta vacio; maneja o registra el error");
        } else if (!catchLogged) {
          findings.push(fileLabel + ":" + (catchStartLine + 1) + " - el catch no registra el error en bitacora; agrega un console.error/logger.error");
        }
        insideCatch = false;
      }
    }
  });
}
var PHP_TRY_PATTERN = /\btry\b/;
var PHP_CATCH_PATTERN = /\bcatch\b/;
var PHP_LOG_PATTERN = /\b(error_log\s*\(|Log::(error|warning)\s*\()/i;
var PHP_DB_PATTERNS = [
  [/->query\s*\(/, "->query"],
  [/->exec\s*\(/, "->exec"],
  [/\bmysqli_query\s*\(/, "mysqli_query"],
  [/->prepare\s*\(/, "->prepare"]
];
var PHP_TX_PATTERNS = [
  [/->beginTransaction\s*\(/, "->beginTransaction"],
  [/->commit\s*\(\s*\)/, "->commit"],
  [/->rollBack\s*\(\s*\)/, "->rollBack"]
];
function analyzePhpExceptionHandling(lines, fileLabel, findings, changedLines) {
  let depth = 0;
  const tryDepths = [];
  let insideCatch = false;
  let catchDepth = 0;
  let catchStartLine = 0;
  let catchHasBody = false;
  let catchLogged = false;
  lines.forEach((rawLine, i) => {
    const line = stripLineComment7(rawLine).trim();
    const where = fileLabel + ":" + (i + 1);
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;
    if (insideCatch) {
      if (line.length > 0 && line !== "{" && line !== "}") {
        catchHasBody = true;
      }
      if (PHP_LOG_PATTERN.test(line)) {
        catchLogged = true;
      }
    }
    if (PHP_CATCH_PATTERN.test(line)) {
      insideCatch = true;
      catchDepth = depth + opens;
      catchStartLine = i;
      catchHasBody = false;
      catchLogged = false;
    }
    if (PHP_TRY_PATTERN.test(line)) {
      tryDepths.push(depth + opens);
    }
    const insideTry = tryDepths.length > 0;
    if (!insideTry && changedLines.has(i + 1)) {
      checkRiskyPatterns(line, where, findings, [PHP_DB_PATTERNS, PHP_TX_PATTERNS]);
    }
    depth += opens - closes;
    if (tryDepths.length > 0 && depth < tryDepths[tryDepths.length - 1]) {
      tryDepths.pop();
    }
    if (insideCatch && depth < catchDepth) {
      if (rangeIntersectChangedLines(changedLines, catchStartLine + 1, i + 1)) {
        if (!catchHasBody) {
          findings.push(fileLabel + ":" + (catchStartLine + 1) + " - el catch esta vacio; maneja o registra el error");
        } else if (!catchLogged) {
          findings.push(fileLabel + ":" + (catchStartLine + 1) + " - el catch no registra el error en bitacora; agrega un error_log/log::error");
        }
      }
      insideCatch = false;
    }
  });
}
function analyzeExceptionHandling(lines, fileLabel, findings, changedLine) {
  if (fileLabel.endsWith(".cs")) {
    analyzeCSharpExceptionHandling(lines, fileLabel, findings, changedLine);
  } else if (fileLabel.endsWith(".ts") || fileLabel.endsWith(".js")) {
    analyzeJsTsExceptionHandling(lines, fileLabel, findings, changedLine);
  } else if (fileLabel.endsWith(".php")) {
    analyzePhpExceptionHandling(lines, fileLabel, findings, changedLine);
  }
}

// src/analyzers/structure/interfaceContractAnalyzer.ts
var vscode2 = __toESM(require("vscode"));
var path2 = __toESM(require("path"));
function stripLineComment8(rawLine) {
  const commentIndex = rawLine.indexOf("//");
  return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}
function splitTypeList(raw) {
  if (!raw) {
    return [];
  }
  return raw.split(",").map((token) => token.trim().split("<")[0].trim()).filter((token) => token.length > 0);
}
var INTERFACE_PATTERN = /^(?:public|internal)?\s*interface\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*([\w,\s<>]+))?/;
var ABSTRACT_CLASS_PATTERN = /^(?:public|internal)?\s*abstract\s+(?:partial\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*([\w,\s<>]+))?/;
var ABSTRACT_METHOD_PATTERN = /^(?:abstract\s+)?[\w<>[\],.?]+\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^()]*\)\s*;/;
var CLASS_PATTERN2 = /^(?:(?:public|private|protected|internal|static|sealed|partial)\s+)*class\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*([\w,\s<>]+))?/;
var CLASS_IS_ABSTRACT_PATTERN = /^\s*(?:public|internal)?\s*abstract\s+class\b/;
var CSHARP_MODIFIERS2 = "(?:public|private|protected|internal|static|virtual|override|async|abstract|sealed|new|extern)";
var DEFINED_METHOD_PATTERN = new RegExp(`^(?:${CSHARP_MODIFIERS2}\\s+)+[\\w<>\\[\\],.?]+\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*\\([^()]*\\)\\s*(?:\\{|=>)`);
function collectCSharpContracts(lines, fileLabel, registry, includeAbstractClasses) {
  let insideContract = false;
  let currentMethod = /* @__PURE__ */ new Set();
  let currentName = "";
  let currentParents = [];
  let currentKind = "interface";
  let depth = 0;
  const closeCurrentContract = () => {
    if (currentName && (includeAbstractClasses || currentKind !== "abstract-class")) {
      registry.set(currentName, { kind: currentKind, methods: currentMethod, parents: currentParents, fileLabel });
    }
    insideContract = false;
    currentMethod = /* @__PURE__ */ new Set();
    currentName = "";
    currentParents = [];
  };
  lines.forEach((rawLine) => {
    const line = stripLineComment8(rawLine).trim();
    const interfaceMatch = line.match(INTERFACE_PATTERN);
    const abstractClassMatch = !interfaceMatch ? line.match(ABSTRACT_CLASS_PATTERN) : null;
    if (interfaceMatch || abstractClassMatch) {
      if (insideContract) {
        closeCurrentContract();
      }
      const match2 = interfaceMatch ?? abstractClassMatch;
      insideContract = true;
      depth = 0;
      currentKind = interfaceMatch ? "interface" : "abstract-class";
      currentName = match2[1];
      currentParents = splitTypeList(match2[2]);
      return;
    }
    if (!insideContract) {
      return;
    }
    const methodMatch = line.match(ABSTRACT_METHOD_PATTERN);
    if (methodMatch) {
      currentMethod.add(methodMatch[1]);
    }
    if (line.includes("{")) {
      depth++;
    }
    if (line.includes("}")) {
      depth--;
      if (depth <= 0) {
        closeCurrentContract();
      }
    }
  });
  if (insideContract) {
    closeCurrentContract();
  }
}
function resolveRequireMethods(contractName, registry, visited = /* @__PURE__ */ new Set()) {
  if (visited.has(contractName)) {
    return /* @__PURE__ */ new Set();
  }
  visited.add(contractName);
  const contract = registry.get(contractName);
  if (!contract) {
    return /* @__PURE__ */ new Set();
  }
  const result = new Set(contract.methods);
  for (const parent of contract.parents) {
    for (const inherited of resolveRequireMethods(parent, registry, visited)) {
      result.add(inherited);
    }
  }
  return result;
}
function analyzeCSharpContractImplementations(lines, fileLabel, registry, findings) {
  let insideClass = false;
  let isAbstractClass = false;
  let className = "";
  let classStartLine = 0;
  let requiredContracts = [];
  let definedMethods = /* @__PURE__ */ new Set();
  let depth = 0;
  const closeCurrentClass = () => {
    if (!isAbstractClass) {
      for (const ContractName of requiredContracts) {
        const required = resolveRequireMethods(ContractName, registry);
        for (const methodName of required) {
          if (!definedMethods.has(methodName)) {
            findings.push(
              fileLabel + ":" + (classStartLine + 1) + ' - La clase "' + className + '" implementa "' + ContractName + '" pero no define el metodo "' + methodName + '"'
            );
          }
        }
      }
    }
    insideClass = false;
    requiredContracts = [];
    definedMethods = /* @__PURE__ */ new Set();
  };
  lines.forEach((rawLine, i) => {
    const line = stripLineComment8(rawLine).trim();
    const classMatch = line.match(CLASS_PATTERN2);
    if (classMatch) {
      insideClass = true;
      depth = 0;
      classStartLine = i;
      className = classMatch[1];
      isAbstractClass = CLASS_IS_ABSTRACT_PATTERN.test(line);
      requiredContracts = splitTypeList(classMatch[2]).filter((name) => registry.has(name));
    }
    if (!insideClass) {
      return;
    }
    const methodMatch = line.match(DEFINED_METHOD_PATTERN);
    if (methodMatch) {
      definedMethods.add(methodMatch[1]);
    }
    if (line.includes("{")) {
      depth++;
    }
    if (line.includes("}")) {
      depth--;
      if (depth <= 0) {
        closeCurrentClass();
      }
    }
  });
  if (insideClass) {
    closeCurrentClass();
  }
}
var TS_INTERFACE_PATTERN = /^(?:export\s+)?(?:default\s+)?interface\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([\w,\s<>]+))?/;
var TS_ABSTRACT_CLASS_PATTERN = /^(?:export\s+)?(?:default\s+)?abstract\s+class\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([\w<>]+))?(?:\s+implements\s+([\w,\s<>]+))?/;
var TS_METHOD_SIGNATURE_PATTERN = /^([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*(?::\s*[\w<>[\],.?|&\s]+)?\s*;/;
var TS_CLASS_PATTERN = /^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([\w<>]+))?(?:\s+implements\s+([\w,\s<>]+))?/;
var TS_DEFINED_METHOD_PATTERN = /^(?:public\s+|private\s+|protected\s+|static\s+|async\s+|readonly\s+|override\s+)*([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*(?::\s*[\w<>[\],.?|&\s]+)?\s*(?:\{|=>)/;
var TS_CLASS_IS_ABSTRACT_PATTERN = /^(?:export\s+)?(?:default\s+)?abstract\s+class\b/;
var TS_IMPORT_PATTERN = /^import\s+(?:\{([^}]+)\}|([A-Za-z_$][\w$]*))\s+from\s+['"](.+?)['"]\s*;?/;
function collectTsContracts(lines, fileLabel, registry, includeAbstractClasses) {
  let insideContract = false;
  let currentMethod = /* @__PURE__ */ new Set();
  let currentName = "";
  let currentParents = [];
  let currentKind = "interface";
  let depth = 0;
  const closeCurrentContract = () => {
    if (currentName && (includeAbstractClasses || currentKind !== "abstract-class")) {
      registry.set(currentName, { kind: currentKind, methods: currentMethod, parents: currentParents, fileLabel });
    }
    insideContract = false;
    currentMethod = /* @__PURE__ */ new Set();
    currentName = "";
    currentParents = [];
  };
  lines.forEach((rawLine) => {
    const line = stripLineComment8(rawLine).trim();
    const interfaceMatch = line.match(TS_INTERFACE_PATTERN);
    const abstractClassMatch = !interfaceMatch ? line.match(TS_ABSTRACT_CLASS_PATTERN) : null;
    if (interfaceMatch || abstractClassMatch) {
      if (insideContract) {
        closeCurrentContract();
      }
      const match2 = interfaceMatch ?? abstractClassMatch;
      insideContract = true;
      depth = 0;
      currentKind = interfaceMatch ? "interface" : "abstract-class";
      currentName = match2[1];
      currentParents = splitTypeList(match2[2]);
      return;
    }
    if (!insideContract) {
      return;
    }
    const methodMatch = line.match(TS_METHOD_SIGNATURE_PATTERN);
    if (methodMatch) {
      currentMethod.add(methodMatch[1]);
    }
    if (line.includes("{")) {
      depth++;
    }
    if (line.includes("}")) {
      depth--;
      if (depth <= 0) {
        closeCurrentContract();
      }
    }
  });
  if (insideContract) {
    closeCurrentContract();
  }
}
function parseTsImports(lines) {
  const importMap = /* @__PURE__ */ new Map();
  for (const rawLine of lines) {
    const line = stripLineComment8(rawLine).trim();
    const match2 = line.match(TS_IMPORT_PATTERN);
    if (!match2) {
      continue;
    }
    const modulePath = match2[3];
    if (match2[1]) {
      match2[1].split(",").forEach((token) => {
        const name = token.trim().split(/\s+as\s+/)[0].trim();
        if (name) {
          importMap.set(name, modulePath);
        }
      });
    } else if (match2[2]) {
      importMap.set(match2[2], modulePath);
    }
  }
  return importMap;
}
async function resolveModuleFile(fromFileLabel, modulePath, workspaceFolder, profileLines) {
  if (!modulePath.startsWith(".")) {
    return null;
  }
  const baseDir = path2.posix.dirname(fromFileLabel);
  const resolvedBase = path2.posix.normalize(path2.posix.join(baseDir, modulePath));
  const candidates = [
    resolvedBase + ".ts",
    resolvedBase + ".js",
    path2.posix.join(resolvedBase, "index.ts"),
    path2.posix.join(resolvedBase, "index.js")
  ];
  for (const candidate of candidates) {
    if (profileLines.has(candidate)) {
      return { fileLabel: candidate, lines: profileLines.get(candidate) };
    }
    try {
      const uri = vscode2.Uri.joinPath(workspaceFolder, candidate);
      const bytes = await vscode2.workspace.fs.readFile(uri);
      return { fileLabel: candidate, lines: Buffer.from(bytes).toString("utf8").split("\n") };
    } catch {
      continue;
    }
  }
  return null;
}
function findReferencedContractNames(lines) {
  const names = [];
  lines.forEach((rawLine) => {
    const match2 = stripLineComment8(rawLine).trim().match(TS_CLASS_PATTERN);
    if (!match2) {
      return;
    }
    names.push(...splitTypeList(match2[2]), ...splitTypeList(match2[3]));
  });
  return names;
}
function findReferencedJsContractNames(lines) {
  const names = [];
  lines.forEach((rawLine) => {
    const match2 = stripLineComment8(rawLine).trim().match(JS_IMPLEMENTS_JSDOC_PATTERN);
    if (match2) {
      names.push(match2[1]);
    }
  });
  return names;
}
function analyzeTsContractImplementations(lines, fileLabel, registry, findings) {
  let insideClass = false;
  let isAbstractClass = false;
  let className = "";
  let classStartLine = 0;
  let requiredContracts = [];
  let definedMethods = /* @__PURE__ */ new Set();
  let depth = 0;
  const closeCurrentClass = () => {
    if (!isAbstractClass) {
      for (const ContractName of requiredContracts) {
        const required = resolveRequireMethods(ContractName, registry);
        for (const methodName of required) {
          if (!definedMethods.has(methodName)) {
            findings.push(
              fileLabel + ":" + (classStartLine + 1) + ' - La clase "' + className + '" implementa "' + ContractName + '" pero no define el metodo "' + methodName + '"'
            );
          }
        }
      }
    }
    insideClass = false;
    requiredContracts = [];
    definedMethods = /* @__PURE__ */ new Set();
  };
  lines.forEach((rawLine, i) => {
    const line = stripLineComment8(rawLine).trim();
    const classMatch = line.match(TS_CLASS_PATTERN);
    if (classMatch) {
      insideClass = true;
      depth = 0;
      classStartLine = i;
      className = classMatch[1];
      isAbstractClass = TS_CLASS_IS_ABSTRACT_PATTERN.test(line);
      requiredContracts = [...splitTypeList(classMatch[2]), ...splitTypeList(classMatch[3])].filter((name) => registry.has(name));
    }
    if (!insideClass) {
      return;
    }
    const methodMatch = line.match(TS_DEFINED_METHOD_PATTERN);
    if (methodMatch) {
      definedMethods.add(methodMatch[1]);
    }
    if (line.includes("{")) {
      depth++;
    }
    if (line.includes("}")) {
      depth--;
      if (depth <= 0) {
        closeCurrentClass();
      }
    }
  });
  if (insideClass) {
    closeCurrentClass();
  }
}
var JS_INTERFACE_JSDOC_PATTERN = /@interface\b/;
var JS_IMPLEMENTS_JSDOC_PATTERN = /@implements\s*\{\s*([\w.$]+)\s*\}/;
var JS_CLASS_PATTERN = /^(?:export\s+)?(?:default\s+)?class\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([\w.$]+))?/;
var JS_METHOD_PATTERN = /^(?:static\s+|async\s+|get\s+|set\s+)*([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*\{/;
function collectJsContract(lines, fileLabel, regitry) {
  let pendingIsInterface = false;
  let insideContract = false;
  let currentMethod = /* @__PURE__ */ new Set();
  let currentName = "";
  let depth = 0;
  lines.forEach((rawLine) => {
    const line = stripLineComment8(rawLine).trim();
    if (JS_INTERFACE_JSDOC_PATTERN.test(line)) {
      pendingIsInterface = true;
      return;
    }
    const classMatch = line.match(JS_CLASS_PATTERN);
    if (classMatch && pendingIsInterface) {
      insideContract = true;
      depth = 0;
      currentName = classMatch[1];
      currentMethod = /* @__PURE__ */ new Set();
      pendingIsInterface = false;
      return;
    }
    if (classMatch) {
      pendingIsInterface = false;
    }
    if (!insideContract) {
      return;
    }
    const methodMatch = line.match(JS_METHOD_PATTERN);
    if (methodMatch) {
      currentMethod.add(methodMatch[1]);
    }
    if (line.includes("{")) {
      depth++;
    }
    if (line.includes("}")) {
      depth--;
      if (depth <= 0) {
        regitry.set(currentName, { kind: "interface", methods: currentMethod, parents: [], fileLabel });
        insideContract = false;
      }
    }
  });
}
function analyzeJsContractImplementations(lines, fileLabel, registry, findings) {
  let pendingContractName = null;
  let insideClass = false;
  let className = "";
  let classStartLine = 0;
  let requiredContracts = [];
  let definedMethods = /* @__PURE__ */ new Set();
  let depth = 0;
  const closeCurrentClass = () => {
    for (const contractName of requiredContracts) {
      const required = resolveRequireMethods(contractName, registry);
      for (const methodName of required) {
        if (!definedMethods.has(methodName)) {
          findings.push(
            fileLabel + ":" + (classStartLine + 1) + ' - La clase "' + className + '"implementa "' + contractName + '"pero no define el metodo "' + methodName + '"'
          );
        }
      }
    }
    insideClass = false;
    requiredContracts = [];
    definedMethods = /* @__PURE__ */ new Set();
  };
  lines.forEach((rawLine, i) => {
    const line = stripLineComment8(rawLine).trim();
    const implementsMatch = line.match(JS_IMPLEMENTS_JSDOC_PATTERN);
    if (implementsMatch) {
      pendingContractName = implementsMatch[1];
      return;
    }
    const classMatch = line.match(JS_CLASS_PATTERN);
    if (classMatch) {
      insideClass = true;
      depth = 0;
      classStartLine = i;
      className = classMatch[1];
      requiredContracts = pendingContractName && registry.has(pendingContractName) ? [pendingContractName] : [];
      pendingContractName = null;
    }
    if (!insideClass) {
      return;
    }
    const methodMatch = line.match(JS_METHOD_PATTERN);
    if (methodMatch) {
      definedMethods.add(methodMatch[1]);
    }
    if (line.includes("{")) {
      depth++;
    }
    if (line.includes("}")) {
      depth--;
      if (depth <= 0) {
        closeCurrentClass();
      }
    }
  });
  if (insideClass) {
    closeCurrentClass();
  }
}
async function analyzeInterfaceContracts(profileLines, workspaceFolder, excludePattern, findings, config) {
  const registry = /* @__PURE__ */ new Map();
  const importsByFile = /* @__PURE__ */ new Map();
  const lenguages = new Set(config.lenguages);
  for (const [fileLabel, lines] of profileLines) {
    const extension = fileLabel.split(".").pop() ?? "";
    if (!lenguages.has(extension)) {
      continue;
    }
    if (extension === "cs") {
      collectCSharpContracts(lines, fileLabel, registry, config.includeAbstractClasses);
    } else if (extension === "ts") {
      collectTsContracts(lines, fileLabel, registry, config.includeAbstractClasses);
      importsByFile.set(fileLabel, parseTsImports(lines));
    } else if (extension === "js") {
      collectJsContract(lines, fileLabel, registry);
      importsByFile.set(fileLabel, parseTsImports(lines));
    }
  }
  const contractFolderGlob = `**/{${config.contractFolders.join(",")}}/**/*.cs`;
  const searchPattern = new vscode2.RelativePattern(workspaceFolder, contractFolderGlob);
  const candidateFiles = await vscode2.workspace.findFiles(searchPattern, excludePattern);
  for (const uri of candidateFiles) {
    const fileLabel = vscode2.workspace.asRelativePath(uri);
    if (profileLines.has(fileLabel)) {
      continue;
    }
    const bytes = await vscode2.workspace.fs.readFile(uri);
    const lines = Buffer.from(bytes).toString("utf8").split("\n");
    collectCSharpContracts(lines, fileLabel, registry, config.includeAbstractClasses);
  }
  for (const [fileLabel, lines] of profileLines) {
    const isTs = fileLabel.endsWith(".ts");
    const isJs = fileLabel.endsWith(".js");
    if (!isTs && !isJs) {
      continue;
    }
    const importMap = importsByFile.get(fileLabel);
    const referencedNames = isTs ? findReferencedContractNames(lines) : findReferencedJsContractNames(lines);
    for (const name of referencedNames) {
      if (registry.has(name)) {
        continue;
      }
      const modulePath = importMap.get(name);
      if (!modulePath) {
        continue;
      }
      const resolved = await resolveModuleFile(fileLabel, modulePath, workspaceFolder, profileLines);
      if (!resolved) {
        continue;
      }
      if (resolved.fileLabel.endsWith(".ts")) {
        collectTsContracts(resolved.lines, resolved.fileLabel, registry, config.includeAbstractClasses);
      } else {
        collectJsContract(resolved.lines, resolved.fileLabel, registry);
      }
    }
  }
  for (const [fileLabel, lines] of profileLines) {
    const extension = fileLabel.split(".").pop() ?? "";
    if (extension === "cs") {
      analyzeCSharpContractImplementations(lines, fileLabel, registry, findings);
    } else if (extension === "ts") {
      analyzeTsContractImplementations(lines, fileLabel, registry, findings);
    } else if (extension === "js") {
      analyzeJsContractImplementations(lines, fileLabel, registry, findings);
    }
  }
}

// src/analyzers/structure/layeredStructureAnalyzer.ts
function layerExists(folderPaths, folders) {
  return folderPaths.some((folderPath) => {
    const segments = folderPath.replace(/\\/g, "/").toLowerCase().split("/");
    return segments.some((segment) => folders.includes(segment));
  });
}
function analyzeLayeredStructure(fileLines, folderPaths, findings, config) {
  const databasePattern = new RegExp(`\\b(?:${config.databaseUsagePatterns.join("|")})\\b`);
  const usesDatabase = [...fileLines.values()].some(
    (lines) => (
      //recorre todas las lineas de todos los archivos 
      lines.some((line) => databasePattern.test(line))
    )
    //usa el regex para ver s en algun lado se usa una base de datos 
  );
  const requiredLayers = config.layers.filter((layer) => layer.required || layer.requiredIfDatabaseDetected && usesDatabase);
  for (const layer of requiredLayers) {
    if (!layerExists(folderPaths, layer.folders)) {
      findings.push('Estructura del proyecto - No se encontro en la capa "' + layer.name + '"');
    }
  }
}

// src/analyzers/structure/duplicateCodeAnalyzer.ts
function normilzeLine(rawLine) {
  return rawLine.replace(/\/\/.*$/, "").trim().replace(/\s+/g, " ");
}
function isTrivialLine(normalized) {
  return normalized === "" || /^[{}()[\];,]+$/.test(normalized);
}
function collectBlocks(normalizedByFile, minLines) {
  const blockByHash = /* @__PURE__ */ new Map();
  for (const [fileLabel, lines] of normalizedByFile) {
    for (let start = 0; start <= lines.length - minLines; start++) {
      const window4 = lines.slice(start, start + minLines);
      const meaningfulLines = window4.filter((line) => !isTrivialLine(line));
      if (meaningfulLines.length < minLines * 0.6) {
        continue;
      }
      const hash = window4.join("\n");
      const occurrence = { fileLabel, startIndex: start };
      const existing = blockByHash.get(hash);
      if (existing) {
        existing.push(occurrence);
      } else {
        blockByHash.set(hash, [occurrence]);
      }
    }
  }
  return blockByHash;
}
function analyzeDuplicateCode(fileLines, changedLinesByFile, findings, config) {
  const normalizedByFile = new Map([...fileLines].map(([label, lines]) => [label, lines.map(normilzeLine)]));
  const blocksByHash = collectBlocks(normalizedByFile, config.minLines);
  const consumed = /* @__PURE__ */ new Map();
  const isConsumed = (fileLabel, index) => consumed.get(fileLabel)?.has(index) ?? false;
  const markConsumed = (fileLabel, start, lenght) => {
    if (!consumed.has(fileLabel)) {
      consumed.set(fileLabel, /* @__PURE__ */ new Set());
    }
    const set = consumed.get(fileLabel);
    for (let i = start; i < start + lenght; i++) {
      set.add(i);
    }
  };
  const intersectsChanged = (fileLabel, start, lenght) => {
    const changed = changedLinesByFile.get(fileLabel);
    if (!changed) {
      return false;
    }
    for (let i = start; i < start + lenght; i++) {
      if (changed.has(i + 1)) {
        return true;
      }
    }
    return false;
  };
  for (const occurrences of blocksByHash.values()) {
    if (occurrences.length < config.minOccurrences) {
      continue;
    }
    for (let a = 0; a < occurrences.length; a++) {
      const anchor = occurrences[a];
      if (isConsumed(anchor.fileLabel, anchor.startIndex)) {
        continue;
      }
      for (let b = a + 1; b < occurrences.length; b++) {
        const other = occurrences[b];
        if (anchor.fileLabel === other.fileLabel && anchor.startIndex === other.startIndex) {
          continue;
        }
        if (isConsumed(other.fileLabel, other.startIndex)) {
          continue;
        }
        const anchorLines = normalizedByFile.get(anchor.fileLabel);
        const otherLines = normalizedByFile.get(other.fileLabel);
        let length = config.minLines;
        while (anchor.startIndex + length < anchorLines.length && other.startIndex + length < otherLines.length && anchorLines[anchor.startIndex + length] === otherLines[other.startIndex + length]) {
          length++;
        }
        markConsumed(anchor.fileLabel, anchor.startIndex, length);
        markConsumed(other.fileLabel, other.startIndex, length);
        const relevant = intersectsChanged(anchor.fileLabel, anchor.startIndex, length) || intersectsChanged(other.fileLabel, other.startIndex, length);
        if (!relevant) {
          continue;
        }
        findings.push(
          anchor.fileLabel + ":" + (anchor.startIndex + 1) + "-" + (anchor.startIndex + length) + " - este bloque de " + length + " lines se repite en " + other.fileLabel + ":" + (other.startIndex + 1) + "-" + (other.startIndex + length) + "; considera extraerlo a una funcion/componente/clase reutilizable"
        );
        break;
      }
    }
  }
}

// src/analyzers/style/fileNamingAnalyzer.ts
var NEXT_ROUTE_FOLDER_PATTERN = /(^|\/)(?:src\/)?(?:pages|app)\//;
var COMPONENT_EXPORT_PATTERNS = [
  /^export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/,
  /^export\s+default\s+([A-Z][A-Za-z0-9_]*)\s*;?\s*$/,
  /^export\s+(?:default\s+)?function\s+([A-Z][A-Za-z0-9_]*)/,
  /^export\s+(?:default\s+)?const\s+([A-Z][A-Za-z0-9_]*)\s*(?::|=)/,
  /^function\s+([A-Z][A-Za-z0-9_]*)/,
  /^const\s+([A-Z][A-Za-z0-9_]*)\s*(?::|=)/
];
function fileExportsComponent(lines) {
  return lines.some((rawLine) => {
    const commentIndex = rawLine.indexOf("//");
    const line = (commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex)).trim();
    return COMPONENT_EXPORT_PATTERNS.some((pattern) => pattern.test(line));
  });
}
function isNextRouteFile(fileLabel) {
  return NEXT_ROUTE_FOLDER_PATTERN.test(fileLabel.replace(/\\/g, "/"));
}
var PKT1_WEB2_REPO_NAME = "PKT1_WEB2";
var CONTROLLERS_ROUTE_FOLDER_PATTERN = /^PKT1\/application\/controllers\//;
var CONTROLLERS_NAME_PATTERN = /^Cat[A-Z][A-Za-z0-9]*$/;
function isControllerRouteFile(fileLabel) {
  return CONTROLLERS_ROUTE_FOLDER_PATTERN.test(fileLabel.replace(/\\/g, "/"));
}
var MODEL_ROUTE_FOLDER_PATTERN = /^PKT1\/application\/models\//;
var MODEL_NAME_PATTERN = /^[A-Z][A-Za-z0-9]*Model$/;
function isModelRouteFile(fileLabel) {
  return MODEL_ROUTE_FOLDER_PATTERN.test(fileLabel.replace(/\\/g, "/"));
}
function getBaseName(fileLabel) {
  const normalized = fileLabel.replace(/\\/g, "/");
  const fileName = normalized.split("/").pop() ?? normalized;
  return fileName.split(".")[0];
}
function analyzeFileNaming(lines, fileLabel, findings, repoName) {
  const baseName = getBaseName(fileLabel);
  if (repoName === PKT1_WEB2_REPO_NAME) {
    if (isControllerRouteFile(fileLabel)) {
      if (!CONTROLLERS_NAME_PATTERN.test(baseName)) {
        findings.push(fileLabel + " - El archivo " + baseName + " (controlador) no sigue el formato CatNombre");
      }
      return;
    }
    if (isModelRouteFile(fileLabel)) {
      if (!MODEL_NAME_PATTERN.test(baseName)) {
        findings.push(fileLabel + " - El archivo " + baseName + " (modelo) no sigue el formato NombreModel");
      }
      return;
    }
  }
  if (isNextRouteFile(fileLabel)) {
    if (!matchesCase(baseName, "kebab-case")) {
      findings.push(fileLabel + " - El archivo " + baseName + " no usa kebab-case");
    }
    return;
  }
  if (fileExportsComponent(lines)) {
    if (!matchesCase(baseName, "PascalCase")) {
      findings.push(fileLabel + " - El archivo " + baseName + " (componente) no usa PascalCase");
    }
    return;
  }
  if (!matchesCase(baseName, "camelCase")) {
    findings.push(fileLabel + " - El archivo " + baseName + " no usa camelCase");
  }
}

// src/analyzers/style/cssClassNamingAnalyzer.ts
var CSS_CLASS_SELECTOR_PATTERN = /\.([A-Za-z_-][A-Za-z0-9_-]*)(?=[\s,:{]|$)/g;
var HTML_CLASS_ATRIBUTE_PATTERN = /class(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
function reportIfInvalid(name, fileLabel, findings) {
  if (!matchesCase(name, "kebab-case")) {
    findings.push(fileLabel + " - La clase " + name + " no usa kebab-case");
  }
}
function analyzeCssFile(lines, fileLabel, findings) {
  lines.forEach((line) => {
    CSS_CLASS_SELECTOR_PATTERN.lastIndex = 0;
    let match2;
    while ((match2 = CSS_CLASS_SELECTOR_PATTERN.exec(line)) !== null) {
      reportIfInvalid(match2[1], fileLabel, findings);
    }
  });
}
function analyzeHtmlFile(lines, fileLabel, findings) {
  lines.forEach((line) => {
    HTML_CLASS_ATRIBUTE_PATTERN.lastIndex = 0;
    let match2;
    while ((match2 = HTML_CLASS_ATRIBUTE_PATTERN.exec(line)) !== null) {
      const classValue = match2[1] ?? match2[2] ?? "";
      classValue.split(/\s+/).filter((name) => name.length > 0).forEach((name) => {
        reportIfInvalid(name, fileLabel, findings);
      });
    }
  });
}
function analyzeCssClassNaming(lines, languageId, fileLabel, findings) {
  if (languageId === "css") {
    analyzeCssFile(lines, fileLabel, findings);
  } else {
    analyzeHtmlFile(lines, fileLabel, findings);
  }
}

// src/analyzers/structure/requestHandlerAnalyzer.ts
var NEXT_IMPORT_PATTERN = /from\s+['"]next(?:\/[^'"]*)?['"]/;
var REACT_NATIVE_IMPORT_PATTERN = /from\s+['"]react-native['"]/;
var REACT_IMPORT_PATTERN = /from\s+['"]react['"]/;
var JQUERY_SIGNAL_PATTERN = /from\s+['"]jquery['"]|\s$\..(ajax|get|post|getJSON)\s*\(/;
var FETCH_CALL_PATTERN = /\bfetch\s*\(/;
var AXIOS_CALL_PATTERN = /\baxios(?:\.\w+)?\s*\(/;
var JQUERY_CALL_PATTERN = /\$\.(ajax|get|post|getJSON)\s*\(/;
var XHR_PATTERN = /\bnew\s+XMLHttpRequest\s*\(/;
var PHP_CURL_PATTERN = /\bcurl_init\s*\(/;
var PHP_FILE_GET_CONTENTS_PATTERN = /\bfile_get_contents\s*\(\s*['"]https?:/;
var PHP_GUZZLE_PATTERN = /GuzzleHttp|->\s*(get|post|request)Async?\s*\(/;
function stripLineComment9(rawLine) {
  const commentIndex = rawLine.indexOf("//");
  return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}
function detectJsContext(lines) {
  const content = lines.join("\n");
  if (NEXT_IMPORT_PATTERN.test(content)) {
    return "next";
  }
  if (REACT_NATIVE_IMPORT_PATTERN.test(content)) {
    return "reactNative";
  }
  if (JQUERY_SIGNAL_PATTERN.test(content)) {
    return "legacyJs";
  }
  if (REACT_IMPORT_PATTERN.test(content)) {
    return "react";
  }
  return null;
}
function expectedHandlerFor(context, config) {
  switch (context) {
    case "next":
      return config.next.expected;
    case "reactNative":
      return config.reactNative.expected;
    case "legacyJs":
      return config.legacyJs.expected;
    case "php":
      return config.legacyJs.expected;
    case "react":
      return config.react.expected;
  }
}
var CONTEXT_LABELS = {
  next: "Next.js",
  react: "React",
  reactNative: "React Native",
  legacyJs: "jQuery",
  php: "PHP"
};
function reportLine(rawLine, lineNumber, fileLabel, context, expected, findings) {
  const line = stripLineComment9(rawLine);
  const where = fileLabel + ":" + lineNumber;
  let found = null;
  if (FETCH_CALL_PATTERN.test(line)) {
    found = "fetch";
  } else if (AXIOS_CALL_PATTERN.test(line)) {
    found = "axios";
  } else if (JQUERY_CALL_PATTERN.test(line)) {
    found = "jQuery";
  } else if (XHR_PATTERN.test(line)) {
    found = "XMLHttpRequest";
  } else if (PHP_CURL_PATTERN.test(line)) {
    found = "cURL";
  } else if (PHP_FILE_GET_CONTENTS_PATTERN.test(line)) {
    found = "file_get_contents";
  } else if (PHP_GUZZLE_PATTERN.test(line)) {
    found = "Guzzle";
  }
  if (found && found.toLowerCase() !== expected) {
    findings.push(where + " - en este contexto (" + CONTEXT_LABELS[context] + ') se debe usar "' + expected + '"; se encontro "' + found + '"');
  }
}
function analyzeRequestHandlers(lines, fileLabel, findings, changedLines, config) {
  if (fileLabel.endsWith(".php")) {
    const expected2 = expectedHandlerFor("php", config);
    lines.forEach((rawLine, i) => {
      if (!changedLines.has(i + 1)) {
        return;
      }
      reportLine(rawLine, i + 1, fileLabel, "php", expected2, findings);
    });
    return;
  }
  const context = detectJsContext(lines);
  if (!context) {
    return;
  }
  const expected = expectedHandlerFor(context, config);
  lines.forEach((rawLine, i) => {
    if (!changedLines.has(i + 1)) {
      return;
    }
    reportLine(rawLine, i + 1, fileLabel, context, expected, findings);
  });
}

// src/shared/componentDetection.ts
var COMPONENT_EXPORT_PATTERNS2 = [
  /^export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/,
  /^export\s+default\s+([A-Z][A-Za-z0-9_]*)\s*;?\s*$/,
  /^export\s+(?:default\s+)?function\s+([A-Z][A-Za-z0-9_]*)/,
  /^export\s+(?:default\s+)?const\s+([A-Z][A-Za-z0-9_]*)\s*(?::|=)/,
  /^function\s+([A-Z][A-Za-z0-9_]*)/,
  /^const\s+([A-Z][A-Za-z0-9_]*)\s*(?::|=)/
];
function fileExportsComponent2(lines) {
  return lines.some((rawLine) => {
    const commentIndex = rawLine.indexOf("//");
    const line = (commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex)).trim();
    return COMPONENT_EXPORT_PATTERNS2.some((pattern) => pattern.test(line));
  });
}

// src/analyzers/structure/componentLocationAnalyzer.ts
var COMPONENT_EXTENSION_PATTERN = /\.(jsx|tsx|js|ts)$/;
var JSX_RETURN_PATTERN = /return\s*\(?\s*<[A-Za-z>]/;
var TEST_FILE_PATTERN = /\.(test|spec|stories)\.(jsx|tsx|js|ts)$/;
function splitPath(fileLabel) {
  const parts = fileLabel.replace(/\\/g, "/").split("/");
  const fileName = parts.pop() ?? "";
  return { folders: parts.map((part) => part.toLowerCase()), baseName: fileName.split(".")[0] };
}
function isComponentFile(lines, filelabel) {
  if (!COMPONENT_EXTENSION_PATTERN.test(filelabel) || TEST_FILE_PATTERN.test(filelabel)) {
    return false;
  }
  if (!fileExportsComponent2(lines)) {
    return false;
  }
  if (/\.(jsx|tsx)$/.test(filelabel)) {
    return true;
  }
  return JSX_RETURN_PATTERN.test(lines.join("\n"));
}
function analyzeComponentLocation(lines, fileLabel, findings, config) {
  if (!isComponentFile(lines, fileLabel)) {
    return;
  }
  const { folders, baseName } = splitPath(fileLabel);
  if (config.exemptFiles.includes(baseName)) {
    return;
  }
  if (folders.some((folder) => config.exemptFolders.includes(folder))) {
    return;
  }
  const isInComponentFolder = folders.some((folders2) => config.folders.includes(folders2));
  if (!isInComponentFolder) {
    findings.push(fileLabel + " - El componente " + baseName + " debe estar dentro de una carpeta " + config.folders.join("/"));
  }
}

// src/analyzers/structure/folderNamingAnalyzer.ts
var MANAGEMENT_VIEW2_REPO_NAME = "ManagementView_v2";
var MANAGMENT_VIEW2_REQUIRED_FOLDERS = [
  "public",
  "public/assets",
  "src",
  "src/hooks",
  "src/api/auth",
  "src/api/customers",
  "src/api/dashboard",
  "src/api/shipments",
  "src/shared/components"
];
var ONSITE_V2_REPO_NAME = "OnSiteV2_MX";
var ONSITE_V2_REQUIRED_FOLDERS = [
  "src",
  "src/actions",
  "src/component",
  "src/component/cards",
  "src/component/inputs",
  "src/components/navigation",
  "src/components/navigation/drawer",
  "src/components/navigation/sidebar",
  "src/components/navigation/tabs",
  "src/components/pagination",
  "src/components/typography",
  "src/interfaces",
  "src/interfaces/auth",
  "src/interfaces/locations",
  "src/interfaces/shipments",
  "src/interfaces/tables"
];
function normalizePath(folderPath) {
  return folderPath.replace(/\\/g, "/");
}
function getFolderName(folderPath) {
  return folderPath.split("/").pop() ?? folderPath;
}
var REQUIRED_FOLDERS_BY_REPO = {
  [MANAGEMENT_VIEW2_REPO_NAME]: { requiredFolders: MANAGMENT_VIEW2_REQUIRED_FOLDERS, checkPascalCase: true, checkKebabCase: false },
  [ONSITE_V2_REPO_NAME]: { requiredFolders: ONSITE_V2_REQUIRED_FOLDERS, checkPascalCase: false, checkKebabCase: true }
};
function analyzeFolderStructure(folderPaths, repoName, findings) {
  const rules = REQUIRED_FOLDERS_BY_REPO[repoName];
  if (!rules) {
    return;
  }
  const normalizedPaths = folderPaths.map(normalizePath);
  for (const requiredFolder of rules.requiredFolders) {
    const actualPath = normalizedPaths.find((folderPaths2) => folderPaths2.toLocaleLowerCase() === requiredFolder.toLocaleLowerCase());
    if (!actualPath) {
      findings.push('Estructura del proyecto - No se encontro la carpeta "' + requiredFolder + '"');
      continue;
    }
    const folderName = getFolderName(actualPath);
    if (rules.checkPascalCase && !matchesCase(folderName, "PascalCase")) {
      findings.push(actualPath + " - La carpeta " + folderName + " no usa PascalCase");
    }
    if (rules.checkKebabCase && !matchesCase(folderName, "kebab-case")) {
      findings.push(actualPath + " - La carpeta " + folderName + " no usa kebab-case");
    }
  }
}

// src/shared/projectProfile.ts
var vscode3 = __toESM(require("vscode"));

// node_modules/js-yaml/dist/js-yaml.mjs
var NOT_RESOLVED = /* @__PURE__ */ Symbol("NOT_RESOLVED");
function defineScalarTag(tagName, options) {
  return {
    tagName,
    nodeKind: "scalar",
    implicit: options.implicit ?? false,
    matchByTagPrefix: options.matchByTagPrefix ?? false,
    implicitFirstChars: options.implicitFirstChars ?? null,
    resolve: options.resolve,
    identify: options.identify,
    represent: options.represent ?? ((data) => String(data)),
    representTagName: options.representTagName ?? (() => tagName)
  };
}
function defineSequenceTag(tagName, options) {
  const carrierIsResult = options.finalize === void 0;
  return {
    tagName,
    nodeKind: "sequence",
    implicit: false,
    matchByTagPrefix: options.matchByTagPrefix ?? false,
    create: options.create,
    addItem: options.addItem,
    finalize: options.finalize ?? ((carrier) => carrier),
    carrierIsResult,
    identify: options.identify,
    represent: options.represent ?? ((data) => data),
    representTagName: options.representTagName ?? (() => tagName)
  };
}
function defineMappingTag(tagName, options) {
  const carrierIsResult = options.finalize === void 0;
  return {
    tagName,
    nodeKind: "mapping",
    implicit: false,
    matchByTagPrefix: options.matchByTagPrefix ?? false,
    create: options.create,
    addPair: options.addPair,
    has: options.has,
    keys: options.keys,
    get: options.get,
    finalize: options.finalize ?? ((carrier) => carrier),
    carrierIsResult,
    identify: options.identify,
    represent: options.represent ?? ((data) => data),
    representTagName: options.representTagName ?? (() => tagName)
  };
}
var strTag = defineScalarTag("tag:yaml.org,2002:str", {
  resolve: (source) => source,
  identify: (data) => typeof data === "string"
});
var NULL_VALUES$1 = [
  "",
  "~",
  "null",
  "Null",
  "NULL"
];
var nullCoreTag = defineScalarTag("tag:yaml.org,2002:null", {
  implicit: true,
  implicitFirstChars: [
    "",
    "~",
    "n",
    "N"
  ],
  resolve: (source) => {
    if (NULL_VALUES$1.indexOf(source) !== -1) return null;
    return NOT_RESOLVED;
  },
  identify: (object) => object === null,
  represent: () => "null"
});
var nullJsonTag = defineScalarTag("tag:yaml.org,2002:null", {
  implicit: true,
  implicitFirstChars: ["n"],
  resolve: (source, isExplicit) => {
    if (source === "null" || isExplicit && source === "") return null;
    return NOT_RESOLVED;
  },
  identify: (object) => object === null,
  represent: () => "null"
});
var NULL_VALUES = [
  "",
  "~",
  "null",
  "Null",
  "NULL"
];
var nullYaml11Tag = defineScalarTag("tag:yaml.org,2002:null", {
  implicit: true,
  implicitFirstChars: [
    "",
    "~",
    "n",
    "N"
  ],
  resolve: (source) => {
    if (NULL_VALUES.indexOf(source) !== -1) return null;
    return NOT_RESOLVED;
  },
  identify: (object) => object === null,
  represent: () => "null"
});
var TRUE_VALUES$2 = [
  "true",
  "True",
  "TRUE"
];
var FALSE_VALUES$2 = [
  "false",
  "False",
  "FALSE"
];
var boolCoreTag = defineScalarTag("tag:yaml.org,2002:bool", {
  implicit: true,
  implicitFirstChars: [
    "t",
    "T",
    "f",
    "F"
  ],
  resolve: (source) => {
    if (TRUE_VALUES$2.indexOf(source) !== -1) return true;
    if (FALSE_VALUES$2.indexOf(source) !== -1) return false;
    return NOT_RESOLVED;
  },
  identify: (object) => Object.prototype.toString.call(object) === "[object Boolean]",
  represent: (object) => object ? "true" : "false"
});
var TRUE_VALUES$1 = ["true"];
var FALSE_VALUES$1 = ["false"];
var boolJsonTag = defineScalarTag("tag:yaml.org,2002:bool", {
  implicit: true,
  implicitFirstChars: ["t", "f"],
  resolve: (source) => {
    if (TRUE_VALUES$1.indexOf(source) !== -1) return true;
    if (FALSE_VALUES$1.indexOf(source) !== -1) return false;
    return NOT_RESOLVED;
  },
  identify: (object) => Object.prototype.toString.call(object) === "[object Boolean]",
  represent: (object) => object ? "true" : "false"
});
var TRUE_VALUES = [
  "true",
  "True",
  "TRUE",
  "y",
  "Y",
  "yes",
  "Yes",
  "YES",
  "on",
  "On",
  "ON"
];
var FALSE_VALUES = [
  "false",
  "False",
  "FALSE",
  "n",
  "N",
  "no",
  "No",
  "NO",
  "off",
  "Off",
  "OFF"
];
var boolYaml11Tag = defineScalarTag("tag:yaml.org,2002:bool", {
  implicit: true,
  implicitFirstChars: [
    "y",
    "Y",
    "n",
    "N",
    "t",
    "T",
    "f",
    "F",
    "o",
    "O"
  ],
  resolve: (source) => {
    if (TRUE_VALUES.indexOf(source) !== -1) return true;
    if (FALSE_VALUES.indexOf(source) !== -1) return false;
    return NOT_RESOLVED;
  },
  identify: (object) => Object.prototype.toString.call(object) === "[object Boolean]",
  represent: (object) => object ? "true" : "false"
});
var YAML_INTEGER_IMPLICIT_PATTERN$1 = /* @__PURE__ */ new RegExp("^(?:0o[0-7]+|0x[0-9a-fA-F]+|[-+]?[0-9]+)$");
var YAML_INTEGER_EXPLICIT_PATTERN$1 = /* @__PURE__ */ new RegExp("^(?:[-+]?0b[0-1]+|[-+]?0o[0-7]+|[-+]?0x[0-9a-fA-F]+|[-+]?[0-9]+)$");
function parseYamlInteger$2(source) {
  let value = source;
  let sign = 1;
  if (value[0] === "-" || value[0] === "+") {
    if (value[0] === "-") sign = -1;
    value = value.slice(1);
  }
  if (value.startsWith("0b")) return sign * parseInt(value.slice(2), 2);
  if (value.startsWith("0o")) return sign * parseInt(value.slice(2), 8);
  if (value.startsWith("0x")) return sign * parseInt(value.slice(2), 16);
  return sign * parseInt(value, 10);
}
function resolveYamlInteger$2(source, isExplicit) {
  if (isExplicit) {
    if (!YAML_INTEGER_EXPLICIT_PATTERN$1.test(source)) return NOT_RESOLVED;
  } else if (!YAML_INTEGER_IMPLICIT_PATTERN$1.test(source)) return NOT_RESOLVED;
  const result = parseYamlInteger$2(source);
  return Number.isFinite(result) ? result : NOT_RESOLVED;
}
var intCoreTag = defineScalarTag("tag:yaml.org,2002:int", {
  implicit: true,
  implicitFirstChars: [
    "-",
    "+",
    ..."0123456789"
  ],
  resolve: resolveYamlInteger$2,
  identify: (object) => Number.isInteger(object) && !Object.is(object, -0) && object.toString(10).indexOf("e") < 0,
  represent: (object) => object.toString(10)
});
var YAML_INTEGER_IMPLICIT_PATTERN = /* @__PURE__ */ new RegExp("^-?(?:0|[1-9][0-9]*)$");
var YAML_INTEGER_EXPLICIT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?0b[0-1]+|[-+]?0o[0-7]+|[-+]?0x[0-9a-fA-F]+|[-+]?[0-9]+)$");
function parseYamlInteger$1(source) {
  let value = source;
  let sign = 1;
  if (value[0] === "-" || value[0] === "+") {
    if (value[0] === "-") sign = -1;
    value = value.slice(1);
  }
  if (value.startsWith("0b")) return sign * parseInt(value.slice(2), 2);
  if (value.startsWith("0o")) return sign * parseInt(value.slice(2), 8);
  if (value.startsWith("0x")) return sign * parseInt(value.slice(2), 16);
  return sign * parseInt(value, 10);
}
function resolveYamlInteger$1(source, isExplicit) {
  if (isExplicit) {
    if (!YAML_INTEGER_EXPLICIT_PATTERN.test(source)) return NOT_RESOLVED;
  } else if (!YAML_INTEGER_IMPLICIT_PATTERN.test(source)) return NOT_RESOLVED;
  const result = parseYamlInteger$1(source);
  return Number.isFinite(result) ? result : NOT_RESOLVED;
}
var intJsonTag = defineScalarTag("tag:yaml.org,2002:int", {
  implicit: true,
  implicitFirstChars: ["-", ..."0123456789"],
  resolve: resolveYamlInteger$1,
  identify: (object) => Number.isInteger(object) && !Object.is(object, -0) && object.toString(10).indexOf("e") < 0,
  represent: (object) => object.toString(10)
});
var YAML_INTEGER_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?0b[0-1_]+|[-+]?0[0-7_]+|[-+]?0x[0-9a-fA-F_]+|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+|[-+]?(?:0|[1-9][0-9_]*))$");
function parseYamlInteger(source) {
  let value = source.replace(/_/g, "");
  let sign = 1;
  if (value[0] === "-" || value[0] === "+") {
    if (value[0] === "-") sign = -1;
    value = value.slice(1);
  }
  if (value.startsWith("0b")) return sign * parseInt(value.slice(2), 2);
  if (value.startsWith("0x")) return sign * parseInt(value.slice(2), 16);
  if (value.includes(":")) {
    let result = 0;
    for (const part of value.split(":")) result = result * 60 + Number(part);
    return sign * result;
  }
  if (value !== "0" && value[0] === "0") return sign * parseInt(value, 8);
  return sign * parseInt(value, 10);
}
function resolveYamlInteger(source) {
  if (!YAML_INTEGER_PATTERN.test(source)) return NOT_RESOLVED;
  const result = parseYamlInteger(source);
  return Number.isFinite(result) ? result : NOT_RESOLVED;
}
var intYaml11Tag = defineScalarTag("tag:yaml.org,2002:int", {
  implicit: true,
  implicitFirstChars: [
    "-",
    "+",
    ..."0123456789"
  ],
  resolve: resolveYamlInteger,
  identify: (object) => Number.isInteger(object) && !Object.is(object, -0) && object.toString(10).indexOf("e") < 0,
  represent: (object) => object.toString(10)
});
var YAML_FLOAT_PATTERN$1 = /* @__PURE__ */ new RegExp("^(?:[-+]?[0-9]+(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|[-+]?\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
var YAML_FLOAT_SPECIAL_PATTERN$1 = /* @__PURE__ */ new RegExp("^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
function resolveYamlFloat$2(source) {
  if (!YAML_FLOAT_PATTERN$1.test(source)) return NOT_RESOLVED;
  let value = source.toLowerCase();
  const sign = value[0] === "-" ? -1 : 1;
  if ("+-".includes(value[0])) value = value.slice(1);
  if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  if (value === ".nan") return NaN;
  const result = sign * parseFloat(value);
  if (Number.isFinite(result) || YAML_FLOAT_SPECIAL_PATTERN$1.test(source)) return result;
  return NOT_RESOLVED;
}
function representYamlFloat$2(object) {
  if (isNaN(object)) return ".nan";
  if (object === Number.POSITIVE_INFINITY) return ".inf";
  if (object === Number.NEGATIVE_INFINITY) return "-.inf";
  if (Object.is(object, -0)) return "-0.0";
  const result = object.toString(10);
  return /^[-+]?[0-9]+e/.test(result) ? result.replace("e", ".e") : result;
}
var floatCoreTag = defineScalarTag("tag:yaml.org,2002:float", {
  implicit: true,
  implicitFirstChars: [
    "-",
    "+",
    ".",
    ..."0123456789"
  ],
  resolve: resolveYamlFloat$2,
  identify: (object) => typeof object === "number" && (!Number.isInteger(object) || Object.is(object, -0) || object.toString(10).indexOf("e") >= 0),
  represent: representYamlFloat$2
});
var YAML_FLOAT_IMPLICIT_PATTERN = /* @__PURE__ */ new RegExp("^-?(?:0|[1-9][0-9]*)(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$");
var YAML_FLOAT_EXPLICIT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?[0-9]+(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|[-+]?\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
function resolveYamlFloat$1(source, isExplicit) {
  if (isExplicit) {
    if (!YAML_FLOAT_EXPLICIT_PATTERN.test(source)) return NOT_RESOLVED;
    let value = source.toLowerCase();
    const sign = value[0] === "-" ? -1 : 1;
    if ("+-".includes(value[0])) value = value.slice(1);
    if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    if (value === ".nan") return NaN;
    const result2 = sign * parseFloat(value);
    return Number.isFinite(result2) ? result2 : NOT_RESOLVED;
  }
  if (!YAML_FLOAT_IMPLICIT_PATTERN.test(source)) return NOT_RESOLVED;
  const result = Number(source);
  if (Number.isFinite(result)) return result;
  return NOT_RESOLVED;
}
function representYamlFloat$1(object) {
  if (isNaN(object)) return ".nan";
  if (object === Number.POSITIVE_INFINITY) return ".inf";
  if (object === Number.NEGATIVE_INFINITY) return "-.inf";
  if (Object.is(object, -0)) return "-0.0";
  const result = object.toString(10);
  return /^[-+]?[0-9]+e/.test(result) ? result.replace("e", ".e") : result;
}
var floatJsonTag = defineScalarTag("tag:yaml.org,2002:float", {
  implicit: true,
  implicitFirstChars: ["-", ..."0123456789"],
  resolve: resolveYamlFloat$1,
  identify: (object) => typeof object === "number" && (!Number.isInteger(object) || Object.is(object, -0) || object.toString(10).indexOf("e") >= 0),
  represent: representYamlFloat$1
});
var YAML_FLOAT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?(?:(?:[0-9][0-9_]*)?\\.[0-9_]*)(?:[eE][-+][0-9]+)?|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
var YAML_FLOAT_SPECIAL_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
function resolveYamlFloat(source) {
  if (!YAML_FLOAT_PATTERN.test(source)) return NOT_RESOLVED;
  let value = source.toLowerCase().replace(/_/g, "");
  const sign = value[0] === "-" ? -1 : 1;
  if ("+-".includes(value[0])) value = value.slice(1);
  if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  if (value === ".nan") return NaN;
  let result = 0;
  if (value.includes(":")) {
    for (const part of value.split(":")) result = result * 60 + Number(part);
    result *= sign;
  } else result = sign * parseFloat(value);
  if (Number.isFinite(result) || YAML_FLOAT_SPECIAL_PATTERN.test(source)) return result;
  return NOT_RESOLVED;
}
function representYamlFloat(object) {
  if (isNaN(object)) return ".nan";
  if (object === Number.POSITIVE_INFINITY) return ".inf";
  if (object === Number.NEGATIVE_INFINITY) return "-.inf";
  if (Object.is(object, -0)) return "-0.0";
  const result = object.toString(10);
  return /^[-+]?[0-9]+e/.test(result) ? result.replace("e", ".e") : result;
}
var floatYaml11Tag = defineScalarTag("tag:yaml.org,2002:float", {
  implicit: true,
  implicitFirstChars: [
    "-",
    "+",
    ".",
    ..."0123456789"
  ],
  resolve: resolveYamlFloat,
  identify: (object) => typeof object === "number" && (!Number.isInteger(object) || Object.is(object, -0) || object.toString(10).indexOf("e") >= 0),
  represent: representYamlFloat
});
var mergeTag = defineScalarTag("tag:yaml.org,2002:merge", {
  implicit: true,
  implicitFirstChars: ["<"],
  resolve: (source, isExplicit) => {
    if (source === "<<" || isExplicit && source === "") return "<<";
    return NOT_RESOLVED;
  },
  identify: () => false
});
var BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;
function resolveYamlBinary(source) {
  const input = source.replace(/\s/g, "");
  if (input.length % 4 !== 0 || !BASE64_PATTERN.test(input)) return NOT_RESOLVED;
  const binary = atob(input);
  const result = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) result[index] = binary.charCodeAt(index);
  return result;
}
function representYamlBinary(object) {
  let binary = "";
  for (let index = 0; index < object.length; index++) binary += String.fromCharCode(object[index]);
  return btoa(binary);
}
var binaryTag = defineScalarTag("tag:yaml.org,2002:binary", {
  resolve: resolveYamlBinary,
  identify: (object) => Object.prototype.toString.call(object) === "[object Uint8Array]",
  represent: representYamlBinary
});
var YAML_DATE_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$");
var YAML_TIMESTAMP_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");
function makeUtcDate(year, month, day, hour = 0, minute = 0, second = 0, fraction = 0) {
  const date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
  date.setUTCFullYear(year, month, day);
  return date;
}
function resolveYamlTimestamp(source) {
  let match2 = YAML_DATE_REGEXP.exec(source);
  if (match2 === null) match2 = YAML_TIMESTAMP_REGEXP.exec(source);
  if (match2 === null) return NOT_RESOLVED;
  const year = +match2[1];
  const month = +match2[2] - 1;
  const day = +match2[3];
  if (!match2[4]) {
    const date2 = makeUtcDate(year, month, day);
    if (date2.getUTCFullYear() !== year || date2.getUTCMonth() !== month || date2.getUTCDate() !== day) return NOT_RESOLVED;
    return date2;
  }
  const hour = +match2[4];
  const minute = +match2[5];
  const second = +match2[6];
  let fraction = 0;
  if (hour > 23 || minute > 59 || second > 59) return NOT_RESOLVED;
  if (match2[7]) {
    let value = match2[7].slice(0, 3);
    while (value.length < 3) value += "0";
    fraction = +value;
  }
  const date = makeUtcDate(year, month, day, hour, minute, second, fraction);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return NOT_RESOLVED;
  if (match2[9]) {
    const offsetHour = +match2[10];
    const offsetMinute = +(match2[11] || 0);
    if (offsetHour > 23 || offsetMinute > 59) return NOT_RESOLVED;
    const offset = (offsetHour * 60 + offsetMinute) * 6e4;
    date.setTime(date.getTime() - (match2[9] === "-" ? -offset : offset));
  }
  return date;
}
var timestampTag = defineScalarTag("tag:yaml.org,2002:timestamp", {
  implicit: true,
  implicitFirstChars: [..."0123456789"],
  resolve: resolveYamlTimestamp,
  identify: (object) => object instanceof Date,
  represent: (object) => object.toISOString()
});
var seqTag = defineSequenceTag("tag:yaml.org,2002:seq", {
  create: () => [],
  addItem: (container, item) => {
    container.push(item);
  },
  identify: Array.isArray
});
function isPlainObject(data) {
  if (data === null || typeof data !== "object" || Array.isArray(data)) return false;
  const prototype = Object.getPrototypeOf(data);
  return prototype === null || prototype === Object.prototype;
}
function pick(object, keys) {
  const result = {};
  for (const key of keys) if (object[key] !== void 0) result[key] = object[key];
  return result;
}
var omapTag = defineSequenceTag("tag:yaml.org,2002:omap", {
  create: () => ({
    list: [],
    seen: /* @__PURE__ */ new Set()
  }),
  addItem: (carrier, item) => {
    let key;
    if (item instanceof Map) {
      if (item.size !== 1) return "cannot resolve an ordered map item";
      key = item.keys().next().value;
    } else if (isPlainObject(item)) {
      const itemKeys = Object.keys(item);
      if (itemKeys.length !== 1) return "cannot resolve an ordered map item";
      key = itemKeys[0];
    } else return "cannot resolve an ordered map item";
    if (carrier.seen.has(key)) return "duplicate key in ordered map";
    carrier.seen.add(key);
    carrier.list.push(item);
    return "";
  },
  finalize: (carrier) => carrier.list,
  identify: () => false
});
var pairsTag = defineSequenceTag("tag:yaml.org,2002:pairs", {
  create: () => [],
  addItem: (container, item) => {
    if (item instanceof Map) {
      if (item.size !== 1) return "cannot resolve a pairs item";
      container.push(item.entries().next().value);
      return "";
    }
    if (Object.prototype.toString.call(item) !== "[object Object]") return "cannot resolve a pairs item";
    const object = item;
    const keys = Object.keys(object);
    if (keys.length !== 1) return "cannot resolve a pairs item";
    container.push([keys[0], object[keys[0]]]);
    return "";
  },
  identify: () => false
});
var mapTag = defineMappingTag("tag:yaml.org,2002:map", {
  create: () => ({}),
  identify: isPlainObject,
  represent: (o) => {
    const map = /* @__PURE__ */ new Map();
    for (const key of Object.keys(o)) map.set(key, o[key]);
    return map;
  },
  addPair: (container, key, value) => {
    if (key !== null && typeof key === "object") return "object-based map does not support complex keys";
    const normalizedKey = String(key);
    if (normalizedKey === "__proto__") Object.defineProperty(container, normalizedKey, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
    else container[normalizedKey] = value;
    return "";
  },
  has: (container, key) => {
    if (key !== null && typeof key === "object") return false;
    return Object.prototype.hasOwnProperty.call(container, String(key));
  },
  keys: (container) => Object.keys(container),
  get: (container, key) => {
    const normalizedKey = String(key);
    if (!Object.prototype.hasOwnProperty.call(container, normalizedKey)) return null;
    return container[normalizedKey];
  }
});
var setTag = defineMappingTag("tag:yaml.org,2002:set", {
  create: () => /* @__PURE__ */ new Set(),
  identify: (data) => data instanceof Set,
  represent: (data) => {
    const map = /* @__PURE__ */ new Map();
    for (const key of data) map.set(key, null);
    return map;
  },
  addPair: (container, key, value) => {
    if (value !== null) return "cannot resolve a set item";
    container.add(key);
    return "";
  },
  has: (container, key) => container.has(key),
  keys: (container) => container.keys(),
  get: () => null
});
function createTagDefinitionMap() {
  return {
    scalar: /* @__PURE__ */ Object.create(null),
    sequence: /* @__PURE__ */ Object.create(null),
    mapping: /* @__PURE__ */ Object.create(null)
  };
}
function createTagDefinitionListMap() {
  return {
    scalar: [],
    sequence: [],
    mapping: []
  };
}
function compileTags(tags) {
  const result = [];
  for (const tag of tags) {
    let index = result.length;
    for (let previousIndex = 0; previousIndex < result.length; previousIndex++) {
      const previous = result[previousIndex];
      if (previous.nodeKind === tag.nodeKind && previous.tagName === tag.tagName && previous.matchByTagPrefix === tag.matchByTagPrefix) {
        index = previousIndex;
        break;
      }
    }
    result[index] = tag;
  }
  return result;
}
var Schema = class Schema2 {
  tags;
  /** @internal */
  implicitScalarTags;
  /**
  * Dispatch implicit scalar resolvers by `source.charAt(0)`. Each bucket holds
  * the resolvers that may match that key, in schema order; a key absent from
  * the map uses
  * {@link Schema.implicitScalarAnyFirstChar}
  * (resolvers that declared no first-char constraint, so they apply to any
  * first character).
  */
  implicitScalarByFirstChar;
  implicitScalarAnyFirstChar;
  /**
  * The default scalar tag (`!!str`), resolved once so the composer's fallback
  * for unresolved plain scalars avoids a keyed lookup per scalar.
  *
  * @internal
  */
  defaultScalarTag;
  /**
  * The default container tags (`!!seq` / `!!map`), used by the dumper: when a
  * value is identified by its default tag, the tag is implicit and not
  * printed. Undefined if the schema does not define them (then such values
  * can't be dumped).
  *
  * @internal
  */
  defaultSequenceTag;
  /** @internal */
  defaultMappingTag;
  exact;
  prefix;
  constructor(tags) {
    const compiledTags = compileTags(tags);
    const implicitScalarTags = [];
    const exact = createTagDefinitionMap();
    const prefix = createTagDefinitionListMap();
    for (const tag of compiledTags) {
      if (tag.nodeKind === "scalar" && tag.implicit) {
        if (tag.matchByTagPrefix) throw new Error("Implicit scalar tags cannot match by tag prefix");
        implicitScalarTags.push(tag);
      }
      switch (tag.nodeKind) {
        case "scalar":
          if (tag.matchByTagPrefix) prefix.scalar.push(tag);
          else exact.scalar[tag.tagName] = tag;
          break;
        case "sequence":
          if (tag.matchByTagPrefix) prefix.sequence.push(tag);
          else exact.sequence[tag.tagName] = tag;
          break;
        case "mapping":
          if (tag.matchByTagPrefix) prefix.mapping.push(tag);
          else exact.mapping[tag.tagName] = tag;
      }
    }
    const implicitScalarAnyFirstChar = implicitScalarTags.filter((tag) => tag.implicitFirstChars === null);
    const keys = /* @__PURE__ */ new Set();
    for (const tag of implicitScalarTags) if (tag.implicitFirstChars !== null) for (const key of tag.implicitFirstChars) keys.add(key);
    const implicitScalarByFirstChar = /* @__PURE__ */ new Map();
    for (const key of keys) implicitScalarByFirstChar.set(key, implicitScalarTags.filter((tag) => tag.implicitFirstChars === null || tag.implicitFirstChars.indexOf(key) !== -1));
    const defaultScalarTag = exact.scalar["tag:yaml.org,2002:str"];
    if (!defaultScalarTag) throw new Error("schema does not define the default scalar tag (tag:yaml.org,2002:str)");
    this.tags = compiledTags;
    this.implicitScalarTags = implicitScalarTags;
    this.implicitScalarByFirstChar = implicitScalarByFirstChar;
    this.implicitScalarAnyFirstChar = implicitScalarAnyFirstChar;
    this.defaultScalarTag = defaultScalarTag;
    this.defaultSequenceTag = exact.sequence["tag:yaml.org,2002:seq"];
    this.defaultMappingTag = exact.mapping["tag:yaml.org,2002:map"];
    this.exact = exact;
    this.prefix = prefix;
  }
  /** @internal */
  lookupScalarTag(tagName) {
    const exactTag = this.exact.scalar[tagName];
    if (exactTag) return exactTag;
    for (const tag of this.prefix.scalar) if (tagName.startsWith(tag.tagName)) return tag;
  }
  /** @internal */
  lookupSequenceTag(tagName) {
    const exactTag = this.exact.sequence[tagName];
    if (exactTag) return exactTag;
    for (const tag of this.prefix.sequence) if (tagName.startsWith(tag.tagName)) return tag;
  }
  /** @internal */
  lookupMappingTag(tagName) {
    const exactTag = this.exact.mapping[tagName];
    if (exactTag) return exactTag;
    for (const tag of this.prefix.mapping) if (tagName.startsWith(tag.tagName)) return tag;
  }
  /** @internal */
  resolveImplicitScalarTag(source) {
    const candidates = this.implicitScalarByFirstChar.get(source.charAt(0)) ?? this.implicitScalarAnyFirstChar;
    for (const tag2 of candidates) {
      const value = tag2.resolve(source, false, tag2.tagName);
      if (value !== NOT_RESOLVED) return {
        value,
        tag: tag2
      };
    }
    const tag = this.defaultScalarTag;
    return {
      value: tag.resolve(source, false, tag.tagName),
      tag
    };
  }
  /**
  * Creates a new schema with the specified tags added. If a tag already
  * exists, it is replaced by the specified tag.
  *
  * @example
  *
  * ```javascript
  * import { CORE_SCHEMA, mergeTag, realMapTag } from 'js-yaml'
  *
  * const schema = CORE_SCHEMA.withTags(mergeTag, realMapTag)
  * ```
  */
  withTags(...tags) {
    let flatTags = [];
    for (const tag of tags) flatTags = flatTags.concat(tag);
    return new Schema2([...this.tags, ...flatTags]);
  }
};
var FAILSAFE_SCHEMA = new Schema([
  strTag,
  seqTag,
  mapTag
]);
var JSON_SCHEMA = new Schema([
  ...FAILSAFE_SCHEMA.tags,
  nullJsonTag,
  boolJsonTag,
  intJsonTag,
  floatJsonTag
]);
var CORE_SCHEMA = new Schema([
  ...FAILSAFE_SCHEMA.tags,
  nullCoreTag,
  boolCoreTag,
  intCoreTag,
  floatCoreTag
]);
var YAML11_SCHEMA = new Schema([
  ...FAILSAFE_SCHEMA.tags,
  nullYaml11Tag,
  boolYaml11Tag,
  intYaml11Tag,
  floatYaml11Tag,
  timestampTag,
  mergeTag,
  binaryTag,
  omapTag,
  pairsTag,
  setTag
]);
var DUMP_SCHEMA = YAML11_SCHEMA.withTags({
  ...intYaml11Tag,
  resolve: (source, isExplicit, tagName) => {
    const result = intYaml11Tag.resolve(source, isExplicit, tagName);
    return result === NOT_RESOLVED ? intCoreTag.resolve(source, isExplicit, tagName) : result;
  }
}, {
  ...floatYaml11Tag,
  resolve: (source, isExplicit, tagName) => {
    const result = floatYaml11Tag.resolve(source, isExplicit, tagName);
    return result === NOT_RESOLVED ? floatCoreTag.resolve(source, isExplicit, tagName) : result;
  }
});
var realMapTag = defineMappingTag("tag:yaml.org,2002:map", {
  create: () => /* @__PURE__ */ new Map(),
  addPair: (container, key, value) => {
    container.set(key, value);
    return "";
  },
  has: (container, key) => container.has(key),
  keys: (container) => container.keys(),
  get: (container, key) => container.get(key),
  identify: (data) => data instanceof Map || isPlainObject(data),
  represent: (data) => {
    if (data instanceof Map) return data;
    const map = /* @__PURE__ */ new Map();
    const obj = data;
    for (const key of Object.keys(obj)) map.set(key, obj[key]);
    return map;
  }
});
function normalizeKey(key) {
  if (Array.isArray(key)) {
    const array = Array.prototype.slice.call(key);
    for (let index = 0; index < array.length; index++) {
      if (Array.isArray(array[index])) return null;
      if (typeof array[index] === "object" && Object.prototype.toString.call(array[index]) === "[object Object]") array[index] = "[object Object]";
    }
    return String(array);
  }
  if (typeof key === "object" && Object.prototype.toString.call(key) === "[object Object]") return "[object Object]";
  return String(key);
}
var legacyMapTag = defineMappingTag("tag:yaml.org,2002:map", {
  create: () => ({}),
  identify: isPlainObject,
  represent: (o) => {
    const map = /* @__PURE__ */ new Map();
    for (const key of Object.keys(o)) map.set(key, o[key]);
    return map;
  },
  addPair: (container, key, value) => {
    const normalizedKey = normalizeKey(key);
    if (normalizedKey === null) return "nested arrays are not supported inside keys";
    if (normalizedKey === "__proto__") Object.defineProperty(container, normalizedKey, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
    else container[normalizedKey] = value;
    return "";
  },
  has: (container, key) => {
    const normalizedKey = normalizeKey(key);
    return normalizedKey !== null && Object.prototype.hasOwnProperty.call(container, normalizedKey);
  },
  keys: (container) => Object.keys(container),
  get: (container, key) => {
    const normalizedKey = String(key);
    if (!Object.prototype.hasOwnProperty.call(container, normalizedKey)) return null;
    return container[normalizedKey];
  }
});
var DEFAULT_SNIPPET_OPTIONS = {
  maxLength: 79,
  indent: 1,
  linesBefore: 3,
  linesAfter: 2
};
function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
  let head = "";
  let tail = "";
  const maxHalfLength = Math.floor(maxLineLength / 2) - 1;
  if (position - lineStart > maxHalfLength) {
    head = " ... ";
    lineStart = position - maxHalfLength + head.length;
  }
  if (lineEnd - position > maxHalfLength) {
    tail = " ...";
    lineEnd = position + maxHalfLength - tail.length;
  }
  return {
    str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
    pos: position - lineStart + head.length
  };
}
function padStart(string, max) {
  return " ".repeat(Math.max(max - string.length, 0)) + string;
}
function makeSnippet(mark, options) {
  if (!mark.buffer) return null;
  const opts = {
    ...DEFAULT_SNIPPET_OPTIONS,
    ...options
  };
  const re = /\r?\n|\r|\0/g;
  const lineStarts = [0];
  const lineEnds = [];
  let match2;
  let foundLineNo = -1;
  while (match2 = re.exec(mark.buffer)) {
    lineEnds.push(match2.index);
    lineStarts.push(match2.index + match2[0].length);
    if (mark.position <= match2.index && foundLineNo < 0) foundLineNo = lineStarts.length - 2;
  }
  if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
  let result = "";
  const lineNoLength = Math.min(mark.line + opts.linesAfter, lineEnds.length).toString().length;
  const maxLineLength = opts.maxLength - (opts.indent + lineNoLength + 3);
  for (let i = 1; i <= opts.linesBefore; i++) {
    if (foundLineNo - i < 0) break;
    const line2 = getLine(mark.buffer, lineStarts[foundLineNo - i], lineEnds[foundLineNo - i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]), maxLineLength);
    result = `${" ".repeat(opts.indent)}${padStart((mark.line - i + 1).toString(), lineNoLength)} | ${line2.str}
${result}`;
  }
  const line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
  result += `${" ".repeat(opts.indent)}${padStart((mark.line + 1).toString(), lineNoLength)} | ${line.str}
`;
  result += `${"-".repeat(opts.indent + lineNoLength + 3 + line.pos)}^
`;
  for (let i = 1; i <= opts.linesAfter; i++) {
    if (foundLineNo + i >= lineEnds.length) break;
    const line2 = getLine(mark.buffer, lineStarts[foundLineNo + i], lineEnds[foundLineNo + i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]), maxLineLength);
    result += `${" ".repeat(opts.indent)}${padStart((mark.line + i + 1).toString(), lineNoLength)} | ${line2.str}
`;
  }
  return result.replace(/\n$/, "");
}
function formatError(exception, compact) {
  let where = "";
  if (!exception.mark) return exception.reason;
  if (exception.mark.name) where += `in "${exception.mark.name}" `;
  where += `(${exception.mark.line + 1}:${exception.mark.column + 1})`;
  if (!compact && exception.mark.snippet) where += `

${exception.mark.snippet}`;
  return `${exception.reason} ${where}`;
}
var YAMLException = class YAMLException2 extends Error {
  reason;
  mark;
  /**
  * Optional `mark` contains source snippet data. Usually, use
  * {@link YAMLException.throwAt} instead of passing it directly.
  */
  constructor(reason, mark) {
    super();
    this.name = "YAMLException";
    this.reason = reason;
    this.mark = mark;
    this.message = formatError(this, false);
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
  }
  /**
  * Returns the formatted error, omitting the source snippet in compact mode.
  */
  toString(compact) {
    return `${this.name}: ${formatError(this, compact)}`;
  }
  /**
  * Builds a YAMLException with a source snippet and throws it. `source` is
  * the raw input text; `position` is an offset into it.
  */
  static throwAt(source, position, message, filename = "") {
    let line = 0;
    let lineStart = 0;
    for (let index = 0; index < position; index++) {
      const ch = source.charCodeAt(index);
      if (ch === 10) {
        line++;
        lineStart = index + 1;
      } else if (ch === 13) {
        line++;
        if (source.charCodeAt(index + 1) === 10) index++;
        lineStart = index + 1;
      }
    }
    const mark = {
      name: filename,
      buffer: source,
      position,
      line,
      column: position - lineStart
    };
    mark.snippet = makeSnippet(mark);
    throw new YAMLException2(message, mark);
  }
};
var EVENT_ID = {
  DOCUMENT: 1,
  SEQUENCE: 2,
  MAPPING: 3,
  SCALAR: 4,
  ALIAS: 5,
  POP: 6
};
var SCALAR_STYLE = {
  PLAIN: 1,
  SINGLE_QUOTED: 2,
  DOUBLE_QUOTED: 3,
  LITERAL_BLOCK: 4,
  FOLDED_BLOCK: 5
};
var COLLECTION_STYLE = {
  BLOCK: 1,
  FLOW: 2
};
var CHOMPING_MODE = {
  CLIP: 1,
  STRIP: 2,
  KEEP: 3
};
var NO_RANGE$3 = -1;
function simpleEscapeSequence(c) {
  switch (c) {
    case 48:
      return "\0";
    case 97:
      return "\x07";
    case 98:
      return "\b";
    case 116:
      return "	";
    case 9:
      return "	";
    case 110:
      return "\n";
    case 118:
      return "\v";
    case 102:
      return "\f";
    case 114:
      return "\r";
    case 101:
      return "\x1B";
    case 32:
      return " ";
    case 34:
      return '"';
    case 47:
      return "/";
    case 92:
      return "\\";
    case 78:
      return "\x85";
    case 95:
      return "\xA0";
    case 76:
      return "\u2028";
    case 80:
      return "\u2029";
    default:
      return "";
  }
}
var simpleEscapeCheck = new Array(256);
var simpleEscapeMap = new Array(256);
for (let i = 0; i < 256; i++) {
  simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
  simpleEscapeMap[i] = simpleEscapeSequence(i);
}
function charFromCodepoint(c) {
  if (c <= 65535) return String.fromCharCode(c);
  return String.fromCharCode((c - 65536 >> 10) + 55296, (c - 65536 & 1023) + 56320);
}
function fromHexCode$1(c) {
  if (c >= 48 && c <= 57) return c - 48;
  return (c | 32) - 97 + 10;
}
function escapedHexLen$1(c) {
  if (c === 120) return 2;
  if (c === 117) return 4;
  return 8;
}
function skipFoldedBreaks(input, position, end) {
  let breaks = 0;
  while (position < end) {
    const ch = input.charCodeAt(position);
    if (ch === 10) {
      breaks++;
      position++;
    } else if (ch === 13) {
      breaks++;
      position++;
      if (input.charCodeAt(position) === 10) position++;
    } else if (ch === 32 || ch === 9) position++;
    else break;
  }
  return {
    position,
    breaks
  };
}
function foldedBreaks(count) {
  if (count === 1) return " ";
  return "\n".repeat(count - 1);
}
function getPlainValue(input, start, end) {
  let result = "";
  let position = start;
  let captureStart = start;
  let captureEnd = start;
  while (position < end) {
    const ch = input.charCodeAt(position);
    if (ch === 10 || ch === 13) {
      result += input.slice(captureStart, captureEnd);
      const fold = skipFoldedBreaks(input, position, end);
      result += foldedBreaks(fold.breaks);
      position = captureStart = captureEnd = fold.position;
    } else {
      position++;
      if (ch !== 32 && ch !== 9) captureEnd = position;
    }
  }
  return result + input.slice(captureStart, captureEnd);
}
function getSingleQuotedValue(input, start, end) {
  let result = "";
  let position = start;
  let captureStart = start;
  let captureEnd = start;
  while (position < end) {
    const ch = input.charCodeAt(position);
    if (ch === 39) {
      result += input.slice(captureStart, position) + "'";
      position += 2;
      captureStart = captureEnd = position;
    } else if (ch === 10 || ch === 13) {
      result += input.slice(captureStart, captureEnd);
      const fold = skipFoldedBreaks(input, position, end);
      result += foldedBreaks(fold.breaks);
      position = captureStart = captureEnd = fold.position;
    } else {
      position++;
      if (ch !== 32 && ch !== 9) captureEnd = position;
    }
  }
  return result + input.slice(captureStart, end);
}
function getDoubleQuotedValue(input, start, end) {
  let result = "";
  let position = start;
  let captureStart = start;
  let captureEnd = start;
  while (position < end) {
    const ch = input.charCodeAt(position);
    if (ch === 92) {
      result += input.slice(captureStart, position);
      position++;
      const escaped = input.charCodeAt(position);
      if (escaped === 10 || escaped === 13) position = skipFoldedBreaks(input, position, end).position;
      else if (escaped < 256 && simpleEscapeCheck[escaped]) {
        result += simpleEscapeMap[escaped];
        position++;
      } else {
        let hexLength = escapedHexLen$1(escaped);
        let hexResult = 0;
        for (; hexLength > 0; hexLength--) {
          position++;
          const digit = fromHexCode$1(input.charCodeAt(position));
          hexResult = (hexResult << 4) + digit;
        }
        result += charFromCodepoint(hexResult);
        position++;
      }
      captureStart = captureEnd = position;
    } else if (ch === 10 || ch === 13) {
      result += input.slice(captureStart, captureEnd);
      const fold = skipFoldedBreaks(input, position, end);
      result += foldedBreaks(fold.breaks);
      position = captureStart = captureEnd = fold.position;
    } else {
      position++;
      if (ch !== 32 && ch !== 9) captureEnd = position;
    }
  }
  return result + input.slice(captureStart, end);
}
function getBlockValue(input, start, end, indent, chomping, folded) {
  const textIndent = indent < 0 ? 0 : indent;
  const region = input.slice(start, end).replace(/\r\n?/g, "\n");
  const lines = region === "" ? [] : (region.endsWith("\n") ? region.slice(0, -1) : region).split("\n");
  let result = "";
  let didReadContent = false;
  let emptyLines = 0;
  let atMoreIndented = false;
  for (const line of lines) {
    let column = 0;
    while (column < textIndent && line.charCodeAt(column) === 32) column++;
    if (indent < 0 || column >= line.length) {
      emptyLines++;
      continue;
    }
    const content = line.slice(textIndent);
    const first = content.charCodeAt(0);
    if (folded) {
      if (first === 32 || first === 9) {
        atMoreIndented = true;
        result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);
      } else if (atMoreIndented) {
        atMoreIndented = false;
        result += "\n".repeat(emptyLines + 1);
      } else if (emptyLines === 0) {
        if (didReadContent) result += " ";
      } else result += "\n".repeat(emptyLines);
    } else result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);
    result += content;
    didReadContent = true;
    emptyLines = 0;
  }
  if (chomping === CHOMPING_MODE.KEEP) result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);
  else if (chomping !== CHOMPING_MODE.STRIP) {
    if (didReadContent) result += "\n";
  }
  return result;
}
function getScalarValue(input, scalar) {
  if (scalar.valueStart === NO_RANGE$3) return "";
  const { valueStart, valueEnd } = scalar;
  if (scalar.fast) return input.slice(valueStart, valueEnd);
  switch (scalar.style) {
    case SCALAR_STYLE.SINGLE_QUOTED:
      return getSingleQuotedValue(input, valueStart, valueEnd);
    case SCALAR_STYLE.DOUBLE_QUOTED:
      return getDoubleQuotedValue(input, valueStart, valueEnd);
    case SCALAR_STYLE.LITERAL_BLOCK:
      return getBlockValue(input, valueStart, valueEnd, scalar.indent, scalar.chomping, false);
    case SCALAR_STYLE.FOLDED_BLOCK:
      return getBlockValue(input, valueStart, valueEnd, scalar.indent, scalar.chomping, true);
    default:
      return getPlainValue(input, valueStart, valueEnd);
  }
}
var DEFAULT_TAG_HANDLERS = Object.assign(/* @__PURE__ */ Object.create(null), {
  "!": "!",
  "!!": "tag:yaml.org,2002:"
});
var TAG_SUFFIX_CHARS = "-#;/?:@&=+$_.~*'()";
var TAG_URI_CHARS = TAG_SUFFIX_CHARS + "!,[]";
function tagPercentDecode(source) {
  let result = "";
  let index = 0;
  while (index < source.length) {
    if (source.charCodeAt(index) !== 37) {
      result += source[index++];
      continue;
    }
    let ch = parseInt(source.slice(index + 1, index + 3), 16);
    index += 3;
    if (ch >= 192) {
      let remaining = ch < 224 ? 1 : ch < 240 ? 2 : 3;
      ch &= (1 << 6 - remaining) - 1;
      while (remaining-- > 0) {
        ch = ch << 6 | parseInt(source.slice(index + 1, index + 3), 16) & 63;
        index += 3;
      }
    }
    if (ch < 65536) result += String.fromCharCode(ch);
    else {
      ch -= 65536;
      result += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
    }
  }
  return result;
}
function tagNameFull(rawTag, tagHandlers) {
  if (rawTag.startsWith("!<") && rawTag.endsWith(">")) return tagPercentDecode(rawTag.slice(2, -1));
  const handleEnd = rawTag.indexOf("!", 1);
  const handle = handleEnd === -1 ? "!" : rawTag.slice(0, handleEnd + 1);
  return tagPercentDecode(tagHandlers?.[handle] ?? DEFAULT_TAG_HANDLERS[handle] ?? handle) + tagPercentDecode(rawTag.slice(handle.length));
}
var NO_RANGE$2 = -1;
var MERGE_TAG_NAME = "tag:yaml.org,2002:merge";
var DEFAULT_CONSTRUCTOR_OPTIONS = {
  filename: "",
  schema: CORE_SCHEMA,
  json: false,
  maxTotalMergeKeys: 1e4,
  maxAliases: -1
};
function eventPosition$1(event) {
  if ("tagStart" in event && event.tagStart !== NO_RANGE$2) return event.tagStart;
  if ("anchorStart" in event && event.anchorStart !== NO_RANGE$2) return event.anchorStart;
  if ("valueStart" in event && event.valueStart !== NO_RANGE$2) return event.valueStart;
  if ("start" in event) return event.start;
  return 0;
}
function throwError$1(state, message) {
  YAMLException.throwAt(state.source, state.position, message, state.filename);
}
function finalizeCollection(state, position, tag, carrier) {
  try {
    return tag.finalize(carrier);
  } catch (error) {
    if (error instanceof YAMLException) throw error;
    YAMLException.throwAt(state.source, position, error instanceof Error ? error.message : String(error), state.filename);
  }
}
function constructScalar(state, event) {
  const source = getScalarValue(state.source, event);
  const rawTag = event.tagStart === NO_RANGE$2 ? "" : state.source.slice(event.tagStart, event.tagEnd);
  const strTag2 = state.schema.defaultScalarTag;
  if (rawTag !== "") {
    if (rawTag === "!") return {
      value: source,
      tag: strTag2
    };
    const tagName = tagNameFull(rawTag, state.tagHandlers);
    const scalarTag = state.schema.lookupScalarTag(tagName);
    if (scalarTag) {
      const result = scalarTag.resolve(source, true, tagName);
      if (result === NOT_RESOLVED) throwError$1(state, `cannot resolve a node with !<${tagName}> explicit tag`);
      return {
        value: result,
        tag: scalarTag
      };
    }
    const collectionTagDef = state.schema.lookupMappingTag(tagName) ?? state.schema.lookupSequenceTag(tagName);
    if (collectionTagDef) {
      if (source !== "") throwError$1(state, `cannot resolve a node with !<${tagName}> explicit tag`);
      const carrier = collectionTagDef.create(tagName);
      return {
        value: collectionTagDef.carrierIsResult ? carrier : finalizeCollection(state, state.position, collectionTagDef, carrier),
        tag: collectionTagDef
      };
    }
    throwError$1(state, `unknown scalar tag !<${tagName}>`);
  }
  if (event.style === SCALAR_STYLE.PLAIN) return state.schema.resolveImplicitScalarTag(source);
  return {
    value: strTag2.resolve(source, false, strTag2.tagName),
    tag: strTag2
  };
}
function collectionTagName(state, event, defaultTagName) {
  const rawTag = event.tagStart === NO_RANGE$2 ? "" : state.source.slice(event.tagStart, event.tagEnd);
  return rawTag === "" || rawTag === "!" ? defaultTagName : tagNameFull(rawTag, state.tagHandlers);
}
function isMappingTag(tag) {
  return tag.nodeKind === "mapping";
}
function chargeMergeWork(state) {
  state.totalMergeKeys++;
  if (state.maxTotalMergeKeys !== -1 && state.totalMergeKeys > state.maxTotalMergeKeys) throwError$1(state, `merge keys exceeded maxTotalMergeKeys (${state.maxTotalMergeKeys})`);
}
function mergeKeys(state, frame, source, sourceTag) {
  chargeMergeWork(state);
  for (const sourceKey of sourceTag.keys(source)) {
    chargeMergeWork(state);
    if (frame.tag.has(frame.value, sourceKey)) continue;
    const err = frame.tag.addPair(frame.value, sourceKey, sourceTag.get(source, sourceKey));
    if (err) throwError$1(state, err);
    frame.overridable ??= /* @__PURE__ */ new Set();
    frame.overridable.add(sourceKey);
  }
}
function mergeSource(state, frame, source, sourceTag) {
  state.position = frame.keyPosition;
  if (isMappingTag(sourceTag)) mergeKeys(state, frame, source, sourceTag);
  else if (sourceTag.nodeKind === "sequence" && Array.isArray(source)) {
    if (source.length > 100) throwError$1(state, "abnormal merge sequence size");
    for (const element of source) {
      const elementTag = state.nodeTags.get(element);
      if (!elementTag) throwError$1(state, "cannot merge mappings; the provided source object is unacceptable");
      mergeKeys(state, frame, element, elementTag);
    }
  } else throwError$1(state, "cannot merge mappings; the provided source object is unacceptable");
}
function addMappingValue(state, frame, key, value, tag) {
  state.position = frame.keyPosition;
  if (frame.keyIsMerge) {
    mergeSource(state, frame, value, tag);
    return;
  }
  if (!state.json && frame.tag.has(frame.value, key) && !frame.overridable?.has(key)) throwError$1(state, "duplicated mapping key");
  const err = frame.tag.addPair(frame.value, key, value);
  if (err) throwError$1(state, err);
  frame.overridable?.delete(key);
}
function addValue(state, value, tag) {
  const frame = state.frames[state.frames.length - 1];
  if (frame.kind === "document") {
    frame.value = value;
    frame.hasValue = true;
  } else if (frame.kind === "sequence") {
    if (isMappingTag(tag)) state.nodeTags.set(value, tag);
    const err = frame.tag.addItem(frame.value, value, frame.index++);
    if (err) throwError$1(state, err);
  } else if (frame.hasKey) {
    const key = frame.key;
    frame.key = void 0;
    frame.hasKey = false;
    addMappingValue(state, frame, key, value, tag);
  } else {
    frame.key = value;
    frame.keyPosition = state.position;
    frame.hasKey = true;
    frame.keyIsMerge = tag.tagName === MERGE_TAG_NAME;
  }
}
function storeAnchor(state, event, value, tag, isValueFinal) {
  if (event.anchorStart !== NO_RANGE$2) {
    const anchor = {
      value,
      tag,
      isValueFinal
    };
    state.anchors.set(state.source.slice(event.anchorStart, event.anchorEnd), anchor);
    return anchor;
  }
  return null;
}
function constructFromEvents(events, options) {
  const state = {
    ...DEFAULT_CONSTRUCTOR_OPTIONS,
    ...options,
    events,
    documents: [],
    eventIndex: 0,
    position: 0,
    frames: [],
    anchors: /* @__PURE__ */ new Map(),
    nodeTags: /* @__PURE__ */ new Map(),
    tagHandlers: /* @__PURE__ */ Object.create(null),
    totalMergeKeys: 0,
    aliasCount: 0
  };
  while (state.eventIndex < state.events.length) {
    const event = state.events[state.eventIndex++];
    state.position = eventPosition$1(event);
    switch (event.type) {
      case EVENT_ID.DOCUMENT:
        state.anchors = /* @__PURE__ */ new Map();
        state.nodeTags = /* @__PURE__ */ new Map();
        state.aliasCount = 0;
        state.tagHandlers = /* @__PURE__ */ Object.create(null);
        for (const directive of event.directives) if (directive.kind === "tag") state.tagHandlers[directive.handle] = directive.prefix;
        state.frames.push({
          kind: "document",
          position: state.position,
          value: void 0,
          hasValue: false
        });
        break;
      case EVENT_ID.SCALAR: {
        const { value, tag } = constructScalar(state, event);
        storeAnchor(state, event, value, tag, true);
        addValue(state, value, tag);
        break;
      }
      case EVENT_ID.SEQUENCE: {
        const tagName = collectionTagName(state, event, "tag:yaml.org,2002:seq");
        const tag = state.schema.lookupSequenceTag(tagName);
        if (!tag) throwError$1(state, `unknown sequence tag !<${tagName}>`);
        const value = tag.create(tagName);
        const anchor = storeAnchor(state, event, value, tag, tag.carrierIsResult);
        state.frames.push({
          kind: "sequence",
          position: state.position,
          value,
          tag,
          anchor,
          index: 0
        });
        break;
      }
      case EVENT_ID.MAPPING: {
        const tagName = collectionTagName(state, event, "tag:yaml.org,2002:map");
        const tag = state.schema.lookupMappingTag(tagName);
        if (!tag) throwError$1(state, `unknown mapping tag !<${tagName}>`);
        const value = tag.create(tagName);
        const anchor = storeAnchor(state, event, value, tag, tag.carrierIsResult);
        state.frames.push({
          kind: "mapping",
          position: state.position,
          value,
          tag,
          anchor,
          key: void 0,
          keyPosition: state.position,
          hasKey: false,
          keyIsMerge: false,
          overridable: null
        });
        break;
      }
      case EVENT_ID.ALIAS: {
        if (state.maxAliases !== -1 && ++state.aliasCount > state.maxAliases) throwError$1(state, `aliases exceeded maxAliases (${state.maxAliases})`);
        const name = state.source.slice(event.anchorStart, event.anchorEnd);
        const anchor = state.anchors.get(name);
        if (!anchor) throwError$1(state, `unidentified alias "${name}"`);
        if (!anchor.isValueFinal) throwError$1(state, `recursive alias "${name}" is not supported for tag ${anchor.tag.tagName} because it uses finalize()`);
        addValue(state, anchor.value, anchor.tag);
        break;
      }
      case EVENT_ID.POP: {
        const frame = state.frames.pop();
        if (frame.kind === "mapping" && frame.hasKey) {
          state.position = frame.keyPosition;
          throwError$1(state, "incomplete mapping pair in event stream");
        }
        if (frame.kind === "document") state.documents.push(frame.value);
        else {
          const value = frame.tag.carrierIsResult ? frame.value : finalizeCollection(state, frame.position, frame.tag, frame.value);
          if (frame.anchor) {
            frame.anchor.value = value;
            frame.anchor.isValueFinal = true;
          }
          addValue(state, value, frame.tag);
        }
        break;
      }
    }
  }
  return state.documents;
}
var NO_RANGE$1 = -1;
var HAS_OWN = Object.prototype.hasOwnProperty;
var CONTEXT_FLOW_IN = 1;
var CONTEXT_FLOW_OUT = 2;
var CONTEXT_BLOCK_IN = 3;
var CONTEXT_BLOCK_OUT = 4;
var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
var PATTERN_FLOW_INDICATORS = /[,\[\]{}]/;
var PATTERN_TAG_HANDLE = /^(?:!|!!|![0-9A-Za-z-]+!)$/;
var NS_URI_CHAR = String.raw`(?:%[0-9A-Fa-f]{2}|[0-9A-Za-z\-#;/?:@&=+$,_.!~*'()\[\]])`;
var NS_TAG_CHAR = String.raw`(?:%[0-9A-Fa-f]{2}|[0-9A-Za-z\-#;/?:@&=+$.~*'()_])`;
var PATTERN_TAG_URI = new RegExp(`^(?:${NS_URI_CHAR})*$`);
var PATTERN_TAG_SUFFIX = new RegExp(`^(?:${NS_TAG_CHAR})+$`);
var PATTERN_TAG_PREFIX = new RegExp(`^(?:!(?:${NS_URI_CHAR})*|${NS_TAG_CHAR}(?:${NS_URI_CHAR})*)$`);
var DEFAULT_PARSER_OPTIONS = {
  filename: "",
  maxDepth: 100
};
function addDocumentEvent(state, explicitStart, explicitEnd) {
  state.events.push({
    type: EVENT_ID.DOCUMENT,
    explicitStart,
    explicitEnd,
    directives: state.directives
  });
}
function addSequenceEvent(state, start, anchorStart, anchorEnd, tagStart, tagEnd, style) {
  state.events.push({
    type: EVENT_ID.SEQUENCE,
    start,
    anchorStart,
    anchorEnd,
    tagStart,
    tagEnd,
    style
  });
}
function addMappingEvent(state, start, anchorStart, anchorEnd, tagStart, tagEnd, style) {
  state.events.push({
    type: EVENT_ID.MAPPING,
    start,
    anchorStart,
    anchorEnd,
    tagStart,
    tagEnd,
    style
  });
}
function insertFlowPairMappingEvent(state, snapshot) {
  state.events.splice(snapshot.eventsLength, 0, {
    type: EVENT_ID.MAPPING,
    start: snapshot.position,
    anchorStart: NO_RANGE$1,
    anchorEnd: NO_RANGE$1,
    tagStart: NO_RANGE$1,
    tagEnd: NO_RANGE$1,
    style: COLLECTION_STYLE.FLOW
  });
}
function addScalarEvent(state, valueStart, valueEnd, anchorStart, anchorEnd, tagStart, tagEnd, style, chomping = CHOMPING_MODE.CLIP, indent = -1, fast = false) {
  state.events.push({
    type: EVENT_ID.SCALAR,
    valueStart,
    valueEnd,
    anchorStart,
    anchorEnd,
    tagStart,
    tagEnd,
    style,
    chomping,
    indent,
    fast
  });
}
function addAliasEvent(state, anchorStart, anchorEnd) {
  state.events.push({
    type: EVENT_ID.ALIAS,
    anchorStart,
    anchorEnd
  });
}
function addPopEvent(state) {
  state.events.push({ type: EVENT_ID.POP });
}
function addEmptyScalarEvent(state) {
  addScalarEvent(state, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, SCALAR_STYLE.PLAIN);
}
function emptyProperties() {
  return {
    anchorStart: NO_RANGE$1,
    anchorEnd: NO_RANGE$1,
    tagStart: NO_RANGE$1,
    tagEnd: NO_RANGE$1
  };
}
function snapshotState(state) {
  return {
    position: state.position,
    line: state.line,
    lineStart: state.lineStart,
    lineIndent: state.lineIndent,
    firstTabInLine: state.firstTabInLine,
    eventsLength: state.events.length
  };
}
function restoreState(state, snapshot) {
  state.position = snapshot.position;
  state.line = snapshot.line;
  state.lineStart = snapshot.lineStart;
  state.lineIndent = snapshot.lineIndent;
  state.firstTabInLine = snapshot.firstTabInLine;
  state.events.length = snapshot.eventsLength;
}
function throwError(state, message) {
  YAMLException.throwAt(state.input.slice(0, state.length), state.position, message, state.filename);
}
function isEol(c) {
  return c === 10 || c === 13;
}
function isWhiteSpace(c) {
  return c === 9 || c === 32;
}
function isWsOrEol(c) {
  return isWhiteSpace(c) || isEol(c);
}
function isWsOrEolOrEnd(c) {
  return c === 0 || isWsOrEol(c);
}
function isFlowIndicator(c) {
  return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
}
function fromDecimalCode(c) {
  return c >= 48 && c <= 57 ? c - 48 : -1;
}
function fromHexCode(c) {
  if (c >= 48 && c <= 57) return c - 48;
  const lc = c | 32;
  if (lc >= 97 && lc <= 102) return lc - 97 + 10;
  return -1;
}
function escapedHexLen(c) {
  if (c === 120) return 2;
  if (c === 117) return 4;
  if (c === 85) return 8;
  return 0;
}
function isSimpleEscape(c) {
  return c === 48 || c === 97 || c === 98 || c === 116 || c === 9 || c === 110 || c === 118 || c === 102 || c === 114 || c === 101 || c === 32 || c === 34 || c === 47 || c === 92 || c === 78 || c === 95 || c === 76 || c === 80;
}
function consumeLineBreak(state) {
  if (state.input.charCodeAt(state.position) === 10) state.position++;
  else {
    state.position++;
    if (state.input.charCodeAt(state.position) === 10) state.position++;
  }
  state.line++;
  state.lineStart = state.position;
  state.lineIndent = 0;
  state.firstTabInLine = -1;
}
function skipSeparationSpace(state, allowComments) {
  let lineBreaks = 0;
  let ch = state.input.charCodeAt(state.position);
  let hasSeparation = state.position === state.lineStart || isWsOrEol(state.input.charCodeAt(state.position - 1));
  while (ch !== 0) {
    while (isWhiteSpace(ch)) {
      hasSeparation = true;
      if (ch === 9 && state.firstTabInLine === -1) state.firstTabInLine = state.position;
      ch = state.input.charCodeAt(++state.position);
    }
    if (allowComments && hasSeparation && ch === 35) do
      ch = state.input.charCodeAt(++state.position);
    while (!isEol(ch) && ch !== 0);
    if (!isEol(ch)) break;
    consumeLineBreak(state);
    lineBreaks++;
    hasSeparation = true;
    ch = state.input.charCodeAt(state.position);
    while (ch === 32) {
      state.lineIndent++;
      ch = state.input.charCodeAt(++state.position);
    }
  }
  return lineBreaks;
}
function testDocumentSeparator(state, position = state.position) {
  const ch = state.input.charCodeAt(position);
  if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(position + 1) && ch === state.input.charCodeAt(position + 2)) {
    const following = state.input.charCodeAt(position + 3);
    return following === 0 || isWsOrEol(following);
  }
  return false;
}
function skipByteOrderMark(state) {
  if (state.position === state.lineStart && state.input.charCodeAt(state.position) === 65279) {
    state.position++;
    state.lineStart = state.position;
  }
}
function testDocumentBoundary(state) {
  if (state.position !== state.lineStart) return false;
  if (testDocumentSeparator(state)) return true;
  if (state.input.charCodeAt(state.position) !== 65279) return false;
  const snapshot = snapshotState(state);
  skipByteOrderMark(state);
  skipSeparationSpace(state, true);
  const ch = state.input.charCodeAt(state.position);
  const result = state.position === state.lineStart && (ch === 37 || ch === 45 && testDocumentSeparator(state));
  restoreState(state, snapshot);
  return result;
}
function skipUntilLineEnd(state) {
  let ch = state.input.charCodeAt(state.position);
  while (ch !== 0 && !isEol(ch)) ch = state.input.charCodeAt(++state.position);
}
function checkPrintable(state, start, end) {
  const match2 = PATTERN_NON_PRINTABLE.exec(state.input.slice(start, end));
  if (match2 !== null) {
    state.position = start + match2.index + match2[0].length - 1;
    throwError(state, "the stream contains non-printable characters");
  }
}
function readTagProperty(state, props, inFlow) {
  if (state.input.charCodeAt(state.position) !== 33) return false;
  if (props.tagStart !== NO_RANGE$1) throwError(state, "duplication of a tag property");
  const start = state.position;
  let isVerbatim = false;
  let isNamed = false;
  let tagHandle = "!";
  let ch = state.input.charCodeAt(++state.position);
  if (ch === 60) {
    isVerbatim = true;
    ch = state.input.charCodeAt(++state.position);
  } else if (ch === 33) {
    isNamed = true;
    tagHandle = "!!";
    ch = state.input.charCodeAt(++state.position);
  }
  let suffixStart = state.position;
  let tagName;
  if (isVerbatim) {
    while (ch !== 0 && ch !== 62) ch = state.input.charCodeAt(++state.position);
    if (ch !== 62) throwError(state, "unexpected end of the stream within a verbatim tag");
    tagName = state.input.slice(suffixStart, state.position);
    state.position++;
  } else {
    while (ch !== 0 && !isWsOrEol(ch) && !(inFlow && isFlowIndicator(ch))) {
      if (ch === 33) {
        if (!isNamed) {
          tagHandle = state.input.slice(suffixStart - 1, state.position + 1);
          if (!PATTERN_TAG_HANDLE.test(tagHandle)) throwError(state, "named tag handle cannot contain such characters");
          isNamed = true;
          suffixStart = state.position + 1;
        } else throwError(state, "tag suffix cannot contain exclamation marks");
      }
      ch = state.input.charCodeAt(++state.position);
    }
    tagName = state.input.slice(suffixStart, state.position);
    if (PATTERN_FLOW_INDICATORS.test(tagName)) throwError(state, "tag suffix cannot contain flow indicator characters");
  }
  if (tagName && !(isVerbatim ? PATTERN_TAG_URI.test(tagName) : PATTERN_TAG_SUFFIX.test(tagName))) throwError(state, `tag name cannot contain such characters: ${tagName}`);
  if (!isVerbatim && tagHandle !== "!" && tagHandle !== "!!" && !HAS_OWN.call(state.tagHandlers, tagHandle)) throwError(state, `undeclared tag handle "${tagHandle}"`);
  props.tagStart = start;
  props.tagEnd = state.position;
  return true;
}
function readAnchorProperty(state, props) {
  if (state.input.charCodeAt(state.position) !== 38) return false;
  if (props.anchorStart !== NO_RANGE$1) throwError(state, "duplication of an anchor property");
  state.position++;
  const start = state.position;
  while (state.input.charCodeAt(state.position) !== 0 && !isWsOrEol(state.input.charCodeAt(state.position)) && !isFlowIndicator(state.input.charCodeAt(state.position))) state.position++;
  if (state.position === start) throwError(state, "name of an anchor node must contain at least one character");
  props.anchorStart = start;
  props.anchorEnd = state.position;
  return true;
}
function readAlias(state, props) {
  if (state.input.charCodeAt(state.position) !== 42) return false;
  if (props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1) throwError(state, "alias node should not have any properties");
  state.position++;
  const start = state.position;
  while (state.input.charCodeAt(state.position) !== 0 && !isWsOrEol(state.input.charCodeAt(state.position)) && !isFlowIndicator(state.input.charCodeAt(state.position))) state.position++;
  if (state.position === start) throwError(state, "name of an alias node must contain at least one character");
  addAliasEvent(state, start, state.position);
  return true;
}
function readFlowScalarBreak(state, nodeIndent) {
  skipSeparationSpace(state, false);
  if (state.lineIndent < nodeIndent) throwError(state, "deficient indentation");
}
function readSingleQuotedScalar(state, nodeIndent, props) {
  if (state.input.charCodeAt(state.position) !== 39) return false;
  state.position++;
  const start = state.position;
  let simple = true;
  while (state.input.charCodeAt(state.position) !== 0) {
    const ch = state.input.charCodeAt(state.position);
    if (ch === 39) {
      if (state.input.charCodeAt(state.position + 1) === 39) {
        simple = false;
        state.position += 2;
        continue;
      }
      const end = state.position;
      state.position++;
      addScalarEvent(state, start, end, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, SCALAR_STYLE.SINGLE_QUOTED, CHOMPING_MODE.CLIP, -1, simple);
      return true;
    }
    if (isEol(ch)) {
      simple = false;
      readFlowScalarBreak(state, nodeIndent);
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a single quoted scalar");
    else if (ch !== 9 && ch < 32) throwError(state, "expected valid JSON character");
    else state.position++;
  }
  throwError(state, "unexpected end of the stream within a single quoted scalar");
}
function readDoubleQuotedScalar(state, nodeIndent, props) {
  if (state.input.charCodeAt(state.position) !== 34) return false;
  state.position++;
  const start = state.position;
  let simple = true;
  while (state.input.charCodeAt(state.position) !== 0) {
    const ch = state.input.charCodeAt(state.position);
    if (ch === 34) {
      const end = state.position;
      state.position++;
      addScalarEvent(state, start, end, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, SCALAR_STYLE.DOUBLE_QUOTED, CHOMPING_MODE.CLIP, -1, simple);
      return true;
    }
    if (ch === 92) {
      simple = false;
      const escaped = state.input.charCodeAt(++state.position);
      if (isEol(escaped)) readFlowScalarBreak(state, nodeIndent);
      else if (isSimpleEscape(escaped)) state.position++;
      else {
        let hexLength = escapedHexLen(escaped);
        if (hexLength === 0) throwError(state, "unknown escape sequence");
        while (hexLength-- > 0) {
          state.position++;
          if (fromHexCode(state.input.charCodeAt(state.position)) < 0) throwError(state, "expected hexadecimal character");
        }
        state.position++;
      }
    } else if (isEol(ch)) {
      simple = false;
      readFlowScalarBreak(state, nodeIndent);
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a double quoted scalar");
    else if (ch !== 9 && ch < 32) throwError(state, "expected valid JSON character");
    else state.position++;
  }
  throwError(state, "unexpected end of the stream within a double quoted scalar");
}
function readBlockScalar(state, parentIndent, props) {
  const ch = state.input.charCodeAt(state.position);
  let chomping = CHOMPING_MODE.CLIP;
  let indent = -1;
  let detectedIndent = false;
  if (ch !== 124 && ch !== 62) return false;
  const style = ch === 124 ? SCALAR_STYLE.LITERAL_BLOCK : SCALAR_STYLE.FOLDED_BLOCK;
  state.position++;
  while (state.input.charCodeAt(state.position) !== 0) {
    const current = state.input.charCodeAt(state.position);
    const digit = fromDecimalCode(current);
    if (current === 43 || current === 45) {
      if (chomping !== CHOMPING_MODE.CLIP) throwError(state, "repeat of a chomping mode identifier");
      chomping = current === 43 ? CHOMPING_MODE.KEEP : CHOMPING_MODE.STRIP;
      state.position++;
    } else if (digit >= 0) {
      if (digit === 0) throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
      if (detectedIndent) throwError(state, "repeat of an indentation width identifier");
      indent = parentIndent + digit - 1;
      detectedIndent = true;
      state.position++;
    } else break;
  }
  let hadWhitespace = false;
  while (isWhiteSpace(state.input.charCodeAt(state.position))) {
    hadWhitespace = true;
    state.position++;
  }
  if (hadWhitespace && state.input.charCodeAt(state.position) === 35) skipUntilLineEnd(state);
  if (isEol(state.input.charCodeAt(state.position))) consumeLineBreak(state);
  else if (state.input.charCodeAt(state.position) !== 0) throwError(state, "a line break is expected");
  let contentIndent = detectedIndent ? indent : -1;
  let maxLeadingIndent = 0;
  const valueStart = state.position;
  let valueEnd = state.position;
  while (state.input.charCodeAt(state.position) !== 0) {
    const linePosition = state.position;
    let column = 0;
    while (state.input.charCodeAt(linePosition + column) === 32) column++;
    const first = state.input.charCodeAt(linePosition + column);
    if (first === 0) {
      if (contentIndent >= 0) {
        if (column > contentIndent) valueEnd = linePosition + column;
      } else if (column > 0) valueEnd = linePosition + column;
      break;
    }
    if (testDocumentBoundary(state)) break;
    if (!detectedIndent && contentIndent === -1 && isEol(first)) maxLeadingIndent = Math.max(maxLeadingIndent, column);
    if (!detectedIndent && contentIndent === -1 && !isEol(first)) {
      if (first === 9 && column < parentIndent) {
        state.position = linePosition + column;
        throwError(state, "tab characters must not be used in indentation");
      }
      if (column >= parentIndent && column < maxLeadingIndent) {
        state.position = linePosition + column;
        throwError(state, "bad indentation of a mapping entry");
      }
    }
    if (contentIndent === -1 && first !== 0 && !isEol(first) && column < parentIndent) {
      state.lineIndent = column;
      state.position = linePosition + column;
      break;
    }
    if (!detectedIndent && first !== 0 && !isEol(first) && contentIndent === -1) contentIndent = column;
    const requiredIndent = contentIndent === -1 ? parentIndent + 1 : contentIndent;
    if (first !== 0 && !isEol(first) && column < requiredIndent) {
      state.lineIndent = column;
      state.position = linePosition + column;
      break;
    }
    skipUntilLineEnd(state);
    valueEnd = state.position;
    if (isEol(state.input.charCodeAt(state.position))) {
      consumeLineBreak(state);
      valueEnd = state.position;
    }
  }
  checkPrintable(state, valueStart, valueEnd);
  addScalarEvent(state, valueStart, valueEnd, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, style, chomping, contentIndent);
  return true;
}
function canStartPlainScalar(state, nodeContext) {
  const ch = state.input.charCodeAt(state.position);
  const inFlow = nodeContext === CONTEXT_FLOW_IN;
  if (ch === 0 || isWsOrEol(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96 || isFlowIndicator(ch)) return false;
  if (ch === 63 || ch === 45) {
    const following = state.input.charCodeAt(state.position + 1);
    if (isWsOrEolOrEnd(following) || inFlow && isFlowIndicator(following)) return false;
  }
  return true;
}
function readPlainScalar(state, nodeIndent, nodeContext, props) {
  if (!canStartPlainScalar(state, nodeContext)) return false;
  const start = state.position;
  let end = state.position;
  let ch = state.input.charCodeAt(state.position);
  const inFlow = nodeContext === CONTEXT_FLOW_IN;
  let multiline = false;
  while (ch !== 0) {
    if (testDocumentBoundary(state)) break;
    if (ch === 58) {
      const following = state.input.charCodeAt(state.position + 1);
      if (isWsOrEolOrEnd(following) || inFlow && isFlowIndicator(following)) break;
    } else if (ch === 35) {
      if (isWsOrEol(state.input.charCodeAt(state.position - 1))) break;
    } else if (inFlow && isFlowIndicator(ch)) break;
    else if (isEol(ch)) {
      const savedPosition = state.position;
      const savedLine = state.line;
      const savedLineStart = state.lineStart;
      const savedLineIndent = state.lineIndent;
      skipSeparationSpace(state, false);
      if (state.lineIndent >= nodeIndent) {
        multiline = true;
        ch = state.input.charCodeAt(state.position);
        continue;
      }
      state.position = savedPosition;
      state.line = savedLine;
      state.lineStart = savedLineStart;
      state.lineIndent = savedLineIndent;
      break;
    }
    if (!isWhiteSpace(ch)) end = state.position + 1;
    ch = state.input.charCodeAt(++state.position);
  }
  if (end === start) return false;
  checkPrintable(state, start, end);
  addScalarEvent(state, start, end, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, SCALAR_STYLE.PLAIN, CHOMPING_MODE.CLIP, -1, !multiline);
  return true;
}
function skipFlowSeparationSpace(state, nodeIndent) {
  const startLine = state.line;
  skipSeparationSpace(state, true);
  if (state.line > startLine && state.lineIndent < nodeIndent || state.firstTabInLine !== -1 && state.lineIndent < nodeIndent) throwError(state, "deficient indentation");
}
function readFlowCollection(state, nodeIndent, props) {
  const ch = state.input.charCodeAt(state.position);
  const isMapping = ch === 123;
  const start = state.position;
  let readNext = true;
  if (ch !== 91 && ch !== 123) return false;
  const terminator = isMapping ? 125 : 93;
  if (isMapping) addMappingEvent(state, start, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, COLLECTION_STYLE.FLOW);
  else addSequenceEvent(state, start, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, COLLECTION_STYLE.FLOW);
  state.position++;
  while (state.input.charCodeAt(state.position) !== 0) {
    skipFlowSeparationSpace(state, nodeIndent);
    let ch2 = state.input.charCodeAt(state.position);
    if (ch2 === terminator) {
      state.position++;
      addPopEvent(state);
      return true;
    } else if (!readNext) throwError(state, "missed comma between flow collection entries");
    else if (ch2 === 44) throwError(state, "expected the node content, but found ','");
    let isPair = false;
    let isExplicitPair = false;
    if (ch2 === 63 && isWsOrEol(state.input.charCodeAt(state.position + 1))) {
      isPair = isExplicitPair = true;
      state.position += 1;
      skipFlowSeparationSpace(state, nodeIndent);
    }
    const entryLine = state.line;
    const entryStart = snapshotState(state);
    const keyWasRead = parseNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
    skipFlowSeparationSpace(state, nodeIndent);
    ch2 = state.input.charCodeAt(state.position);
    if ((isMapping || isExplicitPair || state.line === entryLine) && ch2 === 58) {
      isPair = true;
      state.position++;
      skipFlowSeparationSpace(state, nodeIndent);
      if (!isMapping) {
        insertFlowPairMappingEvent(state, entryStart);
        if (!keyWasRead) addEmptyScalarEvent(state);
      } else if (!keyWasRead) addEmptyScalarEvent(state);
      if (!parseNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true)) addEmptyScalarEvent(state);
      skipFlowSeparationSpace(state, nodeIndent);
      if (!isMapping) addPopEvent(state);
    } else if (isMapping && isPair) {
      if (!keyWasRead) addEmptyScalarEvent(state);
      addEmptyScalarEvent(state);
    } else if (isMapping) addEmptyScalarEvent(state);
    else if (isPair) {
      insertFlowPairMappingEvent(state, entryStart);
      if (!keyWasRead) addEmptyScalarEvent(state);
      addEmptyScalarEvent(state);
      addPopEvent(state);
    }
    ch2 = state.input.charCodeAt(state.position);
    if (ch2 === 44) {
      readNext = true;
      state.position++;
    } else readNext = false;
  }
  throwError(state, "unexpected end of the stream within a flow collection");
}
function readBlockSequence(state, nodeIndent, props) {
  if (state.firstTabInLine !== -1 || state.input.charCodeAt(state.position) !== 45 || !isWsOrEolOrEnd(state.input.charCodeAt(state.position + 1))) return false;
  addSequenceEvent(state, state.position, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, COLLECTION_STYLE.BLOCK);
  while (state.input.charCodeAt(state.position) === 45 && isWsOrEolOrEnd(state.input.charCodeAt(state.position + 1))) {
    if (state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    const entryLine = state.line;
    state.position++;
    const hadBreak = skipSeparationSpace(state, true) > 0;
    if (state.firstTabInLine !== -1 && state.input.charCodeAt(state.position) === 45 && isWsOrEolOrEnd(state.input.charCodeAt(state.position + 1))) throwError(state, "bad indentation of a sequence entry");
    if (hadBreak && state.lineIndent <= nodeIndent) addEmptyScalarEvent(state);
    else parseNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
    skipSeparationSpace(state, true);
    if (state.lineIndent < nodeIndent || state.position >= state.length) break;
    if (state.lineIndent > nodeIndent) throwError(state, "bad indentation of a sequence entry");
    if (state.line === entryLine && state.input.charCodeAt(state.position) === 45 && isWsOrEolOrEnd(state.input.charCodeAt(state.position + 1))) throwError(state, "bad indentation of a sequence entry");
  }
  addPopEvent(state);
  return true;
}
function readBlockMapping(state, nodeIndent, flowIndent, props) {
  let atExplicitKey = false;
  let detected = false;
  let mappingOpened = false;
  let pendingExplicitKey = false;
  if (state.firstTabInLine !== -1) return false;
  let ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (!atExplicitKey && state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    const following = state.input.charCodeAt(state.position + 1);
    const entryLine = state.line;
    if ((ch === 63 || ch === 58) && isWsOrEolOrEnd(following)) {
      if (!mappingOpened) {
        addMappingEvent(state, state.position, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, COLLECTION_STYLE.BLOCK);
        mappingOpened = true;
      }
      if (ch === 63) {
        if (atExplicitKey) addEmptyScalarEvent(state);
        detected = true;
        atExplicitKey = true;
      } else if (atExplicitKey) atExplicitKey = false;
      else {
        addEmptyScalarEvent(state);
        detected = true;
        atExplicitKey = false;
      }
      state.position += 1;
      pendingExplicitKey = true;
    } else {
      if (atExplicitKey) {
        addEmptyScalarEvent(state);
        atExplicitKey = false;
      }
      const beforeKey = snapshotState(state);
      if (!parseNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) break;
      if (state.line === entryLine) {
        ch = state.input.charCodeAt(state.position);
        while (isWhiteSpace(ch)) ch = state.input.charCodeAt(++state.position);
        if (ch === 58) {
          ch = state.input.charCodeAt(++state.position);
          if (!isWsOrEolOrEnd(ch)) throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
          if (!mappingOpened) {
            state.events.splice(beforeKey.eventsLength, 0, {
              type: EVENT_ID.MAPPING,
              start: beforeKey.position,
              anchorStart: props.anchorStart,
              anchorEnd: props.anchorEnd,
              tagStart: props.tagStart,
              tagEnd: props.tagEnd,
              style: COLLECTION_STYLE.BLOCK
            });
            mappingOpened = true;
          }
          detected = true;
          atExplicitKey = false;
          pendingExplicitKey = false;
        } else if (detected) throwError(state, "expected ':' after a mapping key");
        else {
          if (props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1) {
            restoreState(state, beforeKey);
            return false;
          }
          return true;
        }
      } else if (detected) throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
      else {
        if (props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1) {
          restoreState(state, beforeKey);
          return false;
        }
        return true;
      }
    }
    if (parseNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, pendingExplicitKey)) pendingExplicitKey = false;
    if (!atExplicitKey) {
      if (pendingExplicitKey) {
        addEmptyScalarEvent(state);
        pendingExplicitKey = false;
      }
    }
    skipSeparationSpace(state, true);
    ch = state.input.charCodeAt(state.position);
    if ((state.line === entryLine || state.lineIndent > nodeIndent) && ch !== 0) throwError(state, "bad indentation of a mapping entry");
    else if (state.lineIndent < nodeIndent) break;
  }
  if (!detected) return false;
  if (atExplicitKey) addEmptyScalarEvent(state);
  if (mappingOpened) addPopEvent(state);
  return true;
}
function parseNode(state, parentIndent, nodeContext, allowToSeek, allowCompact, allowPropertyMapping = true) {
  if (state.depth >= state.maxDepth) throwError(state, `nesting exceeded maxDepth (${state.maxDepth})`);
  state.depth++;
  let indentStatus = 1;
  let atNewLine = false;
  let hasContent = false;
  let propertyStart = null;
  const props = emptyProperties();
  let allowBlockScalars = nodeContext === CONTEXT_BLOCK_OUT || nodeContext === CONTEXT_BLOCK_IN;
  let allowBlockCollections = allowBlockScalars;
  const allowBlockStyles = allowBlockScalars;
  if (allowToSeek && skipSeparationSpace(state, true)) {
    atNewLine = true;
    if (state.lineIndent > parentIndent) indentStatus = 1;
    else if (state.lineIndent === parentIndent) indentStatus = 0;
    else indentStatus = -1;
  }
  if (indentStatus === 1) while (true) {
    const ch = state.input.charCodeAt(state.position);
    const propertyState = snapshotState(state);
    if (atNewLine && indentStatus !== 1 && (ch === 33 || ch === 38)) break;
    if (atNewLine && allowBlockStyles && (props.tagStart !== NO_RANGE$1 || props.anchorStart !== NO_RANGE$1) && (ch === 33 || ch === 38)) {
      const fallbackState = snapshotState(state);
      const flowIndent = parentIndent + 1;
      if (readBlockMapping(state, state.position - state.lineStart, flowIndent, props) && state.events[fallbackState.eventsLength]?.type === EVENT_ID.MAPPING) {
        state.depth--;
        return true;
      }
      restoreState(state, fallbackState);
    }
    if (atNewLine && (ch === 33 && props.tagStart !== NO_RANGE$1 || ch === 38 && props.anchorStart !== NO_RANGE$1)) break;
    if (!readTagProperty(state, props, nodeContext === CONTEXT_FLOW_IN) && !readAnchorProperty(state, props)) break;
    if (propertyStart === null) propertyStart = propertyState;
    if (skipSeparationSpace(state, true)) {
      atNewLine = true;
      allowBlockCollections = allowBlockStyles;
      if (state.lineIndent > parentIndent) indentStatus = 1;
      else if (state.lineIndent === parentIndent) indentStatus = 0;
      else indentStatus = -1;
    } else allowBlockCollections = false;
  }
  if (allowBlockCollections) allowBlockCollections = atNewLine || allowCompact;
  if (indentStatus === 1 || nodeContext === CONTEXT_BLOCK_OUT) {
    const flowIndent = nodeContext === CONTEXT_FLOW_IN || nodeContext === CONTEXT_FLOW_OUT ? parentIndent : parentIndent + 1;
    const blockIndent = state.position - state.lineStart;
    if (indentStatus === 1) {
      if (allowBlockCollections && (readBlockSequence(state, blockIndent, props) || readBlockMapping(state, blockIndent, flowIndent, props)) || readFlowCollection(state, flowIndent, props)) hasContent = true;
      else {
        const ch = state.input.charCodeAt(state.position);
        if (propertyStart !== null && allowPropertyMapping && allowBlockStyles && !allowBlockCollections && ch !== 124 && ch !== 62) {
          const fallbackState = snapshotState(state);
          const propertyIndent = propertyStart.position - propertyStart.lineStart;
          restoreState(state, propertyStart);
          if (readBlockMapping(state, propertyIndent, flowIndent, emptyProperties()) && state.events[fallbackState.eventsLength]?.type === EVENT_ID.MAPPING) hasContent = true;
          else restoreState(state, fallbackState);
        }
        if (!hasContent && (allowBlockScalars && readBlockScalar(state, flowIndent, props) || readSingleQuotedScalar(state, flowIndent, props) || readDoubleQuotedScalar(state, flowIndent, props) || readAlias(state, props) || readPlainScalar(state, flowIndent, nodeContext, props))) hasContent = true;
      }
    } else if (indentStatus === 0) hasContent = allowBlockCollections && readBlockSequence(state, blockIndent, props);
  }
  allowBlockScalars = allowBlockScalars && !hasContent;
  if (!hasContent && (props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1 || allowBlockScalars)) {
    addScalarEvent(state, NO_RANGE$1, NO_RANGE$1, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, SCALAR_STYLE.PLAIN);
    hasContent = true;
  }
  state.depth--;
  return hasContent || props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1;
}
function readDirective(state) {
  if (state.lineIndent > 0 || state.input.charCodeAt(state.position) !== 37) return false;
  state.position++;
  const nameStart = state.position;
  while (state.input.charCodeAt(state.position) !== 0 && !isWsOrEol(state.input.charCodeAt(state.position))) state.position++;
  const name = state.input.slice(nameStart, state.position);
  const args = [];
  if (name.length === 0) throwError(state, "directive name must not be less than one character in length");
  while (state.input.charCodeAt(state.position) !== 0 && !isEol(state.input.charCodeAt(state.position))) {
    while (isWhiteSpace(state.input.charCodeAt(state.position))) state.position++;
    if (state.input.charCodeAt(state.position) === 35 || isEol(state.input.charCodeAt(state.position)) || state.input.charCodeAt(state.position) === 0) break;
    const start = state.position;
    while (state.input.charCodeAt(state.position) !== 0 && !isWsOrEol(state.input.charCodeAt(state.position))) state.position++;
    args.push(state.input.slice(start, state.position));
  }
  if (isEol(state.input.charCodeAt(state.position))) consumeLineBreak(state);
  if (name === "YAML") {
    if (state.directives.some((directive) => directive.kind === "yaml")) throwError(state, "duplication of %YAML directive");
    if (args.length !== 1) throwError(state, "YAML directive accepts exactly one argument");
    const match2 = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
    if (match2 === null) throwError(state, "ill-formed argument of the YAML directive");
    if (parseInt(match2[1], 10) !== 1) throwError(state, "unacceptable YAML version of the document");
    state.directives.push({
      kind: "yaml",
      version: args[0]
    });
  } else if (name === "TAG") {
    if (args.length !== 2) throwError(state, "TAG directive accepts exactly two arguments");
    const [handle, prefix] = args;
    if (!PATTERN_TAG_HANDLE.test(handle)) throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
    if (HAS_OWN.call(state.tagHandlers, handle)) throwError(state, `there is a previously declared suffix for "${handle}" tag handle`);
    if (!PATTERN_TAG_PREFIX.test(prefix)) throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
    state.tagHandlers[handle] = prefix;
    state.directives.push({
      kind: "tag",
      handle,
      prefix
    });
  }
  return true;
}
function readDocument(state) {
  state.directives = [];
  state.tagHandlers = /* @__PURE__ */ Object.create(null);
  let hasDirectives = false;
  skipSeparationSpace(state, true);
  while (readDirective(state)) {
    hasDirectives = true;
    skipSeparationSpace(state, true);
  }
  let explicitStart = false;
  let explicitEnd = false;
  let allowCompact = true;
  if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45 && isWsOrEolOrEnd(state.input.charCodeAt(state.position + 3))) {
    explicitStart = true;
    const markerLine = state.line;
    state.position += 3;
    skipSeparationSpace(state, true);
    allowCompact = state.line > markerLine;
  } else if (hasDirectives) throwError(state, "directives end mark is expected");
  const documentEventIndex = state.events.length;
  if (!explicitStart && state.position === state.lineStart && state.input.charCodeAt(state.position) === 46 && testDocumentSeparator(state)) {
    state.position += 3;
    skipSeparationSpace(state, true);
    return;
  }
  addDocumentEvent(state, explicitStart, false);
  if (!parseNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, allowCompact, allowCompact)) addEmptyScalarEvent(state);
  skipSeparationSpace(state, true);
  if (state.position === state.lineStart && testDocumentSeparator(state)) {
    explicitEnd = state.input.charCodeAt(state.position) === 46;
    if (explicitEnd) {
      const markerLine = state.line;
      state.position += 3;
      skipSeparationSpace(state, true);
      if (state.line === markerLine && state.position < state.length) throwError(state, "end of the stream or a document separator is expected");
    }
  }
  const documentEvent = state.events[documentEventIndex];
  if (documentEvent?.type === EVENT_ID.DOCUMENT) documentEvent.explicitEnd = explicitEnd;
  addPopEvent(state);
  if (!explicitEnd && state.position < state.length && !testDocumentBoundary(state)) throwError(state, "end of the stream or a document separator is expected");
}
function parseEvents(input, options) {
  const length = input.length;
  const state = {
    ...DEFAULT_PARSER_OPTIONS,
    ...options,
    input: `${input}\0`,
    length,
    position: 0,
    line: 0,
    lineStart: 0,
    lineIndent: 0,
    firstTabInLine: -1,
    depth: 0,
    directives: [],
    tagHandlers: /* @__PURE__ */ Object.create(null),
    events: []
  };
  const nullpos = input.indexOf("\0");
  if (nullpos !== -1) YAMLException.throwAt(input, nullpos, "null byte is not allowed in input", state.filename);
  while (state.position < state.length) {
    skipByteOrderMark(state);
    skipSeparationSpace(state, true);
    if (state.position >= state.length) break;
    const documentStart = state.position;
    readDocument(state);
    if (state.position === documentStart)
      throwError(state, "can not read a document");
  }
  return state.events;
}
var DEFAULT_LOAD_OPTIONS = {
  ...DEFAULT_PARSER_OPTIONS,
  ...DEFAULT_CONSTRUCTOR_OPTIONS
};
function loadDocuments(input, options = {}) {
  const opts = {
    ...DEFAULT_LOAD_OPTIONS,
    ...options
  };
  const source = String(input);
  const PARSER_OPT_KEYS = Object.keys(DEFAULT_PARSER_OPTIONS);
  const CONSTRUCTOR_OPT_KEYS = Object.keys(DEFAULT_CONSTRUCTOR_OPTIONS);
  return constructFromEvents(parseEvents(source, pick(opts, PARSER_OPT_KEYS)), {
    ...pick(opts, CONSTRUCTOR_OPT_KEYS),
    source
  });
}
function load(input, options) {
  const documents = loadDocuments(input, options);
  if (documents.length === 0) throw new YAMLException("expected a document, but the input is empty");
  if (documents.length === 1) return documents[0];
  throw new YAMLException("expected a single document in the stream, but found more");
}
function hasBit(mask, bit) {
  return (mask & 1 << bit) !== 0;
}
var DEFAULT_SCALAR_STYLE_RULES = {
  applyQuoteFlowKeysOption,
  doubleQuoteForInvisibles,
  doubleQuoteWhitespaceOnly,
  applyForceQuotesOption,
  tryLongOrMultilineAsBlock,
  quoteInvalidPlain,
  fallbackToDoubleQuoted
};
function _preferredQuotedStyle(layout) {
  if (layout.presenterOptions.quoteStyle === "single" && hasBit(layout.allowedStylesMask, SCALAR_STYLE.SINGLE_QUOTED)) return SCALAR_STYLE.SINGLE_QUOTED;
  return SCALAR_STYLE.DOUBLE_QUOTED;
}
function applyQuoteFlowKeysOption(layout) {
  if (!layout.presenterOptions.quoteFlowKeys) return;
  if (!layout.isKey || !layout.flowOnly || layout.style !== SCALAR_STYLE.PLAIN) return;
  layout.style = SCALAR_STYLE.DOUBLE_QUOTED;
}
function doubleQuoteForInvisibles(layout) {
  if (layout.style === SCALAR_STYLE.PLAIN && /[\t\x7F-\xA0\u2028\u2029\uFEFF\uFFFE\uFFFF]/.test(layout.node.value)) layout.style = SCALAR_STYLE.DOUBLE_QUOTED;
}
function doubleQuoteWhitespaceOnly(layout) {
  if (layout.style === SCALAR_STYLE.PLAIN && /^\s+$/.test(layout.node.value)) layout.style = SCALAR_STYLE.DOUBLE_QUOTED;
}
function applyForceQuotesOption(layout) {
  if (!layout.presenterOptions.forceQuotes) return;
  if (layout.isKey || layout.style !== SCALAR_STYLE.PLAIN) return;
  if (layout.node.tag !== layout.presenterOptions.schema.defaultScalarTag.tagName) return;
  layout.style = layout.node.value.includes("\n") ? SCALAR_STYLE.DOUBLE_QUOTED : _preferredQuotedStyle(layout);
}
function tryLongOrMultilineAsBlock(layout) {
  if (layout.style !== SCALAR_STYLE.PLAIN || layout.isKey) return;
  const value = layout.node.value;
  const multiline = value.indexOf("\n") !== -1;
  if (!hasBit(layout.allowedStylesMask, SCALAR_STYLE.LITERAL_BLOCK)) {
    if (multiline) layout.style = SCALAR_STYLE.DOUBLE_QUOTED;
    return;
  }
  const w = layout.presenterOptions.lineWidth;
  if (w === -1) {
    if (multiline) layout.style = SCALAR_STYLE.LITERAL_BLOCK;
    return;
  }
  const availableWidth = Math.max(Math.min(w, 40), w - layout.shiftOfContent);
  let position = 0;
  let shouldFold = false;
  while (position <= value.length) {
    let lineEnd = value.length;
    const nextLineBreak = value.indexOf("\n", position);
    if (nextLineBreak !== -1) lineEnd = nextLineBreak;
    const line = value.slice(position, lineEnd);
    if (line.length > availableWidth && line[0] !== " " && / [^ \t]/.test(line)) shouldFold = true;
    if (nextLineBreak === -1) break;
    position = nextLineBreak + 1;
  }
  if (shouldFold) layout.style = SCALAR_STYLE.FOLDED_BLOCK;
  else if (multiline) layout.style = SCALAR_STYLE.LITERAL_BLOCK;
}
function quoteInvalidPlain(layout) {
  if (layout.style === SCALAR_STYLE.PLAIN && !hasBit(layout.allowedStylesMask, SCALAR_STYLE.PLAIN)) layout.style = _preferredQuotedStyle(layout);
}
function fallbackToDoubleQuoted(layout) {
  if (!hasBit(layout.allowedStylesMask, layout.style)) layout.style = SCALAR_STYLE.DOUBLE_QUOTED;
}
var SRC_C_PRINTABLE = "[\\x09\\x0A\\x0D\\x20-\\x7E\\x85\\xA0-\\uD7FF\\uE000-\\uFFFD\\u{10000}-\\u{10FFFF}]";
var SRC_B_CHAR = "[\\n\\r]";
var SRC_C_BYTE_ORDER_MARK = "\\uFEFF";
var SRC_S_WHITE = "[ \\t]";
var SRC_NB_CHAR = `(?:(?!(?:${SRC_B_CHAR}|${SRC_C_BYTE_ORDER_MARK}))${SRC_C_PRINTABLE})`;
var SRC_NS_CHAR = `(?:(?!${SRC_S_WHITE})${SRC_NB_CHAR})`;
var SRC_NB_JSON = "[\\x09\\x20-\\uD7FF\\uE000-\\uFFFF\\u{10000}-\\u{10FFFF}]";
var SRC_C_INDICATOR = "[-?:,\\[\\]{}#&*!|>'\"%@`]";
var SRC_C_FLOW_INDICATOR = "[,\\[\\]{}]";
var SRC_NS_PLAIN_SAFE_FLOW_OUT = SRC_NS_CHAR;
var SRC_NS_PLAIN_SAFE_FLOW_IN = `(?:(?!${SRC_C_FLOW_INDICATOR})${SRC_NS_CHAR})`;
var SRC_NS_PLAIN_FIRST_FLOW_OUT = `(?:(?:(?!${SRC_C_INDICATOR})${SRC_NS_CHAR})|[?:-](?=${SRC_NS_PLAIN_SAFE_FLOW_OUT}))`;
var SRC_NS_PLAIN_FIRST_FLOW_IN = `(?:(?:(?!${SRC_C_INDICATOR})${SRC_NS_CHAR})|[?:-](?=${SRC_NS_PLAIN_SAFE_FLOW_IN}))`;
var SRC_NS_PLAIN_CHAR_FLOW_OUT = `(?:(?:(?![:#])${SRC_NS_PLAIN_SAFE_FLOW_OUT})|:(?=${SRC_NS_PLAIN_SAFE_FLOW_OUT}))#*`;
var SRC_NS_PLAIN_CHAR_FLOW_IN = `(?:(?:(?![:#])${SRC_NS_PLAIN_SAFE_FLOW_IN})|:(?=${SRC_NS_PLAIN_SAFE_FLOW_IN}))#*`;
var SRC_NB_NS_PLAIN_IN_LINE_FLOW_OUT = `(?:${SRC_S_WHITE}*${SRC_NS_PLAIN_CHAR_FLOW_OUT})*`;
var SRC_NB_NS_PLAIN_IN_LINE_FLOW_IN = `(?:${SRC_S_WHITE}*${SRC_NS_PLAIN_CHAR_FLOW_IN})*`;
var SRC_NS_PLAIN_ONE_LINE_FLOW_OUT = `${SRC_NS_PLAIN_FIRST_FLOW_OUT}#*${SRC_NB_NS_PLAIN_IN_LINE_FLOW_OUT}`;
var SRC_NS_PLAIN_ONE_LINE_FLOW_IN = `${SRC_NS_PLAIN_FIRST_FLOW_IN}#*${SRC_NB_NS_PLAIN_IN_LINE_FLOW_IN}`;
var SRC_NS_PLAIN_ONE_LINE_BLOCK_KEY = SRC_NS_PLAIN_ONE_LINE_FLOW_OUT;
var SRC_NS_PLAIN_ONE_LINE_FLOW_KEY = SRC_NS_PLAIN_ONE_LINE_FLOW_IN;
var SRC_S_NS_PLAIN_NEXT_LINE_FLOW_OUT = `\\n+${SRC_NS_PLAIN_CHAR_FLOW_OUT}${SRC_NB_NS_PLAIN_IN_LINE_FLOW_OUT}`;
var SRC_S_NS_PLAIN_NEXT_LINE_FLOW_IN = `\\n+${SRC_NS_PLAIN_CHAR_FLOW_IN}${SRC_NB_NS_PLAIN_IN_LINE_FLOW_IN}`;
var SRC_NS_PLAIN_MULTI_LINE_FLOW_OUT = `${SRC_NS_PLAIN_ONE_LINE_FLOW_OUT}(?:${SRC_S_NS_PLAIN_NEXT_LINE_FLOW_OUT})*`;
var SRC_NS_PLAIN_MULTI_LINE_FLOW_IN = `${SRC_NS_PLAIN_ONE_LINE_FLOW_IN}(?:${SRC_S_NS_PLAIN_NEXT_LINE_FLOW_IN})*`;
var NS_PLAIN_FLOW_OUT = new RegExp(`^(?:${SRC_NS_PLAIN_MULTI_LINE_FLOW_OUT})$`, "u");
var NS_PLAIN_FLOW_IN = new RegExp(`^(?:${SRC_NS_PLAIN_MULTI_LINE_FLOW_IN})$`, "u");
var NS_PLAIN_BLOCK_KEY = new RegExp(`^(?:${SRC_NS_PLAIN_ONE_LINE_BLOCK_KEY})$`, "u");
var NS_PLAIN_FLOW_KEY = new RegExp(`^(?:${SRC_NS_PLAIN_ONE_LINE_FLOW_KEY})$`, "u");
var NB_SINGLE_ONE_LINE = new RegExp(`^(?:${SRC_NB_JSON})*$`, "u");
var NB_SINGLE_MULTI_LINE = new RegExp(`^(?:${SRC_NB_JSON}|\\n)*$`, "u");
var BLOCK_SCALAR_CONTENT = new RegExp(`^(?:${SRC_NB_CHAR}|\\n)*$`, "u");
var DEFAULT_PRESENTER_OPTIONS = {
  indent: 2,
  seqNoIndent: false,
  seqInlineFirst: true,
  lineWidth: 80,
  flowBracketPadding: false,
  flowSkipCommaSpace: false,
  flowSkipColonSpace: false,
  quoteFlowKeys: false,
  quoteStyle: "single",
  forceQuotes: false,
  scalarStyleRules: Object.keys(DEFAULT_SCALAR_STYLE_RULES).map((name) => Reflect.get(DEFAULT_SCALAR_STYLE_RULES, name)),
  tagBeforeAnchor: false
};
var DEFAULT_DUMP_OPTIONS = {
  ...DEFAULT_PRESENTER_OPTIONS,
  schema: DUMP_SCHEMA,
  skipInvalid: false,
  noRefs: false,
  flowLevel: -1,
  sortKeys: false,
  transform: () => {
  }
};
var EVENT_DOCUMENT = EVENT_ID.DOCUMENT;
var EVENT_SEQUENCE = EVENT_ID.SEQUENCE;
var EVENT_MAPPING = EVENT_ID.MAPPING;
var EVENT_SCALAR = EVENT_ID.SCALAR;
var EVENT_ALIAS = EVENT_ID.ALIAS;
var EVENT_POP = EVENT_ID.POP;
var SCALAR_STYLE_PLAIN = SCALAR_STYLE.PLAIN;
var SCALAR_STYLE_SINGLE_QUOTED = SCALAR_STYLE.SINGLE_QUOTED;
var SCALAR_STYLE_DOUBLE_QUOTED = SCALAR_STYLE.DOUBLE_QUOTED;
var SCALAR_STYLE_LITERAL_BLOCK = SCALAR_STYLE.LITERAL_BLOCK;
var SCALAR_STYLE_FOLDED_BLOCK = SCALAR_STYLE.FOLDED_BLOCK;
var COLLECTION_STYLE_BLOCK = COLLECTION_STYLE.BLOCK;
var COLLECTION_STYLE_FLOW = COLLECTION_STYLE.FLOW;
var CHOMPING_CLIP = CHOMPING_MODE.CLIP;
var CHOMPING_STRIP = CHOMPING_MODE.STRIP;
var CHOMPING_KEEP = CHOMPING_MODE.KEEP;

// src/shared/projectProfile.ts
var BEGIN_PATTERN = /^[ \t]*<!--[ \t]*PKT1:PROJECT-META:BEGIN[ \t]*-->[ \t]*$/m;
var END_PATTERN = /^[ \t]*<!--[ \t]*PKT1:PROJECT-META:END[ \t]*-->[ \t]*$/m;
var YAML_FENCE_PATTERN = /```(?:yaml|yml)\s*\n([\s\S]*?)\n[ \t]*```/;
function extractYamlBody(readmeText) {
  const text = readmeText.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const beginMatch = BEGIN_PATTERN.exec(text);
  const endMatch = END_PATTERN.exec(text);
  if (!beginMatch || !endMatch || endMatch.index < beginMatch.index) {
    return null;
  }
  const between = text.slice(beginMatch.index + beginMatch[0].length, endMatch.index);
  const fenceMatch = YAML_FENCE_PATTERN.exec(between);
  return fenceMatch ? fenceMatch[1] : null;
}
function shouldRunAnalyzer(meta, scope) {
  if (scope === "shared") {
    return true;
  }
  const type = meta?.project.type;
  if (!type || type === "fullstack" || type === "heredado") {
    return true;
  }
  return type === scope;
}
async function detectProjectMeta(workspaceRoot) {
  const readmeUri = vscode3.Uri.joinPath(workspaceRoot, "README.md");
  let readmeText;
  try {
    const bytes = await vscode3.workspace.fs.readFile(readmeUri);
    readmeText = Buffer.from(bytes).toString("utf8");
  } catch {
    return null;
  }
  const yamlText = extractYamlBody(readmeText);
  if (!yamlText) {
    return null;
  }
  try {
    const parsed = load(yamlText);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// src/commands/codeReviewerCommand.ts
function getChangedFile(workspaceRoot, baseBranch) {
  try {
    (0, import_child_process2.execFileSync)("git", ["fetch", "origin", baseBranch], { cwd: workspaceRoot, encoding: "utf8" });
    const output = (0, import_child_process2.execFileSync)(
      "git",
      ["diff", "--name-only", "--diff-filter=ACMR", `origin/${baseBranch}...HEAD`],
      { cwd: workspaceRoot, encoding: "utf8" }
    );
    return output.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  } catch (error) {
    throw new Error(`No se pudo obtener el diff contra la rama "origin/${baseBranch}": ${error.message}`);
  }
}
function registerCodeReviewerCommand(context) {
  const disposable = vscode4.commands.registerCommand("codeadvisor.codeReviewer", async () => {
    const folder = vscode4.workspace.workspaceFolders?.[0];
    if (!folder) {
      vscode4.window.showErrorMessage("Abra una carpeta que sea un repositorio de git primero");
      return;
    }
    const config = await loadConfig(folder.uri);
    const projectMeta = await detectProjectMeta(folder.uri);
    const excludeMatchers = buildExcludeMatchers(config);
    const findings = [];
    const excludePattern = `{${config.exclude.join(",")}}`;
    const baseBranch = vscode4.workspace.getConfiguration("codeadvisor").get("baseBranch", "main");
    const changedPaths = getChangedFile(folder.uri.fsPath, baseBranch);
    const codeFiles = changedPaths.filter((path3) => /\.(ts|tsx|js|jsx|php|cs)$/.test(path3)).filter((path3) => !isExluded(path3, excludeMatchers)).map((path3) => vscode4.Uri.joinPath(folder.uri, path3));
    const envFiles = changedPaths.filter((path3) => /(^|\/)\.env/.test(path3)).filter((path3) => !isExluded(path3, excludeMatchers)).map((path3) => vscode4.Uri.joinPath(folder.uri, path3));
    const htmlCssFiles = changedPaths.filter((path3) => /\.(html|css|jsx|tsx)$/.test(path3)).filter((path3) => !isExluded(path3, excludeMatchers)).map((path3) => vscode4.Uri.joinPath(folder.uri, path3));
    const fileLines = /* @__PURE__ */ new Map();
    const changedLinesByFile = /* @__PURE__ */ new Map();
    for (const uri of codeFiles) {
      const fileLabel = vscode4.workspace.asRelativePath(uri);
      const bytes = await vscode4.workspace.fs.readFile(uri);
      const lines = Buffer.from(bytes).toString("utf8").split("\n");
      const changedLines = getChangedLineNumbers(folder.uri.fsPath, baseBranch, fileLabel);
      fileLines.set(fileLabel, lines);
      changedLinesByFile.set(fileLabel, changedLines);
      if (config.rules.parameters.enabled && shouldRunAnalyzer(projectMeta, "backend")) {
        analyzeParameters(lines, fileLabel, findings, changedLines, config.rules.parameters);
      }
      if (config.rules.requestModels.enabled && shouldRunAnalyzer(projectMeta, "backend")) {
        analyzeRequestModels(lines, fileLabel, findings, changedLines, config.rules.requestModels);
      }
      if (config.rules.dtoAutoMapper.enabled && shouldRunAnalyzer(projectMeta, "backend")) {
        analyzeDtoAutoMapper(lines, fileLabel, findings, changedLines, config.rules.dtoAutoMapper);
      }
      if (config.rules.linq.enabled && shouldRunAnalyzer(projectMeta, "backend")) {
        analyzeLinqUsage(lines, fileLabel, findings, changedLines, config.rules.linq);
      }
      if (config.rules.objectUsage.enabled && shouldRunAnalyzer(projectMeta, "backend")) {
        analyzeObjectUsage(lines, fileLabel, findings, changedLines, config.rules.objectUsage);
      }
      if (config.rules.requestHandlers.enabled && shouldRunAnalyzer(projectMeta, "backend")) {
        analyzeRequestHandlers(lines, fileLabel, findings, changedLines, config.rules.requestHandlers);
      }
      if (config.rules.indentation.enabled) {
        analyzeIndentation(lines, fileLabel, findings, changedLines);
      }
      if (config.rules.ifBraces.enabled && shouldRunAnalyzer(projectMeta, "shared")) {
        analyzeIfStatements(lines, fileLabel, findings, changedLines);
      }
      if (config.rules.async.enabled && shouldRunAnalyzer(projectMeta, "backend")) {
        analyzeAsyncUsage(lines, fileLabel, findings, changedLines);
      }
      if (config.rules.varUsage.enabled && shouldRunAnalyzer(projectMeta, "backend")) {
        analyzeVarUsage(lines, fileLabel, findings, changedLines);
      }
      if (config.rules.stringInterpolation.enabled && shouldRunAnalyzer(projectMeta, "backend")) {
        analyzeStringInterpolation(lines, fileLabel, findings, changedLines);
      }
      if (config.rules.exceptionHandling.enabled && shouldRunAnalyzer(projectMeta, "backend")) {
        analyzeExceptionHandling(lines, fileLabel, findings, changedLines);
      }
      const extension = fileLabel.split(".").pop() ?? "";
      const languageId = EXTENSION_TO_LANGUAGE_ID[extension];
      if (languageId) {
        analyzeNaming(lines, languageId, fileLabel, findings);
      }
      if (config.rules.fileNaming.enabled && shouldRunAnalyzer(projectMeta, "frontend")) {
        analyzeFileNaming(lines, fileLabel, findings, folder.name);
      }
      if (config.rules.componentLocation.enabled && shouldRunAnalyzer(projectMeta, "frontend")) {
        analyzeComponentLocation(lines, fileLabel, findings, config.rules.componentLocation);
      }
    }
    const folderPaths = await collectFolderPaths(folder.uri, excludeMatchers);
    if (shouldRunAnalyzer(projectMeta, "frontend")) {
      analyzeFolderStructure(folderPaths, folder.name, findings);
    }
    if (config.rules.interfaces.enabled && shouldRunAnalyzer(projectMeta, "backend")) {
      await analyzeInterfaceContracts(fileLines, folder.uri, excludePattern, findings, config.rules.interfaces);
    }
    if (config.rules.layers.enabled && shouldRunAnalyzer(projectMeta, "backend")) {
      analyzeLayeredStructure(fileLines, folderPaths, findings, config.rules.layers);
    }
    if (config.rules.duplicateCode.enabled && shouldRunAnalyzer(projectMeta, "backend")) {
      analyzeDuplicateCode(fileLines, changedLinesByFile, findings, config.rules.duplicateCode);
    }
    for (const uri of envFiles) {
      const fileLabel = vscode4.workspace.asRelativePath(uri);
      const bytes = await vscode4.workspace.fs.readFile(uri);
      const lines = Buffer.from(bytes).toString("utf8").split("\n");
      if (config.rules.envNaming.enabled && shouldRunAnalyzer(projectMeta, "backend")) {
        analyzeEnvVariables(lines, fileLabel, findings);
      }
    }
    for (const uri of htmlCssFiles) {
      const fileLabel = vscode4.workspace.asRelativePath(uri);
      const bytes = await vscode4.workspace.fs.readFile(uri);
      const lines = Buffer.from(bytes).toString("utf8").split("\n");
      const extension = fileLabel.split(".").pop();
      const classLenguage = extension === "css" ? "css" : "html";
      if (config.rules.cssClassNaming.enabled && (extension === "html" || extension === "css" || extension === "jsx" || extension === "tsx") && shouldRunAnalyzer(projectMeta, "frontend")) {
        analyzeCssClassNaming(lines, classLenguage, fileLabel, findings);
      }
    }
    async function collectFolderPaths(uri, excludedNames) {
      const folderPaths2 = [];
      const entries = await vscode4.workspace.fs.readDirectory(uri);
      for (const [name, type] of entries) {
        if (type === vscode4.FileType.Directory) {
          const childUri = vscode4.Uri.joinPath(uri, name);
          const relativePath = vscode4.workspace.asRelativePath(childUri);
          if (isExluded(relativePath + "/", excludeMatchers)) {
            continue;
          }
          folderPaths2.push(relativePath);
          const nested = await collectFolderPaths(childUri, excludeMatchers);
          folderPaths2.push(...nested);
        }
      }
      return folderPaths2;
    }
    const reportContent = findings.length > 0 ? findings.join("\n") : "No se encontraron hallazgos.";
    const reportUri = vscode4.Uri.joinPath(folder.uri, "code-advisor-report.txt");
    await vscode4.workspace.fs.writeFile(reportUri, Buffer.from(reportContent, "utf8"));
    const reportDocument = await vscode4.workspace.openTextDocument(reportUri);
    await vscode4.window.showTextDocument(reportDocument);
  });
  context.subscriptions.push(disposable);
}

// src/extension.ts
function activate(context) {
  console.log('Congratulations, your extension "codeadvisor" is now active!');
  const disposable = vscode5.commands.registerCommand("codeadvisor.gitVerification", () => {
    const folder = vscode5.workspace.workspaceFolders?.[0];
    if (!folder) {
      vscode5.window.showErrorMessage("Abra una carpeta que sea un repositorio de git primero");
    }
    const folderPath = folder?.uri.fsPath;
    const git = vscode5.extensions.getExtension("vscode.git")?.exports.getAPI(1);
    const repo = folderPath ? git?.getRepository(vscode5.Uri.file(folderPath)) : void 0;
    if (!repo) {
      vscode5.window.showErrorMessage("No se pudo encontrar un repositorio de git en la carpeta abierta");
    }
  });
  registerCodeReviewerCommand(context);
  context.subscriptions.push(disposable);
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
/*! Bundled license information:

js-yaml/dist/js-yaml.mjs:
  (*! js-yaml 5.5.0 https://github.com/nodeca/js-yaml @license MIT *)
*/
//# sourceMappingURL=extension.js.map
