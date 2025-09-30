import {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import { createPortal } from "react-dom";

const PaymentCalculator = forwardRef(
  ({ trips, onUpdateTrip, onClose }, ref) => {
    const [selectedTripId, setSelectedTripId] = useState("");
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [payments, setPayments] = useState([]);
    const [nextPaymentNo, setNextPaymentNo] = useState(1);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
    const [originalPayments, setOriginalPayments] = useState([]);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target)
        ) {
          setOpenDropdownId(null);
        }
      };

      if (openDropdownId) {
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
          document.removeEventListener("mousedown", handleClickOutside);
        };
      }
    }, [openDropdownId]);

    // Initialize when trip is selected
    useEffect(() => {
      if (selectedTripId) {
        const trip = trips.find((t) => t.id === selectedTripId);
        setSelectedTrip(trip);
        const tripPayments = trip?.payments || [];
        setPayments(tripPayments);
        setOriginalPayments(JSON.parse(JSON.stringify(tripPayments))); // Deep copy
        setNextPaymentNo((tripPayments.length || 0) + 1);
        setHasUnsavedChanges(false);
      } else {
        setSelectedTrip(null);
        setPayments([]);
        setOriginalPayments([]);
        setNextPaymentNo(1);
        setHasUnsavedChanges(false);
      }
    }, [selectedTripId, trips]);

    // Handle close request
    const handleClose = () => {
      if (editMode && hasUnsavedChanges) {
        setShowCloseConfirmation(true);
      } else {
        onClose && onClose();
      }
    };

    // Expose handleClose to parent component
    useImperativeHandle(ref, () => ({
      handleClose,
    }));

    const formatDateForInput = (date) => {
      if (!date) return "";
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    // Check if there are unsaved changes
    const checkForUnsavedChanges = (newPayments) => {
      const hasChanges =
        JSON.stringify(newPayments) !== JSON.stringify(originalPayments);
      setHasUnsavedChanges(hasChanges);
      return hasChanges;
    };

    // Confirm close and discard changes
    const confirmClose = () => {
      setShowCloseConfirmation(false);
      // Reset to original state
      setPayments(JSON.parse(JSON.stringify(originalPayments)));
      setEditMode(false);
      setHasUnsavedChanges(false);
      onClose && onClose();
    };

    // Cancel close
    const cancelClose = () => {
      setShowCloseConfirmation(false);
    };

    const addPayment = () => {
      const newPayment = {
        id: Date.now().toString(),
        no: nextPaymentNo,
        date: formatDateForInput(new Date()),
        item: "",
        subItems: [],
        price: 0,
        description: "",
        billPayer: "",
        recipients: [],
      };

      const updatedPayments = [...payments, newPayment];
      setPayments(updatedPayments);
      setNextPaymentNo(nextPaymentNo + 1);
      checkForUnsavedChanges(updatedPayments);
      // Don't auto-save in edit mode, only save when user clicks save
      if (!editMode) {
        savePayments(updatedPayments);
      }
    };

    const deletePayment = (paymentId) => {
      const updatedPayments = payments.filter((p) => p.id !== paymentId);
      setPayments(updatedPayments);
      checkForUnsavedChanges(updatedPayments);
      if (!editMode) {
        savePayments(updatedPayments);
      }
    };

    const updatePayment = (paymentId, field, value) => {
      const updatedPayments = payments.map((payment) => {
        if (payment.id === paymentId) {
          return { ...payment, [field]: value };
        }
        return payment;
      });
      setPayments(updatedPayments);
      checkForUnsavedChanges(updatedPayments);
      if (!editMode) {
        savePayments(updatedPayments);
      }
    };

    const addSubItem = (paymentId) => {
      const updatedPayments = payments.map((payment) => {
        if (payment.id === paymentId) {
          const newSubItem = {
            id: Date.now().toString(),
            name: "",
            price: 0,
            recipients: [],
          };
          return {
            ...payment,
            subItems: [...(payment.subItems || []), newSubItem],
          };
        }
        return payment;
      });
      setPayments(updatedPayments);
      checkForUnsavedChanges(updatedPayments);
      if (!editMode) {
        savePayments(updatedPayments);
      }
    };

    const updateSubItem = (paymentId, subItemId, field, value) => {
      const updatedPayments = payments.map((payment) => {
        if (payment.id === paymentId) {
          const updatedSubItems = payment.subItems.map((subItem) => {
            if (subItem.id === subItemId) {
              return { ...subItem, [field]: value };
            }
            return subItem;
          });
          return { ...payment, subItems: updatedSubItems };
        }
        return payment;
      });
      setPayments(updatedPayments);
      checkForUnsavedChanges(updatedPayments);
      if (!editMode) {
        savePayments(updatedPayments);
      }
    };

    const deleteSubItem = (paymentId, subItemId) => {
      const updatedPayments = payments.map((payment) => {
        if (payment.id === paymentId) {
          return {
            ...payment,
            subItems: payment.subItems.filter((sub) => sub.id !== subItemId),
          };
        }
        return payment;
      });
      setPayments(updatedPayments);
      checkForUnsavedChanges(updatedPayments);
      if (!editMode) {
        savePayments(updatedPayments);
      }
    };

    const savePayments = (updatedPayments) => {
      if (selectedTrip && onUpdateTrip) {
        const updatedTrip = {
          ...selectedTrip,
          payments: updatedPayments,
        };
        onUpdateTrip(updatedTrip);
      }
    };

    const toggleRecipient = (paymentId, travelerName, subItemId = null) => {
      const updatedPayments = payments.map((payment) => {
        if (payment.id === paymentId) {
          if (subItemId) {
            // Toggle recipient for sub-item
            const updatedSubItems = payment.subItems.map((subItem) => {
              if (subItem.id === subItemId) {
                const recipients = subItem.recipients || [];
                const isSelected = recipients.includes(travelerName);
                return {
                  ...subItem,
                  recipients: isSelected
                    ? recipients.filter((r) => r !== travelerName)
                    : [...recipients, travelerName],
                };
              }
              return subItem;
            });
            return { ...payment, subItems: updatedSubItems };
          } else {
            // Toggle recipient for main payment
            const recipients = payment.recipients || [];
            const isSelected = recipients.includes(travelerName);
            return {
              ...payment,
              recipients: isSelected
                ? recipients.filter((r) => r !== travelerName)
                : [...recipients, travelerName],
            };
          }
        }
        return payment;
      });
      setPayments(updatedPayments);
      checkForUnsavedChanges(updatedPayments);
      if (!editMode) {
        savePayments(updatedPayments);
      }
    };

    const calculateSummary = () => {
      if (!selectedTrip || !selectedTrip.travelers) return {};

      const travelers = selectedTrip.travelers
        .map((t) => t.name)
        .filter((name) => name.trim());
      const summary = {};

      // Initialize summary for each traveler
      travelers.forEach((traveler) => {
        summary[traveler] = {
          paid: 0,
          owes: 0,
          balance: 0,
          transactions: [],
        };
      });

      // Calculate what each person paid and owes
      payments.forEach((payment) => {
        const hasSubItems = payment.subItems && payment.subItems.length > 0;

        if (hasSubItems) {
          // Process each sub-item separately
          payment.subItems.forEach((subItem) => {
            const subItemPrice = parseFloat(subItem.price) || 0;

            if (payment.billPayer && subItemPrice > 0) {
              // Add to what the bill payer paid
              if (summary[payment.billPayer]) {
                summary[payment.billPayer].paid += subItemPrice;
              }

              // Split among sub-item recipients
              const recipients = subItem.recipients || [];
              if (recipients.length > 0) {
                const perPerson = subItemPrice / recipients.length;
                recipients.forEach((recipient) => {
                  if (summary[recipient]) {
                    summary[recipient].owes += perPerson;
                  }
                });
              }
            }
          });
        } else {
          // Process main payment
          const totalPrice = parseFloat(payment.price) || 0;

          if (payment.billPayer && totalPrice > 0) {
            // Add to what the bill payer paid
            if (summary[payment.billPayer]) {
              summary[payment.billPayer].paid += totalPrice;
            }

            // Split among recipients
            const recipients = payment.recipients || [];
            if (recipients.length > 0) {
              const perPerson = totalPrice / recipients.length;
              recipients.forEach((recipient) => {
                if (summary[recipient]) {
                  summary[recipient].owes += perPerson;
                }
              });
            }
          }
        }
      });

      // Calculate final balances
      Object.keys(summary).forEach((traveler) => {
        summary[traveler].balance =
          summary[traveler].paid - summary[traveler].owes;
      });

      return summary;
    };

    const validatePayments = () => {
      const errors = [];

      payments.forEach((payment, index) => {
        const paymentNum = payment.no || index + 1;

        // Check required fields
        if (!payment.date?.trim()) {
          errors.push(`Payment ${paymentNum}: Date is required`);
        }

        if (!payment.item?.trim()) {
          errors.push(`Payment ${paymentNum}: Item is required`);
        }

        if (!payment.billPayer?.trim()) {
          errors.push(`Payment ${paymentNum}: Bill Payer is required`);
        }

        // Check price or sub-items
        const hasSubItems = payment.subItems && payment.subItems.length > 0;
        if (hasSubItems) {
          // If has sub-items, check each sub-item has name, price, and recipients
          payment.subItems.forEach((subItem, subIndex) => {
            if (!subItem.name?.trim()) {
              errors.push(
                `Payment ${paymentNum}, Sub-item ${
                  subIndex + 1
                }: Name is required`
              );
            }
            if (!subItem.price || subItem.price <= 0) {
              errors.push(
                `Payment ${paymentNum}, Sub-item ${
                  subIndex + 1
                }: Price must be greater than 0`
              );
            }
            if (!subItem.recipients || subItem.recipients.length === 0) {
              errors.push(
                `Payment ${paymentNum}, Sub-item ${
                  subIndex + 1
                }: At least one recipient is required`
              );
            }
          });
        } else {
          // If no sub-items, main price and recipients are required
          if (!payment.price || payment.price <= 0) {
            errors.push(`Payment ${paymentNum}: Price must be greater than 0`);
          }
          if (!payment.recipients || payment.recipients.length === 0) {
            errors.push(
              `Payment ${paymentNum}: At least one recipient is required`
            );
          }
        }
      });

      return errors;
    };

    const handleEditModeToggle = () => {
      if (editMode) {
        // Trying to save - validate first
        const validationErrors = validatePayments();

        if (validationErrors.length > 0) {
          const errorMessage =
            "Please fix the following issues:\n\n" +
            validationErrors.join("\n");
          alert(errorMessage);
          return; // Don't exit edit mode
        }

        // Save the changes
        savePayments(payments);
        setOriginalPayments(JSON.parse(JSON.stringify(payments))); // Update original state
        setHasUnsavedChanges(false);
      }

      setEditMode(!editMode);
    };

    const summary = calculateSummary();
    const travelers =
      selectedTrip?.travelers
        ?.map((t) => t.name)
        .filter((name) => name.trim()) || [];

    return (
      <div className="payment-calculator">
        <div className="payment-calculator-content">
          <div className="payment-controls">
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="trip-selector"
            >
              <option value="">Select a trip...</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.name}
                </option>
              ))}
            </select>

            {selectedTrip && (
              <button
                onClick={handleEditModeToggle}
                className={`edit-mode-button ${editMode ? "active" : ""}`}
              >
                {editMode ? "✓ Save" : "✏️ Edit"}
              </button>
            )}
          </div>
        </div>

        {!selectedTrip ? (
          <div className="no-trip-selected">
            <p>Please select a trip to manage payments</p>
          </div>
        ) : (
          <div className="payment-content">
            <div className="payments-table-container">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th className="required">Date</th>
                    <th className="required">Item</th>
                    <th>Sub-item</th>
                    <th className="required">Price</th>
                    <th className="required">Bill Payer</th>
                    <th className="required">Recipients</th>
                    {editMode && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <PaymentRow
                      key={payment.id}
                      payment={payment}
                      travelers={travelers}
                      editMode={editMode}
                      onUpdate={updatePayment}
                      onDelete={deletePayment}
                      onAddSubItem={addSubItem}
                      onUpdateSubItem={updateSubItem}
                      onDeleteSubItem={deleteSubItem}
                      onToggleRecipient={toggleRecipient}
                      openDropdownId={openDropdownId}
                      setOpenDropdownId={setOpenDropdownId}
                      dropdownRef={dropdownRef}
                    />
                  ))}
                  {editMode && (
                    <tr className="add-payment-row">
                      <td colSpan="8">
                        <button
                          onClick={addPayment}
                          className="add-payment-button"
                          style={{
                            padding: "6px 12px",
                            fontSize: "14px",
                            minHeight: "auto",
                            height: "auto",
                          }}
                        >
                          + Payment Item
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {Object.keys(summary).length > 0 && (
              <div className="payment-summary">
                <h4>Payment Summary</h4>
                <div className="summary-table-container">
                  <table className="summary-table">
                    <thead>
                      <tr>
                        <th>Traveler</th>
                        <th>Paid</th>
                        <th>Owes</th>
                        <th>Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(summary).map(([traveler, data]) => (
                        <tr key={traveler}>
                          <td>{traveler}</td>
                          <td className="amount-paid">
                            ${data.paid.toFixed(2)}
                          </td>
                          <td className="amount-owes">
                            ${data.owes.toFixed(2)}
                          </td>
                          <td
                            className={`balance ${
                              data.balance >= 0 ? "positive" : "negative"
                            }`}
                          >
                            ${Math.abs(data.balance).toFixed(2)}
                          </td>
                          <td
                            className={`status ${
                              data.balance >= 0 ? "receives" : "pays"
                            }`}
                          >
                            {data.balance > 0
                              ? "Should receive"
                              : data.balance < 0
                              ? "Should pay"
                              : "Even"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Close Confirmation Dialog */}
        {showCloseConfirmation && (
          <div className="modal-overlay" style={{ zIndex: 1000000 }}>
            <div
              className="modal-content"
              style={{ maxWidth: "480px", borderRadius: "16px" }}
            >
              <div
                className="modal-header"
                style={{
                  padding: "24px 24px 16px 24px",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <h3
                  style={{
                    margin: "0",
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#1f2937",
                  }}
                >
                  ⚠️ Unsaved Changes
                </h3>
              </div>
              <div style={{ padding: "24px" }}>
                <p
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "16px",
                    color: "#374151",
                    lineHeight: "1.5",
                    textAlign: "center",
                  }}
                >
                  You have unsaved changes. Are you sure you want to close
                  without saving?
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    margin: "0",
                    textAlign: "center",
                    fontStyle: "italic",
                  }}
                >
                  All unsaved changes will be lost permanently.
                </p>
              </div>
              <div
                className="form-actions"
                style={{
                  padding: "16px 24px 24px 24px",
                  gap: "12px",
                  borderTop: "none",
                }}
              >
                <button
                  onClick={cancelClose}
                  className="cancel-button"
                  style={{
                    flex: "1",
                    padding: "12px 20px",
                    fontSize: "14px",
                    fontWeight: "500",
                    borderRadius: "8px",
                    transition: "all 0.2s",
                  }}
                >
                  Keep Editing
                </button>
                <button
                  onClick={confirmClose}
                  className="save-button"
                  style={{
                    flex: "1",
                    background: "#ef4444",
                    borderColor: "#ef4444",
                    padding: "12px 20px",
                    fontSize: "14px",
                    fontWeight: "500",
                    borderRadius: "8px",
                    transition: "all 0.2s",
                  }}
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

const PaymentRow = ({
  payment,
  travelers,
  editMode,
  onUpdate,
  onDelete,
  onAddSubItem,
  onUpdateSubItem,
  onDeleteSubItem,
  onToggleRecipient,
  openDropdownId,
  setOpenDropdownId,
  dropdownRef,
}) => {
  const hasSubItems = payment.subItems && payment.subItems.length > 0;
  const totalRows = hasSubItems ? payment.subItems.length : 1;
  const addSubItemRows = editMode && hasSubItems ? 1 : 0;
  const sharedFieldsRowSpan = totalRows + addSubItemRows;

  const RecipientDropdown = ({ recipients, itemId, subItemId = null }) => {
    const dropdownId = subItemId ? `${payment.id}-${subItemId}` : payment.id;
    const showDropdown = openDropdownId === dropdownId;
    const selectRef = useRef(null);

    // Position dropdown when it opens and update on scroll/resize
    useEffect(() => {
      const updatePosition = () => {
        if (showDropdown && selectRef.current && dropdownRef.current) {
          const rect = selectRef.current.getBoundingClientRect();
          const dropdown = dropdownRef.current;

          // Ensure we have valid dimensions
          if (rect.width > 0 && rect.height > 0) {
            dropdown.style.position = "fixed";
            dropdown.style.top = `${rect.bottom}px`;
            dropdown.style.left = `${rect.left}px`;
            dropdown.style.width = `${rect.width}px`;
            dropdown.style.zIndex = "999999";
            dropdown.style.visibility = "visible";
          }
        }
      };

      if (showDropdown) {
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(updatePosition, 0);

        // Update position on scroll and resize
        window.addEventListener("scroll", updatePosition, true);
        window.addEventListener("resize", updatePosition);

        return () => {
          window.removeEventListener("scroll", updatePosition, true);
          window.removeEventListener("resize", updatePosition);
        };
      }
    }, [showDropdown]);

    return (
      <div
        className="recipients-dropdown-container"
        style={{
          position: "relative",
          display: "inline-block",
          width: "100%",
        }}
      >
        <select
          className="table-select recipients-select"
          value=""
          onClick={(e) => {
            e.preventDefault();
            if (!travelers.length) {
              setOpenDropdownId(null);
              return;
            }
            setOpenDropdownId(showDropdown ? null : dropdownId);
          }}
          ref={selectRef}
          onChange={() => {}} // Prevent default select behavior
          style={{
            position: "relative",
            zIndex: 1,
            pointerEvents: showDropdown ? "none" : "auto",
          }}
        >
          <option value="">{recipients?.length || 0} selected</option>
        </select>
        {showDropdown &&
          createPortal(
            <div
              className="recipients-dropdown-list"
              ref={dropdownRef}
              style={{
                position: "fixed",
                backgroundColor: "white",
                border: "1px solid #ccc",
                borderRadius: "4px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                zIndex: 999999,
                maxHeight: "200px",
                overflowY: "auto",
                transform: "translateZ(0)",
                willChange: "transform",
                visibility: "hidden",
                top: 0,
                left: 0,
              }}
            >
              {travelers.map((traveler) => (
                <div
                  key={traveler}
                  className="recipient-option"
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderBottom: "1px solid #eee",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                  }}
                  onClick={() =>
                    onToggleRecipient(payment.id, traveler, subItemId)
                  }
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = "#f5f5f5")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = "white")
                  }
                >
                  <input
                    type="checkbox"
                    checked={recipients?.includes(traveler) || false}
                    onChange={() => {}} // Handled by parent onClick
                    style={{ margin: 0 }}
                  />
                  <span>{traveler}</span>
                </div>
              ))}
            </div>,
            document.body
          )}
      </div>
    );
  };

  return (
    <>
      {/* Main payment row */}
      <tr className="payment-main-row">
        {/* Shared fields: No. | Date | Item (these span across all sub-item rows) */}
        <td rowSpan={sharedFieldsRowSpan} className="shared-field">
          {payment.no}
        </td>
        <td rowSpan={sharedFieldsRowSpan} className="shared-field">
          {editMode ? (
            <input
              type="date"
              value={payment.date}
              onChange={(e) => onUpdate(payment.id, "date", e.target.value)}
              className="table-input"
            />
          ) : (
            payment.date
          )}
        </td>
        <td rowSpan={sharedFieldsRowSpan} className="shared-field">
          {editMode ? (
            <input
              type="text"
              value={payment.item}
              onChange={(e) => onUpdate(payment.id, "item", e.target.value)}
              placeholder="Item name"
              className="table-input"
            />
          ) : (
            payment.item
          )}
        </td>

        {/* Individual fields per row: Sub-item | Price | Bill Payer | Recipients */}
        {!hasSubItems ? (
          <>
            {/* No sub-items: show main item data */}
            <td>
              {editMode ? (
                <button
                  onClick={() => onAddSubItem(payment.id)}
                  className="add-sub-item-button"
                  title="Add sub-item"
                >
                  + Sub-item
                </button>
              ) : (
                "-"
              )}
            </td>
            <td>
              {editMode ? (
                <input
                  type="number"
                  value={payment.price}
                  onChange={(e) =>
                    onUpdate(
                      payment.id,
                      "price",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0.00"
                  className="table-input price-input"
                  step="0.01"
                />
              ) : (
                `$${parseFloat(payment.price || 0).toFixed(2)}`
              )}
            </td>

            <td>
              {editMode ? (
                <select
                  value={payment.billPayer}
                  onChange={(e) =>
                    onUpdate(payment.id, "billPayer", e.target.value)
                  }
                  className="table-select"
                >
                  <option value="">Select payer</option>
                  {travelers.map((traveler) => (
                    <option key={traveler} value={traveler}>
                      {traveler}
                    </option>
                  ))}
                </select>
              ) : (
                payment.billPayer
              )}
            </td>
            <td className="recipients-cell">
              {editMode ? (
                <RecipientDropdown
                  recipients={payment.recipients}
                  itemId={payment.id}
                />
              ) : (
                <div className="recipients-display">
                  {payment.recipients?.join(", ") || "None"}
                </div>
              )}
            </td>
          </>
        ) : (
          <>
            {/* Has sub-items: show first sub-item */}
            <td>
              {editMode ? (
                <div className="sub-item-controls">
                  <input
                    type="text"
                    value={payment.subItems[0].name}
                    onChange={(e) =>
                      onUpdateSubItem(
                        payment.id,
                        payment.subItems[0].id,
                        "name",
                        e.target.value
                      )
                    }
                    placeholder="Sub-item name"
                    className="table-input sub-item-input"
                  />
                  <button
                    onClick={() =>
                      onDeleteSubItem(payment.id, payment.subItems[0].id)
                    }
                    className="delete-sub-item-button"
                    title="Delete sub-item"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                payment.subItems[0].name
              )}
            </td>
            <td>
              {editMode ? (
                <input
                  type="number"
                  value={payment.subItems[0].price || 0}
                  onChange={(e) =>
                    onUpdateSubItem(
                      payment.id,
                      payment.subItems[0].id,
                      "price",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0.00"
                  className="table-input price-input"
                  step="0.01"
                />
              ) : (
                `$${parseFloat(payment.subItems[0].price || 0).toFixed(2)}`
              )}
            </td>
            <td>
              {editMode ? (
                <select
                  value={payment.billPayer}
                  onChange={(e) =>
                    onUpdate(payment.id, "billPayer", e.target.value)
                  }
                  className="table-select"
                >
                  <option value="">Select payer</option>
                  {travelers.map((traveler) => (
                    <option key={traveler} value={traveler}>
                      {traveler}
                    </option>
                  ))}
                </select>
              ) : (
                payment.billPayer
              )}
            </td>
            <td className="recipients-cell">
              {editMode ? (
                <RecipientDropdown
                  recipients={payment.subItems[0].recipients}
                  itemId={payment.id}
                  subItemId={payment.subItems[0].id}
                />
              ) : (
                <div className="recipients-display">
                  {payment.subItems[0].recipients?.join(", ") || "None"}
                </div>
              )}
            </td>
          </>
        )}

        {/* Delete button spans all rows */}
        {editMode && (
          <td rowSpan={sharedFieldsRowSpan} className="shared-field">
            <button
              onClick={() => onDelete(payment.id)}
              className="delete-payment-button"
              title="Delete payment"
            >
              🗑️
            </button>
          </td>
        )}
      </tr>

      {/* Additional sub-item rows (seamless continuation) */}
      {hasSubItems &&
        payment.subItems.slice(1).map((subItem) => (
          <tr key={subItem.id}>
            {/* Only individual fields: Sub-item | Price | Recipients */}
            <td>
              {editMode ? (
                <div className="sub-item-controls">
                  <input
                    type="text"
                    value={subItem.name}
                    onChange={(e) =>
                      onUpdateSubItem(
                        payment.id,
                        subItem.id,
                        "name",
                        e.target.value
                      )
                    }
                    placeholder="Sub-item name"
                    className="table-input sub-item-input"
                  />
                  <button
                    onClick={() => onDeleteSubItem(payment.id, subItem.id)}
                    className="delete-sub-item-button"
                    title="Delete sub-item"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                subItem.name
              )}
            </td>
            <td>
              {editMode ? (
                <input
                  type="number"
                  value={subItem.price || 0}
                  onChange={(e) =>
                    onUpdateSubItem(
                      payment.id,
                      subItem.id,
                      "price",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0.00"
                  className="table-input sub-item-price-input"
                  step="0.01"
                />
              ) : (
                `$${parseFloat(subItem.price || 0).toFixed(2)}`
              )}
            </td>
            <td></td>
            <td className="recipients-cell">
              {editMode ? (
                <RecipientDropdown
                  recipients={subItem.recipients}
                  itemId={payment.id}
                  subItemId={subItem.id}
                />
              ) : (
                <div className="recipients-display">
                  {subItem.recipients?.join(", ") || "None"}
                </div>
              )}
            </td>
          </tr>
        ))}

      {/* Add sub-item row (seamless continuation) */}
      {editMode && hasSubItems && (
        <tr>
          <td colSpan="4">
            <button
              onClick={() => onAddSubItem(payment.id)}
              className="add-sub-item-button"
              title="Add sub-item"
            >
              + Sub-item
            </button>
          </td>
        </tr>
      )}
    </>
  );
};

export default PaymentCalculator;
