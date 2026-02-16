-- إضافة دعم الصور لمحطات التوقف والانطلاق والبداية والنهاية
-- الصور اختيارية وتظهر للمستخدمين فقط

-- إضافة حقل image_url لمحطات التوقف
ALTER TABLE public.route_stop_points
ADD COLUMN IF NOT EXISTS image_url text;

-- إضافة حقل image_url لخطوط الرحلات (للبداية والنهاية)
ALTER TABLE public.routes
ADD COLUMN IF NOT EXISTS start_image_url text,
ADD COLUMN IF NOT EXISTS end_image_url text;

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_route_stop_points_image ON public.route_stop_points(image_url) WHERE image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_routes_start_image ON public.routes(start_image_url) WHERE start_image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_routes_end_image ON public.routes(end_image_url) WHERE end_image_url IS NOT NULL;

