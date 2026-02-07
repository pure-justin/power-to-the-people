import { useState } from "react";
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Battery,
  Zap,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Save,
} from "lucide-react";
import { updateProjectStatus } from "../services/adminService";
import { syncLeadStatusToReferral } from "../services/referralService";

/**
 * Project Detail Modal Component
 * Shows full project details with ability to update status and add notes
 */
export default function ProjectDetailModal({ project, onClose, onUpdate }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(project.status);
  const [notes, setNotes] = useState(project.adminNotes || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Status options with colors
  const statusOptions = [
    {
      value: "submitted",
      label: "Submitted",
      color: "#3b82f6",
      icon: <FileText size={14} />,
    },
    {
      value: "reviewing",
      label: "Reviewing",
      color: "#f59e0b",
      icon: <Clock size={14} />,
    },
    {
      value: "approved",
      label: "Approved",
      color: "#10b981",
      icon: <CheckCircle size={14} />,
    },
    {
      value: "scheduled",
      label: "Scheduled",
      color: "#8b5cf6",
      icon: <Calendar size={14} />,
    },
    {
      value: "completed",
      label: "Completed",
      color: "#059669",
      icon: <CheckCircle size={14} />,
    },
    {
      value: "cancelled",
      label: "Cancelled",
      color: "#ef4444",
      icon: <X size={14} />,
    },
  ];

  const currentStatusOption =
    statusOptions.find((s) => s.value === selectedStatus) || statusOptions[0];

  // Handle status update
  const handleSaveChanges = async () => {
    setIsUpdating(true);
    setError("");
    setSuccess("");

    try {
      // Update status if changed
      if (selectedStatus !== project.status) {
        await updateProjectStatus(project.id, selectedStatus);

        // Sync referral tracking status if this lead was referred
        if (project.email) {
          try {
            await syncLeadStatusToReferral(project.email, selectedStatus);
          } catch (syncError) {
            console.warn("Referral sync skipped:", syncError.message);
          }
        }
      }

      setSuccess("Changes saved successfully!");

      // Notify parent to refresh data
      if (onUpdate) {
        setTimeout(() => {
          onUpdate();
          onClose();
        }, 1000);
      }
    } catch (err) {
      console.error("Error updating project:", err);
      setError("Failed to save changes. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease;
        }

        .modal-header {
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .modal-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
        }

        .modal-close {
          width: 36px;
          height: 36px;
          border: none;
          background: #f3f4f6;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          color: #6b7280;
        }

        .modal-close:hover {
          background: #e5e7eb;
          color: #111827;
        }

        .modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .detail-section {
          background: #f9fafb;
          border-radius: 12px;
          padding: 20px;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .detail-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-icon {
          color: #6b7280;
          margin-top: 2px;
          flex-shrink: 0;
        }

        .detail-content {
          flex: 1;
        }

        .detail-label {
          font-size: 0.85rem;
          color: #6b7280;
          margin-bottom: 2px;
        }

        .detail-value {
          font-size: 0.95rem;
          font-weight: 500;
          color: #111827;
        }

        .status-selector {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .status-option {
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .status-option:hover {
          border-color: #d1d5db;
          background: #f9fafb;
        }

        .status-option.selected {
          border-color: currentColor;
          background: currentColor;
          color: white;
        }

        .notes-textarea {
          width: 100%;
          min-height: 120px;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-family: inherit;
          font-size: 0.9rem;
          resize: vertical;
          transition: all 0.2s;
        }

        .notes-textarea:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .modal-footer {
          padding: 20px 24px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .footer-message {
          font-size: 0.9rem;
          padding: 8px 12px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .footer-message.success {
          background: #dcfce7;
          color: #166534;
        }

        .footer-message.error {
          background: #fef2f2;
          color: #991b1b;
        }

        .footer-actions {
          display: flex;
          gap: 12px;
        }

        .btn-cancel {
          padding: 10px 20px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          color: #374151;
        }

        .btn-cancel:hover {
          background: #f9fafb;
        }

        .btn-save {
          padding: 10px 20px;
          border: none;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-save:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .detail-grid {
            grid-template-columns: 1fr;
          }

          .status-selector {
            grid-template-columns: 1fr;
          }

          .modal-footer {
            flex-direction: column;
          }

          .footer-actions {
            width: 100%;
          }

          .btn-cancel,
          .btn-save {
            flex: 1;
          }
        }
      `}</style>

      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="modal-header">
            <div>
              <div className="modal-title">Project Details</div>
              <div
                style={{ fontSize: "0.9rem", color: "#6b7280", marginTop: 4 }}
              >
                {project.id}
              </div>
            </div>
            <button className="modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="modal-body">
            {/* Customer & System Info */}
            <div className="detail-grid">
              {/* Customer Information */}
              <div className="detail-section">
                <div className="section-title">
                  <User size={18} />
                  Customer Information
                </div>

                <div className="detail-row">
                  <User size={18} className="detail-icon" />
                  <div className="detail-content">
                    <div className="detail-label">Name</div>
                    <div className="detail-value">
                      {project.customerName || "N/A"}
                    </div>
                  </div>
                </div>

                <div className="detail-row">
                  <Mail size={18} className="detail-icon" />
                  <div className="detail-content">
                    <div className="detail-label">Email</div>
                    <div className="detail-value">{project.email || "N/A"}</div>
                  </div>
                </div>

                <div className="detail-row">
                  <Phone size={18} className="detail-icon" />
                  <div className="detail-content">
                    <div className="detail-label">Phone</div>
                    <div className="detail-value">{project.phone || "N/A"}</div>
                  </div>
                </div>

                <div className="detail-row">
                  <MapPin size={18} className="detail-icon" />
                  <div className="detail-content">
                    <div className="detail-label">Address</div>
                    <div className="detail-value">
                      {project.address || "N/A"}
                    </div>
                  </div>
                </div>

                <div className="detail-row">
                  <Calendar size={18} className="detail-icon" />
                  <div className="detail-content">
                    <div className="detail-label">Created Date</div>
                    <div className="detail-value">
                      {project.createdAt?.toDate
                        ? project.createdAt
                            .toDate()
                            .toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                        : "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              {/* System Information */}
              <div className="detail-section">
                <div className="section-title">
                  <Zap size={18} />
                  System Details
                </div>

                <div className="detail-row">
                  <Zap size={18} className="detail-icon" />
                  <div className="detail-content">
                    <div className="detail-label">Solar System</div>
                    <div className="detail-value">
                      {project.systemSize || "N/A"} kW
                    </div>
                  </div>
                </div>

                <div className="detail-row">
                  <Battery size={18} className="detail-icon" />
                  <div className="detail-content">
                    <div className="detail-label">Battery Storage</div>
                    <div className="detail-value">
                      {project.batterySize || "N/A"} kWh
                    </div>
                  </div>
                </div>

                <div className="detail-row">
                  <DollarSign size={18} className="detail-icon" />
                  <div className="detail-content">
                    <div className="detail-label">Estimated Value</div>
                    <div className="detail-value">
                      $
                      {(
                        (parseFloat(project.systemSize) || 0) * 3000
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Update Section */}
            <div className="detail-section" style={{ marginBottom: 24 }}>
              <div className="section-title">
                <AlertCircle size={18} />
                Update Status
              </div>
              <div className="status-selector">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`status-option ${selectedStatus === option.value ? "selected" : ""}`}
                    style={{
                      color:
                        selectedStatus === option.value
                          ? "white"
                          : option.color,
                      borderColor: option.color,
                    }}
                    onClick={() => setSelectedStatus(option.value)}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin Notes Section */}
            <div className="detail-section">
              <div className="section-title">
                <MessageSquare size={18} />
                Admin Notes
              </div>
              <textarea
                className="notes-textarea"
                placeholder="Add notes about this project..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <div>
              {success && (
                <div className="footer-message success">
                  <CheckCircle size={16} />
                  {success}
                </div>
              )}
              {error && (
                <div className="footer-message error">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
            </div>

            <div className="footer-actions">
              <button className="btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn-save"
                onClick={handleSaveChanges}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: "2px solid white",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
