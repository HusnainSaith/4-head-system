import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { PartyTypeEnum } from '../../common/types/party-type.enum';
import { Department } from '../../modules/departments/entities/department.entity';
import { LedgerEntry } from '../../modules/ledger/entities/ledger-entry.entity';
import { Party } from '../../modules/parties/entities/party.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { User } from '../../modules/users/entities/user.entity';

// Negative = receivable from shop owner. Positive = payable to shop owner.
// Ambiguous source groupings were normalized as Pakistani/Indian digit grouping:
// 10,13,100=1,013,100; 12,36,535=1,236,535; 46,11.5=46,111.50;
// 3,1011=31,011; 53,1165=531,165; 16,05,646=1,605,646;
// 12,47,205=1,247,205; 9,1601=91,601. "Nill" is zero.
const RAW = `
شکیل|-42256
رانا عارف|-1837
رانا سہیل|69274
رمضان جانی|-22021
نوار مغل|724
علی مہر درجی شاہ|82685
رانا عبدالجبار دہی چپ|-454326
رئیس گوجرانوالہ|-421261
شہاب گوجرانوالہ|-1013100
محسن گنزد اسماعیل سکول|-1104
محمد رفیق (عبداللہ روڈ)|7073
رانا عمر گلشن چوک|-48456
رانا مختار پرچی سٹاپ|-18695
فیاض سلامت پورہ|-66700
نگران علی امام بارگاہ|87920
شاہ زیب|21777
کاشی|-121004
ملک صادق|-18441
عثمان امام بارگاہ|-339670
رانا زبیر ہرڑ روڈ|134223
رانا وسیم|-177403
ریاضی (گھان ٹاؤن)|43784
نثار|-50748
شہزاد انڈیا منگا|195043
مظہر اقبال گنجرو چوک|23788
شبیر حربی|-1236535
خورشید شریف پورہ|180977
وارث شریف پورہ|-15475
نصیر شریف پورہ|-43846
ندیم درویش پورہ|42346
لطیف|-87623
نوید انصاری|93445
وسیم دھوپ سڑی|-10830
راشد بلا|-57904
فیصل بھٹی|-104275
نعمان راحیل|46111.5
سلیم امین چاندنی چوک|18007
شبیر حسین لوری|8694
طیب|14463
فیصل رضا|213355
علی رضا غوثیہ چوک|476538
عابد حبیب پورہ|81563
غلام قادر|-38748
ملک غلام عباس|144416
سفیان ماڑی روڈ|33167
عديل غوثیہ|149617
شہزاد چوک غوثیہ|6183
محرم|-31011
جمر عباس|-3729
نوید مغل|103317
عبد الشکور|229495
علی چھتی گلی|148851
سخاوت|-11514
راشد سلیم|5512
عاصم حبیب پورہ|20459
واجد بھٹی|174684
وحید دھوپ سڑی|-137577
راشد رحمانی|-38078
عامر بھٹی|-25304
عباد فرید|63046
عثمان بھٹی|-42336
ارسلان درویش پورہ|-60402
خرم شہزاد|-189638
عمر ندیم|291283
احتشام اللہ|194870
حسن گوجرانوالہ|-531165
اویس علی (اسماعیل سکول)|59347
فاروق ٹبہ|-273459
اسلم بھٹی|-3180
عبد الغفور|5284
رانا ضیام|26969
ملک پرویز ٹبہ|22542
اویس کوٹ رفیق|-15307
عمران سوکی روڈ|4053
مالک حسین|-77357
علی رضا غلام مصطفیٰ ٹبہ|52991
ابو بکر پاک ٹاؤن|-27461
فیصل غوثیہ چوک|48604
ایاز (عبداللہ روڈ)|8262
حسن سوکی|-18941
اعظم تولی کی روڈ|-5029
سلیم دھوپڑی بازار|-2949
ملک عامر|82616
رمضان شاہ|-5364
بہادر سوکی|24914
ثقلین سوکی|407
میاں افتخار ڈیرے والا|-92
شمس عالمگیر روڈ|4160
آفتاب سوکی روڈ|-2190
سبحان عباس پٹھو|8865
فیاض گھنیا روڈ|122
رانا حمزہ|14210
رحمان خانپور|44819
ذیشان شانتی|18639
رحمن علی|-242761
میاں طلحہ|-128128
علی انور سوکی روڈ|1798
ثقلین ملتان 2|45298
عبد المبین (تلی/دانی)|-7596
شیخ عمر|54356
صفدر حبیب پورہ|-38610
ملک مقصود ٹبہ|6840
وارث ٹبہ|41528
غلام مصطفیٰ دھوپ سڑی|16103
شہزاد مہر ٹبہ|-26533
رانا ارحم|48213
لقمان تولی کی السوکی|-24467
بٹ مکھن|5438
عبداللہ|-523
ندیم مغل|24889
شفیق طبی ٹبہ|-4724
مظہر (حافظ زمان)|-8000
صداقت شاہ|446
طیب ٹبہ|-3222
لالا اشرف ٹبہ|16685
نصیر پاک ٹاؤن شہباز بھٹی|13243
امریز عرف جانا|-10353
حامد رضوی|-86640
رانا شکیل (دیورچی سٹاپ)|-51913
ذوالفقار (النور)|412205
شہباز ریاض|-93480
افضل انصاری عالمگیر روڈ|8692
علی شیر گنجرو چوک|-25915
وقاص غوثیہ چوک|-133512
میاں زاہد|-9204
بابا اختر مچھلی والا|4722
افضل رحمانی|6400
عمران مچھلی والا|1558
عديل سوکی 2|-108566
عمران منڈ یالہ روڈ|-10830
فقیر حسین مچھلی|-7432
احسان ٹبہ|17904
چاند علی مچھلی والا|-2840
حافظ عثمان|4860
قریش چکن|3856988
ملک اسد|-158826
واجد شاہ|-322681
ثقلین قلندر (چاند شاہ)|150800
گلفام سوکی روڈ|30112
رانا رضوان|6168
عديل سوکی روڈ|-16347
رانا احسان|-155726
شہزاد خلیجی|-175493
حاجی زاہد مغل 7 بھورونگی|-832775
طلحہ (چاند شاہ)|116537
رانا نبیل|-36983
شہباز شیش محل|8862
اشرف عبداللہ روڈ|17300
احمد جاوید|8475
علی (احمد) قریش چکن|60763
رانا عمران|6029
محمد رضوان سندھو|9038
سلیم رفیق کوٹ|-56953
انور ابراہیم|2182
انور (برف والا)|-10766
ذوالفقار بھٹو (رفیق کوٹ)|-112429
حافظ زمان رانا|-655
ملک مقبول|7101
علی حمزہ منڈاکین|-28567
رامین ہرڑ روڈ (سلیم)|-400000
ملک حسیب 2|-40000
ادریس منڈیالہ روڈ|-4988
شان علی|7599
اکبر انصاری|-239010
شاہد مغل|-227194
ثقلین حبیب پورہ|20851
خضر (چاندنی چوک)|-46782
بلال امام بارگاہ|-260170
غلام نبی منڈیالہ روڈ|-34175
بابر فیصل ٹاؤن|10362
بابر شاہ ٹبہ|-38866
امجد بھٹی|309874
چوہدری فراست|-98850
سیٹھ زمان (مانگٹ)|19006
بابا امین (سلیم)|0
اعجاز احمد باؤ|-19236
ریاضی ٹبہ|48863
بابر پاک ٹاؤن|3784
انیس احمد|311160
حسن رضا|6184
امام دین|-1737
حافظ قاسم|636282
بشارت (دھوپ سڑی)|-6850
آصف مانگٹ|407161
سلیم ٹبہ|-39238
شیخ خالد|207757
اشفاق انڈسٹری|1605646
چاند شاہ ٹبہ|-171654
جاوید ٹبہ|151239
جمیل گوبازار|5447
حافظ زاہد دوکان صابر والی|-76087
محمد واحد شریف پورہ|-1247205
حفیظ بٹ|140814
خاور ہاشمی|-177303
میاں اعجاز|-23324
علی شاہ ٹبہ|-22743
فیاض ٹبہ|-93789
مبارک ٹبہ|-4253
ملک حسیب|-91601
اویس رضا ٹبہ|188977
وسیم منڈیالہ روڈ|134298
واجد مجید|17691
عادل مغل|-716916
نثار احمد|-26848`;

