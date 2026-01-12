# إعداد متغيرات البيئة

## خطوات الإعداد:

1. أنشئ ملف `.env.local` في المجلد الرئيسي للمشروع

2. أضف المحتوى التالي:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://dcnywvixlcysalzfchye.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjbnl3dml4bGN5c2FsemZjaHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTgxMzAsImV4cCI6MjA4Mzc5NDEzMH0.IpOCivcWhnDwTTNVs7PcCVLP6x7W9FIc26Ue32-lqSA

# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBA7deUC6nBRAtMfMrjZvjOqRnAlrEeVy4
```

3. احفظ الملف

4. أعد تشغيل خادم التطوير:

```bash
npm run dev
```

## ملاحظات:

- ملف `.env.local` موجود في `.gitignore` ولن يتم رفعه إلى Git
- تأكد من إضافة مفتاح Google Maps API إذا كنت تريد استخدام الخريطة
- بعد إضافة المفاتيح، أعد تشغيل الخادم

