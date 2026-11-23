// ----------------------------------------------------------------------------------------------------
// ---- CORRE TAREAS ASINCRONAS EN PARALELO CON UN LIMITE --------------------------------------------
// ----------------------------------------------------------------------------------------------------

// ejecuta "worker" sobre cada elemento con a lo mucho "limit" tareas al mismo tiempo; espera a que todas terminen.
// el worker recibe el indice del elemento, asi quien lo usa puede guardar cada resultado en su lugar y conservar el orden
export async function runWithLimit<T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>): Promise<void> {
    let next = 0;

    const runners = Array.from({ length: Math.min(Math.max(limit, 1), items.length) }, async () => {
        while (next < items.length) {
            const index = next++;
            await worker(items[index], index);
        }
    });

    await Promise.all(runners);
}
