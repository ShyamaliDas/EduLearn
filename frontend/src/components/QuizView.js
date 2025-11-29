import React, { useState } from 'react';
import axios from 'axios';
import '../App.css';

function QuizView({ material, enrollmentId, onCompleted }) {
    const quiz = material?.quiz || [];

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState(0);
    const [wrongAnswers, setWrongAnswers] = useState([]);
    const [saving, setSaving] = useState(false);
    const [scoreSaved, setScoreSaved] = useState(false);
    const [saveError, setSaveError] = useState('');

    if (!material || !quiz || quiz.length === 0) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: '0.5' }}><i className="bi bi-x-circle-fill" style={{ color: '#B85C5C' }}></i></div>
                <h3 style={{ color: 'var(--color-gray-700)' }}>No Quiz Questions Available</h3>
                <p style={{ color: 'var(--color-gray-600)' }}>
                    This quiz doesn't have any questions yet.
                </p>
            </div>
        );
    }

    const handleAnswer = (questionIndex, answerIndex) => {
        setAnswers({ ...answers, [questionIndex]: answerIndex });
    };

    const handleSubmit = async () => {
        let correctCount = 0;
        const wrong = [];

        quiz.forEach((q, index) => {
            if (answers[index] === q.correctAnswer) {
                correctCount++;
            } else {
                wrong.push(index);
            }
        });

        setScore(correctCount);
        setWrongAnswers(wrong);
        setShowResults(true);

        await saveQuizScore(correctCount);
    };

    const saveQuizScore = async (correctCount) => {
        setSaving(true);
        setSaveError('');

        try {
            const token = localStorage.getItem('token');
            const percentage = Math.round((correctCount / quiz.length) * 100);

            console.log('💾 Saving quiz score:', {
                enrollmentId,
                materialId: material.id,
                score: correctCount,
                totalQuestions: quiz.length,
                percentage
            });

            const response = await axios.post(
                `http://localhost:5000/api/enrollments/${enrollmentId}/quiz-score`,
                {
                    materialId: material.id,
                    score: correctCount,
                    totalQuestions: quiz.length,
                    percentage: percentage
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log(' Quiz score saved successfully:', response.data);
            setScoreSaved(true);

            // Wait for backend to fully process
            await new Promise(resolve => setTimeout(resolve, 500));

            // Call onCompleted to refresh enrollment data
            if (onCompleted) {
                console.log(' Calling onCompleted callback...');
                await onCompleted();
            }

            console.log(' Quiz completion flow finished');

        } catch (error) {
            console.error(' Error saving quiz score:', error);
            console.error('Error details:', error.response?.data);
            setSaveError(error.response?.data?.message || 'Failed to save quiz score. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleRetry = () => {
        const newAnswers = { ...answers };
        wrongAnswers.forEach(index => {
            delete newAnswers[index];
        });
        setAnswers(newAnswers);
        setCurrentQuestion(wrongAnswers[0] || 0);
        setShowResults(false);
        setWrongAnswers([]);
        setScoreSaved(false);
        setSaveError('');
    };

    const handleNext = () => {
        if (currentQuestion < quiz.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
        }
    };

    if (showResults) {
        const percentage = Math.round((score / quiz.length) * 100);
        const allCorrect = percentage === 100;

        return (
            <div>
                {/* Results Header */}
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    background: allCorrect
                        ? 'linear-gradient(135deg, var(--color-success) 0%, #5a8a5a 100%)'
                        : 'linear-gradient(135deg, var(--color-danger) 0%, #a34848 100%)',
                    color: 'white',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: '1.5rem'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>
                        {allCorrect ? '🎉' : '📝'}
                    </div>
                    <h2 style={{ color: 'white', marginBottom: '0.5rem' }}>
                        {allCorrect ? 'Perfect Score!' : 'Quiz Completed'}
                    </h2>
                    <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                        {score} / {quiz.length}
                    </div>
                    <div style={{ fontSize: '1.1rem', opacity: '0.95' }}>
                        Score: {percentage}%
                    </div>
                </div>

                {/* Save Status */}
                {saving && (
                    <div className="info-message" style={{ marginBottom: '1.5rem' }}>
                        <i className="bi bi-floppy-fill" style={{ color: '#6B7C5E' }}></i> Saving your score...
                    </div>
                )}

                {scoreSaved && !saving && (
                    <div className="success-message" style={{ marginBottom: '1.5rem' }}>
                        ✓ Score saved successfully!
                    </div>
                )}

                {saveError && (
                    <div className="error-message" style={{ marginBottom: '1.5rem' }}>
                        {saveError}
                    </div>
                )}

                {/* Results Content */}
                {allCorrect ? (
                    <div style={{
                        padding: '2rem',
                        background: 'var(--color-secondary-light)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                        marginBottom: '1.5rem'
                    }}>
                        <h3 style={{ color: 'var(--color-success)', marginBottom: '0.5rem' }}>
                            Congratulations! 🎓
                        </h3>
                        <p style={{ color: 'var(--color-gray-700)', margin: 0 }}>
                            You've answered all questions correctly!
                        </p>
                    </div>
                ) : (
                    <>
                        <div style={{
                            padding: '1.25rem',
                            background: '#fef2f2',
                            borderRadius: 'var(--radius-md)',
                            borderLeft: '4px solid var(--color-danger)',
                            marginBottom: '1.5rem'
                        }}>
                            <p style={{ margin: 0, color: 'var(--color-gray-800)', fontWeight: '500' }}>
                                You need 100% to complete this quiz. Review and try again!
                            </p>
                        </div>

                        {/* Wrong Answers Review */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>
                                Review Incorrect Answers
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {wrongAnswers.map(index => {
                                    const q = quiz[index];
                                    return (
                                        <div
                                            key={index}
                                            style={{
                                                padding: '1.25rem',
                                                background: 'var(--color-gray-50)',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--color-gray-200)'
                                            }}
                                        >
                                            <div style={{
                                                fontWeight: '600',
                                                marginBottom: '0.75rem',
                                                color: 'var(--color-gray-900)'
                                            }}>
                                                Q{index + 1}: {q.question}
                                            </div>

                                            <div style={{
                                                padding: '0.75rem',
                                                background: '#fef2f2',
                                                borderRadius: 'var(--radius-sm)',
                                                marginBottom: '0.5rem',
                                                borderLeft: '3px solid var(--color-danger)'
                                            }}>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)', marginBottom: '0.25rem' }}>
                                                    Your answer:
                                                </div>
                                                <div style={{ color: 'var(--color-danger)', fontWeight: '500' }}>
                                                    {q.options[answers[index]] || 'Not answered'} ✗
                                                </div>
                                            </div>

                                            <div style={{
                                                padding: '0.75rem',
                                                background: '#f0f9f4',
                                                borderRadius: 'var(--radius-sm)',
                                                borderLeft: '3px solid var(--color-success)'
                                            }}>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)', marginBottom: '0.25rem' }}>
                                                    Correct answer:
                                                </div>
                                                <div style={{ color: 'var(--color-success)', fontWeight: '500' }}>
                                                    ✓ {q.options[q.correctAnswer]}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {!allCorrect && (
                        <button
                            onClick={handleRetry}
                            className="btn btn-primary"
                            style={{ flex: 1 }}
                            disabled={saving}
                        >
                            Retry Wrong Answers
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setShowResults(false);
                            setCurrentQuestion(0);
                            setAnswers({});
                            setScore(0);
                            setWrongAnswers([]);
                            setScoreSaved(false);
                            setSaveError('');
                        }}
                        className="btn btn-outline"
                        style={{ flex: 1 }}
                    >
                        Start Over
                    </button>
                </div>
            </div>
        );
    }

    const currentQ = quiz[currentQuestion];
    const totalQuestions = quiz.length;
    const answeredCount = Object.keys(answers).length;

    return (
        <div>
            {/* Progress Bar */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                    fontSize: '0.9rem',
                    color: 'var(--color-gray-600)'
                }}>
                    <span>Question {currentQuestion + 1} of {totalQuestions}</span>
                    <span>{answeredCount} / {totalQuestions} answered</span>
                </div>
                <div style={{
                    height: '8px',
                    background: 'var(--color-gray-200)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        height: '100%',
                        width: `${((currentQuestion + 1) / totalQuestions) * 100}%`,
                        background: 'var(--color-primary)',
                        transition: 'width 0.3s ease'
                    }} />
                </div>
            </div>

            {/* Question */}
            <div style={{
                padding: '1.5rem',
                background: 'var(--color-secondary-light)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '1.5rem'
            }}>
                <div style={{
                    fontSize: '0.85rem',
                    color: 'var(--color-primary)',
                    fontWeight: '600',
                    marginBottom: '0.5rem'
                }}>
                    QUESTION {currentQuestion + 1}
                </div>
                <h3 style={{ color: 'var(--color-gray-900)', margin: 0 }}>
                    {currentQ.question}
                </h3>
            </div>

            {/* Options */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {currentQ.options.map((option, index) => {
                        const isSelected = answers[currentQuestion] === index;
                        return (
                            <button
                                key={index}
                                type="button"
                                onClick={() => handleAnswer(currentQuestion, index)}
                                className={isSelected ? 'btn btn-primary' : 'btn btn-outline'}
                                style={{
                                    justifyContent: 'flex-start',
                                    padding: '1rem 1.25rem',
                                    textAlign: 'left'
                                }}
                            >
                                <span style={{
                                    display: 'inline-flex',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    border: isSelected ? '2px solid white' : '2px solid var(--color-primary)',
                                    background: isSelected ? 'white' : 'transparent',
                                    color: isSelected ? 'var(--color-primary)' : 'var(--color-primary)',
                                    marginRight: '0.75rem',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '600',
                                    fontSize: '0.9rem'
                                }}>
                                    {String.fromCharCode(65 + index)}
                                </span>
                                {option}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
                <button
                    onClick={handlePrev}
                    disabled={currentQuestion === 0}
                    className="btn btn-outline"
                >
                    ← Previous
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {currentQuestion < totalQuestions - 1 ? (
                        <button
                            onClick={handleNext}
                            className="btn btn-primary"
                        >
                            Next →
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            className="btn btn-success"
                            disabled={answeredCount < totalQuestions}
                        >
                            Submit Quiz
                        </button>
                    )}
                </div>
            </div>

            {/* Answer All Warning */}
            {currentQuestion === totalQuestions - 1 && answeredCount < totalQuestions && (
                <div className="info-message" style={{ marginTop: '1rem' }}>
                    Please answer all questions before submitting.
                </div>
            )}
        </div>
    );
}

export default QuizView;




