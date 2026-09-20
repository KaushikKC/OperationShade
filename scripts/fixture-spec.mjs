// E-01 // INTERCEPTS — the twelve, verbatim, with the case file's own handles
// and its own category label carried in `persona`. Plus a pitch, a spam and an
// empty one. Lane, draft and why come from lib/routing.ts, same as a real run.
// a.<field> for Choice fields is [pick, confidence, runnerUp].
export const SPEC = [
  {
    id: 'dm_001', handle: 'ellie.mp', platform: 'ig', persona: 'INFO', hoursAgo: 2, is_reaction: 0.02,
    text: 'what shade are u wearing in todays video???',
    a: { intent: ['info', 0.94, 'personalisation'], skin_type: ['unknown', 0.93, 'oily_combo'], budget_band: ['none', 0.88, '30_to_60'], purchase_intent: [0.6, 0.71], needs_maya_personally: 0.18, answerable_by_routing: 0.81, urgency: [0.3, 0.64], names_shelf_product: 0.36 },
  },
  {
    id: 'dm_002', handle: 'gracelee', platform: 'ig', persona: 'RECOMMENDATION', hoursAgo: 4, is_reaction: 0.06,
    text: 'i have dry skin + redness and £60. tell me what to buy pls',
    a: { intent: ['recommendation', 0.97, 'personalisation'], skin_type: ['dry', 0.71, 'redness'], budget_band: ['30_to_60', 0.94, 'under_30'], purchase_intent: [0.92, 0.9], needs_maya_personally: 0.19, answerable_by_routing: 0.91, urgency: [0.44, 0.66], names_shelf_product: 0.12 },
  },
  {
    id: 'dm_003', handle: 'ameliaxo', platform: 'tt', persona: 'JUDGEMENT', hoursAgo: 6, is_reaction: 0.02,
    text: 'okay but if u could only keep ONE of these which one',
    a: { intent: ['judgement', 0.92, 'personalisation'], skin_type: ['unknown', 0.95, 'dry'], budget_band: ['none', 0.86, '30_to_60'], purchase_intent: [0.57, 0.68], needs_maya_personally: 0.37, answerable_by_routing: 0.58, urgency: [0.27, 0.6], names_shelf_product: 0.42 },
  },
  {
    id: 'dm_004', handle: 'sarah', platform: 'ig', persona: 'VALUE', hoursAgo: 9, is_reaction: 0.01,
    text: 'is the cloud cream actually worth £38 or am i being influenced',
    a: { intent: ['value', 0.96, 'judgement'], skin_type: ['unknown', 0.87, 'dry'], budget_band: ['30_to_60', 0.91, 'over_60'], purchase_intent: [0.84, 0.88], needs_maya_personally: 0.21, answerable_by_routing: 0.89, urgency: [0.31, 0.63], names_shelf_product: 0.97 },
  },
  {
    id: 'dm_005', handle: 'jessica', platform: 'ig', persona: 'CONTEXT', hoursAgo: 12, is_reaction: 0.03,
    text: 'i already have the night serum. do i need the barrier cream too???',
    a: { intent: ['context', 0.95, 'recommendation'], skin_type: ['unknown', 0.62, 'dry'], budget_band: ['none', 0.79, '30_to_60'], purchase_intent: [0.63, 0.77], needs_maya_personally: 0.22, answerable_by_routing: 0.84, urgency: [0.29, 0.62], names_shelf_product: 0.93 },
  },
  {
    id: 'dm_006', handle: 'niamh', platform: 'tt', persona: 'DIAGNOSIS', hoursAgo: 15, is_reaction: 0.07,
    text: 'i dont even know what my skin type is lol',
    a: { intent: ['diagnosis', 0.95, 'recommendation'], skin_type: ['unknown', 0.98, 'oily_combo'], budget_band: ['none', 0.9, 'under_30'], purchase_intent: [0.33, 0.66], needs_maya_personally: 0.26, answerable_by_routing: 0.72, urgency: [0.19, 0.61], names_shelf_product: 0.03 },
  },
  {
    id: 'dm_007', handle: 'olivia', platform: 'ig', persona: 'TRUST', hoursAgo: 18, is_reaction: 0.01,
    text: 'i trust you more than Sephora tbh',
    a: { intent: ['trust', 0.96, 'transfer_of_trust'], skin_type: ['unknown', 0.96, 'dry'], budget_band: ['none', 0.92, '30_to_60'], purchase_intent: [0.27, 0.64], needs_maya_personally: 0.62, answerable_by_routing: 0.24, urgency: [0.14, 0.68], names_shelf_product: 0.02 },
  },
  {
    id: 'dm_008', handle: 'kate', platform: 'ig', persona: 'RELATIONSHIP', hoursAgo: 1, is_reaction: 0.04,
    text: 'Maya I have a first date Friday HELP',
    a: { intent: ['relationship', 0.94, 'constraint'], skin_type: ['unknown', 0.94, 'oily_combo'], budget_band: ['none', 0.89, '30_to_60'], purchase_intent: [0.52, 0.6], needs_maya_personally: 0.86, answerable_by_routing: 0.31, urgency: [0.91, 0.87], names_shelf_product: 0.02 },
  },
  {
    id: 'dm_009', handle: 'joanna', platform: 'tt', persona: 'CONSTRAINT', hoursAgo: 22, is_reaction: 0.02,
    text: 'can you make me a routine but only 2 products bc i will not do 8 steps',
    a: { intent: ['constraint', 0.96, 'recommendation'], skin_type: ['unknown', 0.83, 'oily_combo'], budget_band: ['none', 0.81, 'under_30'], purchase_intent: [0.67, 0.78], needs_maya_personally: 0.2, answerable_by_routing: 0.79, urgency: [0.26, 0.62], names_shelf_product: 0.03 },
  },
  {
    id: 'dm_010', handle: 'mia', platform: 'tt', persona: 'DELAYED INTENT', hoursAgo: 27, is_reaction: 0.01,
    text: 'I saw the thing you recommended last week. buying it payday',
    a: { intent: ['delayed_intent', 0.95, 'trust'], skin_type: ['unknown', 0.93, 'dry'], budget_band: ['none', 0.74, '30_to_60'], purchase_intent: [0.96, 0.92], needs_maya_personally: 0.14, answerable_by_routing: 0.38, urgency: [0.23, 0.6], names_shelf_product: 0.47 },
  },
  {
    id: 'dm_011', handle: 'lucy', platform: 'ig', persona: 'TRANSFER OF TRUST', hoursAgo: 31, is_reaction: 0.01,
    text: 'not a beauty question but what would you do if it was your money?',
    a: { intent: ['transfer_of_trust', 0.89, 'judgement'], skin_type: ['unknown', 0.97, 'dry'], budget_band: ['none', 0.83, 'over_60'], purchase_intent: [0.58, 0.63], needs_maya_personally: 0.61, answerable_by_routing: 0.29, urgency: [0.22, 0.58], names_shelf_product: 0.02 },
  },
  {
    id: 'dm_012', handle: 'roisin', platform: 'tt', persona: 'PERSONALISATION', hoursAgo: 35, is_reaction: 0.02,
    text: 'can you send me the one you would buy if you were me',
    a: { intent: ['personalisation', 0.93, 'recommendation'], skin_type: ['unknown', 0.91, 'dry'], budget_band: ['none', 0.87, '30_to_60'], purchase_intent: [0.72, 0.8], needs_maya_personally: 0.31, answerable_by_routing: 0.56, urgency: [0.24, 0.59], names_shelf_product: 0.18 },
  },
  {
    id: 'dm_013', handle: 'lumeglow.partnerships', platform: 'ig', hoursAgo: 14, is_reaction: 0.01,
    text: "Hi Maya! Loving your content 💕 We'd be thrilled to gift you our new Vitamin C line in exchange for 3 in-feed posts and 2 stories this month. Let me know where to send the deck!",
    a: { intent: ['brand_pitch', 0.96, 'spam'], skin_type: ['unknown', 0.9, 'dry'], budget_band: ['none', 0.91, 'over_60'], purchase_intent: [0.04, 0.86], needs_maya_personally: 0.19, answerable_by_routing: 0.28, urgency: [0.08, 0.79], names_shelf_product: 0.02 },
  },
  {
    id: 'dm_014', handle: 'growth.engine.9981', platform: 'tt', hoursAgo: 20, is_reaction: 0.01,
    text: '🔥🔥 GROW TO 100K IN 30 DAYS GUARANTEED ✅ real uk followers ✅ no password needed ✅ dm BOOST to start',
    a: { intent: ['spam', 0.98, 'brand_pitch'], skin_type: ['unknown', 0.95, 'dry'], budget_band: ['none', 0.94, 'under_30'], purchase_intent: [0.02, 0.92], needs_maya_personally: 0.02, answerable_by_routing: 0.1, urgency: [0.03, 0.88], names_shelf_product: 0.01 },
  },
  {
    id: 'dm_015', handle: 'm_oyelaran', platform: 'ig', hoursAgo: 26, is_reaction: 0.03,
    text: "hiya!! do you think it's worth it? x",
    a: { intent: ['value', 0.36, 'recommendation'], skin_type: ['unknown', 0.84, 'dry'], budget_band: ['none', 0.88, 'under_30'], purchase_intent: [0.44, 0.38], needs_maya_personally: 0.3, answerable_by_routing: 0.31, urgency: [0.18, 0.45], names_shelf_product: 0.06 },
  },
]
