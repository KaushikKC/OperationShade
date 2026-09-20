// data/dms.json — the twelve E-01 intercepts verbatim, then 200 messages from
// the six known associates in E-03, then a tail of noise. ~250 in all.
// npm run dms
import { SPEC } from './fixture-spec.mjs'

let seed = 424242
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
const pick = (a) => a[Math.floor(rnd() * a.length)]

const HANDLE_A = ['lily', 'aisha', 'mo', 'jen', 'tara', 'noor', 'bea', 'kayleigh', 'fern', 'ola', 'ruth', 'dani', 'hen', 'priya', 'sade', 'maeve', 'nia', 'cleo', 'roisin', 'zainab', 'immy', 'gracie', 'lex', 'shan', 'evie', 'kem', 'bella', 'yaz', 'tilda', 'anya']
const HANDLE_B = ['.skin', '_london', 'xo', '.beauty', '92', '.does.makeup', '_uk', '.87', 'ss', '.face', '_x', '.03', 'ldn', '.and.co', '.notes']

/**
 * E-03 // KNOWN ASSOCIATES. Six profiles, their own words from the case file
 * used as the seed for how each of them writes. Alex barely sends anything —
 * that is the whole point of her, so she is a sliver of the inbox.
 */
const ASSOCIATES = {
  emily: { n: 42, lines: [ // 22, price sensitive: "I trust you, but I am not spending £100 on serum."
    'i trust you but i am not spending {big} on a serum. what else is there',
    'is the {prod} actually worth {price} or am i being influenced',
    "i've got {price} and that's genuinely it. what do i buy",
    'why is everything {big} now. is there a version of the {prod} that isn\'t',
    'the {prod} is {price} which is a whole week of food for me. talk me through it',
    'is it worth saving for the {prod} or is the cheap one fine',
    "everyone says the {prod} but {price} for a {type}? really?",
  ] },
  priya: { n: 38, lines: [ // 31, sensitive skin: "Every time I try something new my face freaks out."
    'every time i try something new my face freaks out. where do i even start',
    'i already have the {prod}. do i need the {prod2} too or is that overkill',
    'does the {prod} have fragrance in it? everything with fragrance hates me',
    'my skin goes red and cross with almost everything. is the {prod} gentle enough',
    "i've got sensitive skin and i'm scared of serums. is there one that won't set me off",
    'can i use the {prod} and the {prod2} together or will that be too much for me',
    'is the {prod} okay if my skin is reactive',
  ] },
  sophie: { n: 36, lines: [ // 27, beauty obsessive: "Forget the brand. What would YOU buy?"
    'forget the brand. what would YOU buy',
    'if you could only keep ONE of these which one',
    'what would you do if it was your money',
    "ok but what's actually on your shelf right now, not the sponsored stuff",
    'the {prod} or the {prod2}? i want your answer not a list',
    'would you repurchase the {prod} or was it a one time thing',
    'genuinely which of these do you use and which did you get sent',
  ] },
  hannah: { n: 38, lines: [ // 24, overwhelmed: "There are 500 versions of this. Just tell me."
    'there are 500 versions of this. just tell me',
    'can you send me the one you would buy if you were me',
    "i've read everything and i'm more confused than when i started. just pick for me",
    'i do not want options i want one thing. what is it',
    "what's the one thing worth buying if i buy nothing else",
    'too many choices. {skin} skin, {price}, go',
    "i don't even know what my skin type is honestly",
  ] },
  grace: { n: 34, lines: [ // 33, busy: "I have 5 mins. Give me the two things that matter."
    'i have 5 mins. give me the two things that matter',
    'can you make me a routine but only 2 products, i will not do 8 steps',
    'two things max. i have a toddler and no time',
    "what's the minimum i can get away with and still look like i tried",
    'i work nights and my routine is upside down. what actually matters',
    'no time, no money, {skin} skin. what are the two things',
  ] },
  alex: { n: 12, lines: [ // 28, silent browser: saves almost everything, sends almost nothing.
    'saved your last one. buying the {prod} on payday',
    'i saw the thing you recommended last week. buying it payday',
    'been following for two years and never messaged. finally sorting my routine out next month',
    'no question, just saving this. thank you',
    "i've screenshotted your whole shelf and i'm working through it",
  ] },
}
const SLOTS = {
  prod: ['Cloud Cream', 'Daily Gel', 'Red Reset', 'Night Serum', 'SPF 50', 'Glass Drop', 'Soft Clean', 'Oil Balm', 'Clear Wash', 'Tint Veil'],
  prod2: ['Cloud Cream', 'Daily Gel', 'Red Reset', 'Night Serum', 'SPF 50', 'Soft Clean'],
  price: ['£20', '£24', '£32', '£38', '£42', '£62'],
  big: ['£60', '£100', '£80'],
  type: ['moisturiser', 'serum', 'cleanser', 'spf'],
  skin: ['dry', 'oily', 'combination', 'sensitive', 'red'],
}
const CONTEXT = [
  'combination skin, mid twenties. ', "i'm 34 and my skin's changed since having my baby. ", 'oily t-zone, dry everywhere else. ',
  'dry and flaky since october. ', 'redness on my cheeks that never really goes. ', 'student budget, sorry. ',
  'darker skin, marks stay for months. ', 'london, hard water, if that matters. ', "i've got a wedding in a month. ",
]
const TAIL = [' no rush!', ' i know you get a million of these.', ' been following since the £50 video.', ' sorry this is long.', ' thank you!!', ' happy to use your link.']
const NOISE = [
  "Hi Maya! 💕 We'd love to send you our new {type} line for an honest review — just {n} in-feed posts and {n2} stories. Shall I send the deck?",
  '🔥 GROW TO {k}K FOLLOWERS IN 30 DAYS ✅ real uk accounts ✅ no password ✅ dm BOOST',
  'Hello dear, we are a {country} beauty brand seeking UK influencers for long term cooperation. Gifting only at this stage.',
  'Collab opportunity!! We pay per post. Reply INFO for our rate card 💰',
  'hey babe check my page 😘',
  'INVEST £200 GET £2000 BACK IN 48HRS crypto trading dm for details 📈📈',
  "Hi! I'm reaching out from a talent agency — would you be open to a quick call about representation?",
  'your account has been flagged for copyright, verify here to avoid deletion',
  "We're launching a {type} in Q1 and Maya feels like the perfect fit for our UK push. Media kit attached — best email for your manager?",
  'FREE SKINCARE BUNDLE 🎁 just cover shipping, link in bio',
]
const NOISE_SLOTS = { n: ['2', '3', '4'], n2: ['1', '2', '3'], k: ['50', '100', '250'], country: ['Korean', 'Polish', 'Spanish', 'Turkish'], type: SLOTS.type }

