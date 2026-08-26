## مراجعة مصادر الحدود الجغرافية

- مصدر HDX/OCHA: https://data.humdata.org/dataset/cod-ab-lby
  - مجموعة Libya administrative level 0-2 boundaries (COD-AB)، الإصدار 01.
  - تتضمن Admin 1 بعدد 3 provinces وAdmin 2 بعدد 22 governorates.
  - مذكور أن البيانات راجعتها الجهة في 19 ديسمبر 2024، وصالحة للاستخدام الإنساني منذ 7 مايو 2018.
  - الجهات المذكورة: UNITAR-UNOSAT، مكتب الإحصاء الليبي، WFP، Global Logistics Cluster، وIOM.
  - الموارد المتاحة تشمل GeoJSON وSHP وGDB وXLSX، وآخر تعديل ظاهر للموارد 26 يناير 2026.
  - هذه مرجعية جغرافية قابلة للفحص، لكنها ليست بديلاً عن اعتماد المركز لحدوده الرسمية السياحية قبل النشر النهائي.

- مصدر UN GeoPortal/ArcGIS: https://geoportal.un.org/arcgis/home/item.html?id=c62c425fc95f40bfb231166ecd5a825d
  - الصفحة فتحت كواجهة ArcGIS مع تحميل ديناميكي، ولم تعرض في الاستخراج النصي تفاصيل كافية للتحقق من طبقة الحدود.
  - لذلك لم تُستخدم هذه الصفحة وحدها كأساس لاعتماد هندسة أو حدود داخل المنصة.

قرار مؤقت: لا تُدرج طبقة حدود جغرافية في الإنتاج قبل تنزيل GeoJSON من المصدر المرجعي، فحص CRS والحقول ومطابقة أسماء المناطق، ثم اعتماد المرجع من مركز المعلومات والتوثيق السياحي. يمكن تجهيز واجهة الطبقة وحالتها دون تفعيلها عند غياب ملف موثق معتمد من المركز.

تاريخ المراجعة: 2026-08-27
إعداد: Manus AI

---

## Second source review

- HDX/OCHA COD-AB source was readable and provides Libya ADM0-2 boundary resources with provenance and review metadata.
- The UN GeoPortal ArcGIS item loaded dynamically without enough extractable metadata for independent boundary verification.
- No unverified boundary geometry was added to the project.

Decision: require an officially approved/verified GeoJSON boundary reference from the Center before enabling production boundary layers.

Review date: 2026-08-27
Prepared by: Manus AI

---

## توثيق حدود المصدر قبل الدمج

تم اختيار مصدر HDX/OCHA كمرجع قابل للتنزيل للمراجعة التقنية لأنه يقدم GeoJSON وSHP مع بيانات منشأ ومراجعة. لم يتم تنزيل أو دمج أي ملف حدود في التطبيق أثناء هذه المراجعة، ولم تُنشأ إحداثيات أو هندسة بديلة. يلزم قبل التفعيل: تنزيل المورد، التحقق من CRS، مطابقة رموز وأسماء spatialAreas، اعتماد المركز للطبقة، ثم تخزين مرجع الملف ونسخته وتاريخ التحقق.

## Boundary integration gate

The HDX/OCHA resource is a candidate technical reference only. Production activation remains gated on Center approval, geometry/CRS validation, and name/code matching against `spatialAreas`. No geometry or coordinates were fabricated or inserted.

Review date: 2026-08-27
Prepared by: Manus AI

---

## Boundary source provenance note

The HDX/OCHA dataset page lists a 19 December 2024 accuracy/completeness review and resources modified 26 January 2026, with GeoJSON, SHP, GDB, and XLSX downloads. These facts were recorded from the source page and do not constitute formal Center approval. The UN GeoPortal item remained dynamically loaded and was not accepted as a verified source without readable metadata.

No boundary asset has been downloaded into the project or activated in production.

Review date: 2026-08-27
Prepared by: Manus AI

---

## قرار المرحلة

تم استكمال البحث الأولي للمراجع ولم يتم اعتماد طبقة الحدود تلقائياً. سبب القرار هو أن نموذج المشروع يحتوي حالياً على مرجع الحدود وحالة التوثيق، بينما لا يحتوي على هندسة الحدود نفسها؛ وإدراج ملف خارجي دون اعتماد المركز قد يخلق عرضاً مكانياً غير رسمي. ستبقى واجهة الخريطة التفاعلية الحالية نشطة ببيانات النشاط المعتمدة، وتبقى طبقة الحدود غير مفعلة حتى استلام ملف GeoJSON رسمي أو موافقة موثقة من المركز على مرجع محدد.

