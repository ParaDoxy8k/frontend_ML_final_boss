"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Scan,
} from "lucide-react"

export interface Detection {
  class: string
  confidence: number
  box: number[]
}

export interface DetectionHistoryItem {
  id: string
  timestamp: Date
  detections: Detection[]
  imageSrc: string
  source: "webcam" | "video"
}

interface DetectionResultsProps {
  detections: Detection[]
  history: DetectionHistoryItem[]
  onSelectHistory?: (item: DetectionHistoryItem) => void
}

const REQUIRED_ITEMS = ["Belt", "Necktie", "Shoes"]
const VIOLATION_CLASSES = ["Missing_Necktie", "Missing_shoes", "Belt_Missing"]

const CLASS_COLOR_MAP: Record<string, string> = {
  Belt: "text-cyan-400",
  Necktie: "text-violet-400",
  Shoes: "text-emerald-400",
  Missing_Necktie: "text-red-400",
  Missing_shoes: "text-orange-400",
  Belt_Missing: "text-rose-400",
}

function getClassBadgeVariant(cls: string): "default" | "destructive" | "secondary" {
  if (VIOLATION_CLASSES.includes(cls)) return "destructive"
  if (REQUIRED_ITEMS.includes(cls)) return "default"
  return "secondary"
}

function isCompliant(detections: Detection[]): boolean {
  const detected = new Set(detections.map((d) => d.class))
  const hasAllRequired = REQUIRED_ITEMS.every((item) => detected.has(item))
  const hasNoViolation = !VIOLATION_CLASSES.some((v) => detected.has(v))
  return hasAllRequired && hasNoViolation
}

export function DetectionResults({
  detections,
  history,
  onSelectHistory,
}: DetectionResultsProps) {
  const compliant = isCompliant(detections)
  const hasDetections = detections.length > 0

  return (
    <div className="flex flex-col gap-4">
      {/* Uniform Status */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Scan className="size-4" />
            Uniform Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasDetections ? (
            <Alert
              className={
                compliant
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-red-500/40 bg-red-500/10"
              }
            >
              <div className="flex items-center gap-3">
                {compliant ? (
                  <ShieldCheck className="size-6 text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert className="size-6 text-red-400 shrink-0" />
                )}
                <AlertDescription className="flex flex-col gap-0.5">
                  <span
                    className={`text-base font-semibold ${
                      compliant ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {compliant ? "Uniform Correct" : "Uniform Violation"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {compliant
                      ? "All required items detected"
                      : "One or more uniform violations found"}
                  </span>
                </AlertDescription>
              </div>
            </Alert>
          ) : (
            <div className="flex items-center gap-3 py-3 text-muted-foreground">
              <ShieldCheck className="size-5 opacity-30" />
              <span className="text-sm">No detection yet — capture a frame to analyze</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Required Items Checklist */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Required Items
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {REQUIRED_ITEMS.map((item) => {
            const det = detections.find((d) => d.class === item)
            const found = !!det
            return (
              <div key={item} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {found ? (
                    <CheckCircle2 className="size-4 text-emerald-400" />
                  ) : (
                    <XCircle className="size-4 text-muted-foreground opacity-40" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      found ? CLASS_COLOR_MAP[item] ?? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {item}
                  </span>
                </div>
                {found && det ? (
                  <div className="flex items-center gap-2 min-w-22.5">
                    <Progress
                      value={det.confidence * 100}
                      className="h-1.5 w-14 bg-muted"
                    />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {(det.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground opacity-40">—</span>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* All Detections */}
      {hasDetections && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Detected Objects
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {detections.map((det, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Badge variant={getClassBadgeVariant(det.class)} className="text-xs">
                    {det.class}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Progress
                    value={det.confidence * 100}
                    className="h-1.5 w-16 bg-muted"
                  />
                  <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                    {(det.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Detection History */}
      {history.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Clock className="size-4" />
              History
              <Badge variant="secondary" className="ml-auto text-xs">
                {history.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1">
            {[...history].reverse().map((item, idx) => {
              const ok = isCompliant(item.detections)
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectHistory?.(item)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted/60 transition-colors group"
                >
                  {/* thumbnail */}
                  <div className="size-10 rounded-md overflow-hidden shrink-0 bg-muted border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageSrc}
                      alt="capture"
                      className="size-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-medium ${
                          ok ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {ok ? "Correct" : "Violation"}
                      </span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {item.source}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {item.timestamp.toLocaleTimeString()} &middot;{" "}
                      {item.detections.length} object{item.detections.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Separator orientation="vertical" className="h-8 opacity-0 group-hover:opacity-0" />
                </button>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
