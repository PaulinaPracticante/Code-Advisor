# Revisión de los analizadores de Code Advisor

Revisión de cada archivo de `src/` que forma parte del comando `codeadvisor.codeReviewer`. Para cada uno se detalla: **cuándo entra** en acción, **debilidades/"vulnerabilidades"** de su lógica (bugs, huecos de cobertura, supuestos frágiles) y **casos concretos de falso positivo**. No se modificó ningún archivo de código, esto es solo el análisis.

Varios de los hallazgos fueron verificados ejecutando los regex reales contra fragmentos de código de prueba (no solo leídos "a ojo"), así que los ejemplos marcados como confirmados sí se comportan como se describe.

---

## 0. Consideraciones generales (aplican a casi todos)

- **No es un parser real, es regex línea por línea.** Ningún analizador construye un AST; todos operan con expresiones regulares sobre cada línea (o un contador simple de `{`/`}`). Cualquier estilo de formato distinto al esperado (código minificado, Prettier con otras reglas, etc.) puede generar falsos negativos o positivos.
- **Nadie reconoce comentarios de bloque `/* ... */`.** Todos los analizadores que usan `stripLineComment` solo cortan desde `//` hacia la derecha; ninguno lleva un estado "estoy dentro de un comentario de bloque". Código de ejemplo dejado dentro de un `/* ... */` (muy común para documentar snippets) se analiza como código real y puede disparar cualquiera de los hallazgos de abajo (variables mal nombradas, `var` sin tipo claro, ifs sin llaves, etc.).
- **Nadie distingue un `//` dentro de un string literal.** `stripLineComment` corta todo lo que sigue al primer `//`, incluso si está dentro de comillas (ej. `"https://api.com"` o un string que documente un comentario). Esto trunca el resto de la línea como si fuera comentario, pudiendo ocultar el final real de una instrucción.
- **`split('\n')` no normaliza `\r\n`.** En archivos guardados con saltos de línea Windows, cada línea queda con un `\r` colgante al final. Esto no rompe la mayoría de los regex (`\s` incluye `\r`), pero sí infla en 1 el conteo de caracteres por línea en `parameterAnalyzer.ts`.
- **Multi-línea en general.** Casi ningún analizador soporta declaraciones repartidas en varias líneas (firmas de método largas, parámetros uno por línea). Esto genera huecos de cobertura (falsos negativos) de forma consistente en todo el proyecto.

---

## 1. `codeReviewerCommand.ts` + `extension.ts` (orquestador)

**Cuándo entra:** al ejecutar el comando `codeadvisor.codeReviewer`. Busca archivos `**/*.{ts,tsx,js,jsx,php,cs}` (excluyendo `node_modules`, `dist`, `out`, `.git`, `build`), lee cada uno, llama a los analizadores "por archivo" dentro del mismo loop, y después llama a `analyzeInterfaceContracts`/`analyzeLayeredStructure` (que necesitan ver *todos* los archivos juntos).

**Vulnerabilidades / debilidades:**
- Todo corre en un único `try` implícito inexistente: si cualquier analizador lanza una excepción (ver el bug crítico de `parameterAnalyzer.ts` más abajo), **todo el comando se cae** sin generar ningún reporte, y probablemente sin un mensaje claro para el usuario.
- Los analizadores "por capa de proyecto" (`analyzeLayeredStructure`) solo ven los archivos que `findFiles` encontró; una carpeta vacía o con extensiones no soportadas es invisible para el análisis (ya lo vimos en la conversación anterior).

**Falsos positivos:** ninguno propio (es solo orquestación), pero propaga los de cada analizador.

---

## 2. `namingAnalyzer.ts` + `namingConfig.ts`

**Cuándo entra:** por cada archivo soportado, inmediatamente después de los demás analizadores "por archivo", solo si la extensión tiene un `languageId` mapeado (ts/tsx/js/jsx/php/cs).

