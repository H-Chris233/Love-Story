const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

export function parseCalendarDate(value: string): { year: number; month: number; day: number } {
  const match = DATE_PATTERN.exec(value)
  if (!match) throw new Error(`Invalid date: ${value}`)
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
    throw new Error(`Invalid date: ${value}`)
  }
  return { year, month, day }
}
