import { Link } from 'react-router-dom'

const Landing = () => {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-6 text-center">
      {/* Logo / Hero */}
      <h1 className="font-display text-8xl font-black uppercase tracking-tight text-brand-orange mb-2">
        Spot Me
      </h1>
      <p className="font-display text-2xl uppercase tracking-widest text-white/50 mb-6">
        Find your fitness partner
      </p>
      <p className="max-w-md text-white/70 font-body text-base leading-relaxed mb-10">
        Working out alone is hard. Spot Me connects you with a nearby fitness buddy
        who shares your goals, your schedule, and your drive. One partner. Full commitment.
      </p>

      {/* CTAs */}
      <div className="flex gap-4">
        <Link
          to="/auth"
          className="bg-brand-orange hover:bg-brand-deep text-white font-display font-bold uppercase tracking-widest text-sm px-8 py-3 transition-colors"
        >
          Sign Up
        </Link>
        <Link
          to="/auth"
          className="border border-white/20 hover:border-brand-orange text-white/70 hover:text-brand-orange font-display font-bold uppercase tracking-widest text-sm px-8 py-3 transition-colors"
        >
          Log In
        </Link>
      </div>

      {/* Feature blurbs */}
      <div className="grid grid-cols-3 gap-8 mt-20 max-w-2xl text-left">
        {[
          { icon: "📍", title: "Find Nearby", desc: "Discover fitness partners within 5–30 miles of you." },
          { icon: "🎯", title: "Filter by Goal", desc: "Weight loss, muscle gain, endurance — find your match." },
          { icon: "🤝", title: "One Buddy", desc: "One committed partner beats a network of casual ones." },
        ].map((f) => (
          <div key={f.title}>
            <div className="text-3xl mb-2">{f.icon}</div>
            <h3 className="font-display font-bold uppercase text-brand-orange tracking-wide text-sm mb-1">{f.title}</h3>
            <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Landing
