'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'

interface VehicleInput {
  year: string
  make: string
  model: string
  licensePlate: string
}

export function AddCustomerForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [vehicles, setVehicles] = useState<VehicleInput[]>([{
    year: '',
    make: '',
    model: '',
    licensePlate: ''
  }])

  const addVehicle = () => {
    setVehicles([...vehicles, { year: '', make: '', model: '', licensePlate: '' }])
  }

  const removeVehicle = (index: number) => {
    setVehicles(vehicles.filter((_, i) => i !== index))
  }

  const updateVehicle = (index: number, field: keyof VehicleInput, value: string) => {
    const newVehicles = [...vehicles]
    newVehicles[index][field] = value
    setVehicles(newVehicles)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    
    const validVehicles = vehicles.filter(v => v.year && v.make && v.model)
    
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.get('firstName'),
          lastName: formData.get('lastName'),
          phone: formData.get('phone'),
          email: formData.get('email'),
          vehicles: validVehicles.map(v => ({
            year: parseInt(v.year),
            make: v.make,
            model: v.model,
            licensePlate: v.licensePlate || null
          }))
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        router.push(`/customers/${data.id}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input id="lastName" name="lastName" required />
        </div>
      </div>
      
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input id="phone" name="phone" type="tel" placeholder="(555) 123-4567" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="customer@example.com" />
        </div>
      </div>
      
      <Separator />
      
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Vehicles</h3>
          <Button type="button" variant="outline" size="sm" onClick={addVehicle} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Vehicle
          </Button>
        </div>
        
        <div className="space-y-4">
          {vehicles.map((vehicle, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">Vehicle {index + 1}</span>
                {vehicles.length > 1 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeVehicle(index)}
                    className="text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Year *</Label>
                  <Input 
                    type="number" 
                    placeholder="2020"
                    value={vehicle.year}
                    onChange={(e) => updateVehicle(index, 'year', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">Make *</Label>
                  <Input 
                    placeholder="Toyota"
                    value={vehicle.make}
                    onChange={(e) => updateVehicle(index, 'make', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">Model *</Label>
                  <Input 
                    placeholder="Camry"
                    value={vehicle.model}
                    onChange={(e) => updateVehicle(index, 'model', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">License Plate</Label>
                  <Input 
                    placeholder="ABC123"
                    value={vehicle.licensePlate}
                    onChange={(e) => updateVehicle(index, 'licensePlate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating...' : 'Create Customer'}
      </Button>
    </form>
  )
}
