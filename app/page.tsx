"use client"

import WebcamDetector from "@/components/webcam-detector";
import { useState, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Camera, Film, Cpu, Activity } from "lucide-react"
import {
  DetectionResults,
  type Detection,
  type DetectionHistoryItem,
} from "@/components/detection-results"
import { BoundingBoxCanvas } from "@/components/bounding-box-canvas"

export default function Home() {
  const [history, setHistory] = useState<DetectionHistoryItem[]>([])
  const [activeDetections, setActiveDetections] = useState<Detection[]>([])
  const [activeImage, setActiveImage] = useState<string | null>(null)

  const handleSelectHistory = useCallback((item: DetectionHistoryItem) => {
      setActiveDetections(item.detections)
      setActiveImage(item.imageSrc)
  }, [])
  return (
    <div>
      {/* Main layout */}
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
          {/* Left: Detection tabs */}
          <div className="flex flex-col gap-6">
            <Tabs defaultValue="webcam">
              <TabsList className="bg-muted/50 border border-border p-1 h-auto gap-1">
                <TabsTrigger
                  value="webcam"
                  className="gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground"
                >
                  <Camera className="size-4" />
                  Webcam Detection
                </TabsTrigger>
                <TabsTrigger
                  value="video"
                  className="gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground"
                >
                  <Film className="size-4" />
                  Video Upload
                </TabsTrigger>
              </TabsList>

              <TabsContent value="webcam" className="mt-4">
                <WebcamDetector/>
              </TabsContent>

            </Tabs>

            {/* Active detection visualization (shown below tabs on mobile, inline on xl) */}
            {activeImage && (
              <div className="xl:hidden flex flex-col gap-3">
                <Separator />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Detection Visualization
                </p>
                <div className="rounded-xl overflow-hidden border border-border bg-muted/20">
                  <BoundingBoxCanvas
                    imageSrc={activeImage}
                    detections={activeDetections}
                    width={640}
                    height={480}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: Results panel */}
          <div className="flex flex-col gap-6">
            {/* Detection visualization – only on xl */}
            {activeImage && (
              <div className="hidden xl:flex flex-col gap-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Detection Visualization
                </p>
                <div className="rounded-xl overflow-hidden border border-border bg-muted/20">
                  <BoundingBoxCanvas
                    imageSrc={activeImage}
                    detections={activeDetections}
                    width={380}
                    height={285}
                  />
                </div>
              </div>
            )}

            <DetectionResults
              detections={activeDetections}
              history={history}
              onSelectHistory={handleSelectHistory}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
