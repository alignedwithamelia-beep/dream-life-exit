export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'not_applicable';
export type Priority = 'high' | 'medium' | 'low';

export type Profile = {
  name: string;
  moving: '' | 'alone' | 'couple' | 'family';
  country: string;
  destinationStatus: '' | 'chosen' | 'narrowing' | 'exploring';
  timeframe: '' | '0-3' | '3-6' | '6-12' | '12+' | 'unsure';
  targetDate: string;
  stage: '' | 'dreaming' | 'researching' | 'planning' | 'booking' | 'ready';
  priorities: string[];
  concern: string;
};

export type Member = { id: string; name: string; relation: string; isChild: boolean };

export type Task = {
  id: string; title: string; category: string; status: TaskStatus; priority: Priority;
  due: string; memberId: string; docId: string; link: string; notes: string; custom: boolean;
};

export type Step = { text: string; done: boolean };

export type Week = {
  theme: string; subLabel: string; focus: string;
  milestone: string; milestoneDone: boolean;
  reflectionQ: string; reflectionA: string; notes: string;
  actions: Step[]; extras: Step[];
};

export type Plan = { coachNote: string; currentWeek: number; personalised: boolean; weeks: Week[] };

export type Folder = { id: string; name: string; description: string };

export type Doc = {
  id: string; folderId: string; name: string; memberId: string; reviewDate: string;
  tags: string[]; description: string; type: string; size: number; added: string;
  demo: boolean; path?: string;
};

export type HubDate = {
  id: string; title: string; date: string; category: string; reminder: string;
  memberId: string; notes: string; done: boolean;
};

export type Planner = {
  vision: string; values: string[]; prompts: Record<string, string>;
  ahead: { m12: string; m18: string; m24: string };
  milestones: Step[]; journal: { id: string; date: string; text: string }[];
};

export type Contact = {
  id: string; name: string; org: string; categories: string[]; url: string;
  email: string; phone: string; note: string; official: boolean;
};

export type Access = 'active' | 'invited' | 'paused';

export type CoachClient = {
  id: string; name: string; email: string; access: Access; sessionDate: string;
  week: number | null; pct: number; live: boolean; plan?: Plan;
  summary?: ClientSummary | null; lastActive?: string; membership?: Membership;
};

export type HubState = {
  version: 1;
  onboarded: boolean;
  profile: Profile;
  members: Member[];
  tasks: Task[];
  plan: Plan;
  folders: Folder[];
  docs: Doc[];
  dates: HubDate[];
  planner: Planner;
  contacts: Contact[];
  coach: { clients: CoachClient[] };
  club: ClubDemo;
};

/** What a client shares with their coach besides the plan: answers and progress, never documents, dates, journal or contacts. */
export type ClientSummary = {
  profile: Profile;
  household: { adults: number; children: number };
  checklist: {
    done: number; total: number; pct: number; overdue: number;
    byStatus: Record<TaskStatus, number>;
    byCategory: { category: string; done: number; total: number; pct: number }[];
  };
  updatedAt: string;
};

/* ---------- Membership, library and community ---------- */

export type Membership = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';
export type LibraryKind = 'lesson' | 'video' | 'worksheet' | 'replay' | 'course';

export type LibraryItem = {
  id: string; title: string; summary: string; kind: LibraryKind; category: string;
  locked: boolean; published: boolean; sort: number; created_at?: string;
};
export type LibraryContent = { body: string; video_url: string; file_path?: string | null; file_name?: string | null };

export type Reaction = { post_id: string; user_id: string; emoji: 'heart' | 'clap' | 'sparkle' };
export type PostComment = { id: string; post_id: string; author_id: string; author_name: string; author_role: string; body: string; created_at: string };
export type Post = {
  id: string; author_id: string; author_name: string; author_role: string; body: string; pinned: boolean;
  created_at: string; edited_at?: string | null; comments: PostComment[]; reactions: Reaction[];
};

/** Demo-only copy of the members' area (the real one lives in Supabase). */
export type ClubDemo = { member: boolean; library: (LibraryItem & { content: LibraryContent })[]; posts: Post[] };
