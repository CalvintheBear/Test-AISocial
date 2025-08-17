// Unified response types for consistent API responses
export type ApiOk<T> = { success: true; data: T }
export type ApiFail = { success: false; code: string; message: string }

export const ok = <T>(data: T): ApiOk<T> => ({ success: true, data })
export const fail = (code: string, message: string): ApiFail => ({ success: false, code, message })


