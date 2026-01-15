-- ============================================
-- التحقق من البيانات الموجودة في قاعدة البيانات
-- ============================================

-- 1. عدد الطلبات الكلي
SELECT 'إجمالي الطلبات:' as info, COUNT(*) as count
FROM visit_requests;

-- 2. الطلبات حسب الحالة
SELECT 
  'الطلبات حسب الحالة:' as info,
  status as الحالة,
  COUNT(*) as العدد
FROM visit_requests
GROUP BY status
ORDER BY COUNT(*) DESC;

-- 3. الطلبات حسب النوع
SELECT 
  'الطلبات حسب النوع:' as info,
  visit_type as النوع,
  COUNT(*) as العدد
FROM visit_requests
GROUP BY visit_type
ORDER BY COUNT(*) DESC;

-- 4. آخر 5 طلبات
SELECT 
  'آخر 5 طلبات:' as info,
  id,
  visitor_name as الاسم,
  status as الحالة,
  visit_type as النوع,
  city as المدينة,
  created_at as تاريخ_الإنشاء
FROM visit_requests
ORDER BY created_at DESC
LIMIT 5;

-- 5. التحقق من وجود طلبات بحالة "under_review" ونوع "visit"
SELECT 
  'طلبات تطابق الفلاتر (under_review + visit):' as info,
  COUNT(*) as count
FROM visit_requests
WHERE status = 'under_review' AND visit_type = 'visit';



