import { useEffect, useMemo, useState } from "react";

const emptyQuestion = {
  questionText: "",
  choices: ["", "", "", ""],
  correctAnswerIndex: 0,
};

function SetupPhase({
  lobby,
  playerRole,
  playerId,
  gameSettings,
  roundState,
  status,
  socket,
}) {
  const [questionForm, setQuestionForm] = useState(emptyQuestion);
  const [submittedQuestions, setSubmittedQuestions] = useState([]);
  const [submitState, setSubmitState] = useState({
    type: "idle",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentRound = roundState?.currentRound || 1;
  const totalRounds = roundState?.totalRounds || gameSettings?.rounds || 4;
  const requiredCount =
    roundState?.questionsPerPlayerPerRound ||
    gameSettings?.questionsPerPlayerPerRound ||
    2;

  const playerProgress = Array.isArray(roundState?.playerProgress)
    ? roundState.playerProgress
    : [];
  const currentPlayerProgress = playerProgress.find(
    (player) => player.playerId === playerId
  );
  const submissionCount =
    currentPlayerProgress?.submittedCount ?? submittedQuestions.length;

  const remainingCount = Math.max(requiredCount - submissionCount, 0);
  const canSubmitMore = submissionCount < requiredCount;

  const progressLabel = useMemo(
    () => `${Math.min(submissionCount, requiredCount)}/${requiredCount}`,
    [requiredCount, submissionCount]
  );

  function updateChoice(index, value) {
    setQuestionForm((currentForm) => ({
      ...currentForm,
      choices: currentForm.choices.map((choice, choiceIndex) =>
        choiceIndex === index ? value : choice
      ),
    }));
  }

  function resetForm() {
    setQuestionForm(emptyQuestion);
  }

  useEffect(() => {
    function handleQuestionSaved(savedQuestion) {
      if (
        savedQuestion?.gameId !== lobby?.gameId ||
        savedQuestion?.playerId !== playerId ||
        savedQuestion?.round !== currentRound
      ) {
        return;
      }

      setSubmittedQuestions((currentQuestions) => [
        ...currentQuestions,
        {
          id: crypto.randomUUID(),
          question: savedQuestion.question,
          choices: savedQuestion.choices,
          correctIndex: savedQuestion.correctIndex,
        },
      ]);
      resetForm();
      setIsSubmitting(false);
      setSubmitState({
        type: "success",
        message: "Question saved for this round.",
      });
    }

    function handleQuestionError(message) {
      setIsSubmitting(false);
      setSubmitState({
        type: "error",
        message,
      });
    }

    socket.on("questionSaved", handleQuestionSaved);
    socket.on("gameError", handleQuestionError);

    return () => {
      socket.off("questionSaved", handleQuestionSaved);
      socket.off("gameError", handleQuestionError);
    };
  }, [currentRound, lobby?.gameId, playerId, socket]);

  function submitQuestion(event) {
    event.preventDefault();

    if (!canSubmitMore) {
      return;
    }

    setIsSubmitting(true);
    setSubmitState({
      type: "idle",
      message: "",
    });

    socket.emit("submitQuestion", {
      gameId: lobby.gameId,
      round: currentRound,
      playerId,
      question: questionForm.questionText,
      choices: questionForm.choices,
      correctIndex: Number(questionForm.correctAnswerIndex),
    });
  }

  return (
    <main className="page-shell">
      <section className="hero-card setup-hero">
        <div>
          <p className="eyebrow">Question Builder</p>
          <h1>{`Round ${currentRound}/${totalRounds}`}</h1>
          <p className="hero-copy">
            Build your trivia questions for this round. Each submission needs
            one prompt, four answer choices, and one marked correct answer.
          </p>
          <p className="round-progress-copy">
            {`You submitted ${submissionCount} of ${requiredCount} questions this round.`}
          </p>
          <div className="status-pill">{status}</div>
          {submitState.message ? (
            <div className={`feedback-banner feedback-${submitState.type}`}>
              {submitState.message}
            </div>
          ) : null}
        </div>
        <div className="game-code-card">
          <span>Round Progress</span>
          <strong>{progressLabel}</strong>
          <small>
            {remainingCount > 0
              ? `${remainingCount} question${remainingCount === 1 ? "" : "s"} left`
              : "Round requirement met"}
          </small>
        </div>
      </section>

      <section className="panel-grid setup-grid">
        <section className="panel builder-panel">
          <div className="panel-heading">
            <h2>Create A Question</h2>
            <span className="player-count">
              {playerRole === "HOST" ? "Host view" : "Player view"}
            </span>
          </div>

          <form className="question-form" onSubmit={submitQuestion}>
            <label htmlFor="questionText">Question</label>
            <textarea
              id="questionText"
              className="text-area"
              value={questionForm.questionText}
              onChange={(event) =>
                setQuestionForm((currentForm) => ({
                  ...currentForm,
                  questionText: event.target.value,
                }))
              }
              placeholder="What year did the first iPhone launch?"
            />

            <div className="answer-grid">
              {questionForm.choices.map((choice, index) => (
                <div key={index} className="answer-card">
                  <label htmlFor={`answer-${index}`}>{`Answer ${index + 1}`}</label>
                  <input
                    id={`answer-${index}`}
                    type="text"
                    value={choice}
                    onChange={(event) => updateChoice(index, event.target.value)}
                    placeholder={`Enter answer choice ${index + 1}`}
                  />
                  <label className="radio-row" htmlFor={`correct-answer-${index}`}>
                    <input
                      id={`correct-answer-${index}`}
                      type="radio"
                      name="correctAnswer"
                      checked={Number(questionForm.correctAnswerIndex) === index}
                      onChange={() =>
                        setQuestionForm((currentForm) => ({
                          ...currentForm,
                          correctAnswerIndex: index,
                        }))
                      }
                    />
                    <span>Correct answer</span>
                  </label>
                </div>
              ))}
            </div>

            <button type="submit" disabled={!canSubmitMore || isSubmitting}>
              {canSubmitMore
                ? isSubmitting
                  ? "Saving Question..."
                  : "Submit Question"
                : "Round Complete"}
            </button>
          </form>
        </section>

        <section className="panel progress-panel">
          <h2>Submission Tracker</h2>
          <div className="tracker-grid">
            <div className="tracker-card">
              <span>Current Round</span>
              <strong>{currentRound}</strong>
            </div>
            <div className="tracker-card">
              <span>Total Rounds</span>
              <strong>{totalRounds}</strong>
            </div>
            <div className="tracker-card">
              <span>Submitted</span>
              <strong>{submissionCount}</strong>
            </div>
            <div className="tracker-card">
              <span>Required</span>
              <strong>{requiredCount}</strong>
            </div>
          </div>

          <div className="waiting-card">
            <p className="waiting-title">This round only</p>
            <p>
              Progress updates are broadcast in real time for this round. The
              list below shows who is still working and who is done.
            </p>
          </div>

          <ul className="player-list progress-list">
            {playerProgress.length > 0 ? (
              playerProgress.map((player) => (
                <li key={player.playerId}>
                  <div>
                    <span>{player.playerName}</span>
                    {player.playerId === playerId ? <small>You</small> : null}
                  </div>
                  <strong>
                    {player.submittedCount}/{player.requiredCount}
                  </strong>
                </li>
              ))
            ) : (
              <li className="submission-empty">
                <span>No player progress yet.</span>
              </li>
            )}
          </ul>

          <ul className="submission-list">
            {submittedQuestions.length > 0 ? (
              submittedQuestions.map((question, index) => (
                <li key={question.id}>
                  <span>{`Question ${index + 1}`}</span>
                  <small>{question.question || "Untitled question"}</small>
                </li>
              ))
            ) : (
              <li className="submission-empty">
                <span>No questions submitted yet.</span>
              </li>
            )}
          </ul>

          <div className="status-block">
            {lobby?.gameId
              ? `Game code: ${lobby.gameId}`
              : "Question setup preview is ready."}
          </div>
        </section>
      </section>
    </main>
  );
}

export default SetupPhase;
