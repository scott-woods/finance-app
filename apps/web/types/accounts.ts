import type { components } from '@finance-app/api-spec'

export type Account = components['schemas']['Account']
export type AccountType = components['schemas']['AccountType']
export type AccountTypeGroup = components['schemas']['AccountTypeGroup']
export type AccountBalance = components['schemas']['AccountBalance']

export const ASSET_TYPES: AccountType[] = ['checking', 'savings', 'investment', 'real_estate', 'vehicle', 'other_asset']
export const DEBT_TYPES: AccountType[] = ['credit_card', 'loan', 'other_debt']