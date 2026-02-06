export const format = {
  date: (date: Date | string): string => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  },
  
  phone: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  },
  
  mileage: (miles: number): string => {
    return `${miles.toLocaleString()} mi`
  }
}
