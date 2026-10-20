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
var vscode4 = __toESM(require("vscode"));

// src/commands/codeReviewerCommand.ts
var vscode3 = __toESM(require("vscode"));
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
var TAB_SIZE = 4;
function countSpaces(indent) {
  let ancho = 0;
  for (const char of indent) {
    ancho += char === "	" ? TAB_SIZE : 1;
  }
  return ancho;
}
function analyzeIndentation(lines, fileLabel, findings, changedLines) {
  let indentationPrevious = "";
  lines.forEach((line, i) => {
    if (line.trim() === "") {
      return;
    }
    const indentMatch = line.match(/^[ \t]*/)?.[0] ?? "";
    const currentWide = countSpaces(indentMatch);
    const previousWide = countSpaces(indentationPrevious);
    if (changedLines.has(i + 1)) {
      if (currentWide > previousWide) {
        const newPart = indentMatch.slice(indentationPrevious.length);
        if (newPart.includes(" ")) {
          findings.push(fileLabel + ":" + (i + 1) + " - La linea debio usar tabulaciones en lugar de espacios para la identacion");
        }
      } else {
        if (indentMatch.includes(" ")) {
          findings.push(fileLabel + ":" + (i + 1) + " - La linea debio usar tabulaciones en lugar de espacios para la identacion");
        }
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
function getBaseName(fileLabel) {
  const normalized = fileLabel.replace(/\\/g, "/");
  const fileName = normalized.split("/").pop() ?? normalized;
  return fileName.split(".")[0];
}
function analyzeFileNaming(lines, fileLabel, findings) {
  const baseName = getBaseName(fileLabel);
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
  const disposable = vscode3.commands.registerCommand("codeadvisor.codeReviewer", async () => {
    const folder = vscode3.workspace.workspaceFolders?.[0];
    if (!folder) {
      vscode3.window.showErrorMessage("Abra una carpeta que sea un repositorio de git primero");
      return;
    }
    const config = await loadConfig(folder.uri);
    const excludeMatchers = buildExcludeMatchers(config);
    const findings = [];
    const excludePattern = `{${config.exclude.join(",")}}`;
    const baseBranch = vscode3.workspace.getConfiguration("codeadvisor").get("baseBranch", "main");
    const changedPaths = getChangedFile(folder.uri.fsPath, baseBranch);
    const codeFiles = changedPaths.filter((path3) => /\.(ts|tsx|js|jsx|php|cs)$/.test(path3)).filter((path3) => !isExluded(path3, excludeMatchers)).map((path3) => vscode3.Uri.joinPath(folder.uri, path3));
    const envFiles = changedPaths.filter((path3) => /(^|\/)\.env/.test(path3)).filter((path3) => !isExluded(path3, excludeMatchers)).map((path3) => vscode3.Uri.joinPath(folder.uri, path3));
    const htmlCssFiles = changedPaths.filter((path3) => /\.(html|css|jsx|tsx)$/.test(path3)).filter((path3) => !isExluded(path3, excludeMatchers)).map((path3) => vscode3.Uri.joinPath(folder.uri, path3));
    const fileLines = /* @__PURE__ */ new Map();
    const changedLinesByFile = /* @__PURE__ */ new Map();
    for (const uri of codeFiles) {
      const fileLabel = vscode3.workspace.asRelativePath(uri);
      const bytes = await vscode3.workspace.fs.readFile(uri);
      const lines = Buffer.from(bytes).toString("utf8").split("\n");
      const changedLines = getChangedLineNumbers(folder.uri.fsPath, baseBranch, fileLabel);
      fileLines.set(fileLabel, lines);
      changedLinesByFile.set(fileLabel, changedLines);
      if (config.rules.parameters.enabled) {
        analyzeParameters(lines, fileLabel, findings, changedLines, config.rules.parameters);
      }
      if (config.rules.requestModels.enabled) {
        analyzeRequestModels(lines, fileLabel, findings, changedLines, config.rules.requestModels);
      }
      if (config.rules.dtoAutoMapper.enabled) {
        analyzeDtoAutoMapper(lines, fileLabel, findings, changedLines, config.rules.dtoAutoMapper);
      }
      if (config.rules.linq.enabled) {
        analyzeLinqUsage(lines, fileLabel, findings, changedLines, config.rules.linq);
      }
      if (config.rules.objectUsage.enabled) {
        analyzeObjectUsage(lines, fileLabel, findings, changedLines, config.rules.objectUsage);
      }
      if (config.rules.indentation.enabled) {
        analyzeIndentation(lines, fileLabel, findings, changedLines);
      }
      if (config.rules.ifBraces.enabled) {
        analyzeIfStatements(lines, fileLabel, findings, changedLines);
      }
      if (config.rules.async.enabled) {
        analyzeAsyncUsage(lines, fileLabel, findings, changedLines);
      }
      if (config.rules.varUsage.enabled) {
        analyzeVarUsage(lines, fileLabel, findings, changedLines);
      }
      if (config.rules.stringInterpolation.enabled) {
        analyzeStringInterpolation(lines, fileLabel, findings, changedLines);
      }
      if (config.rules.exceptionHandling.enabled) {
        analyzeExceptionHandling(lines, fileLabel, findings, changedLines);
      }
      const extension = fileLabel.split(".").pop() ?? "";
      const languageId = EXTENSION_TO_LANGUAGE_ID[extension];
      if (languageId) {
        analyzeNaming(lines, languageId, fileLabel, findings);
      }
      if (config.rules.fileNaming.enabled) {
        analyzeFileNaming(lines, fileLabel, findings);
      }
    }
    const folderPaths = await collectFolderPaths(folder.uri, excludeMatchers);
    if (config.rules.interfaces.enabled) {
      await analyzeInterfaceContracts(fileLines, folder.uri, excludePattern, findings, config.rules.interfaces);
    }
    if (config.rules.layers.enabled) {
      analyzeLayeredStructure(fileLines, folderPaths, findings, config.rules.layers);
    }
    if (config.rules.duplicateCode.enabled) {
      analyzeDuplicateCode(fileLines, changedLinesByFile, findings, config.rules.duplicateCode);
    }
    for (const uri of envFiles) {
      const fileLabel = vscode3.workspace.asRelativePath(uri);
      const bytes = await vscode3.workspace.fs.readFile(uri);
      const lines = Buffer.from(bytes).toString("utf8").split("\n");
      if (config.rules.envNaming.enabled) {
        analyzeEnvVariables(lines, fileLabel, findings);
      }
    }
    for (const uri of htmlCssFiles) {
      const fileLabel = vscode3.workspace.asRelativePath(uri);
      const bytes = await vscode3.workspace.fs.readFile(uri);
      const lines = Buffer.from(bytes).toString("utf8").split("\n");
      const extension = fileLabel.split(".").pop();
      const classLenguage = extension === "css" ? "css" : "html";
      if (config.rules.cssClassNaming.enabled && (extension === "html" || extension === "css" || extension === "jsx" || extension === "tsx")) {
        analyzeCssClassNaming(lines, classLenguage, fileLabel, findings);
      }
    }
    async function collectFolderPaths(uri, excludedNames) {
      const folderPaths2 = [];
      const entries = await vscode3.workspace.fs.readDirectory(uri);
      for (const [name, type] of entries) {
        if (type === vscode3.FileType.Directory) {
          const childUri = vscode3.Uri.joinPath(uri, name);
          const relativePath = vscode3.workspace.asRelativePath(childUri);
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
    const reportUri = vscode3.Uri.joinPath(folder.uri, "code-advisor-report.txt");
    await vscode3.workspace.fs.writeFile(reportUri, Buffer.from(reportContent, "utf8"));
    const reportDocument = await vscode3.workspace.openTextDocument(reportUri);
    await vscode3.window.showTextDocument(reportDocument);
  });
  context.subscriptions.push(disposable);
}

// src/extension.ts
function activate(context) {
  console.log('Congratulations, your extension "codeadvisor" is now active!');
  const disposable = vscode4.commands.registerCommand("codeadvisor.gitVerification", () => {
    const folder = vscode4.workspace.workspaceFolders?.[0];
    if (!folder) {
      vscode4.window.showErrorMessage("Abra una carpeta que sea un repositorio de git primero");
    }
    const folderPath = folder?.uri.fsPath;
    const git = vscode4.extensions.getExtension("vscode.git")?.exports.getAPI(1);
    const repo = folderPath ? git?.getRepository(vscode4.Uri.file(folderPath)) : void 0;
    if (!repo) {
      vscode4.window.showErrorMessage("No se pudo encontrar un repositorio de git en la carpeta abierta");
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
//# sourceMappingURL=extension.js.map
