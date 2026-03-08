"use client"

import { WebcamDetector } from "@/components/webcam-detector"
import { useState, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, Film} from "lucide-react"
import {
  DetectionResults,
  type Detection,
  type DetectionHistoryItem,
} from "@/components/detection-results"

export default function Home() {
  const [history, setHistory] = useState<DetectionHistoryItem[]>([])
  const [activeDetections, setActiveDetections] = useState<Detection[]>([])
  const [activeImage, setActiveImage] = useState<string | null>(null)

  const handleSelectHistory = useCallback((item: DetectionHistoryItem) => {
      setActiveDetections(item.detections)
      setActiveImage(item.imageSrc)
  }, [])

  const handleDetectionComplete = useCallback((item: DetectionHistoryItem) => {
    setHistory((prev) => [...prev, item])
    setActiveDetections(item.detections)
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
                <WebcamDetector onDetectionComplete={handleDetectionComplete} />
              </TabsContent>
            </Tabs>


          </div>

          {/* Right: Results panel */}
          <div className="flex flex-col gap-6">
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
