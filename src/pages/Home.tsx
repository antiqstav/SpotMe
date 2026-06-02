import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { collection, query, getDocs, doc, addDoc, updateDoc, serverTimestamp, where, onSnapshot } from 'firebase/firestore'
import { Icon } from 'leaflet'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import type { UserProfile, PublicUserPin, WorkoutType, Goal, Connection } from '../types'
import Avatar from '../components/Avatar'
import { useNavigate } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon
delete (Icon.Default.prototype as any)._getIconUrl
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const fuzzLocation = (lat: number, lng: number): { lat: number; lng: number } => {
  const fuzz = 0.014 // ~1 mile
  return {
    lat: lat + (Math.random() - 0.5) * fuzz,
    lng: lng + (Math.random() - 0.5) * fuzz,
  }
}

const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 3958.8 // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const WORKOUT_LABELS: Record<WorkoutType, string> = {
  running_cycling: 'Running / Cycling',
  weightlifting: 'Weightlifting',
  calisthenics: 'Calisthenics',
  yoga: 'Yoga',
  outdoor: 'Outdoor Activities',
  hiit: 'HIIT',
  other: 'Other',
}

const GOAL_LABELS: Record<Goal, string> = {
  weight_loss: 'Weight Loss',
  muscle_gain: 'Muscle Gain',
  endurance: 'Endurance Building',
  social: 'Social Needs',
  long_term_health: 'Long-Term Health',
}

const RecenterMap = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], 12) }, [lat, lng])
  return null
}

