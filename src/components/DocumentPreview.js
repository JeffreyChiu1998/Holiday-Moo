import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

const DocumentPreview = ({ document, onClose }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);

  const getFileType = (file) => {
    if (!file || !file.name) {
      return null;
    }
    const extension = file.name.split(".").pop().toLowerCase();

    if (["jpg", "jpeg", "png"].includes(extension)) {
      return "image";
    } else if (extension === "pdf") {
      return "pdf";
    } else if (["doc", "docx"].includes(extension)) {
      return "word";
    }
    return null;
  };

  const fileType = getFileType(document);

  const loadPDFJS = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) {
        resolve();
        return;
      }

      const script = window.document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve();
      };
      script.onerror = reject;
      window.document.head.appendChild(script);
    });
  }, []);

  const renderPage = useCallback(
    async (pdf, pageNumber) => {
      try {
        const page = await pdf.getPage(pageNumber);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");

        // Calculate scale to fit the modal while maintaining aspect ratio
        const viewport = page.getViewport({ scale: 1 });
        const maxWidth = Math.min(window.innerWidth * 0.8, 800);
        const maxHeight = Math.min(window.innerHeight * 0.8, 600);

        const scaleX = maxWidth / viewport.width;
        const scaleY = maxHeight / viewport.height;
        const scale = Math.min(scaleX, scaleY);

        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        setError("Failed to render PDF page");
      }
    },
    [setError]
  );

  useEffect(() => {
    if (!document) return;

    const loadPDF = async () => {
      try {
        // Check if PDF.js is available
        if (!window.pdfjsLib) {
          // Load PDF.js from CDN
          await loadPDFJS();
        }

        const arrayBuffer = await document.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer })
          .promise;
        setTotalPages(pdf.numPages);

        await renderPage(pdf, currentPage);
        setLoading(false);
      } catch (err) {
        setError(
          "Failed to load PDF. This might be due to a corrupted file or browser limitations."
        );
        setLoading(false);
      }
    };

    const loadDocument = async () => {
      setLoading(true);
      setError(null);

      try {
        // Check if document is a valid File object
        if (!(document instanceof File) && !(document instanceof Blob)) {
          setError("Invalid file format. Please re-upload the document.");
          setLoading(false);
          return;
        }

        if (fileType === "image") {
          const url = URL.createObjectURL(document);
          setPreviewUrl(url);
          setTotalPages(1);
          setLoading(false);
        } else if (fileType === "pdf") {
          await loadPDF();
        } else if (fileType === "word") {
          setError(
            "Word document preview is not supported in this browser. Please download to view."
          );
          setLoading(false);
        } else {
          setError("Unsupported file type: " + (document.name || "unknown"));
          setLoading(false);
        }
      } catch (err) {
        setError("Failed to load document: " + err.message);
        setLoading(false);
      }
    };

    loadDocument();

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [document, fileType, currentPage, loadPDFJS, renderPage, previewUrl]);

  // Cleanup portal container on unmount
  useEffect(() => {
    return () => {
      // Use window.document to avoid confusion with the document prop
      if (
        typeof window !== "undefined" &&
        window.document &&
        window.document.getElementById
      ) {
        const portalContainer = window.document.getElementById(
          "document-preview-portal"
        );
        if (portalContainer && portalContainer.children.length === 0) {
          window.document.body.removeChild(portalContainer);
        }
      }
    };
  }, []); // No dependencies needed for cleanup on unmount

  const handlePageChange = useCallback(
    async (newPage) => {
      if (newPage < 1 || newPage > totalPages || fileType !== "pdf") return;

      setCurrentPage(newPage);
      setLoading(true);

      try {
        const arrayBuffer = await document.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer })
          .promise;
        await renderPage(pdf, newPage);
        setLoading(false);
      } catch (err) {
        setError("Failed to load page");
        setLoading(false);
      }
    },
    [
      document,
      totalPages,
      fileType,
      renderPage,
      setCurrentPage,
      setLoading,
      setError,
    ]
  );

  const getModalDimensions = () => {
    if (fileType === "image") {
      return {
        maxWidth: "90vw",
        maxHeight: "90vh",
        width: "auto",
        height: "auto",
      };
    } else if (fileType === "pdf") {
      return {
        maxWidth: "90vw",
        maxHeight: "90vh",
        width: "auto",
        height: "auto",
      };
    }
    return {
      width: "600px",
      height: "400px",
    };
  };

  const modalDimensions = getModalDimensions();

  if (!document) return null;

  const modalContent = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          ...modalDimensions,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#f9fafb",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>
              {document.name}
            </h3>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              {fileType?.toUpperCase()} • {(document.size / 1024).toFixed(1)} KB
              {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              padding: "0",
              width: "30px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#f3f4f6")}
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = "transparent")
            }
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            overflow: "auto",
            backgroundColor: "#f9fafb",
          }}
        >
          {loading && (
            <div style={{ textAlign: "center", color: "#6b7280" }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>📄</div>
              <p>Loading document...</p>
            </div>
          )}

          {error && (
            <div
              style={{
                textAlign: "center",
                color: "#dc2626",
                maxWidth: "400px",
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>⚠️</div>
              <p>{error}</p>
              {fileType === "word" && (
                <button
                  onClick={() => {
                    const url = URL.createObjectURL(document);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = document.name;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{
                    marginTop: "12px",
                    padding: "8px 16px",
                    backgroundColor: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  📥 Download Document
                </button>
              )}
            </div>
          )}

          {!loading && !error && fileType === "image" && previewUrl && (
            <img
              src={previewUrl}
              alt={document.name}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
          )}

          {!loading && !error && fileType === "pdf" && (
            <canvas
              ref={canvasRef}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
          )}
        </div>

        {/* Navigation for multi-page documents */}
        {totalPages > 1 && !loading && !error && (
          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "12px",
              backgroundColor: "#f9fafb",
            }}
          >
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              style={{
                padding: "6px 12px",
                backgroundColor: currentPage <= 1 ? "#f3f4f6" : "#2563eb",
                color: currentPage <= 1 ? "#9ca3af" : "white",
                border: "none",
                borderRadius: "6px",
                cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                fontSize: "14px",
              }}
            >
              ← Previous
            </button>

            <span
              style={{
                fontSize: "14px",
                color: "#6b7280",
                minWidth: "100px",
                textAlign: "center",
              }}
            >
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              style={{
                padding: "6px 12px",
                backgroundColor:
                  currentPage >= totalPages ? "#f3f4f6" : "#2563eb",
                color: currentPage >= totalPages ? "#9ca3af" : "white",
                border: "none",
                borderRadius: "6px",
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                fontSize: "14px",
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Ensure window.document.body exists before creating portal
  if (
    typeof window === "undefined" ||
    !window.document ||
    !window.document.body
  ) {
    return null;
  }

  // Create or get portal container
  let portalContainer = window.document.getElementById(
    "document-preview-portal"
  );
  if (!portalContainer) {
    portalContainer = window.document.createElement("div");
    portalContainer.id = "document-preview-portal";
    window.document.body.appendChild(portalContainer);
  }

  return createPortal(modalContent, portalContainer);
};

export default DocumentPreview;
