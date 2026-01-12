# دليل الإعداد السريع

## خطوات الإعداد

### 1. إنشاء مشروع Supabase

1. اذهب إلى [supabase.com](https://supabase.com)
2. أنشئ حساب جديد أو سجل الدخول
3. أنشئ مشروع جديد
4. احفظ:
   - Project URL
   - Anon/Public Key

### 2. إعداد قاعدة البيانات

1. في Supabase Dashboard، اذهب إلى **SQL Editor**
2. انسخ محتوى ملف `supabase/schema.sql`
3. الصق في SQL Editor واضغط **Run**
4. تأكد من نجاح تنفيذ جميع الجداول

### 3. إعداد Storage

1. في Supabase Dashboard، اذهب إلى **Storage**
2. أنشئ bucket جديد:
   - **Name:** `passports`
   - **Public:** `false` (خاص)
3. في **Policies**، تأكد من وجود السياسات التالية:
   - Users can upload their own passport images
   - Users can view their own passport images

### 4. الحصول على Google Maps API Key

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com)
2. أنشئ مشروع جديد أو اختر مشروع موجود
3. فعّل **Maps JavaScript API**
4. أنشئ API Key
5. قم بتقييد API Key (اختياري لكن موصى به)

### 5. إعداد متغيرات البيئة

أنشئ ملف `.env.local` في المجلد الرئيسي:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### 6. تثبيت المتطلبات

```bash
npm install
```

### 7. تشغيل المشروع

```bash
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000)

## اختبار النظام

### 1. إنشاء حساب جديد
- اذهب إلى `/auth/register`
- أنشئ حساب جديد
- تحقق من البريد الإلكتروني (في Supabase Dashboard > Authentication > Users)

### 2. إنشاء طلب زيارة
- سجل الدخول
- اذهب إلى `/request-visit`
- املأ النموذج وأرسل الطلب

### 3. التحقق من لوحة التحكم
- اذهب إلى `/dashboard`
- يجب أن ترى طلبك في القائمة

### 4. اختبار لوحة الإدارة
- اذهب إلى `/admin`
- يجب أن ترى جميع الطلبات
- جرب تعديل حالة طلب

## استكشاف الأخطاء

### مشكلة: لا يمكن رفع الصور
- تأكد من وجود bucket `passports` في Supabase Storage
- تحقق من سياسات Storage
- تأكد من أن المستخدم مسجل دخول

### مشكلة: لا تظهر الخريطة
- تحقق من Google Maps API Key
- تأكد من تفعيل Maps JavaScript API
- تحقق من console المتصفح للأخطاء

### مشكلة: خطأ في المصادقة
- تحقق من متغيرات البيئة
- تأكد من صحة Supabase URL و Anon Key
- تحقق من إعدادات Authentication في Supabase

## نصائح إضافية

1. **للإنتاج:** استخدم متغيرات بيئة آمنة
2. **للأمان:** قم بتقييد Google Maps API Key
3. **للأداء:** استخدم CDN للصور
4. **للنسخ الاحتياطي:** قم بعمل backup دوري لقاعدة البيانات

## الدعم

إذا واجهت أي مشاكل، راجع:
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Google Maps Documentation](https://developers.google.com/maps/documentation)

