// --------------------------------------------------------------------------------------
// ---- VERIFICACION DE CLASES EN HTML / CSS (kebab-case) -------------------------------
// --------------------------------------------------------------------------------------

import { matchesCase } from "../../config/namingConfig";

//busca selectores de clase en un archivo css 
const CSS_CLASS_SELECTOR_PATTERN = /\.([A-Za-z_-][A-Za-z0-9_-]*)(?=[\s,:{]|$)/g;

//busca el atributo class o className, luego acepta el valor entre comillas dobles o simples 
const HTML_CLASS_ATRIBUTE_PATTERN = /class(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

//funcion para verficar kebab-case en el nombre del archivo 
function reportIfInvalid(name: string, fileLabel: string, findings: string[]): void {
    if (!matchesCase(name, 'kebab-case')) {
        findings.push(fileLabel + ' - La clase ' + name + ' no usa kebab-case');
    }
}

function analyzeCssFile(lines: string[], fileLabel: string, findings: string[]): void {
    //por cada archivo 
    lines.forEach(line => {
        CSS_CLASS_SELECTOR_PATTERN.lastIndex = 0; //reinicia lastIndex a 0 del regex 
        let match: RegExpExecArray | null;
        //va sacando todas las clases que haya en esa linea porque puede haber varios selectores en la misma linea 
        while ((match = CSS_CLASS_SELECTOR_PATTERN.exec(line)) !== null) {
            reportIfInvalid(match[1], fileLabel, findings); //por cada coincidencia es el nombre capturado y se manda reportIfInvalid 
        }
    });
}

function analyzeHtmlFile(lines: string[], fileLabel: string, findings: string[]): void {
    //por cada archivo 
    lines.forEach(line => {
        HTML_CLASS_ATRIBUTE_PATTERN.lastIndex = 0; //reinicia lastIndex a 0 del regex 
        let match: RegExpExecArray | null;
        //va sacando todas las clases que haya en esa linea porque puede haber varios selectores en la misma linea 
        while ((match = HTML_CLASS_ATRIBUTE_PATTERN.exec(line)) !== null) {
            const classValue = match[1] ?? match[2] ?? ''; //el regex tiene dos grupos alterntivos pero solo uno de los dos tendra el valor en cada coincidencia
            //se separan si trae varias calses separadas por espacios y descarta strings vacios que puede dejar el split 
            classValue.split(/\s+/).filter(name => name.length > 0).forEach(name => {
                reportIfInvalid(name, fileLabel, findings); //cada nombre resultante se valida 
            });
        }
    });
}

//funcion principal 
export function analyzeCssClassNaming(lines: string[], languageId: 'css' | 'html', fileLabel: string, findings: string[]): void {
    if (languageId === 'css') {
        analyzeCssFile(lines, fileLabel, findings);
    } else {
        analyzeHtmlFile(lines, fileLabel, findings);
    }
}