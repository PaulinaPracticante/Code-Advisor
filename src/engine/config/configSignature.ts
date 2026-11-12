// ----------------------------------------------------------------------------------------------------
// ---- FIRMA DIGITAL DE LA CONFIGURACION: SOLO EL GERENTE PUEDE CAMBIAR LOS ESTANDARES ---------------
// ----------------------------------------------------------------------------------------------------

import * as crypto from 'crypto';

//copia el valor con las llaves de los objetos ordenadas, asi la misma configuracion siempre da el mismo texto
//y la firma no depende de los espacios, de los saltos de linea (CRLF o LF) ni del orden en que esten escritas las llaves
export function sortKeys(value: unknown): unknown {
    if (Array.isArray(value)) { return value.map(sortKeys); }
    if (value !== null && typeof value === 'object') {
        const source = value as Record<string, unknown>;
        const sorted: Record<string, unknown> = {};
        for (const key of Object.keys(source).sort()) { sorted[key] = sortKeys(source[key]); }
        return sorted;
    }
    return value;
}

//el texto exacto que se firma y se verifica
export function canonicalize(value: unknown): string {
    return JSON.stringify(sortKeys(value));
}

//genera el par de llaves del gerente (Ed25519): la privada en PEM, que solo se guarda en su equipo,
//y la publica en base64, que va dentro de la extension para validar las firmas
export function generateManagerKeyPair(): { privateKeyPem: string; publicKeyBase64: string } {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    return {
        privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
        publicKeyBase64: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
    };
}

//saca la llave publica a partir de la privada, sirve para comprobar que la llave de este equipo es la que usa la extension
export function derivePublicKey(privateKeyPem: string): string {
    const publicKey = crypto.createPublicKey(crypto.createPrivateKey(privateKeyPem));
    return publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
}

//firma el contenido de la configuracion, regresa la firma en base64
export function signConfig(content: unknown, privateKeyPem: string): string {
    const data = Buffer.from(canonicalize(content), 'utf8');
    return crypto.sign(null, data, crypto.createPrivateKey(privateKeyPem)).toString('base64');
}

//revisa que la firma corresponda al contenido y a la llave publica, cualquier error se toma como firma invalida
export function verifyConfig(content: unknown, signature: unknown, publicKeyBase64: string): boolean {
    if (typeof signature !== 'string') { return false; }
    try {
        const publicKey = crypto.createPublicKey({ key: Buffer.from(publicKeyBase64, 'base64'), format: 'der', type: 'spki' });
        return crypto.verify(null, Buffer.from(canonicalize(content), 'utf8'), publicKey, Buffer.from(signature, 'base64'));
    } catch {
        return false;
    }
}

//arma el texto de code-advisor.config.json: el contenido con las llaves ordenadas y al final la firma
export function buildSignedConfigText(content: Record<string, unknown>, privateKeyPem: string): string {
    const signed = { ...(sortKeys(content) as Record<string, unknown>), signature: signConfig(content, privateKeyPem) };
    return JSON.stringify(signed, null, 2) + '\n';
}

//separa la firma del resto del archivo, regresa undefined si el archivo no es un objeto JSON
export function splitSignedConfig(parsed: unknown): { content: Record<string, unknown>; signature: unknown } | undefined {
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) { return undefined; }
    const { signature, ...content } = parsed as Record<string, unknown>;
    return { content, signature };
}
