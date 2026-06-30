import { useState, useEffect, useCallback } from 'react'

type Theme = 'dark' | 'light'

export function useTheme() {
    return { theme: 'light' as const, toggleTheme: () => {} }
}
