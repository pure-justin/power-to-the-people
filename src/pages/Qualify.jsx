import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  CheckCircle2,
  Loader2,
  XCircle,
  Home,
  Key,
  CreditCard,
  ShieldX,
  FileText,
  Upload,
  User,
  UserPlus,
  BarChart3,
  QrCode,
  Camera,
  ExternalLink,
} from "lucide-react";
import { checkEnergyCommunity } from "../services/energyCommunity";
import { designSolarSystem } from "../services/solarApi";
import {
  scanBill,
  scanMeterQRCode,
  estimateConsumption,
  saveProject,
  uploadBillToStorage,
  hashAddress,
  cacheDesign,
  createAccount,
  signInWithEmail,
  linkSmtAccount,
} from "../services/firebase";
import {
  validateReferralCode,
  trackReferral,
} from "../services/referralService";
import AddressAutocomplete from "../components/AddressAutocomplete";

// Generate a unique project ID
const generateProjectId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `PTTP-${timestamp}-${random}`.toUpperCase();
};

const STEPS = [
  { id: 1, label: "Location", icon: Zap },
  { id: 2, label: "Homeowner", icon: Home },
  { id: 3, label: "Credit", icon: CreditCard },
  { id: 4, label: "Smart Meter", icon: BarChart3 },
  { id: 5, label: "Name", icon: User },
  { id: 6, label: "Contact", icon: UserPlus },
];

