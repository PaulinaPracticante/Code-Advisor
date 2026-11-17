// ------------------------------------------------------------------------------------------------
// ---- HISTORIAL DE VERSIONES DE LOS ESTANDARES --------------------------------------------------
// ------------------------------------------------------------------------------------------------

import { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

export interface StandardsVersion {
    id: number;
    content: Record<string, unknown>;
    createdAt: Date;
}

function toVersion(row: RowDataPacket): StandardsVersion {
    const content = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
    return { id: row.id as number, content, createdAt: row.created_at as Date };
}

//la version vigente es la mas reciente, da null si nunca se ha guardado nada
export async function getCurrentStandards(pool: Pool): Promise<StandardsVersion | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT id, content, created_at FROM standards_config ORDER BY id DESC LIMIT 1'
    );
    return rows.length > 0 ? toVersion(rows[0]) : null;
}

//todas las versiones, de la mas nueva a la mas vieja
export async function listStandardsHistory(pool: Pool, limit: number): Promise<StandardsVersion[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT id, content, created_at FROM standards_config ORDER BY id DESC LIMIT ?',
        [limit]
    );
    return rows.map(toVersion);
}

//agrega una version nueva, nunca pisa ni borra las anteriores
export async function saveStandards(pool: Pool, content: Record<string, unknown>): Promise<StandardsVersion> {
    const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO standards_config (content) VALUES (?)',
        [JSON.stringify(content)]
    );
    const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT id, content, created_at FROM standards_config WHERE id = ?',
        [result.insertId]
    );
    return toVersion(rows[0]);
}
