// CLIQUE SCC 26-27 — full member roster with dossier data. Everything under
// `keyValues` renders verbatim as the JSON block on the member page, so add
// or rename keys freely per member — the dossier adapts.

export interface Member {
  slug: string;
  name: string;
  nodeNum: number;
  oneLiner: string;
  mantra: string;
  photo?: string;
  keyValues: Record<string, string>;
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Member portraits live in src/assets/members, named by the member's first
// name (e.g. Bhavnish.jpeg). Matched to each member below.
const memberImages = import.meta.glob('../assets/members/*.{jpeg,jpg,png,JPEG,JPG,PNG}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const photoByFirstName: Record<string, string> = {};
for (const [path, src] of Object.entries(memberImages)) {
  const file = path.split('/').pop() ?? '';
  const key = file.replace(/\.[^.]+$/, '').toLowerCase();
  photoByFirstName[key] = src;
}

// Filenames that don't exactly match a member's first name.
const PHOTO_ALIASES: Record<string, string> = { aryan: 'aaryan' };

const photoFor = (name: string): string | undefined => {
  const key = name.split(/\s+/)[0].toLowerCase();
  return photoByFirstName[key] ?? photoByFirstName[PHOTO_ALIASES[key]];
};

const RAW: Omit<Member, 'slug'>[] = [
  {
    name: 'Dharm Thummar',
    nodeNum: 1,
    oneLiner:
      'A visionary tech leader who thrives on innovation, curiosity, and building solutions that make a real-world impact.',
    mantra: 'Stay Curious. Keep Building.',
    keyValues: {
      node: '#1/13',
      role: 'President',
      codename: 'The Tech Innovator',
      personality: 'ENTP-T',
      focus: 'AI × Space Tech × Product',
      mission: 'Learn • Build • Analyze • Innovate',
      status: 'ACTIVE',
      vibe: 'Visionary',
    },
  },
  {
    name: 'Bhavnish Nanda',
    nodeNum: 2,
    oneLiner: 'An analytical leader who blends curiosity, technology, and execution to create meaningful impact.',
    mantra: 'Stay hungry to learn, stay disciplined to grow, and never stop building your next floor.',
    keyValues: {
      node: '#2/13',
      role: 'Student Coordinator',
      codename: 'The Analytical Mind',
      personality: 'ENTJ',
      strength: 'Analytical Thinking',
      mission: 'Learn • Execute • Grow',
      status: 'ACTIVE',
      vibe: 'Growth-Oriented',
    },
  },
  {
    name: 'Dev Mehta',
    nodeNum: 3,
    oneLiner: 'A tech-driven innovator who thrives at the intersection of AI, startups, and leadership.',
    mantra: 'I aim to be the youngest in the room.',
    keyValues: {
      node: '#3/13',
      role: 'Technical Team',
      archetype: 'Startup Enthusiast',
      specialization: 'AI × Technology',
      personality: 'Extrovert',
      fuel: 'Tea',
      mission: 'Build. Innovate. Lead.',
      status: 'ACTIVE',
      vibe: 'Ambitious',
    },
  },
  {
    name: 'Raghav Joshi',
    nodeNum: 4,
    oneLiner: 'A curious builder who enjoys solving problems and creating meaningful impact through technology.',
    mantra: 'Be the light you wish to see.',
    keyValues: {
      node: '#4/13',
      role: 'Student Coordinator',
      personality: 'ENFJ',
      mindset: 'Curious • Builder • Ambitious',
      strength: 'Innovation',
      mission: "Let's Build The Future",
      status: 'ACTIVE',
      vibe: 'Future-Driven',
    },
  },
  {
    name: 'Sparsh Partani',
    nodeNum: 5,
    oneLiner: 'A multidisciplinary thinker who blends technology, cybersecurity, marketing, and finance.',
    mantra: 'Do Well, Expect Well & All is Well.',
    keyValues: {
      node: '#5/13',
      role: 'INTP-A',
      domain: 'Cybersecurity × Marketing × Finance',
      obsession: 'Continuous Learning',
      inspiration: 'Einstein → Bose → Verstappen',
      mission: 'Think Bigger. Build Better.',
      status: 'ACTIVE',
      vibe: 'Analytical',
    },
  },
  {
    name: 'Hardik Jain',
    nodeNum: 6,
    oneLiner: 'A resilient and driven individual who believes success comes from strong values.',
    mantra: 'Always BELIEVE in KARMA.',
    keyValues: {
      node: '#6/13',
      role: 'B.Tech–MBA',
      mindset: 'Believe in Karma',
      trait: 'Koinophobic',
      inspiration: 'Kobe Bryant × Harvey Specter',
      strength: 'Resilience',
      status: 'ACTIVE',
      vibe: 'Fearlessly Focused',
    },
  },
  {
    name: 'Chinmay',
    nodeNum: 7,
    oneLiner:
      'A calm and grounded builder who believes meaningful work, honesty, and continuous learning create lasting impact.',
    mantra: 'Be happy and do your work.',
    keyValues: {
      node: '#7/13',
      role: 'B.Tech CSE–MBA',
      mindset: 'Simple • Honest • Consistent',
      domain: 'Technology × Finance',
      guiding_star: 'Parents • Ramanujan Sir • Shivaji Maharaj',
      core_value: 'Integrity',
      status: 'ACTIVE',
      vibe: 'Grounded',
    },
  },
  {
    name: 'Ansh Shah',
    nodeNum: 8,
    oneLiner: 'A logical thinker who enjoys building practical solutions with code.',
    mantra: 'Aim more to achieve more.',
    keyValues: {
      node: '#8/13',
      role: 'Integrated B.Tech–MBA',
      mindset: 'Ambitious • Curious • Logical',
      toolkit: 'Python × Streamlit × VS Code',
      core_skill: 'Application Development',
      learning_mode: 'Build • Experiment • Improve',
      status: 'ACTIVE',
      vibe: 'Growth-Oriented',
    },
  },
  {
    name: 'Nandini Agarwal',
    nodeNum: 9,
    oneLiner: 'A creative and cheerful soul who brings warmth, fresh ideas, and positive energy.',
    mantra: "Follow Phil's-osophy.",
    keyValues: {
      node: '#9/13',
      role: 'Integrated B.Tech–MBA',
      mindset: 'Creative • Cheerful • Family-First',
      comfort_zone: 'Coffee × Music × Sitcoms',
      core_value: 'Relationships Over Everything',
      inspiration: "Phil Dunphy's Optimism",
      status: 'ACTIVE',
      vibe: 'Wholesome',
    },
  },
  {
    name: 'Dhun Chhabra',
    nodeNum: 10,
    oneLiner: 'A grounded achiever who blends ambition with humility.',
    mantra: 'Be kind. Work hard. Stay humble.',
    keyValues: {
      node: '#10/13',
      role: 'Finance Major',
      mindset: 'Kind • Humble • Hardworking',
      passion: 'Finance & Personal Growth',
      inspiration: 'Success Stories',
      strength: 'Consistency',
      status: 'ACTIVE',
      vibe: 'Grace Under Pressure',
    },
  },
  {
    name: 'Aryan Patel',
    nodeNum: 11,
    oneLiner: 'A disciplined and consistent learner.',
    mantra: 'Trust the Process.',
    keyValues: {
      node: '#11/13',
      role: 'MBA-FT',
      mindset: 'Consistent',
      focus: 'Finance × Cricket',
      inspiration: 'Warren Buffett',
      playbook: 'Long-Term Thinking',
      status: 'ACTIVE',
      vibe: 'Process-Driven',
    },
  },
  {
    name: 'Raunak Prasad',
    nodeNum: 12,
    oneLiner: 'A disciplined builder who believes consistent effort beats competition.',
    mantra: 'Your only competition is you.',
    keyValues: {
      node: '#12/13',
      role: 'B.Tech–MBA',
      playbook: 'Discipline > Comparison',
      specialization: 'Coding & Problem Solving',
      driven_by: 'Self Improvement',
      fuel: 'Football × Anime × Gym',
      status: 'ACTIVE',
      vibe: 'Focused',
    },
  },
  {
    name: 'Rudraksh Chhabra',
    nodeNum: 13,
    oneLiner:
      'A tech enthusiast who believes the best ideas come alive when curiosity meets consistency.',
    mantra: 'Think. Code. Create. Repeat.',
    keyValues: {
      node: '#13/13',
      role: 'SCC 26-27',
      archetype: 'Full-Stack Builder',
      specialization: 'Software Development',
      fuel: 'Chai',
      mission: 'Ship Fast. Learn Faster.',
      status: 'ACTIVE',
      vibe: 'Always Shipping',
    },
  },
];

export const MEMBERS: Member[] = RAW.map((m) => ({ ...m, slug: slugify(m.name), photo: photoFor(m.name) }));

export const memberBySlug = (slug: string): Member | undefined =>
  MEMBERS.find((m) => m.slug === slug);

export const memberIndex = (slug: string): number => MEMBERS.findIndex((m) => m.slug === slug);

export const slugForName = (name: string): string => slugify(name);

// Junior crew shown in the /gauntlet "How did you hear about us?" referral
// field — kept separate so the main MEMBERS roster (seniors) stays untouched.
export const GAUNTLET_REFERRALS: Member[] = [
  'Harsh Patel',
  'Dinesh Raju S',
  'Ayush Yadav',
  'Vansh Kodinariya',
  'Charu Kotai',
  'Taruna Agrawal',
  'Nisarg Modi',
  'Kavya Bagherwal',
  'Dhawal Khandelwal',
  'Drishti Rathod',
  'Oshoasheesh Keswani',
  'Utkarsh Mishra',
].map((name, i) => ({
  slug: slugify(name),
  name,
  nodeNum: i + 1,
  oneLiner: '',
  mantra: '',
  keyValues: {},
}));
