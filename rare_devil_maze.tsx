import React, { useState, useEffect, useCallback } from 'react';
import * as Tone from 'tone';

const RareDevilMaze = () => {
  // Balanced maze with moderate complexity: 0 = wall, 1 = path, 2 = goal
  const maze = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,1,1,1,1,0,1,1,1,1,1,1,0],
    [0,1,0,0,0,1,0,1,0,0,0,0,1,0],
    [0,1,1,1,0,1,1,1,1,1,1,0,1,0],
    [0,0,0,1,0,0,0,0,0,0,1,0,1,0],
    [0,1,1,1,1,1,1,1,1,0,1,1,1,0],
    [0,1,0,0,0,0,0,0,1,0,0,0,0,0],
    [0,1,1,1,1,1,1,0,1,1,1,1,1,0],
    [0,0,0,0,0,0,1,0,0,0,0,0,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,0,1,0],
    [0,1,0,0,0,0,0,0,0,0,1,0,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,2,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  ];

  // Invisible roadblocks positioned on main pathways where players will naturally go
  const invisibleBlocks = [
    {
      x: 5,
      y: 5,
      id: 1,
      question: "Have you or someone you know noticed light brown patches on the skin, like coffee stains?",
      encountered: false
    },
    {
      x: 7,
      y: 9,
      id: 2,
      question: "Have you seen any soft lumps or bumps on the skin that seem to grow over time?",
      encountered: false
    }
  ];

  // Final question that appears at the finish line
  const finalQuestion = {
    id: 3,
    question: "Have you observed any brown spots on your or someone else's eyes?"
  };

  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 });
  const [blockedPositions, setBlockedPositions] = useState(new Set());
  const [encounteredBlocks, setEncounteredBlocks] = useState(new Set());
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set());
  const [gameComplete, setGameComplete] = useState(false);
  const [showFinalQuestion, setShowFinalQuestion] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [bgMusic, setBgMusic] = useState(null);
  const [movementSound, setMovementSound] = useState(null);

  // Initialize audio
  useEffect(() => {
    const initAudio = async () => {
      try {
        // Background music - ambient synthesizer
        const synth = new Tone.PolySynth(Tone.Synth).toDestination();
        synth.volume.value = -20; // Quiet background music
        
        // Movement sound - short beep
        const moveSound = new Tone.Synth().toDestination();
        moveSound.volume.value = -15;
        
        setBgMusic(synth);
        setMovementSound(moveSound);
      } catch (error) {
        console.log('Audio initialization failed:', error);
      }
    };
    
    initAudio();
  }, []);

  // Start audio function
  const startAudio = async () => {
    try {
      if (Tone.context.state !== 'running') {
        await Tone.start();
      }
      setAudioEnabled(true);
      
      // Start background music loop
      if (bgMusic) {
        const playBgMusic = () => {
          bgMusic.triggerAttackRelease(['C4', 'E4', 'G4'], '2n');
          setTimeout(() => {
            bgMusic.triggerAttackRelease(['D4', 'F4', 'A4'], '2n');
          }, 2000);
          setTimeout(() => {
            bgMusic.triggerAttackRelease(['E4', 'G4', 'B4'], '2n');
          }, 4000);
        };
        
        playBgMusic();
        const musicInterval = setInterval(playBgMusic, 6000);
        
        // Store interval for cleanup
        setBgMusic(prev => ({ ...prev, interval: musicInterval }));
      }
    } catch (error) {
      console.log('Audio start failed:', error);
    }
  };

  // Stop audio function
  const stopAudio = () => {
    if (bgMusic?.interval) {
      clearInterval(bgMusic.interval);
    }
    setAudioEnabled(false);
  };

  // Play movement sound
  const playMovementSound = useCallback(() => {
    if (audioEnabled && movementSound) {
      movementSound.triggerAttackRelease('C5', '0.1');
    }
  }, [audioEnabled, movementSound]);

  // Check if player hits an invisible block
  const checkInvisibleBlock = useCallback((x, y) => {
    const block = invisibleBlocks.find(b => b.x === x && b.y === y && !encounteredBlocks.has(b.id));
    if (block) {
      setCurrentQuestion(block);
      setEncounteredBlocks(prev => new Set([...prev, block.id]));
      setBlockedPositions(prev => new Set([...prev, `${x}-${y}`]));
      return true;
    }
    return false;
  }, [encounteredBlocks]);

  // Move player
  const movePlayer = useCallback((dx, dy) => {
    if (currentQuestion || gameComplete || showFinalQuestion) return;

    const newX = playerPos.x + dx;
    const newY = playerPos.y + dy;

    // Check bounds and walls
    if (newY >= 0 && newY < maze.length && newX >= 0 && newX < maze[0].length && maze[newY][newX] !== 0) {
      
      // Check if position is blocked by previous invisible block encounter
      if (blockedPositions.has(`${newX}-${newY}`)) {
        return; // Can't move to blocked position
      }

      // Check for invisible blocks
      if (checkInvisibleBlock(newX, newY)) {
        return; // Block movement and show question
      }

      // Update player position
      setPlayerPos({ x: newX, y: newY });
      
      // Play movement sound
      playMovementSound();
      
      // Check if reached goal
      if (maze[newY][newX] === 2) {
        setShowFinalQuestion(true);
        stopAudio(); // Stop background music when reaching goal
      }
    }
  }, [playerPos, currentQuestion, gameComplete, showFinalQuestion, maze, blockedPositions, checkInvisibleBlock, playMovementSound]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          movePlayer(0, -1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          movePlayer(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          movePlayer(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          movePlayer(1, 0);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [movePlayer]);

  // Answer pathway question
  const answerPathwayQuestion = (answer) => {
    if (currentQuestion) {
      setAnsweredQuestions(prev => new Set([...prev, currentQuestion.id]));
      setCurrentQuestion(null);
    }
  };

  // Answer final question
  const answerFinalQuestion = (answer) => {
    setAnsweredQuestions(prev => new Set([...prev, finalQuestion.id]));
    setShowFinalQuestion(false);
    setGameComplete(true);
  };

  const resetGame = () => {
    setPlayerPos({ x: 1, y: 1 });
    setBlockedPositions(new Set());
    setEncounteredBlocks(new Set());
    setCurrentQuestion(null);
    setAnsweredQuestions(new Set());
    setGameComplete(false);
    setShowFinalQuestion(false);
    stopAudio();
  };

  return (
    <div className="flex flex-col h-screen bg-white text-black font-mono">
      {/* Header */}
      <div className="bg-black text-white p-4 text-center">
        <div className="flex justify-between items-center mb-2">
          <div></div>
          <div>
            <h1 className="text-xl font-bold">RARE DEVIL</h1>
            <p className="text-sm">Balanced maze navigation with awareness checkpoints</p>
          </div>
          <button
            onClick={audioEnabled ? stopAudio : startAudio}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
          >
            {audioEnabled ? '🔊' : '🔇'}
          </button>
        </div>
        <div className="text-xs mt-1">
          Awareness Questions: {answeredQuestions.size}/3
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div 
          className="gap-0 border-2 border-black bg-black" 
          style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(14, 1fr)',
            aspectRatio: '14/13', 
            maxHeight: '65vh',
            maxWidth: '95vw',
            minHeight: '300px'
          }}
        >
          {maze.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                className={`
                  aspect-square flex items-center justify-center text-xs relative
                  ${cell === 0 ? 'bg-black' : cell === 2 ? 'bg-white border border-gray-300' : 'bg-white'}
                  min-h-0 min-w-0
                `}
              >
                {/* Player */}
                {playerPos.x === x && playerPos.y === y && (
                  <div className="w-4 h-4 bg-black rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
                
                {/* Goal marker */}
                {cell === 2 && (
                  <div className="font-bold text-lg text-black">
                    ★
                  </div>
                )}
                
                {/* Invisible block indicators (only show after being blocked) */}
                {invisibleBlocks.some(block => block.x === x && block.y === y && encounteredBlocks.has(block.id)) && (
                  <div className="absolute inset-0 bg-red-400 opacity-70 flex items-center justify-center">
                    <div className="text-white font-bold text-sm">⚠</div>
                  </div>
                )}
                
                {/* Blocked position indicator */}
                {blockedPositions.has(`${x}-${y}`) && (
                  <div className="absolute inset-0 bg-red-600 opacity-40"></div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="px-4 py-2 text-center text-sm border-t border-gray-300">
        Navigate the maze pathways to reach the finish line (★). Hidden checkpoints will create new route challenges!
      </div>

      {/* Controls */}
      <div className="p-6 bg-gray-50 border-t border-gray-300">
        <div className="flex flex-col items-center space-y-4">
          <button
            onTouchStart={(e) => e.preventDefault()}
            onClick={() => movePlayer(0, -1)}
            className="w-16 h-16 bg-black text-white border-2 border-gray-300 flex items-center justify-center font-bold text-xl active:bg-gray-700"
          >
            ↑
          </button>
          <div className="flex space-x-4">
            <button
              onTouchStart={(e) => e.preventDefault()}
              onClick={() => movePlayer(-1, 0)}
              className="w-16 h-16 bg-black text-white border-2 border-gray-300 flex items-center justify-center font-bold text-xl active:bg-gray-700"
            >
              ←
            </button>
            <button
              onTouchStart={(e) => e.preventDefault()}
              onClick={() => movePlayer(1, 0)}
              className="w-16 h-16 bg-black text-white border-2 border-gray-300 flex items-center justify-center font-bold text-xl active:bg-gray-700"
            >
              →
            </button>
          </div>
          <button
            onTouchStart={(e) => e.preventDefault()}
            onClick={() => movePlayer(0, 1)}
            className="w-16 h-16 bg-black text-white border-2 border-gray-300 flex items-center justify-center font-bold text-xl active:bg-gray-700"
          >
            ↓
          </button>
        </div>
      </div>

      {/* Pathway Question Modal */}
      {currentQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-4 border-black p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-4 text-center">
              Path Blocked!
            </h3>
            <p className="mb-4 text-center text-sm text-gray-600">
              You've encountered an awareness checkpoint.
            </p>
            <p className="mb-6 text-center text-sm">{currentQuestion.question}</p>
            <div className="flex space-x-4">
              <button
                onClick={() => answerPathwayQuestion('yes')}
                className="flex-1 bg-black text-white py-3 px-4 border-2 border-black hover:bg-gray-800"
              >
                YES
              </button>
              <button
                onClick={() => answerPathwayQuestion('no')}
                className="flex-1 bg-white text-black py-3 px-4 border-2 border-black hover:bg-gray-100"
              >
                NO
              </button>
            </div>
            <p className="text-xs text-center mt-3 text-gray-600">
              This path is now blocked. Find an alternative route.
            </p>
          </div>
        </div>
      )}

      {/* Final Question Modal */}
      {showFinalQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-4 border-black p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-4 text-center">
              Final Awareness Question
            </h3>
            <p className="mb-4 text-center text-sm text-gray-600">
              You've reached the finish line!
            </p>
            <p className="mb-6 text-center text-sm">{finalQuestion.question}</p>
            <div className="flex space-x-4">
              <button
                onClick={() => answerFinalQuestion('yes')}
                className="flex-1 bg-black text-white py-3 px-4 border-2 border-black hover:bg-gray-800"
              >
                YES
              </button>
              <button
                onClick={() => answerFinalQuestion('no')}
                className="flex-1 bg-white text-black py-3 px-4 border-2 border-black hover:bg-gray-100"
              >
                NO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Complete Modal */}
      {gameComplete && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-4 border-black p-6 max-w-sm w-full text-center">
            <h3 className="font-bold text-xl mb-4">Journey Complete!</h3>
            <p className="mb-4 text-sm">
              You successfully navigated the maze pathways, answered all awareness questions, and reached the finish line!
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.open('https://preview--rare-together-project-idea-2025.lovable.app/public', '_blank')}
                className="w-full bg-black text-white py-3 px-4 border-2 border-black hover:bg-gray-800"
              >
                Learn More
              </button>
              <button
                onClick={resetGame}
                className="w-full bg-white text-black py-3 px-4 border-2 border-black hover:bg-gray-100"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RareDevilMaze;