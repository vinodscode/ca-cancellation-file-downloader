"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Download, RefreshCw, DownloadIcon, CheckSquare, Square, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { SymbolSearch } from "@/components/symbol-search"

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
  const [usingMockData, setUsingMockData] = useState(false)
  const { toast } = useToast()

  const fetchInstruments = async (forceRefresh = false) => {
    setLoading(true)
    try {
      const url = forceRefresh ? "/api/instruments?refresh=true" : "/api/instruments"
      console.log("Fetching from:", url)

      const response = await fetch(url)
      console.log("Response status:", response.status)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Received data:", {
        count: data.count,
        cached: data.cached,
        hasError: !!data.error,
      })

      setInstruments(data.instruments || [])
      setFilteredInstruments(data.instruments || [])
      setUsingMockData(!!data.error)

      const cacheStatus = data.cached ? " (from cache)" : " (fresh download)"
      const mockStatus = data.error ? " (using demo data)" : ""

      toast({
        title: data.error ? "Warning" : "Success",
        description: `Loaded ${data.count || 0} filtered instruments successfully${cacheStatus}${mockStatus}`,
        variant: data.error ? "destructive" : "default",
      })

      if (data.lastUpdated) {
        console.log("Data last updated:", new Date(data.lastUpdated).toLocaleString())
      }
    } catch (error) {
      console.error("Error fetching instruments:", error)
      toast({
        title: "Error",
        description: `Failed to fetch instruments: ${error instanceof Error ? error.message : String(error)}`,
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
          <DownloadIcon className="h-8 w-8" />
          CA Cancellation File Downloader
        </h1>
        <p className="text-muted-foreground">
          Extract trading symbols from NFO-OPT, NFO-FUT, NSE, and BSE segments for CA cancellation
        </p>
      </div>

      {/* Mock Data Warning */}
      {usingMockData && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">
                <strong>Demo Mode:</strong> Using sample data for demonstration. The Kite API may be unavailable or
                require authentication.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="text-center">
          <CardTitle>Data Controls</CardTitle>
          <CardDescription>Fetch trading instruments data</CardDescription>
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
