# الوصول إلى لوحة الإدارة مباشرة

## المشكلة
إذا لم تكن مسجلاً كـ tamer88، يمكنك الوصول إلى الإدارة بطريقة مباشرة.

## الحلول المتاحة

### الحل 1: إنشاء مستخدم إداري مباشرة في Supabase Dashboard (موصى به)

#### الخطوة 1: إنشاء المستخدم
1. اذهب إلى **Supabase Dashboard**
2. **Authentication** > **Users**
3. اضغط **Add User** > **Create new user**
4. املأ البيانات:
   - **Email**: `phone_tamer88@maidaa.local`
   - **Password**: (اختر كلمة مرور قوية)
   - **User Metadata** (JSON):
     ```json
     {
       "full_name": "tamer88",
       "phone": "963XXXXXXXXX"
     }
     ```
5. اضغط **Create user**
6. انسخ **User UID** الذي سيظهر

#### الخطوة 2: تعيينه كإداري
1. اذهب إلى **SQL Editor**
2. افتح ملف `supabase/CREATE_ADMIN_USER_DIRECT.sql`
3. استبدل `'USER_ID_FROM_AUTH_USERS'` بالـ User UID الذي نسخته
4. نفذ الأوامر

### الحل 2: استخدام مستخدم موجود

إذا كان لديك حساب آخر مسجل:

1. سجل الدخول بهذا الحساب
2. اذهب إلى `/admin`
3. إذا لم تعمل، نفذ هذا الأمر في SQL Editor:
   ```sql
   -- استبدل 'USER_ID_HERE' بمعرف المستخدم
   UPDATE profiles 
   SET role = 'admin' 
   WHERE user_id = 'USER_ID_HERE'::uuid;
   ```

### الحل 3: تعطيل RLS مؤقتاً (للتطوير فقط)

⚠️ **تحذير**: هذا الحل للتطوير فقط، لا تستخدمه في الإنتاج!

```sql
-- تعطيل RLS مؤقتاً (للتطوير فقط)
ALTER TABLE visit_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- بعد الانتهاء، قم بإعادة تفعيل RLS:
-- ALTER TABLE visit_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### الحل 4: استخدام Service Role Key (للتطوير فقط)

⚠️ **تحذير**: هذا للتطوير فقط!

يمكنك استخدام Service Role Key في `.env.local` للوصول المباشر:

```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

ثم تعديل `lib/supabase-server.ts` لاستخدام Service Role Key للإدارة.

## الطريقة الموصى بها

**استخدم الحل 1** - إنشاء مستخدم إداري مباشرة في Supabase Dashboard، ثم تعيينه كإداري باستخدام SQL.

## بعد التعيين

1. سجل الدخول في الموقع باستخدام:
   - **Phone**: `tamer88` (أو الرقم الذي أدخلته)
   - **Password**: (كلمة المرور التي اخترتها)
2. اذهب إلى `/admin`
3. يجب أن تعمل لوحة الإدارة الآن!