export const WASTAGE_SHOP_OWNERS = RAW.trim().split('\n').map((row, index) => {
  const [name, rawAmount] = row.split('|');
  const amount = Number(rawAmount);
  if (!name || !Number.isFinite(amount)) throw new Error(`Invalid wastage row ${index + 1}`);
  return { number: index + 1, name, amount };
});

export async function seedWastageShopOwners(dataSource: DataSource) {
  const department = await dataSource.getRepository(Department).findOneBy({ type: 'WASTAGE' });
  if (!department) throw new Error('Wastage department not found');
  const role = await dataSource.getRepository(Role).createQueryBuilder('r')
    .where('UPPER(r.name) = :name', { name: 'SHOP_OWNER' }).getOne();
  if (!role) throw new Error('SHOP_OWNER role not found');

  const accounts: Array<{ id: string; code: string }> = await dataSource.query(
    `SELECT id, code FROM chart_of_accounts WHERE code IN ('accounts_receivable','accounts_payable')`,
  );
  const accountByCode = new Map(accounts.map((account) => [account.code, account.id]));
  const userRepo = dataSource.getRepository(User);
  const partyRepo = dataSource.getRepository(Party);
  const ledgerRepo = dataSource.getRepository(LedgerEntry);
  const passwordHash = await bcrypt.hash('ChangeMe123', 12);
  const entryDate = new Date().toISOString().slice(0, 10);

  await dataSource.transaction(async (manager) => {
    for (const entry of WASTAGE_SHOP_OWNERS) {
      const email = `wastage-shop-${String(entry.number).padStart(3, '0')}@poultry.local`;
      let user = await manager.getRepository(User).findOneBy({ email });
      if (!user) user = await manager.getRepository(User).save(userRepo.create({
        fullName: entry.name, email, passwordHash, roleId: role.id,
        departmentId: department.id, isActive: true,
      }));
      else await manager.getRepository(User).update(user.id, {
        fullName: entry.name, roleId: role.id, departmentId: department.id,
      });

      const matchingParties = await manager.getRepository(Party).find({
        where: { userId: user.id },
        relations: ['departments'],
      });

      let party = matchingParties[0] ?? null;

      for (const duplicate of matchingParties.slice(1)) {
        await manager.getRepository(LedgerEntry).delete({ sourceType: 'opening_balance', sourceId: duplicate.id });
        await manager.getRepository(LedgerEntry).delete({ partyId: duplicate.id });
        await manager.getRepository(Party).delete(duplicate.id);
      }

      if (!party) party = partyRepo.create({ userId: user.id, name: entry.name });
      Object.assign(party, {
        userId: user.id, name: entry.name, partyType: PartyTypeEnum.SHOP_OWNER,
        primaryDepartmentId: department.id, departments: [department],
        openingBalance: entry.amount.toFixed(2),
        notes: entry.amount < 0 ? 'Opening receivable from shop owner' : entry.amount > 0 ? 'Opening payable to shop owner' : 'Nil opening balance',
      });
      party = await manager.getRepository(Party).save(party);
      await manager.getRepository(LedgerEntry).delete({ sourceType: 'opening_balance', sourceId: party.id });
      if (entry.amount === 0) continue;
      const receivable = entry.amount < 0;
      const accountId = accountByCode.get(receivable ? 'accounts_receivable' : 'accounts_payable');
      if (!accountId) throw new Error('Opening-balance account not found');
      const amount = Math.abs(entry.amount).toFixed(2);
      await manager.getRepository(LedgerEntry).save([
        ledgerRepo.create({ departmentId: department.id, accountId, partyId: party.id,
          entryType: receivable ? 'debit' : 'credit', amount, entryDate,
          sourceType: 'opening_balance', sourceId: party.id, description: receivable ? 'Opening receivable from shop owner' : 'Opening payable to shop owner' }),
        ledgerRepo.create({ departmentId: department.id, accountId,
          entryType: receivable ? 'credit' : 'debit', amount, entryDate,
          sourceType: 'opening_balance', sourceId: party.id, description: 'Opening balance control entry' }),
      ]);
    }
  });

  const receivable = WASTAGE_SHOP_OWNERS.filter((x) => x.amount < 0).reduce((s, x) => s + Math.abs(x.amount), 0);
  const payable = WASTAGE_SHOP_OWNERS.filter((x) => x.amount > 0).reduce((s, x) => s + x.amount, 0);
  console.log(`Wastage shop owners seeded: ${WASTAGE_SHOP_OWNERS.length}; receivable=${receivable.toFixed(2)}; payable=${payable.toFixed(2)}`);
}
