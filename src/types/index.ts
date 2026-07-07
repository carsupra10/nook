export interface UserProfile {
  id: string;
  name: string;
  initials: string;
  accent: string;
}

export interface Moment {
  id: string;
  user: UserProfile;
  time: string;
  distance: string;
  disappearsIn: number;
  caption: string;
  comments: number;
  hearts: number;
  flames: number;
  liked: boolean;
  flameActive?: boolean;
  imageUrl?: string;
  likedBy?: string[];
  reactedFlames?: string[];
}

export interface Chat {
  id: string;
  user: UserProfile;
  lastMessage: string;
  time: string;
  streak: number;
  disappearsIn: number;
}

export interface Message {
  id: string;
  from: string;
  text: string;
  time: string;
  imageUrl?: string;
}
