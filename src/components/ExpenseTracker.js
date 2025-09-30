import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const ExpenseTracker = ({ isOpen, onClose, trips = [] }) => {
  const [expenses, setExpenses] = useState([]);
  const [selectedTripFilter, setSelectedTripFilter] = useState("all");

  useEffect(() => {
    if (isOpen) {
      loadExpenses();
    }
  }, [isOpen]);

  const loadExpenses = () => {
    const savedExpenses = JSON.parse(
      localStorage.getItem("tripExpenses") || "[]"
    );
    setExpenses(savedExpenses);
  };

  const deleteExpense = (expenseId) => {
    const updatedExpenses = expenses.filter(
      (expense) => expense.id !== expenseId
    );
    setExpenses(updatedExpenses);
    localStorage.setItem("tripExpenses", JSON.stringify(updatedExpenses));
  };

  const clearAllExpenses = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all expenses? This cannot be undone."
      )
    ) {
      setExpenses([]);
      localStorage.setItem("tripExpenses", JSON.stringify([]));
    }
  };

  const filteredExpenses = expenses.filter((expense) => {
    if (selectedTripFilter === "all") return true;
    return expense.tripId === selectedTripFilter;
  });

  const totalAmount = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const getTripName = (tripId) => {
    const trip = trips.find((t) => t.id === tripId);
    return trip ? trip.name : "Unknown Trip";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="modal-overlay expense-tracker-overlay" onClick={onClose}>
      <div
        className="modal-content expense-tracker-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>💰 Expense Tracker</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="expense-tracker-content">
          <div className="expense-controls">
            <div className="filter-section">
              <label>Filter by Trip:</label>
              <select
                value={selectedTripFilter}
                onChange={(e) => setSelectedTripFilter(e.target.value)}
              >
                <option value="all">All Trips</option>
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="expense-summary">
              <div className="total-amount">
                Total: <strong>${totalAmount.toFixed(2)}</strong>
              </div>
              <div className="expense-count">
                {filteredExpenses.length} expense
                {filteredExpenses.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          <div className="expenses-list">
            {filteredExpenses.length === 0 ? (
              <div className="no-expenses">
                <p>No expenses found.</p>
                <p>Add costs from your events to track expenses here!</p>
              </div>
            ) : (
              filteredExpenses.map((expense) => (
                <div key={expense.id} className="expense-item">
                  <div className="expense-main">
                    <div className="expense-name">{expense.name}</div>
                    <div className="expense-amount">
                      ${expense.amount.toFixed(2)}
                    </div>
                  </div>
                  <div className="expense-details">
                    <span className="expense-date">
                      {formatDate(expense.date)}
                    </span>
                    <span className="expense-category">{expense.category}</span>
                    <span className="expense-trip">
                      {getTripName(expense.tripId)}
                    </span>
                  </div>
                  <button
                    className="delete-expense-btn"
                    onClick={() => deleteExpense(expense.id)}
                    title="Delete expense"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="expense-actions">
            {expenses.length > 0 && (
              <button className="clear-all-btn" onClick={clearAllExpenses}>
                Clear All Expenses
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ExpenseTracker;
