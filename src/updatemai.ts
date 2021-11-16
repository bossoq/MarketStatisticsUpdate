import { createClient, SupabaseClient } from '@supabase/supabase-js'
import axios from 'axios'
import * as cheerio from 'cheerio'
import dotenv from 'dotenv'
import { getTimestamp } from './gettimestamp'

// interface
import type {
  PostgrestResponse,
  PostgrestSingleResponse,
} from '@supabase/supabase-js'
import type { MAIInfoOfficial, MAIReturnOfficial } from './fetchtypes'
import type { MAIInfo, MAIReturn } from './dbtypes'

dotenv.config()

const supabaseUrl: string = process.env.SUPABASEURL || ''
const supabaseApiKey: string = process.env.SUPABASEAPI || ''

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseApiKey)

export const updateMAIIndex = async () => {
  const fetchHTML = async (url: string): Promise<string> => {
    const response = await axios(url)
    return response.data
  }

  const maiIndexUrl = 'https://www.set.or.th/static/mktstat/Table_Index.xls'
  const maiHTML = await fetchHTML(maiIndexUrl)
  const divYieldUrl = 'https://www.set.or.th/static/mktstat/Table_Yield.xls'
  const divYieldHTML = await fetchHTML(divYieldUrl)

  const fetchMAIData = async (): Promise<MAIInfoOfficial[]> => {
    let records: MAIInfoOfficial[] = []
    const maiHTMLDOM = cheerio.load(maiHTML)
    const maiTableLength = maiHTMLDOM(
      'body > table:nth-child(2) > thead:nth-child(2) > tr > td:nth-child(10)'
    ).length
    const divHTMLDOM = cheerio.load(divYieldHTML)
    const divTableLength = divHTMLDOM(
      'body > table:nth-child(2) > tbody > tr > td:nth-child(10)'
    ).length
    if (maiTableLength && divTableLength) {
      if (maiTableLength === divTableLength - 1) {
        for (let i = 1; i < maiTableLength + 1 - 329; i++) {
          const [month, year]: string[] = maiHTMLDOM(
            `body > table:nth-child(2) > thead:nth-child(2) > tr:nth-child(${i}) > td:nth-child(1)`
          )
            .text()
            .split('-')
          const maiindex: number = parseFloat(
            maiHTMLDOM(
              `body > table:nth-child(2) > thead:nth-child(2) > tr:nth-child(${i}) > td:nth-child(10)`
            )
              .text()
              .replace(',', '')
          )
          const divyield: number = parseFloat(
            divHTMLDOM(
              `body > table:nth-child(2) > tbody > tr:nth-child(${
                i + 1
              }) > td:nth-child(10)`
            )
              .text()
              .replace(',', '')
          )
          const record: MAIInfoOfficial = {
            year: parseInt(year),
            month,
            maiindex,
            divyield,
          }
          records.push(record)
        }
      }
    }
    return records.reverse()
  }

  const lastMAIRecords = async (): Promise<MAIInfo> => {
    const { data }: PostgrestSingleResponse<MAIInfo> = await supabase
      .from<MAIInfo>('MAI_Info')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single()
    const lastMAIRecords: MAIInfo = Object.assign(data || [])
    return lastMAIRecords
  }

  const fetchMAI: MAIInfoOfficial[] = await fetchMAIData()
  const lastMAI: MAIInfo = await lastMAIRecords()
  const lastMAIIndex: number = fetchMAI.findIndex(
    (records) =>
      records.year === lastMAI.year &&
      records.month?.toString() === lastMAI.month
  )

  fetchMAI.forEach((record: MAIInfoOfficial) => {
    Object.keys(record).forEach((key: string) => {
      const unknownKey = key as keyof MAIInfoOfficial
      if (
        record[unknownKey] === null &&
        unknownKey !== 'year' &&
        unknownKey !== 'month'
      ) {
        record[unknownKey] = 0
      }
    })
  })

  if (fetchMAI.length - lastMAIIndex > 1) {
    const { error }: PostgrestResponse<MAIInfo> = await supabase
      .from<MAIInfo>('MAI_Info')
      .insert(fetchMAI.slice(lastMAIIndex + 1))
    if (error === null) {
      console.log(
        `[INFO] [${getTimestamp()}] Update mai Market Index ${
          fetchMAI.length - lastMAIIndex - 1
        } records`
      )
    } else {
      console.log(
        `[WARN] [${getTimestamp()}] Unable to update mai Market Index`
      )
    }
  } else {
    console.log(`[INFO] [${getTimestamp()}] No New mai Market Index Data`)
  }

  const calMAIReturn = (): MAIReturnOfficial[] => {
    let records: MAIReturnOfficial[] = []
    for (let i = 0; i < fetchMAI.length; i++) {
      const year = fetchMAI[i].year
      const month = fetchMAI[i].month
      let monthly_return: number
      let monthly_tri: number
      if (i > 0) {
        const curMAI: number = fetchMAI[i].maiindex || 0
        const prevMAI: number = fetchMAI[i - 1].maiindex || 1
        const curDIV: number = fetchMAI[i].divyield || 0
        monthly_return = ((curMAI / prevMAI) ** 12 - 1) * 100
        monthly_tri = monthly_return + curDIV
      } else {
        monthly_return = 0
        monthly_tri = 0
      }
      let yearly_return: number
      let yearly_tri: number
      if (i > 11) {
        const curMAI: number = fetchMAI[i].maiindex || 0
        const prevMAI: number = fetchMAI[i - 12].maiindex || 1
        const curDIV: number = fetchMAI[i].divyield || 0
        yearly_return = (curMAI / prevMAI - 1) * 100
        yearly_tri = yearly_return + curDIV
      } else {
        yearly_return = 0
        yearly_tri = 0
      }
      const record: MAIReturnOfficial = {
        year,
        month,
        yearly_return,
        monthly_return,
        yearly_tri,
        monthly_tri,
      }
      records.push(record)
    }
    return records
  }

  const lastMAIReturnRecords = async (): Promise<MAIReturn> => {
    const { data }: PostgrestSingleResponse<MAIReturn> = await supabase
      .from<MAIInfo>('MAI_Return')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single()
    const lastMAIReturnRecords: MAIReturn = Object.assign(data || [])
    return lastMAIReturnRecords
  }

  const calMAI: MAIInfoOfficial[] = calMAIReturn()
  const lastMAIReturn: MAIReturn = await lastMAIReturnRecords()
  const lastMAIReturnIndex: number = calMAI.findIndex(
    (records) =>
      records.year === lastMAIReturn.year &&
      records.month?.toString() === lastMAIReturn.month
  )

  if (calMAI.length - lastMAIReturnIndex > 1) {
    const { error }: PostgrestResponse<MAIReturn> = await supabase
      .from<MAIReturn>('MAI_Return')
      .insert(calMAI.slice(lastMAIReturnIndex + 1))
    if (error === null) {
      console.log(
        `[INFO] [${getTimestamp()}] Update mai Market Return ${
          calMAI.length - lastMAIReturnIndex - 1
        } records`
      )
    } else {
      console.log(
        `[WARN] [${getTimestamp()}] Unable to update mai Market Return`
      )
    }
  } else {
    console.log(`[INFO] [${getTimestamp()}] No New mai Market Return Data`)
  }
}
