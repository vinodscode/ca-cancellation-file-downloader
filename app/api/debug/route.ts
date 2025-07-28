import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("Starting debug download test...")

    const urls = ["https://api.kite.trade/instruments", "http://api.kite.trade/instruments"]

    const results = []

    for (const url of urls) {
      try {
        console.log(`Testing URL: ${url}`)

        const startTime = Date.now()
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
        })

        const downloadTime = Date.now() - startTime

        const headers = {}
        response.headers.forEach((value, key) => {
          headers[key] = value
        })

        let contentPreview = ""
        let contentSize = 0

        if (response.ok) {
          const text = await response.text()
          contentSize = text.length
          contentPreview = text.substring(0, 500)
        }

        results.push({
          url,
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers,
          contentSize,
          contentPreview,
          downloadTime,
          error: null,
        })
      } catch (error) {
        results.push({
          url,
          success: false,
          status: null,
          statusText: null,
          headers: {},
          contentSize: 0,
          contentPreview: "",
          downloadTime: 0,
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      results,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Debug test failed",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
