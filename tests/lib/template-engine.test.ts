import { describe, it, expect } from 'vitest'
import { renderTemplate, DEFAULT_TEMPLATES } from '@/lib/template-engine'

describe('renderTemplate', () => {
  it('replaces single variable', () => {
    const result = renderTemplate('Hello {{name}}!', { name: 'John' })
    expect(result).toBe('Hello John!')
  })

  it('replaces multiple variables', () => {
    const result = renderTemplate('{{greeting}} {{name}}, welcome to {{place}}!', {
      greeting: 'Hi',
      name: 'John',
      place: 'OttoShop',
    })
    expect(result).toBe('Hi John, welcome to OttoShop!')
  })

  it('replaces same variable multiple times', () => {
    const result = renderTemplate('{{name}} is {{name}}', { name: 'John' })
    expect(result).toBe('John is John')
  })

  it('handles numeric values', () => {
    const result = renderTemplate('Due at {{mileage}} miles', { mileage: 55000 })
    expect(result).toBe('Due at 55000 miles')
  })

  it('handles whitespace in template tags', () => {
    const result = renderTemplate('Hello {{ name }}!', { name: 'John' })
    expect(result).toBe('Hello John!')
  })

  it('leaves unmatched placeholders intact', () => {
    const result = renderTemplate('Hello {{name}}, your {{missing}} is ready', {
      name: 'John',
    })
    expect(result).toBe('Hello John, your {{missing}} is ready')
  })

  it('handles empty template', () => {
    const result = renderTemplate('', { name: 'John' })
    expect(result).toBe('')
  })

  it('handles empty data', () => {
    const result = renderTemplate('Hello World!', {})
    expect(result).toBe('Hello World!')
  })

  it('renders array with two items using "and"', () => {
    const result = renderTemplate('Services: {{serviceList}}', {
      serviceList: ['Oil Change', 'Tire Rotation'],
    })
    expect(result).toBe('Services: Oil Change and Tire Rotation')
  })

  it('renders array with three+ items using Oxford comma', () => {
    const result = renderTemplate('Services: {{serviceList}}', {
      serviceList: ['Oil Change', 'Tire Rotation', 'Brake Inspection'],
    })
    expect(result).toBe('Services: Oil Change, Tire Rotation, and Brake Inspection')
  })

  it('renders array with single item', () => {
    const result = renderTemplate('Service: {{serviceList}}', {
      serviceList: ['Oil Change'],
    })
    expect(result).toBe('Service: Oil Change')
  })

  it('renders twoWeeksBefore template correctly', () => {
    const result = renderTemplate(DEFAULT_TEMPLATES.twoWeeksBefore, {
      firstName: 'John',
      shopName: 'Otto Auto',
      serviceType: 'Oil Change',
      dueDate: 'Mar 15, 2026',
      shopPhone: '(555) 123-4567',
    })
    expect(result).toContain('John')
    expect(result).toContain('Otto Auto')
    expect(result).toContain('Oil Change')
    expect(result).toContain('Mar 15, 2026')
    expect(result).toContain('(555) 123-4567')
    expect(result).toContain('BOOK')
    expect(result).toContain('STOP')
  })

  it('renders dueDateReminder template correctly', () => {
    const result = renderTemplate(DEFAULT_TEMPLATES.dueDateReminder, {
      firstName: 'Jane',
      shopName: 'Quick Lube',
      serviceType: 'Tire Rotation',
      shopPhone: '(555) 987-6543',
    })
    expect(result).toContain('Jane')
    expect(result).toContain('Quick Lube')
    expect(result).toContain('Tire Rotation')
    expect(result).toContain('BOOK')
  })

  it('renders oneWeekOverdue template correctly', () => {
    const result = renderTemplate(DEFAULT_TEMPLATES.oneWeekOverdue, {
      firstName: 'Bob',
      shopName: 'AutoCare',
      serviceType: 'State Inspection',
      vehicleYear: 2020,
      vehicleMake: 'Toyota',
      shopPhone: '(555) 111-2222',
    })
    expect(result).toContain('Bob')
    expect(result).toContain('overdue')
    expect(result).toContain('2020')
    expect(result).toContain('Toyota')
  })

  it('renders oneWeekBefore template correctly', () => {
    const result = renderTemplate(DEFAULT_TEMPLATES.oneWeekBefore, {
      firstName: 'Alice',
      shopName: 'Pro Auto',
      serviceType: 'Brake Pad Inspection',
      dueDate: 'Apr 1',
      shopPhone: '(555) 333-4444',
    })
    expect(result).toContain('Alice')
    expect(result).toContain('Pro Auto')
    expect(result).toContain('next week')
    expect(result).toContain('BOOK')
  })

  it('renders twoWeeksOverdue template correctly', () => {
    const result = renderTemplate(DEFAULT_TEMPLATES.twoWeeksOverdue, {
      firstName: 'Dave',
      shopName: 'Quick Fix',
      serviceType: 'Coolant Flush',
      shopPhone: '(555) 555-6666',
    })
    expect(result).toContain('Dave')
    expect(result).toContain('2 weeks overdue')
    expect(result).toContain('BOOK')
  })

  it('legacy aliases work', () => {
    expect(DEFAULT_TEMPLATES.firstReminder).toBe(DEFAULT_TEMPLATES.twoWeeksBefore)
    expect(DEFAULT_TEMPLATES.overdueReminder).toBe(DEFAULT_TEMPLATES.oneWeekOverdue)
  })
})

