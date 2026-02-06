import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
export const SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
