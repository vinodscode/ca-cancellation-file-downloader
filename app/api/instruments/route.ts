import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const INSTRUMENTS_FILE_PATH = path.join(process.cwd(), "data", "instruments.csv")
const INSTRUMENTS_JSON_PATH = path.join(process.cwd(), "data", "instruments.json")

// Define the segments we want to keep
const ALLOWED_SEGMENTS = ["NFO-OPT", "NFO-FUT", "NSE", "BSE"]

async function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), "data")
  try {
    await fs.access(dataDir)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
  }
}

async function downloadAndStoreInstruments() {
  try {
    console.log("Downloading instruments from Kite API...")

    // Try multiple approaches to download
    const urls = ["https://api.kite.trade/instruments", "http://api.kite.trade/instruments"]

    let response
    let lastError

    for (const url of urls) {
      try {
        console.log(`Trying URL: ${url}`)
        response = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Accept: "text/csv,text/plain,*/*",
            "Accept-Encoding": "gzip, deflate",
            Connection: "keep-alive",
            "Cache-Control": "no-cache",
          },
          timeout: 30000, // 30 second timeout
        })

        if (response.ok) {
          console.log(`Success with URL: ${url}`)
          console.log(`Response status: ${response.status}`)
          console.log(`Content-Type: ${response.headers.get("content-type")}`)
          console.log(`Content-Length: ${response.headers.get("content-length")}`)
          break
        } else {
          console.log(`Failed with URL: ${url}, status: ${response.status}`)
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      } catch (error) {
        console.log(`Error with URL: ${url}`, error.message)
        lastError = error
        continue
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error("All download attempts failed")
    }

    // Get the response as text
    const csvText = await response.text()
    console.log(`Downloaded CSV size: ${csvText.length} characters`)

    if (csvText.length < 1000) {
      throw new Error(`Downloaded file seems too small (${csvText.length} characters). Expected around 7MB.`)
    }

    // Ensure data directory exists
    await ensureDataDirectory()

    // Store raw CSV
    await fs.writeFile(INSTRUMENTS_FILE_PATH, csvText)
    console.log("Raw CSV file stored successfully")

    // Parse and filter instruments
    const instruments = parseAndFilterCSV(csvText)
    await fs.writeFile(INSTRUMENTS_JSON_PATH, JSON.stringify(instruments, null, 2))
    console.log(`Parsed and stored ${instruments.length} filtered instruments as JSON`)

    return instruments
  } catch (error) {
    console.error("Error downloading instruments:", error)
    throw error
  }
}

function parseAndFilterCSV(csvText: string) {
  try {
    const lines = csvText.trim().split("\n")
    console.log(`Total lines in CSV: ${lines.length}`)

    if (lines.length < 2) {
      throw new Error("CSV file appears to be empty or invalid")
    }

    const headers = lines[0].split(",").map((header) => header.replace(/"/g, "").trim())
    console.log(`Headers found: ${headers.join(", ")}`)

    // Find the segment column index
    const segmentIndex = headers.findIndex((header) => header.toLowerCase() === "segment")
    if (segmentIndex === -1) {
      throw new Error("Segment column not found in CSV")
    }

    console.log(`Segment column found at index: ${segmentIndex}`)

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
    console.log(`Segments included: ${ALLOWED_SEGMENTS.join(", ")}`)

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

async function getStoredInstruments() {
  try {
    const jsonData = await fs.readFile(INSTRUMENTS_JSON_PATH, "utf-8")
    return JSON.parse(jsonData)
  } catch (error) {
    console.log("No stored instruments found, will download fresh data")
    return null
  }
}

async function getFileAge(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath)
    return Date.now() - stats.mtime.getTime()
  } catch {
    return Number.POSITIVE_INFINITY // File doesn't exist
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get("refresh") === "true"

    // Check if we should use cached data (less than 1 hour old) or refresh
    const fileAge = await getFileAge(INSTRUMENTS_JSON_PATH)
    const oneHour = 60 * 60 * 1000 // 1 hour in milliseconds

    let instruments

    if (!forceRefresh && fileAge < oneHour) {
      console.log("Using cached instruments data")
      instruments = await getStoredInstruments()
    }

    if (!instruments || forceRefresh) {
      console.log("Downloading fresh instruments data")
      instruments = await downloadAndStoreInstruments()
    }

    // Get segment statistics
    const segmentStats = {}
    instruments.forEach((instrument) => {
      const segment = instrument.segment
      segmentStats[segment] = (segmentStats[segment] || 0) + 1
    })

    return NextResponse.json({
      instruments,
      cached: fileAge < oneHour && !forceRefresh,
      lastUpdated: fileAge < Number.POSITIVE_INFINITY ? new Date(Date.now() - fileAge).toISOString() : null,
      count: instruments.length,
      allowedSegments: ALLOWED_SEGMENTS,
      segmentStats,
      debug: {
        fileAge: fileAge,
        forceRefresh: forceRefresh,
        hasStoredData: !!instruments,
      },
    })
  } catch (error) {
    console.error("Error in instruments API:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch instruments",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  try {
    console.log("Force refreshing instruments data...")
    const instruments = await downloadAndStoreInstruments()

    // Get segment statistics
    const segmentStats = {}
    instruments.forEach((instrument) => {
      const segment = instrument.segment
      segmentStats[segment] = (segmentStats[segment] || 0) + 1
    })

    return NextResponse.json({
      message: "Instruments data refreshed successfully",
      count: instruments.length,
      lastUpdated: new Date().toISOString(),
      allowedSegments: ALLOWED_SEGMENTS,
      segmentStats,
    })
  } catch (error) {
    console.error("Error refreshing instruments:", error)
    return NextResponse.json(
      {
        error: "Failed to refresh instruments",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
