// ----------------------------------------------------------------------------------------------------
// ---- NOMBRE Y DESCRIPCION EN ESPAÑOL DE CADA REGLA, PARA LA PANTALLA DE CONFIGURAR ESTANDARES -----
// ----------------------------------------------------------------------------------------------------

import type { CodeAdvisorConfig } from './configLoader';

//tipo de proyecto al que aplica una regla: son los mismos alcances con los que el motor decide si la corre
//(shouldRunAnalyzer en projectProfile.ts); "shared" aplica a todos los tipos de proyecto
export type RuleScope = 'backend' | 'frontend' | 'shared';

export interface RuleInfo {
    name: string; //nombre corto que ve el gerente
    description: string; //una linea que explica que revisa la regla
    scope: RuleScope; //en que tipo de proyecto corre (si cambia en codeReviewerCommand.ts hay que cambiarlo aqui)
}

//nombre que ve el gerente de cada tipo de proyecto
export const SCOPE_LABELS: Record<RuleScope, string> = {
    backend: 'Backend',
    frontend: 'Frontend',
    shared: 'Compartidas',
};

//parametros de texto que solo aceptan algunos valores, la clave es "regla.parametro" y "*.parametro" sirve para cualquier regla
//la pantalla los muestra como lista desplegable y configEditor.ts rechaza cualquier otro valor
const CASES = ['PascalCase', 'camelCase', 'UPPER_SNAKE_CASE', 'kebab-case'];
export const PARAM_OPTIONS: Record<string, string[]> = {
    '*.expected': ['fetch', 'axios'],
    '*.classCase': CASES, '*.functionCase': CASES, '*.methodCase': CASES,
    '*.variableCase': CASES, '*.constantCase': CASES, '*.componentCase': CASES,
};

//valores permitidos de un parametro, undefined si acepta cualquier texto; path es la ruta del parametro dentro de la regla
export function getParamOptions(rule: string, path: string[]): string[] | undefined {
    return PARAM_OPTIONS[rule + '.' + path.join('.')] ?? PARAM_OPTIONS['*.' + path[path.length - 1]];
}


//cada regla de la configuracion mas projectGuidelines (que solo tiene prioridad), si se agrega una regla nueva
//a CodeAdvisorConfig TypeScript obliga a agregar aqui su nombre, su descripcion y su tipo de proyecto
type CatalogKey = keyof CodeAdvisorConfig['rules'] | 'projectGuidelines';

