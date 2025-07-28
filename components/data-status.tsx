"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Database, Clock, HardDrive, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface DataIntegrity {
  hasValidInstruments: boolean
  recordCountMatches: boolean
  dataSizeMB: number
  segmentsIncluded: string[]
  csvMetadata: {
    size: number
    lines: number
    headers: string[]
  } | null
}

interface DataStatus {
  hasData: boolean
  lastUpdated: string | null
  fileSize: {
    json: number
    csv: number
  } | null
  recordCount: number
  files: string[]
  source?: string
  cacheAge?: number
  tableExists?: boolean
  connectionStatus?: string
  error?: string | null
  dataIntegrity?: DataIntegrity | null
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
      setStatus({
        hasData: false,
        lastUpdated: null,
        fileSize: null,
        recordCount: 0,
        files: [],
        tableExists: false,
        error: "Failed to connect to status API",
      })
    }
  }

  const downloadFresh = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/instruments", { method: "POST" })
      const result = await response.json()

      if (result.error) {
        throw new Error(result.details || result.error)
      }

      await fetchStatus() // Refresh status after download
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

  const formatCacheAge = (ageMs: number) => {
    const minutes = Math.floor(ageMs / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}d ${hours % 24}h ago`
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`
    } else {
      return `${minutes}m ago`
    }
  }

  const getCacheStatusColor = (ageMs: number) => {
    const oneHour = 60 * 60 * 1000
    if (ageMs < oneHour) return "default" // Fresh
    if (ageMs < oneHour * 24) return "secondary" // Stale but usable
    return "destructive" // Very old
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
        <CardDescription>Current status of cached instruments data in Supabase</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Alert */}
        {status.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div>{status.error}</div>
                {status.error.includes("table") && (
                  <div className="text-sm">
                    <p>
                      To fix this issue, create the Supabase table by running the SQL script in your Supabase dashboard.
                    </p>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Connection Status */}
        {status.connectionStatus && status.connectionStatus !== "connected" && (
          <Alert variant={status.connectionStatus === "auth_error" ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div>
                  <strong>Connection Status:</strong> {status.connectionStatus.replace("_", " ")}
                </div>
                {status.connectionStatus === "auth_error" && (
                  <div className="text-sm">
                    <p>Please verify your Supabase environment variables:</p>
                    <ul className="list-disc list-inside mt-1">
                      <li>NEXT_PUBLIC_SUPABASE_URL</li>
                      <li>SUPABASE_SERVICE_ROLE_KEY</li>
                    </ul>
                  </div>
                )}
                {status.connectionStatus === "network_error" && (
                  <div className="text-sm">
                    <p>Check your internet connection and Supabase URL configuration.</p>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Data Integrity Status */}
        {status.dataIntegrity && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                Data Integrity
                {status.dataIntegrity.hasValidInstruments && status.dataIntegrity.recordCountMatches ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
              </h4>
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2">
                  {status.dataIntegrity.hasValidInstruments ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-600" />
                  )}
                  <span>Valid instruments array</span>
                </div>
                <div className="flex items-center gap-2">
                  {status.dataIntegrity.recordCountMatches ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-600" />
                  )}
                  <span>Record count matches</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Storage Details</h4>
              <div className="text-xs space-y-1">
                <div>Size: {status.dataIntegrity.dataSizeMB.toFixed(2)} MB</div>
                <div>Segments: {status.dataIntegrity.segmentsIncluded.join(", ")}</div>
                {status.dataIntegrity.csvMetadata && (
                  <div>CSV: {status.dataIntegrity.csvMetadata.lines.toLocaleString()} lines</div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={status.hasData ? "default" : "destructive"}>
                {status.hasData ? "Data Available" : "No Data"}
              </Badge>
              {status.source && (
                <Badge variant="outline" className="text-xs">
                  {status.source}
                </Badge>
              )}
              {status.tableExists === false && (
                <Badge variant="destructive" className="text-xs">
                  Table Missing
                </Badge>
              )}
            </div>
            {status.hasData && (
              <div className="text-sm text-muted-foreground">
                {status.recordCount.toLocaleString()} instruments
                {status.cacheAge && (
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant={getCacheStatusColor(status.cacheAge)} className="text-xs">
                      {formatCacheAge(status.cacheAge)}
                    </Badge>
                  </div>
                )}
              </div>
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
                <span className="text-sm font-medium">Cache Sizes</span>
              </div>
              <div className="text-sm text-muted-foreground">
                JSON: {formatFileSize(status.fileSize.json)}
                <br />
                Metadata: {formatFileSize(status.fileSize.csv)}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={fetchStatus} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Check Status
          </Button>
          <Button onClick={downloadFresh} disabled={loading || status.tableExists === false} size="sm">
            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
            {loading ? "Refreshing..." : "Refresh Cache"}
          </Button>
        </div>

        {status.hasData && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Cache Information</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• Data is cached in Supabase for 1 hour for optimal performance</div>
              <div>• Automatic fallback to stale cache if API is unavailable</div>
              <div>• Data integrity checks ensure reliable operation</div>
              <div>• Source: https://api.kite.trade/instruments</div>
              {status.fileSize && (
                <div>• Total storage: {formatFileSize(status.fileSize.json + status.fileSize.csv)}</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
