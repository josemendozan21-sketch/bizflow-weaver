import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useSettlementActions, useSettlementData, type Payout } from "@/hooks/useCommissionSettlements";
import { appliedToTarget, ledgerSummary, SYSTEM_WEB_ADVISOR_IDS, validateCommissionAllocation } from "@/lib/commissionSettlement";
import { parseMoneyInput } from "@/lib/money";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Plus, RotateCcw } from "lucide-react";

const money = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;
const states: Record<string,string> = {legacy_unreviewed:"Histórico por revisar",pending:"Pendiente de conciliación",partial:"Conciliado parcialmente",reconciled:"Conciliado",reversed:"Anulado"};
interface Props { advisors:{id:string;name:string}[]; advisorId?:string; period:string; editable:boolean }
export function CommissionPayments({advisors,advisorId,period,editable}:Props) {
  const {data} = useSettlementData();
  const actions = useSettlementActions();
  const {toast} = useToast();
  const [open,setOpen] = useState(false);
  const [selected,setSelected] = useState<Payout|null>(null);
  const [aid,setAid] = useState(advisorId||"");
  const [kind,setKind] = useState("actual");
  const [amount,setAmount] = useState("");
  const [paidAt,setPaidAt] = useState(new Date().toISOString().slice(0,10));
  const [payPeriod,setPayPeriod] = useState(period);
  const [reference,setReference] = useState("");
  const [note,setNote] = useState("");
  const [file,setFile] = useState<File|null>(null);
  const [values,setValues] = useState<Record<string,string>>({});
  const [requestKey,setRequestKey] = useState("");
  const [reverse,setReverse] = useState<Payout|null>(null);
  const [reverseNote,setReverseNote] = useState("");
  const [opening,setOpening] = useState(false);
  const [openingAmount,setOpeningAmount] = useState("");
  const [openingApply,setOpeningApply] = useState("");
  const [openingNote,setOpeningNote] = useState("");
  const payouts = (data?.payouts||[]).filter(p=>!advisorId||p.advisor_id===advisorId);
  const allocations = data?.allocations||[];
  const summary = ledgerSummary(payouts,allocations);
  const candidates = useMemo(()=>{
    if(!data) return [];
    const settlements = data.settlements.filter(s=>s.advisor_id===aid && s.approved_at && s.status!=="en_revision");
    const out:{id:string;kind:"item"|"extra"|"opening";label:string;period:string;total:number;paid:number;remaining:number}[]=[];
    for(const s of settlements) {
      for(const i of data.items.filter(i=>i.settlement_id===s.id)) {
        const paid=appliedToTarget(data.payouts,allocations,"item",i.id);
        out.push({id:i.id,kind:"item",label:`${i.order_code||i.order_id.slice(0,8)} · ${i.client_name||""}`,period:s.pay_period,total:Number(i.amount),paid,remaining:Math.max(Number(i.amount)-paid,0)});
      }
      const total=Math.max(Number(s.bonus_amount)+Number(s.adjustment_amount),0);
      if(total>0) {const paid=appliedToTarget(data.payouts,allocations,"extra",s.id);out.push({id:s.id,kind:"extra",label:"Bono y ajustes de liquidación",period:s.pay_period,total,paid,remaining:Math.max(total-paid,0)});}
    }
    for(const b of data.openings.filter(b=>b.advisor_id===aid)) {
      const paid=appliedToTarget(data.payouts,allocations,"opening",b.id);
      out.push({id:b.id,kind:"opening",label:`Saldo inicial · ${b.note}`,period:b.pay_period,total:Number(b.amount),paid,remaining:Math.max(Number(b.amount)-paid,0)});
    }
    return out;
  },[data,aid,allocations]);
  function start(p:Payout|null) {
    setSelected(p);setAid(p?.advisor_id||advisorId||"");setKind(p?.payment_kind||"actual");
    setAmount(p?String(p.amount):"");setPaidAt(p?.paid_at||new Date().toISOString().slice(0,10));
    setPayPeriod(p?.pay_period||period);setReference(p?.reference||"");setNote("");setFile(null);
    setValues({});setOpening(false);setOpeningAmount("");setOpeningApply("");setOpeningNote("");setRequestKey(crypto.randomUUID());setOpen(true);
  }
  async function save() {
    try {
      const total=selected?Number(selected.amount):parseMoneyInput(amount);
      if(!aid||!Number.isFinite(total)||total<=0) throw new Error("Selecciona el asesor e ingresa un importe válido");
      if(!selected?.proof_url&&!file) throw new Error("Adjunta el comprobante para confirmar");
      let remaining=total-(selected?ledgerSummary([selected],allocations).applied:0);
      const assigned=[];
      for(const c of candidates) {
        if(!values[c.id]?.trim()) continue;
        const value=parseMoneyInput(values[c.id]);
        validateCommissionAllocation(remaining,c.remaining,value);remaining-=value;
        assigned.push({kind:c.kind,id:c.id,amount:value});
      }
      const payload:Record<string,unknown> = {operation:selected?"reconcile":"register",payout_id:selected?.id,advisor_id:aid,payment_kind:kind,amount:total,paid_at:paidAt,pay_period:payPeriod,reference,note,request_key:requestKey,allocations:assigned};
      if(opening) {
        const target=parseMoneyInput(openingAmount),value=parseMoneyInput(openingApply);
        validateCommissionAllocation(remaining,target,value);
        if(!openingNote.trim()) throw new Error("Documenta el origen del saldo inicial");
        payload.opening_balance={amount:target,apply_amount:value,pay_period:payPeriod,note:openingNote};
      }
      await actions.managePayment.mutateAsync({payload,file});setOpen(false);
      toast({title:"Pago guardado y conciliación actualizada"});
    } catch(e) {toast({title:"No se pudo guardar",description:e instanceof Error?e.message:String(e),variant:"destructive"});}
  }
  async function showProof(p:Payout) {
    if(!p.proof_url) return;
    const {data,error}=await supabase.storage.from("payment-proofs").createSignedUrl(p.proof_url,60);
    if(error) return toast({title:"No se pudo abrir el comprobante",description:error.message,variant:"destructive"});
    window.open(data.signedUrl,"_blank","noopener,noreferrer");
  }
  async function exportHistory() {
    const XLSX=await import("xlsx"); const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(payouts.map(p=>({Asesor:advisors.find(a=>a.id===p.advisor_id)?.name||p.advisor_id,Fecha:p.paid_at,Periodo:p.pay_period,Importe:Number(p.amount),Aplicado:ledgerSummary([p],allocations).applied,"Sin conciliar":ledgerSummary([p],allocations).unassigned,Estado:states[p.reconciliation_status]||"Por revisar",Referencia:p.reference||""}))),"Pagos");
    XLSX.writeFile(wb,"pagos_comisiones.xlsx");
  }
  const busy=actions.managePayment.isPending;
  return <section className="min-w-0 space-y-3 border-t pt-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold">Pagos y conciliación</h3>
      <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={exportHistory}><Download className="h-4 w-4 mr-2"/>Excel de pagos</Button>
      {editable&&<Button size="sm" onClick={()=>start(null)}><Plus className="h-4 w-4 mr-2"/>Registrar pago de comisiones</Button>}</div>
    </div>
    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
      <div><dt className="text-muted-foreground">Pagos aplicados</dt><dd className="font-semibold">{money(summary.applied)}</dd></div>
      <div><dt className="text-muted-foreground">Históricos aplicados</dt><dd className="font-semibold">{money(summary.historical)}</dd></div>
      <div><dt className="text-muted-foreground">Pendientes de conciliación</dt><dd className="font-semibold">{money(summary.unassigned)}</dd></div>
    </dl>
    <div className="min-w-0 max-w-full overflow-x-auto border rounded-md"><Table><TableHeader><TableRow><TableHead>Asesor / fecha</TableHead><TableHead>Período</TableHead><TableHead className="text-right">Transferencia</TableHead><TableHead className="text-right">Aplicado</TableHead><TableHead>Estado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader><TableBody>
      {payouts.length===0&&<TableRow><TableCell colSpan={6} className="text-muted-foreground text-center">Sin pagos registrados.</TableCell></TableRow>}
      {payouts.map(p=><TableRow key={p.id}><TableCell><p>{advisors.find(a=>a.id===p.advisor_id)?.name||"Asesor"}</p><p className="text-xs text-muted-foreground whitespace-nowrap">{p.paid_at}</p></TableCell><TableCell>{p.pay_period}</TableCell><TableCell className="text-right whitespace-nowrap">{money(Number(p.amount))}</TableCell><TableCell className="text-right whitespace-nowrap">{money(ledgerSummary([p],allocations).applied)}</TableCell><TableCell><Badge variant={p.reconciliation_status==="reconciled"?"default":"outline"}>{states[p.reconciliation_status]||"Por revisar"}</Badge>{!p.proof_url&&<p className="text-xs text-muted-foreground">Sin comprobante</p>}</TableCell><TableCell><div className="flex gap-2">
        {p.proof_url&&<Button size="icon" variant="ghost" aria-label="Abrir comprobante" title="Abrir comprobante" onClick={()=>showProof(p)}><FileText className="h-4 w-4"/></Button>}
        {editable&&p.reconciliation_status!=="reversed"&&<><Button size="sm" variant="outline" onClick={()=>start(p)}>Conciliar</Button><Button size="icon" variant="ghost" aria-label="Anular pago" title="Anular pago" onClick={()=>{setReverse(p);setReverseNote("");}}><RotateCcw className="h-4 w-4"/></Button></>}
      </div></TableCell></TableRow>)}
    </TableBody></Table></div>
    <details><summary className="cursor-pointer text-sm text-muted-foreground">Historial de movimientos</summary><div className="mt-2 space-y-2">{(data?.paymentAudit||[]).filter(a=>payouts.some(p=>p.id===a.payout_id)).map(a=><p key={a.id} className="text-xs">{new Date(a.created_at).toLocaleString("es-CO")} · {a.action} · {a.actor_name||"Usuario registrado"}{a.note?` · ${a.note}`:""}</p>)}</div></details>
    <Dialog open={open} onOpenChange={v=>{if(!busy)setOpen(v);}}><DialogContent className="max-w-3xl max-h-[85dvh] overflow-y-auto min-w-0"><DialogHeader><DialogTitle>{selected?"Conciliar pago registrado":"Registrar pago de comisiones"}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><Label>Asesor comercial</Label><Select disabled={!!selected} value={aid} onValueChange={v=>{setAid(v);setValues({});}}><SelectTrigger aria-label="Asesor del pago"><SelectValue placeholder="Selecciona asesor"/></SelectTrigger><SelectContent>{advisors.filter(a=>!SYSTEM_WEB_ADVISOR_IDS.has(a.id)).map(a=><SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Tipo</Label><Select disabled={!!selected} value={kind} onValueChange={setKind}><SelectTrigger aria-label="Tipo del pago"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="actual">Liquidación actual</SelectItem><SelectItem value="historico">Pago histórico</SelectItem></SelectContent></Select></div>
        <div><Label htmlFor="commission-amount">Importe pagado COP</Label><Input id="commission-amount" inputMode="decimal" disabled={!!selected} value={amount} onChange={e=>setAmount(e.target.value)}/></div>
        <div><Label htmlFor="commission-date">Fecha real del pago</Label><Input id="commission-date" type="date" value={paidAt} onChange={e=>setPaidAt(e.target.value)}/></div>
        <div><Label htmlFor="commission-period">Período correspondiente</Label><Input id="commission-period" type="month" value={payPeriod} onChange={e=>setPayPeriod(e.target.value)}/></div>
        <div><Label htmlFor="commission-reference">Referencia bancaria</Label><Input id="commission-reference" value={reference} onChange={e=>setReference(e.target.value)}/></div>
        <div className="sm:col-span-2"><Label htmlFor="commission-proof">Comprobante de transferencia (obligatorio)</Label><Input id="commission-proof" type="file" accept="image/*,application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/>{selected?.proof_url&&<p className="text-xs text-muted-foreground">Comprobante ya adjunto; puedes conservarlo.</p>}</div>
        <div className="sm:col-span-2"><Label htmlFor="commission-note">Observaciones / evidencia de revisión</Label><Textarea id="commission-note" value={note} onChange={e=>setNote(e.target.value)}/></div>
      </div>
      <h4 className="font-medium text-sm">Aplicar a comisiones aprobadas</h4>
      <div className="min-w-0 overflow-x-auto border rounded-md"><Table><TableHeader><TableRow><TableHead>Pedido / concepto</TableHead><TableHead>Período</TableHead><TableHead>Comisión</TableHead><TableHead>Ya pagado</TableHead><TableHead>Pendiente</TableHead><TableHead>Aplicar COP</TableHead></TableRow></TableHeader><TableBody>{candidates.map(c=><TableRow key={c.id}><TableCell className="min-w-40">{c.label}</TableCell><TableCell>{c.period}</TableCell><TableCell className="whitespace-nowrap">{money(c.total)}</TableCell><TableCell>{money(c.paid)}</TableCell><TableCell>{money(c.remaining)}</TableCell><TableCell><Input aria-label={`Aplicar a ${c.label}`} className="w-28" inputMode="decimal" disabled={c.remaining<=0} value={values[c.id]||""} onChange={e=>setValues({...values,[c.id]:e.target.value})}/></TableCell></TableRow>)}{!candidates.length&&<TableRow><TableCell colSpan={6} className="text-muted-foreground">Sin comisiones aprobadas para asignar. El pago quedará pendiente de conciliación.</TableCell></TableRow>}</TableBody></Table></div>
      {kind==="historico"&&<div className="space-y-2"><Button variant="outline" size="sm" onClick={()=>setOpening(!opening)}>{opening?"Cancelar saldo inicial":"Conciliar con saldo inicial documentado"}</Button>{opening&&<div className="grid gap-2 sm:grid-cols-2"><div><Label>Saldo inicial COP</Label><Input aria-label="Saldo inicial COP" value={openingAmount} onChange={e=>setOpeningAmount(e.target.value)}/></div><div><Label>Importe a aplicar COP</Label><Input aria-label="Importe a aplicar al saldo inicial" value={openingApply} onChange={e=>setOpeningApply(e.target.value)}/></div><div className="sm:col-span-2"><Label>Evidencia y origen del saldo</Label><Textarea value={openingNote} onChange={e=>setOpeningNote(e.target.value)}/></div></div>}</div>}
      <DialogFooter><Button variant="outline" disabled={busy} onClick={()=>setOpen(false)}>Cancelar</Button><Button disabled={busy} onClick={save}>{busy?"Guardando…":"Confirmar registro"}</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={!!reverse} onOpenChange={v=>{if(!busy&&!v)setReverse(null);}}><DialogContent><DialogHeader><DialogTitle>Anular pago con trazabilidad</DialogTitle></DialogHeader><p className="text-sm">{money(Number(reverse?.amount||0))} · {reverse?.pay_period}</p><Label>Motivo obligatorio</Label><Textarea aria-label="Motivo de anulación" value={reverseNote} onChange={e=>setReverseNote(e.target.value)}/><DialogFooter><Button variant="outline" onClick={()=>setReverse(null)}>Cancelar</Button><Button variant="destructive" disabled={busy||!reverseNote.trim()} onClick={async()=>{if(!reverse)return;try{await actions.managePayment.mutateAsync({payload:{operation:"reverse",payout_id:reverse.id,note:reverseNote}});setReverse(null);toast({title:"Pago anulado; se conservó el historial"});}catch(e){toast({title:"No se pudo anular",description:e instanceof Error?e.message:String(e),variant:"destructive"});}}}>Anular pago</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