**Vulnerabilidades / debilidades:**
- `insideClass` solo sabe si la línea está *dentro de algunas llaves que pertenecen a una clase*, no si es realmente un miembro de primer nivel de esa clase. Cualquier función/método anidado dentro del cuerpo de un método (callback, método de un objeto literal, etc.) puede ser tomado como "método de la clase".
- El estilo `PascalCase` exige al menos una minúscula (`/[a-z]/`) además de `/^[A-Z][a-zA-Z0-9]*$/`. Esto es intencional para no confundir con `UPPER_SNAKE_CASE`, pero como efecto secundario **cualquier clase nombrada completamente en mayúsculas (siglas) nunca pasa como válida**.
- La config de C# no tiene `methodNameExempt` para constructores, pero esto en la práctica no causa falsos positivos: el regex de método (`CSHARP_MODIFIERS` + tipo + nombre) exige un "tipo de retorno" antes del nombre, y un constructor (`public Foo(int x)`) no tiene tipo de retorno, así que el regex simplemente **no lo detecta en absoluto** (hueco de cobertura, no falso positivo).

**Falsos positivos (confirmados):**
- **Siglas como nombre de clase.** `class DTO { ... }` o `class API { ... }` se reportan como que no usan `PascalCase`, aunque sea una convención común y válida.
  ```ts
  matchesCase('DTO', 'PascalCase') // -> false
  ```
- **Métodos/propiedades de objetos literales anidados dentro de una clase.** Cualquier método de un objeto que se construya dentro del cuerpo de otro método de la clase matchea el patrón de método de JS/TS y se revisa con `methodCase`, aunque no sea un método de la clase:
  ```ts
  class Service {
    run() {
      return {
        handle(x) { /* ... */ } // se reporta como "El método handle"
      };
    }
  }
  ```
- **Parámetros de PHP escritos uno por línea (el mismo estilo que `parameterAnalyzer.ts` recomienda para más de 3 parámetros) se confunden con propiedades/variables.** El segundo patrón de variable de PHP matchea una línea como `string $email,` dentro de una firma de función multilínea:
  ```php
  function crear(
      string $email,   // <-- matchea variablePatterns y se revisa como "variable", no como parámetro
      int $edad
  ) { ... }
  ```
  (confirmado: `'string $email,'.match(phpVarPattern2)` captura `email`).

---

## 3. `indentationAnalyzer.ts`

**Cuándo entra:** por cada archivo soportado, antes que el resto de los analizadores "por archivo" (es el primero en el loop).

**Vulnerabilidades / debilidades:**
- Solo compara el ancho total de la identación actual contra la anterior; cuando el nivel sube, solo revisa si la parte **nueva** de la identación (`indentMatch.slice(indentationPrevious.length)`) contiene espacios — con cero tolerancia a mezclar espacios con tabs, incluso para alineación visual.
- Trata cualquier línea no vacía (incluyendo comentarios) como línea "real" para efectos de comparación, incluso comentarios decorativos como los banners `// ----...` que se usan en todo este mismo proyecto.

**Falsos positivos:**
- **Tabs para indentar + espacios para alinear ("elastic tabstops"), un estilo común y aceptado**, se marca como error aunque la identación "real" sí sea con tabs:
  ```
  \t\tfoo(a,
  \t\t    b); // los espacios despues del segundo tab son solo para alinear con "foo(", no para indentar
  ```
  Esto cae en la rama `currentWide > previousWide` y como la parte nueva (`newPart`) contiene espacios, se reporta como "debió usar tabulaciones", aunque la identación estructural siga siendo consistente.

---

## 4. `envAnalyzer.ts`

**Cuándo entra:** al final, sobre los archivos `**/.env*` del workspace (fuera del loop principal de código).

**Vulnerabilidades / debilidades:**
- Extrae el nombre de la variable con `trimmed.split('=')[0].trim()`, sin quitar prefijos válidos en `.env` como `export `.

**Falsos positivos (confirmado por lectura directa del código):**
- Una línea como `export DATABASE_URL=postgres://...` (sintaxis válida para que un `.env` se pueda hacer `source` desde bash) produce el "nombre" `export DATABASE_URL` completo, que falla el regex `^[A-Z][A-Z0-9_]*$` por el espacio y la palabra en minúsculas `export`, aunque `DATABASE_URL` en sí sea perfectamente válido.

---

## 5. `ifAnalyzer.ts`

**Cuándo entra:** por cada archivo soportado (sin filtro de extensión de lenguaje, corre siempre), dentro del loop principal.

