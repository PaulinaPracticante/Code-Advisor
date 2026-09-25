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
var vscode2 = __toESM(require("vscode"));

// src/codeReviewerCommand.ts
var vscode = __toESM(require("vscode"));

// src/namingConfig.ts
function matchesCase(name, caseStyle) {
  switch (caseStyle) {
    case "PascalCase":
      return /^[A-Z][a-zA-Z0-9]*$/.test(name) && /[a-z]/.test(name);
    case "camelCase":
      return /^[a-z][a-zA-Z0-9]*$/.test(name);
    case "UPPER_SNAKE_CASE":
      return /^[A-Z][A-Z0-9_]*$/.test(name);
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

// src/namingAnalyzer.ts
function matchFirstGroup(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}
function extractNamesByCategory(lines, config) {
  const classNames = [];
  const functionNames = [];
  const methodNames = [];
  const variableNames = [];
  const constantNames = [];
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
        functionNames.push(functionMatch);
      }
    }
    const variableMatch = matchFirstGroup(trimmed, config.variablePatterns);
    if (variableMatch) {
      variableNames.push(variableMatch);
    }
    const constantMatch = matchFirstGroup(trimmed, config.constantPatterns);
    if (constantMatch) {
      constantNames.push(constantMatch);
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
  return { classNames, functionNames, methodNames, variableNames, constantNames };
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
  const { classNames, functionNames, methodNames, variableNames, constantNames } = extractNamesByCategory(lines, namingConfig);
  reportInvalidNames(classNames, namingConfig.classCase, "La clase", fileLabel, findings);
  reportInvalidNames(functionNames, namingConfig.functionCase, "La funci\xF3n", fileLabel, findings);
  reportInvalidNames(methodNames, namingConfig.methodCase, "El m\xE9todo", fileLabel, findings);
  reportInvalidNames(variableNames, namingConfig.variableCase, "La variable", fileLabel, findings);
  reportInvalidNames(constantNames, namingConfig.constantCase, "La constante", fileLabel, findings);
}

// src/indentationAnalyzer.ts
var TAB_SIZE = 4;
function countSpaces(indent) {
  let ancho = 0;
  for (const char of indent) {
    ancho += char === "	" ? TAB_SIZE : 1;
  }
  return ancho;
}
function analyzeIndentation(lines, fileLabel, findings) {
  let indentationPrevious = "";
  lines.forEach((line, i) => {
    if (line.trim() === "") {
      return;
    }
    const indentMatch = line.match(/^[ \t]*/)?.[0] ?? "";
    const currentWide = countSpaces(indentMatch);
    const previousWide = countSpaces(indentationPrevious);
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
    indentationPrevious = indentMatch;
  });
}

// src/envAnalyzer.ts
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

// src/ifAnalyzer.ts
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
function checkNestedTernaries(lines, fileLabel, findings) {
  let i = 0;
  while (i < lines.length) {
    const trimmed = stripLineComment(lines[i]).trim();
    let totalTernaryCount = countTernaryOperators(trimmed);
    if (totalTernaryCount === 0) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < lines.length) {
      const nextTrimmed = stripLineComment(lines[j]).trim();
      if (!isTernaryContinuation(nextTrimmed)) {
        break;
      }
      totalTernaryCount += countTernaryOperators(nextTrimmed);
      j++;
    }
    if (totalTernaryCount >= 2) {
      findings.push(fileLabel + ":" + (i + 1) + ' - Se encontraron operadores ternarios anidados, evita anidar "?:"');
    }
    i = j;
  }
}
function analyzeIfStatements(lines, fileLabel, findings) {
  lines.forEach((rawLine, i) => {
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
  checkNestedTernaries(lines, fileLabel, findings);
}

// src/parameterAnalyzer.ts
var MAX_LINE_LENGHT = 120;
var MAX_INLINE_PARAMS = 3;
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
function analyzeParameters(lines, fileLabel, findings) {
  lines.forEach((rawLine, i) => {
    const line = stripLineComment2(rawLine);
    const match = line.match(/\b[A-Za-z_$][\w$]*\s*\(/);
    if (!match || match.index === void 0) {
      return;
    }
    const openIndex = match.index + match[0].length - 1;
    const closing = findClosingParen(lines, i, openIndex);
    if (!closing) {
      return;
    }
    let paramsText = closing.line === i ? line.slice(openIndex + 1, closing.col) : line.slice(openIndex + 1);
    if (closing.line !== i) {
      for (let j = i + 1; j < closing.line; j++) {
        paramsText += " " + stripLineComment2(line[j]);
      }
      paramsText += " " + stripLineComment2(lines[closing.line]).slice(0, closing.col);
    }
    const paramCount = countTopLevelParams(paramsText);
    if (paramCount <= MAX_INLINE_PARAMS) {
      return;
    }
    if (closing.line === i) {
      findings.push(fileLabel + ":" + (i + 1) + " - El metodo tiene mas de " + MAX_INLINE_PARAMS + " parametros, separalos en una linea por parametro con su tabulador");
    }
    if (rawLine.length > MAX_LINE_LENGHT) {
      findings.push(fileLabel + ":" + (i + 1) + " - La linea es muy larga (" + rawLine.length + "caracteres), evita lienas demasiado largas");
    }
  });
}

// src/requestModelAnalyzer.ts
function stripLineComment3(rawLine) {
  const commentIndex = rawLine.indexOf("//");
  return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}
var REQUEST_NAME_SUFFIXES = ["Request", "Dto", "Input", "Command", "Query", "Payload"];
var REQUEST_FOLDER_KEYWORDS = ["request", "dtos", "dto", "inputs", "contracts"];
function isRequestClassName(className) {
  return REQUEST_NAME_SUFFIXES.some((suffix) => new RegExp(`${suffix}$`, "i").test(className));
}
function isInRequestFolder(fileLabel) {
  const normalized = fileLabel.toLowerCase().replace(/\\/g, "/");
  return REQUEST_FOLDER_KEYWORDS.some((folder) => normalized.includes(`/${folder}/`));
}
function extendsOrImplementsRequest(classDeclarationLine) {
  return /\b(?:extends|implements|:)\s+[\w<>,\s]*Request/i.test(classDeclarationLine);
}
function isRequestModel(className, classDeclarationLine, fileLabel) {
  return isRequestClassName(className) || isInRequestFolder(fileLabel) || extendsOrImplementsRequest(classDeclarationLine);
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
  tsx: TS_CONFIG,
  js: JS_CONFIG,
  jsx: JS_CONFIG,
  php: PHP_CONFIG
};
function analyzeRequestModels(lines, fileLabel, findings) {
  const extension = fileLabel.split(".").pop() ?? "";
  const config = EXTENSION_TO_CONFIG[extension];
  if (!config) {
    return;
  }
  let insideRequestClass = false;
  let depth = 0;
  lines.forEach((rawLine, i) => {
    const line = stripLineComment3(rawLine).trim();
    const classMatch = line.match(config.classPattern);
    if (classMatch) {
      insideRequestClass = isRequestModel(classMatch[1], line, fileLabel);
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
    if (config.missingDefaultPattern.test(line)) {
      findings.push(fileLabel + ":" + (i + 1) + ' - La propiedad debe inicializar con un valor por default (ej. 0, "", string.Empty)');
    }
  });
}

// src/dtoAutoMapperAnalyzer.ts
var MAX_PROPERTIES_WITHOUT_AUTOMAPPER = 15;
var MIN_MANUAL_ASSIGNMENTS = 3;
function stripLineComment4(rawLine) {
  const commentIndex = rawLine.indexOf("//");
  return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}
var CLASS_PATTERN = /^(?:(?:public|private|protected|internal|static|abstract|sealed|partial)\s+)*class\s+([A-Za-z0-9_]*)/;
var PROPERTY_PATTERN = /^(?:public|private|protected|internal)\s+(?:readonly\s+)?[\w<>[\],.?]+\s+[A-Za-z_][A-Za-z0-9_]*\s*\{\s*get;\s*(?:set;|init;)?\s*\}/;
var NEW_INSTANCE_PATTERN = /\b(?:var|[A-Za-z_][A-Za-z0-9_<>]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*new\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/;
var MANUAL_ASSIGNMENT_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)\.\w+\s*=\s*([A-Za-z_][A-Za-z0-9_]*)\.\w+\s*;/;
function analyzeDtoAutoMapper(lines, fileLabel, findings) {
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
          if (propertyCount >= MAX_PROPERTIES_WITHOUT_AUTOMAPPER) {
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
    if (assignMatch && blockEnds && streak >= MIN_MANUAL_ASSIGNMENTS) {
      const targetClass = variableTypes.get(streakTarget);
      if (targetClass && bigClasses.has(targetClass)) {
        findings.push(
          fileLabel + ":" + (streakStartLine + 1) + ' - "' + targetClass + '" tiene mas de ' + MAX_PROPERTIES_WITHOUT_AUTOMAPPER + " propiedades, usa AutoMapper (_mapper.Map<" + targetClass + ">(...)) en lugar de asignar cada propiedad manualmente"
        );
      }
    }
  });
}

// src/linqAnalyzer.ts
var FOREACH_PATTERN = /^foreach\s*\(\s*(?:var|[\w<>[\],.]+)\s+([A-Za-z_]\w*)\s+in\s+([A-Za-z_][\w.]*)\s*\)/;
var FOR_INDEXED_PATTERN = /^for\s*\(\s*int\s+([A-Za-z_]\w*)\s*=\s*0\s*;\s*\1\s*<\s*([A-Za-z_][\w.]*)\.Count\s*;\s*\1\+\+\s*\)/;
var IF_PATTERN = /^if\s*\((.+)\)/;
var ADD_CALL_PATTERN = /^([A-Za-z_]\w*)\.Add\(\s*(.+?)\s*\)\s*;/;
var INCREMENT_PATTERN = /^([A-Za-z_]\w*)\s*(?:\+\+|\+=\s*1\s*;)/;
var ACCUMULATE_PATTERN = /^([A-Za-z_]\w*)\s*\+=\s*(.+?)\s*;/;
var ASSING_PATTERN = /^([A-Za-z_]\w*)\s*=\s*(.+?)\s*;/;
var BREAK_PATTERN = /^break\s*;/;
function analyzeLinqUsage(lines, fileLabel, findings) {
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
          if (sawIf && sawAdd) {
            findings.push(
              fileLabel + ":" + (loopStartLine + 1) + ' - reemplaza el loop manual por "' + sourceCollection + ".Where(" + loopVar + " => condicion).Select(" + loopVar + ' => valor).ToList()" para mejorar la legibilidad'
            );
          } else if (sawAdd) {
            findings.push(
              fileLabel + ":" + (loopStartLine + 1) + ' - reemplaza la transformacion manual por "' + sourceCollection + ".Select(" + loopVar + ' => valor).ToList()" en lugar de usar Add() dentro del loop'
            );
          } else if (sawIf && sawIncrement) {
            findings.push(
              fileLabel + ":" + (loopStartLine + 1) + ' - reemplaza el conteo manual por "' + sourceCollection + ".Count(" + loopVar + ' => condicion)"'
            );
          } else if (sawSum) {
            findings.push(
              fileLabel + ":" + (loopStartLine + 1) + ' - reemplaza la acumulacion manual por "' + sourceCollection + ".Sum(" + loopVar + ' => valor)" en lugar de sumar dentro de un loop'
            );
          } else if (sawIf && sawAssignThenBreak) {
            findings.push(
              fileLabel + ":" + (loopStartLine + 1) + ' - reemplaza la busqueda manual por "' + sourceCollection + ".FirstOrDefault(" + loopVar + ' => condicion)"'
            );
          }
          insideLoop = false;
        }
      }
    }
  });
}

