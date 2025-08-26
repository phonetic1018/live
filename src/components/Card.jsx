import React from 'react'

const Card = ({ 
  children, 
  className = '', 
  padding = 'p-6',
  shadow = 'shadow-md',
  ...props 
}) => {
  const baseClasses = 'bg-white rounded-lg border border-gray-200'
  const classes = `${baseClasses} ${padding} ${shadow} ${className}`
  
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}

export default Card
