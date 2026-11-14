-- Sadeem's knowledge base: the showroom's policies (installments, warranty,
-- inspection, trade-in, papers, booking, delivery, payment). Cars stay in
-- `cars` and are searched with filters; contact details and hours stay in
-- src/config/site.ts. Sadeem answers these questions from this table only.
--
-- dealer_slug is ready for one page per showroom: each dealer gets its own rows.
-- The 'demo' rows are demo values for المعرض الذكي (decision of 15 Nov 2026),
-- matching the services the home page lists. A real showroom replaces them.

create table if not exists public.showroom_info (
  id          bigint generated always as identity primary key,
  dealer_slug text        not null default 'demo',
  category    text        not null check (category in (
                'financing', 'warranty', 'inspection', 'trade_in', 'paperwork',
                'booking', 'delivery', 'payment', 'pricing', 'after_sale')),
  question    text        not null,
  answer      text        not null,
  is_active   boolean     not null default true,
  position    smallint    not null default 0,
  updated_at  timestamptz not null default now()
);

comment on table public.showroom_info is
  'Sadeem knowledge base: showroom policies per dealer. Sadeem answers policy questions from these rows only.';

create index if not exists showroom_info_dealer_idx
  on public.showroom_info (dealer_slug, is_active, category, position);

drop trigger if exists showroom_info_touch on public.showroom_info;
create trigger showroom_info_touch before update on public.showroom_info
  for each row execute function public.touch_updated_at();

alter table public.showroom_info enable row level security;
drop policy if exists "showroom info is public" on public.showroom_info;
create policy "showroom info is public" on public.showroom_info
  for select to anon, authenticated using (is_active);

grant select on public.showroom_info to anon, authenticated;
grant all on public.showroom_info to service_role;

insert into public.showroom_info (category, question, answer, position) values
('financing', 'عدكم أقساط؟',
 'إي، نرتب الأقساط ويا المصارف المعتمدة: دفعة أولى تبدي من 30% من سعر السيارة، والباقي أقساط لغاية 36 شهر. القسط الشهري يختلف حسب السيارة والمصرف، والفريق يحسبه إلك بالضبط.', 1),
('financing', 'شنو المستمسكات المطلوبة للأقساط؟',
 'البطاقة الوطنية الموحدة، وبطاقة السكن، وتأييد راتب أو كفيل موظف. المصرف ممكن يطلب غيرها، والفريق يأكدلك القائمة قبل ما تجي.', 2),
('warranty', 'السيارات عليها ضمان؟',
 'الجديدة (الزيرو) عليها ضمان الوكيل حسب شركتها. المستعملة عليها ضمان المعرض 3 أشهر على المحرك والگير. وتفاصيل الضمان تنكتب بالعقد.', 1),
('inspection', 'تفحصون السيارات قبل البيع؟',
 'إي، كل سيارة نفحص محركها وگيرها وهيكلها وصبغها قبل البيع، ونگلك حالتها بوضوح قبل ما تقرر.', 1),
('inspection', 'أگدر أفحصها عند فاحص من عندي؟',
 'إي أكيد، تگدر تاخذها لفاحص تختاره إنت بوجود موظف من المعرض، والفحص على حسابك.', 2),
('trade_in', 'أگدر أبدل سيارتي القديمة؟',
 'إي، جيب سيارتك ونقيّمها بالمعرض، وقيمتها تنخصم من سعر السيارة اللي تختارها. التقييم النهائي يكون بعد ما يشوفها الفريق.', 1),
('paperwork', 'المعرض يسوي التسجيل ونقل الملكية؟',
 'إي، نتابع وياك أوراق المرور والتسجيل ونقل الملكية لحد ما تستلم سيارتك جاهزة. رسوم المرور على المشتري.', 1),
('booking', 'أگدر أحجز السيارة؟ تاخذون عربون؟',
 'إي، تحجزها بعربون 500 ألف دينار، والحجز يبقى 3 أيام. العربون ينحسب من سعر السيارة.', 1),
('delivery', 'توصلون السيارة؟ للمحافظات؟',
 'إي، نوصل لكل المحافظات. داخل بغداد التوصيل مجاني، وللمحافظات الكلفة حسب المسافة والفريق يگلك شكد.', 1),
('payment', 'شلون أدفع؟ تقبلون دولار؟',
 'كاش بالمعرض، أو تحويل مصرفي، أو أقساط عن طريق المصارف المعتمدة. الأسعار بالموقع بالدينار، وتگدر تدفع بالدولار بسعر صرف يوم البيع.', 1),
('pricing', 'السعر بيه مجال؟ آخر سعر شكد؟',
 'السعر المكتوب هو سعر المعرض، وأي تفاوض يكون ويا الفريق مباشرة.', 1),
('after_sale', 'عدكم صيانة بعد البيع؟',
 'ماكو ورشة صيانة بالمعرض. السيارات الجديدة صيانتها عند الوكيل، وللمستعملة الفريق يدلك على مراكز صيانة موثوقة.', 1);
