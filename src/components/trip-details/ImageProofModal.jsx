import AppModal from "../ui/AppModal";

export default function ImageProofModal({ isOpen, onClose, imageUrl, title = "إثبات التحويل" }) {
  return (
    <AppModal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      {!imageUrl ? (
        <p className="text-center text-sm text-gray-400 py-10">لا توجد صورة إثبات</p>
      ) : (
        <div className="space-y-3">
          <img
            src={imageUrl}
            alt={title}
            className="w-full max-h-[70vh] object-contain rounded-xl border border-gray-100 bg-gray-50"
          />
          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="block text-center text-xs text-[#c9a84c] hover:underline"
          >
            فتح الصورة في تبويب جديد
          </a>
        </div>
      )}
    </AppModal>
  );
}
