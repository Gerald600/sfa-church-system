export const camelToSnake = (obj) => {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(camelToSnake)
  const result = {}
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    result[snakeKey] = camelToSnake(obj[key])
  }
  return result
}

export const snakeToCamel = (obj) => {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(snakeToCamel)
  const result = {}
  for (const key in obj) {
    const camelKey = key.replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', '').replace('_', ''))
    result[camelKey] = snakeToCamel(obj[key])
  }
  return result
}
