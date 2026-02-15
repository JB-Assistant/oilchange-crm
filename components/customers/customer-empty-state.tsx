import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Search, Plus, Users, Inbox } from 'lucide-react'

export function CustomerEmptyState({ searchQuery }: { searchQuery?: string }) {
  if (searchQuery) {
    return (
      <div className="text-center py-12">
        <Search className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
        <p className="text-zinc-600 mb-2">No customers found</p>
        <p className="text-sm text-zinc-500 mb-4">No results for &quot;{searchQuery}&quot;</p>
        <Link href="/customers">
          <Button variant="outline">Clear Search</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Inbox className="w-10 h-10 text-zinc-400" />
      </div>
      <p className="text-zinc-600 mb-2">No customers yet</p>
      <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">
        Get started by adding your first customer. You can also import customers from a CSV file.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/customers/new">
          <Button className="gap-2"><Plus className="w-4 h-4" />Add Your First Customer</Button>
        </Link>
        <Link href="/import">
          <Button variant="outline" className="gap-2"><Users className="w-4 h-4" />Import from CSV</Button>
        </Link>
      </div>
    </div>
  )
}