describe('DEFAULT_TEMPLATES', () => {
  it('has multi-service and follow-up templates', () => {
    expect(DEFAULT_TEMPLATES).toHaveProperty('multiServiceDue')
    expect(DEFAULT_TEMPLATES).toHaveProperty('followUpSatisfaction')
    expect(DEFAULT_TEMPLATES).toHaveProperty('followUpReview')
    expect(DEFAULT_TEMPLATES.multiServiceDue).toContain('{{serviceList}}')
    expect(DEFAULT_TEMPLATES.followUpSatisfaction).toContain('STOP')
    expect(DEFAULT_TEMPLATES.followUpReview).toContain('STOP')
  })

  it('renders multiServiceDue template with array', () => {
    const result = renderTemplate(DEFAULT_TEMPLATES.multiServiceDue, {
      firstName: 'John',
      vehicleYear: 2020,
      vehicleMake: 'Honda',
      shopName: 'Otto Auto',
      shopPhone: '(555) 123-4567',
      serviceList: ['Oil Change', 'Tire Rotation'],
    })
    expect(result).toContain('Oil Change and Tire Rotation')
    expect(result).toContain('2020')
    expect(result).toContain('Honda')
  })

  it('has all five required templates', () => {
    expect(DEFAULT_TEMPLATES).toHaveProperty('twoWeeksBefore')
    expect(DEFAULT_TEMPLATES).toHaveProperty('oneWeekBefore')
    expect(DEFAULT_TEMPLATES).toHaveProperty('dueDateReminder')
    expect(DEFAULT_TEMPLATES).toHaveProperty('oneWeekOverdue')
    expect(DEFAULT_TEMPLATES).toHaveProperty('twoWeeksOverdue')
  })

  it('has legacy aliases', () => {
    expect(DEFAULT_TEMPLATES).toHaveProperty('firstReminder')
    expect(DEFAULT_TEMPLATES).toHaveProperty('overdueReminder')
  })

  it('all templates include opt-out language', () => {
    expect(DEFAULT_TEMPLATES.twoWeeksBefore).toContain('STOP')
    expect(DEFAULT_TEMPLATES.oneWeekBefore).toContain('STOP')
    expect(DEFAULT_TEMPLATES.dueDateReminder).toContain('STOP')
    expect(DEFAULT_TEMPLATES.oneWeekOverdue).toContain('STOP')
    expect(DEFAULT_TEMPLATES.twoWeeksOverdue).toContain('STOP')
  })
})
