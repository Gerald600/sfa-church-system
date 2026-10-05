import fs from 'fs'

const logFilePath = 'C:/Users/Bright/.gemini/antigravity-ide/brain/56a46c65-876f-43b0-95ef-76cd5fc566f2/.system_generated/logs/transcript.jsonl'
const content = fs.readFileSync(logFilePath, 'utf8')

// Find all email addresses
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const matches = content.match(emailRegex) || []
const uniqueEmails = Array.from(new Set(matches))

console.log("Emails found in transcript:")
uniqueEmails.forEach(email => {
  // If email is mock or related to the church
  console.log(`- ${email}`)
})


