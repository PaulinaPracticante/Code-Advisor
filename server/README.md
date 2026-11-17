# API del historial de CodeAdvisor

Guarda en MySQL 8 cada análisis de la extensión (uno por commit) y le da al panel del gerente los datos del historial.
Está hecha en Node.js y TypeScript. Por ahora corre en tu equipo; dónde se despliega se decide después.

## Cómo ponerla a andar

1. **Base de datos.** Abre `sql/001_create_history.sql` en MySQL Workbench y ejecútalo completo, o deja que lo haga el script del paso 3.
   Si usas Workbench, crea antes la base: `CREATE DATABASE codeadvisor_history CHARACTER SET utf8mb4;` y selecciónala con `USE`.
2. **Configuración.** Copia `env.example` como `.env` y cambia los datos de tu MySQL (usuario, contraseña y nombre de la base).
3. **Instalar y preparar la base.**

```bash
cd server
npm install
npm run db:init
```

4. **Arrancar.**

```bash
npm run dev
```

La API queda en `http://localhost:3000`. Para comprobar que ve a la base: `http://localhost:3000/api/health`.
Para producción: `npm run build` y luego `npm start`.

## Conectar la extensión

En `src/engine/history/historyConfig.ts` (en la raíz del proyecto, no en `server`) pon la dirección de la API en `HISTORY_API_URL`.
Mientras esté vacía, la extensión no manda ni consulta nada. Si pusiste `API_TOKEN` en el `.env`, pon el mismo valor en `HISTORY_API_TOKEN`.

## Qué guarda

- **`analyses`**: un renglón por commit analizado (rama, autor, fecha, cuántos hallazgos Alta, Media y Baja había abiertos).
- **`findings`**: un renglón por hallazgo con su vida completa: en qué commit apareció, en cuál se vio por última vez y en cuál se resolvió.
  El hallazgo se identifica con una huella (`fingerprint`) que no depende del número de línea.
- **`pull_requests`**: un PR cerrado con merge. Cuando la extensión detecta el merge, los commits y hallazgos de esa rama pasan a ese PR
  y la rama queda libre para un ciclo nuevo, porque en este equipo la misma rama se reutiliza en cada PR.
- **Vistas**: `view_cycle_summary` (una fila por rama con PR abierto o por PR cerrado) y `view_finding_history` (fechas de cada hallazgo).

## Rutas

| Ruta | Quién la usa | Qué hace |
|---|---|---|
| `POST /api/analyses` | la extensión | guarda el análisis de un commit y actualiza la vida de los hallazgos |
| `POST /api/pull-requests/merged` | la extensión | cierra el ciclo de una rama cuando su PR se mergeó: el PR se lleva los commits y hallazgos hasta el commit avisado, que debe ser uno que ya se haya registrado (si no, no cierra nada) |
| `GET /api/history/repos` | el panel | repos que han mandado análisis |
| `GET /api/history/summary` | el panel | indicadores, reglas más incumplidas y tendencia semanal |
| `GET /api/history/cycles` | el panel | PR abiertos y mergeados con detectados, corregidos y sin corregir (filtros `repoId`, `state`, `search`, `limit`, `offset`) |
| `GET /api/history/cycles/commits` | el panel | commits de un ciclo |
| `GET /api/history/analyses/:id/findings` | el panel | hallazgos de un commit con su estado: nuevo, persiste o resuelto |
| `GET /api/health` | cualquiera | revisa que la API y la base estén arriba (no pide token) |

## Seguridad

Es mínima a propósito: la contraseña del panel es lo que protege la pantalla. El `API_TOKEN` es opcional, un solo valor compartido
para que la API no quede abierta a cualquiera que conozca su dirección. No identifica a cada persona.

## Pruebas

Corren contra un MySQL 8 real, sobre una base temporal que se crea y se borra sola. El usuario debe poder crear bases de datos.

```bash
TEST_DB_USER=root TEST_DB_PASSWORD=tu-contrasena npm test
```

En PowerShell: `$env:TEST_DB_USER='root'; $env:TEST_DB_PASSWORD='tu-contrasena'; npm test`.
