import { Wallet, CreditCard, TrendingUp, Home, Car, Landmark, CircleDollarSign } from 'lucide-react'
import type { components } from '@finance-app/api-spec'

type AccountType = components['schemas']['AccountType']

export const ACCOUNT_TYPE_ICONS: Record<AccountType, typeof Wallet> = {
  checking: Wallet,
  savings: Wallet,
  credit_card: CreditCard,
  investment: TrendingUp,
  real_estate: Home,
  vehicle: Car,
  loan: Landmark,
  other_asset: CircleDollarSign,
  other_debt: CircleDollarSign,
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit Card',
  investment: 'Investment',
  real_estate: 'Real Estate',
  vehicle: 'Vehicle',
  loan: 'Loan',
  other_asset: 'Other Asset',
  other_debt: 'Other Debt',
}