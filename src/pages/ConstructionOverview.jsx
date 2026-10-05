import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePhases, usePhasePhotos, useEvents, useCommittee } from '../hooks/useData'
import { 
  Building,
  TreePine,
  Users,
  ArrowRight,
  ArrowLeft,
  Hammer,
  Landmark, 
  Coins, 
  TrendingUp, 
  Calendar, 
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Award,
  Clock,
  Sun,
  Moon,
  Eye,
  Maximize2,
  Layers,
  Compass,
  CheckCircle2,
  MapPin
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import FontAdjuster from '../components/FontAdjuster'
import AdBannerWidget from '../components/dashboard/member/AdBannerWidget'

// Elegant custom Skeleton component matching to Shadcn UI styling
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-slate-200/70 dark:bg-slate-900/60 rounded-2xl ${className}`} />
)

// Animation variants for staggered child entrances
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 16 }
  }
}

export default function ConstructionOverview() {
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState('phases') // 'phases' | 'events' | 'gallery'
  const [activePhaseFilter, setActivePhaseFilter] = useState('all') // 'all', 'done', 'ongoing', 'planning'
  const [galleryFilter, setGalleryFilter] = useState('all')
  const [expandedEventId, setExpandedEventId] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  // Architectural visual plan interactive states
  const [heroRenderView, setHeroRenderView] = useState('front') // 'front' | 'side' | 'saint'
  const [activeHotspot, setActiveHotspot] = useState(null)
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [activePlanTab, setActivePlanTab] = useState('front') // 'front' | 'side' | 'full'

  const architecturalHotspots = [
    {
      id: 1,
      title: "Grand Entrance Portico & Archways",
      subtitle: "Main Sanctuary Entry",
      description: "Classical double brick archways featuring a portico entry, vaulted porch, and holy cross pinnacle rising above the main gable.",
      x: "53%",
      y: "40%",
      badge: "Facade Design"
    },
    {
      id: 2,
      title: "Stained Glass Clerestory Windows",
      subtitle: "Acoustics & Lighting",
      description: "Sequential arched window frames designed with stained glass accents, maximizing natural daylight while delivering sacred acoustics.",
      x: "24%",
      y: "38%",
      badge: "Liturgical Architecture"
    },
    {
      id: 3,
      title: "Steel-Truss Vaulted Roof Structure",
      subtitle: "Structural Longevity",
      description: "High-capacity pitched roof engineered with heavy-duty structural steel trusses to protect against tropical rainfall & weathering.",
      x: "42%",
      y: "22%",
      badge: "Engineering Core"
    },
    {
      id: 4,
      title: "Parish Grounds & Paved Parking",
      subtitle: "Accessibility & Community",
      description: "Surrounding paved parking bays, security perimeter, and landscaped gardens providing a welcoming atmosphere for parishioners.",
      x: "62%",
      y: "65%",
      badge: "Site Plan"
    }
  ]

  // Initialize dark mode from localStorage, syncing with LoginPage preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('sfa_dark_mode')
    if (saved !== null) return saved === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('sfa_dark_mode', darkMode)
  }, [darkMode])

  // React Query data fetches with loading status
  const { data: phases = [], isLoading: isLoadingPhases, isError: isErrorPhases } = usePhases()
  const { data: phasePhotos = [], isLoading: isLoadingPhotos, isError: isErrorPhotos } = usePhasePhotos()
  const { data: events = [], isLoading: isLoadingEvents, isError: isErrorEvents } = useEvents()
  const { data: committee = [], isLoading: isLoadingCommittee } = useCommittee()

  const formatUGX = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Map database status to simple English for Phases
  const getSimpleStatus = (status) => {
    switch (status) {
      case 'Completed': return { text: 'Done', color: 'emerald' }
      case 'In Progress': return { text: 'Ongoing', color: 'indigo' }
      case 'Pending': 
      default: 
        return { text: 'Planning', color: 'slate' }
    }
  }

  // Summarize overall statistics
  const totalBudget = useMemo(() => phases.reduce((sum, p) => sum + (p.budget || 0), 0), [phases])
  const totalCollected = useMemo(() => phases.reduce((sum, p) => sum + (p.amountCollected || 0), 0), [phases])
  const totalSpent = useMemo(() => phases.reduce((sum, p) => sum + (p.amountSpent || 0), 0), [phases])
  const remainingSavings = useMemo(() => Math.max(0, totalCollected - totalSpent), [totalCollected, totalSpent])
  const overallProgress = useMemo(() => totalBudget > 0 ? Math.round((totalCollected / totalBudget) * 100) : 0, [totalCollected, totalBudget])

  const filteredPhases = useMemo(() => {
    return phases.filter(p => {
      const statusObj = getSimpleStatus(p.status)
      if (activePhaseFilter === 'all') return true
      return (statusObj?.text || '').toLowerCase() === activePhaseFilter
    })
  }, [phases, activePhaseFilter])

  // Dynamic list of phases that actually have photos
  const phasesWithPhotos = useMemo(() => {
    const uniqueIds = [...new Set(phasePhotos.map(ph => ph.phase_id))]
    return phases.filter(p => uniqueIds.includes(p.id))
  }, [phases, phasePhotos])

  const getPhaseName = (phaseId) => {
    return phases.find(p => p.id === phaseId)?.name || phaseId
  }

  // Photos filtered for gallery display
  const filteredPhotos = useMemo(() => {
    if (galleryFilter === 'all') return phasePhotos
    return phasePhotos.filter(ph => ph.phase_id === galleryFilter)
  }, [phasePhotos, galleryFilter])

  const toggleExpandEvent = (eventId) => {
    setExpandedEventId(prev => prev === eventId ? null : eventId)
  }

  // Floating background particles (Gold/Amber and Indigo Cathedral Light particles)
  const [particles, setParticles] = useState([])
  useEffect(() => {
    setParticles(
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        top: `${Math.random() * 85 + 5}%`,
        left: `${Math.random() * 90 + 5}%`,
        size: `${Math.random() * 5 + 3}px`,
        delay: `${Math.random() * 6}s`,
        duration: `${Math.random() * 12 + 10}s`,
        color: Math.random() > 0.5 ? 'rgba(99, 102, 241, 0.4)' : 'rgba(245, 158, 11, 0.35)'
      }))
    )
  }, [])

  // Words list for stagger animated hero title reveal
  const titleWords = "Building a Sanctuary of Faith & Hope".split(" ")

  return (
    <div className="min-h-screen transition-colors duration-300 font-sans relative overflow-x-hidden bg-[#fafaf9] text-slate-800 dark:bg-[#030712] dark:text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Self-contained premium micro-animation styles */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.2; }
          50% { transform: translateY(-30px) translateX(15px); opacity: 0.6; }
        }
        @keyframes shimmer-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .floating-particle {
          animation: float-slow var(--duration) ease-in-out infinite;
          animation-delay: var(--delay);
        }
        .shimmer-bar::after {
          content: '';
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.2) 30%,
            rgba(255, 255, 255, 0.4) 60%,
            rgba(255, 255, 255, 0) 100%
          );
          animation: shimmer-sweep 3.5s infinite ease-in-out;
        }
      `}</style>

      {/* Global Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)] pointer-events-none opacity-40 dark:opacity-50" />

      {/* Dynamic Floating Particles */}
      {particles.map(p => (
        <div 
          key={p.id}
          className="absolute rounded-full pointer-events-none floating-particle"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 8px ${p.color}`,
            '--delay': p.delay,
            '--duration': p.duration
          }}
        />
      ))}

      {/* Ambient Blurred Radial Glow Meshes */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-200/10 dark:bg-primary-900/20 rounded-full blur-[130px] pointer-events-none transition-all duration-300" />
      <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] bg-indigo-100/30 dark:bg-indigo-950/15 rounded-full blur-[120px] pointer-events-none transition-all duration-300" />
      <div className="absolute bottom-[20%] left-[-10%] w-[600px] h-[600px] bg-amber-100/15 dark:bg-indigo-900/10 rounded-full blur-[140px] pointer-events-none transition-all duration-300" />

      {/* Section A: Glassmorphism Sticky Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-slate-950/75 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-900/80 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3 cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow group-hover:scale-105 transition-transform">
              <Landmark className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">St. Francis Lusanja</span>
              <span className="text-[9px] text-indigo-650 dark:text-indigo-400 font-bold uppercase tracking-wider group-hover:text-indigo-500 dark:group-hover:text-indigo-300 transition-colors">Building Project</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Dynamic Font Size Adjuster */}
            <FontAdjuster />

            {/* Theme switcher */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-amber-450 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-indigo-600 dark:hover:text-amber-300 transition-all cursor-pointer shadow-sm hover:shadow"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            {/* Login button */}
            <button 
              onClick={() => navigate('/login')}
              className="relative group overflow-hidden rounded-xl p-[1px] focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-lg hover:shadow-indigo-500/10"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-primary-600 via-indigo-550 to-indigo-700 rounded-xl" />
              <span className="relative block px-5 py-2.5 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-950/80 text-xs font-extrabold text-slate-800 dark:text-white transition-all rounded-[11px] uppercase tracking-wider">
                Portal Login
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Section B: Hero Section */}
      <section className="relative pt-36 pb-20 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Title Stagger Reveal */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 100, delay: 0.1 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold uppercase tracking-wider"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Building for Generations
          </motion.div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-none text-slate-900 dark:text-white flex flex-wrap gap-x-3.5">
            {titleWords.map((word, idx) => (
              <motion.span
                key={idx}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 110,
                  damping: 15,
                  delay: idx * 0.08 + 0.2
                }}
                className={idx >= 3 && idx <= 5 ? "bg-gradient-to-r from-indigo-600 to-indigo-500 dark:from-indigo-200 dark:to-indigo-400 bg-clip-text text-transparent" : ""}
              >
                {word}
              </motion.span>
            ))}
          </h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-slate-650 dark:text-slate-400 text-sm sm:text-base max-w-xl leading-relaxed font-medium"
          >
            Join the parishioners of St. Francis of Assisi Catholic Church in Lusanja as we construct our new house of worship. Together, we are laying bricks of unity, love, and a legacy for generations to come.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="flex flex-col sm:flex-row gap-4 pt-2"
          >
            <button 
              onClick={() => navigate('/login')}
              className="px-6 py-3.5 bg-gradient-to-r from-primary-600 to-indigo-650 hover:from-primary-500 hover:to-indigo-550 text-white font-bold text-xs rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border border-indigo-650/40 hover:-translate-y-0.5 duration-200 animate-fade-in"
            >
              <span>Access Member Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                document.getElementById('tracker-section')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="px-6 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-indigo-600 dark:hover:text-white text-slate-600 dark:text-slate-350 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider hover:-translate-y-0.5 duration-200 shadow-sm"
            >
              <span>View Live Progress</span>
            </button>
          </motion.div>
        </div>

        {/* Right Column: Interactive 3D Architectural Visual Plan Switcher & Metrics */}
        <div className="lg:col-span-5 relative flex flex-col items-center">
          <div className="relative w-full max-w-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 70, damping: 15, delay: 0.4 }}
              className="border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 rounded-3xl backdrop-blur-xl shadow-2xl space-y-5 text-left relative overflow-hidden group"
            >
              {/* View Selector Pills */}
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-[10px] font-extrabold">
                <button
                  onClick={() => setHeroRenderView('front')}
                  className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    heroRenderView === 'front'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-white shadow-sm border border-slate-200 dark:border-slate-800'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3 h-3 text-indigo-500" />
                  <span>Front 3D</span>
                </button>
                <button
                  onClick={() => setHeroRenderView('side')}
                  className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    heroRenderView === 'side'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-white shadow-sm border border-slate-200 dark:border-slate-800'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Compass className="w-3 h-3 text-indigo-500" />
                  <span>Side View</span>
                </button>
                <button
                  onClick={() => setHeroRenderView('saint')}
                  className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    heroRenderView === 'saint'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200 dark:border-slate-800'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Patron Saint</span>
                </button>
              </div>

              {/* Display Canvas Frame */}
              <div className="relative overflow-hidden rounded-2xl border border-amber-200/60 dark:border-amber-500/20 shadow-lg group/img">
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={heroRenderView}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    src={
                      heroRenderView === 'front' ? "/images/church_hero.png" :
                      heroRenderView === 'side' ? "/images/construction_progress.png" :
                      "/images/st_francis_of_assisi.png"
                    } 
                    className="w-full aspect-[4/3] object-cover rounded-2xl group-hover/img:scale-105 transition-transform duration-700 ease-out" 
                    alt="St Francis Church Visual Rendering" 
                  />
                </AnimatePresence>

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent flex flex-col justify-end p-4 text-left">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {heroRenderView === 'saint' ? 'Patron Saint' : 'Official Visual Plan'}
                      </span>
                      <h3 className="text-sm font-black text-white tracking-tight mt-0.5">
                        {heroRenderView === 'front' ? 'St. Francis Main Entrance 3D Render' :
                         heroRenderView === 'side' ? 'Sanctuary Side Perspective & Gardens' :
                         'Saint Francis of Assisi'}
                      </h3>
                      <span className="text-[9px] text-slate-300 font-semibold block">
                        Lusanja Sub-Parish Catholic Church
                      </span>
                    </div>

                    <button
                      onClick={() => setPlanModalOpen(true)}
                      className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-xl text-white transition-all cursor-pointer shadow border border-white/30 hover:scale-110"
                      title="Expand Full Blueprint"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress and Blueprint Button */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase tracking-wider">Overall Progress</span>
                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5 block">{overallProgress}%</span>
                  </div>
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase tracking-wider">Total Raised</span>
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block truncate">{formatUGX(totalCollected)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setPlanModalOpen(true)}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 via-indigo-600 to-indigo-700 hover:from-amber-600 hover:to-indigo-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md border border-amber-300/30"
                >
                  <Layers className="w-4 h-4" />
                  <span>Inspect Full Architectural Blueprint</span>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Movable Community & Sponsor Banners Section */}
      <section className="px-6 max-w-7xl mx-auto py-6">
        <AdBannerWidget placement="website" />
      </section>

      {/* Section C: Vision & Purpose */}
      <section className="py-24 px-6 border-y border-slate-200 dark:border-slate-900 bg-white/40 dark:bg-slate-950/20 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-16 relative z-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-wide">Our Sanctuary Blueprint</h2>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm font-medium leading-relaxed">
              Designed as a sacred haven of worship and a bustling center of social action, the new church facility will comprise key functional spaces to cater to Lusanja parish:
            </p>
          </div>

          {/* Stagger-revealed Blueprint Grid */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* Blueprint 1 */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -6, borderColor: 'rgba(99, 102, 241, 0.4)', boxShadow: '0 10px 30px -10px rgba(99, 102, 241, 0.12)' }}
              className="bg-white dark:bg-slate-900/20 border border-slate-200 dark:border-slate-900 p-8 rounded-3xl space-y-5 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-650 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Capacity for 1,500</h3>
              <p className="text-slate-650 dark:text-slate-400 text-xs leading-relaxed font-medium">
                A spacious main sanctuary designed to host over 1,500 seats comfortably, ensuring our growing Christian community can celebrate mass together under one roof.
              </p>
            </motion.div>

            {/* Blueprint 2 */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -6, borderColor: 'rgba(59, 91, 219, 0.4)', boxShadow: '0 10px 30px -10px rgba(59, 91, 219, 0.12)' }}
              className="bg-white dark:bg-slate-900/20 border border-slate-200 dark:border-slate-900 p-8 rounded-3xl space-y-5 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-primary-500/10 border border-indigo-100 dark:border-primary-500/20 flex items-center justify-center text-indigo-600 dark:text-primary-400 group-hover:scale-110 transition-transform duration-300">
                <Building className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Sacred Architecture</h3>
              <p className="text-slate-650 dark:text-slate-400 text-xs leading-relaxed font-medium">
                Blending premium contemporary steel frame construction with historic Catholic liturgical aesthetics, high vaulted ceilings, and acoustic soundscapes.
              </p>
            </motion.div>

            {/* Blueprint 3 */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -6, borderColor: 'rgba(16, 185, 129, 0.4)', boxShadow: '0 10px 30px -10px rgba(16, 185, 129, 0.12)' }}
              className="bg-white dark:bg-slate-900/20 border border-slate-200 dark:border-slate-900 p-8 rounded-3xl space-y-5 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center text-emerald-650 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                <TreePine className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Prayer & Community Gardens</h3>
              <p className="text-slate-655 dark:text-slate-400 text-xs leading-relaxed font-medium">
                Lush, meditative outdoor spaces, community gardens, administrative offices, and classrooms to host parish events and support youth training.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Section C2: Architectural Master Plan & Interactive 3D Showcase */}
      <section className="py-24 px-6 max-w-7xl mx-auto space-y-16 relative">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Official 3D Architectural Blueprint
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-wide">
            Architectural Master Plan
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm font-medium leading-relaxed">
            Take an interactive tour of the approved 3D visual plan for St. Francis of Assisi Catholic Church in Lusanja. Click on the hotspots to explore architectural facade elements, sanctuary capacity, and engineering features.
          </p>
        </div>

        {/* View Switcher Tabs & Fullscreen Trigger */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-900 pb-4">
          <div className="flex space-x-2 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-900 max-w-md w-full">
            <button
              onClick={() => setActivePlanTab('front')}
              className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activePlanTab === 'front'
                  ? 'bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Eye className="w-4 h-4 text-indigo-500" />
              Front 3D View
            </button>
            <button
              onClick={() => setActivePlanTab('side')}
              className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activePlanTab === 'side'
                  ? 'bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Compass className="w-4 h-4 text-indigo-500" />
              Side Elevation 3D
            </button>
            <button
              onClick={() => setActivePlanTab('full')}
              className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activePlanTab === 'full'
                  ? 'bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-500" />
              Full Blueprint
            </button>
          </div>

          <button
            onClick={() => setPlanModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow hover:scale-105 duration-200"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Fullscreen Architectural Lightbox</span>
          </button>
        </div>

        {/* Interactive Image Showcase Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Visual Image Display with Hotspots */}
          <div className="lg:col-span-8 relative bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-2xl overflow-hidden group">
            <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-slate-950">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activePlanTab}
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  src={
                    activePlanTab === 'front' ? '/images/church_hero.png' :
                    activePlanTab === 'side' ? '/images/construction_progress.png' :
                    '/images/church_architectural_plan_1.png'
                  }
                  className="w-full h-full object-contain sm:object-cover rounded-2xl"
                  alt="Official Church Architectural Plan Rendering"
                />
              </AnimatePresence>

              {/* Overlay Hotspot Pins (Only on Front or Side views) */}
              {activePlanTab !== 'full' && architecturalHotspots.map((hs) => (
                <div
                  key={hs.id}
                  style={{ top: hs.y, left: hs.x }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                >
                  <button
                    onClick={() => setActiveHotspot(activeHotspot === hs.id ? null : hs.id)}
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${
                      activeHotspot === hs.id 
                        ? 'bg-amber-400 text-slate-950 scale-125 shadow-[0_0_20px_rgba(245,158,11,0.8)]' 
                        : 'bg-indigo-600/90 hover:bg-amber-400 text-white hover:text-slate-950 shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                    }`}
                  >
                    <span className="absolute inset-0 rounded-full bg-indigo-500 animate-ping opacity-30 pointer-events-none" />
                    <span className="text-xs font-black">{hs.id}</span>
                  </button>
                </div>
              ))}

              <div className="absolute bottom-4 left-4 right-4 p-3.5 bg-slate-950/80 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-between text-left">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">St. Francis of Assisi Catholic Sanctuary</h4>
                    <span className="text-[10px] text-slate-300">Click numbered pins on rendering to inspect design specs</span>
                  </div>
                </div>

                <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 hidden sm:inline-block">
                  Approved Blueprint 2026
                </span>
              </div>
            </div>
          </div>

          {/* Side Info Cards & Hotspot Inspector */}
          <div className="lg:col-span-4 space-y-4 text-left">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-500" />
              <span>Architectural Highlights</span>
            </h3>

            <div className="space-y-3">
              {architecturalHotspots.map((hs) => {
                const isSelected = activeHotspot === hs.id
                return (
                  <motion.div
                    key={hs.id}
                    onClick={() => setActiveHotspot(isSelected ? null : hs.id)}
                    whileHover={{ scale: 1.01 }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-lg'
                        : 'bg-white dark:bg-slate-900/30 border-slate-200 dark:border-slate-900 hover:border-indigo-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-amber-400 text-slate-950' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        }`}>
                          {hs.id}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">{hs.title}</h4>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{hs.subtitle}</span>
                        </div>
                      </div>

                      <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-500/20 shrink-0">
                        {hs.badge}
                      </span>
                    </div>

                    {isSelected && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-xs text-slate-600 dark:text-slate-350 mt-3 pt-3 border-t border-amber-500/20 leading-relaxed font-medium"
                      >
                        {hs.description}
                      </motion.p>
                    )}
                  </motion.div>
                )
              })}
            </div>

            <button
              onClick={() => setPlanModalOpen(true)}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-650 to-primary-600 hover:from-indigo-500 hover:to-primary-500 text-white text-xs font-extrabold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg uppercase tracking-wider"
            >
              <Layers className="w-4 h-4" />
              <span>Inspect Full Resolution PDF Visual Plan</span>
            </button>
          </div>
        </div>
      </section>

      {/* Section D: Live Construction Tracker (Data Core) */}
      <section id="tracker-section" className="py-24 px-6 max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-wide">Live Progress & Budget Transparency</h2>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm font-medium leading-relaxed">
            Review live construction progress updates, money collected, expenditures made, and photo galleries directly integrated with our building committee ledger.
          </p>
        </div>

        {/* Global Progress Bar Card with Shimmer Sweep */}
        {isLoadingPhases ? (
          <Skeleton className="h-40 w-full" />
        ) : isErrorPhases ? (
          <div className="bg-rose-50 dark:bg-rose-955/10 border border-rose-100 dark:border-rose-900/30 rounded-3xl p-8 text-center text-rose-600 dark:text-rose-400 text-sm font-semibold shadow-sm">
            Failed to retrieve construction phase progress. Please refresh or try again.
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ type: "spring", stiffness: 80, damping: 15 }}
            className="bg-white dark:bg-slate-900/20 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 text-left">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                  <Award className="w-5 h-5 text-indigo-650 dark:text-indigo-400 animate-bounce" />
                  Overall Project Progress
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-450 mt-1">Donations collected vs total estimated budget requirements for the 11 engineering phases.</p>
              </div>
              <span className="text-2xl font-black text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 px-4.5 py-2 rounded-2xl self-start sm:self-center">{overallProgress}% Complete</span>
            </div>
            
            <div className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-full h-5 p-1 overflow-hidden relative">
              <motion.div 
                initial={{ width: 0 }}
                whileInView={{ width: `${overallProgress}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary-600 via-indigo-600 to-indigo-700 rounded-full shadow shimmer-bar relative overflow-hidden"
              />
            </div>
          </motion.div>
        )}

        {/* Stats Grid Stagger Entrance */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {isLoadingPhases ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))
          ) : (
            <>
              {/* Estimated Budget */}
              <motion.div 
                variants={itemVariants}
                whileHover={{ y: -5, borderColor: 'rgba(99, 102, 241, 0.3)' }}
                className="bg-white dark:bg-slate-900/20 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 transition-all space-y-4 text-left shadow-sm group hover:shadow"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-455 uppercase tracking-wider">Estimated Budget</span>
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-455 group-hover:scale-105 transition-transform"><Landmark className="w-5 h-5" /></div>
                </div>
                <div>
                  <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{formatUGX(totalBudget)}</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">Estimated cost of structural blueprint</p>
                </div>
              </motion.div>

              {/* Donations Collected */}
              <motion.div 
                variants={itemVariants}
                whileHover={{ y: -5, borderColor: 'rgba(16, 185, 129, 0.4)' }}
                className="bg-white dark:bg-slate-900/20 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 transition-all space-y-4 text-left shadow-sm group hover:shadow"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Total Collected</span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform"><Coins className="w-5 h-5 animate-pulse" /></div>
                </div>
                <div>
                  <h4 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatUGX(totalCollected)}</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">Total contributions deposited</p>
                </div>
              </motion.div>

              {/* Total Spent */}
              <motion.div 
                variants={itemVariants}
                whileHover={{ y: -5, borderColor: 'rgba(239, 68, 68, 0.4)' }}
                className="bg-white dark:bg-slate-900/20 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 transition-all space-y-4 text-left shadow-sm group hover:shadow"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Invested so far</span>
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-455 group-hover:scale-105 transition-transform"><TrendingUp className="w-5 h-5" /></div>
                </div>
                <div>
                  <h4 className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-500">{formatUGX(totalSpent)}</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">Paid out for materials & builders</p>
                </div>
              </motion.div>

              {/* Reserves */}
              <motion.div 
                variants={itemVariants}
                whileHover={{ y: -5, borderColor: 'rgba(99, 102, 241, 0.4)' }}
                className="bg-white dark:bg-slate-900/20 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 transition-all space-y-4 text-left shadow-sm group hover:shadow"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-455 uppercase tracking-wider">Reserves Available</span>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-650 dark:text-indigo-400 group-hover:scale-105 transition-transform"><Calendar className="w-5 h-5" /></div>
                </div>
                <div>
                  <h4 className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">{formatUGX(remainingSavings)}</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">Building reserve savings balance</p>
                </div>
              </motion.div>
            </>
          )}
        </motion.div>

        {/* Custom Interactive Tabs triggers (Shadcn styling) */}
        <div className="flex justify-center border-b border-slate-200 dark:border-slate-900 pb-2">
          <div className="flex space-x-2 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-900 max-w-lg w-full">
            <button
              onClick={() => setActiveTab('phases')}
              className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'phases'
                  ? 'bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              Work Phases
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'events'
                  ? 'bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Fundraisers
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'gallery'
                  ? 'bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Media Gallery
            </button>
          </div>
        </div>

        {/* Tab Contents with animations */}
        <AnimatePresence mode="wait">
          {activeTab === 'phases' && (
            <motion.div
              key="phases-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              {/* Tab Filters */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-900 pb-4 text-left">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Work Progress Timeline</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-450 mt-1">Review estimated costs, collections, and status for each development phase.</p>
                </div>
                
                <div className="flex space-x-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-900">
                  {['all', 'done', 'ongoing', 'planning'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActivePhaseFilter(filter)}
                      className={`px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all capitalize cursor-pointer ${
                        activePhaseFilter === filter 
                          ? 'bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-white shadow-sm' 
                          : 'text-slate-500 dark:text-slate-455 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {filter === 'done' ? 'Done' : filter === 'ongoing' ? 'Ongoing' : filter === 'planning' ? 'Planning' : 'All Phases'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vertical Timeline of Phases */}
              {isLoadingPhases ? (
                <div className="space-y-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full" />
                  ))}
                </div>
              ) : filteredPhases.length > 0 ? (
                <div className="relative border-l-2 border-slate-200 dark:border-slate-900 ml-4 pl-8 space-y-12 py-4 text-left">
                  {filteredPhases.map((phase, idx) => {
                    const status = getSimpleStatus(phase.status)
                    const phaseCollected = phase.amountCollected || 0
                    const phaseSpent = phase.amountSpent || 0
                    const phaseBudget = phase.budget || 0
                    const progressRate = phaseBudget > 0 ? Math.round((phaseCollected / phaseBudget) * 100) : 0
                    const matchingPhotos = phasePhotos.filter(ph => ph.phase_id === phase.id)

                    return (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ type: "spring", stiffness: 100, damping: 16 }}
                        key={phase.id} 
                        className="relative group/timeline"
                      >
                        {/* Timeline Bullet Circle with pulse halo */}
                        <div className={`absolute -left-[41px] top-1 w-6 h-6 rounded-full border-4 border-[#fafaf9] dark:border-slate-950 flex items-center justify-center group-hover/timeline:scale-110 transition-transform duration-300 z-10 ${
                          status.color === 'emerald' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)]' :
                          status.color === 'indigo' ? 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.35)] animate-pulse' :
                          'bg-slate-400 dark:bg-slate-700'
                        }`} />

                        {/* Phase Content Card with hover slide */}
                        <div className="bg-white dark:bg-slate-900/20 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 transition-all duration-350 ease-out hover:translate-x-1.5 hover:shadow-[0_10px_30px_-15px_rgba(99,102,241,0.08)] space-y-5 shadow-sm">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div>
                              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight group-hover/timeline:text-indigo-600 dark:group-hover/timeline:text-indigo-400 transition-colors">{phase.name}</h3>
                              <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 leading-relaxed font-medium">{phase.description}</p>
                            </div>
                            <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                              status.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20' :
                              status.color === 'indigo' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20' :
                              'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-450 border border-slate-200 dark:border-slate-750'
                            }`}>
                              {status.text}
                            </span>
                          </div>

                          {/* Progress Line */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-455">
                              <span>Fundraising Achieved</span>
                              <span className={status.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-indigo-600 dark:text-indigo-400 font-extrabold'}>{progressRate}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-full h-2.5 overflow-hidden p-0.5">
                              <motion.div 
                                initial={{ width: 0 }}
                                whileInView={{ width: `${Math.min(progressRate, 100)}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={`h-full rounded-full ${
                                  status.color === 'emerald' ? 'bg-emerald-500' :
                                  status.color === 'indigo' ? 'bg-indigo-500' :
                                  'bg-slate-400 dark:bg-slate-600'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Budgets Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-200 dark:border-slate-900/60 rounded-2xl text-center text-xs">
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Estimated Budget</span>
                              <span className="font-extrabold text-slate-800 dark:text-slate-200 mt-1 block">{formatUGX(phaseBudget)}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Donations Collected</span>
                              <span className="font-extrabold text-emerald-605 dark:text-emerald-450 mt-1 block">{formatUGX(phaseCollected)}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Invested Spent</span>
                              <span className="font-extrabold text-rose-600 dark:text-rose-500 mt-1 block">{formatUGX(phaseSpent)}</span>
                            </div>
                          </div>

                          {/* Live Photos preview */}
                          {matchingPhotos.length > 0 && (
                            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-900/50">
                              <span className="text-[10px] text-slate-550 dark:text-slate-450 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <ImageIcon className="w-3.5 h-3.5 text-indigo-650 dark:text-indigo-400" />
                                Phase Progress Photo Logs
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {matchingPhotos.map((photo) => {
                                  const globalIdx = phasePhotos.findIndex(p => p.id === photo.id)
                                  return (
                                    <div 
                                      key={photo.id} 
                                      onClick={() => {
                                        setGalleryFilter('all')
                                        setLightboxIndex(globalIdx)
                                      }}
                                      className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 group/pic bg-slate-100 dark:bg-slate-950 cursor-pointer shadow-inner"
                                    >
                                      <img 
                                        src={photo.image_url} 
                                        className="w-full h-full object-cover group-hover/pic:scale-[1.06] transition-transform duration-300" 
                                        alt="Construction timeline thumbnail" 
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2 opacity-0 group-hover/pic:opacity-100 transition-opacity">
                                        <span className="text-[8px] text-slate-300 font-semibold">{photo.created_at}</span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-white dark:bg-slate-900/10 border border-slate-200 dark:border-slate-900 rounded-3xl shadow-sm">
                  <p className="text-slate-500 dark:text-slate-450 text-xs font-semibold">No construction phases found.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'events' && (
            <motion.div
              key="events-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-200 dark:border-slate-900 pb-4 text-left">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Fundraising Events & Campaigns</h2>
                <p className="text-xs text-slate-500 dark:text-slate-455 mt-1">
                  Community events, block-buying campaigns, and fundraisers organized to raise resources for specific construction phases.
                </p>
              </div>

              {isLoadingEvents ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-56 w-full" />
                  ))}
                </div>
              ) : events.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {events.map((event) => {
                    const eventTarget = event.targetAmount || 0
                    const eventRaised = event.income || 0
                    const eventProgress = eventTarget > 0 ? Math.min(100, Math.round((eventRaised / eventTarget) * 100)) : 0
                    const isExpanded = expandedEventId === event.id

                    return (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ type: "spring", stiffness: 90 }}
                        key={event.id} 
                        className="bg-white dark:bg-slate-900/20 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 transition-all flex flex-col justify-between shadow-sm space-y-5 text-left group hover:border-slate-300 dark:hover:border-slate-800"
                      >
                        <div className="space-y-3">
                          {/* Event Header */}
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">{event.name}</h3>
                              <p className="text-[10px] text-slate-500 dark:text-slate-450 font-bold mt-1 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                Date: {event.date}
                              </p>
                            </div>
                            
                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                              event.status === 'Completed' 
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20' 
                                : 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-500/20'
                            }`}>
                              {event.status}
                            </span>
                          </div>

                          {/* Linked Phase Badge */}
                          <div className="inline-flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-900 text-[9px] text-indigo-655 dark:text-indigo-400 font-extrabold uppercase tracking-wider">
                            <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                            <span>Supporting: {event.linkedPhaseName}</span>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1.5 pt-2">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-slate-500 dark:text-slate-455">Fundraising Achieved</span>
                              <span className="text-indigo-600 dark:text-indigo-405">{eventProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-full h-2 overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                whileInView={{ width: `${eventProgress}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400"
                              />
                            </div>
                            <div className="flex justify-between text-[9px] font-bold text-slate-500 pt-0.5">
                              <span>Raised: {formatUGX(eventRaised)}</span>
                              <span>Goal: {formatUGX(eventTarget)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Logistics Dropdown */}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-900/50">
                          <button
                            onClick={() => toggleExpandEvent(event.id)}
                            className="flex items-center justify-between w-full text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors py-1 cursor-pointer bg-slate-50 dark:bg-slate-950/20 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-900 hover:border-slate-300 dark:hover:border-slate-800"
                          >
                            <span className="flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-indigo-605 dark:text-indigo-400" />
                              Organizing Details
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden space-y-4 pt-4 text-left"
                              >
                                {/* Committees */}
                                <div className="space-y-2">
                                  <h4 className="text-[10px] font-extrabold text-slate-500 dark:text-slate-450 uppercase tracking-wider flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> Organizing Committees
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {event.committees && event.committees.length > 0 ? (
                                      event.committees.map((comm) => (
                                        <div key={comm.id} className="bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-900 text-xs hover:border-slate-300 dark:hover:border-slate-800 transition-colors">
                                          <span className="font-bold text-slate-800 dark:text-slate-355 block">{comm.name}</span>
                                          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{comm.role}</span>
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-xs text-slate-500 italic block pl-1">No committees designated.</span>
                                    )}
                                  </div>
                                </div>

                                {/* Logistics Checklist */}
                                <div className="space-y-2">
                                  <h4 className="text-[10px] font-extrabold text-slate-500 dark:text-slate-455 uppercase tracking-wider flex items-center gap-1">
                                    <Landmark className="w-3 h-3 text-indigo-605 dark:text-indigo-400" /> Logistics Status
                                  </h4>
                                  <div className="space-y-2">
                                    {event.logistics && event.logistics.length > 0 ? (
                                      event.logistics.map((log) => (
                                        <div key={log.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/30 p-2.5 border border-slate-200 dark:border-slate-900 rounded-xl text-xs hover:border-slate-300 dark:hover:border-slate-850 transition-all">
                                          <div className="flex items-center space-x-2.5">
                                            <span className={`w-2.5 h-2.5 rounded-full ${
                                              log.status === 'Ready' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]' :
                                              log.status === 'Sourced' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.2)]' :
                                              'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                                            }`} />
                                            <div>
                                              <span className="font-semibold text-slate-800 dark:text-slate-200">{log.item}</span>
                                              <span className="text-[10px] text-slate-500 font-bold ml-2">Qty: {log.quantity}</span>
                                            </div>
                                          </div>
                                          <span className="text-[8px] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 px-2 py-0.5 rounded-md uppercase tracking-wide">
                                            {log.assignedCommittee}
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-xs text-slate-500 italic block pl-1">No logistics tracked.</span>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-white dark:bg-slate-900/10 border border-slate-200 dark:border-slate-900 rounded-3xl shadow-sm">
                  <p className="text-slate-500 dark:text-slate-450 text-xs font-semibold">No fundraising events scheduled.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'gallery' && (
            <motion.div
              key="gallery-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-200 dark:border-slate-900 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Construction Media Gallery</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-450 mt-1">
                    Visual archive tracking physical masonry developments at the building site.
                  </p>
                </div>

                {/* Filter buttons */}
                <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-955 p-1 rounded-xl border border-slate-200 dark:border-slate-900 self-start md:self-center">
                  <button
                    onClick={() => setGalleryFilter('all')}
                    className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                      galleryFilter === 'all' 
                        ? 'bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-white' 
                        : 'text-slate-500 dark:text-slate-455 hover:text-slate-850 dark:hover:text-slate-200'
                    }`}
                  >
                    All Pictures
                  </button>
                  {phasesWithPhotos.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setGalleryFilter(p.id)}
                      className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                        galleryFilter === p.id 
                          ? 'bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-white' 
                          : 'text-slate-500 dark:text-slate-455 hover:text-slate-850 dark:hover:text-slate-200'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photos Grid with Stagger Entrance */}
              {isLoadingPhotos ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square w-full" />
                  ))}
                </div>
              ) : filteredPhotos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredPhotos.map((photo, index) => (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.94 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ type: "spring", stiffness: 90, damping: 15, delay: index * 0.02 }}
                      key={photo.id}
                      onClick={() => setLightboxIndex(index)}
                      className="relative aspect-square rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-900 hover:border-indigo-500/50 group bg-slate-50 dark:bg-slate-950 cursor-pointer shadow hover:shadow-[0_10px_20px_-10px_rgba(99,102,241,0.15)] transition-all duration-350"
                    >
                      <img 
                        src={photo.image_url} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" 
                        alt="Progress log thumbnail" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent flex flex-col justify-end p-5 opacity-0 group-hover:opacity-100 transition-all duration-300 text-left">
                        <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider">
                          {getPhaseName(photo.phase_id)}
                        </span>
                        <span className="text-[9px] text-slate-300 mt-1 flex items-center gap-1.5 font-bold">
                          <Calendar className="w-3 h-3 text-indigo-455" />
                          {photo.created_at}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white dark:bg-slate-900/10 border border-slate-200 dark:border-slate-900 rounded-3xl shadow-sm">
                  <p className="text-slate-500 dark:text-slate-450 text-xs font-semibold">No progress photos logged for this phase filter.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Section: How to Support the Build */}
      <section className="py-24 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center border-t border-slate-200 dark:border-slate-900 relative">
        {/* Left: Parish Support Info Card (No Images) */}
        <div className="lg:col-span-5 relative order-last lg:order-first">
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-indigo-500/5 dark:from-emerald-500/10 dark:to-indigo-500/10 rounded-3xl blur-3xl -z-10 animate-pulse" />
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-2xl space-y-6 text-left"
          >
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Direct Parish Support</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Verified Building Account Details</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Parish Location</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200 block">St. Francis of Assisi, Lusanja</span>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Contribution Channels</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block">Mobile Money Deposits & In-Kind Pledges</span>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Audit Oversight</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 block">Managed by Parish Building Committee</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right: Support methods Stagger reveal */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <motion.h2 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-wide"
          >
            How You Can Participate
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm font-medium leading-relaxed"
          >
            The completion of the house of God is a collective act of faith. Every donation, brick, and prayer counts towards raising this sanctuary in Lusanja parish.
          </motion.p>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-5"
          >
            {/* Way 1 */}
            <motion.div variants={itemVariants} className="flex gap-4 items-start group">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-650 dark:text-indigo-400 shrink-0 mt-1 group-hover:scale-110 duration-200 transition-transform">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Financial Donations</h4>
                <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 leading-relaxed font-medium">Contribute monthly pledges, sponsor specific work phases, or support community fundraisers. Secure Mobile Money deposits can be logged at our parish portal.</p>
              </div>
            </motion.div>

            {/* Way 2 */}
            <motion.div variants={itemVariants} className="flex gap-4 items-start group">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center text-emerald-650 dark:text-emerald-400 shrink-0 mt-1 group-hover:scale-110 duration-200 transition-transform">
                <Hammer className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-650 dark:group-hover:text-emerald-450 transition-colors">Building Material Pledges</h4>
                <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 leading-relaxed font-medium">We directly accept materials in-kind, including bags of cement, building blocks, sand trucks, reinforcement iron bars, roofing panels, and tiling.</p>
              </div>
            </motion.div>

            {/* Way 3 */}
            <motion.div variants={itemVariants} className="flex gap-4 items-start group">
              <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0 mt-1 group-hover:scale-110 duration-200 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-450 transition-colors">Volunteer & Workdays</h4>
                <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 leading-relaxed font-medium">Join us on parish community building workdays (Bulungi Bwansi) to assist builders physically, or offer technical consultancy services (masonry, carpentry).</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Section D2: Building Committee Directory */}
      <section className="py-12 px-6 max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-wide">Building Committee</h2>
          <p className="text-slate-550 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Parish leadership managing project oversight and execution</p>
        </div>

        {isLoadingCommittee ? (
          <div className="text-center text-xs text-slate-400 py-10">Loading committee...</div>
        ) : committee.filter(m => m.isActive).length === 0 ? (
          <p className="text-center text-xs text-slate-400 italic py-10">Committee details loading or offline.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {committee.filter(m => m.isActive).map(member => (
              <div key={member.id} className="glass-card rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800 text-center flex flex-col items-center space-y-3 bg-white/50 dark:bg-slate-900/40 hover:shadow-md transition-all duration-300">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-sm font-mono shrink-0">
                  {member.fullName.charAt(0)}
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">{member.fullName}</h4>
                  <p className="text-[10px] sm:text-xs text-indigo-650 dark:text-indigo-400 font-bold uppercase tracking-wider">{member.roleTitle}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section E: Bottom Call to Action and Footer */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 80 }}
          className="relative overflow-hidden bg-gradient-to-r from-indigo-50 to-primary-50 dark:from-primary-900/30 dark:to-indigo-900/30 border border-indigo-100 dark:border-slate-900 rounded-3xl p-8 sm:p-14 text-center shadow-xl space-y-6 group"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_65%)] pointer-events-none group-hover:scale-105 duration-700 transition-transform" />
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight relative z-10 uppercase tracking-wide">Manage Pledges, Donations & Project Logs</h2>
          <p className="text-slate-600 dark:text-slate-350 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed relative z-10 font-medium">
            Registered church members, treasurers, and coordinators can access the private portal to track individual contributions, verify invoices, approve material orders, or submit engineering notes.
          </p>
          <div className="relative z-10 pt-2">
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-white text-white dark:text-slate-950 dark:hover:bg-slate-100 font-black text-xs rounded-xl transition-all shadow hover:shadow-indigo-500/10 dark:hover:shadow-white/10 uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer border border-indigo-600 dark:border-white hover:scale-105 duration-200"
            >
              <span>Access Member Portal</span>
              <ArrowRight className="w-4 h-4 text-white dark:text-slate-950 animate-pulse" />
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-slate-500 text-xs text-left">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow">
                <Landmark className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-slate-800 dark:text-slate-300 uppercase tracking-wider">St. Francis Lusanja</span>
            </div>
            <p className="text-slate-500 font-medium">St. Francis of Assisi Catholic Church, Lusanja Parish. Construction Management Hub.</p>
          </div>
          
          <div className="flex justify-center space-x-6">
            <a href="/" className="hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors font-semibold">Home</a>
            <a href="/login" className="hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors font-semibold">Portal Login</a>
            <a href="#tracker-section" className="hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors font-semibold">Tracker</a>
          </div>

          <div className="text-center md:text-right space-y-1 font-medium">
            <p>© {new Date().getFullYear()} St. Francis of Assisi. All rights reserved.</p>
            <p>Lusanja, Uganda. Building Committee Office.</p>
          </div>
        </div>
      </footer>

      {/* Lightbox Modal overlay */}
      <AnimatePresence>
        {lightboxIndex !== null && filteredPhotos[lightboxIndex] && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4"
          >
            {/* Close button */}
            <button 
              onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 p-2.5 bg-slate-900 border border-slate-800 rounded-full hover:bg-slate-800 transition-colors cursor-pointer text-slate-455 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navigation container */}
            <div className="relative w-full max-w-4xl aspect-video flex items-center justify-center">
              {/* Left Arrow */}
              <button 
                onClick={() => setLightboxIndex(prev => prev > 0 ? prev - 1 : filteredPhotos.length - 1)}
                className="absolute left-2 sm:left-4 p-3 bg-slate-900/80 border border-slate-800/80 rounded-full hover:bg-slate-800 transition-colors cursor-pointer text-slate-300 hover:text-white z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Main Lightbox Image */}
              <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-2xl border border-slate-900 bg-slate-950 shadow-2xl">
                <img 
                  src={filteredPhotos[lightboxIndex].image_url} 
                  className="max-w-full max-h-full object-contain select-none" 
                  alt="Full progress preview" 
                />
              </div>

              {/* Right Arrow */}
              <button 
                onClick={() => setLightboxIndex(prev => prev < filteredPhotos.length - 1 ? prev + 1 : 0)}
                className="absolute right-2 sm:right-4 p-3 bg-slate-900/80 border border-slate-800/80 rounded-full hover:bg-slate-800 transition-colors cursor-pointer text-slate-300 hover:text-white z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Image Details */}
            <div className="mt-6 text-center space-y-1">
              <h4 className="text-base font-bold text-white">
                {getPhaseName(filteredPhotos[lightboxIndex].phase_id)} Work Phase
              </h4>
              <p className="text-xs text-slate-400 font-bold flex items-center justify-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Logged on {filteredPhotos[lightboxIndex].created_at}
              </p>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pt-2">
                Image {lightboxIndex + 1} of {filteredPhotos.length}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Architectural Visual Plan Lightbox Modal */}
      <AnimatePresence>
        {planModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-4 sm:p-8"
          >
            <div className="absolute top-4 right-4 z-20 flex items-center space-x-3">
              <button
                onClick={() => setPlanModalOpen(false)}
                className="p-3 bg-slate-900 border border-slate-800 rounded-full hover:bg-slate-800 transition-colors cursor-pointer text-slate-300 hover:text-white shadow-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="w-full max-w-6xl max-h-[90vh] flex flex-col items-center justify-center relative space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider flex items-center justify-center gap-2">
                  <Landmark className="w-6 h-6 text-amber-400" />
                  St. Francis of Assisi Church — Architectural Visual Blueprint
                </h3>
                <p className="text-xs text-slate-400 font-medium">Approved Structural Elevation & 3D Renderings — Lusanja Sub-Parish</p>
              </div>

              <div className="w-full h-[70vh] bg-slate-900 border border-slate-800 rounded-3xl p-3 shadow-2xl flex items-center justify-center overflow-auto">
                <img
                  src="/images/church_architectural_plan_1.png"
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-lg select-none"
                  alt="Full Architectural Plan Document"
                />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-300">
                <span className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Official 3D Architectural Renders
                </span>
                <span className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  Lusanja Sub-Parish, Kampala Uganda
                </span>
                <button
                  onClick={() => window.open('/images/church_architectural_plan_1.png', '_blank')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Open Full Resolution Image</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
