declare module 'fflate' {
  export function strToU8(value: string, latin1?: boolean): Uint8Array;
  export function zipSync(
    files: Record<string, Uint8Array>,
    options?: { level?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 },
  ): Uint8Array;
}
