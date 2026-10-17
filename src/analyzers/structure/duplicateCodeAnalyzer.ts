// ----------------------------------------------------------------------------------------------
// ---- VERIFICACION DE CODIGO DUPLICADO: BLOQUE REPETIDOS QUE DEBERIAN REUTILIZARSE ------------
// ----------------------------------------------------------------------------------------------

import { DuplicateCodeConfig } from "../../config/configLoader";

//quita los comentarios en los archivos 
function normilzeLine(rawLine: string): string {
    return rawLine.replace(/\/\/.*$/, '').trim().replace(/\s+/g, ' ');
}

function isTrivialLine(normalized: string): boolean {
    return normalized === '' || /^[{}()[\];,]+$/.test(normalized);
}

//guarda donde aparece un bloque candidato, en que archivo y en que indice de linea empieza
interface Occurrence {
    fileLabel: string;
    startIndex: number;
}

// funcion que encuentra candidatos a duplicado 
function collectBlocks(normalizedByFile: Map<string, string[]>, minLines: number): Map<string, Occurrence[]> {
    const blockByHash = new Map<string, Occurrence[]>();

    for (const [fileLabel, lines] of normalizedByFile) {
        for (let start = 0; start <= lines.length - minLines; start++) {
            const window = lines.slice(start, start + minLines);
            const meaningfulLines = window.filter(line => !isTrivialLine(line));
            if (meaningfulLines.length < minLines * 0.6) { continue; }

            const hash = window.join('\n');
            const occurrence: Occurrence = { fileLabel, startIndex: start };
            const existing = blockByHash.get(hash);
            if (existing) { 
                existing.push(occurrence); 
            } else  {
                blockByHash.set(hash, [occurrence]);
            }
        }
    }
    return blockByHash;
}

//funcion principal 
export function analyzeDuplicateCode(
    fileLines: Map<string, string[]>,
    changedLinesByFile: Map<string, Set<number>>,
    findings: string[],
    config: DuplicateCodeConfig
): void {
    //normaliza las lienas de todos los archivos 
    const normalizedByFile = new Map([...fileLines].map(([label, lines]) => [label, lines.map(normilzeLine)]));
    //llama a collectBlocks para obtener los bloques candidatos agrupados por hash
    const blocksByHash =  collectBlocks(normalizedByFile, config.minLines);

    const consumed = new Map<string, Set<number>>(); //guarda que indices de linea ya fueron usados en un hallazgo 
    //consultar y marcar esos indices 
    const isConsumed = (fileLabel: string, index: number) => consumed.get(fileLabel)?.has(index) ?? false;
    const markConsumed = (fileLabel: string, start: number, lenght: number) => {
        if (!consumed.has(fileLabel)) { consumed.set(fileLabel, new Set()); }
        const set = consumed.get(fileLabel)!;
        for (let i = start; i < start + lenght; i++) { set.add(i); }
    };
    //revisa si el bloque toca alguna linea que fue modificada en el diff actual 
    const intersectsChanged = (fileLabel: string, start: number, lenght: number) => {
        const changed = changedLinesByFile.get(fileLabel);
        if (!changed) { return false; }
        for (let i = start; i < start + lenght; i++) {
            if (changed.has(i + 1)) { return true; }
        }
        return false;
    };

    // or cada grupo de ocurrencias 
    for (const occurrences of blocksByHash.values()) {
        //si el grupo tiene menos ocurrencias que config.minOcurrences se ignora porque no es suficiente duplicado 
        if (occurrences.length < config.minOccurrences) { continue; }

        //recorre cada ocurrencia como posible ancla
        for (let a = 0; a < occurrences.length; a++) {
            const anchor = occurrences[a];
            //si ya fu consumida por otro hallazgo, la salta 
            if (isConsumed(anchor.fileLabel, anchor.startIndex)) { continue; }

            //busca otra ocurrencia para emparejar 
            for (let b = a + 1; b < occurrences.length; b++) {
                const other = occurrences[b];
                //evita comprarse consigo misma 
                if (anchor.fileLabel === other.fileLabel && anchor.startIndex === other.startIndex) { continue; }
                //evita ocurrencias ya consumidas 
                if (isConsumed(other.fileLabel, other.startIndex)) { continue; }

                const anchorLines = normalizedByFile.get(anchor.fileLabel)!;
                const otherLines = normalizedByFile.get(other.fileLabel)!;

                let length = config.minLines;
                //compara linea por linea mas alla del minimo mientras ambos archivos sigan coincidiendo exactamente 
                while (
                    anchor.startIndex + length < anchorLines.length &&
                    other.startIndex + length < otherLines.length &&
                    anchorLines[anchor.startIndex + length] === otherLines[other.startIndex + length]
                ) {
                    length++;
                }

                //marca como consumidas todas las lineas de ambos bloques para que no se reporten en otro hallazgo 
                markConsumed(anchor.fileLabel, anchor.startIndex, length);
                markConsumed(other.fileLabel, other.startIndex, length);

                //si es relevane arma el mensaje de hallazgo con las ubicaciones exactas 
                const relevant = intersectsChanged(anchor.fileLabel, anchor.startIndex, length) ||
                    intersectsChanged(other.fileLabel, other.startIndex, length);
                if (!relevant) { continue; }

                findings.push(
                    anchor.fileLabel + ':' + (anchor.startIndex + 1) + '-' + (anchor.startIndex + length) + 
                    ' - este bloque de ' + length + ' lines se repite en ' + 
                    other.fileLabel + ':' + (other.startIndex + 1) + '-' + (other.startIndex + length) + 
                    '; considera extraerlo a una funcion/componente/clase reutilizable'
                );
                break;
            }
        }
    }
}