**Vulnerabilidades / debilidades:**
- `elseCandidate` solo quita **un** `}` inicial (`replace(/^\}\s*/, '')`). Una línea con dos cierres antes del `else` (`}} else {`) deja un `}` colgante y el `else` deja de reconocerse (hueco de cobertura).
- El conteo de ternarios anidados no distingue "un ternario dentro de otro" de "dos ternarios independientes en la misma línea/cadena".

**Falsos positivos (confirmado por lectura del regex):**
- **Dos ternarios independientes (no anidados) en la misma línea** se reportan como "ternarios anidados", por ejemplo en un literal de arreglo u objeto:
  ```ts
  const arr = [a ? 1 : 2, b ? 3 : 4]; // 2 operadores "?" -> se cuenta como anidado, aunque son 2 ternarios hermanos
  ```

---

## 6. `parameterAnalyzer.ts`

**Cuándo entra:** por cada archivo soportado, dentro del loop principal.

**Vulnerabilidades / debilidades — bug crítico confirmado (crashea el comando):**

En la función que arma el texto de los parámetros cuando la lista cruza varias líneas, hay un typo: usa la variable `line` (el string de la línea actual, ya resuelta) en vez de `lines` (el arreglo con todas las líneas del archivo):

```ts
for (let j = i + 1; j < closing.line; j++) {
    paramsText += ' ' + stripLineComment(line[j]); // debería ser lines[j]
}
```

`line[j]` indexa **caracteres** del string de la línea actual, no líneas del archivo. Si el índice `j` (que es un número de línea absoluto dentro del archivo) supera la longitud de ese string, `line[j]` da `undefined`, y `stripLineComment(undefined)` revienta con `TypeError: Cannot read properties of undefined (reading 'indexOf')`. Confirmado con una reproducción: una llamada o declaración con parámetros en 3+ líneas, ubicada más o menos después de la línea ~20-40 de un archivo, **tira el analizador completo** (y por lo tanto todo el comando, ya que no hay manejo de errores alrededor):

```
CRASH: Cannot read properties of undefined (reading 'indexOf')
```

Esto probablemente explica por qué hoy no ves hallazgos de "más de 3 parámetros" en funciones/métodos formateados en varias líneas — directamente puede estar abortando el análisis antes de llegar a generar el reporte.

**Falsos positivos (confirmado por lectura del regex):**
- **El detector no distingue una declaración de una llamada.** El patrón `\b[A-Za-z_$][\w$]*\s*\(` matchea cualquier `identificador(`, así sea una declaración de función o una simple llamada a una función/constructor ya existente (incluidas las del lenguaje o de terceros). Esto significa que **cualquier llamada con más de 3 argumentos** se reporta igual que una mala declaración:
  ```ts
  console.log(a, b, c, d, e);             // se marca como "El método tiene más de 3 parámetros..."
  new Date(y, m, d, hh, mm, ss, ms);      // idem, aunque no puedas "separar en una línea con tu tabulador" la firma de Date
  setTimeout(callback, delay, x, y, z);   // idem
  ```
  Esto es, con mucha probabilidad, la fuente de ruido más grande de todo el proyecto, porque se dispara en cualquier llamada de función con 4+ argumentos, no solo en declaraciones.

---

## 7. `requestModelAnalyzer.ts`

**Cuándo entra:** por cada archivo soportado (cs/ts/tsx/js/jsx/php), dentro del loop principal, solo si la clase detectada "parece" un modelo de request (nombre termina en Request/Dto/Input/Command/Query/Payload, está en una carpeta `request/dto/input/...`, o extiende/implementa algo que contenga "Request").

**Vulnerabilidades / debilidades:**
- `isRequestModel` es bastante permisivo: basta con que el **archivo** esté en una carpeta llamada `dto`/`request`/etc. para que TODAS las clases de ese archivo se traten como modelos de request, aunque el nombre de la clase no lo sugiera.
- No distingue si una clase de C# es en realidad un `record` (los records no empiezan con la palabra `class`, así que de hecho quedan completamente fuera del análisis — hueco de cobertura, no FP).

