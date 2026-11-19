/**
 * El servidor devuelve como máximo 1000 filas por consulta, aunque se pida un
 * rango mayor. Este ayudante pide página por página hasta traer todo.
 * La consulta debe tener un orden estable (p. ej. terminar en .order("id")).
 */
export const PAGE_SIZE = 1000;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PageResult<T>,
  pageSize = PAGE_SIZE,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) return out;
  }
}
