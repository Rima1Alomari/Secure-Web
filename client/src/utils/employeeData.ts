/**
 * Employee Data Utility
 * Parses and processes the Employee.csv demo dataset
 * Used for admin dashboards and analytics
 */

export interface Employee {
  Education: string
  JoiningYear: number
  City: string
  PaymentTier: number
  Age: number
  Gender: string
  EverBenched: string
  ExperienceInCurrentDomain: number
  LeaveOrNot: number // 0 = Stayed, 1 = Left
}

let cachedEmployees: Employee[] | null = null

/**
 * Parse CSV file and return employee data
 * Caches the result for subsequent calls
 */
export async function loadEmployeeData(): Promise<Employee[]> {
  if (cachedEmployees) {
    return cachedEmployees
  }

  try {
    // Fetch from public folder (served as static asset)
    const response = await fetch('/data/Employee.csv')
    if (!response.ok) {
      console.warn('Employee data not available, using empty dataset')
      return []
    }
    
    const csvText = await response.text()
    const lines = csvText.trim().split('\n')
    
    // Skip header row
    const headers = lines[0].split(',').map(h => h.trim())
    const employees: Employee[] = []
    
    // Simple CSV parser (handles basic cases)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const values = line.split(',').map(v => v.trim())
      if (values.length >= headers.length) {
        try {
          employees.push({
            Education: values[0] || '',
            JoiningYear: parseInt(values[1] || '0', 10) || 0,
            City: values[2] || '',
            PaymentTier: parseInt(values[3] || '0', 10) || 0,
            Age: parseInt(values[4] || '0', 10) || 0,
            Gender: values[5] || '',
            EverBenched: values[6] || '',
            ExperienceInCurrentDomain: parseInt(values[7] || '0', 10) || 0,
            LeaveOrNot: parseInt(values[8] || '0', 10) || 0
          })
        } catch (error) {
          console.warn(`Skipping invalid row ${i}:`, error)
        }
      }
    }
    
    cachedEmployees = employees
    return employees
  } catch (error) {
    console.error('Error loading employee data:', error)
    // Return empty array in case of error
    return []
  }
}

/**
 * Get employee distribution by city
 */
export function getDistributionByCity(employees: Employee[]): Record<string, number> {
  const distribution: Record<string, number> = {}
  employees.forEach(emp => {
    distribution[emp.City] = (distribution[emp.City] || 0) + 1
  })
  return distribution
}

/**
 * Get employee distribution by education
 */
export function getDistributionByEducation(employees: Employee[]): Record<string, number> {
  const distribution: Record<string, number> = {}
  employees.forEach(emp => {
    distribution[emp.Education] = (distribution[emp.Education] || 0) + 1
  })
  return distribution
}

/**
 * Get employee distribution by payment tier
 */
export function getDistributionByPaymentTier(employees: Employee[]): Record<string, number> {
  const distribution: Record<string, number> = {}
  employees.forEach(emp => {
    const tier = `Tier ${emp.PaymentTier}`
    distribution[tier] = (distribution[tier] || 0) + 1
  })
  return distribution
}

/**
 * Get attrition summary
 */
export function getAttritionSummary(employees: Employee[]): {
  total: number
  left: number
  stayed: number
  attritionRate: number
} {
  const total = employees.length
  const left = employees.filter(emp => emp.LeaveOrNot === 1).length
  const stayed = total - left
  const attritionRate = total > 0 ? (left / total) * 100 : 0
  
  return {
    total,
    left,
    stayed,
    attritionRate: Math.round(attritionRate * 100) / 100 // Round to 2 decimal places
  }
}

