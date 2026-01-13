# خطوات إنشاء المستخدم الإداري tamer88@gmail.com

## الخطوات:

### الخطوة 1: إنشاء المستخدم في Supabase Dashboard

1. اذهب إلى **Supabase Dashboard**
2. **Authentication** > **Users**
3. اضغط **"Add user"** > **"Create new user"**
4. املأ البيانات:
   - **Email**: `tamer88@gmail.com`
   - **Password**: `123456123`
   - **User Metadata** (JSON):
     ```json
     {
       "full_name": "tamer88",
       "phone": "tamer88"
     }
     ```
5. اضغط **"Create user"**
6. انسخ **User UID** الذي سيظهر

### الخطوة 2: تعيينه كإداري

1. اذهب إلى **SQL Editor**
2. افتح ملف `supabase/CREATE_ADMIN_tamer88_gmail.sql`
3. نفذ الأوامر في الملف
4. يجب أن يعمل تلقائياً (سيبحث عن المستخدم بالإيميل)

### الخطوة 3: التحقق من النجاح

بعد التنفيذ، نفذ أمر التحقق في نهاية الملف للتأكد من أن:
- المستخدم موجود
- `role = 'admin'`

### الخطوة 4: تسجيل الدخول

1. اذهب إلى `/auth/login`
2. اختر **"إيميل (إداري)"**
3. أدخل:
   - **الإيميل**: `tamer88@gmail.com`
   - **كلمة المرور**: `123456123`
4. اضغط **"تسجيل الدخول"**
5. سيتم توجيهك تلقائياً إلى `/admin`

## ملاحظات:

- إذا فشل الأمر، تأكد من أن المستخدم موجود في `auth.users`
- يمكنك التحقق من ذلك باستخدام:
  ```sql
  SELECT id, email FROM auth.users WHERE email = 'tamer88@gmail.com';
  ```


