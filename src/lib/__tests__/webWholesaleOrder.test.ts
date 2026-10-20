import { describe, expect, it, vi } from 'vitest';
import { buildOrderIdentity } from '../../../supabase/functions/receive-bionovations-wholesale-order/orderIdentity';
import { buildStages } from '../orderFlow';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

describe('Bionovations wholesale identity', () => {
  it('accepts Sweat Spot with the normal pending production flow', () => {
    expect(buildOrderIdentity('sweatspot', { product: 'Termo', size: '500 ml', print_type: 'basica' }, 'group')).toEqual({
      brand: 'sweatspot', product: 'Termo 500 ml', print_type: 'basica', submission_id: 'group', production_status: 'pendiente',
    });
  });
  it('stores full print mode and supports an order-level default', () => {
    expect(buildOrderIdentity('sweatspot', { product: 'Termo' }, 'group').print_type).toBe('full');
    expect(buildOrderIdentity('sweatspot', { product: 'Termo' }, 'group', 'basica').print_type).toBe('basica');
  });
  it('preserves Magical type without duplicating its suffix', () => {
    expect(buildOrderIdentity('magical', { product: 'Antifaz (Frío)', type: 'Frio' }, 'group').product).toBe('Antifaz (Frío)');
  });
  it('groups multiple lines without assigning generated order_code', () => {
    const rows = ['250 ml', '500 ml'].map(size => buildOrderIdentity('sweatspot', { product: 'Termo', size }, 'same-group'));
    expect(rows.map(row => row.submission_id)).toEqual(['same-group', 'same-group']);
    expect(rows.every(row => !Object.prototype.hasOwnProperty.call(row, 'order_code'))).toBe(true);
  });
  it('keeps all six thermo manufacturing phases in the Sweat Spot flow', () => {
    expect(buildStages('sweatspot', { hasLogo: true, needsCuerpos: true, product: 'Termo 500 ml' })).toEqual([
      'estampacion', 'produccion_tubos', 'elaboracion_esquinas', 'ensamble_cuello', 'sello_base', 'refile', 'colocacion_boquilla', 'listo',
    ]);
  });
});