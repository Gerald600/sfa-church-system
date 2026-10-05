import { useState, useEffect, useRef } from 'react'
import { BookOpen, Heart, Sparkles, ChevronRight, RefreshCw, Loader2, DatabaseZap } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-hot-toast'

// ─────────────────────────────────────────────────────────────────────────────
// 31-Day Seed Dataset — hand-picked NIV/NLT scripture on giving & building
// ─────────────────────────────────────────────────────────────────────────────
const SEED_VERSES = [
  {
    display_day: 1,
    reference: '2 Corinthians 9:7',
    scripture_text: 'Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.',
    simple_explanation: 'God cares more about the attitude behind your gift than the size of it. When you give with a happy and willing heart, it becomes an act of worship that God truly delights in.',
    category: 'Heart Attitude'
  },
  {
    display_day: 2,
    reference: 'Luke 6:38',
    scripture_text: 'Give, and it will be given to you. A good measure, pressed down, shaken together and running over, will be poured into your lap. For with the measure you use, it will be measured to you.',
    simple_explanation: 'Jesus promises that generosity is never a loss — whatever you give, God gives back to you multiplied and overflowing. The amount you pour out becomes the measure of blessing you receive.',
    category: 'Divine Provision'
  },
  {
    display_day: 3,
    reference: 'Malachi 3:10',
    scripture_text: '"Bring the whole tithe into the storehouse, that there may be food in my house. Test me in this," says the Lord Almighty, "and see if I will not throw open the floodgates of heaven and pour out so much blessing that there will not be room enough to store it."',
    simple_explanation: 'God makes an extraordinary invitation — dare to be faithful with the tithe, and He promises to pour out blessings beyond what you can contain. Giving to the church building fund is participating in filling God\'s storehouse.',
    category: 'Tithing'
  },
  {
    display_day: 4,
    reference: 'Haggai 1:7–8',
    scripture_text: 'This is what the Lord Almighty says: "Give careful thought to your ways. Go up into the mountains and bring down timber and build my house, so that I may take pleasure in it and be honored," says the Lord.',
    simple_explanation: 'God personally called His people to stop neglecting His house and invest in building it. Contributing to St. Francis\'s construction is a direct response to this ancient and timeless call from God.',
    category: 'Building God\'s House'
  },
  {
    display_day: 5,
    reference: 'Exodus 36:5–6',
    scripture_text: 'The people are bringing more than enough for doing the work the Lord commanded to be done. Then Moses gave an order and they sent this word throughout the camp: "No man or woman is to make anything else as an offering for the sanctuary." And so the people were restrained from bringing more.',
    simple_explanation: 'When the Israelites built the Tabernacle, their generosity was so overwhelming that Moses had to ask them to stop giving. Let our parish inspire that same spirit of joyful, overflowing contribution.',
    category: 'Building God\'s House'
  },
  {
    display_day: 6,
    reference: 'Proverbs 3:9–10',
    scripture_text: 'Honor the Lord with your wealth, with the firstfruits of all your crops; then your barns will be filled to overflowing, and your vats will brim over with new wine.',
    simple_explanation: 'Giving God the first and best portion of your income is how you honor Him with your finances. When you do, He promises your material needs will be abundantly met.',
    category: 'Firstfruits'
  },
  {
    display_day: 7,
    reference: 'Matthew 6:19–21',
    scripture_text: '"Do not store up for yourselves treasures on earth, where moths and vermin destroy, and where thieves break in and steal. But store up for yourselves treasures in heaven... For where your treasure is, there your heart will be also."',
    simple_explanation: 'Earthly wealth is temporary, but giving toward God\'s kingdom creates eternal deposits. Every shilling given to this building fund is an investment in something that lasts forever.',
    category: 'Eternal Perspective'
  },
  {
    display_day: 8,
    reference: '1 Chronicles 29:14',
    scripture_text: '"But who am I, and who are my people, that we should be able to give as generously as this? Everything comes from you, and we have given you only what comes from your hand."',
    simple_explanation: 'King David\'s prayer reminds us that everything we give to God originally came from Him. Our contributions are simply returning to God what He graciously put in our hands first.',
    category: 'Gratitude'
  },
  {
    display_day: 9,
    reference: 'Mark 12:41–44',
    scripture_text: 'Calling his disciples to him, Jesus said, "Truly I tell you, this poor widow has put more into the treasury than all the others. They all gave out of their wealth; but she, out of her poverty, put in everything — all she had to live on."',
    simple_explanation: 'Jesus honors sacrificial giving over impressive amounts. God sees not just the number but the sacrifice behind it — giving even a small amount with great faith is precious in His sight.',
    category: 'Sacrifice'
  },
  {
    display_day: 10,
    reference: 'Philippians 4:17–19',
    scripture_text: 'Not that I desire your gifts; what I desire is that more be credited to your account. I have received full payment and have more than enough... And my God will meet all your needs according to the riches of his glory in Christ Jesus.',
    simple_explanation: 'Paul teaches that giving is credited to your spiritual account in heaven. God honours every generous act and in return, He guarantees to meet all your needs through His limitless heavenly resources.',
    category: 'Divine Provision'
  },
  {
    display_day: 11,
    reference: 'Deuteronomy 8:18',
    scripture_text: 'But remember the Lord your God, for it is he who gives you the ability to produce wealth, and so confirms his covenant, which he swore to your ancestors, as it is today.',
    simple_explanation: 'Every talent, skill, and income you have comes from God\'s enabling power. Giving back to His work is how we acknowledge that all our productivity is a covenant gift from Him.',
    category: 'Gratitude'
  },
  {
    display_day: 12,
    reference: 'Nehemiah 2:18',
    scripture_text: 'I also told them about the gracious hand of my God on me and what the king had said to me. They replied, "Let us start rebuilding." So they began this good work.',
    simple_explanation: 'When Nehemiah shared the vision to rebuild Jerusalem\'s walls, the people immediately committed to the work. Our parish building project is that same noble vision — a call for every member to say "Let us start!"',
    category: 'Building God\'s House'
  },
  {
    display_day: 13,
    reference: '2 Corinthians 9:6',
    scripture_text: 'Remember this: Whoever sows sparingly will also reap sparingly, and whoever sows generously will also reap generously.',
    simple_explanation: 'Giving is compared to farming — the size of your harvest depends on how much seed you plant. A generous gift today plants the seed for a generous return in every area of your life.',
    category: 'Blessings'
  },
  {
    display_day: 14,
    reference: 'Exodus 25:2',
    scripture_text: 'Tell the Israelites to bring me an offering. You are to receive the offering for me from everyone whose heart prompts them to give.',
    simple_explanation: 'God did not demand contributions for His sanctuary — He invited willing-hearted givers. Every contribution to this church project is an offering from your heart, not a burden from duty.',
    category: 'Heart Attitude'
  },
  {
    display_day: 15,
    reference: 'Psalm 24:1',
    scripture_text: 'The earth is the Lord\'s, and everything in it, the world, and all who live in it.',
    simple_explanation: 'Since everything ultimately belongs to God, giving to His house is simply moving His resources from one pocket to another. We are stewards, not owners, of what we hold.',
    category: 'Stewardship'
  },
  {
    display_day: 16,
    reference: 'Haggai 2:8–9',
    scripture_text: '"The silver is mine and the gold is mine," declares the Lord Almighty. "The glory of this present house will be greater than the glory of the former house," says the Lord Almighty.',
    simple_explanation: 'God owns all the silver and gold — He lacks nothing. Yet He chooses to build His house through our willing participation. When we give, we partner with God in creating something more glorious than we can imagine.',
    category: 'Building God\'s House'
  },
  {
    display_day: 17,
    reference: 'Romans 8:32',
    scripture_text: 'He who did not spare his own Son, but gave him up for us all — how will he not also, along with him, graciously give us all things?',
    simple_explanation: 'God is the ultimate giver — He gave His most precious Son for us. If He gave that, He will certainly provide everything else we need. Our giving reflects the nature of our generous Father.',
    category: 'Divine Provision'
  },
  {
    display_day: 18,
    reference: 'Matthew 25:40',
    scripture_text: '"The King will reply, \'Truly I tell you, whatever you did for one of the least of these brothers and sisters of mine, you did for me.\'"',
    simple_explanation: 'Building a church is an act of service to the entire community — every family that worships, is baptised, married, or buried here is served by what we are building today. Your contribution serves Christ Himself.',
    category: 'Community'
  },
  {
    display_day: 19,
    reference: 'Zechariah 4:10',
    scripture_text: '"Who dares despise the day of small things, since the seven eyes of the Lord that range throughout the earth will rejoice when they see the chosen capstone in the hand of Zerubbabel?"',
    simple_explanation: 'God celebrates every small act of faithful contribution to His work. No gift is too small or insignificant in His eyes — even the tiniest offering, given in faith, brings joy to God\'s heart.',
    category: 'Sacrifice'
  },
  {
    display_day: 20,
    reference: '1 Corinthians 16:2',
    scripture_text: 'On the first day of every week, each one of you should set aside a sum of money in keeping with your income, saving it up, so that when I come no collections will have to be made.',
    simple_explanation: 'Paul encouraged planned, regular, proportional giving — not impulsive or pressured charity. Setting aside a consistent amount weekly for the building fund is a wise and godly practice.',
    category: 'Tithing'
  },
  {
    display_day: 21,
    reference: 'Proverbs 11:24–25',
    scripture_text: 'One person gives freely, yet gains even more; another withholds unduly, but comes to poverty. A generous person will prosper; whoever refreshes others will be refreshed.',
    simple_explanation: 'Generosity has a paradoxical economic logic — those who give freely end up gaining more, while those who hoard end up with less. Refreshing others through giving means you yourself will be refreshed.',
    category: 'Blessings'
  },
  {
    display_day: 22,
    reference: 'Exodus 35:21',
    scripture_text: 'Everyone who was willing and whose heart moved them came and brought an offering to the Lord for the work on the tent of meeting.',
    simple_explanation: 'The construction of the Tabernacle was entirely funded by willing, heart-moved people — just like our church today. God has always built His house through the generosity of people who say yes in their hearts.',
    category: 'Building God\'s House'
  },
  {
    display_day: 23,
    reference: 'Ecclesiastes 11:1',
    scripture_text: 'Ship your grain across the sea; after many days you may receive a return.',
    simple_explanation: 'This ancient verse teaches that bold, forward-thinking generosity always yields a return, even when the results are not immediately visible. Give today in faith, and the harvest will come.',
    category: 'Eternal Perspective'
  },
  {
    display_day: 24,
    reference: 'James 2:17',
    scripture_text: 'In the same way, faith by itself, if it is not accompanied by action, is dead.',
    simple_explanation: 'Faith in God\'s promises must be accompanied by concrete action. Contributing to the building fund is one powerful way to put your faith into action — trusting God with what is in your hands.',
    category: 'Heart Attitude'
  },
  {
    display_day: 25,
    reference: 'Acts 4:34–35',
    scripture_text: 'There were no needy persons among them. For from time to time those who owned land or houses sold them, brought the money from the sales and put it at the apostles\' feet, and it was distributed to anyone who had need.',
    simple_explanation: 'The early church had such radical generosity that no one lacked anything. They pooled resources for the common good. Our building project is born from that same spirit — giving together for something bigger than any one of us.',
    category: 'Community'
  },
  {
    display_day: 26,
    reference: 'Genesis 14:20',
    scripture_text: 'Then Abram gave him a tenth of everything.',
    simple_explanation: 'Long before the Mosaic Law, Abram gave a tithe to Melchizedek, God\'s priest. Giving a tenth is one of the oldest expressions of honoring God — a practice that predates every religious system.',
    category: 'Tithing'
  },
  {
    display_day: 27,
    reference: 'Isaiah 58:7',
    scripture_text: 'Is it not to share your food with the hungry and to provide the poor wanderer with shelter — when you see the naked, to clothe them, and not to turn away from your own flesh and blood?',
    simple_explanation: 'True religion always manifests in practical acts of provision. Building a church is not just about walls — it is creating a place of refuge, worship, and community care for generations to come.',
    category: 'Community'
  },
  {
    display_day: 28,
    reference: 'Nehemiah 4:6',
    scripture_text: 'So we rebuilt the wall till all of it reached half its height, for the people worked with all their heart.',
    simple_explanation: 'Nehemiah\'s wall was rebuilt with remarkable speed because "the people worked with all their heart." Half the job is done when your heart is fully in it. Give and work for this project with wholehearted devotion.',
    category: 'Building God\'s House'
  },
  {
    display_day: 29,
    reference: 'Matthew 7:11',
    scripture_text: '"If you, then, though you are evil, know how to give good gifts to your children, how much more will your Father in heaven give good gifts to those who ask him!"',
    simple_explanation: 'Our human instinct to give good things to our children reflects a tiny glimpse of God\'s own generous heart. He is far more willing to bless those who give and seek Him than the best parent could ever be.',
    category: 'Divine Provision'
  },
  {
    display_day: 30,
    reference: 'Psalm 112:5',
    scripture_text: 'Good will come to those who are generous and lend freely, who conduct their affairs with justice.',
    simple_explanation: 'Generosity is not just spiritually beneficial — it is described as a core quality of a righteous and blessed person. The Psalms declare plainly: good things come to those who give freely.',
    category: 'Blessings'
  },
  {
    display_day: 31,
    reference: 'Revelation 21:2',
    scripture_text: 'I saw the Holy City, the new Jerusalem, coming down out of heaven from God, prepared as a bride beautifully dressed for her husband.',
    simple_explanation: 'The ultimate end of God\'s plan is a magnificent holy dwelling — and He invites us to participate in building a preview of that glory right here in Lusanja. Every brick laid and every shilling given points toward eternity.',
    category: 'Eternal Perspective'
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// Category colour mapping
// ─────────────────────────────────────────────────────────────────────────────
const categoryStyles = {
  'Heart Attitude':      { bg: 'bg-rose-500/15',    text: 'text-rose-400',    border: 'border-rose-500/30',    glow: 'shadow-rose-500/10' },
  'Divine Provision':    { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/10' },
  'Tithing':             { bg: 'bg-amber-500/15',   text: 'text-amber-400',   border: 'border-amber-500/30',   glow: 'shadow-amber-500/10' },
  'Building God\'s House': { bg: 'bg-sky-500/15',   text: 'text-sky-400',     border: 'border-sky-500/30',     glow: 'shadow-sky-500/10' },
  'Blessings':           { bg: 'bg-violet-500/15',  text: 'text-violet-400',  border: 'border-violet-500/30',  glow: 'shadow-violet-500/10' },
  'Sacrifice':           { bg: 'bg-orange-500/15',  text: 'text-orange-400',  border: 'border-orange-500/30',  glow: 'shadow-orange-500/10' },
  'Gratitude':           { bg: 'bg-teal-500/15',    text: 'text-teal-400',    border: 'border-teal-500/30',    glow: 'shadow-teal-500/10' },
  'Stewardship':         { bg: 'bg-cyan-500/15',    text: 'text-cyan-400',    border: 'border-cyan-500/30',    glow: 'shadow-cyan-500/10' },
  'Community':           { bg: 'bg-indigo-500/15',  text: 'text-indigo-400',  border: 'border-indigo-500/30',  glow: 'shadow-indigo-500/10' },
  'Firstfruits':         { bg: 'bg-lime-500/15',    text: 'text-lime-400',    border: 'border-lime-500/30',    glow: 'shadow-lime-500/10' },
  'Eternal Perspective': { bg: 'bg-purple-500/15',  text: 'text-purple-400',  border: 'border-purple-500/30',  glow: 'shadow-purple-500/10' },
}

const defaultStyle = { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30', glow: 'shadow-indigo-500/10' }

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function DailyVerse({ onContributeClick }) {
  const [verse, setVerse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [isDev] = useState(() => window.location.hostname === 'localhost')
  const verseRef = useRef(null)

  const todayDay = new Date().getDate() // 1–31

  // ── Fetch today's verse ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    const fetchVerse = async () => {
      setLoading(true)
      setRevealed(false)

      // Real accounts — query Supabase
      try {
        const { data, error } = await supabase
          .from('daily_verses')
          .select('*')
          .eq('display_day', todayDay)
          .single()

        if (error || !data) {
          // Fallback to local seed if table not seeded yet
          const match = SEED_VERSES.find(v => v.display_day === todayDay)
          if (!cancelled) setVerse(match || SEED_VERSES[0])
        } else {
          if (!cancelled) setVerse(data)
        }
      } catch {
        const match = SEED_VERSES.find(v => v.display_day === todayDay)
        if (!cancelled) setVerse(match || SEED_VERSES[0])
      } finally {
        if (!cancelled) {
          setLoading(false)
          setTimeout(() => { if (!cancelled) setRevealed(true) }, 80)
        }
      }
    }

    fetchVerse()
    return () => { cancelled = true }
  }, [todayDay])

  // ── Seed 31 verses into Supabase ─────────────────────────────────────────
  const handleSeed = async () => {
    setSeeding(true)
    setSeedMsg('')

    try {
      // Upsert all 31 — safe to run multiple times
      const { error } = await supabase
        .from('daily_verses')
        .upsert(SEED_VERSES.map(v => ({
          reference: v.reference,
          scripture_text: v.scripture_text,
          simple_explanation: v.simple_explanation,
          category: v.category,
          display_day: v.display_day
        })), { onConflict: 'display_day' })

      if (error) throw error
      setSeedMsg('✅ 31 days of giving verses seeded successfully!')
      toast.success('31 days of giving verses seeded successfully!')

      // Re-fetch to show updated
      const { data } = await supabase
        .from('daily_verses')
        .select('*')
        .eq('display_day', todayDay)
        .single()
      if (data) setVerse(data)
    } catch (err) {
      setSeedMsg(`❌ Seed failed: ${err.message}`)
      toast.error(`Seed failed: ${err.message}`)
    } finally {
      setSeeding(false)
      setTimeout(() => setSeedMsg(''), 6000)
    }
  }

  const style = verse ? (categoryStyles[verse.category] || defaultStyle) : defaultStyle

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      ref={verseRef}
      className={`
        relative overflow-hidden rounded-3xl border
        bg-gradient-to-br from-slate-900/90 via-slate-900/95 to-slate-950
        ${style.border}
        shadow-2xl ${style.glow}
        transition-all duration-700
      `}
    >
      {/* ── Decorative background texture ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Radial glow */}
        <div className={`absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-20 ${style.bg}`} />
        <div className={`absolute -bottom-12 -left-12 w-56 h-56 rounded-full blur-2xl opacity-15 ${style.bg}`} />
        {/* Fine dot grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Scripture watermark */}
        <BookOpen
          className="absolute bottom-4 right-6 w-32 h-32 opacity-[0.04] text-white"
          strokeWidth={1}
        />
      </div>

      {/* ── Header strip ── */}
      <div className={`relative flex items-center justify-between px-6 pt-5 pb-3 border-b ${style.border}`}>
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-xl ${style.bg}`}>
            <Sparkles className={`w-4 h-4 ${style.text}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Today's Devotional & Encouragement
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">
              Day {todayDay} · Automatically updates at midnight
            </p>
          </div>
        </div>

        {/* Category badge */}
        {verse && (
          <span className={`hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${style.bg} ${style.text} ${style.border}`}>
            <Heart className="w-3 h-3 fill-current" />
            <span>{verse.category}</span>
          </span>
        )}
      </div>

      {/* ── Body ── */}
      <div className="relative px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-10 space-x-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Loading today's scripture...</span>
          </div>
        ) : verse ? (
          <div
            className={`space-y-5 transition-all duration-700 ${
              revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {/* Category badge (mobile) */}
            <div className="sm:hidden">
              <span className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${style.bg} ${style.text} ${style.border}`}>
                <Heart className="w-3 h-3 fill-current" />
                <span>{verse.category}</span>
              </span>
            </div>

            {/* Scripture text */}
            <blockquote className="relative">
              {/* Decorative quote mark */}
              <span
                className={`absolute -top-3 -left-1 text-6xl font-serif leading-none ${style.text} opacity-30 select-none pointer-events-none`}
                aria-hidden="true"
              >"</span>
              <p className="relative z-10 pl-4 text-base sm:text-lg font-semibold text-white leading-relaxed italic tracking-wide">
                {verse.scripture_text}
              </p>
            </blockquote>

            {/* Reference */}
            <div className="flex items-center space-x-2 pl-4">
              <div className={`h-0.5 w-8 rounded-full ${style.text} opacity-60 bg-current`} />
              <span className={`text-sm font-bold tracking-wide ${style.text}`}>
                {verse.reference}
              </span>
            </div>

            {/* Divider */}
            <div className={`border-t ${style.border} opacity-50`} />

            {/* Explanation */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center space-x-2">
                <span>What This Means For Us</span>
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                {verse.simple_explanation}
              </p>
            </div>

            {/* CTA Button */}
            <div className="pt-1">
              <button
                id="daily-verse-contribute-btn"
                onClick={() => {
                  // Smooth scroll to contribute section or trigger modal
                  if (onContributeClick) {
                    onContributeClick()
                  } else {
                    // Fallback: find and scroll to contribution form
                    const el = document.getElementById('contribute-section')
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                }}
                className={`
                  group relative w-full sm:w-auto flex items-center justify-center space-x-3
                  px-7 py-3.5 rounded-2xl
                  bg-gradient-to-r ${
                    style.text === 'text-rose-400' ? 'from-rose-600 to-rose-500' :
                    style.text === 'text-emerald-400' ? 'from-emerald-600 to-emerald-500' :
                    style.text === 'text-amber-400' ? 'from-amber-600 to-amber-500' :
                    style.text === 'text-sky-400' ? 'from-sky-600 to-sky-500' :
                    style.text === 'text-violet-400' ? 'from-violet-600 to-violet-500' :
                    'from-indigo-600 to-indigo-500'
                  }
                  text-white font-bold text-sm
                  shadow-lg hover:shadow-xl
                  hover:-translate-y-0.5 active:translate-y-0
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500
                  cursor-pointer
                `}
              >
                <Heart className="w-4 h-4 fill-white" />
                <span>Respond with a Contribution</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-sm">
            No verse found for today. Try seeding the database below.
          </div>
        )}
      </div>

      {/* ── Developer Testing Tools ── */}
      {isDev && (
        <div className={`relative px-6 pb-5 border-t ${style.border} pt-4 space-y-3`}>
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest flex items-center space-x-1.5">
            <DatabaseZap className="w-3 h-3" />
            <span>Developer Testing Tools</span>
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              id="seed-verses-btn"
              onClick={handleSeed}
              disabled={seeding}
              title="Seed all 31 verses into Supabase daily_verses table"
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {seeding ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Seeding…</span></>
              ) : (
                <><RefreshCw className="w-3.5 h-3.5" /><span>Seed 31 Days of Giving Verses</span></>
              )}
            </button>
            {seedMsg && (
              <span className={`text-xs font-semibold ${seedMsg.startsWith('✅') ? 'text-emerald-400' : 'text-rose-400'}`}>
                {seedMsg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
