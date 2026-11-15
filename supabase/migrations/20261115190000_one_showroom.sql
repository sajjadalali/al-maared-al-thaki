-- One showroom, one city (15 Nov): the demo stock was spread over 7 cities
-- while the showroom is in Baghdad. Every car is at the showroom now.
update public.cars set city = 'بغداد' where city <> 'بغداد';

-- No delivery promise (it read like a parcel shop): the row is switched off,
-- so Sadeem sends delivery questions to the team.
update public.showroom_info set is_active = false where dealer_slug = 'demo' and category = 'delivery';

-- What the showroom offers before buying is a viewing: see the car, inspect
-- it and check its specs. A drive is agreed with the team at the showroom.
insert into public.showroom_info (category, question, answer, position)
select 'booking', 'أگدر أشوف السيارة وأفحصها قبل ما أشتري؟ أكو تجربة قيادة؟',
       'إي، تحجز موعد معاينة وتجي للمعرض ببغداد: تشوف السيارة بعينك، تفحصها وتتأكد إن مواصفاتها مثل المكتوب بالموقع. وتجربة القيادة تتفق عليها ويا الفريق من تجي.', 0
where not exists (select 1 from public.showroom_info where dealer_slug = 'demo' and question like 'أگدر أشوف السيارة وأفحصها%');
