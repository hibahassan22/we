import { useState, useEffect } from "react";
import AppModal, { ModalField, ModalActions, modalInputClass } from "../ui/AppModal";
import { useToast } from "../../lib/toast.jsx";
import { updateRole } from "../../services/roleService.js";

export default function EditRoleModal({ isOpen, onClose, role, onSaved }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !role) return;
    setName(role.name ?? "");
    setDescription(role.description ?? "");
  }, [isOpen, role]);

  if (!role) return null;

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("اسم الدور مطلوب");
      return;
    }
    setSaving(true);
    try {
      await updateRole(role.id, {
        name: trimmedName,
        description: description.trim(),
      });
      toast.success(`تم تحديث الدور «${trimmedName}»`);
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message || "فشل تحديث الدور");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="تعديل الدور"
      subtitle={role.name}
      isSubmitting={saving}
      size="md"
    >
      <div className="space-y-4">
        <ModalField label="اسم الدور" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={modalInputClass}
            placeholder="مثال: Sales"
            disabled={saving}
            dir="rtl"
          />
        </ModalField>
        <ModalField label="وصف الدور">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={modalInputClass}
            placeholder="وصف مختصر للدور"
            disabled={saving}
            dir="rtl"
          />
        </ModalField>
      </div>
      <ModalActions
        primaryLabel="حفظ التعديلات"
        onPrimary={handleSave}
        onSecondary={onClose}
        isSubmitting={saving}
      />
    </AppModal>
  );
}
