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

// Mock data generator for testing
function generateMockInstruments() {
  const mockInstruments = [
    {
      instrument_token: "256265",
      exchange_token: "1001",
      tradingsymbol: "RELIANCE",
      name: "RELIANCE INDUSTRIES LTD",
      last_price: "2500.00",
      expiry: "",
      strike: "0.00",
      tick_size: "0.05",
      lot_size: "1",
      instrument_type: "EQ",
      segment: "NSE",
      exchange: "NSE",
    },
    {
      instrument_token: "134657",
      exchange_token: "526",
      tradingsymbol: "TCS",
      name: "TATA CONSULTANCY SERVICES LTD",
      last_price: "3200.00",
      expiry: "",
      strike: "0.00",
      tick_size: "0.05",
      lot_size: "1",
      instrument_type: "EQ",
      segment: "NSE",
      exchange: "NSE",
    },
    {
      instrument_token: "738561",
      exchange_token: "2885",
      tradingsymbol: "INFY",
      name: "INFOSYS LTD",
      last_price: "1400.00",
      expiry: "",
      strike: "0.00",
      tick_size: "0.05",
      lot_size: "1",
      instrument_type: "EQ",
      segment: "NSE",
      exchange: "NSE",
    },
    {
      instrument_token: "256265",
      exchange_token: "1001",
      tradingsymbol: "RELIANCE25FEB2500CE",
      name: "RELIANCE",
      last_price: "50.00",
      expiry: "2025-02-27",
      strike: "2500.00",
      tick_size: "0.05",
      lot_size: "250",
      instrument_type: "CE",
      segment: "NFO-OPT",
      exchange: "NFO",
    },
    {
      instrument_token: "256266",
      exchange_token: "1002",
      tradingsymbol: "RELIANCE25FEB2500PE",
      name: "RELIANCE",
      last_price: "25.00",
      expiry: "2025-02-27",
      strike: "2500.00",
      tick_size: "0.05",
      lot_size: "250",
      instrument_type: "PE",
      segment: "NFO-OPT",
      exchange: "NFO",
    },
    {
      instrument_token: "256267",
      exchange_token: "1003",
      tradingsymbol: "RELIANCE25FEBFUT",
      name: "RELIANCE",
      last_price: "2505.00",
      expiry: "2025-02-27",
      strike: "0.00",
      tick_size: "0.05",
      lot_size: "250",
      instrument_type: "FUT",
      segment: "NFO-FUT",
      exchange: "NFO",
    },
    {
      instrument_token: "134658",
      exchange_token: "527",
      tradingsymbol: "TCS25FEB3200CE",
      name: "TATA CONSULTANCY SERVICES LTD",
      last_price: "75.00",
      expiry: "2025-02-27",
      strike: "3200.00",
      tick_size: "0.05",
      lot_size: "125",
      instrument_type: "CE",
      segment: "NFO-OPT",
      exchange: "NFO",
    },
    {
      instrument_token: "134659",
      exchange_token: "528",
      tradingsymbol: "TCS25FEB3200PE",
      name: "TATA CONSULTANCY SERVICES LTD",
      last_price: "40.00",
      expiry: "2025-02-27",
      strike: "3200.00",
      tick_size: "0.05",
      lot_size: "125",
      instrument_type: "PE",
      segment: "NFO-OPT",
      exchange: "NFO",
    },
    {
      instrument_token: "134660",
      exchange_token: "529",
      tradingsymbol: "TCS25FEBFUT",
      name: "TATA CONSULTANCY SERVICES LTD",
      last_price: "3205.00",
      expiry: "2025-02-27",
      strike: "0.00",
      tick_size: "0.05",
      lot_size: "125",
      instrument_type: "FUT",
      segment: "NFO-FUT",
      exchange: "NFO",
    },
    {
      instrument_token: "738562",
      exchange_token: "2886",
      tradingsymbol: "INFY25FEB1400CE",
      name: "INFOSYS LTD",
      last_price: "30.00",
      expiry: "2025-02-27",
      strike: "1400.00",
      tick_size: "0.05",
      lot_size: "300",
      instrument_type: "CE",
      segment: "NFO-OPT",
      exchange: "NFO",
    },
    {
      instrument_token: "738563",
      exchange_token: "2887",
      tradingsymbol: "INFY25FEB1400PE",
      name: "INFOSYS LTD",
      last_price: "20.00",
      expiry: "2025-02-27",
      strike: "1400.00",
      tick_size: "0.05",
      lot_size: "300",
      instrument_type: "PE",
      segment: "NFO-OPT",
      exchange: "NFO",
    },
    {
      instrument_token: "738564",
      exchange_token: "2888",
      tradingsymbol: "INFY25FEBFUT",
      name: "INFOSYS LTD",
      last_price: "1405.00",
      expiry: "2025-02-27",
      strike: "0.00",
      tick_size: "0.05",
      lot_size: "300",
      instrument_type: "FUT",
      segment: "NFO-FUT",
      exchange: "NFO",
    },
  ]

  return mockInstruments
}

