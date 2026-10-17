// ---------------------------------------------------------------------------------------------
// ---- VERFICACION DE CONTRATOS: INTERFACES Y CLASES ABSTRACTAS IMPLEMENTADAS -----------------
// ---------------------------------------------------------------------------------------------

import * as vscode from 'vscode';
import * as path from 'path';
import { InterfacesConfig } from '../../config/configLoader';

// funcion que quita los comentarios
function stripLineComment(rawLine: string): string {
    const commentIndex = rawLine.indexOf('//');
    return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}

// guarda lo que tiene cada contrato
interface ContractInfo {
    kind: 'interface' | 'abstract-class';
    methods: Set<string>; //nombre de los metodos 
    parents: string[]; //que otras intefaces hereda 
    fileLabel: string; // en que archivo esta
}

//la llaves en el nombre del contrato y el valor es su ContractInfo 
type ContractRegistry = Map<string, ContractInfo>;

//toma el texto despues de los : y lo convierte en una lista de nombres 
function splitTypeList(raw: string | undefined): string[] {
    if (!raw) { return []; }
    return raw
        .split(',')
        .map(token => token.trim().split('<')[0].trim())
        .filter(token => token.length > 0);
}

// ---- C# --------------------------------------------------------------------------------------------------

//detecta la declaracion de interfaz y de que hereda 
const INTERFACE_PATTERN = /^(?:public|internal)?\s*interface\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*([\w,\s<>]+))?/;
//detecta declaracion de clase abstracta
const ABSTRACT_CLASS_PATTERN = /^(?:public|internal)?\s*abstract\s+(?:partial\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*([\w,\s<>]+))?/;
// "void Foo(int x);" o "Task<string> Bar();" o "abstract void Foo();" -- siempre sin cuerpo, termina en ";"
const ABSTRACT_METHOD_PATTERN = /^(?:abstract\s+)?[\w<>[\],.?]+\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^()]*\)\s*;/;
//detecta cualquier clase y lo pone que pone despues de :
const CLASS_PATTERN = /^(?:(?:public|private|protected|internal|static|sealed|partial)\s+)*class\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*([\w,\s<>]+))?/;
//detecta si la clase encontrada es abstracta 
const CLASS_IS_ABSTRACT_PATTERN = /^\s*(?:public|internal)?\s*abstract\s+class\b/;
//lista de palabras
const CSHARP_MODIFIERS = '(?:public|private|protected|internal|static|virtual|override|async|abstract|sealed|new|extern)';
//detecta un metodo con cuerpo ({ o =>}) y con al menos un modificador 
const DEFINED_METHOD_PATTERN = new RegExp(`^(?:${CSHARP_MODIFIERS}\\s+)+[\\w<>\\[\\],.?]+\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*\\([^()]*\\)\\s*(?:\\{|=>)`);

//funcion que junta todas las interfaces y clases abstractas con sus metodos 
function collectCSharpContracts(lines: string[], fileLabel: string, registry: ContractRegistry, includeAbstractClasses: boolean): void {
    let insideContract = false; //indica si esta dentro de una interfaz o clase abstracta
    //datos del contrato que se esta leyendo 
    let currentMethod: Set<string> = new Set();
    let currentName = '';
    let currentParents: string [] = [];
    let currentKind: ContractInfo['kind'] = 'interface';
    let depth = 0; //cntacto de llaves 

    //guarda el contrato en el registry y limpia las variables para el siguiente 
    const closeCurrentContract = () => {
        if (currentName && (includeAbstractClasses || currentKind !== 'abstract-class')) {
            registry.set(currentName, { kind: currentKind, methods: currentMethod, parents: currentParents, fileLabel});
        }
        insideContract = false;
        currentMethod = new Set();
        currentName = '';
        currentParents = [];
    };

    lines.forEach(rawLine => {
        const line = stripLineComment(rawLine).trim(); //quita los comentarios y espacios 

        const interfaceMatch = line.match(INTERFACE_PATTERN);
        const abstractClassMatch = !interfaceMatch ? line.match(ABSTRACT_CLASS_PATTERN): null;

        //si es una declaracion de interfaz o de clase abstracta, empieza un contrato nuevo 
        if (interfaceMatch || abstractClassMatch) {
            //si ya habia bierto uno, lo cierra 
            if (insideContract) { closeCurrentContract(); }
            const match = interfaceMatch ?? abstractClassMatch!; 
            // guarda los nombres, los padres, reinicia el depth y pasa a la siguiente linea 
            insideContract = true;
            depth = 0;
            currentKind = interfaceMatch ? 'interface' : 'abstract-class';
            currentName = match[1];
            currentParents = splitTypeList(match[2]);
            return;
        }

        //si no esta dentro de un contrato ignora la linea 
        if (!insideContract) { return; }

        //si la linea es un metodo sin cuerpo, agrega el nombre a currentMethod 
        const methodMatch = line.match(ABSTRACT_METHOD_PATTERN);
        if (methodMatch) { currentMethod.add(methodMatch[1]); }

        //cuenta las llaves: { suma 1 y } resta 1, cuando depth llega a 0 es porque el contrato termino 
        if (line.includes('{')) { depth++; }
        if (line.includes('}')) {
            depth--;
            if (depth <= 0) { closeCurrentContract(); }
        }
    });

    if (insideContract) { closeCurrentContract(); }
}

