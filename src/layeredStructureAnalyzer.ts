// ---------------------------------------------------------------------------------------
// ---- VERIFICACION DE ESTRUCTURA DE PROYECTO EN CAPAS ----------------------------------
// ---------------------------------------------------------------------------------------

//nombre de cada capa y los nombres de carpeta aceptados (en minusculas, ingles y español)
const LAYERS: { name: string; folders: string[]} [] = [
    { name: 'controladores', folders: ['controllers', 'controladores'] },
    { name: 'Interface', folders: ['interfaces'] },
    { name: 'Servicios', folders: ['services', 'servicios'] },
    { name: 'Utils', folders: ['utils', 'helpers', 'utilidades']}
];

//capa extra, solo es obligatoria si el proyecto usa base de datos 
const REPOSITORY_LAYER = { name: 'Repositorios', folders: ['repositories', 'repositorios'] };

//Señales de que el proyecto usa una base de datos (c#, Node, PHP)
const DATABASE_USAGE_PATTERN = /\b(?:DbContext|SqlConnection|mongoose|PrismaClient|typeorm|sequelize|mysqli_\w+|new\s+PDO)\b/;

//Regresa true si algun archivo esta dentro de una carpeta con alguno de esos nombres 
// recibe fileLabels: rutas de los archivos del proyecto, folders: los nombres de carpeta validos para una capa 
function layerExists(folderPaths: string[], folders: string[]): boolean {
    return folderPaths.some(folderPath => {
        const segments = folderPath.replace(/\\/g, '/').toLowerCase().split('/');
        return segments.some(segment => folders.includes(segment));
    });
}

//funcion principal 
//recibe fileLines: map donde la clave es la ruta del archivo y el valor es un array con sus lineas de codigo, findings: hallazgos 
export function analyzeLayeredStructure(fileLines: Map<string, string[]>, folderPaths: string[],findings: string[]): void {

    //la capa de repositorios solo es obligatorio si el proyecto usa base de datos 
    const usesDatabase = [...fileLines.values()].some(lines => //recorre todas las lineas de todos los archivos 
        lines.some(line => DATABASE_USAGE_PATTERN.test(line)) //usa el regex para ver s en algun lado se usa una base de datos 
    );
    //arma la lista basica de capas a exigir y si usesDatabase es true se añade tambien REPOSITORT_LAYERS
    const requiredLayers = usesDatabase ? [...LAYERS, REPOSITORY_LAYER]: LAYERS;

    //recorre cada capa requerida y usa layerExists para checar si existe al menos una carpeta valida de esa capa
    for (const layer of requiredLayers) {
        if (!layerExists(folderPaths, layer.folders)) {
            findings.push('Estructura del proyecto - No se encontro en la capa "' + layer.name + '"'); // si no la encuentra, agrega un mensaje de hallazgo
        }
    }
}