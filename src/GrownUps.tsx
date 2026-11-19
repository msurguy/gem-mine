import { useEffect, useRef, useState } from "react";
import type { Dispatch, ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  Download,
  Keyboard,
  Plus,
  RotateCcw,
  Settings2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { formatDate, parseWords } from "./curriculum";
import { initialProgress } from "./game";
import type { Action, ProgressV2 } from "./game";
import { download, parseBackup } from "./persistence";
import type { BackupV2 } from "./persistence";

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose} aria-labelledby="dialog-title">
      <button
        className="icon-button dialog-close"
        aria-label="Close dialog"
        onClick={onClose}
      >
        <X size={20} />
      </button>
      <h2 id="dialog-title">{title}</h2>
      {children}
    </dialog>
  );
}
export default function GrownUps({
  progress,
  dispatch,
  exportSave,
  onRecover,
  corrupt,
}: {
  progress: ProgressV2;
  dispatch: Dispatch<Action>;
  exportSave: () => void;
  onRecover: () => void;
  corrupt: string | null;
}) {
  const [incoming, setIncoming] = useState<BackupV2 | null>(null),
    [error, setError] = useState(""),
    [reset, setReset] = useState(false),
    [title, setTitle] = useState("School spelling"),
    [date, setDate] = useState(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }),
    [raw, setRaw] = useState(""),
    [preview, setPreview] = useState(false),
    [notice, setNotice] = useState("");
  const words = parseWords(raw),
    stats = Object.values(progress.keyStats),
    attempts = stats.reduce((sum, s) => sum + s.attempts, 0),
    correct = stats.reduce((sum, s) => sum + s.correct, 0),
    wordStats = Object.values(progress.stats),
    spells = wordStats.reduce((sum, s) => sum + s.spellingAttempts, 0),
    unaided = wordStats.reduce((sum, s) => sum + s.unaided, 0);
  const wordValid =
    words.length > 0 &&
    words.length <= 100 &&
    words.every(
      (w) => /^[A-Za-z]+(?:'[A-Za-z]+)*$/.test(w) && w.length <= 32,
    ) &&
    title.trim().length > 0 &&
    title.trim().length <= 80 &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date));
  async function readFile(file?: File) {
    if (!file) return;
    setError("");
    try {
      if (file.size > 2_000_000)
        throw new Error("Choose a backup smaller than 2 MB.");
      setIncoming(parseBackup(await file.text()));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <h1>Grown-ups</h1>
      <p className="lede">
        See how practice is going, add school words, and keep a backup.
      </p>
      <div className="grownups-page">
        <div className="parent-stat-grid">
          <StatCard
            label="Typing accuracy"
            value={
              attempts ? `${Math.round((correct / attempts) * 100)}%` : "—"
            }
            detail={`${correct} correct of ${attempts} key presses`}
          />
          <StatCard
            label="Unaided spelling"
            value={spells ? `${Math.round((unaided / spells) * 100)}%` : "—"}
            detail={`${unaided} of ${spells} completed spelling words`}
          />
          <StatCard
            label="Levels finished"
            value={String(progress.runs)}
            detail={`${progress.rocks} rocks typed · ${Object.values(progress.levelStars).reduce((a, b) => a + b, 0)} stars`}
          />
        </div>
        <div className="parent-grid">
          <section className="panel">
            <h2>
              <BookOpen size={21} />
              Add a week of words
            </h2>
            <p>
              Paste just the words, separated by commas or new lines. Lists stay
              on this device and travel with backups.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPreview(true);
              }}
            >
              <div className="form-row">
                <label>
                  List title
                  <input
                    value={title}
                    maxLength={80}
                    required
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setPreview(false);
                    }}
                  />
                </label>
                <label>
                  Week beginning
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setPreview(false);
                    }}
                  />
                </label>
              </div>
              <label>
                Spelling words
                <textarea
                  rows={4}
                  value={raw}
                  maxLength={4000}
                  placeholder="rock, gem, dig, shine"
                  onChange={(e) => {
                    setRaw(e.target.value);
                    setPreview(false);
                  }}
                />
              </label>
              <small>
                1–100 words. Letters and apostrophes; up to 32 characters per
                word.
              </small>
              <button className="secondary" disabled={!wordValid} type="submit">
                Preview {words.length || ""} words <ArrowRight size={16} />
              </button>
            </form>
            {preview && wordValid && (
              <div className="list-preview">
                <strong>
                  {title} · {formatDate(date)}
                </strong>
                <div className="word-chips">
                  {words.map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    if (progress.customLists.length >= 200) {
                      setError(
                        "You have reached the limit of 200 custom lists.",
                      );
                      return;
                    }
                    dispatch({
                      type: "list",
                      list: {
                        id: `custom-${crypto.randomUUID()}`,
                        title: title.trim(),
                        date,
                        words,
                      },
                    });
                    setRaw("");
                    setPreview(false);
                    setNotice(
                      "Word list added. It is now in “My school words” on the map.",
                    );
                  }}
                >
                  <Plus size={16} />
                  Add this list
                </button>
              </div>
            )}
            <div role="status" className="success-notice">
              {notice}
            </div>
            {progress.customLists.length > 0 && (
              <details>
                <summary>
                  {progress.customLists.length} custom word lists
                </summary>
                {progress.customLists.map((l) => (
                  <p key={l.id} className="list-row">
                    {formatDate(l.date)} · {l.title} · {l.words.length} words
                    <button
                      className="text-button danger"
                      aria-label={`Remove ${l.title}, ${formatDate(l.date)}`}
                      onClick={() =>
                        dispatch({ type: "remove-list", id: l.id })
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </p>
                ))}
              </details>
            )}
          </section>
          <div className="parent-stack">
            <section className="panel">
              <h2>
                <Download size={21} />
                Keep your discoveries safe
              </h2>
              <p>
                Progress belongs to this browser and website address. Download a
                backup to move devices or keep it safe before clearing browser
                data.
              </p>
              <div className="backup-actions">
                <button className="primary" onClick={exportSave}>
                  <Download size={17} />
                  Export progress
                </button>
                <label className="secondary upload-label">
                  <Upload size={17} />
                  Import progress
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      void readFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {corrupt && (
                <button
                  className="secondary"
                  onClick={() => download("gem-mine-recovery.json", corrupt)}
                >
                  Download preserved original
                </button>
              )}
              {error && (
                <p className="error-message" role="alert">
                  {error}
                </p>
              )}
            </section>
            <section className="panel">
              <h2>
                <Settings2 size={21} />
                Make it comfortable
              </h2>
              <label className="toggle-label">
                <span>
                  Gentle sound effects
                  <small>Spelling words are still spoken aloud.</small>
                </span>
                <input
                  type="checkbox"
                  checked={progress.settings.sound}
                  onChange={(e) =>
                    dispatch({
                      type: "settings",
                      settings: { sound: e.target.checked },
                    })
                  }
                />
              </label>
              <label className="toggle-label">
                <span>
                  Animations
                  <small>
                    Also respects your device’s reduced-motion setting.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={progress.settings.motion}
                  onChange={(e) =>
                    dispatch({
                      type: "settings",
                      settings: { motion: e.target.checked },
                    })
                  }
                />
              </label>
              <label className="toggle-label">
                <span>
                  Show hands on the keyboard
                  <small>The moving hands that point to each key.</small>
                </span>
                <input
                  type="checkbox"
                  checked={progress.settings.showHands}
                  onChange={(e) =>
                    dispatch({
                      type: "settings",
                      settings: { showHands: e.target.checked },
                    })
                  }
                />
              </label>
              <label className="toggle-label">
                <span>
                  Open every level
                  <small>
                    Skip ahead on the map without finishing earlier levels.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={progress.settings.unlockAll}
                  onChange={(e) =>
                    dispatch({
                      type: "settings",
                      settings: { unlockAll: e.target.checked },
                    })
                  }
                />
              </label>
            </section>
          </div>
        </div>
        <section className="panel practice-report">
          <h2>
            <Keyboard size={21} />
            Keys to practice
          </h2>
          <p>
            Typing accuracy counts every key press in key and word levels.
            Spelling success counts words spelled on the first try without “Show
            me”.
          </p>
          <div className="key-report">
            {Object.entries(progress.keyStats)
              .sort(
                (a, b) =>
                  a[1].correct / a[1].attempts - b[1].correct / b[1].attempts,
              )
              .map(([key, s]) => (
                <div key={key}>
                  <kbd>{key.toUpperCase()}</kbd>
                  <strong>{Math.round((s.correct / s.attempts) * 100)}%</strong>
                  <small>{s.attempts} tries</small>
                </div>
              ))}
            {!stats.length && (
              <p>
                No key presses yet. The first level is a great place to start.
              </p>
            )}
          </div>
        </section>
        <section className="panel">
          <h2>Word practice</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Word</th>
                  <th>Times typed</th>
                  <th>Unaided spelling</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(progress.stats)
                  .filter(([w]) => w.length > 1)
                  .map(([w, s]) => (
                    <tr key={w}>
                      <td>{w}</td>
                      <td>{s.completed}</td>
                      <td>
                        {s.unaided} / {s.spellingAttempts}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <div className="reset-row">
        <span>
          Want a fresh start? This clears this device’s game progress and custom
          words.
        </span>
        <button className="text-button danger" onClick={() => setReset(true)}>
          <RotateCcw size={15} />
          Reset progress
        </button>
      </div>
      {incoming && (
        <Modal
          title="Restore this adventure?"
          onClose={() => setIncoming(null)}
        >
          <p>
            This backup contains{" "}
            <strong>{incoming.progress.runs} finished levels</strong>,{" "}
            <strong>{incoming.progress.gems} gems</strong>, and{" "}
            <strong>{incoming.progress.customLists.length} custom lists</strong>
            .
          </p>
          <p className="muted">
            Exported {new Date(incoming.exportedAt).toLocaleString()}. Restoring
            replaces all current progress on this device.
          </p>
          <button className="secondary full" onClick={exportSave}>
            <Download size={17} />
            Back up current progress first
          </button>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setIncoming(null)}>
              Cancel
            </button>
            <button
              className="primary"
              onClick={() => {
                dispatch({ type: "replace", progress: incoming.progress });
                onRecover();
                setIncoming(null);
                setNotice("Progress restored. Your adventure is ready.");
              }}
            >
              Replace & restore
            </button>
          </div>
        </Modal>
      )}
      {reset && (
        <Modal title="Start a new adventure?" onClose={() => setReset(false)}>
          <p>
            This removes your stars, gems, tools, finds, camp stickers, and
            custom word lists from this device.
          </p>
          <button className="secondary full" onClick={exportSave}>
            <Download size={17} />
            Export a backup first
          </button>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setReset(false)}>
              Keep my adventure
            </button>
            <button
              className="danger-button"
              onClick={() => {
                dispatch({ type: "replace", progress: initialProgress() });
                onRecover();
                setReset(false);
                setNotice("A fresh adventure is ready.");
              }}
            >
              Reset everything
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
