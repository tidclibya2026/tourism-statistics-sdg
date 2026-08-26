import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getTourSteps, roleHelpLabels, type HelpRole } from "@/lib/helpContent";
import { ArrowLeft, ArrowRight, Compass, X } from "lucide-react";
import { useEffect, useState } from "react";

const storageKey = (role: HelpRole) => `tourism-onboarding-v1-${role}`;
const progressKey = (role: HelpRole) => `${storageKey(role)}-progress`;

export function OnboardingTour({ role, open, onOpenChange }: { role: HelpRole; open: boolean; onOpenChange: (open: boolean) => void }) {
  const steps = getTourSteps(role);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!open) return;
    const savedStep = Number(localStorage.getItem(progressKey(role)) ?? "0");
    setStep(Number.isInteger(savedStep) && savedStep >= 0 && savedStep < steps.length ? savedStep : 0);
  }, [open, role, steps.length]);
  useEffect(() => { localStorage.setItem(progressKey(role), String(step)); }, [role, step]);
  const finish = () => { localStorage.setItem(storageKey(role), "completed"); localStorage.removeItem(progressKey(role)); onOpenChange(false); };
  const current = steps[step];
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent dir="rtl" className="max-w-lg border-[#bfd8d0] bg-[#fbfdfc] p-0 text-right shadow-2xl"><div className="bg-[linear-gradient(135deg,#0f5c58,#174943)] p-6 text-white"><div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><Compass className="h-6 w-6" /></span><button onClick={() => onOpenChange(false)} aria-label="إغلاق الجولة" className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button></div><p className="mt-5 text-xs font-bold tracking-[.12em] text-amber-200">جولة تعريفية مخصصة</p><DialogTitle className="mt-2 text-xl text-white">{roleHelpLabels[role]}</DialogTitle><DialogDescription className="mt-2 text-sm leading-6 text-teal-50/85">الخطوة {step + 1} من {steps.length}</DialogDescription></div><DialogHeader className="px-6 pt-6"><DialogTitle className="text-xl text-[#173f3d]">{current.title}</DialogTitle><DialogDescription className="pt-2 text-sm leading-7 text-slate-600">{current.body}</DialogDescription></DialogHeader><div className="mx-6 mt-5 h-1.5 overflow-hidden rounded-full bg-[#e4efeb]"><div className="h-full rounded-full bg-[#c58a3f] transition-all duration-200" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div><DialogFooter className="mt-6 flex-row items-center justify-between gap-2 border-t border-[#e7efec] px-6 py-4 sm:justify-between"><Button variant="ghost" className="text-slate-600" onClick={() => onOpenChange(false)}>لاحقاً</Button><div className="flex gap-2">{step > 0 && <Button variant="outline" className="border-[#b9d7cf] text-[#0f5c58]" onClick={() => setStep((value) => value - 1)}><ArrowRight className="ml-1 h-4 w-4" />السابق</Button>}{step < steps.length - 1 ? <Button className="bg-[#0f5c58] hover:bg-[#0a4845]" onClick={() => setStep((value) => value + 1)}>التالي<ArrowLeft className="mr-1 h-4 w-4" /></Button> : <Button className="bg-[#0f5c58] hover:bg-[#0a4845]" onClick={finish}>إنهاء الجولة</Button>}</div></DialogFooter></DialogContent></Dialog>;
}

export function useOnboardingPrompt(role: HelpRole) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!localStorage.getItem(storageKey(role))) setOpen(true); }, [role]);
  return { open, setOpen };
}
