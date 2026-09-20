// Builds data/dms.json: the twelve case-file intercepts verbatim, plus six
// persona archetypes of filler and a tail of noise. ~250 messages.
// node scripts/gen-dms.mjs > data/dms.json
import { SPEC } from './fixture-spec.mjs'

let seed = 424242
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
const pick = (a) => a[Math.floor(rnd() * a.length)]
const some = (a, n) => { const c = [...a]; const out = []; while (out.length < n && c.length) out.push(...c.splice(Math.floor(rnd() * c.length), 1)); return out }

const HANDLE_A = ['lily', 'aisha', 'mo', 'jen', 'tara', 'noor', 'bea', 'kayleigh', 'fern', 'ola', 'ruth', 'dani', 'hen', 'priya', 'sade', 'maeve', 'nia', 'cleo', 'roisin', 'zainab', 'immy', 'gracie', 'lex', 'shan', 'evie', 'kem', 'bella', 'yaz', 'tilda', 'anya']
const HANDLE_B = ['.skin', '_london', 'xo', '.beauty', '92', '.does.makeup', '_uk', '.87', 'ss', '.face', '_x', '.03', 'ldn', '.and.co', '_official', '.notes']

// Six persona archetypes. Each line is a whole message; slots keep them varied.
const ARCHETYPES = {
  dry_regular: [
    "my skin goes tight about an hour after cleansing, is that a {thing} problem or am i using the wrong {gencat}",
    "flaking around my nose every winter no matter what i put on it. what would you actually use",
    "is a {price} moisturiser ever worth it over the {lowprice} one for dry skin",
    "i've been doubling up on hyaluronic acid and my skin feels worse?? what am i doing wrong",
    "do i need an oil on top of my moisturiser or is that a marketing thing",
    "my cheeks are dry but i get spots on my chin. do i buy two moisturisers or is that mad",
    "what do you use on your face after a flight, mine is always awful for a week",
    "is the Cloud Cream still the good one or has something better come along",
    "wedding in {weeks} weeks and my skin has picked now to fall apart. what do i do",
    "Cloud Cream or the Barrier Oil first? i've got both and i've been doing it wrong i think",
  ],
  teen_budget: [
    "i'm {age} and i've got {price} to spend, where do i start",
    "my mum says i'm too young for retinol, is she right",
    "everyone at school uses the {gencat} you talked about but i can't afford it, is there anything cheaper",
    "i've got like {price} of birthday money, what's the one thing worth buying",
    "is it bad to use my sister's stuff, she's {age2} and has oily skin",
    "school makes my skin worse i swear. cheap things that actually work?",
    "school photos are {day} and i've got a massive spot, is there anything",
    "what foundation shade would i be? i'm about the same as you i think",
    "i've got about five minutes in the morning and that's being generous. what's the minimum",
  ],
  dupe_hunter: [
    "is there a cheaper version of the {cat} you use",
    "the {price} one everyone's posting about, is there a boots dupe",
    "i can't spend {price} every two months, what's the next best thing",
    "does the aldi one actually do the same job or is that tiktok talking",
    "cheaper {cat} that isn't rubbish? i'm skint until the 28th",
    "is the Glass Drop worth £62 or am i being sold to",
    "Daily Gel or Red Reset, i can only afford one",
  ],
  payday_buyer: [
    "getting paid {day} and i want to sort my routine properly. where do i put the money",
    "about to spend {price} on skincare, talk me out of it or tell me what to get",
    "black friday is coming, what's actually worth waiting for",
    "i've saved up {price} and i want to buy properly once instead of badly five times",
    "finally got a job!! treating myself. what's on your shelf that's worth it",
    "getting paid {day} and your shelf is the first thing i'm buying from. saving this",
    "just ordered the {cat} you use, wish me luck 🤞",
    "not asking anything, just saving up for the {price} one and wanted you to know",
    "screenshotted your whole routine and i'm buying it bit by bit",
    "my basket is full of things you've talked about 😅 paying for it on {day}",
    "bookmarked every one of your shelf videos. rebuilding everything next month",
    "i've got {price} saved for the Cloud Cream, holding out for payday",
  ],
  reaction: [
    "my face went red and hot after the {cat} last night, do i stop",
    "started the retinol you mentioned and my skin is peeling around my mouth, normal?",
    "burning when i put moisturiser on now, i think i've broken something",
    "i've come out in tiny bumps since i started the new {cat}, is that purging or a reaction",
    "my eyelids are flaking and sore, i don't know which thing did it",
    "my cheeks have gone red and they stay red now, is that rosacea or am i panicking",
    "i had a baby {weeks} weeks ago and my skin is unrecognisable, i don't know where to start",
  ],
  shelf_curious: [
    "is the {cat} worth it or is it this month's thing",
    "where do you buy the {cat} in the uk, everything i find is us only",
    "what's actually still on your shelf from last year",
    "did you ever repurchase the {cat} or was it a one time thing",
    "honest opinion on the {price} serum everyone's on about",
    "which spf do you use in summer, the one from the video or something else",
    "which shade of the tint am i if i'm a {shade} in everything else",
    "i work nights and i've got no time and no money, what's the least i can get away with",
    "you told me not to buy something once and it saved me {price}. just wanted to say thank you",
    "i trust you more than anyone on here. Cloud Cream or the {cat}?",
  ],
}
const SLOTS = {
  thing: ['barrier', 'dryness', 'dehydration', 'cleanser'],
  gencat: ['cleanser', 'serum', 'moisturiser', 'spf', 'toner', 'exfoliant'],
  cat: ['cleanser', 'serum', 'moisturiser', 'spf', 'retinal', 'toner', 'exfoliant', 'Glass Drop', 'Cloud Cream', 'Daily Gel', 'Red Reset', 'Barrier Oil'],
  price: ['£20', '£35', '£48', '£62', '£15', '£60'],
  lowprice: ['£9', '£11', '£13'],
  age: ['14', '15', '16', '17'],
  age2: ['19', '21', '23'],
  day: ['friday', 'on the 25th', 'next week', 'thursday'],
  weeks: ['two', 'three', 'six', 'ten'],
  shade: ['NC20', 'NW25', 'a light-medium', 'a deep neutral'],
}
const NOISE = [
  "Hi Maya! 💕 We'd love to send you our new {cat} line for an honest review — just {n} in-feed posts and {n2} stories. Shall I send the deck?",
  "🔥 GROW TO {k}K FOLLOWERS IN 30 DAYS ✅ real uk accounts ✅ no password ✅ dm BOOST",
  "Hello dear, we are a {country} beauty brand seeking UK influencers for long term cooperation. Gifting only at this stage.",
  "Collab opportunity!! We pay per post. Reply INFO for our rate card 💰",
  "hey babe check my page 😘",
  "INVEST £200 GET £2000 BACK IN 48HRS crypto trading dm for details 📈📈",
  "Hi! I'm reaching out from a talent agency — would you be open to a quick call about representation?",
  "your account has been flagged for copyright, verify here to avoid deletion",
  "We're launching a {cat} in Q1 and Maya feels like the perfect fit for our UK push. Media kit attached — let me know the best email for your manager.",
  "FREE SKINCARE BUNDLE 🎁 just cover shipping, link in bio",
]
const NOISE_SLOTS = { n: ['2', '3', '4'], n2: ['1', '2', '3'], k: ['50', '100', '250'], country: ['Korean', 'Polish', 'Spanish', 'Turkish'], cat: SLOTS.cat }

