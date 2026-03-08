import { useCallback, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DetectionResults,
  type Detection,
  type DetectionHistoryItem,
} from "@/components/detection-results"

export default function Navbar() {
    const [history, setHistory] = useState<DetectionHistoryItem[]>([])
    return(

    );
}