// src/asyncAnalyzer.ts
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
function analyzeAsyncUsage(lines, fileLabel, findings) {
  if (!fileLabel.endsWith("cs")) {
    return;
  }
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
      if (isAsync && returnType === "void" && !EVENT_HANDLER_PATTERN.test(line)) {
        findings.push(where + ' - el metodo"' + methodName + '"es async void; cambialo a "async Task" para poder esperarlo y capturar sus excepciones');
      }
    }
    if (!insideMethod) {
      return;
    }
    if (AWAIT_PATTERN.test(line)) {
      sawAwait = true;
    }
    if (BLOCKING_PATTERN.test(line)) {
      findings.push(where + ' - evita bloquear con .Result/.Wait()/GetResult(); usa "await" para no provocar deadlocks');
    }
    if (isAsync && THREAD_SLEEP_PATTERN.test(line)) {
      findings.push(where + ' - usa "await Task.Delay(...)" en lugar de Thread.Sleep dentro de un metodo async');
    }
    const asyncCall = line.match(ASYNC_CALL_PATTERN);
    if (asyncCall && asyncCall[1] !== methodName && !ASYNC_CALL_HANDLED_PATTERN.test(line)) {
      findings.push(where + ' - la llamada a "' + asyncCall[1] + '" no se espera; agrega "await" para no dejar la tarea sin controlar');
    }
    for (const [pattern, syncName, asyncName] of SYNC_IO_CALLS) {
      if (pattern.test(line) && !line.includes(asyncName)) {
        findings.push(where + ' - "' + asyncName + '"es una operacion de E/S sincrona; usa "await ' + asyncName + '(...)" y marca el metodo como async');
      }
    }
    const efMatch = line.match(EF_SYNC_QUERY_PATTERN);
    if (efMatch && EF_CONTEXT_PATTERN.test(line)) {
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
      if (isAsync && !sawAwait) {
        findings.push(fileLabel + ":" + (methodStartLine + 1) + ' - el metodo "' + methodName + '" es async pero no contiene ningun await; quita "async" o espera la operacion de E/S');
      }
      insideMethod = false;
    }
  });
}