export const RULE_CATALOG: Record<CatalogKey, RuleInfo> = {
    // ---- prioridad alta por defecto
    transactions: { name: 'Transacciones en la base de datos', description: 'Un proceso que hace 2 o más escrituras a la base de datos debe usar una transacción con commit y rollback (C#).', scope: 'backend' },
    exceptionHandling: { name: 'Manejo de excepciones', description: 'Los servicios que usan base de datos, transacciones o hilos deben controlar sus errores con try-catch.', scope: 'backend' },
    async: { name: 'Programación asíncrona', description: 'Las operaciones de entrada y salida (base de datos, archivos, red) deben usar async y await.', scope: 'backend' },
    objectUsage: { name: 'Uso de object como tipo', description: 'No se debe usar object como tipo genérico, hay que usar el tipo concreto.', scope: 'backend' },
    requestModels: { name: 'Modelos de request con valores iniciales', description: 'Las propiedades de los modelos de request que pueden venir vacías deben iniciarse con un valor por defecto (int en 0, string vacío).', scope: 'backend' },
    requestHandlers: { name: 'Manejador de peticiones HTTP', description: 'Cada tipo de proyecto debe usar el manejador de peticiones definido: fetch o axios.', scope: 'frontend' },
    duplicateCode: { name: 'Código duplicado', description: 'Detecta bloques de código repetidos que conviene reutilizar en una función o componente.', scope: 'backend' },
    folderNaming: { name: 'Estructura y nombres de carpetas', description: 'Revisa que las carpetas obligatorias de cada repositorio existan y estén nombradas con su convención.', scope: 'frontend' },
    projectGuidelines: { name: 'Reglas propias del proyecto (CLAUDE.md)', description: 'Con IA, revisa también las reglas particulares que cada proyecto define en su archivo CLAUDE.md.', scope: 'shared' },

    // ---- prioridad media por defecto
    layers: { name: 'Estructura en capas', description: 'El backend debe tener sus carpetas de capas: controladores, interfaces, servicios, utils y repositorios si usa base de datos.', scope: 'backend' },
    interfaces: { name: 'Contratos con interfaces', description: 'Las interfaces y clases abstractas deben estar implementadas por una clase.', scope: 'backend' },
    singleResponsibility: { name: 'Función de una sola responsabilidad', description: 'Con IA, detecta funciones que hacen más de una cosa y conviene separar.', scope: 'backend' },
    codeComplexity: { name: 'Lógica demasiado compleja', description: 'Con IA, detecta funciones con lógica difícil de leer que conviene dividir en fragmentos pequeños.', scope: 'backend' },
    dtoAutoMapper: { name: 'Uso de DTO con AutoMapper', description: 'Las clases con muchas propiedades o con muchas asignaciones manuales deben usar AutoMapper.', scope: 'backend' },
    queryViews: { name: 'Consultas grandes en vistas', description: 'Las consultas SQL con muchos JOIN, columnas o parámetros, o que cruzan bases de datos, deben ir en una vista.', scope: 'backend' },
    linq: { name: 'Uso de LINQ', description: 'Sugiere LINQ en lugar de ciclos manuales que filtran, transforman, cuentan o suman colecciones.', scope: 'backend' },
    solidFrontend: { name: 'SOLID en frontend: props de componentes', description: 'Un componente no debe recibir demasiadas props (principio de segregación de interfaces).', scope: 'frontend' },
    solidFrontendAi: { name: 'SOLID en frontend con IA', description: 'Con IA, revisa la responsabilidad única y el principio abierto/cerrado en los componentes.', scope: 'frontend' },
    componentLocation: { name: 'Ubicación de componentes', description: 'Los componentes del frontend deben estar dentro de la carpeta component o components.', scope: 'frontend' },

    // ---- prioridad baja por defecto
    commitMessage: { name: 'Formato de los commits', description: 'El título de cada commit del PR debe ser INICIALES:Descripción, por ejemplo ABCD:Corrige validación.', scope: 'shared' },
    englishOnly: { name: 'Nombres en inglés', description: 'Con IA, revisa que las funciones, clases y variables nuevas estén nombradas en inglés.', scope: 'shared' },
    naming: { name: 'Convenciones de nombres', description: 'Clases en PascalCase y variables, funciones y métodos en camelCase, según el lenguaje.', scope: 'shared' },
    semanticNaming: { name: 'Nombres que describen su función', description: 'Con IA, revisa que los nombres de clases, funciones y variables correspondan a lo que hacen.', scope: 'shared' },
    envNaming: { name: 'Variables de entorno', description: 'Los nombres de las variables en los archivos .env deben ir en UPPER_SNAKE_CASE.', scope: 'backend' },
    fileNaming: { name: 'Nombres de archivo', description: 'Los archivos del frontend deben nombrarse con la convención del proyecto (PascalCase, camelCase o kebab-case).', scope: 'frontend' },
    cssClassNaming: { name: 'Clases CSS en kebab-case', description: 'Las clases de HTML y CSS deben escribirse en kebab-case.', scope: 'frontend' },
    varUsage: { name: 'Uso de var', description: 'Usa var solo cuando el tipo se deduce de la expresión, no cuando el tipo ya se conoce.', scope: 'backend' },
    ifBraces: { name: 'If con llaves', description: 'Un if de una sola instrucción debe llevar llaves.', scope: 'shared' },
    ternaries: { name: 'Ternarios sin anidar', description: 'Los if ternarios deben ser simples, sin anidar. Solo se revisa si "If con llaves" está activa.', scope: 'shared' },
    stringInterpolation: { name: 'Interpolación de cadenas', description: 'Para unir cadenas cortas usa interpolación en lugar de concatenar con +.', scope: 'backend' },
    parameters: { name: 'Parámetros en varias líneas', description: 'Los métodos con muchos parámetros deben escribirlos en varias líneas, sin líneas muy largas.', scope: 'backend' },
    tableAlias: { name: 'Alias de tablas', description: 'En una consulta SQL con varias tablas, cada alias debe ser el nombre completo o una abreviatura.', scope: 'backend' },
    indentation: { name: 'Identación con tabulador', description: 'El código debe identarse con tabulador y no con espacios.', scope: 'shared' },
    commentLanguage: { name: 'Comentarios en español', description: 'Con IA, revisa que los comentarios nuevos del frontend estén escritos en español.', scope: 'frontend' },

    // ---- sin prioridad: es un ajuste, no una regla que reporte hallazgos
    aiReview: { name: 'Llamada a la IA', description: 'Modelo de Claude y límite de tokens de la revisión combinada, que hace varias revisiones de IA en una sola llamada.', scope: 'shared' },
};

