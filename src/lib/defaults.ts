import type { Contact, Doc, Folder, HubDate, HubState, Member, Plan, Priority, Profile, Task, Week } from './types';
import { addDays, todayISO } from './logic';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const CATEGORIES = [
  'Dream Life Planning', 'Passports & Identity', 'Visas & Immigration', 'Income & Employment', 'Finances',
  'Insurance & Healthcare', 'Accommodation', 'Flights & Travel', 'Family & Children', 'Leaving the UK', 'Arrival Preparation',
];

export const MOVING = [['alone', 'On my own'], ['couple', 'As a couple'], ['family', 'With family']] as const;
export const DEST_STATUS = [['chosen', "I've chosen"], ['narrowing', 'Narrowing it down'], ['exploring', 'Still exploring']] as const;
export const TIMEFRAMES = [['0-3', 'Within 3 months'], ['3-6', '3–6 months'], ['6-12', '6–12 months'], ['12+', '12 months or more'], ['unsure', 'Not sure yet']] as const;
export const STAGES = [
  ['dreaming', 'Dreaming about it'], ['researching', 'Researching and organising'], ['planning', 'Decided and planning'],
  ['booking', 'Booking and arranging'], ['ready', 'Almost ready to go'],
] as const;

export const label = (list: readonly (readonly [string, string])[], v: string) => list.find(([k]) => k === v)?.[1] ?? '';

export const STATUSES = [['not_started', 'Not Started'], ['in_progress', 'In Progress'], ['completed', 'Completed'], ['not_applicable', 'Not Applicable']] as const;
export const PRIORITIES = [['high', 'High'], ['medium', 'Medium'], ['low', 'Low']] as const;

export const DATE_CATEGORIES = ['Passport & ID', 'Visa & Immigration', 'Insurance & Health', 'Travel', 'Accommodation', 'Leaving the UK', 'Family & Education', 'Milestone', 'Other'];
export const REMINDERS = [['none', 'None'], ['day', 'On the day'], ['1d', '1 day before'], ['1w', '1 week before'], ['1m', '1 month before']] as const;
export const CONTACT_CATEGORIES = ['Official resources', 'Accommodation', 'Schools', 'Advisers'];

const TASKS: Record<string, [string, Priority][]> = {
  'Dream Life Planning': [
    ['Write your Dream Life vision statement', 'medium'], ['Agree your family’s top values', 'medium'],
    ['Shortlist destinations that fit your vision', 'medium'], ['Set a realistic target moving window', 'medium'],
  ],
  'Passports & Identity': [
    ['Check passport expiry dates for everyone moving', 'high'], ['Renew any passports that expire soon', 'high'],
    ['Locate birth and marriage certificates', 'medium'],
  ],
  'Visas & Immigration': [
    ['Research official immigration pathways', 'high'], ['Check eligibility requirements with authoritative sources', 'high'],
    ['Identify relevant supporting documents', 'high'], ['Track application or appointment dates where applicable', 'medium'],
  ],
  'Income & Employment': [
    ['Decide how you will earn an income abroad', 'high'], ['Talk to your employer about remote work options', 'medium'],
    ['Update your CV and professional profiles', 'low'], ['Check local work rules with official sources', 'medium'],
  ],
  Finances: [
    ['Estimate relocation costs', 'high'], ['Research destination living costs', 'high'], ['Review savings', 'medium'],
    ['Plan an emergency fund', 'medium'], ['Research relevant banking and tax considerations', 'medium'],
  ],
  'Insurance & Healthcare': [
    ['Compare international health insurance', 'high'], ['Gather medical records and prescriptions', 'medium'],
    ['Research how healthcare works in your destination', 'medium'], ['Review travel insurance for the move', 'low'],
  ],
  Accommodation: [
    ['Decide whether to rent or buy at first', 'medium'], ['Research neighbourhoods', 'medium'],
    ['Book temporary accommodation for arrival', 'medium'], ['Plan what happens to your UK home', 'high'],
  ],
  'Flights & Travel': [
    ['Compare flight options', 'low'], ['Check pet travel rules if relevant', 'low'],
    ['Book flights', 'medium'], ['Plan transport from the airport', 'low'],
  ],
  'Family & Children': [
    ['Research schooling or childcare', 'high'], ['Review family-specific documents', 'medium'],
    ['Plan family travel arrangements', 'medium'], ['Consider individual family members’ needs', 'medium'],
  ],
  'Leaving the UK': [
    ['Give notice on your tenancy or plan your sale', 'high'], ['Tell HMRC you are leaving', 'medium'],
    ['Cancel or transfer utilities and subscriptions', 'low'], ['Set up mail forwarding', 'low'],
    ['Decide what to sell, store or ship', 'medium'],
  ],
  'Arrival Preparation': [
    ['Plan your first week', 'medium'], ['Research registering with local authorities', 'medium'],
    ['Research opening a local bank account', 'medium'], ['Arrange a local phone number', 'low'],
    ['Find your nearest doctor and pharmacy', 'low'],
  ],
};

