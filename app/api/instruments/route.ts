import { NextResponse } from "next/server"

// Define the segments we want to keep
const ALLOWED_SEGMENTS = ["NFO-OPT", "NFO-FUT", "NSE", "BSE"]

// Simple in-memory cache
let memoryCache = {
  data: null,
  timestamp: null,
  isValid: false,
}

// Cache duration in milliseconds (1 hour)
const CACHE_DURATION = 60 * 60 * 1000

async function downloadInstrumentsFromAPI() {
  console.log("Downloading instruments from Kite API...")

  const urls = ["https://api.kite.trade/instruments", "http://api.kite.trade/instruments"]
  let lastError

  for (const url of urls) {
    try {
      console.log(`Attempting download from: ${url}`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept: "text/csv,text/plain,*/*",
          "Accept-Encoding": "gzip, deflate",
          Connection: "keep-alive",
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const csvText = await response.text()
        console.log(`Downloaded CSV size: ${csvText.length} characters`)

        if (csvText.length < 1000) {
          throw new Error(`Downloaded file seems too small (${csvText.length} characters)`)
        }

        return csvText
      } else {
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.log(`Error with URL ${url}:`, error.message)
      lastError = error
      continue
    }
  }

  throw lastError || new Error("All download attempts failed")
}

function parseAndFilterCSV(csvText: string) {
  try {
    const lines = csvText.trim().split("\n")
    console.log(`Total lines in CSV: ${lines.length}`)

    if (lines.length < 2) {
      throw new Error("CSV file appears to be empty or invalid")
    }

    const headers = lines[0].split(",").map((header) => header.replace(/"/g, "").trim())
    console.log(`Headers found: ${headers.slice(0, 5).join(", ")}...`)

    // Find the segment column index
    const segmentIndex = headers.findIndex((header) => header.toLowerCase() === "segment")
    if (segmentIndex === -1) {
      throw new Error("Segment column not found in CSV")
    }

    let totalProcessed = 0
    let filteredCount = 0

    const instruments = lines
      .slice(1)
      .map((line, index) => {
        try {
          totalProcessed++
          const values = line.split(",")

          // Check segment first to filter early
          const segmentValue = values[segmentIndex] ? values[segmentIndex].replace(/"/g, "").trim() : ""

          // Only process if segment is in our allowed list
          if (!ALLOWED_SEGMENTS.includes(segmentValue)) {
            return null
          }

          filteredCount++

          const instrument: any = {}
          headers.forEach((header, headerIndex) => {
            const cleanValue = values[headerIndex] ? values[headerIndex].replace(/"/g, "").trim() : ""
            instrument[header] = cleanValue
          })

          return instrument
        } catch (error) {
          console.error(`Error parsing line ${index + 2}:`, line.substring(0, 100))
          return null
        }
      })
      .filter(Boolean)

    // Filter out invalid entries
    const validInstruments = instruments.filter(
      (instrument) => instrument && instrument.tradingsymbol && instrument.tradingsymbol.length > 0,
    )

    console.log(`Total lines processed: ${totalProcessed}`)
    console.log(`Lines matching segment filter: ${filteredCount}`)
    console.log(`Valid instruments after all filtering: ${validInstruments.length}`)

    // Log segment distribution
    const segmentCounts = {}
    validInstruments.forEach((instrument) => {
      const segment = instrument.segment
      segmentCounts[segment] = (segmentCounts[segment] || 0) + 1
    })
    console.log("Segment distribution:", segmentCounts)

    return validInstruments
  } catch (error) {
    console.error("Error parsing CSV:", error)
    throw error
  }
}

function isCacheValid(lastUpdated: string): boolean {
  const cacheAge = Date.now() - new Date(lastUpdated).getTime()
  return cacheAge < CACHE_DURATION
}

function updateMemoryCache(instruments: any[]) {
  memoryCache = {
    data: instruments,
    timestamp: new Date().toISOString(),
    isValid: true,
  }
}

function getMemoryCache() {
  if (!memoryCache.isValid || !memoryCache.data || !memoryCache.timestamp) {
    return null
  }

  if (!isCacheValid(memoryCache.timestamp)) {
    console.log("Memory cache is stale")
    return null
  }

  console.log("Using memory cache")
  return {
    instruments_data: memoryCache.data,
    last_updated: memoryCache.timestamp,
    record_count: memoryCache.data.length,
  }
}

async function processInstrumentsData(forceRefresh = false) {
  let instruments = null
  let lastUpdated = new Date().toISOString()
  let cacheStatus = "no_cache"

  try {
    // Try memory cache first (fastest)
    if (!forceRefresh) {
      const memCache = getMemoryCache()
      if (memCache) {
        return {
          instruments: memCache.instruments_data,
          fromCache: true,
          lastUpdated: memCache.last_updated,
          cacheStatus: "memory_cache",
        }
      }
    }

    // Download fresh data
    console.log("Downloading fresh data")
    const csvText = await downloadInstrumentsFromAPI()
    const parsedInstruments = parseAndFilterCSV(csvText)

    instruments = parsedInstruments
    lastUpdated = new Date().toISOString()
    cacheStatus = forceRefresh ? "force_refresh" : "fresh_download"

    // Update memory cache
    updateMemoryCache(instruments)

    return {
      instruments,
      fromCache: false,
      lastUpdated,
      cacheStatus,
    }
  } catch (error) {
    console.error("Error processing data:", error)

    // Try fallback to stale memory cache
    const memCache = getMemoryCache()
    if (memCache) {
      console.log("Using stale memory cache as fallback")
      return {
        instruments: memCache.instruments_data,
        fromCache: true,
        lastUpdated: memCache.last_updated,
        cacheStatus: "fallback_memory",
      }
    }

    throw error
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get("refresh") === "true"

    console.log(`GET /api/instruments - forceRefresh: ${forceRefresh}`)

    const result = await processInstrumentsData(forceRefresh)

    if (!result.instruments || !Array.isArray(result.instruments)) {
      return NextResponse.json(
        {
          error: "No valid instruments data available",
          details: "Unable to fetch or parse instruments data",
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    // Generate segment statistics
    const segmentStats = {}
    result.instruments.forEach((instrument) => {
      const segment = instrument.segment || "UNKNOWN"
      segmentStats[segment] = (segmentStats[segment] || 0) + 1
    })

    const response = {
      instruments: result.instruments,
      cached: result.fromCache,
      lastUpdated: result.lastUpdated,
      count: result.instruments.length,
      allowedSegments: ALLOWED_SEGMENTS,
      segmentStats,
      cacheStatus: result.cacheStatus,
      debug: {
        forceRefresh,
        fromCache: result.fromCache,
        cacheAge: result.fromCache ? Date.now() - new Date(result.lastUpdated).getTime() : 0,
        timestamp: new Date().toISOString(),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error in GET /api/instruments:", error)

    return NextResponse.json(
      {
        error: "Failed to fetch instruments",
        details: error.message || "Unknown error occurred",
        timestamp: new Date().toISOString(),
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  try {
    console.log("POST /api/instruments - Force refreshing")

    const result = await processInstrumentsData(true)

    if (!result.instruments || !Array.isArray(result.instruments)) {
      return NextResponse.json(
        {
          error: "No valid instruments data available",
          details: "Unable to fetch or parse instruments data",
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    // Generate segment statistics
    const segmentStats = {}
    result.instruments.forEach((instrument) => {
      const segment = instrument.segment || "UNKNOWN"
      segmentStats[segment] = (segmentStats[segment] || 0) + 1
    })

    return NextResponse.json({
      message: "Instruments data refreshed successfully",
      count: result.instruments.length,
      lastUpdated: result.lastUpdated,
      allowedSegments: ALLOWED_SEGMENTS,
      segmentStats,
      cacheStatus: result.cacheStatus,
    })
  } catch (error) {
    console.error("Error in POST /api/instruments:", error)

    return NextResponse.json(
      {
        error: "Failed to refresh instruments",
        details: error.message || "Unknown error occurred",
        timestamp: new Date().toISOString(),
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
