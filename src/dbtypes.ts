export interface SETInfo {
  id: number
  year?: number
  month?: string
  setindex?: number
  divyield?: number
}

export interface MAIInfo {
  id: number
  year?: number
  month?: string
  maiindex?: number
  divyield?: number
}

export interface SETReturn {
  id: number
  year?: number
  month?: string
  yearly_return?: number
  monthly_return?: number
  yearly_tri?: number
  monthly_tri?: number
}

export interface MAIReturn {
  id: number
  year?: number
  month?: string
  yearly_return?: number
  monthly_return?: number
  yearly_tri?: number
  monthly_tri?: number
}

export interface BondYield {
  id: number
  asof?: Date
  '1M'?: number
  '3M'?: number
  '6M'?: number
  '1Y'?: number
  '2Y'?: number
  '3Y'?: number
  '4Y'?: number
  '5Y'?: number
  '6Y'?: number
  '7Y'?: number
  '8Y'?: number
  '9Y'?: number
  '10Y'?: number
  '11Y'?: number
  '12Y'?: number
  '13Y'?: number
  '14Y'?: number
  '15Y'?: number
  '16Y'?: number
  '17Y'?: number
  '18Y'?: number
  '19Y'?: number
  '20Y'?: number
  '21Y'?: number
  '22Y'?: number
  '23Y'?: number
  '24Y'?: number
  '25Y'?: number
  '26Y'?: number
  '27Y'?: number
  '28Y'?: number
  '29Y'?: number
  '30Y'?: number
  '31Y'?: number
  '32Y'?: number
  '33Y'?: number
  '34Y'?: number
  '35Y'?: number
  '36Y'?: number
  '37Y'?: number
  '38Y'?: number
  '39Y'?: number
  '40Y'?: number
  '41Y'?: number
  '42Y'?: number
  '43Y'?: number
  '44Y'?: number
  '45Y'?: number
  '46Y'?: number
  '47Y'?: number
  '48Y'?: number
  '49Y'?: number
  '50Y'?: number
}
