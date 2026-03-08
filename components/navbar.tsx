"use client"

import { useCallback, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Camera, Film, Cpu, Activity } from "lucide-react"
import {
  DetectionResults,
  type Detection,
  type DetectionHistoryItem,
} from "@/components/detection-results"

export default function Navbar() {
    const [history, setHistory] = useState<DetectionHistoryItem[]>([])
    const [activeDetections, setActiveDetections] = useState<Detection[]>([])
    const [activeImage, setActiveImage] = useState<string | null>(null)

    const handleSelectHistory = useCallback((item: DetectionHistoryItem) => {
        setActiveDetections(item.detections)
        setActiveImage(item.imageSrc)
    }, [])
    return(
        <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Cpu className="size-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground leading-tight text-balance">
                Student Uniform Detection
              </h1>
              <p className="text-[11px] text-muted-foreground leading-tight hidden sm:block">
                AI system for checking university uniform compliance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="gap-1.5 text-xs border border-border"
            >
              <Activity className="size-3 text-primary" />
              YOLO API
            </Badge>
            <Badge variant="secondary" className="text-xs border border-border hidden sm:flex">
              {history.length} scans
            </Badge>
          </div>
        </div>
      </header>
    );
}