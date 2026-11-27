# CodeAdvisor

Extensión de VS Code que revisa los commits de un pull request contra los estándares de código del equipo (reglas propias y, opcionalmente, IA) y muestra los hallazgos en un panel lateral.

## Requisitos

* Tener la extensión de Git de VS Code habilitada (`vscode.git`).
* Trabajar dentro de un repositorio git con una rama base (por defecto `main`).

## Comandos

* **Revisar Código** (`codeadvisor.codeReviewer`): analiza los commits de la rama actual contra la base y llena el panel de hallazgos.
* **Verificar Repositorio de Git** (`codeadvisor.gitVerification`): confirma que el workspace abierto tiene un repositorio git detectado por VS Code.
* **Configurar Estándares (Gerente)** (`codeadvisor.configureStandards`): panel para activar/desactivar reglas, ajustar su prioridad y sus parámetros. Si el equipo usa el backend (ver abajo), el panel puede protegerse con una contraseña de gerente.

## Backend (opcional, `server/`)

Una API (Node + MySQL) que guarda el historial de hallazgos por repositorio, los estándares vigentes del equipo y la contraseña del gerente, para que apliquen igual en todas las máquinas. Se configura la URL en `src/engine/history/historyConfig.ts` (`HISTORY_API_URL`). Sin esta API configurada, la extensión funciona igual pero sin historial compartido, sin estándares compartidos y sin protección por contraseña en el panel.

Para levantarlo: ver `server/README` (o `server/package.json` para los scripts `db:init`, `dev`, `build`, `start`).

## Desarrollo

```
npm install
npm run compile   # o npm run watch
```

Se abre con F5 (Extension Development Host) para probar cambios localmente.
