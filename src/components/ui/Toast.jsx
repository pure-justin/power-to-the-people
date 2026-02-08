import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const toastConfig = {
  success: {
    icon: CheckCircle,
    bg: "bg-green-50 border-green-200",
    iconColor: "text-green-600",
    textColor: "text-green-800",
  },
  error: {
    icon: XCircle,
    bg: "bg-red-50 border-red-200",
    iconColor: "text-red-600",
    textColor: "text-red-800",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50 border-amber-200",
    iconColor: "text-amber-600",
    textColor: "text-amber-800",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50 border-blue-200",
    iconColor: "text-blue-600",
    textColor: "text-blue-800",
  },
};

let toastId = 0;

function ToastItem({ toast, onDismiss }) {
  const config = toastConfig[toast.type] || toastConfig.info;
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration || 5000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg ${config.bg} animate-[slideIn_0.2s_ease-out]`}
      role="alert"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className={`text-sm font-semibold ${config.textColor}`}>
            {toast.title}
          </p>
        )}
        <p
          className={`text-sm ${config.textColor} ${toast.title ? "mt-0.5" : ""}`}
        >
          {toast.message}
        </p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className={`flex-shrink-0 p-1 rounded hover:bg-black/5 ${config.textColor}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(
    ({ type = "info", message, title, duration = 5000 }) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, type, message, title, duration }]);
      return id;
    },
    [],
  );

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (messageOrOpts) => {
      if (typeof messageOrOpts === "string") {
        return addToast({ message: messageOrOpts });
      }
      return addToast(messageOrOpts);
    },
    [addToast],
  );

  toast.success = (message, opts) =>
    addToast({ type: "success", message, ...opts });
  toast.error = (message, opts) =>
    addToast({ type: "error", message, ...opts });
  toast.warning = (message, opts) =>
    addToast({ type: "warning", message, ...opts });
  toast.info = (message, opts) => addToast({ type: "info", message, ...opts });

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-96 max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export default ToastProvider;
