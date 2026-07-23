export function monthlyEquivalent(amount: number, freq: string): number {
  switch (freq) {
    case 'weekly': return amount * 4.33
    case 'biweekly': return amount * 2.17
    case 'annual': return amount / 12
    default: return amount
  }
}