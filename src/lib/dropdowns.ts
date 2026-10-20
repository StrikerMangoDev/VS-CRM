import { prisma } from './prisma'

export async function getDropdownValues(sheetName: string, columnName: string) {
  const config = await prisma.dropdownConfiguration.findFirst({
    where: { sheetName, columnName },
    include: { values: { orderBy: { value: 'asc' } } }
  })
  
  return config?.values.map(v => v.value) || []
}

export async function getDropdownsForSheet(sheetName: string) {
  const configs = await prisma.dropdownConfiguration.findMany({
    where: { sheetName },
    include: { values: { orderBy: { value: 'asc' } } }
  })
  
  const dropdowns: Record<string, string[]> = {}
  for (const config of configs) {
    dropdowns[config.columnName] = config.values.map(v => v.value)
  }
  return dropdowns
}
