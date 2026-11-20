# هنا راحتي (Honara7ty)

تطبيق خلوة يومية مع الله — النسخة الحالية مبنية بـ **Flutter**.

## هيكل المستودع

| المسار | الوصف |
|---|---|
| `flutter_app/` | تطبيق الموبايل (Flutter) |
| `admin-dashboard/` | لوحة التحكم (Next.js) |
| `supabase/` | migrations و سياسات قاعدة البيانات |
| `scripts/` | سكربتات مساعدة (مثل نشر الـ admin) |

## تشغيل تطبيق Flutter

```sh
cd flutter_app
flutter pub get
flutter run
```

## Admin dashboard

```sh
cd admin-dashboard
npm install
npm run dev
```

## Supabase

ملفات الـ schema والسياسات موجودة في `supabase/`.
اضبط مفاتيح المشروع في إعدادات تطبيق Flutter قبل التشغيل.
