"use client"

import { useEffect, useRef } from "react"

interface Detection {
  class: string
  confidence: number
  box: number[]
}

interface BoundingBoxCanvasProps {
  imageSrc: string
  detections: Detection[]
  width?: number
  height?: number
}

const CLASS_COLORS: Record<string, string> = {
  Belt: "#22d3ee",
  Necktie: "#a78bfa",
  Shoes: "#34d399",
  Missing_Necktie: "#f87171",
  Missing_shoes: "#fb923c",
  Belt_Missing: "#f43f5e",
}

function getClassColor(className: string): string {
  return CLASS_COLORS[className] ?? "#facc15"
}

export function BoundingBoxCanvas({
  imageSrc,
  detections,
  width = 640,
  height = 480,
}: BoundingBoxCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      detections.forEach((det) => {
        const [x1, y1, x2, y2] = det.box
        const color = getClassColor(det.class)
        const boxW = x2 - x1
        const boxH = y2 - y1

        // Box stroke
        ctx.strokeStyle = color
        ctx.lineWidth = 2.5
        ctx.strokeRect(x1, y1, boxW, boxH)

        // Label background
        const label = `${det.class} ${(det.confidence * 100).toFixed(0)}%`
        ctx.font = "bold 13px 'Geist', sans-serif"
        const textW = ctx.measureText(label).width
        const labelH = 20
        const labelY = y1 > labelH + 4 ? y1 - labelH - 4 : y1 + 2

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(x1, labelY, textW + 10, labelH, 4)
        ctx.fill()

        // Label text
        ctx.fillStyle = "#0a0a0a"
        ctx.fillText(label, x1 + 5, labelY + 14)
      })
    }
    img.src = imageSrc
  }, [imageSrc, detections])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "auto", maxWidth: width }}
      className="rounded-lg"
    />
  )
}
