# إصلاح إشعارات الإدمن - دليل شامل

## المشكلة
الإدمن لا يستقبل إشعارات عند تقديم طلبات جديدة أو طلبات حجز موعد.

## الحل

### الخطوة 1: إنشاء دالة RPC في Supabase

قم بتنفيذ الملف التالي في Supabase SQL Editor:

```sql
-- ملف: supabase/CREATE_GET_ALL_ADMINS_FUNCTION.sql
```

هذه الدالة تعمل كـ `SECURITY DEFINER` لتجاوز RLS والحصول على جميع الإدمن.

### الخطوة 2: التحقق من أن المستخدم إدمن

تأكد من أن المستخدم لديه `role = 'admin'` في جدول `profiles`:

```sql
-- التحقق من الإدمن الحاليين
SELECT user_id, full_name, role 
FROM profiles 
WHERE role = 'admin';

-- إذا لم يكن هناك إدمن، قم بإضافة واحد
UPDATE profiles 
SET role = 'admin' 
WHERE user_id = 'YOUR_USER_ID_HERE'::uuid;
```

### الخطوة 3: التحقق من RLS Policies

تأكد من أن RLS Policies تسمح بقراءة profiles:

```sql
-- التحقق من policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### الخطوة 4: اختبار الإشعارات

1. افتح Console في المتصفح (F12)
2. قدّم طلب جديد من حساب مستخدم عادي
3. راقب Console - يجب أن ترى:
   - `🔍 [GET ADMINS] Starting to fetch admin users...`
   - `✅ [GET ADMINS] Found X admin(s) via RPC function`
   - `🔔 [NOTIFICATION] Creating notification for admin: ...`
   - `✅ [NOTIFICATION] Notification created for admin ...`

### الخطوة 5: التحقق من الإشعارات في قاعدة البيانات

```sql
-- عرض جميع الإشعارات
SELECT * FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- عرض إشعارات إدمن معين
SELECT * FROM notifications 
WHERE user_id = 'YOUR_ADMIN_USER_ID'::uuid
ORDER BY created_at DESC;
```

## استكشاف الأخطاء

### المشكلة: "No admins found"
**الحل:**
1. تأكد من أن المستخدم لديه `role = 'admin'` في profiles
2. تأكد من تنفيذ دالة `get_all_admins()`

### المشكلة: "RPC function not available"
**الحل:**
1. قم بتنفيذ `supabase/CREATE_GET_ALL_ADMINS_FUNCTION.sql`
2. تأكد من أن الدالة موجودة:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'get_all_admins';
   ```

### المشكلة: "Error creating notification"
**الحل:**
1. تأكد من أن جدول `notifications` موجود
2. تأكد من تنفيذ `supabase/CREATE_NOTIFICATIONS_TABLE.sql`
3. تحقق من RLS Policies للجدول

## ملاحظات مهمة

- الدالة `get_all_admins()` تعمل كـ `SECURITY DEFINER` لتجاوز RLS
- إذا فشلت RPC function، سيتم استخدام query مباشر
- جميع الأخطاء يتم تسجيلها في console للمساعدة في التشخيص



