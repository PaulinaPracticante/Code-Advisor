import * as vscode from 'vscode';
import { Minimatch } from 'minimatch';
import type { NamingCaseStyles } from './namingConfig';


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

export interface EnglishOnlyConfig extends RuleToggle {
    model: string;
}

export interface SemanticNameConfig extends RuleToggle {
    model: string;
}

export interface SingleResponsibilityConfig extends RuleToggle {
    model: string;
}

export interface CodeComplexityConfig extends RuleToggle {
    model: string;
}

export interface CommentLanguageConfig extends RuleToggle {
    model: string;
}

export interface AiReviewConfig {
    model: string;
    maxTokens: number;
}

export interface QueryViewsConfig extends RuleToggle {
    maxJoins: number;
    maxColumns: number;
    maxParameters: number;
}

export interface CommitMessageConfig extends RuleToggle {
    pattern: string;
}

export interface NamingConfig extends RuleToggle {
    javascript: NamingCaseStyles;
    php: NamingCaseStyles;
    csharp: NamingCaseStyles;
}

export interface SolidFrontendConfig extends RuleToggle {
    maxProps: number;
}

export interface SolidFrontendAiConfig extends RuleToggle {
    model: string;
    maxTokens: number;
}

// reglas que todavia no tienen parametros propios configurables, solo enabled/disabled
export interface CodeAdvisorConfig {
    exclude: string[];
    priorities?: Record<string, Priority>; //prioridades que el gerente cambio respecto a las de RULE_PRIORITIES
    rules: {
        dtoAutoMapper: DtoAutoMapperConfig;
        parameters: ParametersConfig;
        linq: LinqConfig;
        requestModels: RequestModelsConfig;
        objectUsage: ObjectUsageConfig;
        layers: LayersConfig;
        interfaces: InterfacesConfig;
        indentation: RuleToggle;
        folderNaming: RuleToggle;
        ifBraces: RuleToggle;
        ternaries: RuleToggle;
        varUsage: RuleToggle;
        async: RuleToggle;
        stringInterpolation: RuleToggle;
        exceptionHandling: RuleToggle;
        naming: NamingConfig;
        envNaming: RuleToggle;
        fileNaming: RuleToggle;
        cssClassNaming: RuleToggle;
        duplicateCode: DuplicateCodeConfig;
        requestHandlers: RequestHnadlersConfig;
        componentLocation: ComponentLocationConfig;
        englishOnly: EnglishOnlyConfig;
        semanticNaming: SemanticNameConfig;
        singleResponsibility: SingleResponsibilityConfig;
        codeComplexity: CodeComplexityConfig;
        commentLanguage: CommentLanguageConfig;
        queryViews: QueryViewsConfig;
        tableAlias: RuleToggle;
        transactions: RuleToggle;
        commitMessage: CommitMessageConfig;
        aiReview: AiReviewConfig;
        solidFrontend: SolidFrontendConfig;
        solidFrontendAi: SolidFrontendAiConfig;
    };
}

