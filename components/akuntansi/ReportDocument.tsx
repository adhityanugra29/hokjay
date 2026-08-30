import { formatDateFull } from "@/lib/format";

/**
 * "Paper" document card each Akuntansi report renders inside — id="report-doc"
 * lives here (not on any inner panel) since DownloadReportButton's html2pdf
 * call targets exactly this element.
 */
export default function ReportDocument({
  title,
  periodLabel,
  children,
  interpretiveNote,
}: {
  title: string;
  periodLabel: string;
  children: React.ReactNode;
  interpretiveNote?: string;
}) {
  return (
    <div id="report-doc" className="max-w-[700px] border border-line bg-white p-8 shadow-sm md:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">CV Horeca Jaya</div>
          <h2 className="mt-1.5 font-sans text-[1.35rem] font-extrabold">{title}</h2>
          <div className="mt-1 font-mono text-[0.75rem] text-muted">{periodLabel}</div>
        </div>
        <div className="text-right font-mono text-[10.5px] leading-relaxed text-muted">
          Dibentuk otomatis
          <br />
          {formatDateFull(new Date())}
        </div>
      </div>

      {children}

      {interpretiveNote && (
        <div className="mt-5 border-l-4 border-accent bg-surface p-3.5 font-sans text-[0.8rem] leading-relaxed">
          {interpretiveNote}
        </div>
      )}
    </div>
  );
}
