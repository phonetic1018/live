import { createClient } from '@supabase/supabase-js'

// Supabase configuration with high concurrency optimizations
const supabaseUrl = 'https://qpqqcoxgzknhvrkphvap.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwcXFjb3hnemtuaHZya3BodmFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjkzMTgsImV4cCI6MjA3MTgwNTMxOH0.NCZLItizudRiSI-Dk8DzGxUr5PXrSfdN1EoszaQfF1Q'

// Create Supabase client with high concurrency optimizations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public'
  },
  // Real-time configuration for high concurrency
  realtime: {
    params: {
      eventsPerSecond: 20 // Increased for better real-time performance
    }
  },
  // Global headers for rate limiting and monitoring
  global: {
    headers: {
      'X-Client-Info': 'quiz-app-high-concurrency',
      'X-Client-Version': '2.0.0'
    }
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

// Table names constants
export const TABLES = {
  QUIZZES: 'quizzes',
  QUESTIONS: 'questions',
  PARTICIPANTS: 'participants',
  ANSWERS: 'answers'
}

// Quiz status constants
export const QUIZ_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  COMPLETED: 'completed'
}

// Participant status constants
export const PARTICIPANT_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  COMPLETED: 'completed'
}

// Question types constants
export const QUESTION_TYPES = {
  MCQ: 'mcq',
  TRUE_FALSE: 'true_false',
  SHORT_ANSWER: 'short_answer'
}

// Performance utilities for high concurrency
export const performanceUtils = {
  // Debounce function to limit API calls
  debounce: (func, wait) => {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  },

  // Throttle function for real-time updates
  throttle: (func, limit) => {
    let inThrottle
    return function() {
      const args = arguments
      const context = this
      if (!inThrottle) {
        func.apply(context, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  },

  // Batch operations for multiple participants
  batchUpdate: async (table, updates, batchSize = 50) => {
    const batches = []
    for (let i = 0; i < updates.length; i += batchSize) {
      batches.push(updates.slice(i, i + batchSize))
    }
    
    const results = []
    for (const batch of batches) {
      const { data, error } = await supabase
        .from(table)
        .upsert(batch, { onConflict: 'id' })
      
      if (error) {
        console.error(`Batch update error for ${table}:`, error)
        throw error
      }
      results.push(data)
    }
    return results.flat()
  },

  // Optimized subscription with connection management
  createOptimizedSubscription: (channelName, table, filter, callback) => {
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: channelName
        }
      }
    })

    return channel
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: table,
          filter: filter
        }, 
        performanceUtils.throttle(callback, 100) // Throttle to 100ms
      )
      .subscribe((status) => {
        console.log(`Subscription ${channelName} status:`, status)
      })
  },

  // Connection health check
  checkConnectionHealth: async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.QUIZZES)
        .select('count')
        .limit(1)
      
      return !error
    } catch (err) {
      console.error('Connection health check failed:', err)
      return false
    }
  },

  // Retry mechanism for failed operations
  retryOperation: async (operation, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation()
      } catch (error) {
        if (i === maxRetries - 1) throw error
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
      }
    }
  },

  // Optimized query with caching
  cachedQuery: (() => {
    const cache = new Map()
    const cacheTimeout = 30000 // 30 seconds

    return async (key, queryFn) => {
      const now = Date.now()
      const cached = cache.get(key)
      
      if (cached && (now - cached.timestamp) < cacheTimeout) {
        return cached.data
      }

      try {
        const data = await queryFn()
        cache.set(key, { data, timestamp: now })
        return data
      } catch (error) {
        // Return cached data if available, even if expired
        if (cached) {
          console.warn('Using expired cache due to query error:', error)
          return cached.data
        }
        throw error
      }
    }
  })(),

  // Memory management
  cleanupCache: () => {
    const now = Date.now()
    const cacheTimeout = 30000
    
    for (const [key, value] of performanceUtils.cachedQuery.cache.entries()) {
      if (now - value.timestamp > cacheTimeout) {
        performanceUtils.cachedQuery.cache.delete(key)
      }
    }
  }
}

// Rate limiting utilities
export const rateLimiter = {
  requests: new Map(),
  
  // Simple in-memory rate limiter
  isAllowed: (key, maxRequests = 100, windowMs = 60000) => {
    const now = Date.now()
    const windowStart = now - windowMs
    
    if (!rateLimiter.requests.has(key)) {
      rateLimiter.requests.set(key, [])
    }
    
    const requests = rateLimiter.requests.get(key)
    const validRequests = requests.filter(time => time > windowStart)
    
    if (validRequests.length >= maxRequests) {
      return false
    }
    
    validRequests.push(now)
    rateLimiter.requests.set(key, validRequests)
    return true
  },

  // Clean up old entries
  cleanup: () => {
    const now = Date.now()
    const windowMs = 60000
    
    for (const [key, requests] of rateLimiter.requests.entries()) {
      const validRequests = requests.filter(time => time > now - windowMs)
      if (validRequests.length === 0) {
        rateLimiter.requests.delete(key)
      } else {
        rateLimiter.requests.set(key, validRequests)
      }
    }
  }
}

// Error handling utilities
export const errorHandler = {
  // Global error handler
  handleError: (error, context = '') => {
    console.error(`Error in ${context}:`, error)
    
    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // Add your error logging service here
      console.error('Production error:', { error, context, timestamp: new Date().toISOString() })
    }
  },

  // Retry with exponential backoff
  retryWithBackoff: async (operation, maxRetries = 5, baseDelay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation()
      } catch (error) {
        if (i === maxRetries - 1) throw error
        
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  },

  // Circuit breaker pattern
  circuitBreaker: (() => {
    const breakers = new Map()
    
    return {
      execute: async (key, operation, options = {}) => {
        const { failureThreshold = 5, timeout = 30000, resetTimeout = 60000 } = options
        
        if (!breakers.has(key)) {
          breakers.set(key, {
            failures: 0,
            lastFailure: null,
            state: 'CLOSED' // CLOSED, OPEN, HALF_OPEN
          })
        }
        
        const breaker = breakers.get(key)
        const now = Date.now()
        
        // Check if circuit is open
        if (breaker.state === 'OPEN') {
          if (now - breaker.lastFailure > resetTimeout) {
            breaker.state = 'HALF_OPEN'
          } else {
            throw new Error('Circuit breaker is OPEN')
          }
        }
        
        try {
          const result = await Promise.race([
            operation(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Operation timeout')), timeout)
            )
          ])
          
          // Success - reset failures
          breaker.failures = 0
          breaker.state = 'CLOSED'
          return result
        } catch (error) {
          breaker.failures++
          breaker.lastFailure = now
          
          if (breaker.failures >= failureThreshold) {
            breaker.state = 'OPEN'
          }
          
          throw error
        }
      }
    }
  })()
}

// Clean up rate limiter and cache every minute
setInterval(() => {
  rateLimiter.cleanup()
  performanceUtils.cleanupCache()
}, 60000)

export default supabase