export const CONFIG_FILE_NAME = 'code-advisor.config.json';

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
        englishOnly: { enabled: true, model: 'claude-sonnet-5-5' },
        semanticNaming: { enabled: true, model: 'claude-sonnet-5-5'},
        singleResponsibility: { enabled: true, model: 'claude-sonnet-5-5' },
        codeComplexity: { enabled: true, model: 'claude-sonnet-5-5' },
        commentLanguage: { enabled: true, model: 'claude-sonnet-5-5' },
        aiReview: { model: 'claude-sonnet-5-5', maxTokens: 8000 },
        solidFrontend: { enabled: true, maxProps: 8 },
        solidFrontendAi: { enabled: true, model: 'claude-sonnet-5-5', maxTokens: 4096 },
        queryViews: { enabled: true, maxJoins: 3, maxColumns: 15, maxParameters: 5 },
        tableAlias: { enabled: true },
        transactions: { enabled: true },
        // iniciales en mayuscula + ":" o "_" + descripcion, ej. ABCD:Corrige validacion del login
        commitMessage: { enabled: true, pattern: '^[A-Z]{2,5}[:_]\\s?\\S.*$' },
        indentation: { enabled: true },
        folderNaming: { enabled: true },
        ifBraces: { enabled: true },
        ternaries: { enabled: true },
        varUsage: { enabled: true },
        async: { enabled: true },
        stringInterpolation: { enabled: true },
        exceptionHandling: { enabled: true },
        naming: {
            enabled: true,
            javascript: { classCase: 'PascalCase', functionCase: 'camelCase', methodCase: 'camelCase', variableCase: 'camelCase', constantCase: 'camelCase', componentCase: 'PascalCase' },
            php: { classCase: 'PascalCase', functionCase: 'camelCase', methodCase: 'camelCase', variableCase: 'camelCase', constantCase: 'camelCase' },
            csharp: { classCase: 'PascalCase', functionCase: 'camelCase', methodCase: 'camelCase', variableCase: 'camelCase', constantCase: 'camelCase' },
        },
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


//aplica las prioridades que cambio el gerente sobre las de por defecto, ignora lo que no sea Alta, Media o Baja
function applyPriorities(overrides: unknown): void {
    activePriorities = { ...RULE_PRIORITIES };
    if (overrides === null || typeof overrides !== 'object') { return; }
    for (const [rule, priority] of Object.entries(overrides as Record<string, unknown>)) {
        if (priority === 'Alta' || priority === 'Media' || priority === 'Baja') { activePriorities[rule] = priority; }
    }
}

export async function loadConfig(workspaceRoot: vscode.Uri): Promise<CodeAdvisorConfig> {
    const configUri = vscode.Uri.joinPath(workspaceRoot, CONFIG_FILE_NAME);
    try {
        const bytes = await vscode.workspace.fs.readFile(configUri);
        const content = JSON.parse(Buffer.from(bytes).toString('utf-8'));
        const config = deepMerge(DEFAULT_CONFIG, content);
        applyPriorities(config.priorities);
        return config;
    } catch (error) {
        applyPriorities(undefined);
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


export type Priority = 'Alta' | 'Media' | 'Baja';

export const RULE_PRIORITIES: Record<string, Priority> = {
    transactions: 'Alta',
    exceptionHandling: 'Alta',
    async: 'Alta',
    objectUsage: 'Alta',
    requestModels: 'Alta',
    requestHandlers: 'Alta',
    duplicateCode: 'Alta',
    folderNaming: 'Alta',
    projectGuidelines: 'Alta',

    layers: 'Media',
    interfaces: 'Media',
    singleResponsibility: 'Media',
    codeComplexity: 'Media',
    dtoAutoMapper: 'Media',
    queryViews: 'Media',
    linq: 'Media',
    solidFrontend: 'Media',
    solidFrontendAi: 'Media',
    componentLocation: 'Media',

    commitMessage: 'Baja',
    englishOnly: 'Baja',
    naming: 'Baja',
    semanticNaming: 'Baja',
    envNaming: 'Baja',
    fileNaming: 'Baja',
    cssClassNaming: 'Baja',
    varUsage: 'Baja',
    ifBraces: 'Baja',
    ternaries: 'Baja',
    stringInterpolation: 'Baja',
    parameters: 'Baja',
    tableAlias: 'Baja',
    indentation: 'Baja',
    commentLanguage: 'Baja',
}

//prioridades vigentes: las de RULE_PRIORITIES con los cambios del gerente encima, se recalculan en cada loadConfig
let activePriorities: Record<string, Priority> = RULE_PRIORITIES;

//prioridad con la que se reporta un hallazgo de la regla, undefined si la regla no tiene una asignada
export function getRulePriority(rule: string): Priority | undefined {
    return activePriorities[rule];
}