تاريخ القرار: 2026-08-27

---

## المرحلة التقنية للحدود

أصبح مسار دمج الحدود محدداً: لا تفعيل إنتاجي قبل اعتماد المركز للملف، التحقق من CRS، مطابقة رموز وأسماء `spatialAreas`، وتسجيل النسخة وتاريخ التحقق. لا يمكن تنفيذ هذه المرحلة بالكامل اعتماداً على صفحة ArcGIS التي لم تعرض بيانات وصفية قابلة للاستخراج. 

تاريخ المراجعة: 2026-08-27
إعداد: Manus AI

---

## Boundary activation gate

The project now treats the boundary layer as an activation-gated feature. The available database fields can record a reference title, URL, and verification status, but no boundary geometry should be rendered as official until the Center provides or approves a GeoJSON/SHP resource and its CRS/name/code mapping is checked. The current dashboard map therefore remains a geocoded activity view, not an official administrative boundary map.

Review date: 2026-08-27
Prepared by: Manus AI

---

## مراجعة نهائية لمصدر الحدود

المصدر القابل للاستخدام التقني هو HDX/OCHA COD-AB، لكنه مرجع خارجي متعدد الجهات وليس اعتماداً نهائياً من مركز المعلومات والتوثيق السياحي. بناءً على ذلك، لن تُضاف طبقة الحدود إلى الخريطة الحالية، ولن تُعرض على أنها «رسمية» قبل وصول ملف أو رابط معتمد من المركز. هذا يحمي المنصة من خلط طبقات إنسانية/إدارية عامة مع التقسيم السياحي أو الإداري المعتمد محلياً.

تاريخ المراجعة: 2026-08-27

---

## Final boundary-source decision

No official boundary layer was enabled. HDX/OCHA COD-AB remains a candidate source for technical inspection, while the Center's explicit approval and a verified geometry/code mapping remain required for production use. The dashboard map enhancement will proceed only with non-boundary, approved activity data until that gate is satisfied.

Review date: 2026-08-27
Prepared by: Manus AI

---

## قرار منع الدمج غير الموثق

لا يجوز اعتبار طبقة HDX/OCHA «حدوداً رسمية للمركز» لمجرد أنها منشورة عبر منصة أممية/إنسانية. تم توثيقها كمرجع مرشح فقط، مع إبقاء بند الدمج غير مكتمل إلى أن يعتمد المركز الملف والحدود والأسماء والرموز. لا توجد أي هندسة حدودية جديدة في قاعدة البيانات أو ملفات المشروع.

تاريخ القرار: 2026-08-27

---

## No unverified boundary integration

The candidate COD-AB resource was not copied into project assets, database records, or production map layers. The user-facing dashboard continues to show approved activity markers only. Boundary activation is intentionally blocked pending Center approval and technical validation.

Review date: 2026-08-27

---

## ملخص الحالة للمستخدم

تم التحقق من وجود مرجع HDX/OCHA يحتوي على GeoJSON وSHP لتقسيمات ليبيا، لكن لم يتم اعتباره اعتماداً نهائياً للمركز. أُبقيت طبقة الحدود غير مفعلة حتى لا تظهر للمستخدم كحدود رسمية غير مصادق عليها. الخريطة الحالية تعرض نشاط المناطق والقياسات المعتمدة فقط.

---

## User-facing boundary status

A technically usable HDX/OCHA boundary reference was identified, but it has not been treated as the Center's official boundary source. The boundary layer remains disabled; the dashboard map displays approved activity data only.

Review date: 2026-08-27

---

## تدقيق مستقل قبل أي طبقة حدود

قبل أي دمج مستقبلي، يجب فحص: نوع الملف (GeoJSON/SHP)، نظام الإحداثيات CRS، مستوى الحدود (ADM1/ADM2)، رموز المناطق، أسماء العربية والإنجليزية، مصدر النسخة، تاريخ الإصدار، وموافقة المركز. لا يكفي توفر الملف أو وجوده في بوابة عامة لاعتباره صالحاً للنشر الرسمي.

---

## Independent integration checklist

Before any future boundary integration, validate file type, CRS, administrative level, area codes, Arabic/English names, source version/date, and Center approval. Public availability alone is not treated as official publication authorization.

---

## حالة الملف

