-- (اختياري) السماح للمستخدم بحذف طلباته ضمن حالات محددة
-- نفّذ هذا السكربت في Supabase SQL Editor إذا واجهت خطأ RLS عند الحذف

ALTER TABLE public.visit_requests ENABLE ROW LEVEL SECURITY;

-- حذف السياسة إذا كانت موجودة بنفس الاسم
DROP POLICY IF EXISTS "Users can delete eligible own requests" ON public.visit_requests;

-- السماح بالحذف للطلبات المنتهية/المرفوضة (ويمكن إضافة draft لاحقاً)
CREATE POLICY "Users can delete eligible own requests"
ON public.visit_requests
FOR DELETE
USING (
  auth.uid() = user_id
  AND (
    status IN ('rejected', 'completed')
    OR trip_status = 'completed'
  )
);



