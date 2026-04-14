import { useEffect, useState } from "react";

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
  gamePhase,
  status,
  socket,
}) {
  const [questionForm, setQuestionForm] = useState(emptyQuestion);
  const currentPlayerProgress = roundState.playerProgress.find(
    (player) => player.playerId === playerId
  );
  const submittedCount = currentPlayerProgress?.submittedCount || 0;
  const requiredCount =
    currentPlayerProgress?.requiredCount ||
    roundState.questionsPerPlayerPerRound ||
    gameSettings.questionsPerPlayerPerRound;
  const hasFinishedRound = submittedCount >= requiredCount;
  const isSetupComplete = gamePhase === "SETUP_COMPLETE";

  useEffect(() => {
    if (!hasFinishedRound) {
      setQuestionForm(emptyQuestion);
    }
  }, [hasFinishedRound, roundState.currentRound]);

  function updateChoice(index, value) {
    setQuestionForm((currentForm) => ({
      ...currentForm,
      choices: currentForm.choices.map((choice, choiceIndex) =>
        choiceIndex === index ? value : choice
      ),
    }));
  }

  function submitQuestion(event) {
    event.preventDefault();

    socket.emit("submitQuestion", {
      gameId: lobby.gameId,
      questionText: questionForm.questionText,
      choices: questionForm.choices,
      correctAnswerIndex: Number(questionForm.correctAnswerIndex),
    });
  }

  return (
    <main className="page-shell">
      <section className="hero-card setup-hero">
        <div>
          <p className="eyebrow">Question Creation Phase</p>
          <h1>
            {isSetupComplete
              ? "Question setup complete"
              : `Round ${roundState.currentRound}/${roundState.totalRounds}`}
          </h1>
          <p className="hero-copy">
            {isSetupComplete
              ? "Every round has its full question set. Gameplay can be added on top of this next."
              : "Each player must submit their questions for the current round before the game can continue."}
          </p>
        </div>
        <div className="game-code-card">
          <span>Progress</span>
          <strong>
            {Math.min(submittedCount, requiredCount)}/{requiredCount}
          </strong>
          <small>{playerRole === "HOST" ? "Host submitting too" : "Player submission"}</small>
        </div>
      </section>

      <section className="panel-grid setup-grid">
        <section className="panel builder-panel">
          <div className="panel-heading">
            <h2>Question Builder</h2>
            <span className="player-count">
              {`Round ${roundState.currentRound} of ${roundState.totalRounds}`}
            </span>
          </div>

          {isSetupComplete ? (
            <div className="waiting-card">
              <p className="waiting-title">Setup finished</p>
              <p>
                All players completed all {gameSettings.rounds} rounds. The next
                step is gameplay, which we have not started yet.
              </p>
            </div>
          ) : hasFinishedRound ? (
            <div className="waiting-card">
              <p className="waiting-title">Round submitted</p>
              <p>
                You submitted all {requiredCount} questions for this round.
                Waiting for everyone else to finish before moving on.
              </p>
            </div>
          ) : (
            <form className="question-form" onSubmit={submitQuestion}>
              <label htmlFor="questionText">Question Text</label>
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
                placeholder="What is the capital of New York?"
              />

              <div className="answer-grid">
                {questionForm.choices.map((choice, index) => (
                  <label key={index} className="answer-card">
                    <span>{`Answer ${index + 1}`}</span>
                    <input
                      type="text"
                      value={choice}
                      onChange={(event) => updateChoice(index, event.target.value)}
                      placeholder={`Choice ${index + 1}`}
                    />
                    <div className="radio-row">
                      <input
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
                      <span>Mark as correct</span>
                    </div>
                  </label>
                ))}
              </div>

              <button type="submit">Submit Question</button>
            </form>
          )}
        </section>

        <section className="panel progress-panel">
          <h2>Round Progress</h2>
          <p>
            Game code <strong>{lobby.gameId}</strong>. Everyone must reach{" "}
            {requiredCount}/{requiredCount} before the round completes.
          </p>
          <ul className="player-list">
            {roundState.playerProgress.map((player) => (
              <li key={player.playerId}>
                <div>
                  <span>{player.playerName}</span>
                  {player.playerId === playerId ? <small>You</small> : null}
                </div>
                <strong>
                  {player.submittedCount}/{player.requiredCount}
                </strong>
              </li>
            ))}
          </ul>
          <div className="status-block">{status}</div>
        </section>
      </section>
    </main>
  );
}

export default SetupPhase;