//recibe el nombre de un contrato y devuelve todos los metodos que exige, incluyendo el de sus padres 
function resolveRequireMethods(contractName: string, registry: ContractRegistry, visited: Set<string> = new Set()): Set<string> {
    if (visited.has(contractName)) { return new Set(); } //evita un ciclo infinito si dos clases de heredan entre si 
    visited.add(contractName);

    const contract = registry.get(contractName);
    if (!contract) { return new Set(); }

    const result = new Set(contract.methods);
    for (const parent of contract.parents) {
        for (const inherited of resolveRequireMethods(parent, registry, visited)) {
            result.add(inherited);
        }
    }
    return result;
}


//revisa cada clase que implementa uno de esos contratos y verifica que defina todos los metodos que pide 
function analyzeCSharpContractImplementations(lines: string[], fileLabel: string, registry: ContractRegistry, findings: string[]): void {
    let insideClass = false; //indica si esta dentro de una clase 
    let isAbstractClass = false; //indica si es una clase abstracta 
    //guarda los datos de la clase 
    let className = '';
    let classStartLine = 0;
    let requiredContracts: string[] = [];
    let definedMethods: Set<string> = new Set();
    let depth = 0; //contador de llaves 

    const closeCurrentClass = () => {
        //si no es una clase abstracta 
        if (!isAbstractClass) {
            //por cada contrato que implementa obtiene todos sus metodos exigidos 
            for (const ContractName of requiredContracts) {
                const required = resolveRequireMethods(ContractName, registry);
                for (const methodName of required) {
                    //por cada metodo que no este en defineMethods, hay un hallazgo 
                    if (!definedMethods.has(methodName)) {
                        findings.push(
                            fileLabel + ':' + (classStartLine + 1) + 
                            ' - La clase "' + className + '" implementa "' + ContractName + 
                            '" pero no define el metodo "' + methodName + '"'
                        );
                    }
                }
            }
        }
        insideClass = false;
        requiredContracts = [];
        definedMethods = new Set();
    };

    lines.forEach((rawLine, i) => {
        const line = stripLineComment(rawLine).trim(); //quita los comentarios 

        const classMatch = line.match(CLASS_PATTERN);
        //si es una declaracion de base 
        if (classMatch) {
            insideClass = true;
            depth = 0;
            classStartLine = i; //guarda la linea donde empieza 
            className = classMatch[1]; //guarda el nombre 
            isAbstractClass = CLASS_IS_ABSTRACT_PATTERN.test(line); //revisa si la clase es abstracta

            //solo se queda con los nombres que si estan en el registro 
            requiredContracts = splitTypeList(classMatch[2]).filter(name => registry.has(name));
        }

        if (!insideClass) { return; }

        const methodMatch = line.match(DEFINED_METHOD_PATTERN);
        //si la linea es un metodo co cuerpo, agrega su nombre a defineMethods 
        if (methodMatch) { definedMethods.add(methodMatch[1]); }

        //cuenta las llaves 
        if (line.includes('{')) { depth++; }
        if (line.includes('}')) {
            depth--;
            if (depth <= 0) { closeCurrentClass(); } //cuando termina llama a closeCurrentClass
        }
    });

    if (insideClass) { closeCurrentClass(); }
}

//Carpetas donde normalmente viven las interfaces/contratos 
const CONTRACT_FOLDER_NAMES = ['models', 'model', 'interfaces', 'interface'];


// ---- TS ------------------------------------------------------------------------------------

// export interface Pago extends OtraCosa { ... }
const TS_INTERFACE_PATTERN = /^(?:export\s+)?(?:default\s+)?interface\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([\w,\s<>]+))?/;

