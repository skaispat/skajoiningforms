// Gate Pass WhatsApp message utilities (Supabase Edge Functions)
import { callEdgeFunction } from "./callEdgeFunction";

const missingPhone = () => {
  console.error("Employee phone number is missing");
  return { success: false, error: "Employee phone number not provided" };
};

// Send WhatsApp message to HOD for gate pass approval
export const sendGatePassMessageToHod = async ({
  employeId,
  tableid,
  whomtoSend,
  employeeName,
  department,
  leaveType,
  fromDate,
  toDate,
  totalDays,
  reason,
}) => {
  return callEdgeFunction(
    "send-gatepass-whatsapp-hod",
    {
      whomtoSend,
      employeeName,
      department,
      leaveType: leaveType || "Gate Pass",
      fromDate,
      toDate,
      totalDays: totalDays || "N/A",
      reason,
      employeId,
      tableid,
    },
    { employeId, tableid }
  );
};

// Send WhatsApp message to HR for gate pass approval
export const sendGatePassMessageToHr = async ({
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
    "send-gatepass-whatsapp-hr",
    {
      whomtoSend: hrPhoneNumber,
      employeeName,
      empId,
      department,
      leaveType: leaveType || "Gate Pass",
      fromDate,
      toDate,
      totalDays: totalDays || "N/A",
      reason,
      employeId,
      tableid,
    },
    { employeId, tableid }
  );
};

// Send approved Gate Pass message to employee
export const sendGatePassApprovedToEmployee = async ({
  employeePhone,
  employeeName,
  leaveType,
  fromDate,
  toDate,
  totalDays,
  reason,
}) => {
  if (!employeePhone) return missingPhone();
  return callEdgeFunction("send-gatepass-whatsapp-employee-approved", {
    employeePhone,
    employeeName,
    leaveType: leaveType || "Gate Pass",
    fromDate,
    toDate,
    totalDays: totalDays || "N/A",
    reason,
  });
};

// Send rejected Gate Pass message to employee
export const sendGatePassRejectedToEmployee = async ({
  employeePhone,
  employeeName,
  leaveType,
  fromDate,
  toDate,
  totalDays,
  hrRemarks,
}) => {
  if (!employeePhone) return missingPhone();
  return callEdgeFunction("send-gatepass-whatsapp-employee-rejected", {
    employeePhone,
    employeeName,
    leaveType: leaveType || "Gate Pass",
    fromDate,
    toDate,
    totalDays: totalDays || "N/A",
    hrRemarks,
  });
};

// Send HOD rejected Gate Pass message to employee (hod_reject template)
export const sendGatePassHodRejectedToEmployee = async ({
  employeePhone,
  employeeName,
  requestType,
  leaveType,
  fromDate,
  toDate,
}) => {
  if (!employeePhone) return missingPhone();
  return callEdgeFunction("send-gatepass-whatsapp-employee-hod-rejected", {
    employeePhone,
    employeeName,
    requestType: requestType || "gate pass request",
    leaveType: leaveType || "Gate Pass",
    fromDate,
    toDate,
  });
};
