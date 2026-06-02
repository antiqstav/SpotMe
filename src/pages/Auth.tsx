import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import type { WorkoutType, Goal } from '../types'

const WORKOUT_OPTIONS: { value: WorkoutType; label: string }[] = [
  { value: 'running_cycling', label: 'Running / Cycling' },
  { value: 'weightlifting', label: 'Weightlifting' },
  { value: 'calisthenics', label: 'Calisthenics' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'outdoor', label: 'Outdoor Activities' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'other', label: 'Other' },
]

const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: 'weight_loss', label: 'Weight Loss' },
  { value: 'muscle_gain', label: 'Muscle Gain' },
  { value: 'endurance', label: 'Endurance Building' },
  { value: 'social', label: 'Social Needs' },
  { value: 'long_term_health', label: 'Long-Term Health' },
]

const Auth = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Login fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Signup fields
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>([])
  const [goal, setGoal] = useState<Goal | ''>('')

  const toggleWorkout = (w: WorkoutType) => {
    setWorkoutTypes(prev =>
      prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]
    )
  }

  const getLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => geocodeCity()
        )
      } else {
        geocodeCity().then(resolve)
      }
    })

    async function geocodeCity() {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`
        )
        const data = await res.json()
        if (data.length > 0) {
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
        }
      } catch {}
      return { lat: 0, lng: 0 }
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/home')
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goal) return setError('Please select a goal.')
    if (workoutTypes.length === 0) return setError('Please select at least one workout type.')
    setLoading(true)
    setError('')
    try {
      const { lat, lng } = await getLocation()
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await sendEmailVerification(cred.user)
      await setDoc(doc(db, 'users', cred.user.uid), {
        userId: cred.user.uid,
        name,
        age: parseInt(age),
        city,
        lat,
        lng,
        phone,
        email,
        workoutType: workoutTypes,
        goal,
        profilePicUrl: null,
        emailVerified: false,
        isVerified: false,
        activeConnectionId: null,
        createdAt: serverTimestamp(),
      })
      navigate('/home')
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  const inputClass = "w-full bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-3 text-sm font-body focus:outline-none focus:border-brand-orange transition-colors"

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="font-display text-5xl font-black uppercase text-brand-orange text-center mb-2">
          Spot Me
        </h1>
        <p className="text-white/40 text-center text-sm font-body mb-8 uppercase tracking-widest">
          {mode === 'login' ? 'Welcome back' : 'Create your profile'}
        </p>

        {/* Mode toggle */}
        <div className="flex mb-8 border border-white/10">
          {(['login', 'signup'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-3 font-display font-bold uppercase tracking-widest text-sm transition-colors ${
                mode === m ? 'bg-brand-orange text-white' : 'text-white/40 hover:text-white'
              }`}
            >
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 mb-6 font-body">
            {error}
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input className={inputClass} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input className={inputClass} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="submit" disabled={loading}
              className="bg-brand-orange hover:bg-brand-deep text-white font-display font-bold uppercase tracking-widest py-4 mt-2 transition-colors disabled:opacity-50">
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <input className={inputClass} type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required />
            <div className="grid grid-cols-2 gap-4">
              <input className={inputClass} type="number" placeholder="Age" min="16" max="100" value={age} onChange={e => setAge(e.target.value)} required />
              <input className={inputClass} type="text" placeholder="Closest City" value={city} onChange={e => setCity(e.target.value)} required />
            </div>
            <input className={inputClass} type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} required />
            <input className={inputClass} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input className={inputClass} type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} required />

            {/* Workout types */}
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest font-body mb-3">Workout Types (multi-select)</p>
              <div className="grid grid-cols-2 gap-2">
                {WORKOUT_OPTIONS.map(opt => (
                  <button type="button" key={opt.value}
                    onClick={() => toggleWorkout(opt.value)}
                    className={`py-2 px-3 text-xs font-body border transition-colors text-left ${
                      workoutTypes.includes(opt.value)
                        ? 'border-brand-orange bg-brand-orange/10 text-brand-orange'
                        : 'border-white/10 text-white/50 hover:border-white/30'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Goal */}
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest font-body mb-3">Primary Goal</p>
              <div className="grid grid-cols-1 gap-2">
                {GOAL_OPTIONS.map(opt => (
                  <button type="button" key={opt.value}
                    onClick={() => setGoal(opt.value)}
                    className={`py-2 px-3 text-xs font-body border transition-colors text-left ${
                      goal === opt.value
                        ? 'border-brand-orange bg-brand-orange/10 text-brand-orange'
                        : 'border-white/10 text-white/50 hover:border-white/30'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="bg-brand-orange hover:bg-brand-deep text-white font-display font-bold uppercase tracking-widest py-4 mt-2 transition-colors disabled:opacity-50">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
            <p className="text-white/30 text-xs text-center font-body">
              A verification email will be sent to confirm your address.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export default Auth
