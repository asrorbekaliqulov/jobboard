import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  maxLength?: number;
  accentColor?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  maxLength = 600,
  accentColor = "blue"
}) => {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = (prefix: string, suffix: string = prefix) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selectedText = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);

    const newValue = `${before}${prefix}${selectedText}${suffix}${after}`;

    if (maxLength && newValue.length > maxLength) return;

    onChange(newValue);

    // Reset focus and selection
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const ringColor = accentColor === 'purple' ? 'focus:ring-purple-500' : 'focus:ring-blue-500';
  const btnBg = accentColor === 'purple' ? 'hover:bg-purple-50 text-purple-600' : 'hover:bg-blue-50 text-blue-600';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 p-1 bg-gray-100/50 rounded-xl border border-gray-100">
        <button
          type="button"
          onClick={() => applyFormat('**', '**')}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors font-black text-sm ${btnBg}`}
          title={t('editor.bold')}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => applyFormat('\n• ', '')}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors text-sm ${btnBg}`}
          title={t('editor.bullet_point')}
        >
          <i className="fa-solid fa-list-ul"></i>
        </button>
        <div className="flex-1"></div>
        <span className={`text-[10px] font-bold mr-2 ${value.length > maxLength * 0.9 ? 'text-red-500' : 'text-gray-400'}`}>
          {value.length}/{maxLength}
        </span>
      </div>
      <textarea
        ref={textareaRef}
        placeholder={placeholder}
        className={`w-full border-none rounded-2xl p-4 bg-gray-50 h-40 outline-none text-sm font-medium transition-all ${ringColor} resize-none`}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default RichTextEditor;
