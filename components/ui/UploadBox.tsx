"use client";

import { useRef, useState } from "react";

export default function UploadBox({
  folder,
  value,
  onChange,
  hint = "JPG/PNG/PDF, maks 5MB",
}: {
  folder: "products" | "payments" | "kwitansi" | "komisi" | "rab";
  value?: string;
  onChange: (url: string) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    setFileName(file.name);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal mengunggah file");
      }
      const data = await res.json();
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah file");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className="flex cursor-pointer flex-col items-center gap-1.5 rounded border-2 border-dashed border-line bg-paper px-4 py-8 text-center transition hover:border-moss"
      >
        <div className="text-2xl">⇧</div>
        <div className="font-sans text-[0.85rem]">
          {uploading ? "Mengunggah..." : "Klik atau seret foto ke sini"}
        </div>
        <div className="font-mono text-[0.68rem] text-muted">{hint}</div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
      {error && <div className="mt-1.5 font-mono text-[0.7rem] text-danger">{error}</div>}
      {value && !uploading && (
        <div className="mt-2.5 flex items-center gap-3 rounded border border-line bg-panel p-2.5">
          <img src={value} alt="Preview" className="h-12 w-12 rounded object-cover" />
          <div className="font-mono text-[0.72rem] text-muted">{fileName ?? value}</div>
        </div>
      )}
    </div>
  );
}