**Falsos positivos (confirmado por lectura del regex):**
- **Propiedades opcionales en TypeScript.** El patrón de TS incluye `\??` antes de los dos puntos, así que una propiedad opcional —que por convención *no* debería llevar valor por default— también se reporta como que le falta un default:
  ```ts
  class CreateUserRequest {
    email?: string; // se reporta "debe inicializar con un valor por default", aunque lo correcto es dejarla undefined
  }
  ```
- **Propiedades `readonly` asignadas por constructor (patrón común de inyección/inmutabilidad).** El patrón de TS acepta `readonly` como modificador válido antes del nombre, así que una propiedad `readonly` sin inicializador en la declaración (porque se asigna en el constructor) también se marca como hallazgo, aunque sea código perfectamente correcto:
  ```ts
  class CreateUserRequest {
    readonly userId: string; // se reporta como "falta default", aunque se asigne en el constructor
    constructor(userId: string) { this.userId = userId; }
  }
  ```
- Campos obligatorios por diseño (IDs, enums) terminan "forzados" a un default sin sentido (`id: string = ''`) solo para silenciar el hallazgo, lo cual puede esconder bugs reales (un `id` vacío pasando desapercibido).

---

## 8. `dtoAutoMapperAnalyzer.ts`

**Cuándo entra:** solo para archivos `.cs`, dentro del loop principal (es decir, **se ejecuta un archivo a la vez**).

**Vulnerabilidades / debilidades — el hallazgo más importante de este analizador:**

`bigClasses` (el set de clases con más de 15 propiedades) se construye **desde cero en cada llamada**, porque la función recibe solo las líneas de **un** archivo (`analyzeDtoAutoMapper(lines, fileLabel, findings)` se llama dentro del loop `for (const uri of codeFiles)` en `codeReviewerCommand.ts`, no con el `Map` de todos los archivos). En un proyecto real típico, la clase DTO grande vive en un archivo (`Dtos/PedidoDto.cs`) y el mapeo manual ocurre en otro (`Services/PedidoService.cs`). Como el recorrido 1 (detectar clases grandes) y el recorrido 2 (detectar el mapeo manual) corren sobre el mismo archivo cada vez, **la regla prácticamente nunca se dispara en un proyecto con capas separadas**, que es justo el escenario que el resto de las reglas de este mismo analizador (`layeredStructureAnalyzer`) está exigiendo. Es un hueco de cobertura grave, no un falso positivo, pero vale la pena saber que la función puede estar "dormida" la mayor parte del tiempo.

**Falsos positivos:**
- `MANUAL_ASSIGNMENT_PATTERN` (`algo.Prop = otraCosa.Prop;`) no verifica que las clases involucradas sean realmente DTO/Entity. Si por coincidencia la variable destino fue instanciada antes (en el mismo archivo) a partir de una clase que sí superó las 15 propiedades, **cualquier copia manual de 3+ propiedades seguidas entre dos objetos no relacionados con mapeo** se reporta como que "debería usar AutoMapper", aunque sea, por ejemplo, actualizar un objeto de configuración o cache que nada tiene que ver con un mapeo DTO↔Entidad.

---

## 9. `linqAnalyzer.ts`

**Cuándo entra:** solo para archivos `.cs`, dentro del loop principal.

**Vulnerabilidades / debilidades:**
- Solo lleva el estado de **un** loop a la vez (`insideLoop` es un booleano simple). Un `foreach`/`for` anidado dentro de otro no se detecta como un loop independiente: sus patrones (`sawIf`, `sawAdd`, etc.) se mezclan con los del loop externo, y la sugerencia final queda atribuida a la variable/colección del loop **externo**, aunque el patrón detectado en realidad viniera del loop interno.

**Falsos positivos (confirmado por lectura del regex):**
- **`sawIf` y `sawAdd` no necesitan estar relacionados.** Cualquier `if` dentro del loop (por ejemplo, un guard clause o un log de advertencia) combinado con cualquier `.Add(...)` posterior en el mismo loop (aunque sea incondicional, fuera del if) dispara la sugerencia de `Where().Select()`:
  ```csharp
  foreach (var item in items) {
      if (item == null) {
          logger.Add("item nulo"); // esto es logging, no filtrado
      }
      resultados.Add(Transform(item)); // Add incondicional
  }
  // se sugiere reemplazar por items.Where(...).Select(...), aunque no hay un filtro real antes del Add
  ```
