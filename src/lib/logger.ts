const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  debug: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  info: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: any[]) => {
    console.error(...args);
  },
};

export function logError(context: string, error: any) {
  console.error(`[${context}]`, error?.message || error);
}
