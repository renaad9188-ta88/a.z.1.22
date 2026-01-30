'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import {
  ArrowLeft,
  LogOut,
  User,
  ChevronDown,
  LayoutDashboard,
  FileText,
  Settings,
  Shield,
  Users,
  FolderOpen,
} from 'lucide-react'
import toast from 'react-hot-toast'
import NotificationsDropdown from './NotificationsDropdown'

export default function Header() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDriver, setIsDriver] = useState(false)
  const [isSupervisor, setIsSupervisor] = useState(false)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

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

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!menuOpen) return
      const target = e.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

  const checkUser = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (currentUser) {
        setUser(currentUser)
        
        // Load user profile (فقط الحقول المطلوبة)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('user_id', currentUser.id)
          .maybeSingle()
        
        if (profileError) {
          console.error('Error loading profile:', profileError)
        }
        
        setUserProfile(profile || null)
        const userRole = (profile?.role || '').toLowerCase()
        setIsAdmin(userRole === 'admin')
        setIsDriver(userRole === 'driver')
        setIsSupervisor(userRole === 'supervisor')
      } else {
        setUser(null)
        setUserProfile(null)
        setIsAdmin(false)
        setIsSupervisor(false)
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
    setMenuOpen(false)
    router.push('/')
    router.refresh()
    toast.success('تم تسجيل الخروج بنجاح')
  }

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    if (user) {
      if (isAdmin) router.push('/admin')
      else if (isSupervisor) router.push('/admin')
      else if (isDriver) router.push('/driver')
      else router.push('/dashboard')
      return
    }
    router.push('/')
  }

  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-2 sm:px-3 md:px-4 py-1">
        <div className="flex justify-between items-center gap-2">
          <div className="flex flex-col items-start gap-1 flex-shrink-0">
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2 group">
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
                <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-extrabold bg-gradient-to-r from-red-600 via-gray-800 to-green-600 bg-clip-text text-transparent leading-tight group-hover:from-red-500 group-hover:to-green-500 transition-all">
                  منصة خدمات السوريين
                </h1>
                <div className="h-0.5 bg-gradient-to-r from-red-500 via-yellow-400 to-green-600 rounded-full mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </Link>

            {/* زر الرجوع داخل الهيدر (أسفل العنوان) */}
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-sm sm:text-base font-bold text-gray-700 hover:text-blue-700 transition px-3 py-1.5 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-100"
              aria-label="رجوع"
              title="رجوع"
            >
              <ArrowLeft className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
              <span>رجوع</span>
            </button>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 min-w-0 flex-1 justify-end">
            {loading ? (
              <div className="w-16 h-6 bg-gray-200 animate-pulse rounded"></div>
            ) : user ? (
              <>
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(v => !v)}
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2 md:px-3 py-1.5 sm:py-1.5 text-xs sm:text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition min-w-0"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                  >
                    <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate max-w-[90px] sm:max-w-[120px] md:max-w-[160px] lg:max-w-[200px]">
                      <span className="sm:hidden">
                        {isAdmin ? 'إدمن: ' : isSupervisor ? 'مشرف: ' : isDriver ? 'سائق: ' : 'حسابي: '}
                      </span>
                      {userProfile?.full_name || 'المستخدم'}
                    </span>
                    <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {menuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 sm:w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50"
                      role="menu"
                    >
                      {isAdmin ? (
                        <>
                          <Link
                            href="/admin"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Shield className="w-4 h-4 text-amber-600" />
                            لوحة الإدارة
                          </Link>
                          <Link
                            href="/admin/profile"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Settings className="w-4 h-4 text-gray-700" />
                            إعدادات الإدمن
                          </Link>
                        </>
                      ) : isSupervisor ? (
                        <>
                          <Link
                            href="/admin"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Users className="w-4 h-4 text-blue-600" />
                            لوحة المشرف
                          </Link>
                          <Link
                            href="/admin/profile"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Settings className="w-4 h-4 text-gray-700" />
                            إعدادات المشرف
                          </Link>
                        </>
                      ) : isDriver ? (
                        <>
                          <Link
                            href="/driver"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <LayoutDashboard className="w-4 h-4 text-green-600" />
                            لوحة السائق
                          </Link>
                          <Link
                            href="/driver/profile"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Settings className="w-4 h-4 text-gray-700" />
                            إعدادات السائق
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            href="/dashboard"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <LayoutDashboard className="w-4 h-4 text-blue-600" />
                            لوحة التحكم
                          </Link>
                          <Link
                            href="/dashboard/requests"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <FileText className="w-4 h-4 text-purple-600" />
                            طلباتي
                          </Link>
                          <Link
                            href="/dashboard/files"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <FolderOpen className="w-4 h-4 text-blue-600" />
                            ملفاتي
                          </Link>
                          <Link
                            href="/dashboard/profile"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Settings className="w-4 h-4 text-gray-700" />
                            تعديل المعلومات
                          </Link>
                        </>
                      )}
                      <div className="h-px bg-gray-200" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                        role="menuitem"
                      >
                        <LogOut className="w-4 h-4" />
                        تسجيل الخروج
                      </button>
                    </div>
                  )}
                </div>
                <NotificationsDropdown userId={user.id} />
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

