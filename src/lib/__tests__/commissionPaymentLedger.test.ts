import { describe, expect, it } from "vitest";
import { appliedToTarget, ledgerSummary, requireCommissionProof, validateCommissionAllocation, buildCommissionOverview } from "@/lib/commissionSettlement";
import type { Order } from "@/hooks/useOrders";
const payment = {id:"p",advisor_id:"a",amount:100000,pay_period:"2026-10",payment_kind:"historico",reconciliation_status:"partial"};
const allocation = {id:"x",payout_id:"p",settlement_item_id:"i",settlement_id:null,opening_balance_id:null,amount:40000};
describe("conciliación de pagos",()=>{
  it("exige soporte para confirmar",()=>expect(()=>requireCommissionProof(null)).toThrow());
  it("no supera el importe del pago",()=>expect(()=>validateCommissionAllocation(30000,100000,40000)).toThrow());
  it("no supera el saldo de la comisión",()=>expect(()=>validateCommissionAllocation(100000,30000,40000)).toThrow());
  it("un pago parcial conserva el remanente",()=>expect(ledgerSummary([payment],[allocation])).toEqual({applied:40000,unassigned:60000,historical:40000}));
  it("un pago pendiente sin asignaciones no descuenta",()=>expect(ledgerSummary([{...payment,reconciliation_status:"pending"}],[]).applied).toBe(0));
  it("un histórico sin revisión no se aplica automáticamente",()=>expect(ledgerSummary([{...payment,reconciliation_status:"legacy_unreviewed"}],[allocation]).applied).toBe(0));
  it("el reverso devuelve solo lo aplicado",()=>expect(appliedToTarget([{...payment,reconciliation_status:"reversed"}],[allocation],"item","i")).toBe(0));
  it("un pago completamente aplicado no queda disponible",()=>{
    const o = {id:"o",advisor_id:"a",advisor_name:"Asesor",brand:"magical",sale_type:"mayor",total_amount:1190000,abono:1190000,payment_complete:true,payment_proof_url:"proof",created_at:"2026-10-01",dispatched_at:"2026-10-02",production_status:"despachado"} as Order;
    const r=buildCommissionOverview({orders:[o],payments:{},advisorId:"a",period:"2026-10",settlements:[{id:"s",advisor_id:"a",status:"pago_registrado"}],items:[{id:"i",settlement_id:"s",order_id:"o",amount:100000}],payouts:[{...payment,reconciliation_status:"reconciled"}],allocations:[{...allocation,amount:100000}]});
    expect(r.rows[0].status).toBe("pagada");expect(r.rows[0].commissionRemaining).toBe(0);expect(r.cards.disponibles).toBe(0);
  });
  it("las cifras pagadas corresponden al período seleccionado",()=>{
    const r=buildCommissionOverview({orders:[],payments:{},advisorId:"a",period:"2026-11",settlements:[],items:[],payouts:[payment],allocations:[allocation]});expect(r.cards.pagadas).toBe(0);
  });
});