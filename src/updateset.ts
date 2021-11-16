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
import type { SETInfoOfficial, SETReturnOfficial } from './fetchtypes'
import type { SETInfo, SETReturn } from './dbtypes'

dotenv.config()

const supabaseUrl: string = process.env.SUPABASEURL || ''
const supabaseApiKey: string = process.env.SUPABASEAPI || ''

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseApiKey)

export const updateSETIndex = async () => {
  const fetchHTML = async (url: string): Promise<string> => {
    const response = await axios(url)
    return response.data
  }

  const setIndexUrl = 'https://www.set.or.th/static/mktstat/Table_Index.xls'
  const setHTML = await fetchHTML(setIndexUrl)
  const divYieldUrl = 'https://www.set.or.th/static/mktstat/Table_Yield.xls'
  const divYieldHTML = await fetchHTML(divYieldUrl)

  const fetchSETData = async (): Promise<SETInfoOfficial[]> => {
    let records: SETInfoOfficial[] = []
    const setHTMLDOM = cheerio.load(setHTML)
    const setTableLength = setHTMLDOM(
      'body > table:nth-child(2) > thead:nth-child(2) > tr > td:nth-child(2)'
    ).length
    const divHTMLDOM = cheerio.load(divYieldHTML)
    const divTableLength = divHTMLDOM(
      'body > table:nth-child(2) > tbody > tr > td:nth-child(2)'
    ).length
    if (setTableLength && divTableLength) {
      if (setTableLength === divTableLength - 1) {
        for (let i = 1; i < setTableLength + 1; i++) {
          const [month, year]: string[] = setHTMLDOM(
            `body > table:nth-child(2) > thead:nth-child(2) > tr:nth-child(${i}) > td:nth-child(1)`
          )
            .text()
            .split('-')
          const setindex: number = parseFloat(
            setHTMLDOM(
              `body > table:nth-child(2) > thead:nth-child(2) > tr:nth-child(${i}) > td:nth-child(2)`
            )
              .text()
              .replace(',', '')
          )
          const divyield: number = parseFloat(
            divHTMLDOM(
              `body > table:nth-child(2) > tbody > tr:nth-child(${
                i + 1
              }) > td:nth-child(2)`
            )
              .text()
              .replace(',', '')
          )
          const record: SETInfoOfficial = {
            year: parseInt(year),
            month,
            setindex,
            divyield,
          }
          records.push(record)
        }
      }
    }
    return records.reverse()
  }

  const lastSETRecords = async (): Promise<SETInfo> => {
    const { data }: PostgrestSingleResponse<SETInfo> = await supabase
      .from<SETInfo>('SET_Info')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single()
    const lastSETRecords: SETInfo = Object.assign(data || [])
    return lastSETRecords
  }

  const fetchSET: SETInfoOfficial[] = await fetchSETData()
  const lastSET: SETInfo = await lastSETRecords()
  const lastSETIndex: number = fetchSET.findIndex(
    (records) =>
      records.year === lastSET.year &&
      records.month?.toString() === lastSET.month
  )

  fetchSET.forEach((record: SETInfoOfficial) => {
    Object.keys(record).forEach((key: string) => {
      const unknownKey = key as keyof SETInfoOfficial
      if (
        record[unknownKey] === null &&
        unknownKey !== 'year' &&
        unknownKey !== 'month'
      ) {
        record[unknownKey] = 0
      }
    })
  })

  if (fetchSET.length - lastSETIndex > 1) {
    const { error }: PostgrestResponse<SETInfo> = await supabase
      .from<SETInfo>('SET_Info')
      .insert(fetchSET.slice(lastSETIndex + 1))
    if (error === null) {
      console.log(
        `[INFO] [${getTimestamp()}] Update Market Index ${
          fetchSET.length - lastSETIndex - 1
        } records`
      )
    } else {
      console.log(`[WARN] [${getTimestamp()}] Unable to update Market Index`)
    }
  } else {
    console.log(`[INFO] [${getTimestamp()}] No New Market Index Data`)
  }

  const calSETReturn = (): SETReturnOfficial[] => {
    let records: SETReturnOfficial[] = []
    for (let i = 0; i < fetchSET.length; i++) {
      const year = fetchSET[i].year
      const month = fetchSET[i].month
      let monthly_return: number
      let monthly_tri: number
      if (i > 0) {
        const curSET: number = fetchSET[i].setindex || 0
        const prevSET: number = fetchSET[i - 1].setindex || 1
        const curDIV: number = fetchSET[i].divyield || 0
        monthly_return = ((curSET / prevSET) ** 12 - 1) * 100
        monthly_tri = monthly_return + curDIV
      } else {
        monthly_return = 0
        monthly_tri = 0
      }
      let yearly_return: number
      let yearly_tri: number
      if (i > 11) {
        const curSET: number = fetchSET[i].setindex || 0
        const prevSET: number = fetchSET[i - 12].setindex || 1
        const curDIV: number = fetchSET[i].divyield || 0
        yearly_return = (curSET / prevSET - 1) * 100
        yearly_tri = yearly_return + curDIV
      } else {
        yearly_return = 0
        yearly_tri = 0
      }
      const record: SETReturnOfficial = {
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

  const lastSETReturnRecords = async (): Promise<SETReturn> => {
    const { data }: PostgrestSingleResponse<SETReturn> = await supabase
      .from<SETInfo>('SET_Return')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single()
    const lastSETReturnRecords: SETReturn = Object.assign(data || [])
    return lastSETReturnRecords
  }

  const calSET: SETInfoOfficial[] = calSETReturn()
  const lastSETReturn: SETReturn = await lastSETReturnRecords()
  const lastSETReturnIndex: number = calSET.findIndex(
    (records) =>
      records.year === lastSETReturn.year &&
      records.month?.toString() === lastSETReturn.month
  )

  if (calSET.length - lastSETReturnIndex > 1) {
    const { error }: PostgrestResponse<SETReturn> = await supabase
      .from<SETReturn>('SET_Return')
      .insert(calSET.slice(lastSETReturnIndex + 1))
    if (error === null) {
      console.log(
        `[INFO] [${getTimestamp()}] Update Market Return ${
          calSET.length - lastSETReturnIndex - 1
        } records`
      )
    } else {
      console.log(`[WARN] [${getTimestamp()}] Unable to update Market Return`)
    }
  } else {
    console.log(`[INFO] [${getTimestamp()}] No New Market Return Data`)
  }
}
