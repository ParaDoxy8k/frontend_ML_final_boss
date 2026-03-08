"use client"

import Webcam from "react-webcam"
import { useRef, useState, useEffect } from "react"

interface Detection {
  class: string
  confidence: number
  box: number[]
}

export default function WebcamDetector() {
  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [detections, setDetections] = useState<Detection[]>([])
  const [running, setRunning] = useState(false)

  const detectFrame = async () => {
    if (!webcamRef.current) return

    const imageSrc = webcamRef.current.getScreenshot()
    if (!imageSrc) return

    const blob = await (await fetch(imageSrc)).blob()

    const formData = new FormData()
    formData.append("file", blob)

    const res = await fetch("http://localhost:8000/detect", {
      method: "POST",
      body: formData
    })

    const data = await res.json()

    setDetections(data.detections)
    drawBoxes(data.detections)
  }

  const drawBoxes = (detections: Detection[]) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")

    if (!ctx || !canvas) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = "red"
    ctx.lineWidth = 2
    ctx.font = "16px Arial"

    detections.forEach((det) => {
      const [x1, y1, x2, y2] = det.box

      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)

      ctx.fillText(
        `${det.class} ${det.confidence.toFixed(2)}`,
        x1,
        y1 - 5
      )
    })
  }

  useEffect(() => {
    let interval: any

    if (running) {
      interval = setInterval(() => {
        detectFrame()
      }, 500)
    }

    return () => clearInterval(interval)
  }, [running])

  return (
    <div className="relative w-160">

      <Webcam
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={640}
        height={480}
      />

      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="absolute top-0 left-0"
      />

      <button
        onClick={() => setRunning(!running)}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        {running ? "Stop Detection" : "Start Detection"}
      </button>
    </div>
  )
}