"use client";

import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  type ColumnDef,
} from "@tanstack/react-table";
import examplesData from "../../tone-agent/examples.json";
import TweetCard from "../components/TweetCard";

/* ── types ── */
interface Option { label: string | null; text: string; }
interface Example {
  id: string;
  category: string;
  status: string;
  approved_option?: string | null;
  options: Option[];
  divij_version?: string;
  divij_status?: string;
  divij_edit_notes?: string;
}

/* ── data ── */
const examples = examplesData.examples as Example[];
const annotatedPairs  = examples.filter((e) => e.divij_status === "approved");
const approvedCaptions = examples.filter((e) => e.status === "approved" && !e.divij_version);

function getApprovedText(e: Example): string {
  if (e.approved_option) {
    const opt = e.options.find((o) => o.label === e.approved_option);
    return opt?.text ?? e.options[0].text;
  }
  return e.options[0].text;
}

/* ── dummy columns (TanStack Table requires them; we render ourselves) ── */
const pairCols: ColumnDef<Example>[]    = [{ id: "item", accessorFn: (r) => r }];
const captionCols: ColumnDef<Example>[] = [{ id: "item", accessorFn: (r) => r }];

/* ── PaginationBar ── */
function PaginationBar({ table }: { table: ReturnType<typeof useReactTable<Example>> }) {
  const { pageIndex } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageSize = table.getState().pagination.pageSize;
  const start = pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, totalRows);

  if (pageCount <= 1) return null;

  return (
    <div className="pagination">
      <button
        className="page-btn"
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
      >
        ← Prev
      </button>

      <span className="page-info">
        {start}–{end} of {totalRows}
      </span>

      {Array.from({ length: pageCount }, (_, i) => (
        <button
          key={i}
          className={`page-num${pageIndex === i ? " active" : ""}`}
          onClick={() => table.setPageIndex(i)}
        >
          {i + 1}
        </button>
      ))}

      <button
        className="page-btn"
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
      >
        Next →
      </button>
    </div>
  );
}

/* ── Page ── */
export default function LibraryPage() {
  const pairsTable = useReactTable({
    data: annotatedPairs,
    columns: pairCols,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const captionsTable = useReactTable({
    data: approvedCaptions,
    columns: captionCols,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const visiblePairs    = pairsTable.getRowModel().rows.map((r) => r.original);
  const visibleCaptions = captionsTable.getRowModel().rows.map((r) => r.original);

  /* global offset so TweetCard engagement numbers don't repeat */
  const captionOffset = annotatedPairs.length;

  return (
    <main className="wrap">
      <header>
        <span className="accent-label">approved posts & rules</span>
        <h1>Voice Library</h1>
        <p className="sub">Approved posts with the rules that made them pass.</p>
      </header>

      {/* ── Annotated Rewrites ── */}
      <section className="lib-section">
        <div className="lib-section-head">
          <h2 className="section-title">Annotated Rewrites</h2>
          <span className="lib-count">{annotatedPairs.length} pairs</span>
        </div>
        <p className="lib-section-sub">
          Original draft on the left. Approved version as published. Rule violations called out below.
        </p>

        {visiblePairs.map((e, i) => {
          const globalIdx = pairsTable.getState().pagination.pageIndex * 10 + i;
          return (
            <div key={e.id} className="lib-pair">
              <div className="lib-category">{e.category}</div>
              <div className="lib-cols">
                <div>
                  <div className="lib-col-label before">Original draft</div>
                  <div className="lib-before-box">
                    <pre className="lib-text lib-text-before">{e.options[0].text}</pre>
                  </div>
                </div>
                <div>
                  <div className="lib-col-label after">Approved version</div>
                  {e.divij_version && <TweetCard text={e.divij_version} idx={globalIdx} />}
                </div>
              </div>
              {e.divij_edit_notes && (
                <div className="lib-notes">
                  <strong>Why it passed:</strong> {e.divij_edit_notes}
                </div>
              )}
            </div>
          );
        })}

        <PaginationBar table={pairsTable} />
      </section>

      {/* ── Approved Captions ── */}
      <section className="lib-section">
        <div className="lib-section-head">
          <h2 className="section-title">Approved Captions</h2>
          <span className="lib-count">{approvedCaptions.length} posts</span>
        </div>
        <p className="lib-section-sub">
          Short-form posts that passed as-is. Design tweets and experiments.
        </p>

        <div className="lib-caption-grid">
          {visibleCaptions.map((e, i) => {
            const globalIdx = captionOffset + captionsTable.getState().pagination.pageIndex * 10 + i;
            return (
              <TweetCard key={e.id} text={getApprovedText(e)} idx={globalIdx} />
            );
          })}
        </div>

        <PaginationBar table={captionsTable} />
      </section>
    </main>
  );
}
