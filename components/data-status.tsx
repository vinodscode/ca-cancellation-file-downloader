"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Database, Clock, HardDrive } from "lucide-react"

interface DataStatus {
  hasData: boolean
  lastUpdated: string | null
  fileSize: {
    json: number
    csv: number
  } | null
  recordCount: number
  files: string[]
}

export function DataStatus() {
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/status")
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error("Error fetching status:", error)
    }
  }

  const downloadFresh = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/download", { method: "POST" })
      const result = await response.json()
      if (result.success) {
        await fetchStatus() // Refresh status after download
      }
    } catch (error) {
      console.error("Error downloading:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Checking data status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Status
        </CardTitle>
        <CardDescription>Current status of stored instruments data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={status.hasData ? "default" : "destructive"}>
                {status.hasData ? "Data Available" : "No Data"}
              </Badge>
            </div>
            {status.hasData && (
              <div className="text-sm text-muted-foreground">{status.recordCount.toLocaleString()} instruments</div>
            )}
          </div>

          {status.lastUpdated && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Last Updated</span>
              </div>
              <div className="text-sm text-muted-foreground">{formatDate(status.lastUpdated)}</div>
            </div>
          )}

          {status.fileSize && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                <span className="text-sm font-medium">File Sizes</span>
              </div>
              <div className="text-sm text-muted-foreground">
                JSON: {formatFileSize(status.fileSize.json)}
                <br />
                CSV: {formatFileSize(status.fileSize.csv)}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={fetchStatus} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Check Status
          </Button>
          <Button onClick={downloadFresh} disabled={loading} size="sm">
            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
            {loading ? "Downloading..." : "Download Fresh Data"}
          </Button>
        </div>

        {status.files.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Stored Files ({status.files.length})</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {status.files.slice(0, 5).map((file) => (
                <div key={file} className="text-xs text-muted-foreground font-mono">
                  {file}
                </div>
              ))}
              {status.files.length > 5 && (
                <div className="text-xs text-muted-foreground">... and {status.files.length - 5} more files</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
