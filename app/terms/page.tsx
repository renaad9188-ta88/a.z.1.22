import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-4xl font-bold text-center mb-8">الشروط والأحكام</h1>

        <div className="space-y-8 text-gray-700">
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">شروط التقديم</h2>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>يجب أن يكون جميع المعلومات المقدمة صحيحة ودقيقة</li>
              <li>يجب أن يكون الجواز ساري المفعول لمدة لا تقل عن 6 أشهر من تاريخ السفر</li>
              <li>يجب رفع صورة واضحة من الجواز</li>
              <li>جميع المرافقين يجب أن يكون لديهم جوازات سارية المفعول</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">مسؤوليات الزائر</h2>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>الزائر مسؤول عن التأكد من صحة جميع المعلومات المقدمة</li>
              <li>الزائر مسؤول عن دفع جميع الرسوم المطلوبة في الوقت المحدد</li>
              <li>الزائر مسؤول عن الالتزام بجميع القوانين واللوائح المحلية</li>
              <li>الزائر مسؤول عن الحفاظ على جميع الوثائق والمستندات المطلوبة</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">سياسة الاسترجاع</h2>
            <div className="space-y-4">
              <p>
                يمكن إلغاء الحجز قبل السفر بيوم.
              </p>
              <p>
                لا يتم استرداد الرسوم المدفوعة في حال رفض الطلب من قبل الجهات الرسمية.
              </p>
              <p>
                المراجعة المستمرة مع هواتف الاتصال إذا أردت المساعدة والسؤال قبل الحجز.
              </p>
              <p>
                لا تدفع المبلغ التالي إلا بعد الموافقة على الطلب.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">الخصوصية</h2>
            <div className="space-y-4">
              <p>
                نحن ملتزمون بحماية خصوصية معلوماتك الشخصية. جميع البيانات المقدمة يتم تخزينها بشكل آمن ومشفرة.
              </p>
              <p>
                لن نقوم بمشاركة معلوماتك الشخصية مع أي طرف ثالث دون موافقتك الصريحة، إلا في الحالات المطلوبة قانونياً.
              </p>
              <p>
                نحن نستخدم معلوماتك فقط لتقديم الخدمات المطلوبة وتحسين تجربتك معنا.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">التحديثات</h2>
            <p>
              نحتفظ بالحق في تحديث هذه الشروط والأحكام في أي وقت. سيتم إشعارك بأي تغييرات جوهرية.
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            العودة للصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  )
}