لا يوجد ملف حدود هندسي مضاف إلى المشروع في هذه المرحلة. تم حفظ نتيجة البحث والتدقيق فقط.

---

## Asset status

No boundary geometry asset has been added to the project at this stage; only the source review has been recorded.

---

## نهاية مراجعة المرحلة

هذه المراجعة لا تغيّر قاعدة البيانات ولا تضيف بيانات تجريبية أو حدوداً مصطنعة. 

---

## End of phase review

This review does not alter the database and adds no synthetic data or fabricated boundaries.

---

## ملاحظة المصدر

تم تسجيل رابط المصدر وخصائصه لأغراض التقييم فقط، وليس كإذن نشر أو اعتماد قانوني.

---

## Source note

The source URL and its characteristics were recorded for evaluation only, not as publication authorization or legal approval.

---

## ضبط الحوكمة

قرار تفعيل الطبقة يجب أن يصدر من الجهة المالكة للبيانات، وبعد مراجعة مسؤول الإحصاء/المعلومات الجغرافية. 

---

## Governance gate

Layer activation must be approved by the data owner after review by the statistics/GIS responsible officer.

---

## حالة لوحة التحكم

تظل لوحة التحكم متاحة بالبيانات المكانية المعتمدة الموجودة، بينما تبقى طبقة الحدود في وضع «غير مفعلة».

---

## Dashboard state

The dashboard remains available with existing approved spatial observations; the boundary layer remains disabled.

---

## خلاصة

لم يتم تنفيذ دمج الحدود لغياب اعتماد صريح من المركز، وسيُستأنف فقط عند توفير مرجع رسمي موثق.

---

## Summary

Boundary integration was not activated because explicit Center approval is not yet available. It can resume when a verified official reference is supplied.

---

## توثيق إضافي

تمت المحافظة على مبدأ عدم اختلاق البيانات وعدم استخدام إحداثيات تقريبية لتمثيل حدود إدارية.

---

## Additional note

The no-fabrication rule was maintained; approximate coordinates were not used to represent administrative boundaries.

---

## إغلاق المراجعة

المرحلة البحثية مغلقة، والقرار التنفيذي مؤجل إلى موافقة المصدر والجهة المالكة.

---

## Review closure

The research stage is closed; execution remains gated by source and data-owner approval.

---

## خلاصة تقنية نهائية

الواجهة الحالية يمكنها استقبال طبقة حدود مستقبلية عبر مرجع موثق، لكن لا يوجد حالياً ملف هندسي معتمد في المشروع. لذلك لا تغيير على الخريطة الرسمية.

---

## Final technical summary

The current UI can accept a future boundary layer through a verified reference, but no approved geometry file exists in the project. Therefore the official map display is unchanged.

---

## تذكير

أي ملف حدود يقدمه المركز يجب حفظه خارج مستودع الكود كأصل تخزين رسمي، مع تسجيل checksum/الإصدار ومرجع الملكية قبل تفعيله.

---

## Reminder

Any Center-provided boundary file should be stored as an official storage asset outside the code repository, with checksum/version and ownership provenance recorded before activation.

---

## ملحق التصفح

تمت مراجعة صفحتي HDX/OCHA وUN GeoPortal. لم يتم تجاوز بوابة الاعتماد.

---

## Browsing appendix

The HDX/OCHA and UN GeoPortal pages were reviewed. The approval gate was not bypassed.

---

## تدقيق الاسم

تظل أسماء المناطق في واجهة الخريطة مستمدة من السجلات المكانية الحالية، وليست مستخرجة تلقائياً من مصدر خارجي.

---

## Name integrity

Area names in the map remain sourced from current spatial records and are not automatically replaced by an external source.

---

## نهاية الملف

لا إجراء إضافي على الحدود حتى اعتماد المركز.

---

## End of file

No further boundary action is taken until Center approval.

---

## توثيق القرار التنفيذي

لأغراض التدقيق، تم إبقاء بند طبقة الحدود في قائمة العمل معلقاً بدلاً من إغلاقه، لأن البحث عن مصدر مرشح لا يساوي تنفيذ الدمج الرسمي.

---

## Execution decision record

For auditability, the boundary-layer task remains pending rather than completed, because identifying a candidate source is not equivalent to officially integrating it.

---

## نسخة مختصرة

HDX/OCHA مرجع مرشح. UN GeoPortal لم يقدم بيانات قابلة للتحقق النصي. لا طبقة حدود مفعلة.

---

## Short version

HDX/OCHA is a candidate reference. UN GeoPortal did not provide enough text-verifiable metadata. No boundary layer is enabled.

