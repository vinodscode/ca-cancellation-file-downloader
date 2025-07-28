"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Download } from "lucide-react"

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

interface CompanyData {
  baseSymbol: string
  name: string
  symbols: Instrument[]
}

interface SymbolSearchProps {
  instruments: Instrument[]
}

export function SymbolSearch({ instruments }: SymbolSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSegment, setSelectedSegment] = useState("all")
  const [selectedCorporateAction, setSelectedCorporateAction] = useState("")

  // Group instruments by company
  const companiesData = useMemo(() => {
    const companyMap = new Map<string, CompanyData>()

    instruments.forEach((instrument) => {
      // Extract base symbol (remove expiry and strike info)
      let baseSymbol = instrument.tradingsymbol
      if (instrument.instrument_type !== "EQ") {
        // For derivatives, extract the base symbol
        baseSymbol = instrument.tradingsymbol.replace(/\d{2}[A-Z]{3}\d{2,4}(CE|PE|FUT).*/, "")
        baseSymbol = baseSymbol.replace(/\d{2}[A-Z]{3}(FUT|CE|PE).*/, "")
        baseSymbol = baseSymbol.replace(/(FUT|CE|PE).*/, "")
      }

      if (!companyMap.has(baseSymbol)) {
        companyMap.set(baseSymbol, {
          baseSymbol,
          name: instrument.name,
          symbols: [],
        })
      }

      companyMap.get(baseSymbol)!.symbols.push(instrument)
    })

    return Array.from(companyMap.values()).sort((a, b) => a.baseSymbol.localeCompare(b.baseSymbol))
  }, [instruments])

  // Filter companies based on search and segment
  const filteredCompanies = useMemo(() => {
    return companiesData.filter((company) => {
      const matchesSearch =
        searchTerm === "" ||
        company.baseSymbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.name.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesSegment =
        selectedSegment === "all" || company.symbols.some((symbol) => symbol.segment === selectedSegment)

      return matchesSearch && matchesSegment
    })
  }, [companiesData, searchTerm, selectedSegment])

  const exportCompanySymbols = (companyData: CompanyData) => {
    if (!selectedCorporateAction) {
      alert("Please select a Corporate Action type before exporting.")
      return
    }

    // Sort symbols in the specified order: NSE, BSE, NFO Futures, NFO Options
    const sortedSymbols = [...companyData.symbols].sort((a, b) => {
      const order = { NSE: 1, BSE: 2, "NFO-FUT": 3, "NFO-OPT": 4 }
      const aOrder = order[a.segment] || 5
      const bOrder = order[b.segment] || 5

      if (aOrder !== bOrder) {
        return aOrder - bOrder
      }

      // Within the same segment, sort alphabetically
      return a.tradingsymbol.localeCompare(b.tradingsymbol)
    })

    // Create formatted symbols with exchange prefix
    const formattedSymbols = sortedSymbols.map((symbol) => {
      const exchange = symbol.segment === "NFO-FUT" || symbol.segment === "NFO-OPT" ? "NFO" : symbol.segment
      return `${exchange}:${symbol.tradingsymbol}`
    })

    // Create the text content with heading
    const heading = `Corporate Action - ${selectedCorporateAction}`
    const txtContent = `${heading}\n${formattedSymbols.join("\n")}`

    // Generate filename with current date
    const now = new Date()
    const day = now.getDate().toString().padStart(2, "0")
    const month = now.toLocaleDateString("en-US", { month: "short" })
    const year = now.getFullYear()

    const filename = `CA_${selectedCorporateAction.replace(/\s+/g, "_")}_${day}_${month}_${year}.txt`

    // Create and download the file
    const blob = new Blob([txtContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const corporateActions = ["Stock Split", "Bonus", "Demerger", "Dividend", "Rights Issue"]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Symbol Search & Export
        </CardTitle>
        <CardDescription>Search for companies and export their trading symbols for corporate actions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by company name or symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Select value={selectedSegment} onValueChange={setSelectedSegment}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Segments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                <SelectItem value="NSE">NSE</SelectItem>
                <SelectItem value="BSE">BSE</SelectItem>
                <SelectItem value="NFO-FUT">NFO-FUT</SelectItem>
                <SelectItem value="NFO-OPT">NFO-OPT</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCorporateAction} onValueChange={setSelectedCorporateAction}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Corporate Action" />
              </SelectTrigger>
              <SelectContent>
                {corporateActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredCompanies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No companies found matching your search criteria.</p>
            </div>
          ) : (
            filteredCompanies.map((companyData) => (
              <div key={companyData.baseSymbol} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{companyData.baseSymbol}</h3>
                    <p className="text-sm text-muted-foreground">{companyData.name}</p>
                  </div>
                  <Button
                    onClick={() => exportCompanySymbols(companyData)}
                    size="sm"
                    className="flex items-center gap-2"
                    disabled={!selectedCorporateAction}
                  >
                    <Download className="h-4 w-4" />
                    Export ({companyData.symbols.length})
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {companyData.symbols.map((symbol, index) => (
                    <Badge
                      key={index}
                      variant={
                        symbol.segment === "NSE"
                          ? "default"
                          : symbol.segment === "BSE"
                            ? "secondary"
                            : symbol.segment === "NFO-FUT"
                              ? "destructive"
                              : "outline"
                      }
                      className="text-xs"
                    >
                      {symbol.segment}: {symbol.tradingsymbol}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {filteredCompanies.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Found {filteredCompanies.length} companies with{" "}
            {filteredCompanies.reduce((total, company) => total + company.symbols.length, 0)} total symbols
          </div>
        )}
      </CardContent>
    </Card>
  )
}
