// ----------------------------------------------------------------------------------------------------
// ---- NOMBRE Y DESCRIPCION EN ESPAÑOL DE CADA REGLA, PARA LA PANTALLA DE CONFIGURAR ESTANDARES -----
// ----------------------------------------------------------------------------------------------------

import type { CodeAdvisorConfig } from './configLoader';

export interface RuleInfo {
    name: string; //nombre corto que ve el gerente
    description: string; //una linea que explica que revisa la regla
}

//cada regla de la configuracion mas projectGuidelines (que solo tiene prioridad), si se agrega una regla nueva
//a CodeAdvisorConfig TypeScript obliga a agregar aqui su nombre y su descripcion
type CatalogKey = keyof CodeAdvisorConfig['rules'] | 'projectGuidelines';

export const RULE_CATALOG: Record<CatalogKey, RuleInfo> = {
    // ---- prioridad alta por defecto
    transactions: { name: 'Transacciones en la base de datos', description: 'Un proceso que hace 2 o más escrituras a la base de datos debe usar una transacción con commit y rollback (C#).' },
    exceptionHandling: { name: 'Manejo de excepciones', description: 'Los servicios que usan base de datos, transacciones o hilos deben controlar sus errores con try-catch.' },
    async: { name: 'Programación asíncrona', description: 'Las operaciones de entrada y salida (base de datos, archivos, red) deben usar async y await.' },
    objectUsage: { name: 'Uso de object como tipo', description: 'No se debe usar object como tipo genérico, hay que usar el tipo concreto.' },
    requestModels: { name: 'Modelos de request con valores iniciales', description: 'Las propiedades de los modelos de request que pueden venir vacías deben iniciarse con un valor por defecto (int en 0, string vacío).' },
    requestHandlers: { name: 'Manejador de peticiones HTTP', description: 'Cada tipo de proyecto debe usar el manejador de peticiones definido: fetch o axios.' },
    duplicateCode: { name: 'Código duplicado', description: 'Detecta bloques de código repetidos que conviene reutilizar en una función o componente.' },
    folderNaming: { name: 'Estructura y nombres de carpetas', description: 'Revisa que las carpetas del proyecto existan y estén nombradas según el estándar de ese proyecto.' },
    projectGuidelines: { name: 'Reglas propias del proyecto (CLAUDE.md)', description: 'Con IA, revisa también las reglas particulares que cada proyecto define en su archivo CLAUDE.md.' },

    // ---- prioridad media por defecto
    layers: { name: 'Estructura en capas', description: 'El backend debe tener sus carpetas de capas: controladores, interfaces, servicios, utils y repositorios si usa base de datos.' },
    interfaces: { name: 'Contratos con interfaces', description: 'Las interfaces y clases abstractas deben estar implementadas por una clase.' },
    singleResponsibility: { name: 'Función de una sola responsabilidad', description: 'Con IA, detecta funciones que hacen más de una cosa y conviene separar.' },
    codeComplexity: { name: 'Lógica demasiado compleja', description: 'Con IA, detecta funciones con lógica difícil de leer que conviene dividir en fragmentos pequeños.' },
    dtoAutoMapper: { name: 'Uso de DTO con AutoMapper', description: 'Las clases con muchas propiedades o con muchas asignaciones manuales deben usar AutoMapper.' },
    queryViews: { name: 'Consultas grandes en vistas', description: 'Las consultas SQL con muchos JOIN, columnas o parámetros, o que cruzan bases de datos, deben ir en una vista.' },
    linq: { name: 'Uso de LINQ', description: 'Sugiere LINQ en lugar de ciclos manuales que filtran, transforman, cuentan o suman colecciones.' },
    solidFrontend: { name: 'SOLID en frontend: props de componentes', description: 'Un componente no debe recibir demasiadas props (principio de segregación de interfaces).' },
    solidFrontendAi: { name: 'SOLID en frontend con IA', description: 'Con IA, revisa la responsabilidad única y el principio abierto/cerrado en los componentes.' },
    componentLocation: { name: 'Ubicación de componentes', description: 'Los componentes del frontend deben estar dentro de la carpeta component o components.' },

    // ---- prioridad baja por defecto
    commitMessage: { name: 'Formato de los commits', description: 'El título de cada commit del PR debe ser INICIALES:Descripción, por ejemplo ABCD:Corrige validación.' },
    englishOnly: { name: 'Nombres en inglés', description: 'Con IA, revisa que las funciones, clases y variables nuevas estén nombradas en inglés.' },
    naming: { name: 'Convenciones de nombres', description: 'Clases en PascalCase y variables, funciones y métodos en camelCase, según el lenguaje.' },
    semanticNaming: { name: 'Nombres que describen su función', description: 'Con IA, revisa que los nombres de clases, funciones y variables correspondan a lo que hacen.' },
    envNaming: { name: 'Variables de entorno', description: 'Los nombres de las variables en los archivos .env deben ir en UPPER_SNAKE_CASE.' },
    fileNaming: { name: 'Nombres de archivo', description: 'Los archivos del frontend deben nombrarse con la convención del proyecto (PascalCase, camelCase o kebab-case).' },
    cssClassNaming: { name: 'Clases CSS en kebab-case', description: 'Las clases de HTML y CSS deben escribirse en kebab-case.' },
    varUsage: { name: 'Uso de var', description: 'Usa var solo cuando el tipo se deduce de la expresión, no cuando el tipo ya se conoce.' },
    ifBraces: { name: 'If con llaves', description: 'Un if de una sola instrucción debe llevar llaves.' },
    ternaries: { name: 'Ternarios sin anidar', description: 'Los if ternarios deben ser simples, sin anidar. Solo se revisa si "If con llaves" está activa.' },
    stringInterpolation: { name: 'Interpolación de cadenas', description: 'Para unir cadenas cortas usa interpolación en lugar de concatenar con +.' },
    parameters: { name: 'Parámetros en varias líneas', description: 'Los métodos con muchos parámetros deben escribirlos en varias líneas, sin líneas muy largas.' },
    tableAlias: { name: 'Alias de tablas', description: 'En una consulta SQL con varias tablas, cada alias debe ser el nombre completo o una abreviatura.' },
    indentation: { name: 'Identación con tabulador', description: 'El código debe identarse con tabulador y no con espacios.' },
    commentLanguage: { name: 'Comentarios en español', description: 'Con IA, revisa que los comentarios nuevos del frontend estén escritos en español.' },

    // ---- sin prioridad: es un ajuste, no una regla que reporte hallazgos
    aiReview: { name: 'Llamada a la IA', description: 'Modelo de Claude y límite de tokens de la revisión combinada, que hace varias revisiones de IA en una sola llamada.' },
};

//las rutas excluidas no son una regla pero se muestran en la misma pantalla
export const EXCLUDE_INFO: RuleInfo = {
    name: 'Rutas excluidas',
    description: 'Carpetas y archivos que no se revisan (patrones glob, uno por línea).',
};

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
    '*.exemptPatterns': 'Patrones exentos',
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
    'layers.layers': 'Capas del proyecto (JSON)',
    'layers.databaseUsagePatterns': 'Patrones que detectan uso de base de datos',
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
    'commitMessage.pattern': 'Formato del título (expresión regular)',
};
