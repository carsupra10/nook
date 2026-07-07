import { UserProfile, Moment, Chat, Message } from '../types';

export const ACCENTS: Record<string, string> = {
  maya: '#3b82f6', // blue
  priya: '#8b5cf6', // purple
  jordan: '#d97706', // orange/brown
  you: '#737373', // gray
};

export const USERS: Record<string, UserProfile> = {
  you: { id: 'you', name: 'you', initials: 'Y', accent: ACCENTS.you },
  maya: { id: 'maya', name: 'maya', initials: 'M', accent: ACCENTS.maya },
  priya: { id: 'priya', name: 'priya', initials: 'P', accent: ACCENTS.priya },
  jordan: { id: 'jordan', name: 'jordan', initials: 'J', accent: ACCENTS.jordan },
};

export const INITIAL_MOMENTS: Moment[] = [
  {
    id: '1',
    user: USERS.maya,
    time: '3h ago',
    distance: '2 mi',
    disappearsIn: 21,
    caption: 'sunday ritual, coffee number three, no regrets',
    comments: 0,
    hearts: 12,
    flames: 4,
    liked: false,
    imageUrl: 'coffee', // using string as identifier for the icon
  },
  {
    id: '2',
    user: USERS.priya,
    time: '1h ago',
    distance: '0.5 mi',
    disappearsIn: 23,
    caption: 'first hike of the season, legs are already done',
    comments: 0,
    hearts: 8,
    flames: 6,
    liked: false,
    imageUrl: 'mountain',
  },
  {
    id: '3',
    user: USERS.jordan,
    time: '5h ago',
    distance: '4 mi',
    disappearsIn: 19,
    caption: 'making pasta from scratch, send help',
    comments: 0,
    hearts: 15,
    flames: 9,
    liked: false,
    imageUrl: 'flame',
  }
];

export const INITIAL_CHATS: Chat[] = [];
export const INITIAL_MESSAGES: Record<string, Message[]> = {};
