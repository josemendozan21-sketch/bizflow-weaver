import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createCatalogHandler, type CatalogStock } from './catalog.ts'

Deno.serve(createCatalogHandler({
  token: Deno.env.get('BIONOVATIONS_WEBHOOK_TOKEN') ?? '',
  headers: { ...corsHeaders, 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
  readStock: async () => {
    const sb = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: { persistSession: false },
    })
    const items: CatalogStock[] = []
    // Paginate without filtering quantities: include references with zero stock.
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await sb.from('stock_items')
        .select('name, brand, category, product_type')
        .order('id').range(offset, offset + 999)
      if (error) throw error
      items.push(...(data ?? []))
      if (!data || data.length < 1000) break
    }
    return items
  },
}))