- **`sawAssignThenBreak` solo mira "asignación seguida de break", sin verificar que la asignación tenga que ver con una búsqueda.** Un simple reinicio de contador antes de cortar el loop también dispara la sugerencia de `FirstOrDefault`:
  ```csharp
  foreach (var x in items) {
      if (condicion) {
          contador = 0; // no es una búsqueda de elemento
          break;
      }
  }
  // se sugiere items.FirstOrDefault(x => condicion), aunque no se está buscando ni devolviendo "x"
  ```
- `ADD_CALL_PATTERN` no distingue `List.Add(valor)` de `Dictionary.Add(key, valor)` ni de `HashSet.Add(...)`; la sugerencia de `.Select(...)` puede no aplicar igual para esas colecciones.

---

## 10. `varAnalyze.ts`

**Cuándo entra:** solo para archivos `.cs`, dentro del loop principal.

**Vulnerabilidades / debilidades / falso positivo confirmado — el más "raro" de encontrar:**

`NEW_OBJECT_PATTERN` (`/^new\s+([A-Za-z_][\w<>[\],.]*)\s*[\(\{]/`) exige al menos un identificador entre `new` y el `{`/`(`. Un **tipo anónimo de C#** (`new { Nombre = "x" }`) no tiene ningún identificador ahí — es literalmente `new` seguido del `{` —, así que el patrón no lo reconoce como "tipo evidente por el lado derecho". Resultado: se reporta que hay que usar un tipo explícito en lugar de `var`, **aunque en C# es sintácticamente imposible declarar un tipo explícito para un tipo anónimo** (el lenguaje obliga a usar `var` ahí). Confirmado ejecutando la lógica real:

```csharp
var config = new { Name = "x", Age = 5 };
// -> SE REPORTA "var config no deja ver el tipo con solo leer la linea; usa el tipo explicito"
```

Esto es: la regla sugiere algo que el propio compilador de C# rechazaría.

**Otros falsos positivos:**
- Igual que `parameterAnalyzer.ts` y `asyncAnalyzer.ts`, el seguimiento de "estamos dentro de un método" (`insideMethod`) es un solo nivel; funciones/lambdas locales anidadas dentro de un método quedan mezcladas con el contexto del método contenedor.

---

## 11. `objectAnalyzer.ts`

**Cuándo entra:** por cada archivo soportado (cs/ts/tsx/js/jsx), dentro del loop principal.

**Vulnerabilidades / debilidades:**
- `CS_OBJECT_PARAM_PATTERN`/`CS_OBJECT_RETURN_PATTERN` no reconocen `object` dentro de un genérico (`List<object>`, `Dictionary<string, object>`), así que esos casos simplemente no se detectan (hueco de cobertura, no FP).
- `TS_OBJECT_TYPE_PATTERN` (`:\s*(object|Object)\b(?!\s*[.\w])`) no distingue un `object` "de verdad vago" de un uso deliberado en una firma de índice genérica o un tipo utilitario donde no hay forma más concreta de tipar.

**Falsos positivos:**
- **Firmas de índice genéricas / estructuras tipo JSON dinámico.** Un índice como `[key: string]: object;` (a veces la única opción razonable al interoperar con JSON externo sin forma fija) se reporta igual que un `object` perezoso en una variable común, aunque sea una decisión de diseño válida (lo "ideal" sería `Record<string, unknown>`, pero no siempre es tan claro ni automatizable sugerirlo).

---

## 12. `stringInterpolationAnalyzer.ts`

**Cuándo entra:** por cada archivo soportado (cs/ts/tsx/js/jsx/php), dentro del loop principal.

**Vulnerabilidades / debilidades:**
- Los patrones de concatenación (`literal + identificador` o viceversa) no verifican el **significado** de la concatenación, solo la forma sintáctica.

