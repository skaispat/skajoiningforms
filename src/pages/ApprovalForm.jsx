import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  FileText,
  User,
  Briefcase,
  Calendar,
  Clock,
  MessageSquare,
  Check,
  X,
  Shield,
  ChevronRight,
  Quote,
  CloudHail,
} from "lucide-react";
import toast from "react-hot-toast";
import { sendWhatsappMessageToHr } from "../utils/sendWhatsappMessageToHr";
import {
  sendApprovedMessageToEmployee,
  sendRejectedMessageToEmployee,
  sendHodRejectedMessageToEmployee,
} from "../utils/sendWhatsappMessageToEmployee";

const ApprovalForm = () => {
  const { approverId, id } = useParams();
  const [request, setRequest] = useState(null);



  const [approver, setApprover] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentRemarks, setCurrentRemarks] = useState("");
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(false);
  const [successData, setSuccessData] = useState({ action: "", role: "" });
  const [editableEndDate, setEditableEndDate] = useState("");

  const [isHodSameAsHr, setIsHodSameAsHr] = useState(false);
  const [editableLeaveType, setEditableLeaveType] = useState("");
  const [leaveSplits, setLeaveSplits] = useState({
    casual: 0,
    earned: 0,
    unpaid: 0,
  });


  // Show popup if params are missing - placed after all hooks
  const missingParams = !approverId || !id;

  useEffect(() => {
    if (id && approverId) {
      fetchRequest();
    }
  }, [id, approverId]);

  const fetchRequest = async () => {
    try {
      // Fetch Request
      const { data, error } = await supabase
        .from("leave_management")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Request not found");

      if (data?.hod_id == data?.hr_id) {
        setIsHodSameAsHr(true);
      }


      // Fetch Approver Details
      // Fetch by emp_id (schema primary key)
      // Fetch Approver Details
      // Try fetching by full_name first (as per new requirements)
      let { data: approverData, error: approverError } = await supabase
        .from("users")
        .select("*")
        .eq("full_name", approverId)
        .maybeSingle();

      // If not found by full_name, try by emp_id
      if (!approverData) {
        const { data: approverEmpData } = await supabase
          .from("users")
          .select("*")
          .eq("emp_id", approverId)
          .maybeSingle();
        approverData = approverEmpData;
      }

      // If still not found, try by UUID
      if (!approverData) {
        const { data: approverUuidData } = await supabase
          .from("users")
          .select("*")
          .eq("id", approverId)
          .maybeSingle();
        approverData = approverUuidData;
      }

      // Fetch HR Name (for display purposes if needed)
      const { data: hrData } = await supabase
        .from("users")
        .select("full_name, phone_number, emp_id")
        .eq("department", "HR")
        .order("is_hod", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch Employee Phone Number and Department from users table
      const { data: employeeData } = await supabase
        .from("users")
        .select("phone_number, department")
        .eq("full_name", data.employee_name)
        .maybeSingle();

      setRequest({
        ...data,
        startDate: formatDate(data.leave_date_start),
        endDate: formatDate(data.leave_date_end),
        hr_name: hrData?.full_name || "HR Department",
        hr_phone: hrData?.phone_number,
        hr_id_val: hrData?.emp_id,
        employee_phone: employeeData?.phone_number,
        // Use department from leave_management, fallback to employee's department from users table
        department: data.department || employeeData?.department || "N/A",
      });
      // Initialize editable end date with the original value
      setEditableEndDate(data.leave_date_end || "");
      setEditableLeaveType(data.leave_type || "");
      setLeaveSplits({
        casual: data.casual || 0,
        earned: data.earned || 0,
        unpaid: data.unpaid || 0,
      });

      if (approverData) {
        setApprover(approverData);
      } else {
        console.warn("Approver not found for ID/Name:", approverId);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleAction = async (action) => {
    if (!request) return;
    if (!approver) {
      toast.error("Approver identification failed. Cannot process action.");
      return;
    }

    setActionLoading(true);

    try {
      let newStatus = request.status;
      let logAction = "";

      const isHodAction =
        request.status === "Pending" || request.status === "Pending HOD";
      // If HOD ID is 1 (Default), it should have been 'Pending HR' from start, so this logic holds.
      const isHrAction = request.status === "Pending HR";

      // Permissions allowed for anyone with the link
      // Validate Approver Role block removed

      if (!isHodAction && !isHrAction) {
        toast.error("Action already taken or invalid status.");
        setActionLoading(false);
        return;
      }

      if (action === "approve") {
        const canEditLeaves = isHrAction || (isHodAction && isHodSameAsHr);
        if (canEditLeaves) {
          const totalSplits =
            leaveSplits.casual + leaveSplits.earned + leaveSplits.unpaid;
          const totalDays = calculateDays(
            request.leave_date_start,
            editableEndDate || request.leave_date_end,
          );

          if (totalSplits !== totalDays) {
            toast.error(
              `Total breakdown (${totalSplits}) must equal total days (${totalDays})`,
            );
            setActionLoading(false);
            return;
          }
        }

        if (isHodAction) {
          if (isHodSameAsHr) {
            // Auto-approve if HOD is same as HR
            newStatus = "Approved";
            logAction = "Approved (Auto by HOD=HR)";
          } else {
            newStatus = "Pending HR";
            logAction = "Approved";
          }
        } else if (isHrAction) {
          newStatus = "Approved";
          logAction = "Approved";
        }
      } else {
        newStatus = "Rejected";
        logAction = "Rejected";
      }

      // Update leave_management
      const updateData = {
        status: newStatus,
        // Include updated end date if changed
        ...(editableEndDate &&
          editableEndDate !== request.leave_date_end && {
          leave_date_end: editableEndDate,
        }),
        ...(isHodAction && {
          hod_remarks: currentRemarks,
          hod_id: approver.emp_id,
          hod_name: approver.full_name,
        }),
        ...(isHrAction && {
          hr_remarks: currentRemarks,
          hr_id: approver.emp_id,
          hr_name: approver.full_name,
          leave_type: editableLeaveType,
          casual: leaveSplits.casual,
          earned: leaveSplits.earned,
          unpaid: leaveSplits.unpaid,
        }),
        // If HOD is HR and skipping, ensure HR fields are also filled
        ...(isHodAction &&
          isHodSameAsHr &&
          action === "approve" && {
          hr_remarks: currentRemarks, // Copy remarks to HR field too
          hr_id: approver.emp_id,
          hr_name: approver.full_name,
          leave_type: editableLeaveType,
          casual: leaveSplits.casual,
          earned: leaveSplits.earned,
          unpaid: leaveSplits.unpaid,
        }),
      };

      const { error: updateError } = await supabase
        .from("leave_management")
        .update(updateData)
        .eq("id", id);

      if (updateError) throw updateError;

      // Log Update
      const logUpdateData = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(isHodAction && {
          hod_action: logAction,
          hod_approval_time: new Date().toISOString(),
          hod_remarks: currentRemarks,
          hod_id: approver.emp_id,
          hod_name: approver.full_name,
        }),
        ...(isHrAction && {
          hr_action: logAction,
          hr_approval_time: new Date().toISOString(),
          hr_remarks: currentRemarks,
          hr_id: approver.emp_id,
          hr_name: approver.full_name,
        }),
        // Log HR action if auto-approved
        ...(isHodAction &&
          isHodSameAsHr &&
          action === "approve" && {
          hr_action: logAction,
          hr_approval_time: new Date().toISOString(),
          hr_remarks: currentRemarks,
          hr_id: approver.emp_id,
          hr_name: approver.full_name,
        }),
      };

      await supabase
        .from("logs")
        .update(logUpdateData)
        .eq("request_id", id)
        .eq("request_type", "Leave");

      // Update yearly_quota when leave is fully approved
      if (newStatus === "Approved") {

        const leaveDays = calculateDays(
          request.leave_date_start,
          editableEndDate || request.leave_date_end
        );
        const currentYear = new Date().getFullYear();
        const employeeId = request.emp_id;

        try {
          // Check if yearly_quota record exists
          const { data: existingQuota, error: quotaCheckError } = await supabase
            .from("yearly_quota")
            .select("*")
            .eq("emp_id", employeeId)
            .eq("year", currentYear)
            .maybeSingle();

          if (quotaCheckError) {
            console.error("Error checking yearly quota:", quotaCheckError);
          } else if (existingQuota) {
            // Update existing record using split counts
            const { error: quotaUpdateError } = await supabase
              .from("yearly_quota")
              .update({
                casual_leave_used: (existingQuota.casual_leave_used || 0) + leaveSplits.casual,
                earned_leave_used: (existingQuota.earned_leave_used || 0) + leaveSplits.earned,
                unpaid_leave_used: (existingQuota.unpaid_leave_used || 0) + leaveSplits.unpaid,
              })
              .eq("id", existingQuota.id);

            if (quotaUpdateError) {
              console.error("Error updating yearly quota:", quotaUpdateError);
            }
          } else {
            // Create new record for this year
            const { error: quotaInsertError } = await supabase
              .from("yearly_quota")
              .insert({
                emp_id: employeeId,
                year: currentYear,
                casual_leave_used: leaveSplits.casual,
                earned_leave_used: leaveSplits.earned,
                unpaid_leave_used: leaveSplits.unpaid,
                casual_leave_limit: 12,
                earned_leave_limit: 24,
              });

            if (quotaInsertError) {
              console.error("Error inserting yearly quota:", quotaInsertError);
            }
          }
        } catch (quotaError) {
          console.error("Quota update error:", quotaError);
        }


      }


      // Send WhatsApp message to HR when HOD approves (status becomes "Pending HR")
      if (newStatus === "Pending HR") {
        const hrMessageResult = await sendWhatsappMessageToHr({
          employeId: request.hr_id, // HR ID from the request
          tableid: id,
          employeeName: request.employee_name,
          empId: request.emp_id,
          department: request.department,
          leaveType: request.leave_type,
          fromDate: request.leave_date_start,
          toDate: editableEndDate || request.leave_date_end,
          totalDays: calculateDays(
            request.leave_date_start,
            editableEndDate || request.leave_date_end,
          ),
          reason: request.remarks,
        });

        if (!hrMessageResult.success) {
          console.warn("Failed to send WhatsApp to HR:", hrMessageResult.error);
          // Not throwing error as the main action already succeeded
        }
      }

      // Send WhatsApp message to Employee when HR approves or rejects (final action)
      // Only send when newStatus is "Approved" or when HR rejects (isHrAction && newStatus === "Rejected")
      // ALSO send if HOD auto-approved just now.
      const isFinalAction =
        newStatus === "Approved" ||
        (newStatus === "Rejected" && (isHrAction || isHodSameAsHr)); // Reject by HOD=HR is final

      if (isFinalAction && request.employee_phone) {
        if (action === "approve") {
          // Template D: HR Approves → Final Message to User
          const approvedResult = await sendApprovedMessageToEmployee({
            employeePhone: request.employee_phone,
            employeeName: request.employee_name,
            leaveType: editableLeaveType || request.leave_type,
            fromDate: request.leave_date_start,
            toDate: editableEndDate || request.leave_date_end,
            totalDays: calculateDays(
              request.leave_date_start,
              editableEndDate || request.leave_date_end,
            ),
            reason: request.remarks,
          });

          if (!approvedResult.success) {
            console.warn(
              "Failed to send approved message to employee:",
              approvedResult.error,
            );
          }
        } else {
          // Template E: HR Rejects → Final Rejection Message to User
          const rejectedResult = await sendRejectedMessageToEmployee({
            employeePhone: request.employee_phone,
            employeeName: request.employee_name,
            leaveType: editableLeaveType || request.leave_type,
            fromDate: request.leave_date_start,
            toDate: editableEndDate || request.leave_date_end,
            totalDays: calculateDays(
              request.leave_date_start,
              editableEndDate || request.leave_date_end,
            ),
            hrRemarks: currentRemarks,
          });

          if (!rejectedResult.success) {
            console.warn(
              "Failed to send rejected message to employee:",
              rejectedResult.error,
            );
          }
        }
      }

      // Send HOD Rejection message to employee when HOD (not same as HR) rejects
      // This uses the hod_reject template
      if (
        newStatus === "Rejected" &&
        isHodAction &&
        !isHodSameAsHr &&
        request.employee_phone
      ) {
        const hodRejectedResult = await sendHodRejectedMessageToEmployee({
          employeePhone: request.employee_phone,
          employeeName: request.employee_name,
          leaveType: editableLeaveType || request.leave_type,
          fromDate: request.leave_date_start,
          toDate: editableEndDate || request.leave_date_end,
        });

        if (!hodRejectedResult.success) {
          console.warn(
            "Failed to send HOD rejected message to employee:",
            hodRejectedResult.error,
          );
        }
      }

      toast.success(
        `Request ${action === "approve" ? "Approved" : "Rejected"} Successfully`,
      );

      setSuccessData({
        action: action === "approve" ? "Approved" : "Rejected",
        role:
          isHodAction && approver.department === "HR"
            ? "HR"
            : isHodAction
              ? "HOD"
              : "HR",
      });
      setActionSuccess(true);
    } catch (err) {
      console.error("Action error:", err);
      toast.error("Failed to process action");
    } finally {
      setActionLoading(false);
    }
  };

  // Show popup if params are missing
  if (missingParams) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans bg-gray-100/90 backdrop-blur-xl">
        <div className="w-full max-w-sm p-8 text-center bg-white shadow-2xl rounded-3xl animate-fade-in-up ring-1 ring-black/5">
          <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 text-white rounded-full shadow-xl bg-gradient-to-br from-amber-400 to-amber-600">
            <Shield className="w-10 h-10" />
          </div>
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900">
            Missing Parameters
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-slate-500">
            Required URL parameters are missing. Please provide the following to
            access this page:
          </p>
          <div className="p-4 mb-6 text-left border border-amber-100 bg-amber-50 rounded-xl">
            <ul className="space-y-2 text-xs text-amber-800">
              <li className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${id ? "bg-emerald-500" : "bg-red-500"}`}
                ></span>
                <span className="font-medium">Request ID:</span>
                <span className={id ? "text-emerald-600" : "text-red-600"}>
                  {id || "Not provided"}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${approverId ? "bg-emerald-500" : "bg-red-500"}`}
                ></span>
                <span className="font-medium">Approver ID:</span>
                <span
                  className={approverId ? "text-emerald-600" : "text-red-600"}
                >
                  {approverId || "Not provided"}
                </span>
              </li>
            </ul>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            The URL should follow the format:
            <br />
            <code className="inline-block px-2 py-1 mt-1 bg-gray-100 rounded text-slate-600">
              /approval/:approverId/:id
            </code>
          </p>
        </div>
      </div>
    );
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 rounded-full border-slate-900 border-t-transparent animate-spin" />
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen font-medium text-red-500 bg-gray-50">
        {error}
      </div>
    );
  if (!request)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-slate-500">
        Request not found
      </div>
    );

  const isPendingHOD =
    request.status === "Pending" || request.status === "Pending HOD";
  const isPendingHR = request.status === "Pending HR";
  const showLeaveEditor = isPendingHR || (isPendingHOD && isHodSameAsHr);

  // User Logic: Block approverId 1 during HOD phase, allow during HR phase
  const isActionable = (isPendingHOD && (approverId !== "1")) || isPendingHR;

  let statusMessage = null;
  let statusStyles = {
    bg: "bg-amber-50",
    border: "border-amber-100",
    text: "text-amber-800",
    iconColor: "text-amber-600",
    Icon: Shield,
  };

  if (!isActionable) {
    if (request.status === "Approved") {
      statusMessage = `The leave for ${request.employee_name} has been approved.`;
      statusStyles = {
        bg: "bg-emerald-50",
        border: "border-emerald-100",
        text: "text-emerald-800",
        iconColor: "text-emerald-600",
        Icon: Check,
      };
    } else if (request.status?.includes("Rejected")) {
      statusMessage = `The leave for ${request.employee_name} has been rejected.`;
      statusStyles = {
        bg: "bg-red-50",
        border: "border-red-100",
        text: "text-red-800",
        iconColor: "text-red-600",
        Icon: X,
      };
    } else {
      statusMessage =
        "Please Wait Until The HOD Has Approved Or Rejected The Leave Request.";
    }
  }

  const dayCount = calculateDays(
    request.leave_date_start,
    request.leave_date_end,
  );

  if (actionSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans bg-gray-100/90 backdrop-blur-xl">
        <div className="w-full max-w-sm p-8 text-center bg-white shadow-2xl rounded-3xl animate-fade-in-up ring-1 ring-black/5">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl ${successData.action === "Approved"
              ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white"
              : "bg-gradient-to-br from-red-400 to-red-600 text-white"
              }`}
          >
            {successData.action === "Approved" ? (
              <Check className="w-10 h-10" />
            ) : (
              <X className="w-10 h-10" />
            )}
          </div>
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900">
            Request {successData.action}
          </h2>
          <p className="mb-8 text-sm leading-relaxed text-slate-500">
            {successData.role === "HR"
              ? `This request has been processed by the HR Department.`
              : `This request has been processed by the Head of Department.`}
          </p>
          <p className="text-sm font-medium text-slate-400">
            You can close this window now
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center font-sans bg-gray-50/50 backdrop-blur-sm sm:p-4 md:p-6">
      <div className="w-full sm:max-w-lg md:max-w-2xl bg-white sm:rounded-3xl shadow-2xl shadow-slate-200/50 flex flex-col h-full sm:h-auto sm:max-h-[90vh] overflow-hidden sm:ring-1 sm:ring-black/5">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight text-slate-900">
                Leave Request
              </h2>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                ID: #{id?.slice(0, 8)}
              </p>
            </div>
          </div>
          <div
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${request.status === "Approved"
              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
              : request.status.includes("Rejected")
                ? "bg-red-50 text-red-600 border border-red-100"
                : "bg-amber-50 text-amber-600 border border-amber-100"
              }`}
          >
            {request.status.includes("Rejected") ? (
              <X className="w-3 h-3" />
            ) : request.status === "Approved" ? (
              <Check className="w-3 h-3" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
            {request.status === "Pending" || request.status === "Pending HOD"
              ? "Pending HOD"
              : request.status?.includes("Rejected")
                ? "Rejected"
                : request.status}
          </div>
        </div>

        {/* Scrollable Content */}
        {/* Main Grid Content */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto md:p-6 md:space-y-6">
          {/* Upper Section: Action Banner + Employee Info */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Left Col: Action Banner / Status */}
            {isActionable ? (
              <div className="relative flex flex-col justify-between h-full p-5 overflow-hidden bg-white border border-indigo-100 shadow-sm rounded-2xl group">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2 opacity-90">
                    <span className="relative flex w-2 h-2">
                      <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-emerald-400"></span>
                      <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500"></span>
                    </span>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                      Action Required
                    </p>
                  </div>
                  <h3 className="mb-1 text-xl font-bold leading-tight tracking-tight text-slate-900">
                    Hi, {approver?.full_name || "Approver"}
                  </h3>
                  <p className="text-xs font-medium leading-relaxed text-slate-500">
                    Review leave request from{" "}
                    <span className="font-bold text-slate-900">
                      {request.employee_name}
                    </span>
                    .
                  </p>
                </div>
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-24 h-24 -mt-10 -mr-10 transition-all rounded-full bg-indigo-50 blur-2xl group-hover:bg-indigo-100/50" />
              </div>
            ) : statusMessage ? (
              <div
                className={`${statusStyles.bg} rounded-2xl p-4 border ${statusStyles.border} flex items-start gap-3 h-full`}
              >
                <statusStyles.Icon
                  className={`w-5 h-5 ${statusStyles.iconColor} shrink-0 mt-0.5`}
                />
                <p
                  className={`text-xs ${statusStyles.text} font-medium leading-relaxed`}
                >
                  {statusMessage}
                </p>
              </div>
            ) : null}

            {/* Right Col: Employee & Leave Stats */}
            <div className="flex flex-col justify-center p-4 border border-gray-100 bg-gray-50 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 text-lg font-bold text-indigo-600 bg-white border border-gray-200 shadow-sm rounded-xl">
                  {request.employee_name?.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold leading-tight text-slate-900">
                    {request.employee_name}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Applicant
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="px-3 py-2 bg-white border rounded-xl border-gray-200/50">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Type
                  </p>
                  <div className="flex items-center gap-1.5">
                    {showLeaveEditor ? (
                      <select
                        value={editableLeaveType}
                        onChange={(e) => setEditableLeaveType(e.target.value)}
                        className="w-full px-2 py-1 text-xs font-bold border border-gray-200 rounded-lg text-slate-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="Casual Leave">Casual Leave</option>
                        <option value="Earned Leave">Earned Leave</option>
                        <option value="UnPaid Leave">UnPaid Leave</option>
                      </select>
                    ) : (
                      <p className="text-xs font-bold truncate text-slate-900">
                        {request.leave_type}
                      </p>
                    )}
                  </div>
                </div>
                <div className="px-3 py-2 bg-white border rounded-xl border-gray-200/50">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Days
                  </p>
                  <p className="text-xs font-bold text-slate-900">{dayCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Date Flow - Compact */}
          <div className="relative flex items-center justify-between p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div className="text-left">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                Start
              </p>
              <p className="text-sm font-bold text-slate-900">
                {request.startDate}
              </p>
            </div>
            <div className="px-4 text-gray-200">
              <ChevronRight className="w-4 h-4" />
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                End
              </p>
              {showLeaveEditor ? (
                <div className="flex flex-col gap-2">
                  <input
                    type="date"
                    value={editableEndDate}
                    onChange={(e) => setEditableEndDate(e.target.value)}
                    min={request.leave_date_start}
                    className="px-2 py-1 text-sm font-bold border border-gray-200 rounded-lg text-slate-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 font-medium">Original: {request.endDate}</p>
                </div>
              ) : (
                <p className="text-sm font-bold text-slate-900">
                  {request.endDate}
                </p>
              )}
            </div>
          </div>

          {/* Leave Breakdown for HR */}
          {showLeaveEditor && (
            <div className="p-4 bg-white border border-indigo-100 shadow-sm rounded-2xl">
              <h5 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                Leave Breakdown (HR Only)
              </h5>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Casual</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={leaveSplits.casual}
                    onChange={(e) => setLeaveSplits(prev => ({ ...prev, casual: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-xs font-bold border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Earned</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={leaveSplits.earned}
                    onChange={(e) => setLeaveSplits(prev => ({ ...prev, earned: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-xs font-bold border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Unpaid</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={leaveSplits.unpaid}
                    onChange={(e) => setLeaveSplits(prev => ({ ...prev, unpaid: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-xs font-bold border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className={`text-[10px] font-bold ${(leaveSplits.casual + leaveSplits.earned + leaveSplits.unpaid) === calculateDays(request.leave_date_start, editableEndDate || request.leave_date_end)
                  ? "text-emerald-600"
                  : "text-red-500"
                  }`}>
                  Total: {leaveSplits.casual + leaveSplits.earned + leaveSplits.unpaid} / {calculateDays(request.leave_date_start, editableEndDate || request.leave_date_end)} Days
                </p>
                {(leaveSplits.casual + leaveSplits.earned + leaveSplits.unpaid) !== calculateDays(request.leave_date_start, editableEndDate || request.leave_date_end) && (
                  <p className="text-[10px] font-medium text-red-400 animate-pulse">Counts must match total days</p>
                )}
              </div>
            </div>
          )}

          {/* Remarks Section - Compact */}
          <div className="space-y-3">
            <div className="p-4 border border-gray-100 bg-gray-50 rounded-xl">
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Quote className="w-3 h-3" />
                Reason
              </h5>
              <p className="text-xs font-medium leading-relaxed text-slate-700">
                {request.remarks || "No specific reason provided."}
              </p>
            </div>

            {request.hod_remarks && (
              <div className="p-4 border border-indigo-100 bg-indigo-50/50 rounded-xl">
                <h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">
                  HOD Remarks
                </h5>
                <div className="flex gap-3">
                  <div className="w-0.5 bg-indigo-300 rounded-full" />
                  <p className="text-xs leading-relaxed text-indigo-900">
                    {request.hod_remarks}
                  </p>
                </div>
              </div>
            )}

            {request.hr_remarks && (
              <div className="p-4 border border-purple-100 bg-purple-50/50 rounded-xl">
                <h5 className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">
                  HR Remarks
                </h5>
                <div className="flex gap-3">
                  <div className="w-0.5 bg-purple-300 rounded-full" />
                  <p className="text-xs leading-relaxed text-purple-900">
                    {request.hr_remarks}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Action Area - Compact */}
        {request &&
          (isActionable || isHodSameAsHr) &&
          request.status !== "Approved" &&
          !request.status.includes("Rejected") && (


            <div className="z-30 p-4 bg-white border-t border-gray-100 shadow-xl">
              <div className="flex items-end gap-3">
                <div className="relative flex-1">
                  <textarea
                    value={currentRemarks}
                    onChange={(e) => setCurrentRemarks(e.target.value)}
                    placeholder="Add remarks..."
                    className="w-full h-12 px-4 py-3 text-xs font-medium transition-all border border-gray-200 resize-none pr-9 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 placeholder:text-gray-400"
                  />
                  <MessageSquare className="absolute right-3 top-3.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <button
                  onClick={() => handleAction("reject")}
                  disabled={actionLoading || (!isActionable && !isHodSameAsHr)}
                  className="flex items-center justify-center gap-2 py-3 text-xs font-bold text-red-600 transition-all bg-white border border-red-100 rounded-xl hover:bg-red-50 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <div className="w-3 h-3 border-2 border-red-600 rounded-full border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      Reject
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleAction("approve")}
                  disabled={actionLoading || (!isActionable && !isHodSameAsHr)}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs text-white bg-[#16A34A] hover:bg-[#15803d] shadow-lg shadow-green-100 hover:shadow-xl hover:shadow-green-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <div className="w-3 h-3 border-2 border-white rounded-full border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Approve Request
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default ApprovalForm;
