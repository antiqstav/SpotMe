export type WorkoutType =
  | 'running_cycling'
  | 'weightlifting'
  | 'calisthenics'
  | 'yoga'
  | 'outdoor'
  | 'hiit'
  | 'other'

export type Goal =
  | 'weight_loss'
  | 'muscle_gain'
  | 'endurance'
  | 'social'
  | 'long_term_health'

export interface UserProfile {
  userId: string
  name: string
  age: number
  city: string
  lat: number
  lng: number
  phone: string
  email: string
  workoutType: WorkoutType[]
  goal: Goal
  emailVerified: boolean
  isVerified: boolean
  activeConnectionId: string | null
  createdAt: number
}

export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'broken'

export interface Connection {
  connectionId: string
  fromUserId: string
  toUserId: string
  status: ConnectionStatus
  breakReason: string | null
  createdAt: number
  updatedAt: number
}

// Fuzzed user shown on the map — no exact lat/lng exposed
export interface PublicUserPin {
  userId: string
  name: string
  age: number
  city: string
  fuzzedLat: number
  fuzzedLng: number
  workoutType: WorkoutType[]
  goal: Goal
  isVerified: boolean
}
