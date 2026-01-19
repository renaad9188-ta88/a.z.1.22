# إصلاح خطأ constraint trip_status

## المشكلة
عند محاولة حجز موعد الرحلة، يظهر الخطأ:
```
new row for relation "visit_requests" violates check constraint "visit_requests_trip_status_check"
```

## السبب
- constraint `trip_status` في قاعدة البيانات لا يسمح بالقيم المرسلة
- أو أن constraint لم يتم تحديثه بشكل صحيح بعد إضافة الحقول الجديدة

## الحل

### الخطوة 1: تنفيذ SQL Script للإصلاح
1. افتح Supabase Dashboard
2. اذهب إلى SQL Editor
3. نفّذ محتوى ملف `supabase/FIX_TRIP_STATUS_CONSTRAINT.sql`

هذا السكريبت:
- يحذف constraint القديم
- يحدّث القيم null إلى القيمة الافتراضية
- يضيف constraint جديد يسمح بـ null والقيم المطلوبة

### الخطوة 2: تنفيذ SQL Script المحدث
1. نفّذ محتوى ملف `supabase/ADD_TRIP_SCHEDULING_FIELDS.sql` (تم تحديثه)

هذا السكريبت الآن:
- يحذف constraint القديم أولاً
- يضيف الحقول الجديدة
- يحدّث القيم null
- يضيف constraint جديد صحيح

## القيم المسموحة لـ trip_status
- `pending_arrival`: في انتظار القدوم
- `scheduled_pending_approval`: حجز بانتظار الموافقة
- `arrived`: تم القدوم
- `completed`: انتهت الرحلة
- `null`: مسموح (سيتم تحديثه تلقائياً إلى 'pending_arrival')

## ملاحظات
- بعد تنفيذ SQL scripts، يجب أن يعمل النظام بشكل صحيح
- إذا استمرت المشكلة، تحقق من أن constraint تم حذفه وإضافته بشكل صحيح




