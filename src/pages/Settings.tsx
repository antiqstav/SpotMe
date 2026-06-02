import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore'
import { signOut, sendEmailVerification, deleteUser } from 'firebase/auth'
import { auth, db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import type { UserProfile, WorkoutType, Goal } from '../types'
import Avatar from '../components/Avatar'

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

const Settings = () => {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>([])
  const [goal, setGoal] = useState<Goal | ''>('')
  const [saving, setSaving] = useState(false)
  const [verifyMsg, setVerifyMsg] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), snap => {
      if (!snap.exists()) return
      const p = snap.data() as UserProfile
      setProfile(p)
      setName(p.name)
      setAge(String(p.age))
      setCity(p.city)
      setPhone(p.phone)
      setWorkoutTypes(p.workoutType)
      setGoal(p.goal)
    })
    return unsub
  }, [currentUser])

  const toggleWorkout = (w: WorkoutType) => {
    setWorkoutTypes(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w])
  }

  const handleSave = async () => {
    if (!currentUser || !goal) return
    setSaving(true)
    const isVerified = currentUser.emailVerified
    await updateDoc(doc(db, 'users', currentUser.uid), {
      name, age: parseInt(age), city, phone,
      workoutType: workoutTypes, goal,
      emailVerified: currentUser.emailVerified,
      isVerified,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleVerifyEmail = async () => {
    if (!currentUser) return
    await sendEmailVerification(currentUser)
    setVerifyMsg('Verification email sent! Check your inbox.')
  }

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/')
  }

  const handleDelete = async () => {
    if (!currentUser) return
    await deleteDoc(doc(db, 'users', currentUser.uid))
    await deleteUser(currentUser)
    navigate('/')
  }

  const inputClass = "w-full bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-3 text-sm font-body focus:outline-none focus:border-brand-orange transition-colors"

  return (
    <div className="min-h-screen bg-brand-dark px-4 py-10">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate('/home')}
          className="text-white/40 hover:text-white font-display text-xs uppercase tracking-widest mb-8 transition-colors">
          ← Back to Map
        </button>

        <h2 className="font-display text-4xl font-black uppercase text-brand-orange mb-1">Settings</h2>
        <p className="text-white/40 text-xs font-body uppercase tracking-widest mb-8">Edit your profile</p>

        {/* Avatar */}
        <div className="bg-white/5 border border-white/10 p-5 mb-4">
          <p className="text-white/40 text-xs uppercase tracking-widest font-body mb-3">Profile Picture</p>
          <div className="flex items-center gap-4">
            <Avatar name={profile?.name} size="lg" verified={profile?.isVerified} />
            <div>
              <p className="text-white/50 text-sm font-body">Avatar uses your initials for now</p>
              <p className="text-white/25 text-xs font-body mt-1">Profile photo uploads coming in v2</p>
            </div>
          </div>
        </div>

        {/* Verification */}
        <div className="bg-white/5 border border-white/10 p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/40 text-xs uppercase tracking-widest font-body">Verification Checkmark</p>
            {profile?.isVerified ? <span className="text-brand-orange text-sm font-display font-bold">Not verified</span> : <span className="text-white/20 text-xs font-body">✓ Verified</span>}
          </div>
          <p className="text-white/30 text-xs font-body mb-3">Requires a verified email address</p>
          {!currentUser?.emailVerified && (
            <button onClick={handleVerifyEmail}
              className="border border-brand-orange/30 text-brand-orange font-display text-xs uppercase px-4 py-2 hover:bg-brand-orange/10 transition-colors">
              Send Verification Email
            </button>
          )}
          {verifyMsg && <p className="text-green-400 text-xs font-body mt-2">{verifyMsg}</p>}
          {currentUser?.emailVerified && <p className="text-green-400 text-xs font-body">✓ Email verified</p>}
        </div>

        {/* Edit profile */}
        <div className="bg-white/5 border border-white/10 p-5 mb-4 flex flex-col gap-3">
          <p className="text-white/40 text-xs uppercase tracking-widest font-body">Profile Info</p>
          <input className={inputClass} type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} type="number" placeholder="Age" value={age} onChange={e => setAge(e.target.value)} />
            <input className={inputClass} type="text" placeholder="Closest City" value={city} onChange={e => setCity(e.target.value)} />
          </div>
          <input className={inputClass} type="tel" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />

          <p className="text-white/30 text-xs uppercase tracking-widest font-body mt-1">Workout Types</p>
          <div className="grid grid-cols-2 gap-2">
            {WORKOUT_OPTIONS.map(opt => (
              <button type="button" key={opt.value} onClick={() => toggleWorkout(opt.value)}
                className={`py-2 px-3 text-xs font-body border transition-colors text-left ${
                  workoutTypes.includes(opt.value)
                    ? 'border-brand-orange bg-brand-orange/10 text-brand-orange'
                    : 'border-white/10 text-white/50 hover:border-white/30'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>

          <p className="text-white/30 text-xs uppercase tracking-widest font-body mt-1">Primary Goal</p>
          <div className="grid grid-cols-1 gap-2">
            {GOAL_OPTIONS.map(opt => (
              <button type="button" key={opt.value} onClick={() => setGoal(opt.value)}
                className={`py-2 px-3 text-xs font-body border transition-colors text-left ${
                  goal === opt.value
                    ? 'border-brand-orange bg-brand-orange/10 text-brand-orange'
                    : 'border-white/10 text-white/50 hover:border-white/30'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>

          <button onClick={handleSave} disabled={saving}
            className="bg-brand-orange hover:bg-brand-deep text-white font-display font-bold uppercase tracking-widest py-3 transition-colors disabled:opacity-50 mt-1">
            {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Danger zone */}
        <div className="border border-white/10 p-5">
          <p className="text-white/30 text-xs uppercase tracking-widest font-body mb-4">Account</p>
          <button onClick={handleLogout}
            className="w-full border border-white/10 text-white/50 hover:text-white font-display uppercase text-xs py-3 tracking-widest transition-colors mb-3">
            Log Out
          </button>
          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)}
              className="w-full border border-red-500/20 text-red-500/50 hover:text-red-400 hover:border-red-500/40 font-display uppercase text-xs py-3 tracking-widest transition-colors">
              Delete Account
            </button>
          ) : (
            <div className="border border-red-500/30 p-4">
              <p className="text-red-400 text-xs font-body mb-3">Are you sure? This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={handleDelete} className="flex-1 bg-red-500/80 text-white font-display uppercase text-xs py-2">Confirm Delete</button>
                <button onClick={() => setDeleteConfirm(false)} className="flex-1 border border-white/10 text-white/40 font-display uppercase text-xs py-2">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Settings