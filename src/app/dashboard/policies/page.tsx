import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Lock, AlertCircle, ShieldCheck, Terminal } from "lucide-react";
// ADD THESE TOOLTIP IMPORTS:
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArmorIQService } from "@/lib/armor/iq";

// --- Server Actions ---

async function togglePolicy(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) return;

  const templateId = formData.get("templateId") as string;
  const currentState = formData.get("currentState") === "true";

  // Upsert ensures we either create the toggle record if it doesn't exist, 
  // or update the existing one.
  await prisma.userPolicyToggle.upsert({
    where: {
      userId_policyTemplateId: {
        userId: session.user.id,
        policyTemplateId: templateId,
      }
    },
    update: { isActive: !currentState },
    create: {
      userId: session.user.id,
      policyTemplateId: templateId,
      isActive: !currentState,
    }
  });

  revalidatePath("/dashboard/policies");
}

// --- Page Component ---

export default async function PoliciesPage() {
  const session = await auth();
  
  if (!session?.user?.id || !session?.user?.email) {
    redirect("/api/auth/signin");
  }
  
  const userId = session.user.id;
  const userEmail = session.user.email;

  // 1. Fetch ALL global Policy Templates
  const templates = await prisma.policyTemplate.findMany({
    orderBy: { createdAt: 'desc' }
  });

  // 2. Fetch the current user's specific toggle settings
  const userToggles = await prisma.userPolicyToggle.findMany({
    where: { userId }
  });

  // 3. Map user toggles for fast O(1) lookup
  const toggleMap = new Map(userToggles.map(t => [t.policyTemplateId, t.isActive]));

  // 4. Merge templates with user preferences
  const policiesToRender = templates.map(template => {
    // If user hasn't interacted with it yet, fall back to template's default state
    const isActive = toggleMap.has(template.id) 
      ? toggleMap.get(template.id) 
      : template.isDefault;
      
    return { ...template, isActive };
  });

  // 5. ArmorIQ SDK Integration (Only pass the ACTIVE ones)
  const armoriqClient = ArmorIQService.getClient();
  const userScope = armoriqClient.forUser(userEmail); 
  const activePolicies = policiesToRender.filter(p => p.isActive);
  const compiledPolicy = ArmorIQService.compileToArmorIQPolicy(activePolicies);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight mb-2">ArmorIQ Policies</h1>
          <p className="text-muted-foreground">Toggle automated guardrails used to protect your main branch.</p>
        </div>
      </div>

      {/* ArmorIQ SDK Integration Preview */}
      <Card className="glass-card bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">ArmorIQ Programmatic Policy</CardTitle>
          </div>
          <CardDescription>
            Your active rules below are compiled dynamically into this execution guardrail for the agent scope: <strong className="text-white">{userEmail}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs p-4 bg-black/50 rounded-lg border border-white/10 text-muted-foreground overflow-x-auto">
            {JSON.stringify(compiledPolicy, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* Policy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {policiesToRender.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground p-8 border border-dashed border-white/10 rounded-xl">
            No policy templates available. (Administrators need to seed the database).
          </div>
        )}
        
        {policiesToRender.map((policy) => {
          // Parse conditions safely from JSON
          const rulesMeta = (policy.rules as any) || {};
          const conditions = Array.isArray(rulesMeta) ? rulesMeta : rulesMeta.conditions || [];
          
          return (
            <PolicyCard 
              key={policy.id}
              id={policy.id}
              title={policy.name}
              description={policy.description}
              isActive={policy.isActive}
              severity={policy.severity}
              action={policy.action}
              rules={conditions}
            />
          );
        })}
      </div>
    </div>
  );
}

function PolicyCard({ id, title, description, isActive, severity, action, rules }: any) {
  return (
    <Card className={`glass-card relative overflow-hidden flex flex-col transition-all duration-300 ${isActive ? 'border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.1)]' : 'opacity-60 border-white/5'}`}>
      <div className="absolute top-0 right-0 p-5 z-10">
        <form action={togglePolicy}>
          <input type="hidden" name="templateId" value={id} />
          <input type="hidden" name="currentState" value={String(isActive)} />
          <button type="submit" className="hover:opacity-80 transition-opacity">
             <Switch checked={isActive} className="pointer-events-none" aria-readonly />
          </button>
        </form>
      </div>
      
      <CardHeader className="pt-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            <Lock className="w-4 h-4" />
          </div>
          <Badge variant="outline" className={`text-[10px] tracking-widest ${isActive ? 'border-primary/50 text-primary' : ''}`}>
            {action}
          </Badge>
        </div>
        
        {/* --- NEW TOOLTIP WRAPPER --- */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <CardTitle className="text-lg pr-12">{title}</CardTitle>
            </TooltipTrigger>
            <TooltipContent 
              side="bottom" 
              align="start" 
              className="max-w-xs md:max-w-sm glass-card bg-black/90 border-white/10 text-slate-200 z-50 p-3"
            >
              <p className="text-xs leading-relaxed">{description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>        
      </CardHeader>
      
      <CardContent className="space-y-4 flex-1">
        <div className="space-y-2">
          {rules.length > 0 ? rules.slice(0, 3).map((rule: string, i: number) => (
            <div key={i} className="flex items-start gap-3 text-xs text-muted-foreground p-2.5 bg-white/5 border border-white/5 rounded-md">
              <ShieldCheck className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="font-mono text-[10px] truncate">{rule}</span>
            </div>
          )) : (
            <div className="text-xs text-muted-foreground italic p-2">Standard protection enabled.</div>
          )}
          {rules.length > 3 && (
             <div className="text-[10px] text-muted-foreground pl-2 italic">
               + {rules.length - 3} more condition{rules.length - 3 > 1 ? 's' : ''}
             </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-4 flex items-center justify-between border-t border-white/5 text-[10px] font-bold uppercase text-muted-foreground mt-auto bg-black/10">
        <div className="flex items-center gap-1.5">
          <AlertCircle className={`w-3 h-3 ${severity === 'CRITICAL' && isActive ? 'text-red-400' : ''}`} /> 
          {severity}
        </div>
      </CardFooter>
    </Card>
  );
}