// صور البنر - يمكنك استبدالها بصورك الخاصة
// ضع الصور في مجلد public/images/carousel/ واستخدم المسارات النسبية
// أو استخدم URLs للصور من الإنترنت

export const carouselImages = {
  // 1. النقل البري - الطريق الذهبي (قافلة الحافلات)
  roadTransport: {
    url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&h=600&fit=crop&q=80',
    // صورة حافلات فاخرة على الطريق
    // للصور المحلية: '/images/carousel/road-transport.jpg'
    title: 'الطريق الذهبي للنقل',
    subtitle: 'قوافل حافلات منظمة وآمنة',
    description: 'حافلات VIP مريحة وآمنة مع أفضل الخدمات',
  },
  
  // 1.1. قافلة الحافلات - صورة إضافية رائعة
  busConvoy: {
    url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&h=600&fit=crop&q=80',
    // أو صورة محلية: '/images/carousel/bus-convoy.jpg'
    title: 'قافلة الحافلات الذهبية',
    subtitle: 'نقل جماعي منظم وآمن',
    description: 'رحلات منظمة بقوافل حافلات مريحة وآمنة',
  },
  
  // 2. النقل الجوي
  airTransport: {
    url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&h=600&fit=crop&q=80',
    // للصور المحلية: '/images/carousel/air-transport.jpg'
    title: 'نقل جوي سريع وآمن',
    subtitle: 'رحلات جوية مريحة ومضمونة',
    description: 'أسرع وأسهل طريقة للوصول إلى وجهتك بأمان تام',
  },
  
  // 3. المعابر والحدود
  borderCrossing: {
    url: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=1200&h=600&fit=crop&q=80',
    // صورة معبر حدودي حديث مع حافلة - بدون أعلام
    // للصور المحلية: '/images/carousel/border-crossing.jpg'
    title: 'معبر جابر',
    subtitle: 'عبور سريع وآمن للحدود',
    description: 'تسهيلات عبور الحدود مع متابعة مستمرة ودعم كامل',
  },
  
  // 4. الفيزا والتأشيرات
  visaServices: {
    url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&h=600&fit=crop&q=80',
    // للصور المحلية: '/images/carousel/visa-services.jpg'
    title: 'خدمات الفيزا والتأشيرات',
    subtitle: 'إجراءات سريعة ومضمونة',
    description: 'نساعدك في الحصول على التأشيرات بكل سهولة وضمان',
  },
  
  // 5. الزيارات السورية (شهر) - قافلة الحافلات
  syrianVisits: {
    url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&h=600&fit=crop&q=80',
    // صورة قافلة حافلات بيضاء على طريق سريع
    // للصور المحلية: '/images/carousel/syrian-visits.jpg'
    title: 'زيارات سورية لمدة شهر',
    subtitle: 'خدمات منظمة ومتكاملة',
    description: 'نظم زيارتك العائلية بكل تفاصيلها مع متابعة مستمرة',
  },
  
  // 6. خدمات شاملة
  comprehensiveServices: {
    url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&h=600&fit=crop&q=80',
    // صورة قافلة حافلات بدلاً من صورة الأشخاص
    // للصور المحلية: '/images/carousel/comprehensive-services.jpg'
    title: 'خدمات شاملة ومتكاملة',
    subtitle: 'نوفر لك كل ما تحتاجه',
    description: 'من التنظيم إلى المتابعة - كل شيء في مكان واحد',
  },
  
  // للتوافق مع الكود القديم
  main: {
    url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&h=600&fit=crop&q=80',
    title: 'الطريق الذهبي للنقل',
    subtitle: 'نقل بري فاخر برفاهية عالية',
    description: 'حافلات VIP مريحة وآمنة مع أفضل الخدمات',
  },
  
  border: {
    url: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=1200&h=600&fit=crop&q=80',
    // صورة معبر حدودي عام بدون أعلام
    title: 'معبر جابر',
    subtitle: 'عبور سريع وآمن للحدود',
    description: 'تسهيلات عبور الحدود مع متابعة مستمرة ودعم كامل',
  },
  
  arrivals: {
    url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&h=600&fit=crop&q=80',
    // صورة قافلة حافلات بدلاً من صورة الأشخاص
    title: 'تتبع رحلتك أولاً بأول',
    subtitle: 'متابعة لحظية',
    description: 'راقب رحلتك على الخريطة مباشرة',
  },
  
  departures: {
    url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&h=600&fit=crop&q=80',
    title: 'رحلة آمنة ومريحة',
    subtitle: 'خدمات نقل متميزة',
    description: 'نوفر لك رحلة مريحة وآمنة',
  },
  
  travelers: {
    url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&h=600&fit=crop&q=80',
    // صورة قافلة حافلات بدلاً من صورة الأشخاص
    title: 'خدمات شاملة ومتكاملة',
    subtitle: 'نوفر لك كل ما تحتاجه',
    description: 'من التنظيم إلى المتابعة - كل شيء في مكان واحد',
  },
}

// صور بديلة للحدود الأردنية السورية (يمكنك استخدامها)
export const alternativeBorderImages = [
  'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=1200&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=600&fit=crop&q=80',
]

// صور بديلة للمسافرين - قافلة الحافلات
export const alternativeTravelerImages = [
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&h=600&fit=crop&q=80',
]

