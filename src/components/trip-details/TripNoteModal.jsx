import { useState } from "react";
import AppModal, { ModalField, ModalActions, modalInputClass } from "../ui/AppModal";

/**
 * TripNoteModal
 * Props:
 *   isOpen       {boolean}
 *   onClose      {() => void}
 *   onSave       {(text: string) => void}
 */
export default function TripNoteModal({ isOpen, onClose, onSave }) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!text.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      onSave(text.trim());
      setText("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setText("");
    onClose();
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={handleClose}
      title="إضافة ملاحظة"
      isSubmitting={isSubmitting}
    >
      <ModalField label="نص الملاحظة" required>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="اكتب الملاحظة هنا..."
          className={`${modalInputClass} resize-none`}
          dir="rtl"
          disabled={isSubmitting}
        />
      </ModalField>
      <div className="mt-4">
        <ModalActions
          primaryLabel="حفظ"
          onPrimary={handleSave}
          onSecondary={handleClose}
          isSubmitting={isSubmitting}
          primaryDisabled={!text.trim()}
        />
      </div>
    </AppModal>
  );
}
