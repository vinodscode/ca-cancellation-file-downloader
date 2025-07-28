import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("Checking data status...")

    let status = {
      hasData: false,
      lastUpdated: null,
      fileSize: null,
      recordCount: 0,
      files: [],
      source: "Memory/Supabase Cache",
      cacheAge: null,
      tableExists: false,
      error: null,
      dataIntegrity: null,
      connectionStatus: "unknown",
      supabaseConfigured: false,
    }

    // Check if Supabase is configured
    const supabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    status.supabaseConfigured = supabaseConfigured

    if (!supabaseConfigured) {
      status.error =
        "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
      status.connectionStatus = "not_configured"
      return NextResponse.json(status)
    }

    try {
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

      console.log("Testing Supabase connection...")

      const { data, error } = await supabase
        .from("instruments_cache")
        .select("*")
        .eq("id", "instruments_cache")
        .single()

      if (error) {
        console.error("Supabase query error:", error)

        if (error.code === "PGRST116") {
          status.tableExists = true
          status.connectionStatus = "connected"
          status.error = "Table exists but no cached data found"
        } else if (error.message.includes("does not exist") || error.message.includes("relation")) {
          status.tableExists = false
          status.connectionStatus = "connected"
          status.error =
            "Supabase table 'instruments_cache' not found. Please create the table using the provided SQL script."
        } else if (error.message.includes("JWT") || error.message.includes("auth")) {
          status.tableExists = false
          status.connectionStatus = "auth_error"
          status.error = "Supabase authentication failed. Please check your SUPABASE_SERVICE_ROLE_KEY."
        } else {
          status.error = `Database error: ${error.message}`
          status.tableExists = false
          status.connectionStatus = "error"
        }
      } else if (data) {
        console.log("Found cached data in Supabase")

        const cacheAge = Date.now() - new Date(data.last_updated).getTime()
        const instrumentsSize = JSON.stringify(data.instruments_data || []).length

        const hasValidInstruments = Array.isArray(data.instruments_data) && data.instruments_data.length > 0
        const recordCountMatches = data.record_count === (data.instruments_data?.length || 0)

        status = {
          ...status,
          hasData: true,
          lastUpdated: data.last_updated,
          fileSize: {
            json: instrumentsSize,
            csv: data.csv_metadata?.size || 0,
          },
          recordCount: data.record_count || 0,
          files: ["instruments_cache (Supabase)"],
          cacheAge: cacheAge,
          tableExists: true,
          connectionStatus: "connected",
          error: null,
          dataIntegrity: {
            hasValidInstruments,
            recordCountMatches,
            dataSizeMB: data.data_size_mb || 0,
            segmentsIncluded: data.segments_included || [],
            csvMetadata: data.csv_metadata || null,
          },
        }
      }
    } catch (fetchError) {
      console.error("Error fetching status:", fetchError)

      if (fetchError.message.includes("fetch") || fetchError.message.includes("network")) {
        status.error = "Network error connecting to Supabase. Check your internet connection and SUPABASE_URL."
        status.connectionStatus = "network_error"
      } else {
        status.error = `Failed to check status: ${fetchError.message}`
        status.connectionStatus = "error"
      }

      status.tableExists = false
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error("Error in status check:", error)

    return NextResponse.json({
      hasData: false,
      lastUpdated: null,
      fileSize: null,
      recordCount: 0,
      files: [],
      source: "Memory/Supabase Cache",
      cacheAge: null,
      tableExists: false,
      connectionStatus: "error",
      supabaseConfigured: false,
      error: `Status check failed: ${error.message}`,
      dataIntegrity: null,
    })
  }
}
