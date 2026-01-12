# 🔧 إصلاح خطأ "Email signups are disabled"

## المشكلة:
عند محاولة التسجيل، يظهر الخطأ: **"Email signups are disabled"**

## الحل السريع:

### 1. اذهب إلى Supabase Dashboard
```
https://supabase.com/dashboard/project/dcnywvixlcysalzfchye/auth/providers
```

### 2. في صفحة "Sign In / Providers"
- ابحث عن قسم **"Email"** أو **"Email Auth"**
- تأكد من أن **"Enable email signup"** مفعل (ON) ✅
- تأكد من أن **"Enable email confirmations"** معطل (OFF) ❌

### 3. المسار الكامل:
```
Supabase Dashboard
  └── Authentication (من القائمة الجانبية)
      └── CONFIGURATION
          └── Sign In / Providers  ← اضغط هنا
              └── Email Auth
                  ├── Enable email signup: ON ✅ (يجب أن يكون مفعل)
                  └── Enable email confirmations: OFF ❌ (يجب أن يكون معطل)
```

## الإعدادات المطلوبة:

| الإعداد | الحالة المطلوبة |
|---------|-----------------|
| **Enable email signup** | ✅ ON (مفعل) |
| **Enable email confirmations** | ❌ OFF (معطل) |

## ملاحظات مهمة:

1. **Enable email signup** يجب أن يكون **مفعل** لأننا نستخدم email وهمي (`phone_XXX@maidaa.local`)
2. **Enable email confirmations** يجب أن يكون **معطل** لأننا لا نريد التحقق من الإيميل
3. بعد تغيير الإعدادات، احفظ التغييرات
4. جرب التسجيل مرة أخرى

## اختبار:

بعد تفعيل Email signup وتعطيل email confirmations:
1. اذهب إلى `/auth/register`
2. أدخل الاسم ورقم الهاتف
3. يجب أن يعمل التسجيل بنجاح ✅

## رابط مباشر:
[افتح Supabase Auth Settings](https://supabase.com/dashboard/project/dcnywvixlcysalzfchye/auth/providers)

