const { Client } = require('pg');
require('dotenv').config();

const MISSING = [
  'اسامہ', 'احمد جاوید', 'بابر (برائے اسرم کامران)', 'بابر پارک ٹاؤن',
  'پرویز سپلائی گاڑی', 'حافظ قاسم', 'رانا وسیم', 'رانا سہیل', 'رانا خیام',
  'رانا الیاس', 'رمضان کشادہ', 'سفیان سپلائی گاڑی', 'سلنڈر', 'سجاد (ڈرائیور)',
  'شہروز سپلائی گاڑی', 'شاہد مسح', 'شہاب گول بازار', 'شیخ عمر', 'شہباز ریاض',
  'عمر ندیم', 'عثمان', 'عدیل غوثیہ', 'عبد الشکور', 'عدنان احسان',
  'عثمان منڈیر بالاروڈ', 'عرفان یونس', 'عباد فرید', 'عثمان بھٹی',
  'عاصم حبیب پورہ', 'فرسٹ چکن شاپ', 'لقمان یوٹیلیٹی', 'متفرق اخراجات',
  'مسجد ھدایت', 'محرم', 'ملک اشتاق احمد', 'ملک غلام عباس', 'مهر صابر',
  'ملک عامر', 'محمد رضوان', 'نثار احمد', 'نوید مغل', 'نوید انصاری',
  'نعمان راحیل', 'ندیم مغل', 'نسیم عباس', 'وقاص', 'کچن خرچہ',
];

(async () => {
  const c = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || '4Head_db',
  });
  await c.connect();

  let found = 0;
  for (const name of MISSING) {
    const q = await c.query(
      `SELECT p.name, p.id, p.deleted_at IS NOT NULL AS soft_deleted,
              d.name AS primary_dept,
              (SELECT string_agg(dd.name, ',') FROM party_departments pd JOIN departments dd ON dd.id = pd.department_id WHERE pd.party_id = p.id) AS linked_depts
       FROM parties p
       LEFT JOIN departments d ON d.id = p.primary_department_id
       WHERE p.name = $1`,
      [name],
    );
    for (const r of q.rows) {
      found++;
      console.log(
        r.name + ' => id=' + (r.id || '') + ' softDeleted=' + r.soft_deleted +
        ' primary=' + (r.primary_dept || 'NULL') +
        ' linked=' + (r.linked_depts || 'NULL'),
      );
    }
  }
  console.log('TOTAL_ROWS_FOUND_FOR_MISSING_NAMES=' + found);
  await c.end();
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});