// export abstract class Foo extends Bar implements A, B {
const TS_ABSTRACT_CLASS_PATTERN = /^(?:export\s+)?(?:default\s+)?abstract\s+class\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([\w<>]+))?(?:\s+implements\s+([\w,\s<>]+))?/;

// miembro de interfaz, firma sin cuerpo: procesar(monto: number): boolean;
const TS_METHOD_SIGNATURE_PATTERN = /^([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*(?::\s*[\w<>[\],.?|&\s]+)?\s*;/;

// export class PagoTarjeta implements Pago {   /  class X extends Base implements A, B {
const TS_CLASS_PATTERN = /^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([\w<>]+))?(?:\s+implements\s+([\w,\s<>]+))?/;

// metodo con cuerpo dentro de una clase: procesar(monto: string): boolean {
const TS_DEFINED_METHOD_PATTERN = /^(?:public\s+|private\s+|protected\s+|static\s+|async\s+|readonly\s+|override\s+)*([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*(?::\s*[\w<>[\],.?|&\s]+)?\s*(?:\{|=>)/;

//detecta si la clase encontrada es abstracta (a diferencia de C#, en TS normalmente va precedida de "export")
const TS_CLASS_IS_ABSTRACT_PATTERN = /^(?:export\s+)?(?:default\s+)?abstract\s+class\b/;

// import { Pago, Otro as X } from "./interfaces/pruebaInterfaz";
// import Pago from "./interfaces/pruebaInterfaz";
const TS_IMPORT_PATTERN = /^import\s+(?:\{([^}]+)\}|([A-Za-z_$][\w$]*))\s+from\s+['"](.+?)['"]\s*;?/;

//nombre importado = ruta del modulo tal cual como aparece en el import 
type ImportMap = Map<string, string>;

function collectTsContracts(lines: string[], fileLabel: string, registry: ContractRegistry, includeAbstractClasses: boolean): void {
    let insideContract = false; //indica si esta dentro de una interfaz o clase abstracta
    //datos del contrato que se esta leyendo 
    let currentMethod: Set<string> = new Set();
    let currentName = '';
    let currentParents: string [] = [];
    let currentKind: ContractInfo['kind'] = 'interface';
    let depth = 0; //cntacto de llaves 

    //guarda el contrato en el registry y limpia las variables para el siguiente 
    const closeCurrentContract = () => {
        if (currentName && (includeAbstractClasses || currentKind !== 'abstract-class')) {
            registry.set(currentName, { kind: currentKind, methods: currentMethod, parents: currentParents, fileLabel});
        }
        insideContract = false;
        currentMethod = new Set();
        currentName = '';
        currentParents = [];
    };

    lines.forEach(rawLine => {
        const line = stripLineComment(rawLine).trim(); //quita los comentarios y espacios 

        const interfaceMatch = line.match(TS_INTERFACE_PATTERN);
        const abstractClassMatch = !interfaceMatch ? line.match(TS_ABSTRACT_CLASS_PATTERN): null;

        //si es una declaracion de interfaz o de clase abstracta, empieza un contrato nuevo 
        if (interfaceMatch || abstractClassMatch) {
            //si ya habia bierto uno, lo cierra 
            if (insideContract) { closeCurrentContract(); }
            const match = interfaceMatch ?? abstractClassMatch!; 
            // guarda los nombres, los padres, reinicia el depth y pasa a la siguiente linea 
            insideContract = true;
            depth = 0;
            currentKind = interfaceMatch ? 'interface' : 'abstract-class';
            currentName = match[1];
            currentParents = splitTypeList(match[2]);
            return;
        }

        //si no esta dentro de un contrato ignora la linea 
        if (!insideContract) { return; }

        //si la linea es un metodo sin cuerpo, agrega el nombre a currentMethod
        const methodMatch = line.match(TS_METHOD_SIGNATURE_PATTERN);
        if (methodMatch) { currentMethod.add(methodMatch[1]); }

        //cuenta las llaves: { suma 1 y } resta 1, cuando depth llega a 0 es porque el contrato termino 
        if (line.includes('{')) { depth++; }
        if (line.includes('}')) {
            depth--;
            if (depth <= 0) { closeCurrentContract(); }
        }
    });

    if (insideContract) { closeCurrentContract(); }
}

//saca el mapa de import de un archivo 
function parseTsImports(lines: string[]): ImportMap {
    const importMap: ImportMap = new Map();
    for (const rawLine of lines) {
        const line = stripLineComment(rawLine).trim();
        const match = line.match(TS_IMPORT_PATTERN);
        if (!match) { continue; }
        const modulePath = match[3];
        if (match[1]) {
            // import { A, B as C} from "...";
            match[1].split(',').forEach(token => {
                const name = token.trim().split(/\s+as\s+/)[0].trim();
                if (name) { importMap.set(name, modulePath); }
            });
        } else if (match[2]) {
            importMap.set(match[2], modulePath); //import Default from "...";
        }
    }
    return importMap;
}

// resuelve "./interfaces/pruebaInterfaz" a un archivo real (del PR o del disco)
// sirve tanto para imports de TS como de JS, por eso prueba todas las extensiones
async function resolveModuleFile(
    fromFileLabel: string,
    modulePath: string,
    workspaceFolder: vscode.Uri,
    profileLines: Map<string, string[]>
): Promise<{ fileLabel: string; lines: string[]} | null> {
    if (!modulePath.startsWith('.')) { return null; } //ignora paquetes externos (node_modules)

    const baseDir = path.posix.dirname(fromFileLabel);
    const resolvedBase = path.posix.normalize(path.posix.join(baseDir, modulePath));

    const candidates = [
        resolvedBase + '.ts',
        resolvedBase + '.js',
        path.posix.join(resolvedBase, 'index.ts'),
        path.posix.join(resolvedBase, 'index.js'),
    ];

    for (const candidate of candidates) {
        if (profileLines.has(candidate)) {
            return { fileLabel: candidate, lines: profileLines.get(candidate)! };
        }
        try {
            const uri = vscode.Uri.joinPath(workspaceFolder, candidate);
            const bytes = await vscode.workspace.fs.readFile(uri);
            return { fileLabel: candidate, lines: Buffer.from(bytes).toString('utf8').split('\n') };
        } catch {
            continue; // prueba la siguiente extension/candidato
        }
    }
    return null;
}

// saca de todo el archivo los nombres usados en "extends"/"implements" de sus clases
function findReferencedContractNames(lines: string[]): string[] {
    const names: string[] = [];
    lines.forEach(rawLine => {
        const match = stripLineComment(rawLine).trim().match(TS_CLASS_PATTERN);
        if (!match) { return; }
        names.push(...splitTypeList(match[2]), ...splitTypeList(match[3]));
    });
    return names;
}

// saca de todo el archivo los nombres usados en los tags /** @implements {Nombre} */
function findReferencedJsContractNames(lines: string[]): string[] {
    const names: string[] = [];
    lines.forEach(rawLine => {
        const match = stripLineComment(rawLine).trim().match(JS_IMPLEMENTS_JSDOC_PATTERN);
        if (match) { names.push(match[1]); }
    });
    return names;
}

function analyzeTsContractImplementations( lines: string[], fileLabel: string, registry: ContractRegistry, findings: string[]): void {
    let insideClass = false; //indica si esta dentro de una clase 
    let isAbstractClass = false; //indica si es una clase abstracta 
    //guarda los datos de la clase 
    let className = '';
    let classStartLine = 0;
    let requiredContracts: string[] = [];
    let definedMethods: Set<string> = new Set();
    let depth = 0; //contador de llaves 

    const closeCurrentClass = () => {
        //si no es una clase abstracta 
        if (!isAbstractClass) {
            //por cada contrato que implementa obtiene todos sus metodos exigidos 
            for (const ContractName of requiredContracts) {
                const required = resolveRequireMethods(ContractName, registry);
                for (const methodName of required) {
                    //por cada metodo que no este en defineMethods, hay un hallazgo 
                    if (!definedMethods.has(methodName)) {
                        findings.push(
                            fileLabel + ':' + (classStartLine + 1) + 
                            ' - La clase "' + className + '" implementa "' + ContractName + 
                            '" pero no define el metodo "' + methodName + '"'
                        );
                    }
                }
            }
        }
        insideClass = false;
        requiredContracts = [];
        definedMethods = new Set();
    };

    lines.forEach((rawLine, i) => {
        const line = stripLineComment(rawLine).trim(); //quita los comentarios 

        const classMatch = line.match(TS_CLASS_PATTERN);
        //si es una declaracion de base 
        if (classMatch) {
            insideClass = true;
            depth = 0;
            classStartLine = i; //guarda la linea donde empieza 
            className = classMatch[1]; //guarda el nombre
            isAbstractClass = TS_CLASS_IS_ABSTRACT_PATTERN.test(line); //revisa si la clase es abstracta

            //solo se queda con los nombres que si estan en el registro
            requiredContracts = [...splitTypeList(classMatch[2]), ...splitTypeList(classMatch[3])].filter(name => registry.has(name));
        }

        if (!insideClass) { return; }

        const methodMatch = line.match(TS_DEFINED_METHOD_PATTERN);
        //si la linea es un metodo co cuerpo, agrega su nombre a defineMethods 
        if (methodMatch) { definedMethods.add(methodMatch[1]); }

        //cuenta las llaves 
        if (line.includes('{')) { depth++; }
        if (line.includes('}')) {
            depth--;
            if (depth <= 0) { closeCurrentClass(); } //cuando termina llama a closeCurrentClass
        }
    });

    if (insideClass) { closeCurrentClass(); }
}



// ---- JS ------------------------------------------------------------------------------------------

// /** @interface */   (el tag puede ir en cualquier parte del bloque /** ... */)
const JS_INTERFACE_JSDOC_PATTERN = /@interface\b/;

// /** @implements {Pago} */
const JS_IMPLEMENTS_JSDOC_PATTERN = /@implements\s*\{\s*([\w.$]+)\s*\}/;

// export class Pago { ... }   /   class PagoTarjeta { ... }
const JS_CLASS_PATTERN = /^(?:export\s+)?(?:default\s+)?class\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([\w.$]+))?/;

// metodo dentro de una clase (interfaz o implementacion), con o sin cuerpo real
const JS_METHOD_PATTERN = /^(?:static\s+|async\s+|get\s+|set\s+)*([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*\{/;

// al recorrer linea por linea, antes de un "class X {" se revisa si el bloque /** ... */
//inmediatamente anterior trae @interface o @implements {Nombre}
function collectJsContract(lines:string[], fileLabel: string, regitry:ContractRegistry): void {
    let pendingIsInterface = false;
    let insideContract = false;
    let currentMethod: Set<string> = new Set();
    let currentName = '';
    let depth = 0;

    lines.forEach(rawLine => {
        const line = stripLineComment(rawLine).trim();

        if (JS_INTERFACE_JSDOC_PATTERN.test(line)) { pendingIsInterface = true; return; }

        const classMatch = line.match(JS_CLASS_PATTERN);
        if (classMatch && pendingIsInterface) {
            insideContract = true;
            depth = 0;
            currentName = classMatch[1];
            currentMethod = new Set();
            pendingIsInterface = false;
            return;
        }
        if (classMatch) { pendingIsInterface = false; }
        if (!insideContract) { return; }

        const methodMatch = line.match(JS_METHOD_PATTERN);
        if (methodMatch) { currentMethod.add(methodMatch[1]); }

        if (line.includes('{')) { depth++; }
        if (line.includes('}')) {
            depth--;
            if (depth <= 0) {
                regitry.set(currentName, { kind: 'interface', methods: currentMethod, parents: [], fileLabel });
                insideContract = false;
            }
        }
    });
}

function analyzeJsContractImplementations(lines: string[], fileLabel: string, registry: ContractRegistry, findings: string[]): void {
    let pendingContractName: string | null = null;
    let insideClass = false;
    let className  = '';
    let classStartLine = 0;
    let requiredContracts: string[] = [];
    let definedMethods: Set<string> = new Set();
    let depth = 0;

    const closeCurrentClass = () => {
        for (const contractName of requiredContracts) {
            const required =  resolveRequireMethods(contractName, registry);
            for (const methodName of required) {
                if (!definedMethods.has(methodName)) {
                    findings.push(
                        fileLabel + ':' + (classStartLine + 1) + 
                        ' - La clase "' + className + '"implementa "' + contractName + 
                        '"pero no define el metodo "' + methodName + '"'
                    );
                }
            }
        }
        insideClass = false;
        requiredContracts = [];
        definedMethods = new Set();
    };

    lines.forEach((rawLine, i) => {
        const line = stripLineComment(rawLine).trim();

        const implementsMatch = line.match(JS_IMPLEMENTS_JSDOC_PATTERN);
        if (implementsMatch) { pendingContractName = implementsMatch[1]; return; }

        const classMatch = line.match(JS_CLASS_PATTERN);
        if (classMatch) {
            insideClass = true;
            depth = 0;
            classStartLine = i;
            className = classMatch[1];
            requiredContracts = pendingContractName && registry.has(pendingContractName)
                ? [pendingContractName]
                : [];
            pendingContractName = null;
        }

        if (!insideClass) { return; }

        const methodMatch = line.match(JS_METHOD_PATTERN);
        if (methodMatch) { definedMethods.add(methodMatch[1]); }

        if (line.includes('{')) { depth++; }
        if (line.includes('}')) {
            depth--;
            if (depth <= 0) { closeCurrentClass(); }
        }
    });

    if (insideClass) { closeCurrentClass(); }
    
};



//funcion principal 
export async function analyzeInterfaceContracts (
    profileLines: Map<string, string[]>,  //solo archivos .cs del PR
    workspaceFolder: vscode.Uri,
    excludePattern: string,
    findings: string[],
    config: InterfacesConfig
): Promise<void> {
    const registry: ContractRegistry = new Map(); //crea un registro vacio
    const importsByFile: Map<string, ImportMap> = new Map(); //mapa de imports, compartido por TS y JS
    const lenguages = new Set(config.lenguages);

    //se registran los contratos que ya viven en los archivos del PR
    for (const [fileLabel, lines] of profileLines) {
        const extension  = fileLabel.split('.').pop() ?? '';
        if (!lenguages.has(extension)) { continue; }

        if (extension === 'cs') {
            collectCSharpContracts(lines, fileLabel, registry, config.includeAbstractClasses);
        } else if (extension === 'ts') {
            collectTsContracts(lines, fileLabel, registry, config.includeAbstractClasses);
            importsByFile.set(fileLabel, parseTsImports(lines));
        } else if (extension === 'js') {
            collectJsContract(lines, fileLabel, registry);
            importsByFile.set(fileLabel, parseTsImports(lines)); //mismo formato de import (ES Modules)
        }
    }

    // en c# la implementacion solo referencia el nombre de la interfaz, si la interfaz no
    // vive dentro del PR hay que buscarla en las carpetas donde normalmente se definen los
    // contratos (models/interfaces)
    const contractFolderGlob = `**/{${config.contractFolders.join(',')}}/**/*.cs`;
    const searchPattern = new vscode.RelativePattern(workspaceFolder, contractFolderGlob);
    const candidateFiles = await vscode.workspace.findFiles(searchPattern, excludePattern);

    for (const uri of candidateFiles) {
        const fileLabel = vscode.workspace.asRelativePath(uri);
        if (profileLines.has(fileLabel)) { continue; } //y se proceso 
        const bytes = await vscode.workspace.fs.readFile(uri);
        const lines = Buffer.from(bytes).toString('utf8').split('\n');
        collectCSharpContracts(lines, fileLabel, registry, config.includeAbstractClasses);
    }


    //sigue el import de cada clase que implementa/extiende algo (TS) o trae @implements (JS)
    for (const [fileLabel, lines] of profileLines) {
        const isTs = fileLabel.endsWith('.ts');
        const isJs = fileLabel.endsWith('.js');
        if (!isTs && !isJs) { continue; }

        const importMap = importsByFile.get(fileLabel)!;
        const referencedNames = isTs ? findReferencedContractNames(lines) : findReferencedJsContractNames(lines);

        for (const name of referencedNames) {
            if (registry.has(name)) { continue; } //ya esta en el PR
            const modulePath = importMap.get(name);
            if (!modulePath) { continue; } //no se pudo relacionar con un import

            const resolved = await resolveModuleFile(fileLabel, modulePath, workspaceFolder, profileLines);
            if (!resolved) { continue; }

            if (resolved.fileLabel.endsWith('.ts')) {
                collectTsContracts(resolved.lines, resolved.fileLabel, registry, config.includeAbstractClasses);
            } else {
                collectJsContract(resolved.lines, resolved.fileLabel, registry);
            }
        }
    }

    //se valida la implementacion unicamente sobre las clases que cambiaron en el pr, pero ya
    //contra el registro completo (PR - capretas de contratos)
    for (const [fileLabel, lines] of profileLines) {
        const extension = fileLabel.split('.').pop() ?? '';
        if (extension === 'cs') {
            //llama a esta funcion con cada .cs, ya con el registo completo 
            analyzeCSharpContractImplementations(lines, fileLabel, registry, findings);
        } else if (extension === 'ts') {
            analyzeTsContractImplementations(lines, fileLabel, registry, findings);
        } else if (extension === 'js') {
            analyzeJsContractImplementations(lines, fileLabel, registry, findings);
        }
    }
}