export function defaultTasks(): Task[] {
  return CATEGORIES.flatMap((category) =>
    TASKS[category].map(([title, priority]) => ({
      id: uid(), title, category, priority, status: 'not_started' as const,
      due: '', memberId: '', docId: '', link: '', notes: '', custom: false,
    })),
  );
}

const week = (theme: string, subLabel: string, focus: string, actions: string[], milestone: string, reflectionQ: string): Week => ({
  theme, subLabel, focus, milestone, milestoneDone: false, reflectionQ, reflectionA: '', notes: '',
  actions: actions.map((text) => ({ text, done: false })), extras: [],
});

export function starterPlan(): Plan {
  return {
    coachNote: '', currentWeek: 1, personalised: false,
    weeks: [
      week('Clarify', 'Get crystal clear', 'Get clear on the life you want and what matters most to your family.',
        ['Write your Dream Life vision statement', 'Agree your top five family values', 'Narrow the shortlist to two areas'],
        'A vision statement you would happily read out loud', 'When you picture an ordinary Tuesday in your new life, what do you see?'),
      week('Explore', 'Explore your possibilities', 'Explore how you could earn, live and spend your days, and notice the beliefs that get in the way.',
        ['List your transferable skills and three income ideas', 'Research living costs for your shortlisted areas', 'Write down one “what if it goes wrong” thought and the evidence against it'],
        'A draft income plan you both feel calmer about', 'Which belief about money or work is quietly running the show?'),
      week('Get exit ready', 'Turn overwhelm into organisation', 'Research the practical requirements and organise everything in one place.',
        ['Book a call with a qualified immigration adviser', 'Move every document you have into your Vault folders', 'Add all known dates to Important Dates'],
        'Every known document and date in one place', 'What felt lighter once it was written down?'),
      week('Trust & take action', 'Build momentum', 'Move through hesitation, review how far you have come and choose your next steps.',
        ['Review your progress with your coach', 'Choose your next three stepping stones', 'Share your plan with one person you trust'],
        'Your next three stepping stones, chosen and dated', 'What would your future self thank you for doing this week?'),
    ],
  };
}

export const DEFAULT_FOLDERS: [string, string][] = [
  ['Identity & Passports', 'Passports, birth and marriage certificates'],
  ['Visas & Immigration', 'Research, applications and correspondence'],
  ['Insurance & Healthcare', 'Policies, quotes and medical records'],
  ['Flights & Travel', 'Bookings, itineraries and travel plans'],
  ['Accommodation', 'Rentals, viewings and contracts'],
  ['Finances & Employment', 'Budgets, payslips and bank letters'],
  ['Family & Education', 'School records, applications and childcare'],
  ['Other Important Documents', 'Anything that doesn’t fit elsewhere'],
];

const defaultFolders = (): Folder[] => DEFAULT_FOLDERS.map(([name, description], i) => ({ id: `f${i + 1}`, name, description }));

export function officialContacts(): Contact[] {
  const gov = (name: string, url: string, note: string): Contact => ({
    id: uid(), name, org: 'GOV.UK', categories: ['Official resources'], url, email: '', phone: '', note, official: true,
  });
  return [
    gov('Foreign travel advice', 'https://www.gov.uk/foreign-travel-advice', 'Entry requirements, safety and local laws by country.'),
    gov('Find a British embassy or consulate', 'https://www.gov.uk/world/embassies', 'Help and services abroad.'),
    gov('Tax if you leave the UK', 'https://www.gov.uk/tax-right-retire-abroad-return-to-uk', 'Tell HMRC and check what you still pay.'),
    gov('Renew or replace an adult passport', 'https://www.gov.uk/renew-adult-passport', 'Allow plenty of time before you travel.'),
    gov('Working abroad', 'https://www.gov.uk/working-abroad', 'National Insurance, pensions and benefits.'),
  ];
}

export function emptyProfile(): Profile {
  return { name: '', moving: '', country: '', destinationStatus: '', timeframe: '', targetDate: '', stage: '', priorities: [], concern: '' };
}

