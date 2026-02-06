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
  try {
    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/api/send-whatsappMessage-employee-approved`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeePhone,
          employeeName,
          leaveType,
          fromDate,
          toDate,
          totalDays,
          reason,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.message || "Failed to send approved message to employee",
      );
    }

    console.log("Leave approved message sent to employee:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error sending approved message to employee:", error);
    return { success: false, error: error.message };
  }
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
  try {
    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/api/send-whatsappMessage-employee-rejected`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeePhone,
          employeeName,
          leaveType,
          fromDate,
          toDate,
          totalDays,
          hrRemarks,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.message || "Failed to send rejected message to employee",
      );
    }

    console.log("Leave rejected message sent to employee:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error sending rejected message to employee:", error);
    return { success: false, error: error.message };
  }
};

// Send WhatsApp message to employee when HOD rejects leave (using hod_reject template)
export const sendHodRejectedMessageToEmployee = async ({
  employeePhone,
  employeeName,
  leaveType,
  fromDate,
  toDate,
}) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/api/send-whatsappMessage-employee-hod-rejected`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeePhone,
          employeeName,
          leaveType,
          fromDate,
          toDate,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.message || "Failed to send HOD rejected message to employee",
      );
    }

    console.log("Leave HOD rejected message sent to employee:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error sending HOD rejected message to employee:", error);
    return { success: false, error: error.message };
  }
};
