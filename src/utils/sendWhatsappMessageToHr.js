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
  const who = "hr";

  try {
    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/api/send-whatsappMessage-hr?employeId=${employeId}&tableid=${tableid}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          whomtoSend: hrPhoneNumber,
          employeeName: employeeName,
          empId: empId,
          department: department,
          leaveType: leaveType,
          fromDate: fromDate,
          toDate: toDate,
          totalDays: totalDays,
          reason: reason,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.message || "Failed to send WhatsApp message to HR",
      );
    }

    console.log("WhatsApp message sent to HR successfully:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error sending WhatsApp message to HR:", error);
    return { success: false, error: error.message };
  }
};

export default sendWhatsappMessageToHr;
