import { callEdgeFunction } from "./callEdgeFunction";

// Send leave approval request to HR (Supabase Edge Function: send-whatsappMessage-hr)
export const sendWhatsappMessageToHr = async ({
  employeId,
  tableid,
  employeeName,
  empId,
  department,
  leaveType,
  fromDate,
  toDate,
  totalDays,
  reason,
}) => {
  const hrPhoneNumber = import.meta.env.VITE_HR_MOBILE_NUMBER;
  if (!hrPhoneNumber) {
    console.error("VITE_HR_MOBILE_NUMBER is not set in .env");
    return { success: false, error: "HR phone number not configured" };
  }

  return callEdgeFunction(
    "send-whatsappMessage-hr",
    {
      whomtoSend: hrPhoneNumber,
      employeeName,
      empId,
      department,
      leaveType,
      fromDate,
      toDate,
      totalDays,
      reason,
      employeId,
      tableid,
    },
    { employeId, tableid }
  );
};

export default sendWhatsappMessageToHr;
