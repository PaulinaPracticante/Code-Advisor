import * as vscode from 'vscode';
import { Minimatch } from 'minimatch';

export interface RuleToggle {
    enabled: boolean;
}

export interface DtoAutoMapperConfig extends RuleToggle {
    maxProperties: number;
    minManualAssignments: number;
}

export interface ParametersConfig extends RuleToggle {
    maxInLineParams: number;
    maxLineLength: number;
}

export interface LinqSuggestionsConfig {
    whereSelect: boolean;
    select: boolean;
    count: boolean;
    sum: boolean;
    firstOrDefault: boolean;
}

export interface LinqConfig extends RuleToggle {
    suggestions: LinqSuggestionsConfig;
}

export interface RequestModelsConfig extends RuleToggle {
    suffixes: string[];
    folders: string[];
    checkOptionalProperties: boolean;
    checkReadonlyProperties: boolean;
}

export interface ObjectUsageLenguajeConfig {
    watchedTypes: string[];
    exemptPatterns: string[];
}

export interface ObjectUsageConfig extends RuleToggle {
    csharp: ObjectUsageLenguajeConfig;
    typescript: ObjectUsageLenguajeConfig;
    javascript: ObjectUsageLenguajeConfig;
}

export interface LayerDefinition {
    name: string;
    folders: string[];
    required: boolean;
    requiredIfDatabaseDetected?: boolean;
}

export interface LayersConfig extends RuleToggle {
    layers: LayerDefinition[];
    databaseUsagePatterns: string[];
}

export interface InterfacesConfig extends RuleToggle {
    contractFolders: string[];
    includeAbstractClasses: boolean;
    lenguages: string[];
}

export interface DuplicateCodeConfig extends RuleToggle {
    minLines: number;
    minOccurrences: number;
}

export interface RequestHandlerContextConfig {
    expected: 'fetch' | 'axios';
}

export interface RequestHnadlersConfig extends RuleToggle {
    next: RequestHandlerContextConfig;
    react: RequestHandlerContextConfig;
    reactNative: RequestHandlerContextConfig;
    legacyJs: RequestHandlerContextConfig;
}

export interface ComponentLocationConfig extends RuleToggle {
    folders: string[];
    exemptFolders: string[];
    exemptFiles: string[];
}

// reglas que todavia no tienen parametros propios configurables, solo enabled/disabled
export interface CodeAdvisorConfig {
    exclude: string[];
    rules: {
        dtoAutoMapper: DtoAutoMapperConfig;
        parameters: ParametersConfig;
        linq: LinqConfig;
        requestModels: RequestModelsConfig;
        objectUsage: ObjectUsageConfig;
        layers: LayersConfig;
        interfaces: InterfacesConfig;
        indentation: RuleToggle;
        ifBraces: RuleToggle;
        ternaries: RuleToggle;
        varUsage: RuleToggle;
        async: RuleToggle;
        stringInterpolation: RuleToggle;
        exceptionHandling: RuleToggle;
        naming: RuleToggle;
        envNaming: RuleToggle;
        fileNaming: RuleToggle;
        cssClassNaming: RuleToggle;
        duplicateCode: DuplicateCodeConfig;
        requestHandlers: RequestHnadlersConfig;
        componentLocation: ComponentLocationConfig;
    };
}

const CONFIG_FILE_NAME = 'code-advisor.config.json';