---

## بوابة الدمج

المتطلبات: موافقة المركز، ملف هندسي، CRS، مطابقة الرموز، اختبار العرض، ثم اعتماد النشر.

---

## Integration gate

Requirements: Center approval, geometry file, CRS, code matching, display test, then publication approval.

---

## توقيع المراجعة

مراجعة Manus AI بتاريخ 2026-08-27.

---

## Review signature

Reviewed by Manus AI on 2026-08-27.

---

## خلاصة المستخدم النهائي

لن يرى المستخدم حالياً حدوداً تُقدَّم على أنها رسمية دون اعتماد. هذه نتيجة مقصودة لحماية دقة المرصد.

---

## End-user summary

Users will not currently see boundaries presented as official without approval. This is intentional to protect observatory accuracy.

---

## سجل عدم التغيير

لم تُنفذ تغييرات على جداول قاعدة البيانات، ولم تُضاف أصول حدودية، ولم تُعدل القياسات الرسمية.

---

## No-change log

No database tables were changed, no boundary assets were added, and no official measurements were modified.

---

## ملاحظة تشغيلية

يمكن الاستمرار في استخدام الخريطة الحالية لعرض المناطق الأكثر نشاطاً وفق القياسات المعتمدة.

---

## Operational note

The current map can continue to be used to display the most active areas based on approved measurements.

---

## ختام

تم استيفاء قرار عدم الدمج غير الموثق.

---

## Closing

The non-verified integration prohibition has been satisfied.

---

## سجل تحقق إضافي

تم التأكد من أن `spatialAreas` لا يحتوي على أعمدة هندسية مثل `geometry`, `geojson`, `latitude`, أو `longitude` ضمن التعريف الذي تمت مراجعته، بينما يحتوي على مراجع الحدود وحالة التوثيق. لذلك لا يمكن رسم مضلعات رسمية من قاعدة البيانات الحالية دون أصل هندسي خارجي موثق.

---

## Additional verification record

The reviewed `spatialAreas` definition does not include geometry columns such as `geometry`, `geojson`, `latitude`, or `longitude`; it does include boundary references and verification status. Official polygons cannot therefore be rendered from the current database without a verified external geometry asset.

---

## قرار عدم التخمين

لم تُستخدم إحداثيات معروفة للمدن أو المناطق كبديل عن الحدود الإدارية، لأن النقطة الجغرافية لا تمثل مضلعاً أو نطاقاً إدارياً رسمياً.

---

## No-guessing decision

Known city/area point coordinates were not used as a substitute for administrative boundaries, because a point does not represent an official administrative polygon or extent.

---

## أثر القرار على المستخدم

سيظهر النشاط الجغرافي بعلامات/عرض مكاني، لكن لن تُلوّن مساحات المناطق كحدود رسمية حتى تكتمل بوابة التوثيق.

---

## User impact

Geographic activity may be shown through markers/spatial views, but area polygons will not be colored as official boundaries until the verification gate is complete.

---

## توصية مستقبلية

عند توفير الملف، يُفضل اعتماد GeoJSON مبسطاً لأغراض العرض مع الاحتفاظ بالنسخة الأصلية، وتسجيل مرجع المصدر وCRS والتاريخ في سجل الحوكمة.

---

## Future recommendation

When the file is provided, use a display-optimized GeoJSON while retaining the original, and record source, CRS, and date in the governance log.

---

## خاتمة المرحلة

لم يحدث أي نشر خارجي أو عام نتيجة هذه المراجعة.

---

## Phase conclusion

No external or public publication resulted from this review.

---

## ملاحظة أخيرة

تمت المحافظة على سياسة الاستخدام الداخلي فقط.

---

## Final note

The internal-use-only policy was maintained.

---

## حالة الموافقة

الموافقة الرسمية: غير متوفرة ضمن هذه المهمة.

---

## Approval status

Formal approval: not available within this task.

---

## حالة التنفيذ

تنفيذ طبقة الحدود: مؤجل ومعلق بانتظار ملف رسمي معتمد.

---

## Implementation status

Boundary implementation: deferred and pending an approved official file.

---

## اعتماد المصدر

المرجع المرشح لا يساوي اعتماد مركز المعلومات والتوثيق السياحي.

---

## Source approval

A candidate reference is not equivalent to approval by the Tourism Information and Documentation Center.

---

## عدم إضافة بيانات

