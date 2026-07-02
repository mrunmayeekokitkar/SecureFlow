"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, Edit3 } from "lucide-react";

interface PolicyCardProps {
  title?: string;
  description?: string;
  status?: "ACTIVE" | "DISABLED";
  scope?: string;
}

export default function PolicyCard({
  title = "Branch Protection Rules",
  description = "Enforces linear history requirements and signed commit validations across designated targets.",
  status = "ACTIVE",
  scope = "All Repositories"
}: PolicyCardProps) {
  return (
    <Card className="flex flex-col justify-between w-full min-h-[220px] shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md duration-200">
      <CardHeader className="space-y-1.5 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground line-clamp-1">
            {title}
          </CardTitle>
          <Badge 
            className={`text-xs px-2 py-0.5 rounded-full select-none ${
              status === "ACTIVE" 
                ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10" 
                : "bg-muted text-muted-foreground"
            }`}
          >
            {status}
          </Badge>
        </div>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground line-clamp-3 pt-1">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-4 pb-3 sm:px-6 sm:pb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          {status === "ACTIVE" ? (
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="truncate">Scope: {scope}</span>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 sm:p-6 sm:pt-0 mt-auto border-t bg-muted/10 flex justify-end">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full sm:w-auto min-h-[40px] px-4 py-2 mt-2 sm:mt-0 text-xs sm:text-sm font-medium flex items-center justify-center gap-2"
        >
          <Edit3 className="h-3.5 w-3.5" />
          <span>Edit Configuration</span>
        </Button>
      </CardFooter>
    </Card>
  );
}