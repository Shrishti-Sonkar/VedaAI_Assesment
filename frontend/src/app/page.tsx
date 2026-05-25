"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Download, FilePlus2, Loader2, Plus, RefreshCw, Sparkles, Upload } from "lucide-react";
import { useAssessmentStore } from "@/store/useAssessmentStore";
import type { AssignmentRecord, Difficulty, QuestionConfig, QuestionType } from "@/types";

const questionLabels: Record<QuestionType, string> = {
  mcq: "MCQ",
  short: "Short answer",
  long: "Long answer",
  case: "Case study"
};

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { assignments, selectedId, form, progress, statusMessage, isCreating, error, load, setForm, setSelected, submit } =
    useAssessmentStore();
  const selected = useMemo(() => assignments.find((item) => item.id === selectedId), [assignments, selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  const canSubmit =
    form.title.trim().length > 2 &&
    form.subject.trim().length > 1 &&
    form.classLevel.trim().length > 0 &&
    form.dueDate &&
    form.durationMinutes > 0 &&
    form.questionTypes.every((item) => item.count > 0 && item.marks > 0);

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">V</div>
          <div>
            <strong>VedaAI</strong>
            <span>Assessment Studio</span>
          </div>
        </div>
        <button className="primaryBtn" onClick={() => setModalOpen(true)}>
          <Plus size={18} /> Create Assignment
        </button>
        <nav className="assignmentList" aria-label="Assignments">
          {assignments.length === 0 ? (
            <div className="emptyState">
              <FilePlus2 size={32} />
              <p>No assignments yet.</p>
              <span>Create one to generate a paper.</span>
            </div>
          ) : (
            assignments.map((assignment) => (
              <button
                key={assignment.id}
                className={`assignmentItem ${assignment.id === selectedId ? "active" : ""}`}
                onClick={() => setSelected(assignment.id)}
              >
                <strong>{assignment.title}</strong>
                <span>{assignment.subject}</span>
                <small>{assignment.status}</small>
              </button>
            ))
          )}
        </nav>
        <div className="profile">
          <div className="avatar">SS</div>
          <div>
            <strong>Shrishti Sonkar</strong>
            <span>Teacher workspace</span>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Assignment Creation Flow</h1>
            <p>Create, generate and review structured question papers.</p>
          </div>
          <button className="ghostBtn" onClick={() => selected && window.location.reload()}>
            <RefreshCw size={16} /> Sync
          </button>
        </header>

        {!selected ? (
          <section className="blankCanvas">
            <Sparkles size={42} />
            <h2>Generate an assessment in minutes</h2>
            <p>Start with class details, blueprint and source material. VedaAI turns it into a clean exam-paper layout.</p>
            <button className="primaryBtn compact" onClick={() => setModalOpen(true)}>
              <Plus size={18} /> New Assignment
            </button>
          </section>
        ) : (
          <section className="contentGrid">
            <div className="statusPanel">
              <div>
                <span className="eyebrow">Current Assignment</span>
                <h2>{selected.title}</h2>
                <p>
                  {selected.subject} · {selected.classLevel} · {selected.durationMinutes} min
                </p>
              </div>
              <div className={`statusPill ${selected.status}`}>{selected.status}</div>
              {selected.status !== "completed" && (
                <div className="progressWrap">
                  <div className="progressMeta">
                    <span>{statusMessage}</span>
                    <strong>{progress}%</strong>
                  </div>
                  <div className="progressTrack">
                    <div style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>
            <QuestionPaper assignment={selected} />
          </section>
        )}
      </section>

      {modalOpen && (
        <div className="modalBackdrop" role="dialog" aria-modal="true">
          <form
            className="modal"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSubmit) {
                submit(file);
                setModalOpen(false);
              }
            }}
          >
            <div className="modalHeader">
              <div>
                <span className="eyebrow">Create Assignment</span>
                <h2>Assessment Details</h2>
              </div>
              <button type="button" className="iconBtn" onClick={() => setModalOpen(false)}>
                x
              </button>
            </div>
            <div className="formGrid">
              <label>
                Assignment title
                <input value={form.title} onChange={(event) => setForm({ title: event.target.value })} required />
              </label>
              <label>
                Subject
                <input value={form.subject} onChange={(event) => setForm({ subject: event.target.value })} required />
              </label>
              <label>
                Class
                <input value={form.classLevel} onChange={(event) => setForm({ classLevel: event.target.value })} required />
              </label>
              <label>
                Due date
                <input type="date" value={form.dueDate} onChange={(event) => setForm({ dueDate: event.target.value })} required />
              </label>
              <label>
                Duration
                <input
                  type="number"
                  min={1}
                  value={form.durationMinutes}
                  onChange={(event) => setForm({ durationMinutes: Number(event.target.value) })}
                />
              </label>
              <label className="fileDrop">
                <Upload size={18} />
                <span>{file ? file.name : "Upload PDF or text file"}</span>
                <input type="file" accept=".txt,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} />
              </label>
            </div>
            <label>
              Additional instructions
              <textarea value={form.instructions} onChange={(event) => setForm({ instructions: event.target.value })} rows={3} />
            </label>
            <label>
              Source material
              <textarea value={form.sourceText} onChange={(event) => setForm({ sourceText: event.target.value })} rows={4} />
            </label>
            <BlueprintEditor configs={form.questionTypes} onChange={(questionTypes) => setForm({ questionTypes })} />
            {error && <p className="error">{error}</p>}
            <div className="modalActions">
              <button type="button" className="ghostBtn" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primaryBtn compact" disabled={!canSubmit || isCreating}>
                {isCreating ? <Loader2 className="spin" size={17} /> : <Sparkles size={17} />}
                Generate Paper
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function BlueprintEditor({ configs, onChange }: { configs: QuestionConfig[]; onChange: (configs: QuestionConfig[]) => void }) {
  const update = (index: number, patch: Partial<QuestionConfig>) => {
    onChange(configs.map((config, current) => (current === index ? { ...config, ...patch } : config)));
  };
  return (
    <div className="blueprint">
      <div className="blueprintHeader">
        <strong>Question Blueprint</strong>
        <button
          type="button"
          className="miniBtn"
          onClick={() => onChange([...configs, { type: "short", count: 2, marks: 3, difficulty: "medium" }])}
        >
          <Plus size={14} /> Add
        </button>
      </div>
      {configs.map((config, index) => (
        <div className="blueprintRow" key={`${config.type}-${index}`}>
          <select value={config.type} onChange={(event) => update(index, { type: event.target.value as QuestionType })}>
            {Object.entries(questionLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input type="number" min={1} value={config.count} onChange={(event) => update(index, { count: Number(event.target.value) })} />
          <input type="number" min={1} value={config.marks} onChange={(event) => update(index, { marks: Number(event.target.value) })} />
          <select value={config.difficulty} onChange={(event) => update(index, { difficulty: event.target.value as Difficulty })}>
            <option value="easy">Easy</option>
            <option value="medium">Moderate</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      ))}
    </div>
  );
}

function QuestionPaper({ assignment }: { assignment: AssignmentRecord }) {
  const downloadPdf = async () => {
    const [{ jsPDF }, html2canvas] = await Promise.all([import("jspdf"), import("html2canvas")]);
    const node = document.getElementById("paper");
    if (!node) return;
    const canvas = await html2canvas.default(node, { scale: 2, backgroundColor: "#ffffff" });
    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, width, height);
    pdf.save(`${assignment.title.replace(/\s+/g, "-").toLowerCase()}-paper.pdf`);
  };

  if (!assignment.result) {
    return (
      <div className="paperPlaceholder">
        <Loader2 className="spin" size={36} />
        <h2>Generating question paper</h2>
        <p>Prompt is structured, queued and processed in the background.</p>
      </div>
    );
  }

  return (
    <article className="paperShell">
      <div className="actionBar">
        <button className="ghostBtn" onClick={downloadPdf}>
          <Download size={16} /> Download PDF
        </button>
        <div>
          <Calendar size={16} />
          Due {new Date(assignment.dueDate).toLocaleDateString()}
        </div>
      </div>
      <div className="paper" id="paper">
        <header className="paperHeader">
          <h2>{assignment.result.schoolName}</h2>
          <p>{assignment.result.paperTitle}</p>
          <div>
            <span>Time: {assignment.result.durationMinutes} minutes</span>
            <span>Max Marks: {assignment.result.totalMarks}</span>
          </div>
        </header>
        <section className="studentInfo">
          <span>Name: ____________________</span>
          <span>Roll No: ____________________</span>
          <span>Section: ____________________</span>
        </section>
        {assignment.result.sections.map((section) => (
          <section className="questionSection" key={section.title}>
            <h3>{section.title}</h3>
            <p>{section.instruction}</p>
            <ol>
              {section.questions.map((question) => (
                <li key={question.id}>
                  <div>
                    <span className={`difficulty ${question.difficulty}`}>{question.difficulty}</span>
                    <strong>{question.marks} marks</strong>
                  </div>
                  <p>{question.text}</p>
                  {question.type === "mcq" && question.options && question.options.length > 0 && (
                    <ol className="mcqOptions" type="A" style={{ paddingLeft: "1.5rem", marginTop: "0.5rem" }}>
                      {question.options.map((opt, oi) => (
                        <li key={oi} style={{ marginBottom: "0.25rem" }}>{opt.slice(3)}</li>
                      ))}
                    </ol>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </article>
  );
}
