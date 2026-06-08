import React from "react";
import { useTranslation } from "react-i18next";

interface FieldErrorProps {
  fieldName: string;
  fieldErrors: Record<string, boolean>;
}

const FieldError: React.FC<FieldErrorProps> = ({ fieldName, fieldErrors }) => {
  const { t } = useTranslation();
  if (!fieldErrors[fieldName]) return null;
  return (
    <span className="text-[10px] font-bold text-red-500 ml-1">
      {t("client_forms.required")}
    </span>
  );
};

export default FieldError;
