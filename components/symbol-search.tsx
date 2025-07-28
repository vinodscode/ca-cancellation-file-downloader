"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

interface SymbolSearchProps {
  instruments: Instrument[]
}

export function SymbolSearch({ instruments }: SymbolSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()
  const [selectedCorporateActions, setSelectedCorporateActions] = useState<Record<string, string>>({})

  const setSelectedCorporateAction = (baseSymbol: string, actionType: string) => {
    setSelectedCorporateActions((prev) => ({
      ...prev,
      [baseSymbol]: actionType,
    }))
  }

  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return []

    return instruments.filter(
      (instrument) =>
        instrument.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instrument.tradingsymbol.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [instruments, searchTerm])

  // Group results by company/underlying
  const groupedResults = useMemo(() => {
    const groups = {}

    searchResults.forEach((instrument) => {
      // Extract base symbol (remove expiry and strike info)
      let baseSymbol = instrument.tradingsymbol

      // For derivatives, extract the underlying symbol
      if (instrument.segment === "NFO-FUT" || instrument.segment === "NFO-OPT") {
        // Remove date and strike/option type suffixes
        baseSymbol = baseSymbol.replace(/\d{2}[A-Z]{3}\d{2,4}(FUT|CE|PE)$/i, "")
        baseSymbol = baseSymbol.replace(/\d{2}[A-Z]{3}(FUT|CE|PE)$/i, "")
      }

      if (!groups[baseSymbol]) {
        groups[baseSymbol] = {
          baseSymbol,
          name: instrument.name,
          instruments: [],
        }
      }

      groups[baseSymbol].instruments.push(instrument)
    })

    return Object.values(groups)
  }, [searchResults])

  const exportCompanySymbols = (companyData) => {
    const corporateActionType = selectedCorporateActions[companyData.baseSymbol]

    if (!corporateActionType) {
      toast({
        title: "No Corporate Action Selected",
        description: "Please select a corporate action type before exporting.",
        variant: "destructive",
      })
      return
    }

    const formattedSymbols = companyData.instruments
      .map((instrument) => {
        let exchangePrefix = ""
        switch (instrument.segment) {
          case "NSE":
            exchangePrefix = "NSE:"
            break
          case "BSE":
            exchangePrefix = "BSE:"
            break
          case "NFO-FUT":
          case "NFO-OPT":
            exchangePrefix = "NFO:"
            break
          default:
            exchangePrefix = `${instrument.exchange}:`
        }
        return {
          symbol: `${exchangePrefix}${instrument.tradingsymbol}`,
          segment: instrument.segment,
          instrumentType: instrument.instrument_type,
        }
      })
      .sort((a, b) => {
        // Define the order priority
        const segmentOrder = { NSE: 1, BSE: 2, "NFO-FUT": 3, "NFO-OPT": 4 }

        // First sort by segment priority
        const segmentDiff = (segmentOrder[a.segment] || 999) - (segmentOrder[b.segment] || 999)
        if (segmentDiff !== 0) return segmentDiff

        // Within NFO, sort FUT before OPT
        if (a.segment === "NFO-FUT" && b.segment === "NFO-OPT") return -1
        if (a.segment === "NFO-OPT" && b.segment === "NFO-FUT") return 1

        // Then sort alphabetically by symbol
        return a.symbol.localeCompare(b.symbol)
      })
      .map((item) => item.symbol)

    const txtContent = `Corporate Action - ${corporateActionType.replace("_", " ")}\n${formattedSymbols.join("\n")}`

    // Generate filename with corporate action and current date
    const now = new Date()
    const day = now.getDate().toString().padStart(2, "0")
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const month = monthNames[now.getMonth()]
    const year = now.getFullYear()

    const filename = `CA_${corporateActionType}_${day}_${month}_${year}.txt`

    const blob = new Blob([txtContent], { type: "text/plain" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Export Complete",
      description: `Exported ${formattedSymbols.length} symbols for ${corporateActionType} corporate action to ${filename}.`,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Symbol Search & Export
        </CardTitle>
        <CardDescription>Search for specific companies and export all their trading symbols</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search company name or symbol (e.g., MOTHERSON, RELIANCE, TCS)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {searchTerm.length >= 2 && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Found {groupedResults.length} companies with {searchResults.length} total instruments
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {groupedResults.map((companyData, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{companyData.baseSymbol}</h3>
                      <p className="text-sm text-muted-foreground">{companyData.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select onValueChange={(value) => setSelectedCorporateAction(companyData.baseSymbol, value)}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Select CA Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Stock_Split">Stock Split</SelectItem>
                          <SelectItem value="Bonus">Bonus</SelectItem>
                          <SelectItem value="Demerger">Demerger</SelectItem>
                          <SelectItem value="Dividend">Dividend</SelectItem>
                          <SelectItem value="Rights_issue">Rights Issue</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => exportCompanySymbols(companyData)}
                        size="sm"
                        className="flex items-center gap-2"
                        disabled={!selectedCorporateActions[companyData.baseSymbol]}
                      >
                        <FileText className="h-4 w-4" />
                        Export ({companyData.instruments.length})
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {companyData.instruments.slice(0, 10).map((instrument, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {instrument.segment === "NFO-FUT" || instrument.segment === "NFO-OPT"
                          ? "NFO:"
                          : `${instrument.segment}:`}
                        {instrument.tradingsymbol}
                      </Badge>
                    ))}
                    {companyData.instruments.length > 10 && (
                      <Badge variant="secondary" className="text-xs">
                        +{companyData.instruments.length - 10} more
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Segments: {Array.from(new Set(companyData.instruments.map((i) => i.segment))).join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {searchTerm.length >= 2 && groupedResults.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">No companies found matching "{searchTerm}"</div>
        )}
      </CardContent>
    </Card>
  )
}
