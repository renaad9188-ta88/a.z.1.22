# إعداد Supabase للمصادقة بدون Email

## المشكلة:
Supabase يرفض التسجيل برقم الهاتف فقط (خطأ 400 Bad Request)

## الحل:

### 1. تعطيل Email Confirmation في Supabase

1. اذهب إلى [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك
3. اذهب إلى **Settings** > **Authentication**
4. في قسم **Email Auth**:
   - **Enable email confirmations**: قم بإيقاف هذا الخيار (OFF)
   - احفظ التغييرات

### 2. إعدادات إضافية (اختياري)

في نفس الصفحة:
- **Enable email signup**: ON (مفعل)
- **Secure email change**: يمكن إيقافه مؤقتاً للتطوير

### 3. إعدادات RLS (Row Level Security)

تأكد من أن سياسات RLS صحيحة في جدول `profiles`:
- المستخدمون يمكنهم إنشاء profile خاص بهم
- المستخدمون يمكنهم قراءة profile خاص بهم فقط

### 4. اختبار التسجيل

بعد تعطيل email confirmation:
1. جرب التسجيل برقم هاتف جديد
2. يجب أن يعمل بدون الحاجة للتحقق من البريد

## ملاحظات:

- في بيئة الإنتاج، يمكنك تفعيل email confirmation مرة أخرى
- أو استخدام OTP (One Time Password) عبر SMS لاحقاً
- حالياً، النظام يستخدم رقم الهاتف كـ email مع كلمة مرور افتراضية

## استكشاف الأخطاء:

### خطأ 400 Bad Request:
- تأكد من تعطيل email confirmation
- تحقق من تنسيق رقم الهاتف
- تأكد من أن كلمة المرور 6 أحرف على الأقل

### خطأ "User already registered":
- النظام سيحاول تسجيل الدخول تلقائياً
- إذا فشل، تأكد من أن رقم الهاتف صحيح

