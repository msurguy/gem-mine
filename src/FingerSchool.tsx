import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  ArrowRight,
  Check,
  Hand,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  acceptsFingerKey,
  fingerForKey,
  fingerLessons,
  initialFingerPractice,
  keyLabel,
} from "./fingers";
import type { FingerPractice } from "./fingers";
import { chime } from "./audio";

import { HandsKeyboard, type Phase } from "./HandsKeyboard";

export default function FingerSchool({
  saved,
  onSave,
  sound,
  onMine,
}: {
  saved?: FingerPractice;
  onSave: (next: FingerPractice) => void;
  sound: boolean;
  onMine: () => void;
}) {
  const progress = saved ?? initialFingerPractice(),
    lesson = fingerLessons.find((l) => l.id === progress.lessonId)!;
  const [mode, setMode] = useState<"watch" | "practice">("watch"),
    [demoIndex, setDemoIndex] = useState(0),
    [fullKeyboard, setFullKeyboard] = useState(false),
    [running, setRunning] = useState(false),
    [phase, setPhase] = useState<Phase>("home"),
    [focused, setFocused] = useState(false),
    [success, setSuccess] = useState(false),
    [feedback, setFeedback] = useState("");
  const area = useRef<HTMLDivElement>(null),
    accepted = useRef(false),
    focusRequested = useRef(false),
    demoButton = useRef<HTMLButtonElement>(null);
  const done = mode === "practice" && progress.step === lesson.keys.length;
  const index =
      mode === "watch"
        ? demoIndex
        : Math.min(progress.step, lesson.keys.length - 1),
    target = lesson.keys[index],
    finger = fingerForKey(target)!;
  useLayoutEffect(() => {
    if (
      focusRequested.current &&
      mode === "practice" &&
      !done &&
      area.current
    ) {
      focusRequested.current = false;
      area.current.focus();
    }
  });
  useEffect(() => {
    if (!running) {
      setPhase("home");
      return;
    }
    setPhase("reach");
    const press = setTimeout(() => setPhase("press"), 600),
      home = setTimeout(() => setPhase("home"), 1250),
      next = setTimeout(
        () => setDemoIndex((i) => (i + 1) % lesson.keys.length),
        2050,
      );
    return () => {
      clearTimeout(press);
      clearTimeout(home);
      clearTimeout(next);
    };
  }, [running, demoIndex, lesson.id, lesson.keys.length]);
  useEffect(() => {
    const stop = () => {
      setRunning(false);
      setFocused(false);
      area.current?.blur();
    };
    const hide = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  // Return the demonstrated finger home after a successful physical key press.
  useEffect(() => {
    if (!success) return;
    const timeout = setTimeout(() => setPhase("home"), 600);
    return () => clearTimeout(timeout);
  }, [success]);
  function changeMode(next: "watch" | "practice") {
    focusRequested.current = next === "practice";
    if (next === "practice" && mode === "practice") area.current?.focus();
    setRunning(false);
    setPhase("home");
    setMode(next);
    setSuccess(false);
    accepted.current = false;
    setFeedback("");
    setFocused(false);
  }
  function choose(id: string) {
    focusRequested.current = mode === "practice";
    setRunning(false);
    setDemoIndex(0);
    setPhase("home");
    setSuccess(false);
    accepted.current = false;
    setFeedback("");
    onSave({ ...progress, lessonId: id, step: 0 });
  }
  function handleKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target !== area.current) return;
    if (e.key === "Escape") {
      e.currentTarget.blur();
      return;
    }
    if (!acceptsFingerKey(e.nativeEvent)) return;
    e.preventDefault();
    if (success || accepted.current || done) return;
    if (e.key.toLowerCase() !== target) {
      setFeedback(
        `Try ${keyLabel(target)} with your ${finger.name.toLowerCase()}. No hurry.`,
      );
      return;
    }
    accepted.current = true;
    setSuccess(true);
    setPhase("press");
    setFeedback(
      `Nice! Bring your ${finger.name.toLowerCase()} back to ${keyLabel(finger.home)}.`,
    );
    if (sound) chime("hit");
  }
  function next() {
    const step = progress.step + 1,
      completed =
        step === lesson.keys.length
          ? [...new Set([...progress.completed, lesson.id])]
          : progress.completed;
    onSave({ ...progress, step, completed });
    setSuccess(false);
    accepted.current = false;
    setFeedback("");
    setPhase("home");
    if (step < lesson.keys.length) area.current?.focus();
  }
  return (
    <div className="finger-school">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span />
            GREAT ADVENTURES START WITH LITTLE HANDS
          </div>
          <h1>Finger school</h1>
          <p>
            Watch a finger reach, tap, and come home. Then try it on your
            keyboard.
          </p>
        </div>
        <span className="finger-badge">
          <Hand size={20} /> F + J are your anchors
        </span>
      </div>
      <div className="finger-lessons" role="group" aria-label="Finger lessons">
        {fingerLessons.map((l, i) => (
          <button
            key={l.id}
            className={l.id === lesson.id ? "selected" : ""}
            aria-pressed={l.id === lesson.id}
            onClick={() => choose(l.id)}
          >
            <span>
              {progress.completed.includes(l.id) ? <Check size={17} /> : i + 1}
            </span>
            <strong>{l.title}</strong>
            {progress.completed.includes(l.id) && (
              <span className="sr-only">Completed</span>
            )}
          </button>
        ))}
      </div>
      <section
        className="finger-workshop"
        aria-labelledby="finger-lesson-title"
      >
        <div className="finger-workshop-top">
          <div>
            <h2 id="finger-lesson-title">{lesson.title}</h2>
            <p>{lesson.description}</p>
          </div>
          <div
            className="finger-mode"
            role="group"
            aria-label="Demonstration or practice"
          >
            <button
              aria-pressed={mode === "watch"}
              className={mode === "watch" ? "active" : ""}
              onClick={() => changeMode("watch")}
            >
              <Play size={16} />
              Watch
            </button>
            <button
              aria-pressed={mode === "practice"}
              className={mode === "practice" ? "active" : ""}
              onClick={() => changeMode("practice")}
            >
              <Hand size={16} />
              Your turn
            </button>
          </div>
        </div>
        <div
          className="finger-diagram-wrap"
          onClick={() => {
            if (mode === "practice") area.current?.focus();
          }}
        >
          <HandsKeyboard target={target} phase={phase} full={fullKeyboard} />
          <div className="diagram-toolbar">
            <div className="diagram-caption">
              <span style={{ background: finger.color }} />
              <strong>{finger.name}</strong>
              <span>
                Home: <kbd>{keyLabel(finger.home)}</kbd>
              </span>
            </div>
            <button
              type="button"
              className="map-switch"
              aria-pressed={fullKeyboard}
              onClick={() => setFullKeyboard((v) => !v)}
            >
              Full keyboard
            </button>
          </div>
        </div>
        <div className="finger-action-panel">
          {mode === "watch" ? (
            <>
              <div className="finger-instruction">
                <span className="finger-target">{keyLabel(target)}</span>
                <div>
                  <strong>
                    {phase === "home"
                      ? "Come home and relax."
                      : phase === "press"
                        ? `Tap ${keyLabel(target)} gently.`
                        : `Reach for ${keyLabel(target)}.`}
                  </strong>
                  <p>
                    {finger.name} · {keyLabel(finger.home)} → {keyLabel(target)}{" "}
                    → {keyLabel(finger.home)}
                  </p>
                </div>
              </div>
              <div className="finger-buttons">
                <button
                  ref={demoButton}
                  className="primary"
                  onClick={() => setRunning((v) => !v)}
                >
                  {running ? (
                    <>
                      <Pause size={16} />
                      Pause demo
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      Play demo
                    </>
                  )}
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setRunning(false);
                    setDemoIndex((i) => (i + 1) % lesson.keys.length);
                  }}
                >
                  Next key <ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : done ? (
            <div className="finger-complete" role="status">
              <Sparkles size={28} />
              <div>
                <h3>Your fingers found their home!</h3>
                <p>
                  Lesson saved. Relax your hands, then try another lesson or
                  head to the mine.
                </p>
              </div>
              <button className="secondary" onClick={() => choose(lesson.id)}>
                <RotateCcw size={16} />
                Practice again
              </button>
              <button className="primary" onClick={onMine}>
                Go mining <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="finger-practice">
              <div className="finger-practice-heading">
                <span>YOUR TURN</span>
                <strong>
                  {progress.step + 1} / {lesson.keys.length}
                </strong>
              </div>
              <div
                ref={area}
                role="group"
                aria-label={`Finger practice. Press ${keyLabel(target)} with your ${finger.name.toLowerCase()}. Escape pauses.`}
                tabIndex={0}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={handleKey}
                className={`finger-practice-input ${focused ? "focused" : ""}`}
              >
                <span className="finger-target">
                  {success ? <Check size={28} /> : keyLabel(target)}
                </span>
                <div>
                  <strong>
                    {success
                      ? "Good tap. Now come home."
                      : `Press ${keyLabel(target)} with your ${finger.name.toLowerCase()}.`}
                  </strong>
                  <p>
                    {focused
                      ? "Keep the other fingers resting on their home keys."
                      : "Click here or use Tab to start practicing."}
                  </p>
                </div>
                {!focused && <Play size={20} />}
              </div>
              <div className="finger-practice-bottom">
                <p role="status">
                  {feedback || "One gentle press. No holding the key down."}
                </p>
                <button className="primary" disabled={!success} onClick={next}>
                  {progress.step === lesson.keys.length - 1
                    ? "Finish lesson"
                    : "I’m home. Next key"}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
      {mode === "watch" && (
        <p className="finger-parent-note">
          Watching the demo? Choose <strong>Your turn</strong> to practice with
          your keyboard.
        </p>
      )}
    </div>
  );
}
