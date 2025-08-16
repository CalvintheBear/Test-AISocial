export const ok = <T>(data: T) => ({ success: true, data })
export const fail = (code: string, message: string) => ({ success: false, code, message })


