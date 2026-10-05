import React, { useEffect, useState } from 'react'
import { animate } from 'framer-motion'

export const AnimatedNumber = ({
  value = 0,
  prefix = '',
  suffix = '',
  duration = 1.0,
  formatCurrency = true,
  className = ''
}) => {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const target = Number(value) || 0
    const controls = animate(0, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest))
      }
    })
    return () => controls.stop()
  }, [value, duration])

  const formattedStr = formatCurrency
    ? displayValue.toLocaleString()
    : displayValue.toString()

  return (
    <span className={className}>
      {prefix}{formattedStr}{suffix}
    </span>
  )
}
