import React, { useContext } from "react";
import { UndoRedoContext } from "./Calendar";

const ToolPanel = ({ onReturnDefaultView }) => {
  const undoRedoContext = useContext(UndoRedoContext);

  return (
    <div className="tool-panel">
      <div className="tool-panel-content">
        <div className="tool-buttons">
          <button
            onClick={() => {
              if (undoRedoContext?.handleUndo) {
                undoRedoContext.handleUndo();
              }
            }}
            disabled={!undoRedoContext?.canUndo}
            className={`tool-button ${
              !undoRedoContext?.canUndo ? "disabled" : ""
            }`}
            title="Undo last action"
          >
            ↶ Undo
          </button>

          <button
            onClick={onReturnDefaultView}
            className="tool-button"
            title="Return to current week view"
          >
            🏠 Default View
          </button>

          <button
            onClick={() => {
              if (undoRedoContext?.handleRedo) {
                undoRedoContext.handleRedo();
              }
            }}
            disabled={!undoRedoContext?.canRedo}
            className={`tool-button ${
              !undoRedoContext?.canRedo ? "disabled" : ""
            }`}
            title="Redo last action"
          >
            ↷ Redo
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToolPanel;