import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function POST() {
  try {
    console.log("Starting fresh download of instruments...")

    const response = await fetch("http://api.kite.trade/instruments", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const csvText = await response.text()

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), "data")
    try {
      await fs.access(dataDir)
    } catch {
      await fs.mkdir(dataDir, { recursive: true })
    }

    // Store raw CSV with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const csvPath = path.join(dataDir, `instruments_${timestamp}.csv`)
    await fs.writeFile(csvPath, csvText)

    // Also store as latest
    const latestCsvPath = path.join(dataDir, "instruments_latest.csv")
    await fs.writeFile(latestCsvPath, csvText)

    // Parse CSV
    const lines = csvText.trim().split("\n")
    const headers = lines[0].split(",").map((header) => header.replace(/"/g, "").trim())

    const instruments = lines
      .slice(1)
      .map((line) => {
        const values = line.split(",")
        const instrument: any = {}

        headers.forEach((header, index) => {
          const cleanValue = values[index] ? values[index].replace(/"/g, "").trim() : ""
          instrument[header] = cleanValue
        })

        return instrument
      })
      .filter((instrument) => instrument.tradingsymbol && instrument.tradingsymbol.length > 0)

    // Store parsed JSON
    const jsonPath = path.join(dataDir, `instruments_${timestamp}.json`)
    await fs.writeFile(jsonPath, JSON.stringify(instruments, null, 2))

    const latestJsonPath = path.join(dataDir, "instruments_latest.json")
    await fs.writeFile(latestJsonPath, JSON.stringify(instruments, null, 2))

    console.log(`Successfully downloaded and stored ${instruments.length} instruments`)

    return NextResponse.json({
      success: true,
      message: "Instruments downloaded and stored successfully",
      count: instruments.length,
      timestamp: new Date().toISOString(),
      files: {
        csv: `instruments_${timestamp}.csv`,
        json: `instruments_${timestamp}.json`,
      },
    })
  } catch (error) {
    console.error("Error downloading instruments:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to download instruments",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
