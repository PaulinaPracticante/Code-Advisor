// ---------------------------------------------------------------------------------------
// ---- VERIFICACION DE USO DE AUTOMAPPER: CLASES CON MAS DE 15 PROPIEDADES
// ---------------------------------------------------------------------------------------

const MAX_PROPERTIES_WITHOUT_AUTOMAPPER = 15; // si una clase tiene mas de 15 propiedades ya se considera grande 
const MIN_MANUAL_ASSIGNMENTS = 3; // apartir de cuantas asignacioes seguidas se considera "mapeo manual"

// corta cualquier linea que se un comentarios, que inicie con //
function stripLineComment(rawLine: string) : string {
    const commentIndex = rawLine.indexOf('//');
    return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}

//Declaracion de clase en c# 
const CLASS_PATTERN = /^(?:(?:public|private|protected|internal|static|abstract|sealed|partial)\s+)*class\s+([A-Za-z0-9_]*)/;

// Una propiedad de clase en c#, con o sin valor por default
const PROPERTY_PATTERN = /^(?:public|private|protected|internal)\s+(?:readonly\s+)?[\w<>[\],.?]+\s+[A-Za-z_][A-Za-z0-9_]*\s*\{\s*get;\s*(?:set;|init;)?\s*\}/;

// "var dto = new FooDto(...)" o "FooDto dto = new FooDto(...)"
const NEW_INSTANCE_PATTERN = /\b(?:var|[A-Za-z_][A-Za-z0-9_<>]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*new\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/;

// "dto.Prop = entidad.Prop;"
const MANUAL_ASSIGNMENT_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)\.\w+\s*=\s*([A-Za-z_][A-Za-z0-9_]*)\.\w+\s*;/;

export function analyzeDtoAutoMapper(lines: string[], fileLabel: string, findings: string[]): void {
    if (!fileLabel.endsWith('.cs')) { //Si el archivo no es c# no se considera para esta validacion
        return; //AutoMapper es especifico de .NET
    }

    const bigClasses = new Set<string>();
    const variableTypes = new Map<string, string>(); //variable  = clase instanciada

    // ---  Recorrido 1: clases con mas de 15 propiedades ---
    let currentClassName: string | null = null;
    let propertyCount = 0;
    let depth = 0;

    //recorre linea por linea llevando un contador de llaves para saber cuando empieza y termina la clase 
    lines.forEach(rawLine => {
        const line = stripLineComment(rawLine).trim();

        const classMatch = line.match(CLASS_PATTERN);  
        if(classMatch) {
            currentClassName = classMatch[1];
            propertyCount = 0;
            depth = 0;
        }

        //cuanto encuentra la clase empieza a contar propiedades 
        if (currentClassName) {
            if (PROPERTY_PATTERN.test(line)) {
                propertyCount++;
            }
            if (line.includes('{')) { depth++; } //cada { suma profundidad
            if (line.includes('}')) { //cada } resta profundidad 
                depth--;
                if (depth <= 0) {
                    //si hay mas de 15 propiedades agrega el nombre a bigClasses
                    if (propertyCount >= MAX_PROPERTIES_WITHOUT_AUTOMAPPER) {
                        bigClasses.add(currentClassName);
                    }
                    currentClassName = null;
                }
            }
        }
    });

    // ---  Recorrido 2: bloques de mapeo manual sobre esas clases ---
    let streak = 0;
    let streakTarget = '';
    let streakStartLine = 0;

    //recorre linea por linea para detectar mapeo manual sobre las clases 
    lines.forEach((rawLine, i) => {
        const line = stripLineComment(rawLine).trim();

        //mantiene un mapa variableTypes usando NEW_INSTANCE_PATTERN
        const newInstanceMatch = line.match(NEW_INSTANCE_PATTERN);
        if (newInstanceMatch) {
            variableTypes.set(newInstanceMatch[1], newInstanceMatch[2]);
        }

        //Lleva una racha (streak) de asignaciones consecutivas sobre la misma variable destino (streakTarget)
        const assignMatch = line.match(MANUAL_ASSIGNMENT_PATTERN);
        if (assignMatch && assignMatch[1] === streakTarget) {
            streak++;
        } else if (assignMatch) {
            streak = 1;
            streakTarget = assignMatch[1];
            streakStartLine = i;
        } else {
            streak = 0;
            streakTarget = '';
        }

        const nextLine = lines[i + 1] ? stripLineComment(lines[i + 1]).trim() : '';
        const blockEnds = !MANUAL_ASSIGNMENT_PATTERN.test(nextLine);

        //cuando la racha termina y tiene >= 3 asignaiones seguidas
        if (assignMatch && blockEnds && streak >= MIN_MANUAL_ASSIGNMENTS) {
            const targetClass = variableTypes.get(streakTarget);
            // verifica si la variable corresponde a una clase de bigClasses 
            //si es asi agrega el mensaje en findings 
            if (targetClass && bigClasses.has(targetClass)) {
                findings.push(
                    fileLabel + ':' + (streakStartLine + 1) +
                    ' - "' + targetClass + '" tiene mas de ' + MAX_PROPERTIES_WITHOUT_AUTOMAPPER +
                    ' propiedades, usa AutoMapper (_mapper.Map<' + targetClass +'>(...)) en lugar de asignar cada propiedad manualmente'
                )
            }
        }
    });
}