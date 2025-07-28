import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), "data")
    const latestJsonPath = path.join(dataDir, "instruments_latest.json")
    const latestCsvPath = path.join(dataDir, "instruments_latest.csv")

    let status = {
      hasData: false,
      lastUpdated: null,
      fileSize: null,
      recordCount: 0,
      files: [],
    }

    try {
      // Check if latest files exist
      const jsonStats = await fs.stat(latestJsonPath)
      const csvStats = await fs.stat(latestCsvPath)

      // Read JSON to get record count
      const jsonData = await fs.readFile(latestJsonPath, "utf-8")
      const instruments = JSON.parse(jsonData)

      status = {
        hasData: true,
        lastUpdated: jsonStats.mtime.toISOString(),
        fileSize: {
          json: jsonStats.size,
          csv: csvStats.size,
        },
        recordCount: instruments.length,
        files: [],
      }

      // List all stored files
      const files = await fs.readdir(dataDir)
      status.files = files
        .filter((file) => file.startsWith("instruments_"))
        .sort()
        .reverse()
    } catch (error) {
      console.log("No stored data found")
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error("Error checking status:", error)
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 })
  }
}
