import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-4xl font-bold text-center mb-8">سياسة الخصوصية</h1>

        <div className="space-y-8 text-gray-700">
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">مقدمة</h2>
            <p>
              نحن في سوريا بلس (Syria Plus) خدمات ملتزمون بحماية خصوصية معلوماتك الشخصية. هذه السياسة توضح كيفية جمع واستخدام وحماية معلوماتك عند استخدام خدماتنا.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">المعلومات التي نجمعها</h2>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>الاسم الكامل وبيانات الاتصال</li>
              <li>معلومات الجواز والوثائق</li>
              <li>معلومات الرحلة والحجز</li>
              <li>معلومات الدفع (مشفرة)</li>
              <li>معلومات الاستخدام والتفضيلات</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">كيف نستخدم معلوماتك</h2>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>معالجة طلباتك وإتمام الحجوزات</li>
              <li>التواصل معك بخصوص طلباتك</li>
              <li>تحسين خدماتنا وتجربتك</li>
              <li>الامتثال للقوانين واللوائح</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">حماية معلوماتك</h2>
            <p>
              نستخدم تقنيات أمان متقدمة لحماية معلوماتك من الوصول غير المصرح به أو التغيير أو الكشف أو التدمير. 
              جميع البيانات يتم تشفيرها وتخزينها بشكل آمن.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">مشاركة المعلومات</h2>
            <p>
              لن نقوم بمشاركة معلوماتك الشخصية مع أي طرف ثالث دون موافقتك الصريحة، 
              إلا في الحالات المطلوبة قانونياً أو لتقديم الخدمات المطلوبة.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">حقوقك</h2>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>الحق في الوصول إلى معلوماتك الشخصية</li>
              <li>الحق في تصحيح المعلومات غير الدقيقة</li>
              <li>الحق في حذف معلوماتك الشخصية</li>
              <li>الحق في الاعتراض على معالجة معلوماتك</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">التحديثات</h2>
            <p>
              قد نقوم بتحديث هذه السياسة من وقت لآخر. سيتم إشعارك بأي تغييرات جوهرية عبر البريد الإلكتروني أو عبر المنصة.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">اتصل بنا</h2>
            <p>
              إذا كان لديك أي أسئلة حول سياسة الخصوصية، يرجى التواصل معنا على:
            </p>
            <ul className="list-none space-y-2 mt-4">
              <li>الهاتف: 0798905595</li>
            </ul>
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

