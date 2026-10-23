//lista de regex que reconocen las formas mas comunes de exportar un componente de react
const COMPONENT_EXPORT_PATTERNS: RegExp[] = [
    /^export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/,
    /^export\s+default\s+([A-Z][A-Za-z0-9_]*)\s*;?\s*$/,
    /^export\s+(?:default\s+)?function\s+([A-Z][A-Za-z0-9_]*)/,
    /^export\s+(?:default\s+)?const\s+([A-Z][A-Za-z0-9_]*)\s*(?::|=)/,
    /^function\s+([A-Z][A-Za-z0-9_]*)/,
    /^const\s+([A-Z][A-Za-z0-9_]*)\s*(?::|=)/,
]

//revisa si alguna linea del archivo declara o exporta un componente
export function fileExportsComponent(lines: string[]): boolean {
    return lines.some(rawLine => {
        const commentIndex = rawLine.indexOf('//');
        const line = (commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex)).trim();
        return COMPONENT_EXPORT_PATTERNS.some(pattern => pattern.test(line));
    });
}