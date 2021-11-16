import { createClient, SupabaseClient } from '@supabase/supabase-js'
import axios from 'axios'
import dotenv from 'dotenv'
import { getTimestamp } from './gettimestamp'

// interface
import type {
  PostgrestResponse,
  PostgrestSingleResponse,
} from '@supabase/supabase-js'
import type { TBMABondYield } from './fetchtypes'
import type { BondYield } from './dbtypes'

dotenv.config()

const supabaseUrl: string = process.env.SUPABASEURL || ''
const supabaseApiKey: string = process.env.SUPABASEAPI || ''

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseApiKey)

export const updateBondYield = async () => {
  const setBondUrl = 'http://www.thaibma.or.th/yieldcurve/getintpttm?year='

  const fetchBondData = async (): Promise<TBMABondYield[]> => {
    const year = new Date().getFullYear()
    const response = await axios.get(setBondUrl + year.toString())
    return response.data
  }

  const lastBondRecords = async (): Promise<BondYield> => {
    const { data }: PostgrestSingleResponse<BondYield> = await supabase
      .from<BondYield>('Bond_Yield')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single()
    const lastBondRecords: BondYield = Object.assign(data || [])
    return lastBondRecords
  }

  const fetchBond: TBMABondYield[] = await fetchBondData()
  const lastBond: BondYield = await lastBondRecords()
  const lastIndex: number = fetchBond.findIndex(
    (records) => records.asof?.toString().slice(0, 10) === lastBond.asof
  )

  fetchBond.forEach((record: TBMABondYield) => {
    Object.keys(record).forEach((key: string) => {
      const unknownKey = key as keyof TBMABondYield
      if (record[unknownKey] === null && unknownKey !== 'asof') {
        record[unknownKey] = 0
      }
    })
  })

  if (fetchBond.length - lastIndex > 1) {
    const { error }: PostgrestResponse<BondYield> = await supabase
      .from<BondYield>('Bond_Yield')
      .insert(fetchBond.slice(lastIndex + 1))
    if (error === null) {
      console.log(
        `[INFO] [${getTimestamp()}] Update Bond Yield ${
          fetchBond.length - lastIndex - 1
        } records`
      )
    } else {
      console.log(`[WARN] [${getTimestamp()}] Unable to update Bond Yield`)
    }
  } else {
    console.log(`[INFO] [${getTimestamp()}] No New Bond Yield Data`)
  }
}
