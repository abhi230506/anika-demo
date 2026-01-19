/**
 * Holiday and special event awareness utility
 */

export interface HolidayInfo {
  name: string
  date: string // YYYY-MM-DD format
  type: 'holiday' | 'seasonal' | 'weekday'
  priority: number // 1-10, higher = more important
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Get current date object
 */
function getCurrentDate(): Date {
  return new Date()
}

/**
 * Calculate Easter Sunday for a given year (simplified calculation)
 */
function getEaster(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

/**
 * Get holidays for the current year
 */
function getHolidaysForYear(year: number): HolidayInfo[] {
  const holidays: HolidayInfo[] = []

  // Fixed date holidays
  holidays.push(
    { name: "New Year's Day", date: `${year}-01-01`, type: 'holiday', priority: 9 },
    { name: "Valentine's Day", date: `${year}-02-14`, type: 'holiday', priority: 7 },
    { name: "St. Patrick's Day", date: `${year}-03-17`, type: 'holiday', priority: 6 },
    { name: "April Fool's Day", date: `${year}-04-01`, type: 'holiday', priority: 5 },
    { name: "Independence Day", date: `${year}-07-04`, type: 'holiday', priority: 8 },
    { name: "Halloween", date: `${year}-10-31`, type: 'holiday', priority: 7 },
    { name: "Christmas", date: `${year}-12-25`, type: 'holiday', priority: 10 },
    { name: "New Year's Eve", date: `${year}-12-31`, type: 'holiday', priority: 8 },
  )

  // Calculate variable holidays
  const easter = getEaster(year)
  const easterMonth = easter.getMonth() + 1
  const easterDay = easter.getDate()
  
  // Easter (March/April)
  holidays.push({
    name: "Easter",
    date: `${year}-${String(easterMonth).padStart(2, '0')}-${String(easterDay).padStart(2, '0')}`,
    type: 'holiday',
    priority: 8,
  })

  // Mother's Day (2nd Sunday in May)
  const mothersDay = new Date(year, 4, 1) // May 1st
  while (mothersDay.getDay() !== 0) {
    mothersDay.setDate(mothersDay.getDate() + 1)
  }
  mothersDay.setDate(mothersDay.getDate() + 7) // 2nd Sunday
  holidays.push({
    name: "Mother's Day",
    date: `${year}-05-${String(mothersDay.getDate()).padStart(2, '0')}`,
    type: 'holiday',
    priority: 8,
  })

  // Father's Day (3rd Sunday in June)
  const fathersDay = new Date(year, 5, 1) // June 1st
  while (fathersDay.getDay() !== 0) {
    fathersDay.setDate(fathersDay.getDate() + 1)
  }
  fathersDay.setDate(fathersDay.getDate() + 14) // 3rd Sunday
  holidays.push({
    name: "Father's Day",
    date: `${year}-06-${String(fathersDay.getDate()).padStart(2, '0')}`,
    type: 'holiday',
    priority: 7,
  })

  // Thanksgiving (4th Thursday in November)
  const thanksgiving = new Date(year, 10, 1) // November 1st
  while (thanksgiving.getDay() !== 4) {
    thanksgiving.setDate(thanksgiving.getDate() + 1)
  }
  thanksgiving.setDate(thanksgiving.getDate() + 21) // 4th Thursday
  holidays.push({
    name: "Thanksgiving",
    date: `${year}-11-${String(thanksgiving.getDate()).padStart(2, '0')}`,
    type: 'holiday',
    priority: 9,
  })

  return holidays
}

/**
 * Get current season
 */
function getSeason(month: number): string {
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}

/**
 * Get weekday name
 */
function getWeekdayName(day: number): string {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return weekdays[day]
}

/**
 * Check if today is a holiday
 */
export function getTodayHoliday(): HolidayInfo | null {
  const today = getToday()
  const currentYear = new Date().getFullYear()
  const holidays = getHolidaysForYear(currentYear)
  
  return holidays.find(h => h.date === today) || null
}

/**
 * Check if today is within a few days of a holiday
 */
export function getUpcomingHoliday(daysAhead: number = 7): HolidayInfo | null {
  const today = new Date(getToday())
  const currentYear = today.getFullYear()
  const nextYear = currentYear + 1
  
  const holidays = [
    ...getHolidaysForYear(currentYear),
    ...getHolidaysForYear(nextYear),
  ]
  
  for (let i = 0; i <= daysAhead; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() + i)
    const checkDateStr = checkDate.toISOString().split('T')[0]
    
    const holiday = holidays.find(h => h.date === checkDateStr)
    if (holiday) {
      return holiday
    }
  }
  
  return null
}

/**
 * Get seasonal context
 */
export function getSeasonalContext(): {
  season: string
  month: number
  weekday: string
  isWeekend: boolean
  isMonday: boolean
  isFriday: boolean
} {
  const now = getCurrentDate()
  const month = now.getMonth() + 1
  const dayOfWeek = now.getDay()
  
  return {
    season: getSeason(month),
    month,
    weekday: getWeekdayName(dayOfWeek),
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    isMonday: dayOfWeek === 1,
    isFriday: dayOfWeek === 5,
  }
}

/**
 * Check if today is someone's birthday
 */
export function isBirthdayToday(birthday: string | null): boolean {
  if (!birthday) return false
  
  try {
    // Birthday format: "MM-DD" or "YYYY-MM-DD"
    const today = getToday()
    const todayParts = today.split('-')
    const month = todayParts[1]
    const day = todayParts[2]
    
    if (birthday.includes('-')) {
      const birthdayParts = birthday.split('-')
      // Handle both "MM-DD" and "YYYY-MM-DD" formats
      const birthdayMonth = birthdayParts.length === 3 ? birthdayParts[1] : birthdayParts[0]
      const birthdayDay = birthdayParts.length === 3 ? birthdayParts[2] : birthdayParts[1]
      
      return birthdayMonth === month && birthdayDay === day
    }
    
    return false
  } catch (e) {
    return false
  }
}

/**
 * Get birthday message if today is a birthday
 */
export function getBirthdayInfo(birthday: string | null): { isToday: boolean; age?: number } | null {
  if (!birthday) return null
  
  if (isBirthdayToday(birthday)) {
    // Try to calculate age if full date is provided
    let age: number | undefined
    try {
      const today = getCurrentDate()
      const birthdayDate = new Date(birthday.includes('-') && birthday.split('-').length === 3 
        ? birthday 
        : `${today.getFullYear()}-${birthday}`)
      if (!isNaN(birthdayDate.getTime())) {
        age = today.getFullYear() - birthdayDate.getFullYear()
        const monthDiff = today.getMonth() - birthdayDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdayDate.getDate())) {
          age--
        }
      }
    } catch (e) {
      // Age calculation failed, that's okay
    }
    
    return { isToday: true, age }
  }
  
  return null
}












