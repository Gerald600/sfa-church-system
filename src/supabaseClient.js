import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://onnppgvisqenmpgwkeom.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ubnBwZ3Zpc3Flbm1wZ3drZW9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjc0MzEsImV4cCI6MjA5Njc0MzQzMX0.pQMeYqXfXYz_8m3saR6x5po8PMZNw3347XR2rZLJfEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)