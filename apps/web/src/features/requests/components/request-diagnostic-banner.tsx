import type { DiagnosticResult } from "../diagnostic-engine";
import { Link } from "@tanstack/react-router";

import { ArrowRight, CheckCircle2, Info, TriangleAlert, XCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { connectionDeepLink } from "@/routes/-deep-links";

function ToneIcon({ tone, className }: { readonly tone: DiagnosticResult["tone"]; readonly className?: string }) {
  switch (tone) {
    case "success": return <CheckCircle2 className={className} />;
    case "warning": return <TriangleAlert className={className} />;
    case "danger": return <XCircle className={className} />;
    case "neutral": return <Info className={className} />;
  }
}

export function RequestDiagnosticBanner({ diagnosis }: { readonly diagnosis: DiagnosticResult }) {
  const toneClasses = getToneClasses(diagnosis.tone);

  return (
    <div className={`flex flex-col gap-2 rounded-lg border p-3.5 text-xs leading-relaxed ${toneClasses.container}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <ToneIcon tone={diagnosis.tone} className={`size-4 ${toneClasses.icon}`} />
          <span>{diagnosis.title}</span>
        </div>
        <DiagnosticAction diagnosis={diagnosis} />
      </div>
      <p className="text-muted-foreground">{diagnosis.description}</p>
    </div>
  );
}

function DiagnosticAction({ diagnosis }: { readonly diagnosis: DiagnosticResult }) {
  if (diagnosis.actionText === undefined || diagnosis.actionLink === undefined)
    return null;

  const content = (
    <>
      {diagnosis.actionText}
      <ArrowRight data-icon="inline-end" />
    </>
  );
  const className = buttonVariants({ variant: "outline", size: "xs" });

  if (diagnosis.actionLink === "/connections") {
    return (
      <Link
        {...connectionDeepLink(diagnosis.actionConnectionId)}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return <Link to="/models" className={className}>{content}</Link>;
}

function getToneClasses(tone: DiagnosticResult["tone"]) {
  switch (tone) {
    case "success":
      return {
        container: "border-success/20 bg-success/10 text-foreground",
        icon: "text-success-foreground",
      };
    case "warning":
      return {
        container: "border-warning/20 bg-warning/10 text-foreground",
        icon: "text-warning-foreground",
      };
    case "danger":
      return {
        container: "border-destructive/20 bg-destructive/5 text-foreground",
        icon: "text-destructive",
      };
    case "neutral":
      return {
        container: "border-border bg-muted/40 text-foreground",
        icon: "text-muted-foreground",
      };
  }
}