//las rutas excluidas no son una regla pero se muestran en la misma pantalla
export const EXCLUDE_INFO: RuleInfo = {
    name: 'Rutas excluidas',
    description: 'Carpetas y archivos que no se revisan (patrones glob, uno por línea).',
    scope: 'shared',
};

//hallazgos guardados con un nombre de regla que ya no se usa (se escribio mal en versiones anteriores), siguen mostrandose en español
export const RULE_ALIASES: Record<string, keyof typeof RULE_CATALOG> = {
    commentLenguage: 'commentLanguage',
};

//identificador actual de una regla (cambia los nombres antiguos por el de ahora)
export function canonicalRule(rule: string): string {
    return Object.prototype.hasOwnProperty.call(RULE_ALIASES, rule) ? RULE_ALIASES[rule] : rule;
}

//nombre en español de una regla para mostrarlo en los paneles; si no esta en el catalogo se muestra su identificador
export function getRuleName(rule: string): string {
    const key = canonicalRule(rule);
    return Object.prototype.hasOwnProperty.call(RULE_CATALOG, key) ? RULE_CATALOG[key as keyof typeof RULE_CATALOG].name : rule;
}

//nombre en español de los parametros de cada regla, la clave es "regla.parametro" y "*.parametro" sirve para cualquier regla
//si un parametro no aparece aqui, la pantalla muestra su nombre tecnico
export const PARAM_LABELS: Record<string, string> = {
    '*.model': 'Modelo de IA',
    '*.maxTokens': 'Máximo de tokens',
    '*.javascript': 'JavaScript / TypeScript',
    '*.typescript': 'TypeScript',
    '*.csharp': 'C#',
    '*.php': 'PHP',
    '*.next': 'Next.js',
    '*.react': 'React',
    '*.reactNative': 'React Native',
    '*.legacyJs': 'JS clásico (PHP y jQuery)',
    '*.expected': 'Manejador esperado (fetch o axios)',
    '*.watchedTypes': 'Tipos vigilados',
    '*.exemptPatterns': 'Líneas que se permiten',
    '*.classCase': 'Clases',
    '*.functionCase': 'Funciones',
    '*.methodCase': 'Métodos',
    '*.variableCase': 'Variables',
    '*.constantCase': 'Constantes',
    '*.componentCase': 'Componentes',
    'dtoAutoMapper.maxProperties': 'Máximo de propiedades de una clase',
    'dtoAutoMapper.minManualAssignments': 'Mínimo de asignaciones manuales',
    'parameters.maxInLineParams': 'Parámetros máximos en una línea',
    'parameters.maxLineLength': 'Largo máximo de la línea',
    'linq.suggestions': 'Sugerencias que se hacen',
    'linq.suggestions.whereSelect': 'Where con Select',
    'linq.suggestions.select': 'Select',
    'linq.suggestions.count': 'Count',
    'linq.suggestions.sum': 'Sum',
    'linq.suggestions.firstOrDefault': 'FirstOrDefault',
    'requestModels.suffixes': 'Sufijos de los modelos de request',
    'requestModels.folders': 'Carpetas de modelos de request',
    'requestModels.checkOptionalProperties': 'Revisar propiedades opcionales',
    'requestModels.checkReadonlyProperties': 'Revisar propiedades de solo lectura',
    'layers.layers': 'Capas del proyecto',
    'layers.databaseUsagePatterns': 'Cómo se detecta que usa base de datos',
    'folderNaming.repos': 'Repositorios con estructura definida',
    'interfaces.contractFolders': 'Carpetas de contratos',
    'interfaces.includeAbstractClasses': 'Incluir clases abstractas',
    'interfaces.lenguages': 'Extensiones que se revisan',
    'duplicateCode.minLines': 'Líneas mínimas del bloque',
    'duplicateCode.minOccurrences': 'Repeticiones mínimas',
    'componentLocation.folders': 'Carpetas válidas para componentes',
    'componentLocation.exemptFolders': 'Carpetas exentas',
    'componentLocation.exemptFiles': 'Archivos exentos',
    'solidFrontend.maxProps': 'Máximo de props por componente',
    'queryViews.maxJoins': 'Máximo de JOIN',
    'queryViews.maxColumns': 'Máximo de columnas',
    'queryViews.maxParameters': 'Máximo de parámetros',
    'commitMessage.pattern': 'Formato del título del commit',
};

