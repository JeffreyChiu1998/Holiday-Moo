const ChecklistButton = ({ checklistItems, onClick }) => {
  const enabledItems = checklistItems.filter((item) => !item.disabled);
  const totalItems = enabledItems.length;
  const packedItems = enabledItems.filter((item) => item.packed).length;

  return (
    <button
      onClick={onClick}
      className="checklist-icon"
      title="Travel Checklist"
    >
      <img
        src="/img/clipboard.png"
        alt="Travel Checklist"
        onError={(e) => {
          e.target.style.display = "none";
          e.target.nextSibling.style.display = "flex";
        }}
      />
      <div className="checklist-icon-fallback" style={{ display: "none" }}>
        📝
      </div>
      {totalItems > 0 && (
        <div className="checklist-progress-badge">
          {packedItems}/{totalItems}
        </div>
      )}
    </button>
  );
};

export default ChecklistButton;
