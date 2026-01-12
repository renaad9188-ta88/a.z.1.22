'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { LogOut, User } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Header() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkUser()
      } else {
        setUser(null)
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (currentUser) {
        setUser(currentUser)
        
        // Load user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .single()
        
        setUserProfile(profile)
      } else {
        setUser(null)
        setUserProfile(null)
      }
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserProfile(null)
    router.push('/')
    router.refresh()
    toast.success('تم تسجيل الخروج بنجاح')
  }

  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-2 sm:px-3 md:px-4 py-1">
        <div className="flex justify-between items-center gap-2">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 group">
            {/* شعار جميل - أيقونة تمثل الوحدة والخدمات */}
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center">
              {/* خلفية متدرجة بألوان علم سوريا مع تأثير ثلاثي الأبعاد */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-500 to-red-700 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105"></div>
              {/* طبقة بيضاء في الوسط */}
              <div className="absolute inset-[2px] bg-gradient-to-br from-white to-gray-50 rounded-lg"></div>
              {/* طبقة خضراء في الأسفل */}
              <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-b from-green-600 to-green-700 rounded-b-xl"></div>
              {/* نجمة بيضاء تمثل الوحدة */}
              <div className="relative z-10 flex items-center justify-center">
                <svg 
                  className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-red-600 drop-shadow-lg animate-pulse" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
              </div>
              {/* حلقة خارجية ذهبية */}
              <div className="absolute -inset-0.5 border-2 border-yellow-400/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-[10px] sm:text-xs md:text-sm font-bold bg-gradient-to-r from-red-600 via-gray-800 to-green-600 bg-clip-text text-transparent leading-tight group-hover:from-red-500 group-hover:to-green-500 transition-all">
                منصة خدمات السوريين
              </h1>
              <div className="h-0.5 bg-gradient-to-r from-red-500 via-yellow-400 to-green-600 rounded-full mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity"></div>
            </div>
          </Link>
          
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 min-w-0 flex-1 justify-end">
            {loading ? (
              <div className="w-16 h-6 bg-gray-200 animate-pulse rounded"></div>
            ) : user ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 text-xs sm:text-sm text-gray-700 hover:text-blue-600 transition min-w-0"
                >
                  <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate max-w-[120px] sm:max-w-[140px] md:max-w-[180px] lg:max-w-[220px]">
                    <span className="sm:hidden">حسابي: </span>
                    {userProfile?.full_name || 'المستخدم'}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-1.5 sm:px-2 md:px-2.5 py-0.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition flex-shrink-0"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/auth/login" 
                  className="px-2 py-0.5 text-xs text-gray-700 hover:text-blue-600 transition"
                >
                  دخول
                </Link>
                <Link 
                  href="/auth/register" 
                  className="px-2.5 py-0.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs font-semibold"
                >
                  حجز
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

