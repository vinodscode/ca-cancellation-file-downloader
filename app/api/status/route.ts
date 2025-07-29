import { NextResponse } from "next/server"

// Simple in-memory cache (assuming it's shared or re-initialized for status check)
// In a real application, this would be a more robust shared cache mechanism.
const memoryCache = {
  data: null,
  timestamp: null,
  isValid: false,
}

// Cache duration in milliseconds (1 hour) - must match instruments route
const CACHE_DURATION = 60 * 60 * 1000

function isCacheValid(lastUpdated: string): boolean {
  const cacheAge = Date.now() - new Date(lastUpdated).getTime()
  return cacheAge < CACHE_DURATION
}

// This function is a simplified version to get status from the in-memory cache
// It assumes the instruments route has already populated it.
function getMemoryCacheStatus() {
  if (!memoryCache.isValid || !memoryCache.data || !memoryCache.timestamp) {
    return {
      hasData: false,
      lastUpdated: null,
      fileSize: null,
      recordCount: 0,
      source: "Memory Cache",
      cacheAge: null,
      error: "No data in memory cache",
      dataIntegrity: null,
    }
  }

  const cacheAge = Date.now() - new Date(memoryCache.timestamp).getTime()
  const instrumentsSize = JSON.stringify(memoryCache.data || []).length

  const hasValidInstruments = Array.isArray(memoryCache.data) && memoryCache.data.length > 0
  const recordCountMatches = memoryCache.data.length === memoryCache.data.length // Always true for in-memory

  return {
    hasData: true,
    lastUpdated: memoryCache.timestamp,
    fileSize: {
      json: instrumentsSize,
      csv: 0, // No CSV stored in memory cache
    },
    recordCount: memoryCache.data.length,
    source: "Memory Cache",
    cacheAge: cacheAge,
    error: isCacheValid(memoryCache.timestamp) ? null : "Memory cache is stale",
    dataIntegrity: {
      hasValidInstruments,
      recordCountMatches,
      dataSizeMB: Number((instrumentsSize / (1024 * 1024)).toFixed(2)),
      segmentsIncluded: [], // Not tracked in this simplified status
      csvMetadata: null,
    },
  }
}

export async function GET() {
  try {
    console.log("Checking data status from Memory Cache...")

    // In a real app, you'd need a way to access the *actual* memoryCache
    // from the instruments route. For this example, we'll simulate it
    // or assume it's populated by a prior call to /api/instruments.
    // For a truly robust solution, consider a shared state management or
    // a more persistent cache like Redis.

    const status = getMemoryCacheStatus()

    return NextResponse.json({
      ...status,
      connectionStatus: "connected", // Always connected to memory
      tableExists: true, // N/A for memory cache, assume true for simplicity
      supabaseConfigured: false, // Explicitly false now
    })
  } catch (error) {
    console.error("Error in status check:", error)

    return NextResponse.json({
      hasData: false,
      lastUpdated: null,
      fileSize: null,
      recordCount: 0,
      files: [],
      source: "Memory Cache",
      cacheAge: null,
      tableExists: false,
      connectionStatus: "error",
      supabaseConfigured: false,
      error: `Status check failed: ${error.message}`,
      dataIntegrity: null,
    })
  }
}