const CONTEXT = [
  'combination skin, mid twenties. ', "i'm 34 and my skin's changed since having my son. ", 'oily t-zone, dry everywhere else. ',
  "i've got eczema on my hands and i think it's spreading. ", 'i work nights so my routine is upside down. ', 'been on the pill for a year and my skin is different. ',
  "i'm on a student budget. ", 'darker skin, marks stay for months. ', "i'm 41 and starting to care about this properly. ",
  'rosacea-ish redness on my cheeks. ', 'live in london, hard water, if that matters. ', "i've got about a month before a wedding. ",
]
const TAIL = [
  ' no rush!', " i've read everything and i'm more confused than when i started.", ' been following since the boots video.',
  ' i know you get a million of these.', ' happy to buy through your link if you have one.', " i don't trust anyone else on this.",
  ' sorry this is long.',
]
const fill = (tpl, slots) => tpl.replace(/\{(\w+)\}/g, (_, k) => pick(slots[k] ?? ['']))
const handle = () => `${pick(HANDLE_A)}${pick(HANDLE_B)}`
const BASE = Date.parse('2026-09-20T17:00:00.000Z')
const DAYS = 30

const dms = []
let n = 0
const push = (text, platform) => {
  n += 1
  dms.push({
    id: `dm_${String(n).padStart(3, '0')}`,
    handle: handle(),
    platform: platform ?? (rnd() < 0.55 ? 'ig' : 'tt'),
    text,
    ts: new Date(BASE - Math.floor(rnd() * DAYS * 24 * 3600_000)).toISOString(),
  })
}

// 1. The twelve intercepts, verbatim, keeping their ids, handles and personas.
for (const row of SPEC.filter((r) => r.persona)) {
  n += 1
  dms.push({ id: row.id, handle: row.handle, platform: row.platform, text: row.text, persona: row.persona, ts: new Date(BASE - row.hoursAgo * 3600_000).toISOString() })
}
// 2. Six personas, ~34 each, templates cycled so no line repeats back to back.
for (const lines of Object.values(ARCHETYPES)) {
  for (let i = 0; i < 33; i++) {
    let text = fill(pick(lines), SLOTS)
    if (rnd() < 0.45) text = pick(CONTEXT) + text
    if (rnd() < 0.3) text = text + pick(TAIL)
    if (rnd() < 0.22) text = text + pick([' x', ' xx', ' 🙏', ' thank you!!', ' sorry to bother you', ' love your videos btw', ' 🥺'])
    if (rnd() < 0.1) text = pick(['hiya ', 'hi maya ', 'hey!! ', 'sorry to dm but ']) + text
    push(text)
  }
}
// 3. Noise tail.
for (let i = 0; i < 38; i++) push(fill(pick(NOISE), NOISE_SLOTS))

// Interleave so the corpus does not arrive sorted by persona.
const intercepts = dms.slice(0, 12)
const rest = some(dms.slice(12), dms.length - 12)
process.stdout.write(JSON.stringify([...intercepts, ...rest], null, 2) + '\n')
