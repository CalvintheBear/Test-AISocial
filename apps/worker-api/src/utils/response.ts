// Response utilities - no longer used in public APIs after response format unification
// Kept for internal use if needed
export const ok = <T>(data: T) => ({ success: true, data })
export const fail = (code: string, message: string) => ({ success: false, code, message })


