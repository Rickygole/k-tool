import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
})
const page = await browser.newPage()

const externalReqs = []
const allReqs = []
page.on('request', (req) => {
  const url = req.url()
  allReqs.push(url)
  if (!url.startsWith('http://localhost:4173') && !url.startsWith('data:') && !url.startsWith('blob:')) {
    externalReqs.push(url)
  }
})
page.on('console', (msg) => console.log('[console]', msg.text()))
page.on('pageerror', (err) => console.log('[pageerror]', err.message))

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle2', timeout: 15000 }).catch(e => console.log('goto err', e.message))

// wait up to 30s for the transcript / done status or error
const start = Date.now()
let status = ''
while (Date.now() - start < 30000) {
  status = await page.evaluate(() => document.body.innerText).catch(() => '')
  if (status.includes('status: done') || status.includes('status: error')) break
  await new Promise(r => setTimeout(r, 500))
}

console.log('=== FINAL STATUS TEXT ===')
console.log(status)
console.log('=== EXTERNAL (non-localhost) REQUESTS ===')
console.log(JSON.stringify([...new Set(externalReqs)], null, 2))
console.log('=== TOTAL REQUESTS ===', allReqs.length)

await browser.close()