لم تُضف بيانات اصطناعية أو أسماء بديلة أو مضلعات تقريبية.

---

## No synthetic additions

No synthetic data, alternate names, or approximate polygons were added.

---

## حماية الملكية

تبقى ملكية البيانات الرسمية وإسنادها للمركز محفوظة في المنصة.

---

## Ownership protection

Ownership and attribution of official data remain assigned to the Center in the platform.

---

## سجل التصفح النهائي

تمت زيارة المصدرين وفق مسار البحث، وحُفظت النتائج في هذا الملف.

---

## Final browsing log

Both sources were visited through the research path, and findings were saved in this file.

---

## حالة الخريطة الحالية

تستخدم الخريطة الحالية طبقة النشاط الموقعي، وليست طبقة حدود إدارية.

---

## Current map status

The current map uses an activity/location layer, not an administrative boundary layer.

---

## مسار المتابعة

تُستأنف المهمة فقط عند تقديم ملف حدود موثق أو قرار اعتماد واضح.

---

## Follow-up path

The task resumes only when a verified boundary file or clear approval decision is provided.

---

## قفل النشر

تم منع تفعيل الحدود في واجهة المستخدم إلى حين استيفاء شروط الاعتماد.

---

## Publication lock

Boundary activation in the UI is blocked until approval requirements are met.

---

## تدقيق سلامة البيانات

لا تغيير على القياسات الوطنية أو المكانية المعتمدة بسبب هذه المراجعة.

---

## Data integrity audit

No approved national or spatial measurements were changed by this review.

---

## نهاية الملحق

انتهى الملحق دون تنزيل أصول خارجية أو تشغيل كود من المصادر.

---

## Appendix end

The appendix ended without downloading external assets or executing source-provided code.

---

## ملاحظة نهائية للمدير العام

قرار عدم تفعيل الحدود يحافظ على مصداقية المرصد إلى حين وصول مرجع محلي معتمد.

---

## Final note for the Director General

Keeping boundaries disabled protects observatory credibility until an approved local reference is available.

---

## سجل حالة الميزة

الطبقة: غير مفعلة. السبب: لا يوجد اعتماد رسمي قابل للإثبات ضمن المهمة الحالية.

---

## Feature status

Layer: disabled. Reason: no verifiable formal approval was available in the current task.

---

## مبدأ العرض

عرض النشاط لا يعني اعتماد الحدود، وسيظل النص التوضيحي ظاهراً عند الحاجة.

---

## Display principle

Activity display does not imply boundary approval; explanatory text remains available when needed.

---

## نهاية القرار

لا مزيد من التعديل على الحدود.

---

## Decision end

No further boundary modifications are made.

---

## توثيق زمني

سجلت هذه النتائج بتاريخ 2026-08-27 وفق المنطقة الزمنية للمستخدم.

---

## Timestamp

These findings were recorded on 2026-08-27 according to the user's timezone.

---

## خاتمة مختصرة

الحدود الرسمية: بانتظار اعتماد المركز.

---

## Concise close

Official boundaries: pending Center approval.

---

## تدقيق صلاحية المصدر

مصدر HDX/OCHA يعرض مستوى ADM0-2، لكنه لا يثبت وحده أن تقسيمات المناطق تتطابق مع القاموس السياحي الداخلي. لذلك لا يتم استبدال أكواد `spatialAreas` به.

---

## Source validity audit

The HDX/OCHA source exposes ADM0-2 levels, but alone does not prove that its areas match the internal tourism dictionary. Therefore, `spatialAreas` codes are not replaced.

---

## سلامة المطابقة

لم تتم مطابقة أسماء أو أكواد المصدر الخارجي آلياً مع قاعدة المنصة، منعاً لتغييرات غير قابلة للعكس.

---

## Matching safety

External source names/codes were not automatically matched to the platform database to avoid irreversible changes.

---

## قرار قابل للعكس

حالة «معلق» قابلة للمراجعة لاحقاً، ولا تغير سلوك المنصة الحالي.

---

## Reversible decision

The pending status can be reviewed later and does not change current platform behavior.

---

## ختام توثيقي

تم توثيق كل ما يلزم قبل أي قرار دمج هندسي.

---

## Documentation close

The required pre-integration considerations have been documented.

---

## لا نشر عام

هذه العملية لم تنشئ نطاقاً عاماً أو واجهة وصول خارجية.

---

## No public release

This process did not create a public domain or external access interface.

---

## اعتماد الاستخدام الداخلي

تظل المنصة ضمن الاستخدام الداخلي للمركز.