//valores por defecto: son exactamente los que estan hardcodeados en cada analizador, para que un 
//workspace sin code-advisor.config.json se comporte igual que antes.
export const DEFAULT_CONFIG: CodeAdvisorConfig = {
    exclude: ['**/node_modules/**', '**/dist/**', '**/out/**', '**/.git/**', '**/build/**'],
    rules: {
        dtoAutoMapper: { enabled: true, maxProperties: 15, minManualAssignments: 3},
        parameters: { enabled: true, maxInLineParams: 2, maxLineLength: 120 },
        linq: {
            enabled: true,
            suggestions: { whereSelect: true, select: true, count: true, sum: true, firstOrDefault: true },
        },
        requestModels: {
            enabled: true,
            suffixes: ['Request', 'Dto', 'Input', 'Command', 'Query', 'Payload'],
            folders: ['request', 'dtos', 'inputs', 'contracts'],
            checkOptionalProperties: true,
            checkReadonlyProperties: true,
        },
        objectUsage: {
            enabled: true,
            csharp: { watchedTypes: ['object'], exemptPatterns: ['Equals\\s*\\(\\s*object\\s+\\w+\\s*\\)']},
            typescript: { watchedTypes: ['object', 'Object'], exemptPatterns: [] },
            javascript: { watchedTypes: ['Object'], exemptPatterns: [] },
        },
        layers: {
            enabled: true,
            layers: [
                { name: 'controladores', folders: ['controllers', 'controladores'], required: true },
                { name: 'Interface', folders: ['interfaces'], required: true },
                { name: 'Servicios', folders: ['services', 'servicios'], required: true },
                { name: 'Utils', folders: ['utils', 'helpers', 'utilidades'], required: true },
                {
                    name: 'Repositorios',
                    folders: ['repositories', 'repositorios'],
                    required: false,
                    requiredIfDatabaseDetected: true,
                },
            ],
            databaseUsagePatterns: [
                'DbContext', 'SqlConnection', 'mongoose', 'PrismaClient', 'typeorm', 'sequelize', 'mysqli_\\w+', 'new\\s+PDO',
            ],
        },
        interfaces: {
            enabled: true,
            contractFolders: ['models', 'model', 'interfaces', 'interface'],
            includeAbstractClasses: true,
            lenguages: ['cs', 'ts', 'tsx', 'js', 'jsx'],
        },
        duplicateCode:{
            enabled: true,
            minLines: 5,
            minOccurrences: 2,
        },
        requestHandlers: {
            enabled: true,
            next: { expected: 'fetch' },
            react: { expected: 'axios' },
            reactNative: { expected: 'axios' },
            legacyJs: { expected: 'fetch' },
        },
        componentLocation: {
            enabled: true,
            folders: ['component', 'components'],
            exemptFolders: ['app', 'pages', 'screens', 'views'],
            exemptFiles: ['App', 'main', 'index', '_app', '_document'],
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
        cssClassNaming: { enabled: true },
    },
};

// mezcla el JSON del usuario sobre DEFAULT_CONFIG; los arreglos se reemplazan completos 
// (si el usurio define "suffixes" pierde los default y usa solo los suyos)
function deepMerge<T>(base: T, override: unknown): T {
    if (override === undefined) { return base; }
    if (override === null || typeof override !== 'object' || Array.isArray(override)) {
        return override as T;
    }
    const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const key of Object.keys(override as Record<string, unknown>)) {
        result[key] = deepMerge((base as Record<string, unknown>)?.[key], (override as Record<string, unknown>)[key]);
    }
    return result as T;
}

export async function loadConfig(workspaceRoot: vscode.Uri): Promise<CodeAdvisorConfig> {
    const configUri = vscode.Uri.joinPath(workspaceRoot, CONFIG_FILE_NAME);
    try {
        const bytes = await vscode.workspace.fs.readFile(configUri);
        const userConfig = JSON.parse(Buffer.from(bytes).toString('utf8'));
        return deepMerge(DEFAULT_CONFIG, userConfig);
    } catch (error) {
        if ((error as vscode.FileSystemError).code !== 'FileNotFound') {
            vscode.window.showWarningMessage(
                `Code Advisor: no se pude leer "${CONFIG_FILE_NAME}" (${(error as Error).message}); se uso la configuracion por defecto.`
            );
        }
        return DEFAULT_CONFIG;
    }
}

//precompila los minimatch una vez por config(se llama por cada archivo)
export function buildExcludeMatchers(config: CodeAdvisorConfig): Minimatch[] {
    return config.exclude.map(pattern => new Minimatch(pattern, { dot: true }));
}

export function isExluded(fileLabel: string, matchers: Minimatch[]): boolean {
    const normalized = fileLabel.replace(/\\/g, '/');
    return matchers.some(matcher => matcher.match(normalized));
}