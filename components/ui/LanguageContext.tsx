"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "ar";

type Translations = Record<string, { en: string; ar: string }>;

const translations: Translations = {
  // Navigation & Headers
  "nav.citizen": { en: "Citizen Portal", ar: "بوابة المتعاملين" },
  "nav.officer": { en: "Officer Portal", ar: "بوابة الموظفين" },
  "nav.admin": { en: "Admin Portal", ar: "بوابة الإدارة" },
  "nav.dashboard": { en: "Dashboard", ar: "لوحة التحكم" },
  "nav.applications": { en: "Applications", ar: "الطلبات" },
  "nav.apply": { en: "Apply", ar: "تقديم طلب" },
  "nav.signout": { en: "Sign out", ar: "تسجيل الخروج" },
  "nav.signin": { en: "Sign in", ar: "تسجيل الدخول" },

  // Citizen Dashboard & Profile
  "citizen.welcome": { en: "Welcome", ar: "مرحباً" },
  "citizen.track_subtitle": { en: "Track and manage your permit applications.", ar: "متابعة وإدارة طلبات التراخيص الخاصة بك." },
  "citizen.new_app": { en: "+ New application", ar: "+ طلب جديد" },
  "citizen.tab_overview": { en: "Overview", ar: "نظرة عامة" },
  "citizen.tab_profile": { en: "My Profile", ar: "ملفي الشخصي" },
  "citizen.active_apps": { en: "Active applications", ar: "الطلبات النشطة" },
  "citizen.total_apps": { en: "Total applications", ar: "إجمالي الطلبات" },
  "citizen.emirates_id": { en: "Emirates ID", ar: "رقم الهوية الإماراتية" },
  "citizen.recent_apps": { en: "Recent applications", ar: "أحدث الطلبات" },
  "citizen.live_tracking": { en: "Live tracking — updates automatically", ar: "متابعة حية — تتحدث تلقائياً" },
  "citizen.no_apps": { en: "No applications yet.", ar: "لا توجد طلبات بعد." },
  "citizen.start_first": { en: "Start your first application", ar: "ابدأ طلبك الأول" },
  "citizen.gov_profile": { en: "Government ID Profile", ar: "ملف الهوية الحكومية" },
  "citizen.gov_subtitle": { en: "Data sourced from ICA registry and ERPNext", ar: "البيانات مستخرجة من هيئة الهوية السكنية و ERPNext" },
  "citizen.full_name": { en: "Full Name", ar: "الاسم الكامل" },
  "citizen.email": { en: "Email Address", ar: "البريد الإلكتروني" },
  "citizen.phone": { en: "Phone Number", ar: "رقم الهاتف" },
  "citizen.nationality": { en: "Nationality", ar: "الجنسية" },
  "citizen.gender": { en: "Gender", ar: "الجنس" },
  "citizen.dob": { en: "Date of Birth", ar: "تاريخ الميلاد" },
  "citizen.expiry": { en: "ID Expiry", ar: "تاريخ انتهاء الهوية" },

  // Citizen Apply
  "apply.title": { en: "Apply for a permit or licence", ar: "التقديم على ترخيص أو تصريح" },
  "apply.select_type": { en: "Select a permit type to begin.", ar: "اختر نوع التصريح للبدء." },
  "apply.back": { en: "← Choose a different permit type", ar: "← اختيار نوع تصريح آخر" },
  "apply.location": { en: "Location", ar: "الموقع" },
  "apply.location_placeholder": { en: "Building, street, emirate", ar: "المبنى، الشارع، الإمارة" },
  "apply.trade_licence": { en: "Trade Licence Number", ar: "رقم الرخصة التجارية" },
  "apply.trade_licence_placeholder": { en: "e.g. CN-1234567", ar: "مثال: CN-1234567" },
  "apply.req_docs": { en: "Required documents", ar: "المستندات المطلوبة" },
  "apply.pdf_only": { en: "PDF only — max 2MB each", ar: "ملفات PDF فقط — 2 ميغابايت كحد أقصى" },
  "apply.upload": { en: "Upload", ar: "رفع" },
  "apply.replace": { en: "Replace", ar: "استبدال" },
  "apply.submit": { en: "Submit application", ar: "إرسال الطلب" },
  "apply.submitting_overlay": { en: "Analyzing application & running OCR verification…", ar: "جارٍ إرسال الطلب إلى النظام…" },
  "apply.success_title": { en: "Application Submitted", ar: "تم تقديم الطلب بنجاح" },
  "apply.view_status": { en: "View Status", ar: "عرض الحالة" },

  // AI Report Card
  "ai.report_title": { en: "✨ AI Evaluation & Decision Summary", ar: "✨ تقييم الذكاء الاصطناعي وموجز القرار" },
  "ai.report_subtitle": { en: "Automated intelligence verification results and recommendations", ar: "نتائج التحقق التلقائي والتوصيات الذكية" },
  "ai.overall_assessment": { en: "Overall Assessment", ar: "التقييم الإجمالي" },
  "ai.summary_findings": { en: "Summary Findings", ar: "موجز النتائج" },
  "ai.primary_reason": { en: "Primary Analysis Reason", ar: "السبب الرئيسي للتحليل" },
  "ai.next_steps": { en: "Recommended Next Steps", ar: "الخطوات القادمة الموصى بها" },

  // Officer Portal
  "officer.dashboard": { en: "Review dashboard", ar: "لوحة مراجعة الطلبات" },
  "officer.subtitle": { en: "Claim cases from the shared queue or continue your assigned work.", ar: "استلام الحالات من قائمة الانتظار أو مواصلة المهام المسندة." },
  "officer.my_cases": { en: "My assigned cases", ar: "الحالات المسندة إليّ" },
  "officer.queue": { en: "Unclaimed queue", ar: "قائمة الانتظار العامة" },
  "officer.accept": { en: "Accept", ar: "استلام الحالة" },
  "officer.open": { en: "Open", ar: "فتح" },
  "officer.notifications": { en: "Notifications", ar: "الإشعارات" },

  // Admin Portal
  "admin.overview": { en: "Platform overview", ar: "نظرة عامة على المنصة" },
  "admin.subtitle": { en: "Live statistics", ar: "الإحصائيات المباشرة" },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("preferred_lang") as Language;
    if (saved === "en" || saved === "ar") {
      setLangState(saved);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("preferred_lang", newLang);
  };

  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  const t = (key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry.en || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
      <div dir={dir} className={lang === "ar" ? "font-sans rtl" : "font-sans ltr"}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