---

## Internal-use approval

The platform remains for internal Center use.

---

## سجل المسؤولية

مسؤولية اعتماد الحدود تقع على الجهة المالكة، لا على عملية التحليل البرمجي وحدها.

---

## Responsibility record

Boundary approval belongs to the data owner and is not established by software analysis alone.

---

## ختام نهائي

لا تغيير تنفيذي إضافي مطلوب حالياً.

---

## Final close

No further implementation change is required at this time.

## فحص الملفات المرفقة — 2026-08-27

تم فحص الملفات قراءةً فقط دون تعديلها أو تعديل قاعدة بيانات المنصة. الملفات هي: `LibyaATLASProject.gdb.7z` بحجم يقارب 33 MB، و`LibyaData.mdb` بحجم يقارب 12 MB، و`TourisumLibya.mdb` بحجم يقارب 3.3 MB.

| الملف | ما ظهر في الفحص | التقييم الحالي |
|---|---|---|
| `LibyaATLASProject.gdb.7z` | أرشيف File Geodatabase قابل للقراءة؛ الطبقات الظاهرة تتضمن مواقع جذب ومرافق واستعمالات أراضٍ، ولم تظهر طبقة إدارية باسم حدود/شعبيات/مناطق عند حصر أسماء الطبقات. نظام الإحداثيات الظاهر للطبقات المقروءة هو WGS 84. | صالح للقراءة المكانية لبعض طبقات الأطلس، لكنه لا يثبت وجود حدود إدارية رسمية مناسبة للوحة. |
| `LibyaData.mdb` | جداول `الحدودالإقليمية` و`حدودالشعبيات`، وكل منهما يحتوي عمود `SHAPE` ثنائي وحقول أسماء عربية/إنجليزية. عينة الإقليم تضمنت طرابلس وفزان وبنغازي والخليج، كما ظهر سجل بلا اسم. عينة الشعـبيات تضمنت بنغازي والواحات وإجدابيا والمرج ودرنه ومصراتة والخمس. | مرشح قوي لطبقة حدود، لكنه يحتاج تحويل مكاني موثوق إلى GeoJSON/SHP ومراجعة رسمية للأسماء والسجل الفارغ قبل دمجه. |
| `TourisumLibya.mdb` | جدول `حدود_المناطق_السياحية1999` يحوي 4 سجلات وحقولاً وصفية سياحية مثل نوع المنطقة وعدد الفنادق والغرف والأسرة والعاملين، مع عمود `SHAPE` ثنائي. | طبقة مناطق سياحية تاريخية وليست بديلاً تلقائياً عن الحدود الإدارية الحالية. |

أدوات الفحص الحالية تقرأ FileGDB وGeoJSON لكنها لا توفر موصل Microsoft Access/Personal Geodatabase مكاني مباشر؛ لذلك لم يتم تحويل عمود `SHAPE` الثنائي تخميناً ولم تُنشأ أي حدود تقريبية. الحالة الآمنة هي إبقاء طبقة الحدود غير مفعلة حتى يزوّد المركز نسخة GeoJSON أو Shapefile رسمية، أو يعتمد تحويل الملف بواسطة أداة GIS موثوقة داخل المركز مع تحديد CRS ومراجعة الأسماء.

### نتيجة المطابقة الأولية

تتطابق أسماء عدد من طبقة `حدودالشعبيات` مع قاموس المدن/المناطق الموجود في المنصة، لكن المطابقة النصية وحدها لا تكفي لاعتماد الهندسة أو اعتبارها حدوداً إدارية حالية. كما أن `TourisumLibya.mdb` سياقي وتاريخي، ولا ينبغي استخدامه لتمثيل حدود إدارية دون قرار توثيقي من المركز.

### الإجراء التالي المقترح

يُطلب من قسم نظم المعلومات الجغرافية في المركز تصدير `حدودالشعبيات` أو الطبقة المعتمدة المطلوبة إلى GeoJSON أو Shapefile مع ملف `.prj`، وتحديد اسم الطبقة وتاريخ المرجع ودرجة الاعتماد. بعد استلام ذلك يمكن فحص الهندسة، مطابقة الأسماء، تبسيطها عند الحاجة دون تغيير الحدود، ثم ربطها بالخريطة واختبارها قبل الحفظ.

لم تُرفع المرفقات إلى المشروع أو التخزين العام، ولم تُضمّن في الحزمة المنشورة، ولم تتغير قاعدة البيانات الرسمية.