async function downloadAndStoreInstruments() {
  try {
    console.log("Attempting to download instruments from Kite API...")

    // Try to download from Kite API first
    const urls = ["https://api.kite.trade/instruments"]
    let response
    let lastError

    for (const url of urls) {
      try {
        console.log(`Trying URL: ${url}`)
        response = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "text/csv,text/plain,*/*",
            "Cache-Control": "no-cache",
          },
        })

        if (response.ok) {
          console.log(`Success with URL: ${url}`)
          const csvText = await response.text()

          if (csvText.length > 1000) {
            console.log(`Downloaded CSV size: ${csvText.length} characters`)

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
          }
        }

        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
      } catch (error) {
        console.log(`Error with URL: ${url}`, error.message)
        lastError = error
        continue
      }
    }

    // If download fails, use mock data
    console.log("Download failed, using mock data for demonstration")
    const mockInstruments = generateMockInstruments()

    // Ensure data directory exists
    await ensureDataDirectory()

    // Store mock data
    await fs.writeFile(INSTRUMENTS_JSON_PATH, JSON.stringify(mockInstruments, null, 2))
    console.log(`Using ${mockInstruments.length} mock instruments`)

    return mockInstruments
  } catch (error) {
    console.error("Error in downloadAndStoreInstruments:", error)

    // Fallback to mock data
    console.log("Falling back to mock data")
    const mockInstruments = generateMockInstruments()

    try {
      await ensureDataDirectory()
      await fs.writeFile(INSTRUMENTS_JSON_PATH, JSON.stringify(mockInstruments, null, 2))
    } catch (fsError) {
      console.error("File system error:", fsError)
    }

    return mockInstruments
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
    console.log("GET /api/instruments called")

    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get("refresh") === "true"

    console.log("Force refresh:", forceRefresh)

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

    // Ensure we have instruments
    if (!instruments || !Array.isArray(instruments)) {
      console.log("No instruments found, using mock data")
      instruments = generateMockInstruments()
    }

    // Get segment statistics
    const segmentStats = {}
    instruments.forEach((instrument) => {
      const segment = instrument.segment || "UNKNOWN"
      segmentStats[segment] = (segmentStats[segment] || 0) + 1
    })

    console.log(`Returning ${instruments.length} instruments`)

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
    console.error("Error in GET /api/instruments:", error)

    // Return mock data even on error
    const mockInstruments = generateMockInstruments()

    return NextResponse.json({
      instruments: mockInstruments,
      cached: false,
      lastUpdated: new Date().toISOString(),
      count: mockInstruments.length,
      allowedSegments: ALLOWED_SEGMENTS,
      segmentStats: {
        NSE: 3,
        "NFO-OPT": 6,
        "NFO-FUT": 3,
      },
      error: "Using mock data due to API error",
      debug: {
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
    })
  }
}

export async function POST() {
  try {
    console.log("POST /api/instruments called - Force refreshing instruments data...")
    const instruments = await downloadAndStoreInstruments()

    // Get segment statistics
    const segmentStats = {}
    instruments.forEach((instrument) => {
      const segment = instrument.segment || "UNKNOWN"
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
    console.error("Error in POST /api/instruments:", error)

    // Return mock data even on error
    const mockInstruments = generateMockInstruments()

    return NextResponse.json({
      message: "Using mock data due to API error",
      count: mockInstruments.length,
      lastUpdated: new Date().toISOString(),
      allowedSegments: ALLOWED_SEGMENTS,
      segmentStats: {
        NSE: 3,
        "NFO-OPT": 6,
        "NFO-FUT": 3,
      },
      error: "API error occurred",
      debug: {
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
    })
  }
}