// E-04, so a follower quoting a price quotes the real one.
const PRICES = { 'Cloud Cream': 38, 'Daily Gel': 24, 'Red Reset': 32, 'Night Serum': 42, 'SPF 50': 26, 'Glass Drop': 62, 'Soft Clean': 22, 'Oil Balm': 29, 'Clear Wash': 20, 'Tint Veil': 34 }
const TYPES = { 'Cloud Cream': 'moisturiser', 'Daily Gel': 'moisturiser', 'Red Reset': 'serum', 'Night Serum': 'serum', 'SPF 50': 'spf', 'Glass Drop': 'serum', 'Soft Clean': 'cleanser', 'Oil Balm': 'balm', 'Clear Wash': 'cleanser', 'Tint Veil': 'base' }

const fill = (tpl, slots) => {
  // Pick the product first so any price or type in the same line matches it.
  const prod = pick(slots.prod ?? [''])
  const local = { ...slots, prod: [prod], price: [`£${PRICES[prod] ?? 30}`], type: [TYPES[prod] ?? 'serum'], prod2: (slots.prod2 ?? []).filter((p) => p !== prod) }
  return tpl.replace(/\{(\w+)\}/g, (_, k) => pick(local[k]?.length ? local[k] : slots[k] ?? ['']))
}
const handle = () => `${pick(HANDLE_A)}${pick(HANDLE_B)}`
const BASE = Date.parse('2026-09-20T17:00:00.000Z')
const dms = []
let n = 0
const push = (text) => {
  n += 1
  dms.push({
    id: `dm_${String(n).padStart(3, '0')}`,
    handle: handle(),
    platform: rnd() < 0.55 ? 'ig' : 'tt',
    text,
    ts: new Date(BASE - Math.floor(rnd() * 30 * 24 * 3600_000)).toISOString(),
  })
}

// 1. E-01, verbatim, keeping ids, handles and the case file's own labels.
for (const row of SPEC.filter((r) => r.persona)) {
  n += 1
  dms.push({ id: row.id, handle: row.handle, platform: row.platform, text: row.text, persona: row.persona, ts: new Date(BASE - row.hoursAgo * 3600_000).toISOString() })
}
// 2. The six associates.
for (const who of Object.values(ASSOCIATES)) {
  for (let i = 0; i < who.n; i++) {
    let text = fill(pick(who.lines), SLOTS)
    if (rnd() < 0.4) text = pick(CONTEXT) + text
    if (rnd() < 0.28) text += pick(TAIL)
    if (rnd() < 0.12) text = pick(['hiya ', 'hi maya ', 'hey!! ', 'sorry to dm but ']) + text
    push(text)
  }
}
/**
 * The rest of a real inbox. E-01 puts one TRUST and one RELATIONSHIP message in
 * twelve, so the six associates on their own — who all ask about products —
 * make the inbox look tidier than it is. Appended last so earlier ids hold.
 */
const HUMAN = [
  'i trust you more than Sephora tbh',
  'you told me not to buy something once and it saved me £40. thank you',
  "genuinely you're the only person i believe about any of this",
  'just wanted to say thank you. my skin is the best it has been in years',
  'no question, i just think you are the only honest one left on here',
  'Maya I have a first date Friday HELP',
  'my wedding is in two weeks and my skin has picked now to fall apart',
  "i've got my mum's funeral on thursday and i just want to look like myself",
  'job interview monday and i am panicking. what do i do',
  "had my baby three weeks ago and i don't recognise my own face",
  'going through a divorce and i want to feel like a person again',
  'my dad is ill and i have not slept properly in a month, it is all on my face',
  'first holiday since everything happened. i want to feel good in photos',
  'my dermatologist has put me on something and i do not know what i can still use',
  'i have been on steroid cream for eight weeks and my face is worse',
  "my skin has reacted to something and i don't know what. it is hot and tight",
  'graduating next friday and my mum will be photographing every second of it',
  'starting chemo next month and i have been told my skin will change',
]

// 3. Noise.
for (let i = 0; i < 38; i++) push(fill(pick(NOISE), NOISE_SLOTS))

for (const line of HUMAN) push(rnd() < 0.3 ? pick(CONTEXT) + line : line)

const intercepts = dms.slice(0, 12)
const rest = dms.slice(12)
for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]] }
process.stdout.write(JSON.stringify([...intercepts, ...rest], null, 2) + '\n')