**Falsos positivos:**
- **Concatenación de rutas de archivo/URLs con un separador, muy común y donde el template literal no necesariamente es "mejor".** Por ejemplo:
  ```ts
  const path = basePath + '/archivo.txt'; // se marca como "usa template literal", aunque concatenar una ruta no es lo mismo que armar un mensaje
  ```
  Esto no es incorrecto desde el punto de vista de la regla (técnicamente sí es una concatenación con `+`), pero ilustra que la regla no distingue "armar una ruta/URL" (donde `+` es igual de legible) de "armar un mensaje con varias variables" (el caso que realmente se busca evitar).
- El patrón de "self-concat" (`CS_SELF_CONCAT_PATTERN`, etc.) para descartar acumulaciones tipo `total += ...` exige que la variable de la izquierda sea **exactamente** la misma que aparece después del operador; una acumulación equivalente pero con otra forma (`total = resultadoParcial + total;`, con el orden invertido) no se reconoce como self-concat y sí se marca como un hallazgo de concatenación a corregir, aunque conceptualmente sea el mismo patrón de acumulación.

---

## 13. `asyncAnalyzer.ts`

**Cuándo entra:** para `.cs`, `.ts`, `.tsx`, `.js`, `.jsx`, dentro del loop principal.

**Vulnerabilidades / debilidades:**
- `EF_CONTEXT_PATTERN` y `EF_SYNC_QUERY_PATTERN` se evalúan **de forma independiente sobre toda la línea**, sin exigir que el método síncrono (`.ToList()`, `.Find()`, etc.) se esté llamando específicamente sobre el objeto de contexto/DB. Si ambos aparecen en la misma línea por cualquier motivo, se marca como consulta EF síncrona.
- `ASYNC_CALL_HANDLED_PATTERN` considera "atendida" una llamada `...Async(...)` si hay un `await`, un `return`, un `=` (asignación) o `Task.WhenAll/WhenAny` **en esa misma línea**; no contempla el patrón común de "guardar la tarea para esperarla después" cuando se agrega directamente a una colección.

**Falsos positivos (confirmado por lectura del regex):**
- **EF Core: contexto y consulta síncrona sin relación real entre sí en la misma línea.**
  ```csharp
  var nombres = listaEnMemoria.Select(x => x.Nombre).ToList(); _context.Attach(entidad);
  // se reporta "la consulta a base de datos usa ToList()", aunque el ToList() es sobre listaEnMemoria, no sobre _context
  ```
- **Tareas recolectadas para esperarlas en bloque (`Task.WhenAll`) en una línea distinta.**
  ```csharp
  var tareas = new List<Task>();
  foreach (var id in ids) {
      tareas.Add(ProcesarAsync(id)); // se marca "no se espera", aunque mas abajo se hace await Task.WhenAll(tareas)
  }
  await Task.WhenAll(tareas);
  ```

---

## 14. `exceptionHandlingAnalyzer.ts`

**Cuándo entra:** para `.cs`, `.ts`, `.tsx`, `.js`, `.jsx`, `.php`, dentro del loop principal.