export default function Qualify() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [error, setError] = useState("");

  // Referral tracking
  const [referralCode, setReferralCode] = useState("");
  const [referralInfo, setReferralInfo] = useState(null);
  const [validatingReferral, setValidatingReferral] = useState(false);

  // Dynamic spots counter for urgency
  const [spotsLeft, setSpotsLeft] = useState(847);
  const [approvalRate, setApprovalRate] = useState(11.2);
  const [liveFeed, setLiveFeed] = useState(null);

  // Texas cities and common first names for realistic feed
  const texasCities = [
    "Houston",
    "Austin",
    "Dallas",
    "San Antonio",
    "Fort Worth",
    "El Paso",
    "Arlington",
    "Plano",
    "Corpus Christi",
    "Lubbock",
    "Garland",
    "Irving",
    "Frisco",
    "McKinney",
    "Amarillo",
    "Grand Prairie",
    "Brownsville",
    "Killeen",
    "Pasadena",
    "Mesquite",
  ];
  const firstNames = [
    "James",
    "Maria",
    "David",
    "Sarah",
    "Michael",
    "Jennifer",
    "Robert",
    "Linda",
    "William",
    "Patricia",
    "Richard",
    "Elizabeth",
    "Joseph",
    "Barbara",
    "Thomas",
    "Susan",
    "Christopher",
    "Jessica",
    "Daniel",
    "Ashley",
    "Carlos",
    "Rosa",
    "Miguel",
    "Ana",
  ];

  // Disqualification reasons (educational)
  const disqualifyReasons = [
    "Not in Energy Community",
    "Credit Below 650",
    "Usage Too Low",
    "Roof Shading Issues",
    "Renter - Not Owner",
    "Multi-Family Property",
    "HOA Restrictions",
    "Roof Age > 15 Years",
  ];

  // Generate random applicant
  const generateApplicant = () => {
    const name = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastInitial = String.fromCharCode(
      65 + Math.floor(Math.random() * 26),
    );
    const city = texasCities[Math.floor(Math.random() * texasCities.length)];
    // ~10% qualified rate (9 bad, 1 good)
    const qualified = Math.random() < 0.1;
    const reason = qualified
      ? null
      : disqualifyReasons[Math.floor(Math.random() * disqualifyReasons.length)];
    return { name: `${name} ${lastInitial}.`, city, qualified, reason };
  };

  // Live feed + stats updates
  useEffect(() => {
    const showFeed = () => {
      const applicant = generateApplicant();
      setLiveFeed(applicant);

      // Update stats when qualified
      if (applicant.qualified) {
        setSpotsLeft((prev) => (prev > 100 ? prev - 1 : prev));
        setApprovalRate((prev) =>
          prev < 18 ? Math.round((prev + 0.1) * 10) / 10 : prev,
        );
      }

      // Clear feed after 5 seconds (time to read the reason)
      setTimeout(() => setLiveFeed(null), 5000);
    };

    // Show feed every 12-20 seconds (feels like real applicants)
    const scheduleNext = () => {
      const delay = Math.floor(Math.random() * 8000) + 12000;
      return setTimeout(() => {
        showFeed();
        timerRef.current = scheduleNext();
      }, delay);
    };

    // Initial delay - let user orient first
    const timerRef = {
      current: setTimeout(() => {
        showFeed();
        timerRef.current = scheduleNext();
      }, 6000),
    };

    return () => clearTimeout(timerRef.current);
  }, []);

  // Eligibility states
  const [energyCommunityResult, setEnergyCommunityResult] = useState(null);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [disqualifyReason, setDisqualifyReason] = useState("");

  // Bill scanning states
  const [isScanning, setIsScanning] = useState(false);
  const [billData, setBillData] = useState(null);
  const [scanError, setScanError] = useState("");

  // Scan mode: null = not selected, 'bill' = utility bill, 'meter' = QR code, 'greenbutton' = SMT, 'smtlogin' = direct SMT login
  const [scanMode, setScanMode] = useState(null);
  const [meterData, setMeterData] = useState(null);
  const meterInputRef = useRef(null);

  // SMT Direct Login (credentials are ONLY held in memory, never persisted)
  const [smtUsername, setSmtUsername] = useState("");
  const [smtPassword, setSmtPassword] = useState("");
  const [smtLoading, setSmtLoading] = useState(false);
  const [smtError, setSmtError] = useState("");

  // SMT method: 'quick' = direct login, 'download' = Green Button file, 'register' = create new account
  const [smtMethod, setSmtMethod] = useState("quick");

  // SMT Registration state
  const [smtRegData, setSmtRegData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    esiid: "",
    meterNumber: "",
    repName: "",
    username: "",
  });
  const [smtRegLoading, setSmtRegLoading] = useState(false);
  const [smtRegError, setSmtRegError] = useState("");
  const [smtRegSuccess, setSmtRegSuccess] = useState(false);
  const [repList, setRepList] = useState([]);
  const [repLoading, setRepLoading] = useState(false);

  // SMT Connector API endpoint (local dev or deployed Cloud Run)
  const SMT_API_URL =
    import.meta.env.VITE_SMT_API_URL || "http://localhost:3001";

  // Check for SMT data on mount (from Python connector)
  useEffect(() => {
    if (searchParams.get("smtData") === "ready") {
      const storedData = sessionStorage.getItem("smtExtractedData");
      if (storedData) {
        try {
          const smtData = JSON.parse(storedData);
          console.log("SMT data loaded from connector:", smtData);

          // Set the bill data
          setBillData({
            source: "smart_meter_texas",
            dataQuality: "excellent",
            utilityCompany: "Smart Meter Texas",
            esiid: smtData.esiid,
            usageHistory: smtData.usageHistory,
            calculatedAnnualKwh: smtData.calculatedAnnualKwh,
            monthlyConsumption: smtData.monthlyConsumption,
          });

          // Set scan mode to show the data
          setScanMode("greenbutton");
          setFormData((prev) => ({
            ...prev,
            utilityBillPreview: "greenbutton",
            utilityBillFile: { name: "Smart Meter Texas Data" },
          }));

          // Clean up
          sessionStorage.removeItem("smtExtractedData");

          // Jump to step 4
          setCurrentStep(4);
        } catch (err) {
          console.error("Failed to load SMT data:", err);
        }
      }
    }
  }, [searchParams]);

  // Auto-advance to step 5 when bill data is captured on step 4
  useEffect(() => {
    if (currentStep === 4 && billData && !isScanning) {
      // Brief delay to show success, then auto-advance with prefilled data
      const timer = setTimeout(() => {
        // Inline prefill logic
        const updates = {};
        if (billData?.customerName) {
          const nameParts = billData.customerName.trim().split(/\s+/);
          if (nameParts.length >= 2) {
            updates.firstName = nameParts[0];
            updates.lastName = nameParts.slice(1).join(" ");
          } else if (nameParts.length === 1) {
            updates.firstName = nameParts[0];
          }
        }
        if (Object.keys(updates).length > 0) {
          setFormData((prev) => ({
            ...prev,
            ...Object.fromEntries(
              Object.entries(updates).filter(
                ([key, value]) => value && !prev[key],
              ),
            ),
          }));
        }
        setCurrentStep(5);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [billData, currentStep, isScanning]);

  const [formData, setFormData] = useState({
    // Address
    street: "",
    city: "",
    state: "TX",
    postalCode: "",
    county: "",
    latitude: null,
    longitude: null,
    // Qualification
    isHomeowner: null,
    creditScore: null,
    // Utility Bill
    utilityBillFile: null,
    utilityBillPreview: null,
    // Contact
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    // Account
    password: "",
    confirmPassword: "",
  });

  // Remember SMT credentials for auto-fetch in portal
  const [saveSmtCredentials, setSaveSmtCredentials] = useState(true);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  // Handle address selection from autocomplete - AUTO CHECK & ADVANCE
  const handleAddressSelect = async (addressData) => {
    console.log("Address selected:", addressData);

    if (!addressData) {
      setFormData((prev) => ({
        ...prev,
        street: "",
        city: "",
        state: "TX",
        postalCode: "",
        county: "",
        latitude: null,
        longitude: null,
      }));
      setEnergyCommunityResult(null);
      setError("");
      return;
    }

    // Reject non-Texas addresses
    if (addressData.state && addressData.state !== "TX") {
      setError("This program is only available for Texas addresses");
      return;
    }

    console.log("Setting coordinates:", addressData.lat, addressData.lng);

    setFormData((prev) => ({
      ...prev,
      street: addressData.streetAddress || "",
      city: addressData.city || "",
      state: addressData.state || "TX",
      postalCode: addressData.zipCode || "",
      county: addressData.county || "",
      latitude: addressData.lat || null,
      longitude: addressData.lng || null,
    }));
    setError("");

    // Auto-check eligibility immediately
    if (addressData.county) {
      setIsCheckingEligibility(true);

      // Brief delay for UX feedback
      await new Promise((resolve) => setTimeout(resolve, 500));

      const result = checkEnergyCommunity(
        addressData.county,
        addressData.state || "TX",
      );
      setEnergyCommunityResult(result);
      setIsCheckingEligibility(false);

      if (!result.isEnergyCommunity) {
        setIsDisqualified(true);
        setDisqualifyReason("location");
      } else {
        // AUTO-ADVANCE to step 2 after brief success indication
        setTimeout(() => {
          setCurrentStep(2);
        }, 800);
      }
    }
  };

  // Check energy community eligibility (kept for manual trigger if needed)
  const checkEligibility = async () => {
    if (!formData.street || !formData.city || !formData.county) {
      setError("Please select an address from the dropdown");
      return;
    }

    setIsCheckingEligibility(true);
    setError("");

    await new Promise((resolve) => setTimeout(resolve, 500));

    const result = checkEnergyCommunity(formData.county, formData.state);
    setEnergyCommunityResult(result);
    setIsCheckingEligibility(false);

    if (!result.isEnergyCommunity) {
      setIsDisqualified(true);
      setDisqualifyReason("location");
    } else {
      // Auto-advance
      setTimeout(() => {
        setCurrentStep(2);
      }, 800);
    }
  };

  // Handle homeowner selection
  const handleHomeownerSelect = (isOwner) => {
    updateField("isHomeowner", isOwner);
    if (!isOwner) {
      setIsDisqualified(true);
      setDisqualifyReason("renter");
    } else {
      setCurrentStep(3);
    }
  };

  // Handle credit selection
  const handleCreditSelect = (hasGoodCredit) => {
    updateField("creditScore", hasGoodCredit ? "good" : "poor");
    if (!hasGoodCredit) {
      setIsDisqualified(true);
      setDisqualifyReason("credit");
    } else {
      setCurrentStep(4);
    }
  };

  // Convert file to base64 for Cloud Function
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Scan bill with AI
  const scanUtilityBill = async (file) => {
    setIsScanning(true);
    setScanError("");
    setBillData(null);

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);

      // Determine media type
      let mediaType = file.type;
      if (mediaType === "image/heic") {
        mediaType = "image/jpeg"; // Gemini doesn't support HEIC
      }
      // PDFs are now supported directly by Gemini - no conversion needed

      console.log("Scanning bill with AI...", {
        fileType: file.type,
        mediaType,
      });

      // Call the Cloud Function
      const result = await scanBill({
        imageBase64: base64,
        mediaType: mediaType,
      });

      console.log("Bill scan result:", result.data);

      if (result.data.success && result.data.billData) {
        // Validate that we got meaningful data
        const data = result.data.billData;
        const hasUsageData =
          data.currentUsageKwh ||
          data.usageHistory?.length > 0 ||
          data.calculatedAnnualKwh;
        const hasIdentifier = data.esiid || data.accountNumber;

        if (!hasUsageData && !hasIdentifier) {
          // AI couldn't extract meaningful data - likely not a utility bill
          setScanError("not_a_bill");
          return;
        }

        setBillData(data);

        // Calculate annual kWh from usage history if available
        if (data.usageHistory?.length > 0) {
          const totalKwh = data.usageHistory.reduce(
            (sum, month) => sum + (month.kWh || 0),
            0,
          );
          // Extrapolate to 12 months if we have partial data
          const monthsOfData = data.usageHistory.length;
          const annualKwh = Math.round((totalKwh / monthsOfData) * 12);
          setBillData((prev) => ({
            ...prev,
            calculatedAnnualKwh: annualKwh,
          }));
        } else if (data.currentUsageKwh) {
          // Estimate annual from current month
          setBillData((prev) => ({
            ...prev,
            calculatedAnnualKwh: data.currentUsageKwh * 12,
          }));
        }
      } else {
        // Check for specific error types
        const errorMsg = result.data.error || "";
        if (
          errorMsg.toLowerCase().includes("not a utility bill") ||
          errorMsg.toLowerCase().includes("cannot identify") ||
          errorMsg.toLowerCase().includes("unable to extract")
        ) {
          setScanError("not_a_bill");
        } else if (
          errorMsg.toLowerCase().includes("blurry") ||
          errorMsg.toLowerCase().includes("unclear") ||
          errorMsg.toLowerCase().includes("quality")
        ) {
          setScanError("poor_quality");
        } else {
          setScanError("scan_failed");
        }
      }
    } catch (err) {
      console.error("Bill scan error:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      console.error("Error details:", err.details);

      // Check for specific error types
      if (
        err.code === "unauthenticated" ||
        err.message?.includes("unauthenticated")
      ) {
        setScanError("auth_error");
      } else if (
        err.message?.includes("timeout") ||
        err.message?.includes("network")
      ) {
        setScanError("network_error");
      } else {
        // Store the actual error for debugging
        console.error("Full error object:", JSON.stringify(err, null, 2));
        setScanError("scan_failed");
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Scan meter QR code with AI
  const scanMeterQR = async (file) => {
    setIsScanning(true);
    setScanError("");
    setMeterData(null);

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);

      // Determine media type
      let mediaType = file.type;
      if (mediaType === "image/heic") {
        mediaType = "image/jpeg";
      }

      console.log("Scanning meter QR code with AI...");

      // Call the Cloud Function
      const result = await scanMeterQRCode({
        imageBase64: base64,
        mediaType: mediaType,
      });

      console.log("Meter scan result:", result.data);

      if (result.data.success && result.data.esiid) {
        // Validate ESIID format (Texas ESIIDs are 17-22 digits)
        const esiid = result.data.esiid.replace(/\D/g, "");
        if (esiid.length < 10) {
          setScanError("invalid_qr");
          return;
        }

        setMeterData({
          esiid: result.data.esiid,
          meterNumber: result.data.meterNumber,
          tduName: result.data.tduName,
        });
      } else {
        // Check for specific error types
        const errorMsg = result.data.error || "";
        if (
          errorMsg.toLowerCase().includes("no qr") ||
          errorMsg.toLowerCase().includes("not found") ||
          errorMsg.toLowerCase().includes("cannot find")
        ) {
          setScanError("no_qr_found");
        } else if (
          errorMsg.toLowerCase().includes("blurry") ||
          errorMsg.toLowerCase().includes("unclear")
        ) {
          setScanError("qr_poor_quality");
        } else if (errorMsg.toLowerCase().includes("not a meter")) {
          setScanError("not_a_meter");
        } else {
          setScanError("qr_scan_failed");
        }
      }
    } catch (err) {
      console.error("Meter scan error:", err);
      if (
        err.message?.includes("timeout") ||
        err.message?.includes("network")
      ) {
        setScanError("network_error");
      } else {
        setScanError("qr_scan_failed");
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Handle meter QR upload
  const handleMeterUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type (images only for QR)
      const validTypes = ["image/jpeg", "image/png", "image/heic"];
      if (!validTypes.includes(file.type)) {
        setError("Please upload an image file (JPG, PNG, HEIC)");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }

      // Store the file
      updateField("utilityBillFile", file);
      setScanError("");

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        updateField("utilityBillPreview", reader.result);
      };
      reader.readAsDataURL(file);

      // Scan the meter QR code
      await scanMeterQR(file);
    }
  };

  // Handle file upload (for utility bill)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/heic",
        "application/pdf",
      ];
      if (!validTypes.includes(file.type)) {
        setError("Please upload a PDF or image file (JPG, PNG, HEIC)");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }

      updateField("utilityBillFile", file);
      setBillData(null);
      setScanError("");

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          updateField("utilityBillPreview", reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        updateField("utilityBillPreview", "pdf");
      }

      // Automatically scan the bill with AI
      await scanUtilityBill(file);
    }
  };

  // Validate and identify SMT file type for helpful error messages
  const validateSmtFile = (text, fileName) => {
    const isXml = fileName.endsWith(".xml");
    const isCsv = fileName.endsWith(".csv");

    // Check for common wrong file types
    if (!isXml && !isCsv) {
      const ext = fileName.split(".").pop()?.toLowerCase();
      if (ext === "pdf") {
        return {
          valid: false,
          error: "pdf_file",
          message:
            "This is a PDF file. Smart Meter Texas data must be downloaded as XML or CSV.",
        };
      }
      if (["jpg", "jpeg", "png", "gif", "heic"].includes(ext)) {
        return {
          valid: false,
          error: "image_file",
          message:
            "This is an image file. Please download data directly from Smart Meter Texas.",
        };
      }
      return {
        valid: false,
        error: "wrong_format",
        message: `Unsupported file type (.${ext}). Please upload an .xml or .csv file from Smart Meter Texas.`,
      };
    }

    // Validate XML content
    if (isXml) {
      // Check if it's a Green Button file
      if (!text.includes("naesb.org/espi") && !text.includes("GreenButton")) {
        // Check for common XML types
        if (text.includes("<html") || text.includes("<HTML")) {
          return {
            valid: false,
            error: "html_file",
            message:
              "This appears to be a web page saved as XML. Please download the actual data file from Smart Meter Texas.",
          };
        }
        return {
          valid: false,
          error: "not_greenbutton",
          message:
            "This XML file is not in Green Button format. Make sure you downloaded from Smart Meter Texas using the Green Button option.",
        };
      }

      // Check what type of Green Button data
      if (text.includes("Monthly Electricity Consumption")) {
        return { valid: true, type: "monthly_xml" };
      }
      if (text.includes("Fifteen Minute Electricity Consumption")) {
        // Check if it has enough data
        const readingCount = (text.match(/<IntervalReading>/g) || []).length;
        if (readingCount < 100) {
          return {
            valid: true,
            type: "interval_xml_limited",
            warning: `This file only contains ${readingCount} readings (~1 day). For better accuracy, download the Monthly report instead.`,
          };
        }
        return { valid: true, type: "interval_xml" };
      }

      return { valid: true, type: "xml" };
    }

    // Validate CSV content
    if (isCsv) {
      const firstLine = text.split("\n")[0].toLowerCase();

      // Check for SMT format
      if (
        firstLine.includes("esiid") ||
        firstLine.includes("usage_kwh") ||
        firstLine.includes("usage_date")
      ) {
        const lineCount = text.split("\n").filter((l) => l.trim()).length;
        if (lineCount < 100) {
          return {
            valid: true,
            type: "csv_limited",
            warning: `This file only contains ${lineCount} rows. For a full year of data, export 12 months from Smart Meter Texas.`,
          };
        }
        return { valid: true, type: "smt_csv" };
      }

      // Check for utility bill CSV (common mistake)
      if (
        firstLine.includes("amount") ||
        firstLine.includes("due date") ||
        firstLine.includes("payment")
      ) {
        return {
          valid: false,
          error: "billing_csv",
          message:
            "This looks like a billing statement, not usage data. Please download Interval Data or Green Button data from Smart Meter Texas.",
        };
      }

      return {
        valid: false,
        error: "unknown_csv",
        message:
          "This CSV file doesn't match the Smart Meter Texas format. Please download from smartmetertexas.com → Usage → Export Data.",
      };
    }

    return { valid: true, type: "unknown" };
  };

  // Handle Green Button file upload (Smart Meter Texas data)
  const handleGreenButtonUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanning(true);
    setScanError("");
    setBillData(null);

    try {
      const text = await file.text();

      // Validate file before parsing
      const validation = validateSmtFile(text, file.name);

      if (!validation.valid) {
        setScanError(validation.error);
        // Store detailed message for display
        setScanErrorDetails?.({
          type: validation.error,
          message: validation.message,
        });
        setIsScanning(false);
        return;
      }

      // Parse based on file type
      let usageData = null;

      if (file.name.endsWith(".xml")) {
        usageData = parseGreenButtonXML(text);
      } else if (file.name.endsWith(".csv")) {
        usageData = parseSmartMeterCSV(text);
      }

      if (
        usageData &&
        (usageData.annualKwhFromSummary ||
          usageData.totalKwh ||
          usageData.monthlyUsage.length > 0)
      ) {
        // Priority: totalKwh from CSV > annualKwhFromSummary > sum of monthly
        const annualKwh =
          usageData.totalKwh ||
          usageData.annualKwhFromSummary ||
          Math.round(usageData.monthlyUsage.reduce((sum, m) => sum + m.kWh, 0));

        // Determine data quality based on coverage
        const daysCovered =
          usageData.daysCovered || usageData.billingPeriodDays || 0;
        const hasFullYear = daysCovered >= 300;
        const dataQuality = hasFullYear
          ? "excellent"
          : daysCovered >= 180
            ? "good"
            : "fair";

        console.log("SMT data parsed:", {
          annualKwh,
          daysCovered,
          dataQuality,
          months: usageData.monthlyUsage.length,
          esiid: usageData.esiid,
          validationType: validation.type,
        });

        // Set bill data with Green Button/CSV source
        setBillData({
          utilityCompany: "Smart Meter Texas",
          source: "green_button",
          usageHistory: usageData.monthlyUsage,
          calculatedAnnualKwh: annualKwh,
          dataQuality,
          monthsWithData: usageData.monthlyUsage.length,
          billingPeriodDays: daysCovered || null,
          esiid: usageData.esiid || null,
          warning: validation.warning || null,
        });

        // Store file for reference
        updateField("utilityBillFile", file);
        updateField("utilityBillPreview", "greenbutton");
      } else {
        setScanError("parse_failed");
      }
    } catch (err) {
      console.error("Green Button parse error:", err);
      setScanError("read_error");
    } finally {
      setIsScanning(false);
    }
  };

  // Parse Green Button XML format
  const parseGreenButtonXML = (xmlText) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, "text/xml");

      // Check for parsing errors
      const parseError = doc.querySelector("parsererror");
      if (parseError) {
        console.error("XML parsing error:", parseError.textContent);
        return null;
      }

      // Try to get ESIID from UsagePoint links
      let esiid = null;
      const usagePointLink = doc.querySelector('link[href*="UsagePoint"]');
      if (usagePointLink) {
        const href = usagePointLink.getAttribute("href");
        const match = href.match(/UsagePoint\/([A-F0-9]+)/i);
        if (match) esiid = match[1];
      }

      // FIRST: Parse ALL IntervalReading elements to check for monthly data
      const readings = doc.querySelectorAll("IntervalReading");
      const monthlyData = {};
      let minDate = null;
      let maxDate = null;

      readings.forEach((reading) => {
        const timePeriod = reading.querySelector("timePeriod");
        const value = reading.querySelector("value");

        if (timePeriod && value) {
          const start = timePeriod.querySelector("start");
          const duration = timePeriod.querySelector("duration");
          if (start) {
            const timestamp = parseInt(start.textContent) * 1000;
            const durationSec = duration ? parseInt(duration.textContent) : 900;
            const date = new Date(timestamp);

            // Track date range
            if (!minDate || date < minDate) minDate = date;
            if (!maxDate || date > maxDate) maxDate = date;

            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            const kWh = parseInt(value.textContent) / 1000; // Wh to kWh

            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = {
                kWh: 0,
                month: date.toLocaleString("default", { month: "long" }),
                year: date.getFullYear(),
                isMonthlyReading: durationSec > 86400 * 20, // >20 days = monthly
              };
            }
            monthlyData[monthKey].kWh += kWh;
          }
        }
      });

      // Check if we have good multi-month data
      const monthKeys = Object.keys(monthlyData);
      const hasMultipleMonths = monthKeys.length >= 6;
      const hasMonthlyReadings = Object.values(monthlyData).some(
        (m) => m.isMonthlyReading,
      );

      // If we have 6+ months of data, use it directly (don't use summary)
      if (hasMultipleMonths || hasMonthlyReadings) {
        const daysCovered =
          minDate && maxDate
            ? Math.round((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 30
            : 0;

        // Convert to sorted array
        const monthlyUsage = Object.entries(monthlyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, data]) => ({
            month: data.month,
            year: data.year,
            kWh: Math.round(data.kWh),
          }));

        // Get last 12 months for annual calculation
        const last12Months = monthlyUsage.slice(-12);
        const totalKwh = last12Months.reduce((sum, m) => sum + m.kWh, 0);

        console.log("Green Button Monthly Data:", {
          totalMonths: monthlyUsage.length,
          last12MonthsKwh: totalKwh,
          daysCovered,
          esiid,
        });

        return {
          monthlyUsage,
          totalKwh,
          daysCovered,
          esiid,
        };
      }

      // FALLBACK: Use ElectricPowerUsageSummary for single-period data
      const usageSummary = doc.querySelector("ElectricPowerUsageSummary");
      if (usageSummary) {
        const billingPeriod = usageSummary.querySelector("billingPeriod");
        const consumption = usageSummary.querySelector(
          "overallConsumptionLastPeriod",
        );

        if (billingPeriod && consumption) {
          const durationSec = parseInt(
            billingPeriod.querySelector("duration")?.textContent || "0",
          );
          const startSec = parseInt(
            billingPeriod.querySelector("start")?.textContent || "0",
          );
          const valueWh = parseInt(
            consumption.querySelector("value")?.textContent || "0",
          );

          const multiplier = parseInt(
            consumption.querySelector("powerOfTenMultiplier")?.textContent ||
              "0",
          );
          const actualWh = valueWh * Math.pow(10, multiplier);
          const periodKwh = actualWh / 1000;
          const periodDays = durationSec / 86400;
          const annualKwh = Math.round((periodKwh / periodDays) * 365);

          const startDate = new Date(startSec * 1000);

          console.log("Green Button Summary (fallback):", {
            periodKwh,
            periodDays,
            annualKwh,
          });

          return {
            monthlyUsage: [
              {
                month: startDate.toLocaleString("default", { month: "long" }),
                year: startDate.getFullYear(),
                kWh: Math.round(periodKwh),
              },
            ],
            annualKwhFromSummary: annualKwh,
            billingPeriodDays: Math.round(periodDays),
            esiid,
          };
        }
      }

      // Last resort: use whatever interval data we found

      // Convert to array sorted by date
      const monthlyUsage = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, data]) => ({
          month: data.month,
          year: data.year,
          kWh: Math.round(data.kWh),
        }));

      return { monthlyUsage, esiid };
    } catch (err) {
      console.error("XML parsing error:", err);
      return null;
    }
  };

  // Parse Smart Meter Texas CSV format
  // Format: ESIID,USAGE_DATE,REVISION_DATE,USAGE_START_TIME,USAGE_END_TIME,USAGE_KWH,ESTIMATED_ACTUAL,CONSUMPTION_SURPLUSGENERATION
  const parseSmartMeterCSV = (csvText) => {
    try {
      const lines = csvText.split("\n").filter((line) => line.trim());
      if (lines.length < 2) return null;

      const header = lines[0].toLowerCase();
      const headerParts = header.split(",").map((h) => h.trim());

      // Find column indices for SMT format
      const esiidIdx = headerParts.findIndex((h) => h.includes("esiid"));
      const dateIdx = headerParts.findIndex(
        (h) => h.includes("usage_date") || h === "date",
      );
      const kwhIdx = headerParts.findIndex(
        (h) => h.includes("usage_kwh") || h.includes("kwh"),
      );

      // Fallback indices for standard SMT format
      const actualEsiidIdx = esiidIdx >= 0 ? esiidIdx : 0;
      const actualDateIdx = dateIdx >= 0 ? dateIdx : 1;
      const actualKwhIdx = kwhIdx >= 0 ? kwhIdx : 5;

      const monthlyData = {};
      let esiid = null;
      let totalKwh = 0;
      let rowCount = 0;
      let minDate = null;
      let maxDate = null;

      // Parse data lines (skip header)
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i]
          .split(",")
          .map((p) => p.trim().replace(/['"]/g, "")); // Remove quotes
        if (parts.length < 6) continue;

        // Extract ESIID from first valid row
        if (!esiid && parts[actualEsiidIdx]) {
          const esiidMatch = parts[actualEsiidIdx].match(/(\d{17,22})/);
          if (esiidMatch) esiid = esiidMatch[1];
        }

        // Parse date (MM/DD/YYYY format)
        const dateStr = parts[actualDateIdx];
        const dateMatch = dateStr.match(
          /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
        );
        if (!dateMatch) continue;

        let [, month, day, year] = dateMatch;
        year = year.length === 2 ? `20${year}` : year;
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
        );

        // Track date range
        if (!minDate || date < minDate) minDate = date;
        if (!maxDate || date > maxDate) maxDate = date;

        // Parse usage value
        const usage = parseFloat(parts[actualKwhIdx]);
        if (isNaN(usage) || usage < 0) continue;

        totalKwh += usage;
        rowCount++;

        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            kWh: 0,
            month: date.toLocaleString("default", { month: "long" }),
            year: date.getFullYear(),
          };
        }
        monthlyData[monthKey].kWh += usage;
      }

      // Calculate date coverage
      const daysCovered =
        minDate && maxDate
          ? Math.round((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1
          : 0;

      console.log("SMT CSV parsed:", {
        esiid,
        rowCount,
        totalKwh: Math.round(totalKwh),
        daysCovered,
        months: Object.keys(monthlyData).length,
        dateRange:
          minDate && maxDate
            ? `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`
            : "unknown",
      });

      // Convert to sorted array
      const monthlyUsage = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, data]) => ({
          month: data.month,
          year: data.year,
          kWh: Math.round(data.kWh),
        }));

      return {
        monthlyUsage,
        esiid,
        totalKwh: Math.round(totalKwh),
        daysCovered,
        rowCount,
      };
    } catch (err) {
      console.error("CSV parsing error:", err);
      return null;
    }
  };

  // Handle SMT Direct Login - fetch usage data using credentials (NOT saved)
  const handleSmtLogin = async (e) => {
    e.preventDefault();
    setSmtError("");
    setSmtLoading(true);

    try {
      console.log("Connecting to Smart Meter Texas...");

      const response = await fetch(`${SMT_API_URL}/api/smt/usage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: smtUsername,
          password: smtPassword,
          // No projectId - we just want the data, not to save credentials
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setSmtError(result.error || "Login failed. Check your credentials.");
        return;
      }

      // Keep credentials in memory for linking on form submit if user opts in
      // They'll be cleared after form submission either way
      // Note: Credentials are NEVER persisted to localStorage/sessionStorage

      console.log("SMT data received:", {
        esiid: result.data.esiid,
        annualKwh: result.data.annualKwh,
        months: result.data.monthsOfData,
      });

      // Set bill data with the fetched usage
      setBillData({
        source: "smart_meter_texas",
        dataQuality: result.data.isEstimated ? "good" : "excellent",
        utilityCompany: "Smart Meter Texas",
        esiid: result.data.esiid,
        serviceAddress: result.data.address,
        usageHistory: result.data.monthlyUsage,
        calculatedAnnualKwh: result.data.annualKwh,
        monthlyConsumption: result.data.monthlyUsage.map((m) => m.kWh),
        totalKwh: result.data.totalKwh,
        monthsOfData: result.data.monthsOfData,
        // New home indicators
        isNewHome: result.data.isNewHome,
        isEstimated: result.data.isEstimated,
        estimateMethod: result.data.estimateMethod,
      });

      // Mark as having a file (for validation)
      setFormData((prev) => ({
        ...prev,
        utilityBillPreview: "smtlogin",
        utilityBillFile: { name: "Smart Meter Texas - Direct" },
      }));

      // Clear any scan errors
      setScanError("");
    } catch (err) {
      console.error("SMT connection error:", err);
      if (err.message.includes("Failed to fetch")) {
        setSmtError(
          "Cannot connect to SMT server. Make sure the server is running (npm run server in smt-connector folder).",
        );
      } else {
        setSmtError(err.message || "Connection failed");
      }
    } finally {
      setSmtLoading(false);
    }
  };

  // Fetch REP list for SMT registration
  const fetchRepList = async () => {
    if (repList.length > 0) return; // Already loaded
    setRepLoading(true);
    try {
      const response = await fetch(`${SMT_API_URL}/api/smt/reps`);
      const result = await response.json();
      if (result.success && result.reps) {
        setRepList(result.reps);
      }
    } catch (err) {
      console.error("Failed to fetch REP list:", err);
    } finally {
      setRepLoading(false);
    }
  };

  // Handle SMT Registration - create new account
  const handleSmtRegister = async (e) => {
    e.preventDefault();
    setSmtRegError("");
    setSmtRegLoading(true);

    try {
      console.log("Registering Smart Meter Texas account...");

      const response = await fetch(`${SMT_API_URL}/api/smt/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(smtRegData),
      });

      const result = await response.json();

      if (!result.success) {
        setSmtRegError(result.error || "Registration failed");
        return;
      }

      // Success!
      setSmtRegSuccess(true);
      console.log("SMT registration successful");
    } catch (err) {
      console.error("SMT registration error:", err);
      if (err.message.includes("Failed to fetch")) {
        setSmtRegError(
          "Cannot connect to SMT server. Make sure the server is running.",
        );
      } else {
        setSmtRegError(err.message || "Registration failed");
      }
    } finally {
      setSmtRegLoading(false);
    }
  };

  // Pre-fill registration from bill data
  const prefillRegistrationFromBill = () => {
    if (billData) {
      setSmtRegData((prev) => ({
        ...prev,
        esiid: billData.esiid || prev.esiid,
        // Add more fields as they become available from bill scanning
      }));
    }
    // Also use contact info from form
    setSmtRegData((prev) => ({
      ...prev,
      firstName: formData.firstName || prev.firstName,
      lastName: formData.lastName || prev.lastName,
      email: formData.email || prev.email,
      phone: formData.phone || prev.phone,
    }));
    // Suggest username based on name
    if (formData.firstName && formData.lastName) {
      const suggestedUsername =
        `${formData.firstName.charAt(0)}${formData.lastName}`
          .replace(/[^a-zA-Z0-9]/g, "")
          .substring(0, 15);
      setSmtRegData((prev) => ({
        ...prev,
        username: prev.username || suggestedUsername,
      }));
    }
  };

  const validateStep = (step) => {
    if (step === 4) {
      if (!formData.utilityBillFile) {
        setError("Please upload your utility bill");
        return false;
      }
    }
    if (step === 5) {
      if (!formData.firstName || !formData.email) {
        setError("Please fill in required fields");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setError("Please enter a valid email address");
        return false;
      }
      // Skip password validation if user logged in via SMT - we'll use that password
      const usingSMTPassword =
        billData?.source === "smart_meter_texas" && smtPassword;
      if (!usingSMTPassword) {
        if (!formData.password) {
          setError("Please create a password for your account");
          return false;
        }
        if (formData.password.length < 8) {
          setError("Password must be at least 8 characters");
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match");
          return false;
        }
      }
    }
    return true;
  };

  // Pre-fill form data from bill scan / SMT data
  const prefillFromCollectedData = () => {
    const updates = {};

    // Try to get name from bill data
    if (billData?.customerName) {
      const nameParts = billData.customerName.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        updates.firstName = nameParts[0];
        updates.lastName = nameParts.slice(1).join(" ");
      } else if (nameParts.length === 1) {
        updates.firstName = nameParts[0];
      }
    }

    // Try to get name from SMT registration data
    if (smtRegData?.firstName && !updates.firstName) {
      updates.firstName = smtRegData.firstName;
    }
    if (smtRegData?.lastName && !updates.lastName) {
      updates.lastName = smtRegData.lastName;
    }

    // Try to get email - SMT username is often an email
    if (smtRegData?.email) {
      updates.email = smtRegData.email;
    } else if (smtUsername && smtUsername.includes("@")) {
      updates.email = smtUsername;
    }

    // Try to get phone from SMT registration
    if (smtRegData?.phone) {
      updates.phone = smtRegData.phone;
    }

    // Only update fields that have values and aren't already filled
    if (Object.keys(updates).length > 0) {
      setFormData((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(updates).filter(([key, value]) => value && !prev[key]),
        ),
      }));
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      const nextStepNum = Math.min(currentStep + 1, 5);

      // Pre-fill form when entering step 5
      if (nextStepNum === 5 && currentStep === 4) {
        prefillFromCollectedData();
      }

      setCurrentStep(nextStepNum);
      setError("");
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setError("");
  };

  const handleSubmit = async () => {
    if (!validateStep(6)) return;

    setIsSubmitting(true);
    setError("");

    try {
      const projectId = generateProjectId();

      // Upload utility bill to Storage if we have one
      let billUrl = null;
      if (formData.utilityBillFile) {
        try {
          console.log("Uploading utility bill to Storage...");
          billUrl = await uploadBillToStorage(
            projectId,
            formData.utilityBillFile,
          );
          console.log("Bill uploaded:", billUrl);
        } catch (uploadErr) {
          console.warn("Bill upload failed:", uploadErr);
          // Continue without uploaded bill - not critical
        }
      }

      // Get annual usage from bill data, or use Texas average if only meter data
      // Texas average home uses ~14,000 kWh/year
      const TEXAS_AVERAGE_KWH = 14000;
      const annualUsageKwh =
        billData?.calculatedAnnualKwh ||
        (billData?.currentUsageKwh ? billData.currentUsageKwh * 12 : null) ||
        (meterData ? TEXAS_AVERAGE_KWH : 12000);

      console.log("Using annual usage for design:", annualUsageKwh, "kWh");

      // Design solar system using Google Solar API
      // Target 100% offset with actual usage from bill
      let systemDesign = null;
      console.log(
        "Designing solar system with coords:",
        formData.latitude,
        formData.longitude,
      );
      try {
        if (formData.latitude && formData.longitude) {
          systemDesign = await designSolarSystem(
            formData.latitude,
            formData.longitude,
            annualUsageKwh, // Use actual usage from bill
            1.0, // Target 100% offset
          );
          console.log("Solar system design:", systemDesign);
        } else {
          console.warn("No coordinates available for solar design");
        }
      } catch (solarErr) {
        console.error("Solar API error:", solarErr);
        // Show error but continue - we can still qualify them
        setError(
          `Note: Could not generate system design - ${solarErr.message}`,
        );
      }

      // Build complete project data
      const projectData = {
        id: projectId,
        createdAt: new Date().toISOString(),
        status: "qualified",
        customer: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
        },
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          county: formData.county,
          latitude: formData.latitude,
          longitude: formData.longitude,
        },
        qualification: {
          isHomeowner: formData.isHomeowner,
          creditScore: formData.creditScore,
          hasUtilityBill: !!formData.utilityBillFile,
        },
        energyCommunity: {
          eligible: energyCommunityResult?.isEnergyCommunity || false,
          msa: energyCommunityResult?.msa || null,
          reason: energyCommunityResult?.reason || null,
        },
        // Include bill data from AI scan, Green Button, or meter QR scan
        billData: billData
          ? {
              utilityCompany: billData.utilityCompany,
              tduName: billData.tduName,
              esiid: billData.esiid,
              accountNumber: billData.accountNumber,
              annualUsageKwh: annualUsageKwh,
              ratePerKwh: billData.ratePerKwh,
              usageHistory: billData.usageHistory,
              billUrl: billUrl,
              source: billData.source || "utility_bill",
              dataQuality: billData.dataQuality || "good",
            }
          : meterData
            ? {
                esiid: meterData.esiid,
                tduName: meterData.tduName,
                meterNumber: meterData.meterNumber,
                annualUsageKwh: annualUsageKwh, // Texas average
                source: "meter_qr",
              }
            : null,
        systemDesign: systemDesign,
      };

      // Account creation moved to Success page - store data for later
      let userId = null;

      // Save to Firestore
      try {
        console.log("Saving project to Firestore...");
        // Add userId to project data
        projectData.userId = userId;
        await saveProject(projectData);
        console.log("Project saved to Firestore:", projectId);

        // Cache the design for this address
        const addressKey = hashAddress(
          `${formData.street} ${formData.city} ${formData.state} ${formData.postalCode}`,
        );
        await cacheDesign(addressKey, {
          systemDesign,
          billData: projectData.billData,
          latitude: formData.latitude,
          longitude: formData.longitude,
        });
        console.log("Design cached for address:", addressKey);
      } catch (firestoreErr) {
        console.warn("Firestore save failed:", firestoreErr);
        // Continue with localStorage fallback
      }

      // Also store locally as backup
      const existingProjects = JSON.parse(
        localStorage.getItem("pttp_projects") || "[]",
      );
      existingProjects.push(projectData);
      localStorage.setItem("pttp_projects", JSON.stringify(existingProjects));

      // Store for success page (including account creation data)
      sessionStorage.setItem("projectId", projectId);
      sessionStorage.setItem("customerName", formData.firstName);
      sessionStorage.setItem("customerLastName", formData.lastName);
      sessionStorage.setItem("customerEmail", formData.email);
      sessionStorage.setItem("customerPhone", formData.phone || "");
      sessionStorage.setItem(
        "customerAddress",
        `${formData.street}, ${formData.city}, ${formData.state} ${formData.postalCode}`,
      );
      sessionStorage.setItem("energyCommunity", "true");
      sessionStorage.setItem(
        "energyCommunityMSA",
        energyCommunityResult?.msa || "",
      );
      sessionStorage.setItem("county", formData.county || "");
      sessionStorage.setItem("latitude", formData.latitude?.toString() || "");
      sessionStorage.setItem("longitude", formData.longitude?.toString() || "");
      sessionStorage.setItem("annualUsageKwh", annualUsageKwh.toString());
      // Store bill or meter data for success page
      if (billData || meterData) {
        sessionStorage.setItem(
          "billData",
          JSON.stringify(projectData.billData),
        );
      }
      if (systemDesign) {
        const designStr = JSON.stringify(systemDesign);
        console.log(
          "Storing systemDesign to sessionStorage:",
          designStr.substring(0, 100) + "...",
        );
        sessionStorage.setItem("systemDesign", designStr);
        console.log(
          "Verifying sessionStorage:",
          sessionStorage.getItem("systemDesign")?.substring(0, 50),
        );
      } else {
        console.warn("No systemDesign to store!");
      }

      // Clear SMT credentials from memory (security)
      setSmtUsername("");
      setSmtPassword("");

      navigate("/success");
    } catch (err) {
      console.error("Submission error:", err);
      setError(err.message || "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Disqualified screen - Dark themed
  if (isDisqualified) {
    return (
      <div className="qualify-page">
        <style>{`
          .dq-page {
            min-height: 100vh;
            background: #0a0a0f;
            position: relative;
          }
          .dq-bg {
            position: fixed;
            inset: 0;
            background: url('/qualify-bg.jpg') center/cover no-repeat;
          }
          .dq-overlay {
            position: fixed;
            inset: 0;
            background: linear-gradient(
              to bottom,
              rgba(10, 10, 15, 0.85) 0%,
              rgba(10, 10, 15, 0.95) 100%
            );
          }
          .dq-container {
            position: relative;
            z-index: 10;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 24px;
            text-align: center;
          }
          .dq-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(245, 158, 11, 0.15);
            border: 2px solid rgba(245, 158, 11, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
          }
          .dq-title {
            font-size: 2rem;
            font-weight: 800;
            color: #fff;
            margin: 0 0 16px;
          }
          .dq-message {
            font-size: 1rem;
            color: rgba(255,255,255,0.6);
            max-width: 500px;
            line-height: 1.6;
            margin: 0 auto 32px;
          }
          .dq-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 16px;
            padding: 24px;
            max-width: 400px;
            text-align: left;
            margin-bottom: 32px;
          }
          .dq-card h3 {
            color: #fff;
            font-size: 1rem;
            font-weight: 600;
            margin: 0 0 16px;
          }
          .dq-card ul {
            margin: 0;
            padding-left: 20px;
            color: rgba(255,255,255,0.5);
          }
          .dq-card li {
            margin-bottom: 8px;
          }
          .dq-actions {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
            justify-content: center;
          }
          .dq-btn {
            padding: 14px 28px;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          .dq-btn-secondary {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.15);
            color: rgba(255,255,255,0.8);
          }
          .dq-btn-secondary:hover {
            background: rgba(255,255,255,0.15);
          }
          .dq-btn-primary {
            background: linear-gradient(135deg, #00D4AA, #00B894);
            border: none;
            color: #fff;
          }
          .dq-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 212, 170, 0.4);
          }
        `}</style>

        <div className="dq-bg" />
        <div className="dq-overlay" />

        <div className="dq-container">
          <div className="dq-icon">
            <XCircle size={40} style={{ color: "#f59e0b" }} />
          </div>

          <h1 className="dq-title">
            {disqualifyReason === "location" && "Area Not Eligible"}
            {disqualifyReason === "renter" && "Homeowners Only"}
            {disqualifyReason === "credit" && "Credit Requirement"}
          </h1>

          <p className="dq-message">
            {disqualifyReason === "location" && (
              <>
                Unfortunately, {formData.county} County is not currently in a
                designated federal energy community. We're expanding coverage
                and will notify you when your area qualifies.
              </>
            )}
            {disqualifyReason === "renter" && (
              <>
                This program requires homeownership for battery installation.
                Talk to your landlord - they may be interested in participating.
              </>
            )}
            {disqualifyReason === "credit" && (
              <>
                This program requires a minimum credit score of 650. Don't worry
                - we'll have other programs available soon.
              </>
            )}
          </p>

          <div className="dq-card">
            <h3>What's Next?</h3>
            <ul>
              {disqualifyReason === "location" && (
                <>
                  <li>Check if other properties you own qualify</li>
                  <li>Join our waitlist for area expansion</li>
                  <li>Explore solar-only options in your area</li>
                </>
              )}
              {disqualifyReason === "renter" && (
                <>
                  <li>Share this program with your landlord</li>
                  <li>Ask about community solar options</li>
                  <li>Save this for when you become a homeowner</li>
                </>
              )}
              {disqualifyReason === "credit" && (
                <>
                  <li>Review your credit report for errors</li>
                  <li>Join our waitlist for alternative programs</li>
                  <li>Check back in a few months</li>
                </>
              )}
            </ul>
          </div>

          <div className="dq-actions">
            <Link to="/" className="dq-btn dq-btn-secondary">
              Back to Home
            </Link>
            <button
              onClick={() => {
                setIsDisqualified(false);
                setDisqualifyReason("");
                setCurrentStep(1);
                setEnergyCommunityResult(null);
                setFormData((prev) => ({
                  ...prev,
                  isHomeowner: null,
                  creditScore: null,
                }));
              }}
              className="dq-btn dq-btn-primary"
            >
              Try Another Address
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step-specific content - QUOTES & FACTS that emotionally sell
  const stepContent = {
    1: {
      bg: "/graffiti-fist-sun.jpg",
      badge: "Limited Availability",
      title: "2026 Enrollment ",
      highlight: "Now Open",
      subtitle: "Enter your Texas address",
      sell: "Texas gets 234 sunny days per year. Your roof is literally a money printer.",
      sellAuthor: "— Texas Solar Facts",
    },
    2: {
      bg: "/graffiti-family-silhouette.jpg",
      badge: "Step 2 of 6",
      title: "Property ",
      highlight: "Ownership",
      subtitle: "Do you own this home?",
      sell: "Winter Storm Uri: 246 Texans died. Most froze in their own homes waiting for the grid.",
      sellAuthor: "— Texas Tribune, 2021",
    },
    3: {
      bg: "/graffiti-scales-justice.jpg",
      badge: "Step 3 of 6",
      title: "Credit ",
      highlight: "Check",
      subtitle: "Quick soft check - won't affect your score",
      sell: "We are going to make electricity so cheap that only the rich will burn candles.",
      sellAuthor: "— Thomas Edison",
    },
    4: {
      bg: "/graffiti-meter-money.jpg",
      badge: "Step 4 of 6",
      title: "Smart Meter ",
      highlight: "Connection",
      subtitle: "Let's size your system",
      sell: "August 2023: Texas paid $5/kWh during peak hours. That's 50x normal. Battery owners cashed in.",
      sellAuthor: "— ERCOT Market Data",
    },
    5: {
      bg: "/graffiti-liberty-torch.jpg",
      badge: "Step 5 of 6",
      title: "Almost ",
      highlight: "There",
      subtitle: "You made it further than most",
      sell: "The future belongs to those who prepare for it today.",
      sellAuthor: "— Malcolm X",
    },
    6: {
      bg: "/graffiti-phoenix.jpg",
      badge: "Final Step",
      title: "Stay ",
      highlight: "Ready",
      subtitle: "Where should we reach you?",
      sell: "I'd rather die on my feet than live on my knees.",
      sellAuthor: "— Emiliano Zapata",
    },
  };

  const current = stepContent[currentStep];

  return (
    <div className="qualify-page">
      <style>{`
        /* Full-Screen Integrated Layout */
        .qualify-page {
          height: 100vh;
          background: #0a0a0f;
          position: relative;
          overflow: hidden;
        }

        .qualify-bg {
          position: fixed;
          inset: 0;
          background-size: cover;
          background-position: center;
          transition: opacity 0.5s ease;
        }

        .qualify-overlay {
          position: fixed;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0.75) 0%,
            rgba(0, 0, 0, 0.5) 20%,
            rgba(0, 0, 0, 0.45) 50%,
            rgba(0, 0, 0, 0.5) 80%,
            rgba(0, 0, 0, 0.8) 100%
          );
        }

        .qualify-container {
          position: relative;
          z-index: 10;
          height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 0 24px;
          overflow: hidden;
        }

        /* Header */
        .q-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 28px;
          margin: 0 -24px;
          background: linear-gradient(
            180deg,
            rgba(5, 10, 20, 0.9) 0%,
            rgba(10, 15, 30, 0.7) 60%,
            transparent 100%
          );
        }

        .q-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #fff;
          font-weight: 800;
          font-size: 1.15rem;
          text-decoration: none;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        }

        .q-logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #00FFD4 0%, #00D4AA 50%, #00B894 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(0, 212, 170, 0.5),
                      0 4px 15px rgba(0, 0, 0, 0.3);
        }

        /* Steps - Timeline with labels */
        .q-steps {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          gap: 0;
          padding: 14px 20px;
          max-width: 720px;
          margin: 0 auto;
          width: 100%;
          background: linear-gradient(135deg,
            rgba(10, 15, 25, 0.8) 0%,
            rgba(15, 20, 35, 0.85) 100%);
          border: 1px solid rgba(0, 212, 170, 0.15);
          border-radius: 16px;
          margin-bottom: 24px;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4),
                      inset 0 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
        }

        .q-step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          position: relative;
        }

        .q-step-item:not(:last-child)::after {
          content: '';
          position: absolute;
          top: 12px;
          left: 50%;
          width: 100%;
          height: 2px;
          background: rgba(255,255,255,0.1);
          z-index: 0;
        }

        .q-step-item.completed:not(:last-child)::after {
          background: linear-gradient(90deg, #00D4AA 0%, #00D4AA 100%);
        }

        .q-step-item.active:not(:last-child)::after {
          background: linear-gradient(90deg, #00D4AA 0%, rgba(255,255,255,0.1) 50%);
        }

        .q-step-num {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 800;
          background: rgba(20, 30, 45, 0.8);
          border: 2px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.4);
          position: relative;
          z-index: 1;
          transition: all 0.3s ease;
        }

        .q-step-item.active .q-step-num {
          background: linear-gradient(135deg, #00FFD4 0%, #00D4AA 100%);
          border-color: #00FFD4;
          color: #0a1520;
          box-shadow: 0 0 25px rgba(0, 212, 170, 0.7),
                      0 0 50px rgba(0, 212, 170, 0.3);
        }

        .q-step-item.completed .q-step-num {
          background: linear-gradient(135deg,
            rgba(0, 212, 170, 0.25) 0%,
            rgba(0, 184, 148, 0.3) 100%);
          border-color: rgba(0, 212, 170, 0.6);
          color: #00FFD4;
          box-shadow: 0 0 15px rgba(0, 212, 170, 0.3);
        }

        .q-step-label {
          margin-top: 8px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(255,255,255,0.4);
          transition: all 0.3s ease;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        .q-step-item.active .q-step-label {
          color: #00FFD4;
          text-shadow: 0 0 10px rgba(0, 212, 170, 0.5),
                       0 2px 4px rgba(0, 0, 0, 0.5);
        }

        .q-step-item.completed .q-step-label {
          color: rgba(0, 212, 170, 0.8);
        }

        @media (max-width: 600px) {
          .q-step-label {
            font-size: 0.6rem;
          }
        }

        /* Main Content Area - centered single-column layout */
        .q-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          max-width: 700px;
          margin: 0 auto;
          padding: 0;
        }

        .q-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: linear-gradient(135deg,
            rgba(0, 212, 170, 0.2) 0%,
            rgba(0, 184, 148, 0.15) 100%);
          border: 1px solid rgba(0, 212, 170, 0.4);
          border-radius: 100px;
          color: #00FFD4;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 20px;
          box-shadow: 0 0 20px rgba(0, 212, 170, 0.2),
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          text-shadow: 0 0 10px rgba(0, 212, 170, 0.5);
        }

        .q-badge-dot {
          width: 8px;
          height: 8px;
          background: #00FFD4;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
          box-shadow: 0 0 10px rgba(0, 212, 170, 0.8);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 10px rgba(0, 212, 170, 0.8); }
          50% { opacity: 0.5; box-shadow: 0 0 20px rgba(0, 212, 170, 1); }
        }

        .q-title {
          font-size: clamp(2rem, 6vw, 3rem);
          font-weight: 900;
          color: #fff;
          line-height: 1.15;
          margin: 28px 0 8px;
          letter-spacing: -0.02em;
          white-space: nowrap;
          text-shadow: 0 2px 20px rgba(0, 0, 0, 0.8),
                       0 0 40px rgba(0, 0, 0, 0.5);
        }

        .q-title .highlight {
          display: inline;
          background: linear-gradient(135deg, #00FFD4 0%, #00D4AA 50%, #00B894 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 20px rgba(0, 212, 170, 0.6));
        }

        .q-subtitle {
          font-size: 1.1rem;
          color: rgba(255,255,255,0.85);
          margin: 0 0 24px;
          line-height: 1.5;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
          font-weight: 500;
        }

        /* QUOTE/FACT - Elegant gold italic above title */
        .q-sell-wrapper {
          text-align: center;
          max-width: 600px;
          padding: 0 20px;
        }

        .q-sell {
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 1.25rem;
          font-weight: 400;
          font-style: italic;
          color: #fbbf24;
          line-height: 1.5;
          text-shadow:
            0 0 30px rgba(251, 191, 36, 0.3),
            0 2px 10px rgba(0, 0, 0, 0.8);
          display: inline;
        }

        .q-sell::before {
          content: '"';
          color: rgba(251, 191, 36, 0.7);
          font-size: 1.5rem;
        }

        .q-sell::after {
          content: '"';
          color: rgba(251, 191, 36, 0.7);
          font-size: 1.5rem;
        }

        .q-sell-author {
          display: block;
          margin-top: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
          letter-spacing: 0.5px;
        }

        @media (max-width: 600px) {
          .q-sell {
            font-size: 1.05rem;
          }
          .q-sell::before,
          .q-sell::after {
            font-size: 1.3rem;
          }
          .q-sell-author {
            font-size: 0.8rem;
          }
          .q-title {
            margin-top: 20px;
          }
        }

        /* Form Area - Directly Integrated */
        .q-form {
          width: 100%;
          max-width: 560px;
        }

        .q-input-group {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }

        /* Universal Input Styling - Dark Glass */
        .q-input,
        .q-form input,
        .q-form input[type="text"],
        .q-form input[type="email"],
        .q-form input[type="tel"],
        .q-form input[type="password"],
        .qualify-page input[type="text"],
        .qualify-page input[type="email"],
        .qualify-page input[type="tel"],
        .qualify-page input[type="password"] {
          width: 100%;
          padding: 16px 18px;
          background: linear-gradient(135deg,
            rgba(15, 25, 35, 0.9) 0%,
            rgba(20, 30, 45, 0.95) 100%) !important;
          border: 2px solid rgba(0, 212, 170, 0.25) !important;
          border-radius: 12px;
          color: #ffffff !important;
          font-size: 16px;
          font-family: inherit;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3),
                      inset 0 1px 0 rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
        }

        .q-input::placeholder,
        .q-form input::placeholder,
        .qualify-page input::placeholder {
          color: rgba(255, 255, 255, 0.45) !important;
          font-weight: 500;
        }

        .q-input:hover,
        .q-form input:hover,
        .qualify-page input:hover {
          border-color: rgba(0, 212, 170, 0.4) !important;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35),
                      inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
        }

        .q-input:focus,
        .q-form input:focus,
        .qualify-page input:focus {
          outline: none !important;
          border-color: rgba(0, 212, 170, 0.6) !important;
          background: linear-gradient(135deg,
            rgba(15, 25, 35, 0.95) 0%,
            rgba(20, 30, 45, 1) 100%) !important;
          box-shadow: 0 0 25px rgba(0, 212, 170, 0.2),
                      0 8px 25px rgba(0, 0, 0, 0.4),
                      inset 0 1px 0 rgba(255, 255, 255, 0.12) !important;
        }

        /* Address Autocomplete specific */
        .qualify-page .pac-target-input,
        .q-form .pac-target-input {
          background: rgba(20, 30, 40, 0.8) !important;
          border: 2px solid rgba(255, 255, 255, 0.12) !important;
          color: #ffffff !important;
        }

        /* Dark theme for AddressAutocomplete component */
        .qualify-page .address-autocomplete {
          width: 100%;
        }

        /* Location button NEXT to search bar */
        .qualify-page .address-input-wrapper {
          flex-direction: row !important;
          gap: 12px;
          align-items: stretch;
        }

        .qualify-page .address-input-container {
          flex: 1;
        }

        .qualify-page .address-actions {
          flex-shrink: 0;
          display: flex;
        }

        .qualify-page .input-icon {
          color: #00FFD4 !important;
          left: 18px !important;
          filter: drop-shadow(0 0 8px rgba(0, 212, 170, 0.5));
        }

        .qualify-page .address-input-container:focus-within .input-icon {
          color: #00FFD4 !important;
          filter: drop-shadow(0 0 12px rgba(0, 212, 170, 0.7));
        }

        .qualify-page .address-input {
          width: 100%;
          padding: 18px 40px 18px 50px !important;
          background: linear-gradient(135deg,
            rgba(15, 25, 35, 0.9) 0%,
            rgba(20, 30, 45, 0.95) 100%) !important;
          border: 2px solid rgba(0, 212, 170, 0.3) !important;
          border-radius: 14px;
          color: #ffffff !important;
          font-size: 17px;
          font-weight: 500;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4),
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(20px);
        }

        .qualify-page .address-input::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
          font-weight: 500;
        }

        .qualify-page .address-input:focus {
          border-color: rgba(0, 212, 170, 0.6) !important;
          background: linear-gradient(135deg,
            rgba(15, 25, 35, 0.95) 0%,
            rgba(20, 30, 45, 1) 100%) !important;
          box-shadow: 0 0 30px rgba(0, 212, 170, 0.25),
                      0 8px 30px rgba(0, 0, 0, 0.4),
                      inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
        }

        .qualify-page .address-input.has-value {
          border-color: rgba(0, 212, 170, 0.5) !important;
        }

        .qualify-page .clear-btn {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.6);
        }

        .qualify-page .clear-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
        }

        /* Location button - icon only on mobile */
        .qualify-page .location-btn {
          background: linear-gradient(135deg, #00FFD4 0%, #00D4AA 50%, #00B894 100%);
          border: 2px solid rgba(0, 255, 212, 0.3);
          color: #0a1520;
          padding: 18px 22px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 700;
          box-shadow: 0 0 30px rgba(0, 212, 170, 0.5),
                      0 4px 20px rgba(0, 0, 0, 0.3);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .qualify-page .location-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 0 40px rgba(0, 212, 170, 0.7),
                      0 8px 30px rgba(0, 0, 0, 0.4);
        }

        .qualify-page .location-btn .location-text {
          display: inline;
        }

        @media (max-width: 500px) {
          .qualify-page .location-btn {
            padding: 16px;
          }
          .qualify-page .location-btn .location-text,
          .qualify-page .location-btn .btn-text {
            display: none !important;
          }
        }

        .qualify-page .address-error {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        /* Hide redundant "Selected:" badge - we show eligibility status instead */
        .qualify-page .address-selected {
          display: none !important;
        }

        /* Google autocomplete dropdown styling - Dark Glass */
        .pac-container {
          background: linear-gradient(135deg,
            rgba(15, 25, 40, 0.98) 0%,
            rgba(20, 30, 50, 0.98) 100%) !important;
          border: 1px solid rgba(0, 212, 170, 0.3) !important;
          border-radius: 14px !important;
          margin-top: 10px !important;
          box-shadow: 0 10px 50px rgba(0, 0, 0, 0.6),
                      0 0 30px rgba(0, 212, 170, 0.1) !important;
          font-family: inherit !important;
          overflow: hidden;
          backdrop-filter: blur(20px);
        }

        .pac-item {
          padding: 16px 18px !important;
          color: #ffffff !important;
          border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
          cursor: pointer !important;
          background: transparent !important;
          transition: all 0.2s ease !important;
        }

        .pac-item:first-child {
          border-top: none !important;
        }

        .pac-item:hover,
        .pac-item-selected {
          background: rgba(0, 212, 170, 0.15) !important;
        }

        .pac-item-query {
          color: #ffffff !important;
          font-size: 0.95rem !important;
          font-weight: 600 !important;
        }

        .pac-matched {
          color: #00FFD4 !important;
          font-weight: 700 !important;
        }

        .pac-icon {
          display: none !important;
        }

        .hdpi.pac-logo::after {
          display: none !important;
        }

        .q-btn {
          padding: 16px 28px;
          background: linear-gradient(135deg, #00D4AA 0%, #00B894 100%);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
          box-shadow: 0 4px 20px rgba(0, 212, 170, 0.4);
        }

        .q-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 30px rgba(0, 212, 170, 0.5);
        }

        .q-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .q-btn-secondary {
          background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
          border: 1.5px solid rgba(255,255,255,0.2);
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .q-btn-secondary:hover {
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%);
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        }

        /* Option Cards - Dark Glass Revolutionary */
        .q-options {
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
        }

        .q-option {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 22px 26px;
          background: linear-gradient(135deg,
            rgba(15, 25, 35, 0.85) 0%,
            rgba(20, 30, 45, 0.9) 100%);
          border: 2px solid rgba(0, 212, 170, 0.3);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: left;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4),
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .q-option:hover {
          background: linear-gradient(135deg,
            rgba(0, 212, 170, 0.15) 0%,
            rgba(20, 35, 50, 0.95) 100%);
          border-color: rgba(0, 212, 170, 0.6);
          transform: translateY(-3px);
          box-shadow: 0 8px 30px rgba(0, 212, 170, 0.25),
                      0 0 40px rgba(0, 212, 170, 0.15),
                      inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }

        .q-option-icon {
          width: 52px;
          height: 52px;
          background: linear-gradient(135deg,
            rgba(0, 212, 170, 0.2) 0%,
            rgba(0, 184, 148, 0.3) 100%);
          border: 2px solid rgba(0, 212, 170, 0.4);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #00FFD4;
          flex-shrink: 0;
          box-shadow: 0 0 20px rgba(0, 212, 170, 0.3),
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .q-option:hover .q-option-icon {
          background: linear-gradient(135deg,
            rgba(0, 212, 170, 0.3) 0%,
            rgba(0, 184, 148, 0.4) 100%);
          border-color: rgba(0, 212, 170, 0.7);
          box-shadow: 0 0 30px rgba(0, 212, 170, 0.5);
        }

        .q-option-content h3 {
          margin: 0 0 4px;
          font-size: 1.1rem;
          font-weight: 700;
          color: #ffffff;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .q-option-content p {
          margin: 0;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
        }

        /* Secondary option style - for "No" answers */
        .q-option-secondary {
          border-color: rgba(255, 100, 100, 0.25);
        }

        .q-option-secondary:hover {
          border-color: rgba(255, 100, 100, 0.5);
          background: linear-gradient(135deg,
            rgba(255, 100, 100, 0.1) 0%,
            rgba(30, 25, 35, 0.95) 100%);
          box-shadow: 0 8px 30px rgba(255, 100, 100, 0.15),
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .q-option-icon-secondary {
          background: linear-gradient(135deg,
            rgba(255, 150, 150, 0.15) 0%,
            rgba(255, 100, 100, 0.2) 100%) !important;
          border-color: rgba(255, 150, 150, 0.3) !important;
          color: #ffaaaa !important;
          box-shadow: 0 0 15px rgba(255, 100, 100, 0.2),
                      inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
        }

        .q-option-secondary:hover .q-option-icon-secondary {
          border-color: rgba(255, 150, 150, 0.5) !important;
          box-shadow: 0 0 25px rgba(255, 100, 100, 0.35) !important;
        }

        /* Stats Row */
        .q-stats {
          display: flex;
          justify-content: center;
          gap: 48px;
          padding: 24px 32px;
          margin: 0 -24px;
          margin-top: auto;
          background: linear-gradient(
            0deg,
            rgba(5, 10, 20, 0.95) 0%,
            rgba(10, 15, 30, 0.8) 50%,
            transparent 100%
          );
        }

        .q-stat {
          text-align: center;
        }

        .q-stat-value {
          font-size: 1.4rem;
          font-weight: 900;
          background: linear-gradient(135deg, #00FFD4 0%, #00D4AA 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 15px rgba(0, 212, 170, 0.5));
          text-shadow: none;
          color: #fff;
        }

        /* Spots counter animation */
        .spots-counter {
          animation: spotsFlash 0.6s ease-out;
        }

        @keyframes spotsFlash {
          0% {
            transform: scale(1.3);
            filter: drop-shadow(0 0 30px rgba(255, 100, 100, 0.9));
          }
          50% {
            filter: drop-shadow(0 0 20px rgba(255, 150, 100, 0.7));
          }
          100% {
            transform: scale(1);
            filter: drop-shadow(0 0 15px rgba(0, 212, 170, 0.5));
          }
        }

        .q-stat-label {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.6);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        /* Error Message */
        .q-error {
          margin-top: 12px;
          padding: 12px 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #E74C3C;
          font-size: 0.9rem;
        }

        /* Loading Spinner */
        .q-spinner {
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Helper text */
        .q-helper {
          margin-top: 16px;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.6);
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
          font-weight: 500;
        }

        /* ====== CINEMATIC DATA HUD ====== */
        .hud-overlay {
          position: fixed;
          top: 50%;
          right: 32px;
          transform: translateY(-50%);
          z-index: 100;
          display: flex;
          flex-direction: column;
          gap: 3px;
          pointer-events: none;
          font-family: 'SF Mono', 'Fira Code', 'Monaco', monospace;
        }

        .hud-row {
          display: flex;
          align-items: baseline;
          gap: 14px;
          opacity: 0;
          animation: hudFadeIn 0.5s ease-out forwards;
          padding: 3px 0;
        }

        .hud-row:nth-child(1) { animation-delay: 0.05s; }
        .hud-row:nth-child(2) { animation-delay: 0.1s; }
        .hud-row:nth-child(3) { animation-delay: 0.15s; }
        .hud-row:nth-child(4) { animation-delay: 0.2s; }
        .hud-row:nth-child(5) { animation-delay: 0.25s; }
        .hud-row:nth-child(6) { animation-delay: 0.3s; }
        .hud-row:nth-child(7) { animation-delay: 0.35s; }
        .hud-row:nth-child(8) { animation-delay: 0.4s; }

        @keyframes hudFadeIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        /* Label - right aligned */
        .hud-label {
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
          min-width: 55px;
          text-align: right;
        }

        /* Separator dash */
        .hud-sep {
          color: rgba(0, 255, 212, 0.3);
          font-size: 0.8rem;
        }

        /* Data value */
        .hud-value {
          font-size: 0.9rem;
          font-weight: 500;
          letter-spacing: 0.3px;
          color: #ffffff;
          text-shadow: 0 0 30px rgba(0, 255, 212, 0.3);
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .hud-value.highlight {
          color: #00FFD4;
          text-shadow: 0 0 25px rgba(0, 255, 212, 0.5);
        }

        .hud-value.scanning {
          color: rgba(0, 255, 212, 0.7);
          animation: hudBlink 0.6s ease-in-out infinite;
        }

        @keyframes hudBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        /* Divider between sections */
        .hud-spacer {
          height: 6px;
        }

        /* Hide on smaller screens */
        @media (max-width: 1100px) {
          .hud-overlay {
            display: none;
          }
        }

        /* ====== LIVE FEED BANNER ====== */
        .live-feed {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 200;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 20px;
          background: linear-gradient(135deg,
            rgba(10, 15, 25, 0.9) 0%,
            rgba(15, 20, 35, 0.95) 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
          animation: feedSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          font-size: 0.85rem;
        }

        @keyframes feedSlideIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .live-feed-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: feedPulse 1s ease-in-out infinite;
        }

        .live-feed-dot.qualified {
          background: #00FFD4;
          box-shadow: 0 0 12px rgba(0, 255, 212, 0.8);
        }

        .live-feed-dot.not-qualified {
          background: #ff6b6b;
          box-shadow: 0 0 12px rgba(255, 107, 107, 0.6);
        }

        @keyframes feedPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.9); }
        }

        .live-feed-text {
          color: rgba(255, 255, 255, 0.9);
        }

        .live-feed-name {
          font-weight: 600;
          color: #fff;
        }

        .live-feed-city {
          color: rgba(255, 255, 255, 0.5);
        }

        .live-feed-status {
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .live-feed-status.qualified {
          background: rgba(0, 212, 170, 0.2);
          color: #00FFD4;
          border: 1px solid rgba(0, 212, 170, 0.3);
        }

        .live-feed-status.not-qualified {
          background: rgba(255, 107, 107, 0.15);
          color: #ff8a8a;
          border: 1px solid rgba(255, 107, 107, 0.2);
        }

        @media (max-width: 500px) {
          .live-feed {
            font-size: 0.75rem;
            padding: 8px 14px;
            gap: 8px;
          }
          .live-feed-city {
            display: none;
          }
        }

        /* Pre-filled data notice */
        .q-prefilled-notice {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px 20px;
          margin-bottom: 20px;
          background: linear-gradient(135deg,
            rgba(0, 212, 170, 0.15) 0%,
            rgba(0, 184, 148, 0.1) 100%);
          border: 1px solid rgba(0, 212, 170, 0.3);
          border-radius: 12px;
          color: #00FFD4;
          font-size: 0.9rem;
          font-weight: 600;
          box-shadow: 0 0 20px rgba(0, 212, 170, 0.15);
        }

        .q-prefilled-notice svg {
          flex-shrink: 0;
        }

        /* Form row for multiple inputs */
        .q-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }

        .q-form-group {
          text-align: left;
        }

        .q-label {
          display: block;
          margin-bottom: 10px;
          font-size: 0.95rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
          text-transform: none;
          letter-spacing: 0;
        }

        .q-form-group .q-input {
          margin-bottom: 0;
        }

        /* Success indicator */
        .q-success-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #00D4AA, #00B894);
          border: none;
          border-radius: 100px;
          color: #ffffff;
          font-weight: 600;
          font-size: 0.9rem;
          margin-bottom: 20px;
          box-shadow: 0 4px 15px rgba(0, 212, 170, 0.4);
        }

        /* Mobile adjustments */
        @media (max-width: 600px) {
          .q-input-group {
            flex-direction: column;
          }

          .q-stats {
            gap: 24px;
          }

          .q-form-row {
            grid-template-columns: 1fr;
          }
        }

        /* SMT Section styling */
        .q-smt-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
        }

        .q-smt-tab {
          flex: 1;
          padding: 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: rgba(255,255,255,0.5);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .q-smt-tab.active {
          background: rgba(16, 185, 129, 0.15);
          border-color: rgba(16, 185, 129, 0.3);
          color: #10b981;
        }
      `}</style>

      {/* Background */}
      <div
        className="qualify-bg"
        style={{ backgroundImage: `url(${current.bg})` }}
      />
      <div className="qualify-overlay" />

      {/* Live Feed Banner */}
      {liveFeed && (
        <div className="live-feed" key={`${liveFeed.name}-${Date.now()}`}>
          <div
            className={`live-feed-dot ${liveFeed.qualified ? "qualified" : "not-qualified"}`}
          />
          <span className="live-feed-text">
            <span className="live-feed-name">{liveFeed.name}</span>
            {" from "}
            <span className="live-feed-city">{liveFeed.city}</span>
          </span>
          <span
            className={`live-feed-status ${liveFeed.qualified ? "qualified" : "not-qualified"}`}
          >
            {liveFeed.qualified ? "✓ Qualified" : liveFeed.reason}
          </span>
        </div>
      )}

      {/* Cinematic Data HUD - Real values */}
      {currentStep > 1 && (
        <div className="hud-overlay">
          {/* Address */}
          {formData.street && (
            <>
              <div className="hud-row">
                <span className="hud-label">addr</span>
                <span className="hud-sep">—</span>
                <span className="hud-value">{formData.street}</span>
              </div>
              <div className="hud-row">
                <span className="hud-label"></span>
                <span className="hud-sep"></span>
                <span className="hud-value">
                  {formData.city}, {formData.state} {formData.postalCode}
                </span>
              </div>
              <div className="hud-spacer" />
            </>
          )}

          {/* Energy Data */}
          {billData && (
            <>
              {billData.esiid && (
                <div className="hud-row">
                  <span className="hud-label">esiid</span>
                  <span className="hud-sep">—</span>
                  <span className="hud-value highlight">{billData.esiid}</span>
                </div>
              )}
              {billData.calculatedAnnualKwh && (
                <div className="hud-row">
                  <span className="hud-label">usage</span>
                  <span className="hud-sep">—</span>
                  <span className="hud-value highlight">
                    {billData.calculatedAnnualKwh.toLocaleString()} kWh/yr
                  </span>
                </div>
              )}
              {billData.utilityCompany && (
                <div className="hud-row">
                  <span className="hud-label">util</span>
                  <span className="hud-sep">—</span>
                  <span className="hud-value">{billData.utilityCompany}</span>
                </div>
              )}
              <div className="hud-spacer" />
            </>
          )}

          {/* Scanning indicator */}
          {isScanning && currentStep === 4 && (
            <div className="hud-row">
              <span className="hud-label">scan</span>
              <span className="hud-sep">—</span>
              <span className="hud-value scanning">analyzing...</span>
            </div>
          )}

          {/* Contact - as it's entered */}
          {formData.firstName && (
            <div className="hud-row">
              <span className="hud-label">name</span>
              <span className="hud-sep">—</span>
              <span className="hud-value">
                {formData.firstName} {formData.lastName}
              </span>
            </div>
          )}
          {formData.email && (
            <div className="hud-row">
              <span className="hud-label">email</span>
              <span className="hud-sep">—</span>
              <span className="hud-value">{formData.email}</span>
            </div>
          )}
          {formData.phone && (
            <div className="hud-row">
              <span className="hud-label">phone</span>
              <span className="hud-sep">—</span>
              <span className="hud-value">{formData.phone}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Container */}
      <div className="qualify-container">
        {/* Header */}
        <header className="q-header">
          <Link to="/" className="q-logo">
            <div className="q-logo-icon">
              <Zap size={20} />
            </div>
            Power to the People
          </Link>
        </header>

        {/* Step Indicators - Timeline with labels */}
        <div className="q-steps">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`q-step-item ${currentStep === step.id ? "active" : ""} ${currentStep > step.id ? "completed" : ""}`}
            >
              <div className="q-step-num">
                {currentStep > step.id ? <CheckCircle2 size={16} /> : step.id}
              </div>
              <span className="q-step-label">{step.label}</span>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="q-main">
          {/* Quote */}
          {current.sell && (
            <div className="q-sell-wrapper">
              <span className="q-sell">{current.sell}</span>
              {current.sellAuthor && (
                <span className="q-sell-author">{current.sellAuthor}</span>
              )}
            </div>
          )}

          {/* Title + Form */}
          <h1 className="q-title">
            {current.title}
            <span className="highlight">{current.highlight}</span>
          </h1>

          <p className="q-subtitle">{current.subtitle}</p>
          {/* Step 1: Address Input - Auto-checks and auto-advances */}
          {currentStep === 1 && (
            <div className="q-form">
              <AddressAutocomplete
                onAddressSelect={handleAddressSelect}
                className="q-input"
                placeholder="Enter your Texas address..."
              />

              {/* Loading state while checking eligibility */}
              {isCheckingEligibility && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    marginTop: 20,
                    padding: 16,
                    background: "rgba(16, 185, 129, 0.1)",
                    borderRadius: 12,
                    color: "#10b981",
                  }}
                >
                  <Loader2 size={20} className="q-spinner" />
                  <span style={{ fontWeight: 500 }}>
                    Checking eligibility...
                  </span>
                </div>
              )}

              {/* Success - briefly shown before auto-advance */}
              {energyCommunityResult?.isEnergyCommunity &&
                !isCheckingEligibility && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                      marginTop: 20,
                      padding: 16,
                      background: "rgba(16, 185, 129, 0.15)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      borderRadius: 12,
                      color: "#10b981",
                    }}
                  >
                    <CheckCircle size={20} />
                    <span style={{ fontWeight: 600 }}>
                      Eligible! {energyCommunityResult.msa} MSA
                    </span>
                  </div>
                )}

              {error && <div className="q-error">{error}</div>}
            </div>
          )}

          {/* Step 2: Homeowner */}
          {currentStep === 2 && (
            <div className="q-form">
              <div className="q-options">
                <button
                  className="q-option"
                  onClick={() => handleHomeownerSelect(true)}
                >
                  <div className="q-option-icon">
                    <Home size={24} />
                  </div>
                  <div className="q-option-content">
                    <h3>Yes, I own this property</h3>
                    <p>I am the homeowner or on the deed</p>
                  </div>
                </button>

                <button
                  className="q-option q-option-secondary"
                  onClick={() => handleHomeownerSelect(false)}
                >
                  <div className="q-option-icon q-option-icon-secondary">
                    <Key size={24} />
                  </div>
                  <div className="q-option-content">
                    <h3>No, I rent</h3>
                    <p>I am renting this property</p>
                  </div>
                </button>
              </div>
              <p className="q-helper">
                We verify ownership through public records.
              </p>
            </div>
          )}

          {/* Step 3: Credit */}
          {currentStep === 3 && (
            <div className="q-form">
              <div className="q-options">
                <button
                  className="q-option"
                  onClick={() => handleCreditSelect(true)}
                >
                  <div className="q-option-icon">
                    <CreditCard size={24} />
                  </div>
                  <div className="q-option-content">
                    <h3>Yes, my credit is 650+</h3>
                    <p>Good to excellent credit range</p>
                  </div>
                </button>

                <button
                  className="q-option q-option-secondary"
                  onClick={() => handleCreditSelect(false)}
                >
                  <div className="q-option-icon q-option-icon-secondary">
                    <ShieldX size={24} />
                  </div>
                  <div className="q-option-content">
                    <h3>No, below 650</h3>
                    <p>Working on improving my credit</p>
                  </div>
                </button>
              </div>
              <p className="q-helper">
                Soft inquiry only - won't affect your FICO score.
              </p>
            </div>
          )}

          {/* Step 4: Smart Meter */}
          {currentStep === 4 && (
            <div className="q-form">
              {/* Hidden file inputs */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,.pdf"
                style={{ display: "none" }}
              />
              <input
                type="file"
                ref={meterInputRef}
                onChange={handleMeterUpload}
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
              />

              {!billData && !scanMode && (
                <div className="q-options">
                  <button
                    className="q-option"
                    onClick={() => setScanMode("smtlogin")}
                  >
                    <div className="q-option-icon">
                      <Zap size={24} />
                    </div>
                    <div className="q-option-content">
                      <h3>Smart Meter Texas Login</h3>
                      <p>Instant access to your usage data</p>
                    </div>
                  </button>

                  <button
                    className="q-option"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div
                      className="q-option-icon"
                      style={{ background: "rgba(255,255,255,0.1)" }}
                    >
                      <Upload
                        size={24}
                        style={{ color: "rgba(255,255,255,0.5)" }}
                      />
                    </div>
                    <div className="q-option-content">
                      <h3>Upload Utility Bill</h3>
                      <p>PDF or photo of your bill</p>
                    </div>
                  </button>
                </div>
              )}

              {scanMode === "smtlogin" && !billData && (
                <>
                  <div
                    className="q-input-group"
                    style={{ flexDirection: "column" }}
                  >
                    <input
                      type="text"
                      className="q-input"
                      placeholder="SMT Username"
                      value={smtUsername}
                      onChange={(e) => setSmtUsername(e.target.value)}
                    />
                    <input
                      type="password"
                      className="q-input"
                      placeholder="SMT Password"
                      value={smtPassword}
                      onChange={(e) => setSmtPassword(e.target.value)}
                    />
                  </div>

                  <button
                    className="q-btn"
                    onClick={handleSmtLogin}
                    disabled={smtLoading || !smtUsername || !smtPassword}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    {smtLoading ? (
                      <>
                        <Loader2 size={18} className="q-spinner" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        Connect Account
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  <button
                    className="q-btn q-btn-secondary"
                    onClick={() => setScanMode(null)}
                    style={{
                      width: "100%",
                      marginTop: 8,
                      justifyContent: "center",
                    }}
                  >
                    Back
                  </button>

                  {smtError && <div className="q-error">{smtError}</div>}

                  <p className="q-helper">
                    Don't have an account?{" "}
                    <a
                      href="https://www.smartmetertexas.com/register"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#10b981" }}
                    >
                      Register at SmartMeterTexas.com
                    </a>
                  </p>
                </>
              )}

              {isScanning && (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <Loader2
                    size={40}
                    className="q-spinner"
                    style={{ color: "#10b981" }}
                  />
                  <p style={{ marginTop: 16, color: "rgba(255,255,255,0.6)" }}>
                    Analyzing your bill with AI...
                  </p>
                </div>
              )}

              {billData && (
                <>
                  <div className="q-success-badge">
                    <CheckCircle size={20} />
                    {billData.calculatedAnnualKwh?.toLocaleString() ||
                      "~14,000"}{" "}
                    kWh/year
                  </div>

                  <button
                    className="q-btn"
                    onClick={nextStep}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    Continue
                    <ArrowRight size={18} />
                  </button>
                </>
              )}

              {scanError && <div className="q-error">{scanError}</div>}
            </div>
          )}

          {/* Step 5: Name */}
          {currentStep === 5 && (
            <div className="q-form">
              {/* Show confirmation message if data was pre-filled */}
              {formData.firstName && billData && (
                <div className="q-prefilled-notice">
                  <CheckCircle size={18} />
                  <span>We found your name! Confirm or edit below.</span>
                </div>
              )}
              <div className="q-form-row">
                <div className="q-form-group">
                  <label className="q-label">First Name</label>
                  <input
                    type="text"
                    className="q-input"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="q-form-group">
                  <label className="q-label">Last Name</label>
                  <input
                    type="text"
                    className="q-input"
                    placeholder="Smith"
                    value={formData.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                  />
                </div>
              </div>

              <button
                className="q-btn"
                onClick={() => setCurrentStep(6)}
                disabled={!formData.firstName || !formData.lastName}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  marginTop: 16,
                }}
              >
                Continue
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* Step 6: Contact Info */}
          {currentStep === 6 && (
            <div className="q-form">
              {formData.email && billData && (
                <div className="q-prefilled-notice">
                  <CheckCircle size={18} />
                  <span>
                    We found your contact info! Confirm or edit below.
                  </span>
                </div>
              )}

              <div className="q-form-group" style={{ marginBottom: 16 }}>
                <label className="q-label">Email</label>
                <input
                  type="email"
                  className="q-input"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  autoFocus
                />
              </div>

              <div className="q-form-group">
                <label className="q-label">Phone (optional)</label>
                <input
                  type="tel"
                  className="q-input"
                  placeholder="(512) 555-1234"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </div>

              <button
                className="q-btn"
                onClick={handleSubmit}
                disabled={!formData.email || isSubmitting}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  marginTop: 16,
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="q-spinner" />
                    Designing Your System...
                  </>
                ) : (
                  <>
                    See My Design
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              {error && <div className="q-error">{error}</div>}
            </div>
          )}
        </div>

        {/* Stats Row - Bottom */}
        <div className="q-stats">
          <div className="q-stat">
            <div className="q-stat-value spots-counter" key={spotsLeft}>
              {spotsLeft}
            </div>
            <div className="q-stat-label">Spots Left</div>
          </div>
          <div className="q-stat">
            <div className="q-stat-value">{approvalRate}%</div>
            <div className="q-stat-label">Approval</div>
          </div>
          <div className="q-stat">
            <div className="q-stat-value">$59.7K</div>
            <div className="q-stat-label">Value</div>
          </div>
        </div>
      </div>
    </div>
  );
}