const Home = () => {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null)
  const [pins, setPins] = useState<PublicUserPin[]>([])
  const [radius, setRadius] = useState(15)
  const [filterWorkout, setFilterWorkout] = useState<WorkoutType | ''>('')
  const [filterGoal, setFilterGoal] = useState<Goal | ''>('')
  const [filterName, setFilterName] = useState('')
  const [filterAgeMin, setFilterAgeMin] = useState(16)
  const [filterAgeMax, setFilterAgeMax] = useState(80)
  const [incoming, setIncoming] = useState<Connection[]>([])
  const [outgoing, setOutgoing] = useState<Connection[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sending, setSending] = useState<string | null>(null)

  // Load my profile
  useEffect(() => {
    if (!currentUser) return
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), snap => {
      if (snap.exists()) setMyProfile(snap.data() as UserProfile)
    })
    return unsub
  }, [currentUser])

  // Load connections
  useEffect(() => {
    if (!currentUser) return
    const q1 = query(collection(db, 'connections'), where('toUserId', '==', currentUser.uid), where('status', '==', 'pending'))
    const q2 = query(collection(db, 'connections'), where('fromUserId', '==', currentUser.uid), where('status', '==', 'pending'))
    const u1 = onSnapshot(q1, snap => setIncoming(snap.docs.map(d => ({ ...d.data(), connectionId: d.id } as Connection))))
    const u2 = onSnapshot(q2, snap => setOutgoing(snap.docs.map(d => ({ ...d.data(), connectionId: d.id } as Connection))))
    return () => { u1(); u2() }
  }, [currentUser])

  // Load nearby users
  useEffect(() => {
    if (!myProfile) return
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, 'users'))
      const nearby: PublicUserPin[] = []
      snap.forEach(d => {
        const u = d.data() as UserProfile
        if (u.userId === currentUser?.uid) return
        const dist = haversineDistance(myProfile.lat, myProfile.lng, u.lat, u.lng)
        if (dist > radius) return
        if (filterWorkout && !u.workoutType.includes(filterWorkout)) return
        if (filterGoal && u.goal !== filterGoal) return
        if (filterName && !u.name.toLowerCase().includes(filterName.toLowerCase())) return
        if (u.age < filterAgeMin || u.age > filterAgeMax) return
        const fuzzed = fuzzLocation(u.lat, u.lng)
        nearby.push({
          userId: u.userId,
          name: u.name,
          age: u.age,
          city: u.city,
          fuzzedLat: fuzzed.lat,
          fuzzedLng: fuzzed.lng,
          workoutType: u.workoutType,
          goal: u.goal,
          isVerified: u.isVerified,
        })
      })
      setPins(nearby)
    }
    fetchUsers()
  }, [myProfile, radius, filterWorkout, filterGoal, filterName, filterAgeMin, filterAgeMax])

  const sendRequest = async (toUserId: string) => {
    if (!currentUser || !myProfile) return
    if (myProfile.activeConnectionId) return
    setSending(toUserId)
    try {
      const connRef = await addDoc(collection(db, 'connections'), {
        fromUserId: currentUser.uid,
        toUserId,
        status: 'pending',
        breakReason: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      await updateDoc(connRef, { connectionId: connRef.id })
      await updateDoc(doc(db, 'users', currentUser.uid), { activeConnectionId: connRef.id })
      await updateDoc(doc(db, 'users', toUserId), { activeConnectionId: connRef.id })
    } catch (e) { console.error(e) }
    setSending(null)
  }

  const acceptRequest = async (conn: Connection) => {
    await updateDoc(doc(db, 'connections', conn.connectionId), { status: 'accepted', updatedAt: serverTimestamp() })
    navigate('/partner')
  }

  const declineRequest = async (conn: Connection) => {
    await updateDoc(doc(db, 'connections', conn.connectionId), { status: 'declined', updatedAt: serverTimestamp() })
    await updateDoc(doc(db, 'users', currentUser!.uid), { activeConnectionId: null })
    await updateDoc(doc(db, 'users', conn.fromUserId), { activeConnectionId: null })
  }

  const center = myProfile ? [myProfile.lat, myProfile.lng] as [number, number] : [29.7604, -95.3698] as [number, number]

  return (
    <div className="flex h-screen bg-brand-dark overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 overflow-hidden bg-black/40 border-r border-white/5 flex flex-col`}>
        <div className="p-5 border-b border-white/5">
          <h1 className="font-display text-2xl font-black uppercase text-brand-orange">Spot Me</h1>
          <p className="text-white/40 text-xs mt-1 font-body">Find your fitness partner</p>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-white/5 flex flex-col gap-3">
          <p className="text-white/40 text-xs uppercase tracking-widest font-body">Filters</p>
          <div>
            <label className="text-white/50 text-xs font-body">Radius: {radius} miles</label>
            <input type="range" min={5} max={30} value={radius} onChange={e => setRadius(+e.target.value)}
              className="w-full accent-brand-orange mt-1" />
          </div>
          <input type="text" placeholder="Search by name..." value={filterName} onChange={e => setFilterName(e.target.value)}
            className="bg-white/5 border border-white/10 text-white placeholder-white/30 px-3 py-2 text-xs font-body focus:outline-none focus:border-brand-orange w-full" />
          <select value={filterWorkout} onChange={e => setFilterWorkout(e.target.value as WorkoutType | '')}
            className="bg-white/5 border border-white/10 text-white/70 px-3 py-2 text-xs font-body focus:outline-none focus:border-brand-orange w-full">
            <option value="">All Workout Types</option>
            {Object.entries(WORKOUT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filterGoal} onChange={e => setFilterGoal(e.target.value as Goal | '')}
            className="bg-white/5 border border-white/10 text-white/70 px-3 py-2 text-xs font-body focus:outline-none focus:border-brand-orange w-full">
            <option value="">All Goals</option>
            {Object.entries(GOAL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <div className="flex gap-2 items-center">
            <input type="number" placeholder="Min age" value={filterAgeMin} onChange={e => setFilterAgeMin(+e.target.value)}
              className="bg-white/5 border border-white/10 text-white placeholder-white/30 px-3 py-2 text-xs font-body focus:outline-none w-full" />
            <span className="text-white/30 text-xs">–</span>
            <input type="number" placeholder="Max age" value={filterAgeMax} onChange={e => setFilterAgeMax(+e.target.value)}
              className="bg-white/5 border border-white/10 text-white placeholder-white/30 px-3 py-2 text-xs font-body focus:outline-none w-full" />
          </div>
        </div>

        {/* Incoming requests */}
        <div className="p-4 flex-1 overflow-y-auto">
          {incoming.length > 0 && (
            <div className="mb-4">
              <p className="text-brand-orange text-xs uppercase tracking-widest font-body mb-2">Incoming Requests ({incoming.length})</p>
              {incoming.map(conn => (
                <div key={conn.connectionId} className="bg-white/5 border border-white/10 p-3 mb-2">
                  <p className="text-white text-xs font-body mb-2">From: {conn.fromUserId}</p>
                  <div className="flex gap-2">
                    <button onClick={() => acceptRequest(conn)} className="bg-brand-orange text-white text-xs px-3 py-1 font-display uppercase">Accept</button>
                    <button onClick={() => declineRequest(conn)} className="border border-white/20 text-white/50 text-xs px-3 py-1 font-display uppercase">Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {outgoing.length > 0 && (
            <div className="mb-4">
              <p className="text-white/40 text-xs uppercase tracking-widest font-body mb-2">Pending Sent ({outgoing.length})</p>
              {outgoing.map(conn => (
                <div key={conn.connectionId} className="bg-white/5 border border-white/10 p-3 mb-2">
                  <p className="text-white/50 text-xs font-body">Waiting for response...</p>
                </div>
              ))}
            </div>
          )}
          {myProfile?.activeConnectionId && (
            <button onClick={() => navigate('/partner')}
              className="w-full bg-brand-orange/10 border border-brand-orange text-brand-orange font-display uppercase text-xs py-3 tracking-widest hover:bg-brand-orange hover:text-white transition-colors mb-2">
              View Partner →
            </button>
          )}
          <button onClick={() => navigate('/settings')}
            className="w-full border border-white/10 text-white/40 font-display uppercase text-xs py-3 tracking-widest hover:border-white/30 hover:text-white/70 transition-colors">
            Settings
          </button>
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 relative">
        <button onClick={() => setSidebarOpen(o => !o)}
          className="absolute top-4 left-4 z-[1000] bg-brand-dark border border-white/10 text-white/70 hover:text-brand-orange px-3 py-2 font-display text-xs uppercase tracking-widest transition-colors">
          {sidebarOpen ? '◀ Hide' : '▶ Show'}
        </button>

        <MapContainer center={center} zoom={12} className="w-full h-full z-0">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
          {myProfile && <RecenterMap lat={myProfile.lat} lng={myProfile.lng} />}
          {pins.map(pin => (
            <Marker key={pin.userId} position={[pin.fuzzedLat, pin.fuzzedLng]}>
              <Popup>
                <div className="min-w-[180px]">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar name={pin.name} size="md" verified={pin.isVerified} />
                    <div>
                      <p className="font-bold text-sm">{pin.name} {pin.isVerified && '✓'}</p>
                      <p className="text-xs text-gray-500">{pin.age} · {pin.city}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{pin.workoutType.map(w => WORKOUT_LABELS[w]).join(', ')}</p>
                  <p className="text-xs text-gray-600 mb-3">{GOAL_LABELS[pin.goal]}</p>
                  {myProfile?.activeConnectionId ? (
                    <p className="text-xs text-orange-500 font-semibold">You already have an active connection.</p>
                  ) : (
                    <button
                      onClick={() => sendRequest(pin.userId)}
                      disabled={sending === pin.userId}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 transition-colors disabled:opacity-50">
                      {sending === pin.userId ? 'Sending...' : 'Send Connection Request'}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}

export default Home