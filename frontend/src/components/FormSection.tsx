import React from "react";

interface FormSectionProps {
  children: React.ReactNode;
  className?: string;
}

/** Rounded card wrapper used consistently across all form sections. */
const FormSection: React.FC<FormSectionProps> = ({ children, className = "" }) => (
  <div
    className={`bg-slate-50/50 py-6 px-4 rounded-[2.5rem] border border-slate-50 space-y-6 ${className}`}
  >
    {children}
  </div>
);

export default FormSection;
