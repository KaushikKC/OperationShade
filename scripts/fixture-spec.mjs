// The twelve case-file intercepts (persona set) + a brand pitch, a spam and a payday DM.
// a.<field> for Choice fields is [pick, confidence, runnerUp]. Lane, draft and
// why are not here: they come from lib/routing.ts, the same as a real run.
export const SPEC = [
  {
    id: 'dm_001', handle: 'leah.textures', platform: 'ig', persona: 'Dry-skin regular', hoursAgo: 3, is_reaction: 0.08,
    text: "my skin's been flaking under foundation since october. is the Cloud Cream worth it or is there something cheaper that does the same job",
    a: { intent: ['value_check', 0.84, 'recommendation'], skin_type: ['dry', 0.88, 'sensitive'], budget_band: ['under_30', 0.61, '30_to_60'], purchase_intent: [0.68, 0.79], needs_maya_personally: 0.12, answerable_by_routing: 0.93, urgency: [0.21, 0.74], names_shelf_product: 0.91 },
  },
  {
    id: 'dm_002', handle: 'norahfrancis', platform: 'tt', persona: 'Life event', hoursAgo: 7, is_reaction: 0.06,
    text: "i'm getting married in three weeks and my skin has never looked worse. my mum died in june and i think it's all coming out on my face. i don't know what to ask you really",
    a: { intent: ['life_event', 0.79, 'skin_diagnosis'], skin_type: ['unknown', 0.52, 'sensitive'], budget_band: ['none', 0.71, '30_to_60'], purchase_intent: [0.31, 0.58], needs_maya_personally: 0.94, answerable_by_routing: 0.18, urgency: [0.88, 0.83], names_shelf_product: 0.04 },
  },
  {
    id: 'dm_003', handle: 'p.adeyemi', platform: 'ig', persona: 'Reaction', hoursAgo: 1, is_reaction: 0.96,
    text: 'the retinol you talked about has left both my cheeks raw and hot and it stings when i put water on it. do i push through it or stop',
    a: { intent: ['skin_diagnosis', 0.87, 'routine_context'], skin_type: ['sensitive', 0.79, 'redness'], budget_band: ['none', 0.68, 'under_30'], purchase_intent: [0.09, 0.81], needs_maya_personally: 0.9, answerable_by_routing: 0.22, urgency: [0.95, 0.9], names_shelf_product: 0.31 },
  },
  {
    id: 'dm_004', handle: 'tashaa.k', platform: 'tt', persona: 'Dupe hunter', hoursAgo: 11, is_reaction: 0.03,
    text: "is there a cheaper version of the Glass Drop? i can't justify £62 every two months",
    a: { intent: ['value_check', 0.93, 'recommendation'], skin_type: ['unknown', 0.57, 'dry'], budget_band: ['over_60', 0.66, '30_to_60'], purchase_intent: [0.74, 0.8], needs_maya_personally: 0.11, answerable_by_routing: 0.95, urgency: [0.24, 0.71], names_shelf_product: 0.94 },
  },
  {
    id: 'dm_005', handle: 'bee.in.peckham', platform: 'ig', persona: 'Shade match', hoursAgo: 19, is_reaction: 0.02,
    text: "what shade of the tint would i be? i'm about the same as you in most things but i go redder in summer",
    a: { intent: ['shade_info', 0.92, 'recommendation'], skin_type: ['unknown', 0.66, 'redness'], budget_band: ['none', 0.58, 'under_30'], purchase_intent: [0.81, 0.85], needs_maya_personally: 0.22, answerable_by_routing: 0.74, urgency: [0.33, 0.69], names_shelf_product: 0.55 },
  },
  {
    id: 'dm_006', handle: 'm_oyelaran', platform: 'ig', persona: 'Too little to go on', hoursAgo: 26, is_reaction: 0.04,
    text: "hiya!! do you think it's worth it? x",
    a: { intent: ['value_check', 0.34, 'recommendation'], skin_type: ['unknown', 0.81, 'dry'], budget_band: ['none', 0.86, 'under_30'], purchase_intent: [0.42, 0.36], needs_maya_personally: 0.31, answerable_by_routing: 0.28, urgency: [0.19, 0.44], names_shelf_product: 0.08 },
  },
  {
    id: 'dm_007', handle: 'sixteen.and.oily', platform: 'tt', persona: 'Teen budget', hoursAgo: 31, is_reaction: 0.05,
    text: "i'm 15 and i've got £20 to spend. my forehead is oily by lunch but my cheeks are tight. where do i start",
    a: { intent: ['recommendation', 0.86, 'routine_context'], skin_type: ['oily_combo', 0.77, 'dry'], budget_band: ['under_30', 0.82, 'none'], purchase_intent: [0.59, 0.76], needs_maya_personally: 0.16, answerable_by_routing: 0.89, urgency: [0.27, 0.66], names_shelf_product: 0.12 },
  },
  {
    id: 'dm_008', handle: 'rosaceadiary', platform: 'ig', persona: 'Flare-up', hoursAgo: 38, is_reaction: 0.44,
    text: 'my dermatologist put me on something for rosacea and half your shelf is off limits now. is any of it still ok for me or do i just stop watching lol',
    a: { intent: ['skin_diagnosis', 0.61, 'routine_context'], skin_type: ['redness', 0.88, 'sensitive'], budget_band: ['none', 0.64, '30_to_60'], purchase_intent: [0.38, 0.62], needs_maya_personally: 0.83, answerable_by_routing: 0.34, urgency: [0.54, 0.7], names_shelf_product: 0.41 },
  },
  {
    id: 'dm_009', handle: 'gift.panic', platform: 'tt', persona: 'Gifting', hoursAgo: 44, is_reaction: 0.02,
    text: "buying for my sister, she's got oily skin and i've got about £40. she watches you religiously so it has to be something you'd actually use",
    a: { intent: ['recommendation', 0.84, 'pick_one'], skin_type: ['oily_combo', 0.86, 'unknown'], budget_band: ['30_to_60', 0.79, 'over_60'], purchase_intent: [0.88, 0.87], needs_maya_personally: 0.14, answerable_by_routing: 0.87, urgency: [0.46, 0.68], names_shelf_product: 0.33 },
  },
  {
    id: 'dm_010', handle: 'ing.redients', platform: 'ig', persona: 'Routine order', hoursAgo: 52, is_reaction: 0.03,
    text: "i've got the Cloud Cream and the Barrier Oil and i think i've been putting them on in the wrong order. my skin is dry, does it matter",
    a: { intent: ['routine_context', 0.88, 'recommendation'], skin_type: ['dry', 0.85, 'sensitive'], budget_band: ['none', 0.82, 'under_30'], purchase_intent: [0.22, 0.73], needs_maya_personally: 0.09, answerable_by_routing: 0.94, urgency: [0.15, 0.72], names_shelf_product: 0.96 },
  },
  {
    id: 'dm_011', handle: 'worth.it.or.not', platform: 'tt', persona: 'Worth it?', hoursAgo: 61, is_reaction: 0.02,
    text: "everyone is posting about the Glass Drop this week. i trust you more than them — is it worth £62 or is it this month's thing",
    a: { intent: ['value_check', 0.81, 'recommendation'], skin_type: ['unknown', 0.69, 'oily_combo'], budget_band: ['over_60', 0.87, '30_to_60'], purchase_intent: [0.83, 0.84], needs_maya_personally: 0.24, answerable_by_routing: 0.86, urgency: [0.37, 0.65], names_shelf_product: 0.95 },
  },
  {
    id: 'dm_012', handle: 'quiet.follower.02', platform: 'ig', persona: 'Silent browser', hoursAgo: 73, is_reaction: 0.01,
    text: "been watching you for two years and never messaged. i'm finally rebuilding my whole routine from scratch next month and i've saved every one of your shelf videos",
    a: { intent: ['delayed_intent', 0.85, 'trust_or_fan'], skin_type: ['unknown', 0.78, 'dry'], budget_band: ['30_to_60', 0.56, 'none'], purchase_intent: [0.91, 0.88], needs_maya_personally: 0.29, answerable_by_routing: 0.41, urgency: [0.12, 0.61], names_shelf_product: 0.26 },
  },
  {
    id: 'dm_013', handle: 'lumeglow.partnerships', platform: 'ig', hoursAgo: 15, is_reaction: 0.01,
    text: "Hi Maya! Loving your content 💕 We'd be thrilled to gift you our new Vitamin C line in exchange for 3 in-feed posts and 2 stories this month. Let me know where to send the deck!",
    a: { intent: ['brand_pitch', 0.96, 'spam'], skin_type: ['unknown', 0.89, 'dry'], budget_band: ['none', 0.91, 'over_60'], purchase_intent: [0.04, 0.86], needs_maya_personally: 0.18, answerable_by_routing: 0.31, urgency: [0.08, 0.79], names_shelf_product: 0.02 },
  },
  {
    id: 'dm_014', handle: 'growth.engine.9981', platform: 'tt', hoursAgo: 22, is_reaction: 0.01,
    text: '🔥🔥 GROW TO 100K IN 30 DAYS GUARANTEED ✅ real uk followers ✅ no password needed ✅ dm BOOST to start',
    a: { intent: ['spam', 0.98, 'brand_pitch'], skin_type: ['unknown', 0.94, 'dry'], budget_band: ['none', 0.93, 'under_30'], purchase_intent: [0.02, 0.92], needs_maya_personally: 0.02, answerable_by_routing: 0.12, urgency: [0.03, 0.88], names_shelf_product: 0.01 },
  },
  {
    id: 'dm_015', handle: 'hollie.ftw', platform: 'tt', hoursAgo: 5, is_reaction: 0.02,
    text: "getting paid friday and the Cloud Cream is the first thing i'm buying. saving this so i don't forget 🫡",
    a: { intent: ['delayed_intent', 0.9, 'trust_or_fan'], skin_type: ['unknown', 0.83, 'oily_combo'], budget_band: ['under_30', 0.63, '30_to_60'], purchase_intent: [0.94, 0.89], needs_maya_personally: 0.13, answerable_by_routing: 0.47, urgency: [0.29, 0.64], names_shelf_product: 0.93 },
  },
]