//que editor usa la pantalla para un parametro en lugar del campo de texto normal, la clave es "regla.parametro"
//commitTitle: arma el formato del commit sin escribir una expresion regular; patterns: lista de patrones con prueba en vivo;
//layers: tarjetas de capas; folderRepos: carpetas obligatorias de cada repositorio
export type FieldEditor = 'commitTitle' | 'patterns' | 'layers' | 'folderRepos';

export const FIELD_EDITORS: Record<string, FieldEditor> = {
    'commitMessage.pattern': 'commitTitle',
    'layers.layers': 'layers',
    'layers.databaseUsagePatterns': 'patterns',
    'folderNaming.repos': 'folderRepos',
    'objectUsage.csharp.exemptPatterns': 'patterns',
    'objectUsage.typescript.exemptPatterns': 'patterns',
    'objectUsage.javascript.exemptPatterns': 'patterns',
};

//texto de ayuda que se muestra debajo de un parametro
export const PARAM_HELP: Record<string, string> = {
    'layers.layers': 'Cada capa es una carpeta que el backend debe tener. Se acepta cualquiera de los nombres de carpeta que pongas.',
    'layers.databaseUsagePatterns': 'Si el código contiene alguna de estas palabras, se considera que el proyecto usa base de datos y las capas "solo si usa base de datos" se vuelven obligatorias.',
    'folderNaming.repos': 'Solo se revisan los repositorios que aparecen aquí. El nombre es el de la carpeta del repositorio en VS Code.',
    'objectUsage.csharp.exemptPatterns': 'Si una línea coincide con alguno de estos patrones, se permite aunque use object (por ejemplo la firma de Equals).',
    'objectUsage.typescript.exemptPatterns': 'Si una línea coincide con alguno de estos patrones, se permite aunque use object.',
    'objectUsage.javascript.exemptPatterns': 'Si una línea coincide con alguno de estos patrones, se permite aunque use Object.',
    'commitMessage.pattern': 'Así se revisa el título de cada commit del PR.',
};
