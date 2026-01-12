# إصلاح سريع لمشكلة Supabase

## المشكلة:
خطأ: "Your project's URL and Key are required to create a Supabase client!"

## الحل:

### 1. تأكد من وجود ملف `.env.local`

أنشئ ملف `.env.local` في المجلد الرئيسي للمشروع (نفس مستوى `package.json`)

### 2. أضف المحتوى التالي:

```env
NEXT_PUBLIC_SUPABASE_URL=https://dcnywvixlcysalzfchye.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjbnl3dml4bGN5c2FsemZjaHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTgxMzAsImV4cCI6MjA4Mzc5NDEzMH0.IpOCivcWhnDwTTNVs7PcCVLP6x7W9FIc26Ue32-lqSA
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBA7deUC6nBRAtMfMrjZvjOqRnAlrEeVy4
```

### 3. أعد تشغيل الخادم

**مهم جداً**: يجب إعادة تشغيل الخادم بعد إضافة/تعديل ملف `.env.local`

```bash
# أوقف الخادم (Ctrl+C)
# ثم شغله مرة أخرى
npm run dev
```

### 4. تحقق من الملف

تأكد من:
- ✅ الملف موجود في المجلد الرئيسي
- ✅ اسم الملف صحيح: `.env.local` (مع النقطة في البداية)
- ✅ لا توجد مسافات إضافية
- ✅ كل سطر يحتوي على متغير واحد فقط

### 5. إذا استمرت المشكلة

1. تأكد من أن الملف ليس `.env.local.txt`
2. احذف مجلد `.next` وأعد البناء:
   ```bash
   rm -rf .next
   npm run dev
   ```
3. تحقق من أن المتغيرات موجودة في console المتصفح (F12)

## ملاحظات:

- ملف `.env.local` موجود في `.gitignore` ولن يتم رفعه إلى Git
- بعد أي تعديل على `.env.local` يجب إعادة تشغيل الخادم
- المتغيرات التي تبدأ بـ `NEXT_PUBLIC_` متاحة في المتصفح

