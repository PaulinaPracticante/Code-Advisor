// ----------------------------------------------------------------------------------------------------
// ---- DONDE SE GUARDA LA LLAVE PRIVADA DEL GERENTE EN SU EQUIPO -----------------------------------
// ----------------------------------------------------------------------------------------------------

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

//carpeta de la cuenta del usuario, queda fuera de cualquier proyecto para que la llave no se suba a git
function keyDirectory(): string {
    return path.join(os.homedir(), '.codeadvisor');
}

//ruta de la llave privada, solo existe en el equipo del gerente
export function getManagerKeyPath(): string {
    return path.join(keyDirectory(), 'manager.key');
}

//lee la llave privada del gerente, si este equipo no la tiene regresa undefined
export function readManagerPrivateKey(): string | undefined {
    try {
        return fs.readFileSync(getManagerKeyPath(), 'utf8');
    } catch {
        return undefined;
    }
}

//guarda la llave privada (solo lectura para su propietario) y una copia de la publica para consultarla despues
export function saveManagerKey(privateKeyPem: string, publicKeyBase64: string): void {
    fs.mkdirSync(keyDirectory(), { recursive: true });
    fs.writeFileSync(getManagerKeyPath(), privateKeyPem, { mode: 0o600 });
    fs.writeFileSync(path.join(keyDirectory(), 'manager.pub'), publicKeyBase64, 'utf8');
}
