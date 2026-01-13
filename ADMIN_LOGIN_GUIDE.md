# دليل تسجيل الدخول كإداري

## المشكلة
عند محاولة تسجيل الدخول بالإيميل `phone_tamer88@maidaa.local`، تظهر رسالة "الإيميل أو كلمة المرور غير صحيحة".

## الحلول

### الحل 1: إعادة تعيين كلمة المرور من Supabase Dashboard

1. اذهب إلى **Supabase Dashboard**
2. **Authentication** > **Users**
3. ابحث عن المستخدم `phone_tamer88@maidaa.local`
4. انقر على المستخدم
5. اضغط **"..."** (القائمة) > **"Reset Password"** أو **"Send Password Reset Email"**
6. أو اضغط **"Update"** وغيّر كلمة المرور مباشرة

### الحل 2: التحقق من كلمة المرور الحالية

إذا كنت تعرف كلمة المرور التي استخدمتها عند إنشاء المستخدم في Supabase Dashboard، استخدمها.

**ملاحظة:** كلمة المرور الافتراضية في الكود هي `123456`، لكن إذا أنشأت المستخدم من Supabase Dashboard، قد تكون كلمة المرور مختلفة.

### الحل 3: إنشاء مستخدم جديد بكلمة مرور معروفة

إذا لم تعرف كلمة المرور، يمكنك حذف المستخدم القديم وإنشاء واحد جديد:

#### في Supabase Dashboard:
1. **Authentication** > **Users**
2. ابحث عن `phone_tamer88@maidaa.local`
3. انقر على المستخدم
4. اضغط **"Delete User"** (احذف المستخدم)
5. ثم أنشئ مستخدم جديد:
   - **Add User** > **Create new user**
   - **Email**: `phone_tamer88@maidaa.local`
   - **Password**: `123456` (أو أي كلمة مرور تريدها)
   - **User Metadata**:
     ```json
     {
       "full_name": "tamer88",
       "phone": "tamer88"
     }
     ```
6. بعد الإنشاء، نفذ هذا الأمر في SQL Editor:
   ```sql
   -- إضافة profile وتعيينه كإداري
   INSERT INTO profiles (user_id, full_name, phone, role)
   SELECT id, 'tamer88', 'tamer88', 'admin'
   FROM auth.users
   WHERE email = 'phone_tamer88@maidaa.local'
   ON CONFLICT DO NOTHING;
   
   -- أو تحديث إذا كان موجود
   UPDATE profiles 
   SET role = 'admin'
   WHERE user_id IN (
     SELECT id FROM auth.users WHERE email = 'phone_tamer88@maidaa.local'
   );
   ```

### الحل 4: استخدام رقم الهاتف بدلاً من الإيميل

يمكنك أيضاً تسجيل الدخول برقم الهاتف:
1. اختر **"رقم الهاتف"** في صفحة تسجيل الدخول
2. أدخل: `tamer88`
3. كلمة المرور: `123456`

## معلومات تسجيل الدخول

### للإداريين (تسجيل دخول بالإيميل):
- **الإيميل**: `phone_tamer88@maidaa.local`
- **كلمة المرور**: (الكلمة التي اخترتها في Supabase Dashboard)

### للمستخدمين العاديين (تسجيل دخول برقم الهاتف):
- **رقم الهاتف**: (رقم الهاتف المسجل)
- **كلمة المرور**: `123456` (افتراضية)

## بعد تسجيل الدخول

- إذا كنت إدارياً (`role = 'admin'`)، سيتم توجيهك إلى `/admin`
- إذا كنت مستخدماً عادياً، سيتم توجيهك إلى `/dashboard`

## نصائح

1. **احفظ كلمة المرور**: بعد إنشاء المستخدم في Supabase Dashboard، احفظ كلمة المرور في مكان آمن
2. **استخدم كلمة مرور قوية**: في الإنتاج، استخدم كلمة مرور قوية
3. **إعادة تعيين كلمة المرور**: يمكنك دائماً إعادة تعيين كلمة المرور من Supabase Dashboard


