// Default avatar shown everywhere in place of profile pictures
// Replace this in v2 when Storage is set up

interface AvatarProps {
  name?: string
  size?: 'sm' | 'md' | 'lg'
  verified?: boolean
}

const sizeMap = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-16 h-16 text-2xl',
}

const Avatar = ({ name, size = 'md', verified = false }: AvatarProps) => {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="relative inline-flex">
      <div className={`${sizeMap[size]} rounded-full bg-brand-orange/20 border border-brand-orange/30 flex items-center justify-center font-display font-bold text-brand-orange`}>
        {initials}
      </div>
      {verified && (
        <span className="absolute -bottom-0.5 -right-0.5 bg-brand-orange text-white text-xs w-4 h-4 rounded-full flex items-center justify-center leading-none">
          ✓
        </span>
      )}
    </div>
  )
}

export default Avatar