# تحديث قاعدة البيانات

## الخطوة 1: إضافة حقل `departure_city`

اذهب إلى Supabase Dashboard:
```
https://supabase.com/dashboard/project/dcnywvixlcysalzfchye/editor
```

### الطريقة 1: من SQL Editor

1. اضغط على **SQL Editor** من القائمة الجانبية
2. انسخ والصق الكود التالي:

```sql
-- إضافة حقل departure_city
ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS departure_city TEXT;

-- جعل الحقول الاختيارية (إذا كانت مطلوبة)
ALTER TABLE visit_requests 
  ALTER COLUMN nationality DROP NOT NULL,
  ALTER COLUMN passport_number DROP NOT NULL,
  ALTER COLUMN passport_expiry DROP NOT NULL,
  ALTER COLUMN visit_type DROP NOT NULL,
  ALTER COLUMN travel_date DROP NOT NULL,
  ALTER COLUMN days_count DROP NOT NULL,
  ALTER COLUMN city DROP NOT NULL;
```

3. اضغط **Run** أو **Ctrl+Enter**

### الطريقة 2: من Table Editor

1. اذهب إلى **Table Editor**
2. اختر جدول `visit_requests`
3. اضغط على **Add Column**
4. أدخل:
   - **Name**: `departure_city`
   - **Type**: `text`
   - **Nullable**: ✅ (مفعل)
5. احفظ التغييرات

## ملاحظات:

- إذا ظهر خطأ "column already exists"، يعني أن الحقل موجود بالفعل
- إذا ظهر خطأ "cannot alter column", قد تحتاج إلى حذف البيانات أولاً أو تعديل الحقل يدوياً
- الكود الحالي يستخدم `city` كـ `departure_city` مؤقتاً حتى يتم إضافة الحقل الجديد

## بعد التحديث:

بعد إضافة الحقل، يمكنك تحديث الكود لاستخدام `departure_city` بدلاً من `city`.

