// ---------------------------------------------------------------------------------------------
// ---- VERFICACION DE CONTRATOS: INTERFACES Y CLASES ABSTRACTAS IMPLEMENTADAS -----------------
// ---------------------------------------------------------------------------------------------

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
function collectCSharpContracts(lines: string[], fileLabel: string, registry: ContractRegistry): void {
    let insideContract = false; //indica si esta dentro de una interfaz o clase abstracta
    //datos del contrato que se esta leyendo 
    let currentMethod: Set<string> = new Set();
    let currentName = '';
    let currentParents: string [] = [];
    let currentKind: ContractInfo['kind'] = 'interface';
    let depth = 0; //cntacto de llaves 

    //guarda el contrato en el registry y limpia las variables para el siguiente 
    const closeCurrentContract = () => {
        if (currentName) {
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

//funcion principal 
export function analyzeInterfaceContracts (fileLines: Map<string, string[]>, findings: string[]): void {
    const registry: ContractRegistry = new Map(); //crea registro vacio 

    for (const [fileLabel, lines] of fileLines) {
        if (fileLabel.endsWith('.cs')) {
            collectCSharpContracts(lines, fileLabel, registry); //llama a esta funcion con cada .cs 
        }
    }

    for (const [fileLabel, lines] of fileLines) {
        if (fileLabel.endsWith('.cs')) {
            //llama a esta funcion con cada .cs, ya con el registo completo 
            analyzeCSharpContractImplementations(lines, fileLabel, registry, findings);
        }
    }
}