export function emptyState(): HubState {
  return {
    version: 1, onboarded: false, profile: emptyProfile(), members: [], tasks: defaultTasks(), plan: starterPlan(),
    folders: defaultFolders(), docs: [], dates: [],
    planner: { vision: '', values: ['', '', '', '', ''], prompts: {}, ahead: { m12: '', m18: '', m24: '' }, milestones: [], journal: [] },
    contacts: officialContacts(), coach: { clients: [] },
  };
}

export function householdFromMoving(name: string, moving: Profile['moving']): Member[] {
  const me: Member = { id: uid(), name: name || 'Me', relation: 'Me', isChild: false };
  if (moving === 'couple') return [me, { id: uid(), name: 'Partner', relation: 'Partner', isChild: false }];
  if (moving === 'family') return [
    me, { id: uid(), name: 'Partner', relation: 'Partner', isChild: false },
    { id: uid(), name: 'Child 1', relation: 'Child', isChild: true }, { id: uid(), name: 'Child 2', relation: 'Child', isChild: true },
  ];
  return [me];
}

export function sampleClients(livePct: number, liveWeek: number): HubState['coach']['clients'] {
  const plan = (w: number) => ({ ...starterPlan(), currentWeek: w });
  return [
    { id: 'demo-sarah', name: 'Sarah Mitchell', email: 'sarah.mitchell@example.com', access: 'active', sessionDate: addDays(todayISO(), -12), week: liveWeek, pct: livePct, live: true },
    { id: 'demo-reed', name: 'Tom & Priya Reed', email: 'reed.family@example.com', access: 'invited', sessionDate: addDays(todayISO(), 4), week: null, pct: 0, live: false, plan: plan(1) },
    { id: 'demo-hale', name: 'Dawn Hale', email: 'dawn.hale@example.com', access: 'active', sessionDate: addDays(todayISO(), -30), week: 4, pct: 62, live: false, plan: plan(4) },
    { id: 'demo-ellis', name: 'Mark Ellis', email: 'mark.ellis@example.com', access: 'paused', sessionDate: addDays(todayISO(), -60), week: 4, pct: 81, live: false, plan: plan(4) },
  ];
}

