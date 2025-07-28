"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bug, RefreshCw } from "lucide-react"

export function DebugPanel() {
  const [debugData, setDebugData] = useState(null)
  const [loading, setLoading] = useState(false)

  const runDebugTest = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug")
      const data = await response.json()
      setDebugData(data)
    } catch (error) {
      console.error("Debug test failed:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Debug Panel
        </CardTitle>
        <CardDescription>Test download connectivity and diagnose issues</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDebugTest} disabled={loading} className="flex items-center gap-2">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Bug className="h-4 w-4" />}
          {loading ? "Running Tests..." : "Run Debug Test"}
        </Button>

        {debugData && (
          <div className="space-y-4">
            <div className="text-sm">
              <strong>Test Time:</strong> {debugData.timestamp}
            </div>

            <div className="space-y-3">
              {debugData.results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "Success" : "Failed"}
                    </Badge>
                    <code className="text-sm">{result.url}</code>
                  </div>

                  {result.success ? (
                    <div className="text-sm space-y-1">
                      <div>
                        <strong>Status:</strong> {result.status} {result.statusText}
                      </div>
                      <div>
                        <strong>Content Size:</strong> {result.contentSize.toLocaleString()} characters (
                        {(result.contentSize / 1024 / 1024).toFixed(2)} MB)
                      </div>
                      <div>
                        <strong>Download Time:</strong> {result.downloadTime}ms
                      </div>
                      <div>
                        <strong>Content-Type:</strong> {result.headers["content-type"] || "Not specified"}
                      </div>
                      {result.contentPreview && (
                        <details className="mt-2">
                          <summary className="cursor-pointer font-medium">Content Preview</summary>
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                            {result.contentPreview}
                          </pre>
                        </details>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-red-600">
                      <strong>Error:</strong> {result.error || `${result.status} ${result.statusText}`}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-xs text-gray-500">
              <strong>Environment:</strong> Node {debugData.environment.nodeVersion} on {debugData.environment.platform}{" "}
              ({debugData.environment.arch})
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
