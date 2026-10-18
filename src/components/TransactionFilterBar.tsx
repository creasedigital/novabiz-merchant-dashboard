import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import { Button } from '@/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/ui/select'
import { useAppStore, type FilterStatus, type FilterType } from '@/store/useAppStore'
import { Search, RotateCcw, Filter } from 'lucide-react'

export function TransactionFilterBar() {
  const { filters, setFilters, resetFilters } = useAppStore()

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.type !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.searchQuery !== ''

  return (
    <div
      role="search"
      aria-label="Transaction Filters"
      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Filter Transactions
          </h2>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 h-8 px-2"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset all
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
        {/* Search Input */}
        <div className="sm:col-span-2 lg:col-span-4 space-y-1.5">
          <Label htmlFor="tx-search-input" className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Search
          </Label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <Input
              id="tx-search-input"
              type="text"
              placeholder="Search narration, name, NUBAN, ref..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
              className="pl-9 h-10 text-sm"
            />
          </div>
        </div>

        {/* Status Select */}
        <div className="lg:col-span-2 space-y-1.5">
          <Label htmlFor="status-select-trigger" className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Status
          </Label>
          <Select
            value={filters.status}
            onValueChange={(val) => setFilters({ status: val as FilterStatus })}
          >
            <SelectTrigger id="status-select-trigger" className="h-10 text-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="successful">Successful</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Type Select */}
        <div className="lg:col-span-2 space-y-1.5">
          <Label htmlFor="type-select-trigger" className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Type
          </Label>
          <Select
            value={filters.type}
            onValueChange={(val) => setFilters({ type: val as FilterType })}
          >
            <SelectTrigger id="type-select-trigger" className="h-10 text-sm">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="credit">Credit (Inflow)</SelectItem>
              <SelectItem value="debit">Debit (Outflow)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="lg:col-span-2 space-y-1.5">
          <Label htmlFor="date-from-input" className="text-xs font-medium text-gray-600 dark:text-gray-400">
            From Date
          </Label>
          <Input
            id="date-from-input"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ dateFrom: e.target.value })}
            className="h-10 text-sm"
          />
        </div>

        {/* Date To */}
        <div className="lg:col-span-2 space-y-1.5">
          <Label htmlFor="date-to-input" className="text-xs font-medium text-gray-600 dark:text-gray-400">
            To Date
          </Label>
          <Input
            id="date-to-input"
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ dateTo: e.target.value })}
            className="h-10 text-sm"
          />
        </div>
      </div>
    </div>
  )
}