**Vulnerabilidades / debilidades:**
- La regla de "llamada riesgosa fuera de try-catch" no tiene forma de saber si el método que contiene esa llamada riesgosa es invocado, a su vez, desde un try-catch en otra función (un patrón de manejo de errores centralizado, muy común y en general recomendado — ej. middleware de excepciones en ASP.NET Core). Al no ver más allá de la función actual, **cualquier arquitectura que centralice el manejo de errores en una capa superior genera hallazgos "falsos" en cascada** en todos los métodos de capas inferiores.
- `CS_LOG_PATTERN`/`JS_LOG_PATTERN`/`PHP_LOG_PATTERN` solo reconocen un listado fijo de APIs de logging (`logger`/`_logger`/`Log`/`Trace` en C#, `console`/`logger`/`log` en JS, `error_log`/`Log::` en PHP). Cualquier proyecto con una abstracción propia de logging/auditoría (`IAuditService`, publicar a una cola, Serilog estático `Log.Information`, etc.) nunca se reconoce como "logueado".

**Falsos positivos (confirmados por lectura del código):**
- **Re-throw explícito (`throw;`), una práctica recomendada para preservar el stack trace y dejar que una capa superior registre el error una sola vez,** se marca como "el catch no registra el error en bitácora":
  ```csharp
  catch (Exception ex) {
      throw; // tiene contenido (catchHasBody = true) pero no hay logger.* -> se marca como "no registra en bitacora"
  }
  ```
- Un `catch` que deliberadamente regresa un valor por default sin loguear (patrón común en helpers tipo `TryParse`) recibe la misma advertencia, aunque sea intencional.

---

## 15. `interfaceContractAnalyzer.ts`

**Cuándo entra:** al final del loop principal, una sola vez, con el `Map` completo de todos los archivos — pero **solo analiza archivos `.cs`** (tanto para recolectar contratos como para verificar implementaciones).

**Vulnerabilidades / debilidades:**
- Cobertura: a pesar de que el resto del proyecto soporta TS/JS/PHP, esta regla de "implementa la interfaz pero no define el método" **no corre nunca** para esos lenguajes.
- `ABSTRACT_METHOD_PATTERN` (para reconocer un método de interfaz) exige que toda la firma esté en una sola línea terminada en `;`. Una interfaz con una firma larga partida en varias líneas (el mismo estilo que `parameterAnalyzer.ts` pide usar cuando hay más de 3 parámetros) deja de reconocerse como miembro exigido por el contrato.

**Falsos positivos (confirmado por lectura del regex):**
- **Implementación explícita de interfaz en C#** (`string IFoo.Bar() { ... }`, una sintaxis válida del lenguaje para implementar un miembro sin modificador de acceso y calificándolo con el nombre de la interfaz) no matchea `DEFINED_METHOD_PATTERN`, que exige al menos un modificador (`public`, `private`, etc.) antes del tipo de retorno. Resultado: la clase se reporta como que "implementa `IFoo` pero no define el método `Bar`", aunque sí lo define correctamente:
  ```csharp
  class Servicio : IFoo {
      string IFoo.Bar() { return "ok"; } // no matchea DEFINED_METHOD_PATTERN -> se reporta como método faltante
  }
  ```

---

## 16. `layeredStructureAnalyzer.ts`

**Cuándo entra:** al final del loop principal, una sola vez, con el `Map` completo de todos los archivos.

**Vulnerabilidades / debilidades (ya discutidas, resumen):**
- Solo "ve" una capa si al menos un archivo soportado (`ts/tsx/js/jsx/php/cs`) vive dentro de una carpeta con ese nombre. Una carpeta vacía, o con archivos de otra extensión (ej. `.py`, `.html`), es invisible para el análisis aunque exista en disco (bug ya discutido en esta conversación; el boceto de solución —enumerar carpetas en vez de inferir desde archivos— sigue sin aplicarse).
- `DATABASE_USAGE_PATTERN` ya no tiene el bug del `new` suelto (se corrigió en esta sesión), pero **ningún llamado a `test()` pasa por `stripLineComment`**: el regex corre sobre la línea cruda, comentarios incluidos.

**Falsos positivos:**
- **Mención de un ORM/driver dentro de un comentario** activa la exigencia de la capa de repositorios, aunque no haya uso real de base de datos en el código:
  ```ts
  // antes usábamos mongoose aquí directamente, ahora no
  ```
  Esta línea sola hace que `usesDatabase` sea `true` para todo el proyecto y exige la capa "Repositorios" aunque el código ya no tenga ninguna dependencia real de base de datos.

---

## Resumen de prioridad sugerida

1. **`parameterAnalyzer.ts`** — el bug de `line[j]` vs `lines[j]` puede estar tirando todo el comando en proyectos reales; es el único que llega a nivel de *crash*, no solo de falso positivo.
2. **`varAnalyze.ts`** — la regla de tipos anónimos de C# sugiere algo que el compilador rechaza; alto impacto en cualquier proyecto que use `new { ... }`.
3. **`dtoAutoMapperAnalyzer.ts`** — probablemente nunca se dispara en un proyecto con capas separadas, que es justo el escenario que el resto del tool promueve.
4. **`exceptionHandlingAnalyzer.ts`** — penaliza patrones recomendados (`throw;`, manejo centralizado), lo que puede generar desconfianza en el reporte completo si no se ajusta.
5. El resto son ruido puntual (falsos positivos reales pero menos frecuentes) o huecos de cobertura (no reportan algo que deberían).
