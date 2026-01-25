// صور البنر - يمكنك استبدالها بصورك الخاصة
// ضع الصور في مجلد public/images/carousel/ واستخدم المسارات النسبية
// أو استخدم URLs للصور من الإنترنت

export const carouselImages = {
  // صورة البنر الرئيسي - الطريق الذهبي للنقل
  main: {
    // صورة حافلات VIP للنقل - يمكنك استبدالها بصورة حقيقية
    url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&h=600&fit=crop&q=80',
    // للصور المحلية: ضع الصورة في public/images/carousel/main-banner.jpg واستخدم:
    // url: '/images/carousel/main-banner.jpg'
    title: 'الطريق الذهبي للنقل',
    subtitle: 'خدمات نقل VIP متميزة',
    description: 'راحة وأمان في كل رحلة',
  },
  
  // صورة المعبر جابر / الحدود الأردنية السورية
  border: {
    // صورة حدود/معبر - يمكنك استبدالها بصورة حقيقية للمعبر جابر
    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=600&fit=crop&q=80',
    // للصور المحلية: ضع الصورة في public/images/carousel/border.jpg واستخدم:
    // url: '/images/carousel/border.jpg'
    title: 'المعبر جابر',
    subtitle: 'نقطة العبور الرئيسية',
    description: 'خدمات عبور سريعة وآمنة',
  },
  
  // صورة القادمون - مسافرين قادمين
  arrivals: {
    // صورة مسافرين قادمين/استقبال
    url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=600&fit=crop&q=80',
    // للصور المحلية: '/images/carousel/arrivals.jpg'
    title: 'القادمون',
    subtitle: 'خدمة استقبال مميزة',
    description: 'نرحب بكم بأفضل الخدمات',
  },
  
  // صورة المغادرون - مسافرين مغادرين
  departures: {
    // صورة مسافرين مغادرين/سفر
    url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&h=600&fit=crop&q=80',
    // للصور المحلية: '/images/carousel/departures.jpg'
    title: 'المغادرون',
    subtitle: 'خدمة سفر آمنة',
    description: 'نوفر لك رحلة مريحة وآمنة',
  },
  
  // صورة المسافرين - عائلات ومسافرين
  travelers: {
    // صورة عائلات/مسافرين
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=600&fit=crop&q=80',
    // للصور المحلية: '/images/carousel/travelers.jpg'
    title: 'المسافرون',
    subtitle: 'رحلة مميزة',
    description: 'نوفر لك جميع الخدمات',
  },
}

// صور بديلة للحدود الأردنية السورية (يمكنك استخدامها)
export const alternativeBorderImages = [
  'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=1200&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=600&fit=crop&q=80',
]

// صور بديلة للمسافرين
export const alternativeTravelerImages = [
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&h=600&fit=crop&q=80',
]