export function demoState(): HubState {
  const s = emptyState();
  const t = todayISO();
  s.onboarded = true;
  s.profile = {
    name: 'Sarah', moving: 'family', country: 'Portugal', destinationStatus: 'chosen', timeframe: '6-12',
    targetDate: addDays(t, 240), stage: 'planning', priorities: ['Visas & Immigration', 'Finances', 'Family & Children'],
    concern: 'Getting the visa paperwork right without losing a year to it, and making sure the kids settle.',
  };
  const [sarah, james, ella, leo]: Member[] = [
    { id: 'm-sarah', name: 'Sarah', relation: 'Me', isChild: false },
    { id: 'm-james', name: 'James', relation: 'Partner', isChild: false },
    { id: 'm-ella', name: 'Ella', relation: 'Daughter', isChild: true },
    { id: 'm-leo', name: 'Leo', relation: 'Son', isChild: true },
  ];
  s.members = [sarah, james, ella, leo];

  const done = ['Write your Dream Life vision statement', 'Agree your family’s top values', 'Shortlist destinations that fit your vision',
    'Check passport expiry dates for everyone moving', 'Research official immigration pathways', 'Estimate relocation costs',
    'Research destination living costs', 'Compare flight options'];
  s.tasks.forEach((task) => { if (done.includes(task.title)) task.status = 'completed'; });
  const tweak = (title: string, patch: Partial<Task>) => Object.assign(s.tasks.find((x) => x.title === title)!, patch);
  tweak('Check eligibility requirements with authoritative sources', { status: 'in_progress', due: addDays(t, 10), notes: 'Ask Ana about the D7 vs digital nomad route.' });
  tweak('Renew any passports that expire soon', { due: addDays(t, 40), memberId: ella.id });
  tweak('Research schooling or childcare', { status: 'in_progress', due: addDays(t, 23), memberId: ella.id });
  tweak('Review savings', { due: addDays(t, 14) });
  tweak('Plan your first week', { status: 'not_started' });

  s.plan.coachNote = 'Sarah, you did brilliantly in week one. This week is about possibilities, not decisions. Be curious, write things down and bring your questions to our next call.';
  s.plan.personalised = true;
  s.plan.currentWeek = 2;
  s.plan.weeks[0].actions[1].text = 'Agree your top five family values with James';
  s.plan.weeks[1].actions[1].text = 'Research living costs for Cascais and Porto';
  s.plan.weeks[0].actions.forEach((a) => (a.done = true));
  s.plan.weeks[0].milestoneDone = true;
  s.plan.weeks[0].reflectionA = 'Slow mornings, the sea nearby and James home for dinner every night.';
  s.plan.weeks[1].actions[0].done = true;

  const folder = (name: string) => s.folders.find((f) => f.name === name)!.id;
  const doc = (name: string, f: string, memberId: string, reviewDate: string, tags: string[], description: string, size: number, type = 'PDF'): Doc => ({
    id: uid(), folderId: folder(f), name, memberId, reviewDate, tags, description, type, size, added: addDays(t, -Math.floor(Math.random() * 40) - 1), demo: true,
  });
  s.docs = [
    doc('Passport copy (Sarah)', 'Identity & Passports', sarah.id, addDays(t, 1100), ['passport'], 'Scan of photo page.', 412_000, 'JPG'),
    doc('Passport copy (Ella)', 'Identity & Passports', ella.id, addDays(t, 40), ['passport', 'renewal'], 'Expires soon. Renewal booked.', 380_000, 'JPG'),
    doc('Marriage certificate', 'Identity & Passports', '', '', ['certificate'], 'Certified copy.', 220_000),
    doc('Visa research notes', 'Visas & Immigration', '', addDays(t, 30), ['visa', 'research'], 'Comparing routes before the adviser call.', 96_000),
    doc('Health insurance quotes', 'Insurance & Healthcare', '', addDays(t, 16), ['insurance', 'quotes'], 'Three quotes, family cover.', 540_000),
    doc('Flight options shortlist', 'Flights & Travel', '', '', ['flights'], 'Summer dates from Bristol and Gatwick.', 64_000),
    doc('Rental viewing notes', 'Accommodation', '', '', ['cascais', 'rental'], 'Notes from video viewings.', 128_000),
    doc('Relocation budget', 'Finances & Employment', james.id, '', ['budget'], 'First-year budget, two scenarios.', 88_000),
    doc('School shortlist', 'Family & Education', ella.id, '', ['school'], 'Three international schools near Cascais.', 150_000),
    doc('School report (Leo)', 'Family & Education', leo.id, '', ['school', 'report'], 'Year 4 summer report.', 310_000),
  ];
  s.docs.sort((a, b) => b.added.localeCompare(a.added));

  const date = (title: string, d: number, category: string, reminder: string, memberId = '', notes = ''): HubDate => ({
    id: uid(), title, date: addDays(t, d), category, reminder, memberId, notes, done: false,
  });
  s.dates = [
    date('Call with immigration adviser', 10, 'Visa & Immigration', '1d', '', 'Bring the visa research notes.'),
    date('Insurance quotes due back', 16, 'Insurance & Health', 'day'),
    date('School open morning (online)', 23, 'Family & Education', '1w', ella.id),
    date('Submit Ella’s passport renewal', 40, 'Passport & ID', '1w', ella.id),
    date('Give notice on UK tenancy', 150, 'Leaving the UK', '1m'),
    date('Planned relocation date', 240, 'Milestone', '1m'),
  ];

  s.planner = {
    vision: 'We live by the sea in a calm, sunny place where the children grow up outdoors, James and I work in ways that give us our evenings back, and weekends feel like weekends again.',
    values: ['Family time', 'Freedom', 'Adventure', 'Security', 'Health'],
    prompts: {
      'Why do I want to leave the UK?': 'More time together, more light, and a slower pace.',
      'How do I want my days to feel?': 'Unhurried. Purposeful. Outdoors.',
    },
    ahead: { m12: 'Settled in Cascais, kids in school, first summer by the sea.', m18: '', m24: '' },
    milestones: [{ text: 'Told my parents about the plan', done: true }, { text: 'Visited Portugal as a family', done: false }],
    journal: [{ id: uid(), date: addDays(t, -3), text: 'Felt a wobble today about money, but writing the budget down helped. It’s more doable than it felt.' }],
  };

  s.contacts = [
    ...officialContacts(),
    { id: uid(), name: 'Ana Ribeiro', org: 'Example Relocation Advisers', categories: ['Advisers'], url: 'https://example.com', email: 'ana@example.com', phone: '+351 000 000 000', note: 'Fictional adviser for the demo.', official: false },
    { id: uid(), name: 'Admissions office', org: 'Example International School', categories: ['Schools'], url: 'https://example.com', email: 'admissions@example.com', phone: '', note: 'Open morning on the 29th.', official: false },
    { id: uid(), name: 'Joana', org: 'Coastal Rentals', categories: ['Accommodation'], url: '', email: 'joana@example.com', phone: '+351 000 000 001', note: 'Three-bed flats near the beach.', official: false },
  ];
  s.coach.clients = sampleClients(17, 2);
  return s;
}
