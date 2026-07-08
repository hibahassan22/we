# TODO - تعديل إضافة/تعديل السائق وربط الـ API

- [ ] فهم المشكلة: مودال DriversPage حاليًا UI فقط بدون إرسال API وبدون جمع قيم فورم.
- [ ] تعديل `src/components/DriversPage.jsx`:
  - [ ] إضافة state لجمع قيم الفورم بدل `defaultValue` فقط.
  - [ ] ربط زر "إضافة سائق" و"حفظ التعديلات" بـ API:
    - [ ] إضافة: POST `https://drivo.elmoroj.com/api/drivers`
    - [ ] تعديل: PUT `https://drivo.elmoroj.com/api/driverstest/update/:id`
  - [ ] دعم رفع صورة الهوية اختياري عبر `FormData` (حتى لو مش موجود بالـ API).
  - [ ] بعد نجاح العملية: إعادة جلب قائمة السائقين من `https://drivo1.elmoroj.com/api/drivers` وتحديث الجدول.
  - [ ] إضافة loading/error بسيط داخل المودال.
- [ ] تشغيل المشروع (`npm run dev`) والتأكد من:
  - [ ] إضافة سائق فعلاً بتظهر في الجدول
  - [ ] تعديل سائق ينعكس في الجدول
