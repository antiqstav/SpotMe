import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import type { UserProfile, Connection } from '../types'
import Avatar from '../components/Avatar'

const WORKOUT_LABELS: Record<string, string> = {
  running_cycling: 'Running / Cycling',
  weightlifting: 'Weightlifting',
  calisthenics: 'Calisthenics',
  yoga: 'Yoga',
  outdoor: 'Outdoor Activities',
  hiit: 'HIIT',
  other: 'Other',
}

const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'Weight Loss',
  muscle_gain: 'Muscle Gain',
  endurance: 'Endurance Building',
  social: 'Social Needs',
  long_term_health: 'Long-Term Health',
}

const Partner = () => {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null)
  const [partner, setPartner] = useState<UserProfile | null>(null)
  const [connection, setConnection] = useState<Connection | null>(null)
  const [showBreakForm, setShowBreakForm] = useState(false)
  const [breakReason, setBreakReason] = useState('')
  const [breaking, setBreaking] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), async snap => {
      if (!snap.exists()) return
      const profile = snap.data() as UserProfile
      setMyProfile(profile)
      if (!profile.activeConnectionId) { navigate('/home'); return }

      const connSnap = await getDoc(doc(db, 'connections', profile.activeConnectionId))
      if (!connSnap.exists()) return
      const conn = { ...connSnap.data(), connectionId: connSnap.id } as Connection
      setConnection(conn)
      if (conn.status !== 'accepted') { navigate('/home'); return }

      const partnerUid = conn.fromUserId === currentUser.uid ? conn.toUserId : conn.fromUserId
      const partnerSnap = await getDoc(doc(db, 'users', partnerUid))
      if (partnerSnap.exists()) setPartner(partnerSnap.data() as UserProfile)
    })
    return unsub
  }, [currentUser])

  const handleBreak = async () => {
    if (!connection || !myProfile || !partner) return
    setBreaking(true)
    await updateDoc(doc(db, 'connections', connection.connectionId), {
      status: 'broken',
      breakReason,
      updatedAt: serverTimestamp(),
    })
    await updateDoc(doc(db, 'users', currentUser!.uid), { activeConnectionId: null })
    await updateDoc(doc(db, 'users', partner.userId), { activeConnectionId: null })
    navigate('/home')
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <p className="text-white/40 font-body text-sm">Loading partner...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <button onClick={() => navigate('/home')}
          className="text-white/40 hover:text-white font-display text-xs uppercase tracking-widest mb-8 transition-colors">
          ← Back to Map
        </button>

        <h2 className="font-display text-4xl font-black uppercase text-brand-orange mb-1">Your Partner</h2>
        <p className="text-white/40 text-xs font-body uppercase tracking-widest mb-8">One buddy, full commitment</p>

        {/* Partner card */}
        <div className="bg-white/5 border border-white/10 p-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar name={partner.name} size="lg" verified={partner.isVerified} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-xl text-white uppercase">{partner.name}</h3>
                {partner.isVerified && <span className="text-brand-orange text-sm" title="Verified">✓</span>}
              </div>
              <p className="text-white/40 text-sm font-body">{partner.age} years old · {partner.city}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-white/30 text-xs uppercase tracking-widest font-body mb-1">Workout Types</p>
              <div className="flex flex-wrap gap-1">
                {partner.workoutType.map(w => (
                  <span key={w} className="bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-xs px-2 py-1 font-body">
                    {WORKOUT_LABELS[w]}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-white/30 text-xs uppercase tracking-widest font-body mb-1">Goal</p>
              <span className="bg-white/5 border border-white/10 text-white/70 text-xs px-2 py-1 font-body">
                {GOAL_LABELS[partner.goal]}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-white/30 text-xs uppercase tracking-widest font-body mb-1">Email</p>
            <p className="text-white/60 text-sm font-body">{partner.email}</p>
          </div>
          <div className="mt-3">
            <p className="text-white/30 text-xs uppercase tracking-widest font-body mb-1">Phone</p>
            <p className="text-white/60 text-sm font-body">{partner.phone}</p>
          </div>
        </div>

        {/* Break connection */}
        {!showBreakForm ? (
          <button onClick={() => setShowBreakForm(true)}
            className="w-full mt-4 border border-red-500/30 text-red-400 hover:bg-red-500/10 font-display uppercase text-xs py-3 tracking-widest transition-colors">
            Break Connection
          </button>
        ) : (
          <div className="mt-4 bg-white/5 border border-red-500/20 p-4">
            <p className="text-red-400 text-xs uppercase tracking-widest font-body mb-3">Why are you breaking this connection?</p>
            <textarea
              value={breakReason}
              onChange={e => setBreakReason(e.target.value)}
              placeholder="Let us know what happened (used for moderation)..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 px-3 py-2 text-xs font-body focus:outline-none focus:border-red-500/50 resize-none mb-3"
            />
            <div className="flex gap-2">
              <button onClick={handleBreak} disabled={breaking || !breakReason.trim()}
                className="flex-1 bg-red-500/80 hover:bg-red-500 text-white font-display uppercase text-xs py-2 tracking-widest transition-colors disabled:opacity-40">
                {breaking ? 'Breaking...' : 'Confirm Break'}
              </button>
              <button onClick={() => setShowBreakForm(false)}
                className="flex-1 border border-white/10 text-white/40 font-display uppercase text-xs py-2 tracking-widest hover:text-white/70 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Partner