# إعداد صفحة الإدارة

## ملاحظة مهمة حول RLS (Row Level Security)

حالياً، سياسات RLS تمنع الإدارة من رؤية جميع الطلبات. يجب إضافة سياسات خاصة للإدارة في Supabase Dashboard.

## خطوات الإعداد السريعة

### الطريقة الموصى بها (خطوة بخطوة):

#### الخطوة 1: حذف السياسات القديمة
1. افتح ملف `supabase/DELETE_OLD_POLICIES.sql`
2. انسخ المحتوى والصقه في Supabase Dashboard > SQL Editor
3. اضغط Run

#### الخطوة 2: إضافة السياسات الجديدة
1. افتح ملف `supabase/ADD_NEW_POLICIES.sql`
2. انسخ المحتوى والصقه في Supabase Dashboard > SQL Editor
3. اضغط Run

#### الخطوة 3: تعيين مستخدم كإداري

**مهم جداً:** يجب استبدال `'معرف_المستخدم_هنا'` بمعرف المستخدم الفعلي!

1. احصل على معرف المستخدم:
   - اذهب إلى Supabase Dashboard
   - Authentication > Users
   - انقر على المستخدم
   - انسخ "User UID" (مثل: `123e4567-e89b-12d3-a456-426614174000`)

2. افتح ملف `supabase/SET_ADMIN_USER.sql`

3. استبدل `'معرف_المستخدم_هنا'` بالمعرف الذي نسخته

4. مثال:
   ```sql
   UPDATE profiles 
   SET role = 'admin' 
   WHERE user_id = '123e4567-e89b-12d3-a456-426614174000'::uuid;
   ```

5. انسخ والصق في SQL Editor

6. اضغط Run

**ملاحظة:** يمكنك أيضاً استخدام `supabase/SET_ADMIN_USER_EXAMPLE.sql` كمرجع

### أو استخدم ملف واحد شامل:

1. افتح ملف `supabase/migration_admin_step_by_step.sql`
2. استبدل `'USER_ID_HERE'` في الخطوة 5 بمعرف المستخدم
3. انسخ كل المحتوى والصقه في Supabase Dashboard > SQL Editor
4. اضغط Run

### الطريقة 2: إضافة الأوامر يدوياً

في Supabase Dashboard، اذهب إلى **SQL Editor** وقم بتنفيذ الاستعلام التالي:

```sql
-- إضافة سياسة للإدارة لعرض جميع الطلبات
CREATE POLICY "Admins can view all requests"
  ON visit_requests FOR SELECT
  USING (
    -- استبدل 'YOUR_ADMIN_USER_ID' بمعرف المستخدم الإداري
    auth.uid()::text = 'YOUR_ADMIN_USER_ID'
    -- أو يمكنك استخدام جدول roles للإدارة
    -- EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- إضافة سياسة للإدارة لتحديث جميع الطلبات
CREATE POLICY "Admins can update all requests"
  ON visit_requests FOR UPDATE
  USING (
    auth.uid()::text = 'YOUR_ADMIN_USER_ID'
  );

-- إضافة سياسة للإدارة لعرض جميع الملفات الشخصية
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid()::text = 'YOUR_ADMIN_USER_ID'
  );
```

### 2. إضافة جدول الأدوار (اختياري - للاستخدام المستقبلي)

إذا كنت تريد نظام أدوار أكثر مرونة:

```sql
-- إضافة عمود role إلى جدول profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- تحديث السياسات لاستخدام role
DROP POLICY IF EXISTS "Admins can view all requests" ON visit_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON visit_requests;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Admins can view all requests"
  ON visit_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all requests"
  ON visit_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
```

### 3. تعيين مستخدم كإداري

```sql
-- استبدل 'USER_ID_HERE' بمعرف المستخدم
UPDATE profiles SET role = 'admin' WHERE user_id = 'USER_ID_HERE';
```

## الميزات المتاحة في صفحة الإدارة

1. **عرض جميع الطلبات**: عرض جميع طلبات الزيارة مع تفاصيلها
2. **البحث والتصفية**: البحث بالاسم أو رقم الطلب، التصفية حسب الحالة أو النوع
3. **الإحصائيات**: عرض إحصائيات شاملة عن الطلبات
4. **تحديث الحالة**: تغيير حالة الطلب (قيد المراجعة، بانتظار الموافقة، مقبول، مرفوض)
5. **الرد على الطلبات**: إضافة رد يظهر للمستخدم في لوحة التحكم الخاصة به
6. **عرض التفاصيل**: عرض جميع تفاصيل الطلب بما في ذلك الصور والمعلومات

## كيفية الوصول

1. سجل الدخول كمسؤول
2. اذهب إلى `/admin`
3. ستظهر لك لوحة التحكم الكاملة

## ملفات SQL المتوفرة

### الملفات الموصى بها (خطوة بخطوة):
- `supabase/DELETE_OLD_POLICIES.sql` - حذف السياسات القديمة فقط
- `supabase/ADD_NEW_POLICIES.sql` - إضافة السياسات الجديدة فقط
- `supabase/SET_ADMIN_USER.sql` - تعيين مستخدم كإداري
- `supabase/migration_admin_step_by_step.sql` - ملف شامل (كل شيء في مكان واحد)

### ملفات أخرى:
- `supabase/migration_admin_policies_simple.sql` - الطريقة البسيطة (معرف مستخدم مباشر)
- `supabase/migration_admin_policies_clean.sql` - تنظيف وإعادة إعداد

## حل مشكلة "policy already exists"

إذا ظهرت رسالة خطأ تقول أن السياسة موجودة بالفعل:

1. استخدم ملف `migration_admin_policies_clean.sql` - يحذف السياسات القديمة أولاً
2. أو نفذ هذا الأمر يدوياً قبل إنشاء السياسات:
   ```sql
   DROP POLICY IF EXISTS "Admins can view all requests" ON visit_requests;
   DROP POLICY IF EXISTS "Admins can update all requests" ON visit_requests;
   DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
   ```

## كيفية الحصول على معرف المستخدم

1. اذهب إلى Supabase Dashboard
2. Authentication > Users
3. انسخ **User UID** من المستخدم الذي تريد تعيينه كإداري
4. استخدمه في ملف SQL

## ملاحظات الأمان

- تأكد من تحديث سياسات RLS بشكل صحيح
- لا تشارك رابط صفحة الإدارة مع غير المصرح لهم
- في الإنتاج، أضف نظام مصادقة أقوى للإدارة
- استخدم الطريقة 2 (نظام الأدوار) للإنتاج لأنه أكثر مرونة

