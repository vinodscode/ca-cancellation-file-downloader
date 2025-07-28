"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Download, RefreshCw, TrendingUp, CheckSquare, Square, AlertCircle, Database } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { SymbolSearch } from "@/components/symbol-search"
import { DataStatus } from "@/components/data-status"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Instrument {
  instrument_token: string
  exchange_token: string
  tradingsymbol: string
  name: string
  last_price: string
  expiry: string
  strike: string
  tick_size: string
  lot_size: string
  instrument_type: string
  segment: string
  exchange: string
}

export default function TradingSymbolExtractor() {
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [filteredInstruments, setFilteredInstruments] = useState<Instrument[]>([])
  const [selectedSymbols, setSelectedSymbols] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)
  const [error, setError] = useState<string | null>(null)
  const [cacheInfo, setCacheInfo] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchInstruments = async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    setCacheInfo(null)

    try {
      const url = forceRefresh ? "/api/instruments?refresh=true" : "/api/instruments"
      console.log("Fetching from:", url)

      const response = await fetch(url)
      console.log("Response status:", response.status)
      console.log("Response headers:", Object.fromEntries(response.headers.entries()))

      // Check if response is actually JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text()
        console.error("Non-JSON response:", textResponse.substring(0, 500))
        throw new Error(`Server returned non-JSON response. Content-Type: ${contentType}`)
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("Received data:", {
        count: data.count,
        cached: data.cached,
        cacheStatus: data.cacheStatus,
        hasError: !!data.error,
      })

      if (data.error) {
        throw new Error(data.details || data.error)
      }

      setInstruments(data.instruments || [])
      setFilteredInstruments(data.instruments || [])

      // Set cache info for user feedback
      const cacheStatusMessages = {
        memory_cache: "Using memory cache (fastest)",
        supabase_cache: "Using Supabase cache (fast)",
        fresh_download: "Downloaded fresh data",
        force_refresh: "Force refreshed data",
        fallback_memory: "Using stale memory cache (API unavailable)",
        fallback_supabase: "Using stale Supabase cache (API unavailable)",
        no_cache: "Working without cache",
      }

      const cacheMessage = cacheStatusMessages[data.cacheStatus] || "Data loaded successfully"
      setCacheInfo(cacheMessage)

      toast({
        title: "Success",
        description: `Loaded ${data.count || 0} filtered instruments successfully`,
      })

      if (data.lastUpdated) {
        console.log("Data last updated:", new Date(data.lastUpdated).toLocaleString())
      }
    } catch (error) {
      console.error("Error fetching instruments:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setError(errorMessage)

      toast({
        title: "Error",
        description: `Failed to fetch instruments: ${errorMessage}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshInstruments = async () => {
    await fetchInstruments(true)
  }

  // Pagination logic
  const paginatedInstruments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredInstruments.slice(startIndex, endIndex)
  }, [filteredInstruments, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredInstruments.length / itemsPerPage)

  // Selection handlers
  const toggleSymbolSelection = (tradingsymbol: string) => {
    const newSelected = new Set(selectedSymbols)
    if (newSelected.has(tradingsymbol)) {
      newSelected.delete(tradingsymbol)
    } else {
      newSelected.add(tradingsymbol)
    }
    setSelectedSymbols(newSelected)
  }

  const selectAllVisible = () => {
    const newSelected = new Set(selectedSymbols)
    paginatedInstruments.forEach((instrument) => {
      newSelected.add(instrument.tradingsymbol)
    })
    setSelectedSymbols(newSelected)
  }

  const deselectAllVisible = () => {
    const newSelected = new Set(selectedSymbols)
    paginatedInstruments.forEach((instrument) => {
      newSelected.delete(instrument.tradingsymbol)
    })
    setSelectedSymbols(newSelected)
  }

  const selectAllFiltered = () => {
    const newSelected = new Set(selectedSymbols)
    filteredInstruments.forEach((instrument) => {
      newSelected.add(instrument.tradingsymbol)
    })
    setSelectedSymbols(newSelected)
  }

  const clearAllSelections = () => {
    setSelectedSymbols(new Set())
  }

  const stockInstruments = filteredInstruments.filter((instrument) => instrument.instrument_type === "EQ")
  const derivativeInstruments = filteredInstruments.filter((instrument) =>
    ["FUT", "CE", "PE"].includes(instrument.instrument_type),
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <TrendingUp className="h-8 w-8" />
          Trading Symbol Extractor
        </h1>
        <p className="text-muted-foreground">Extract trading symbols from NFO-OPT, NFO-FUT, NSE, and BSE segments</p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Database className="h-4 w-4" />
          <span>Multi-layer caching with automatic fallback</span>
        </div>
      </div>

      {/* Cache Info */}
      {cacheInfo && (
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            <strong>Cache Status:</strong> {cacheInfo}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>
                <strong>Error:</strong> {error}
              </p>
              {error.includes("Supabase") && (
                <p className="text-sm">
                  The app will continue to work using direct API calls and memory caching. Check your Supabase
                  configuration if you want persistent caching.
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Data Status */}
      <DataStatus />

      <Card>
        <CardHeader className="text-center">
          <CardTitle>Data Controls</CardTitle>
          <CardDescription>Fetch trading instruments data with intelligent multi-layer caching</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => fetchInstruments(false)} disabled={loading} className="flex items-center gap-2">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {loading ? "Loading..." : "Load Instruments"}
            </Button>

            <Button
              onClick={refreshInstruments}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2 bg-transparent"
            >
              <RefreshCw className="h-4 w-4" />
              Force Refresh
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>
              Data is fetched from <code className="bg-gray-100 px-1 rounded">https://api.kite.trade/instruments</code>
            </p>
            <p>Multi-layer caching: Memory → Supabase → Direct API with automatic fallback</p>
          </div>
        </CardContent>
      </Card>

      {/* Symbol Search */}
      {instruments.length > 0 && <SymbolSearch instruments={instruments} />}

      {/* Selection Controls */}
      {instruments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Selection Controls
            </CardTitle>
            <CardDescription>
              Selected: {selectedSymbols.size} symbols | Showing: {paginatedInstruments.length} of{" "}
              {filteredInstruments.length} instruments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={selectAllVisible} variant="outline" size="sm">
                <CheckSquare className="h-4 w-4 mr-2" />
                Select Page ({paginatedInstruments.length})
              </Button>
              <Button onClick={deselectAllVisible} variant="outline" size="sm">
                <Square className="h-4 w-4 mr-2" />
                Deselect Page
              </Button>
              <Button onClick={selectAllFiltered} variant="outline" size="sm">
                <CheckSquare className="h-4 w-4 mr-2" />
                Select All Filtered ({filteredInstruments.length})
              </Button>
              <Button onClick={clearAllSelections} variant="outline" size="sm">
                <Square className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {instruments.length > 0 && (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Instruments ({filteredInstruments.length})</TabsTrigger>
            <TabsTrigger value="stocks">Stocks ({stockInstruments.length})</TabsTrigger>
            <TabsTrigger value="derivatives">Derivatives ({derivativeInstruments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <InstrumentTable
              instruments={paginatedInstruments}
              selectedSymbols={selectedSymbols}
              onToggleSelection={toggleSymbolSelection}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredInstruments.length}
              itemsPerPage={itemsPerPage}
            />
          </TabsContent>

          <TabsContent value="stocks">
            <InstrumentTable
              instruments={stockInstruments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)}
              selectedSymbols={selectedSymbols}
              onToggleSelection={toggleSymbolSelection}
              currentPage={currentPage}
              totalPages={Math.ceil(stockInstruments.length / itemsPerPage)}
              onPageChange={setCurrentPage}
              totalItems={stockInstruments.length}
              itemsPerPage={itemsPerPage}
            />
          </TabsContent>

          <TabsContent value="derivatives">
            <InstrumentTable
              instruments={derivativeInstruments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)}
              selectedSymbols={selectedSymbols}
              onToggleSelection={toggleSymbolSelection}
              currentPage={currentPage}
              totalPages={Math.ceil(derivativeInstruments.length / itemsPerPage)}
              onPageChange={setCurrentPage}
              totalItems={derivativeInstruments.length}
              itemsPerPage={itemsPerPage}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

interface InstrumentTableProps {
  instruments: Instrument[]
  selectedSymbols: Set<string>
  onToggleSelection: (symbol: string) => void
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems: number
  itemsPerPage: number
}

function InstrumentTable({
  instruments,
  selectedSymbols,
  onToggleSelection,
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: InstrumentTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Select</TableHead>
                <TableHead>Trading Symbol</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Exchange</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Lot Size</TableHead>
                <TableHead>Expiry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instruments.map((instrument, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Checkbox
                      checked={selectedSymbols.has(instrument.tradingsymbol)}
                      onCheckedChange={() => onToggleSelection(instrument.tradingsymbol)}
                    />
                  </TableCell>
                  <TableCell className="font-mono font-medium">{instrument.tradingsymbol}</TableCell>
                  <TableCell>{instrument.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{instrument.instrument_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{instrument.exchange}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        instrument.segment === "NSE"
                          ? "default"
                          : instrument.segment === "BSE"
                            ? "secondary"
                            : instrument.segment === "NFO-FUT"
                              ? "destructive"
                              : "outline"
                      }
                    >
                      {instrument.segment}
                    </Badge>
                  </TableCell>
                  <TableCell>{instrument.lot_size}</TableCell>
                  <TableCell>{instrument.expiry || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
              {totalItems} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
