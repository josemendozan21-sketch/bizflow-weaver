export type WholesaleBrand = 'magical' | 'sweatspot'
export type PrintType = 'full' | 'basica'

export function buildOrderIdentity(
  brand: WholesaleBrand,
  line: { product: string; type?: string | null; size?: string | null; print_type?: PrintType | null },
  submissionId: string,
  defaultPrintType?: PrintType | null,
) {
  let product = line.product
  if (brand === 'sweatspot' && line.size?.trim()) {
    product = `Termo ${line.size.trim().replace(/^termo\s*/i, '')}`
  } else if (brand === 'magical' && line.type?.trim()) {
    const normalized = line.type.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const type = normalized.startsWith('frio') ? 'Frío'
      : normalized.startsWith('term') || normalized.startsWith('calor') ? 'Térmico' : line.type.trim()
    product = `${product.replace(/\s*\((Frío|Frio|Calor|Térmico|Termico)\)\s*$/i, '')} (${type})`
  }
  return {
    brand,
    product,
    submission_id: submissionId,
    print_type: brand === 'sweatspot' ? line.print_type ?? defaultPrintType ?? 'full' : null,
    production_status: 'pendiente',
  }
}