// src/codeReviewerCommand.ts
function registerCodeReviewerCommand(context) {
  const disposable = vscode.commands.registerCommand("codeadvisor.codeReviewer", async () => {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      vscode.window.showErrorMessage("Abra una carpeta que sea un repositorio de git primero");
      return;
    }
    const findings = [];
    const excludePattern = "{**/node_modules/**,**/dist/**,**/out/**,**/.git/**,**/build/**}";
    const codeFiles = await vscode.workspace.findFiles("**/*.{ts,tsx,js,jsx,php,cs}", excludePattern);
    const envFiles = await vscode.workspace.findFiles("**/.env*", excludePattern);
    for (const uri of codeFiles) {
      const fileLabel = vscode.workspace.asRelativePath(uri);
      const bytes = await vscode.workspace.fs.readFile(uri);
      const lines = Buffer.from(bytes).toString("utf8").split("\n");
      analyzeIndentation(lines, fileLabel, findings);
      analyzeIfStatements(lines, fileLabel, findings);
      analyzeParameters(lines, fileLabel, findings);
      analyzeRequestModels(lines, fileLabel, findings);
      analyzeDtoAutoMapper(lines, fileLabel, findings);
      analyzeLinqUsage(lines, fileLabel, findings);
      analyzeAsyncUsage(lines, fileLabel, findings);
      const extension = fileLabel.split(".").pop() ?? "";
      const languageId = EXTENSION_TO_LANGUAGE_ID[extension];
      if (languageId) {
        analyzeNaming(lines, languageId, fileLabel, findings);
      }
    }
    for (const uri of envFiles) {
      const fileLabel = vscode.workspace.asRelativePath(uri);
      const bytes = await vscode.workspace.fs.readFile(uri);
      const lines = Buffer.from(bytes).toString("utf8").split("\n");
      analyzeEnvVariables(lines, fileLabel, findings);
    }
    const reportContent = findings.length > 0 ? findings.join("\n") : "No se encontraron hallazgos.";
    const reportUri = vscode.Uri.joinPath(folder.uri, "code-advisor-report.txt");
    await vscode.workspace.fs.writeFile(reportUri, Buffer.from(reportContent, "utf8"));
    const reportDocument = await vscode.workspace.openTextDocument(reportUri);
    await vscode.window.showTextDocument(reportDocument);
  });
  context.subscriptions.push(disposable);
}

// src/extension.ts
function activate(context) {
  console.log('Congratulations, your extension "codeadvisor" is now active!');
  const disposable = vscode2.commands.registerCommand("codeadvisor.gitVerification", () => {
    const folder = vscode2.workspace.workspaceFolders?.[0];
    if (!folder) {
      vscode2.window.showErrorMessage("Abra una carpeta que sea un repositorio de git primero");
    }
    const folderPath = folder?.uri.fsPath;
    const git = vscode2.extensions.getExtension("vscode.git")?.exports.getAPI(1);
    const repo = folderPath ? git?.getRepository(vscode2.Uri.file(folderPath)) : void 0;
    if (!repo) {
      vscode2.window.showErrorMessage("No se pudo encontrar un repositorio de git en la carpeta abierta");
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
