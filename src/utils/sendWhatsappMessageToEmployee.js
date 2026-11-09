import { callEdgeFunction } from "./callEdgeFunction";

const missingPhone = () => {
  console.error("Employee phone number is missing");
  return { success: false, error: "Employee phone number not provided" };
};

// Send WhatsApp message to employee when HR approves leave
export const sendApprovedMessageToEmployee = async ({
  employeePhone,
  employeeName,
  leaveType,
  fromDate,
  toDate,
  totalDays,
  reason,
}) => {
  if (!employeePhone) return missingPhone();
  return callEdgeFunction("send-whatsappMessage-employee-approved", {
    employeePhone,
    employeeName,
    leaveType,
    fromDate,
    toDate,
    totalDays,
    reason,
  });
};

// Send WhatsApp message to employee when HR rejects leave
export const sendRejectedMessageToEmployee = async ({
  employeePhone,
  employeeName,
  leaveType,
  fromDate,
  toDate,
  totalDays,
  hrRemarks,
}) => {
  if (!employeePhone) return missingPhone();
  return callEdgeFunction("send-whatsappMessage-employee-rejected", {
    employeePhone,
    employeeName,
    leaveType,
    fromDate,
    toDate,
    totalDays,
    hrRemarks,
  });
};

// Send WhatsApp message to employee when HOD rejects leave (hod_reject template)
export const sendHodRejectedMessageToEmployee = async ({
  employeePhone,
  employeeName,
  leaveType,
  fromDate,
  toDate,
}) => {
  if (!employeePhone) return missingPhone();
  return callEdgeFunction("send-whatsappMessage-employee-hod-rejected", {
    employeePhone,
    employeeName,
    leaveType,
    fromDate,
    toDate,
  });
};
