// ---------------------------------------------------------------------------------------------
// ---- PRINCIPIOS SOLID PARA FRONTEND: I (S y O se analizan por IA en analyzers/ai) -----------
// ---------------------------------------------------------------------------------------------

import { SolidFrontendConfig } from "../../config/configLoader";
import { fileExportsComponent } from "../../shared/componentDetection";
import { Finding, pushFinding } from "../../shared/finding";

const COMPONENT_EXTENSION_PATTERN = /\.(jsx|tsx|js|ts)$/;
const TEST_FILE_PATTERN = /\.(test|spec|stories)\.(jsx|tsx|js|ts)$/;

//mismo componente que componentLocationAnalyzer para saber si el archivo es un componente de react
function isFrontendComponentFile(lines: string[], fileLabel: string): boolean {
    if (!COMPONENT_EXTENSION_PATTERN.test(fileLabel) || TEST_FILE_PATTERN.test(fileLabel)) { return false; }
    return fileExportsComponent(lines);
}

// ---- I: Interface Segregation Principal ----------------------------------------------------

const PROPS_TYPE_START_PATTERN = /\b(?:interface|type)\s+\w*Props\w*\s*(?:=\s*)?\{/;

function countPropsField(lines: string[], startIndex: number): number {
    let depth = 0;
    let fields = 0;
    for (let i= startIndex; i < lines.length; i++) {
        const line = lines[i];
        depth += (line.match(/\{/g) ?? []).length;
        depth -= (line.match(/\}/g) ?? []).length;
        if (i > startIndex && /^\s*[A-Za-z0-9_]+\??\s*:/.test(line)) { fields++; }
        if (depth <= 0 && i > startIndex) { break; }
    }
    return fields;
}

function analyzeInterfaceSegregation(lines: string[], fileLabel: string, findings: Finding[], config: SolidFrontendConfig): void {
    lines.forEach((line, index) => {
        if (!PROPS_TYPE_START_PATTERN.test(line)) { return; }
        const fieldCount = countPropsField(lines, index);
        if (fieldCount > config.maxProps) {
            pushFinding(findings, 'solidFrontend', fileLabel, 'La interfaz de props tiene ' + fieldCount + ' campos (ISP: separa interfaces mas pequeñas)', {
                line: index + 1,
                suggestion: 'Separa esta interfaz de props en interfaces mas pequeñas y especificas (ISP).',
            });
        }
    });
}

//funcion principal
export function analyzeSolidFrontendIsp(lines: string[], fileLabel: string, findings: Finding[], config: SolidFrontendConfig): void {
    if (!isFrontendComponentFile(lines, fileLabel)) { return; }
    analyzeInterfaceSegregation(lines, fileLabel, findings, config);
}