import architecture from "../../../platform_architecture_and_data_model_ar.md?raw";
import security from "../../../security_officer_guide_ar.md?raw";
import statistics from "../../../statistics_chief_user_guide_ar.md?raw";
import operations from "../../../end_to_end_operating_manual_ar.md?raw";
import completion from "../../../institutional_completion_report_ar.md?raw";
import development from "../../../deployment-backup-development-guide-ar.md?raw";
import policy from "../../../internal_use_and_publication_policy.md?raw";
import boundary from "../../../official-boundary-source-review.md?raw";

export type DocumentCategory = "معمارية" | "أمن" | "إحصاء" | "تشغيل" | "حوكمة";
export type PlatformDocument = {
  fileName: string;
  title: string;
  description: string;
  category: DocumentCategory;
  content: string;
};

export const documentLibrary: PlatformDocument[] = [
  { fileName: "01-architecture/platform_architecture_and_data_model_ar.md", title: "المعمارية ونموذج البيانات", description: "طبقات النظام، مسار الطلب، قاعدة البيانات، الصلاحيات والجاهزية.", category: "معمارية", content: architecture },
  { fileName: "02-security/security_officer_guide_ar.md", title: "دليل مسؤول الأمن", description: "إدارة الوصول، حماية البيانات، التبعيات، النسخ الاحتياطي والاستجابة للحوادث.", category: "أمن", content: security },
  { fileName: "03-statistics/statistics_chief_user_guide_ar.md", title: "دليل رئيس الإحصاء", description: "تعريف المؤشر، المراجعة المستقلة، الاعتماد، التنبؤ والتقارير.", category: "إحصاء", content: statistics },
  { fileName: "04-operations/end_to_end_operating_manual_ar.md", title: "الدليل التشغيلي الشامل", description: "من إدخال أو استيراد القياس حتى الاعتماد والتحليل والمخرجات.", category: "تشغيل", content: operations },
  { fileName: "01-architecture/institutional_completion_report_ar.md", title: "تقرير التشطيب المؤسسي", description: "حالة المكونات، معيار القبول، وحدود الجاهزية والنشر الخارجي.", category: "معمارية", content: completion },
  { fileName: "04-operations/deployment-backup-development-guide-ar.md", title: "دليل التشغيل والنسخ الاحتياطي", description: "التشغيل المحلي، التطوير، الاختبارات، النسخ الاحتياطي والانتقال المستقبلي.", category: "تشغيل", content: development },
  { fileName: "05-governance/internal_use_and_publication_policy.md", title: "سياسة الاستخدام والنشر", description: "ضوابط الاستخدام الداخلي وقرارات النشر الخارجي المستقبلية.", category: "حوكمة", content: policy },
  { fileName: "05-governance/official-boundary-source-review.md", title: "سجل مصدر الحدود الرسمية", description: "سجل مراجعة واعتماد طبقة البلديات والحدود الجغرافية.", category: "حوكمة", content: boundary },
];

export function documentCategories() {
  return Array.from(new Set(documentLibrary.map((document) => document.category)));
}
