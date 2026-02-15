import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { CustomerStatus } from '@prisma/client'
import { Search, Filter } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CustomerFiltersProps {
  searchQuery?: string
  statusFilter?: string
}

export function CustomerFilters({ searchQuery, statusFilter }: CustomerFiltersProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <form className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input name="search" placeholder="Search by name, phone, or email..." className="pl-9" defaultValue={searchQuery} />
            </div>
            <Button type="submit" variant="secondary">Search</Button>
          </form>
          <form className="flex gap-2">
            <Select name="status" defaultValue={statusFilter || 'all'}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value={CustomerStatus.overdue}>Overdue</SelectItem>
                <SelectItem value={CustomerStatus.due_now}>Due Now</SelectItem>
                <SelectItem value={CustomerStatus.due_soon}>Due Soon</SelectItem>
                <SelectItem value={CustomerStatus.up_to_date}>Up to Date</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">Filter</Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
