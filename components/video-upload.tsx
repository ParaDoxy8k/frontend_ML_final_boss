"use client"

import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { Upload, Film, Play, X, AlertTriangle } from "lucide-react"
import type { Detection, DetectionHistoryItem } from "@/components/detection-results"

const API_ENDPOINT = "http://localhost:8000/detect-video"

interface VideoUploadProps {
  onDetectionComplete: (item: DetectionHistoryItem) => void
}

export function VideoUpload({ onDetectionComplete }: VideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("video/")) {
      setError("Please upload a valid video file.")
      return
    }
    setError(null)
    setVideoFile(file)
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleClearVideo = useCallback(() => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoFile(null)
    setVideoUrl(null)
    setError(null)
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [videoUrl])

  const captureVideoFrame = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current
      if (!video) return resolve(null)
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      if (!ctx) return resolve(null)
      ctx.drawImage(video, 0, 0)
      resolve(canvas.toDataURL("image/jpeg"))
    })
  }, [])

  const handleAnalyzeVideo = useCallback(async () => {
    if (!videoFile) return
    setLoading(true)
    setError(null)
    setProgress(10)

    try {
      const formData = new FormData()
      formData.append("file", videoFile)
      setProgress(30)

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        body: formData,
      })
      setProgress(80)

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const dets: Detection[] = data.detections ?? []
      setProgress(100)

      // Capture a thumbnail from the video for history
      const thumbnail = await captureVideoFrame()

      onDetectionComplete({
        id: `video-${Date.now()}`,
        timestamp: new Date(),
        detections: dets,
        imageSrc: thumbnail ?? "",
        source: "video",
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect to the detection API. Make sure the backend is running at http://localhost:8000."
      )
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(0), 1500)
    }
  }, [videoFile, captureVideoFrame, onDetectionComplete])

  return (
    <div className="flex flex-col gap-4">
      {/* Drop Zone */}
      {!videoUrl && (
        <button
          type="button"
          className={`relative w-full rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center aspect-video gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            dragOver
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-muted/20 text-muted-foreground hover:border-primary/50 hover:bg-muted/30"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          aria-label="Upload video file"
        >
          <div className="size-16 rounded-2xl bg-muted/60 flex items-center justify-center">
            <Film className="size-8 opacity-50" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Drop a video file here</p>
            <p className="text-xs opacity-60 mt-1">or click to browse — MP4, MOV, AVI, WebM</p>
          </div>
          <div className="flex items-center gap-2 text-xs border border-border/60 rounded-lg px-3 py-1.5">
            <Upload className="size-3.5" />
            Choose File
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="sr-only"
            onChange={handleFileInput}
            aria-hidden="true"
          />
        </button>
      )}

      {/* Video Preview */}
      {videoUrl && (
        <Card className="bg-muted/30 border-border overflow-hidden">
          <CardContent className="p-0 relative group">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full rounded-t-xl"
              style={{ maxHeight: 360 }}
            />
            <button
              onClick={handleClearVideo}
              className="absolute top-2 right-2 size-7 rounded-full bg-background/80 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
              aria-label="Remove video"
            >
              <X className="size-3.5 text-foreground" />
            </button>
            <div className="flex items-center justify-between px-4 py-3 bg-card border-t border-border">
              <div className="flex items-center gap-2 min-w-0">
                <Film className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{videoFile?.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {videoFile ? (videoFile.size / (1024 * 1024)).toFixed(1) + " MB" : ""}
                </span>
              </div>
              <Button
                onClick={handleAnalyzeVideo}
                disabled={loading}
                className="gap-2 ml-4 shrink-0 bg-primary text-primary-foreground hover:opacity-90"
              >
                {loading ? <Spinner className="size-4" /> : <Play className="size-4" />}
                {loading ? "Analyzing..." : "Analyze Video"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      {loading && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Sending to detection API...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-muted" />
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert className="border-orange-500/40 bg-orange-500/10">
          <AlertTriangle className="size-4 text-orange-400" />
          <AlertDescription className="text-orange-300 text-sm">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
