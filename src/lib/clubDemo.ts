// Example members' area for the demo and the try-it version. Not used once signed in.
import type { ClubDemo, LibraryContent, LibraryItem, Post } from './types';

/** Shown in the app and on the join button. Change here to rename the membership. */
export const MEMBERSHIP_NAME = 'The Dream Life Membership';
export const MEMBERSHIP_PERKS = [
  'The full members’ library: masterclass replays, worksheets and guides',
  'The private community with your coach and fellow movers',
  'New resources added every month',
];

const ago = (days: number, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 3_600_000).toISOString();

const item = (id: string, title: string, summary: string, kind: LibraryItem['kind'], category: string, locked: boolean, sort: number, body: string, video_url = ''): LibraryItem & { content: LibraryContent } => ({
  id, title, summary, kind, category, locked, published: true, sort, created_at: ago(30 - sort),
  content: { body, video_url, file_path: null, file_name: null },
});

export function demoClub(member = false): ClubDemo {
  return {
    member,
    library: [
      item('lib-start', 'Start here: your Exit Hub tour', 'How to use your checklist, plan and vault together in ten minutes a week.', 'lesson', 'Getting started', false, 1,
        'Welcome! This short guide shows you how the Hub fits together.\n\n- Each week, open your Four-Week Plan first and pick one action.\n- Tick off checklist tasks as you go. Mark anything that doesn’t apply as Not Applicable.\n- Add every appointment to Important Dates the moment you book it.\n\nTen focused minutes a week beats one overwhelming weekend.'),
      item('lib-visas', 'Visa routes explained', 'Masterclass replay: how to compare residency routes and what to ask an adviser.', 'replay', 'Visas & Immigration', true, 2,
        'In this replay we walk through how to compare residency routes calmly.\n\n- The three questions to answer before you speak to an adviser\n- How to read official guidance without getting lost\n- A template for your adviser call\n\nAlways check the official government website for your destination.'),
      item('lib-budget', 'Relocation budget worksheet', 'A two-scenario budget for your first year abroad, with a simple buffer plan.', 'worksheet', 'Finances', true, 3,
        'Use this worksheet to build two budgets: a careful one and a comfortable one.\n\n- One-off moving costs\n- Monthly living costs in your destination\n- Your emergency buffer\n\nCompare the gap between them: that’s your breathing room.'),
      item('lib-schools', 'Choosing a school abroad', 'The questions to ask on an open morning, and how to involve your children.', 'worksheet', 'Family & Children', true, 4,
        'A checklist of questions for open mornings, plus ideas for helping children feel part of the decision.'),
      item('lib-calm', 'Calm decisions', 'A short guided reflection for when the move feels like too much.', 'video', 'Mindset', true, 5,
        'Find a quiet ten minutes. This reflection helps you separate what you can act on this week from what can wait.'),
      item('lib-30days', 'Your first 30 days abroad', 'A four-part course for settling in: admin, home, community and you.', 'course', 'Arrival Preparation', true, 6,
        'Part 1: The admin that can’t wait\nPart 2: Making a house a home\nPart 3: Finding your people\nPart 4: Looking after yourself through the transition'),
    ],
    posts: demoPosts(),
  };
}

function demoPosts(): Post[] {
  const p = (id: string, author_id: string, author_name: string, author_role: string, body: string, created_at: string, pinned = false,
    comments: [string, string, string, number][] = [], reactions: [string, Post['reactions'][number]['emoji']][] = []): Post => ({
    id, author_id, author_name, author_role, body, pinned, created_at,
    comments: comments.map(([cid, name, text, d], i) => ({ id: cid, post_id: id, author_id: `demo-${name.toLowerCase()}`, author_name: name, author_role: name === 'Coach' ? 'coach' : 'client', body: text, created_at: ago(d, -i) })),
    reactions: reactions.map(([user_id, emoji]) => ({ post_id: id, user_id, emoji })),
  });
  return [
    p('post-welcome', 'demo-coach', 'Coach', 'coach',
      'Welcome to the community! 🌅 This is your space to share wins, ask questions and cheer each other on. Introduce yourself below: where are you heading, and what’s one thing you’re excited about?',
      ago(12), true, [['c1', 'Priya', 'Hi everyone! Heading to Lisbon with Tom next spring. Most excited about long evening walks.', 11], ['c2', 'Dawn', 'Valencia for me 🍊 Excited and terrified in equal measure!', 10]],
      [['demo-priya', 'heart'], ['demo-dawn', 'heart'], ['demo-mark', 'clap']]),
    p('post-dawn', 'demo-dawn', 'Dawn', 'client',
      'Small win: I finally booked the call with an immigration adviser. I’d been putting it off for weeks. Feels so much lighter now it’s in the diary.',
      ago(2, 3), false, [['c3', 'Coach', 'This is huge, Dawn. Bring your questions list to our next session!', 2]], [['demo-priya', 'clap'], ['demo-coach', 'sparkle']]),
    p('post-priya', 'demo-priya', 'Priya', 'client',
      'Question for anyone with kids: how did you talk to them about the move before it was certain? We don’t want to unsettle ours.',
      ago(0, 6), false, [], [['demo-dawn', 'heart']]),
  ];
}
