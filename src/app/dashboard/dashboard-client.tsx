"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, CheckCircle, ArrowRight, RefreshCw } from "lucide-react";

export default function DashboardClient() {
  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Security Overview
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Real-time status of your protected workflows and repositories.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 text-sm justify-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span>Sync</span>
          </Button>
          <Button className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 text-sm justify-center gap-2">
            <span>Trigger Scan</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Repositories</CardTitle>
            <Shield className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">+2 connected this week</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Findings</CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-destructive">3</div>
            <p className="text-xs text-muted-foreground mt-1">Requires immediate action</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">24</div>
            <p className="text-xs text-emerald-500 mt-1">100% compliance rate</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Resolution Time</CardTitle>
            <Shield className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">4.2h</div>
            <p className="text-xs text-muted-foreground mt-1">-1.5h improvement trend</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Insights Box */}
      <Card className="w-full overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">System Health & Scans</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Activity stream mapping recent security flow runs and hook triggers.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto w-full">
          <div className="min-w-[600px] lg:min-w-full space-y-4">
            {/* Embedded overflow protective container for dynamic content updates */}
            <div className="p-4 bg-muted/40 rounded-xl border flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-foreground">main-branch-protection-scan</span>
              </div>
              <span className="text-muted-foreground text-xs">Passed • 22 mins ago</span>
            </div>
            <div className="p-4 bg-muted/40 rounded-xl border flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-destructive" />
                <span className="font-medium text-foreground">auth-service-vulnerability-check</span>
              </div>
              <span className="text-muted-foreground text-xs">Failed • 2 hours ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}