// --------------------------------------------------------------------------------------------------------
// ---- CONTRASEÑA DEL GERENTE ----------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------

import * as bcrypt from 'bcryptjs';
import { Pool, RowDataPacket } from 'mysql2/promise';
import { HttpError } from './errors';

//null si nadie ha puesto una contraseña
async function getPasswordHash(pool: Pool): Promise<string | null> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT password_hash FROM manager_config WHERE id = 1');
    return rows.length > 0 ? (rows[0].password_hash as string) : null;
}

export async function isProtected(pool: Pool): Promise<boolean> {
    return (await getPasswordHash(pool)) !== null;
}

export async function verifyPassword(pool: Pool, password: string): Promise<boolean> {
    const hash = await getPasswordHash(pool);
    if (hash === null) { return true; }
    return bcrypt.compare(password, hash);
}

//si ya habia contraseña, exige la actual. Si no habia, cualquiera puede ponerla la primera vez
export async function updatePassword(pool: Pool, currentPassword: string | undefined, newPassword: string): Promise<void> {
    const hash = await getPasswordHash(pool);
    if (hash !== null && !(await bcrypt.compare(currentPassword ?? '', hash))) {
        throw new HttpError(401, 'Contraseña actual incorrecta');
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
        'INSERT INTO manager_config (id, password_hash) VALUES (1, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)',
        [newHash]
    );
}