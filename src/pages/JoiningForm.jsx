import React, { useState, useEffect } from 'react';
import {
  Upload,
  User,
  Briefcase,
  Phone,
  CreditCard,
  FileText,
  CheckCircle,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

const JoiningForm = () => {
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);

  // Check if already submitted
  useEffect(() => {
    const hasSubmitted = localStorage.getItem('hasSubmittedJoiningForm');
    const savedId = localStorage.getItem('submittedJoiningId');
    if (hasSubmitted) {
      setIsSubmitted(true);
      if (savedId) setSubmittedId(savedId);
    }
  }, []);

  // Form State matching 'joining_form' table structure (snake_case for DB, but camelCase for state if preferred, keeping mostly flat)
  // We will map state to snake_case payload on submit.
  const [formData, setFormData] = useState({
    joiningId: '',
    nameAsPerAadhar: '',
    fatherName: '',
    dateOfBirth: '',
    gender: '',
    department: '',
    mobileNo: '+91',
    personalEmail: '',
    familyMobileNo: '+91',
    relationshipWithFamily: '',
    currentAddress: '',
    dateOfJoining: '',
    designation: '',
    highestQualification: '',
    aadharCardNo: '',
    bankAccountNo: '',
    ifscCode: '',
    branchName: '',

    // File objects
    passportPhoto: null,
    aadharCardPhoto: null,
    bankPassbookPhoto: null,
  });

  // Auto-generate Joining ID
  useEffect(() => {
    const fetchLastId = async () => {
      try {
        const { data, error } = await supabase
          .from('joining_form')
          .select('joining_id')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error fetching last ID:', error);
          return;
        }

        let nextId = 'JOB001';
        if (data && data.length > 0 && data[0].joining_id) {
          const lastId = data[0].joining_id;
          const match = lastId.match(/JOB(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            nextId = `JOB${String(num + 1).padStart(3, '0')}`;
          }
        }
        setFormData(prev => ({ ...prev, joiningId: nextId }));
      } catch (err) {
        console.error('Error generating ID:', err);
      }
    };

    fetchLastId();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'mobileNo' || name === 'familyMobileNo') {
      // Allow only numbers and ensure +91 prefix
      // Remove any non-numeric characters except initial +
      let cleaned = value.replace(/[^0-9]/g, '');

      // Check if user is trying to delete +91
      // If the resulting length is less than 2 (i.e. '9' or empty), reset to +91 or protect it.
      // Easiest is to strip everything, take the last digits, and re-append to +91

      // If user pasted something with +91, handle it
      if (value.startsWith('+91')) {
        cleaned = value.substring(3).replace(/[^0-9]/g, '');
      } else {
        // User typed into the prefix or cleared it
        // Just take the digits
        cleaned = value.replace(/[^0-9]/g, '');
        // If they typed 91... handle? 
        // Let's just treat all input as "the number part" if possible, but that's hard if they type
        // Simpler: Just enforce +91 + next 10 digits
      }

      // Limit to 10 digits
      if (cleaned.length > 10) {
        cleaned = cleaned.substring(0, 10);
      }

      setFormData(prev => ({ ...prev, [name]: '+91' + cleaned }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, [fieldName]: file }));
    }
  };

  // Upload file helper
  const uploadFile = async (file, path) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('images') // Using 'images' bucket as seen in project
      .upload(filePath, file);

    if (uploadError) {
      console.error(`Error uploading ${path}:`, uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const fillDummyData = () => {
    const randomNum = (digits) => Math.floor(Math.random() * (10 ** digits)).toString().padStart(digits, '0');
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const firstNames = ['Rahul', 'Amit', 'Priya', 'Sneha', 'Vikram', 'Anjali', 'Rohan', 'Kavita', 'Suresh', 'Anita'];
    const lastNames = ['Sharma', 'Verma', 'Singh', 'Patel', 'Das', 'Kumar', 'Gupta', 'Yadav', 'Mishra', 'Reddy'];
    const departments = ['Production', 'Quality', 'Maintenance', 'Store', 'HR', 'Admin'];
    const designations = ['Operator', 'Supervisor', 'Engineer', 'Helper', 'Technician', 'Executive'];
    const qualifications = ['10th Pass', '12th Pass', 'ITI', 'Diploma', 'B.Tech', 'B.Sc', 'B.Com'];

    const fName = pick(firstNames);
    const lName = pick(lastNames);
    const fullName = `${fName} ${lName}`;
    const fatherName = `${pick(firstNames)} ${lName}`;

    setFormData(prev => ({
      ...prev,
      nameAsPerAadhar: fullName,
      fatherName: fatherName,
      dateOfBirth: `19${Math.floor(Math.random() * (99 - 75 + 1) + 75)}-${randomNum(2).replace(/^00/, '01').replace(/^1[3-9]/, '12')}-${randomNum(2).replace(/^00/, '01').replace(/^[3-9][2-9]/, '28')}`, // Rough random DOB
      gender: Math.random() > 0.5 ? 'Male' : 'Female',
      department: pick(departments),
      mobileNo: '+91' + (Math.floor(Math.random() * 4000000000) + 6000000000).toString(), // Random 9/8/7/6 start
      personalEmail: `${fName.toLowerCase()}.${lName.toLowerCase()}${randomNum(3)}@example.com`,
      familyMobileNo: '+91' + (Math.floor(Math.random() * 4000000000) + 6000000000).toString(),
      relationshipWithFamily: pick(['Father', 'Mother', 'Spouse', 'Brother']),
      currentAddress: `${randomNum(3)}, Sector ${randomNum(2)}, Industrial Area, Gurgaon, Haryana - ${randomNum(6)}`,
      dateOfJoining: new Date().toISOString().split('T')[0],
      designation: pick(designations),
      highestQualification: pick(qualifications),
      aadharCardNo: randomNum(12),
      bankAccountNo: randomNum(14),
      ifscCode: 'HDFC000' + randomNum(4),
      branchName: pick(['M G Road', 'Cyber City', 'Udyog Vihar', 'Sector 14', 'DLF Phase 3']),
    }));
    toast.success('Random dummy data filled!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const toastId = toast.loading('Submitting joining form...');

    try {
      const folder = `joining-docs/${formData.joiningId || 'temp'}`;

      // Upload Files
      const uploadPromises = [];

      // Passport Photo
      if (formData.passportPhoto) {
        uploadPromises.push(uploadFile(formData.passportPhoto, folder));
      } else {
        uploadPromises.push(Promise.resolve(null));
      }

      // Aadhar Card
      if (formData.aadharCardPhoto) {
        uploadPromises.push(uploadFile(formData.aadharCardPhoto, folder));
      } else {
        uploadPromises.push(Promise.resolve(null));
      }

      // Bank Passbook
      if (formData.bankPassbookPhoto) {
        uploadPromises.push(uploadFile(formData.bankPassbookPhoto, folder));
      } else {
        uploadPromises.push(Promise.resolve(null));
      }

      const [passportUrl, aadharUrl, bankPassbookUrl] = await Promise.all(uploadPromises);

      // Prepare Payload
      const payload = {
        joining_id: formData.joiningId,
        name_as_per_aadhar: formData.nameAsPerAadhar,
        father_name: formData.fatherName,
        date_of_birth: formData.dateOfBirth || null,
        gender: formData.gender,
        department: formData.department,
        mobile_no: formData.mobileNo,
        personal_email: formData.personalEmail,
        family_mobile_no: formData.familyMobileNo === '+91' ? null : formData.familyMobileNo,
        relationship_with_family: formData.relationshipWithFamily,
        current_address: formData.currentAddress,
        date_of_joining: formData.dateOfJoining || null,
        designation: formData.designation,
        highest_qualification: formData.highestQualification,
        aadhar_card_number: formData.aadharCardNo,
        bank_account_no: formData.bankAccountNo,
        ifsc_code: formData.ifscCode,
        branch_name: formData.branchName,
        passport_photo_url: passportUrl,
        aadhar_card_url: aadharUrl,
        bank_passbook_url: bankPassbookUrl,
      };

      const { error: insertError } = await supabase
        .from('joining_form')
        .insert([payload]);

      if (insertError) throw insertError;

      toast.success('Joining form submitted successfully!', { id: toastId });

      // Mark as submitted
      localStorage.setItem('hasSubmittedJoiningForm', 'true');
      if (formData.joiningId) {
        localStorage.setItem('submittedJoiningId', formData.joiningId);
        setSubmittedId(formData.joiningId);
      }
      setIsSubmitted(true);

      // Reset Form (optional now as we hide it)
      setFormData({
        joiningId: '', nameAsPerAadhar: '', fatherName: '', dateOfBirth: '', gender: '',
        department: '', mobileNo: '+91', personalEmail: '', familyMobileNo: '+91',
        relationshipWithFamily: '', currentAddress: '', dateOfJoining: '', designation: '',
        highestQualification: '', aadharCardNo: '', bankAccountNo: '', ifscCode: '',
        branchName: '', passportPhoto: null, aadharCardPhoto: null, bankPassbookPhoto: null
      });

    } catch (error) {
      console.error('Submission Error:', error);
      toast.error(`Submission failed: ${error.message}`, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 relative overflow-hidden">
          {/* Top colored line */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#991B1B]"></div>

          <div className="p-8 md:p-12 text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CheckCircle className="text-green-600" size={40} strokeWidth={3} />
            </div>

            <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Application Submitted!</h2>

            <p className="text-slate-500 text-lg mb-8 leading-relaxed">
              Successfully recorded in the system.
            </p>

            {/* ID Card */}
            {submittedId && (
              <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-200 border-dashed relative group hover:border-[#991B1B]/30 transition-colors">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5">Joining ID Generated</p>
                <div className="text-4xl font-mono font-bold text-slate-800 tracking-tight flex justify-center items-center gap-3">
                  {submittedId}
                </div>
                <p className="text-xs text-slate-400 mt-2 font-medium">Please save this ID for future reference</p>
              </div>
            )}

            <div className="space-y-8">
              <button
                onClick={() => {
                  localStorage.removeItem('hasSubmittedJoiningForm');
                  localStorage.removeItem('submittedJoiningId');
                  window.location.reload();
                }}
                className="w-full py-3.5 px-6 rounded-xl bg-[#991B1B] text-white font-bold hover:bg-[#7F1D1D] active:scale-[0.98] transition-all shadow-lg shadow-red-900/10 flex items-center justify-center gap-2"
              >
                <span>Submit Another Response</span>
              </button>

              {/* Footer */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 opacity-80">
                  <span>Powered by</span>
                  <a
                    href="https://www.botivate.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#991B1B] font-bold tracking-tight hover:underline"
                  >
                    Botivate
                  </a>
                </div>
                <div className="text-center text-xs text-slate-400 font-medium opacity-60">
                  &copy; 2025 Botivate Services LLP
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Page Header */}
        <div className="mb-10 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Employee Joining Form</h1>
          <p className="text-slate-500 mt-3 text-lg">Please verify and fill in the details below to complete the new employee onboarding process.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* 1. Basic Information */}
          <SectionCard title="Basic Information" icon={User}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <InputField label="Joining ID (जॉइनिंग आईडी)" name="joiningId" value={formData.joiningId} onChange={handleInputChange} required readOnly={true} placeholder="Auto-generated" />
              <div className="md:col-span-1" /> {/* Spacer if needed or just let it flow */}
              <InputField label="Name As Per Aadhar (नाम आधार के अनुसार)" name="nameAsPerAadhar" value={formData.nameAsPerAadhar} onChange={handleInputChange} required placeholder="Enter full name" />
              <InputField label="Father Name (पिता का नाम)" name="fatherName" value={formData.fatherName} onChange={handleInputChange} required placeholder="Enter father's name" />
              <InputField label="Date Of Birth As per Aadhar (आधार के अनुसार जन्मतिथि)" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleInputChange} required />
              <SelectField label="Gender (लिंग)" name="gender" value={formData.gender} onChange={handleInputChange} options={['Male', 'Female', 'Other']} required />
              <InputField label="Aadhar Card No. (आधार कार्ड नंबर)" name="aadharCardNo" value={formData.aadharCardNo} onChange={handleInputChange} required placeholder="12 digit number" />
            </div>
          </SectionCard>

          {/* 2. Employment Details */}
          <SectionCard title="Employment Details" icon={Briefcase}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InputField label="Department (विभाग)" name="department" value={formData.department} onChange={handleInputChange} required placeholder="e.g. Production" />
              <InputField label="Designation (पद)" name="designation" value={formData.designation} onChange={handleInputChange} required placeholder="e.g. Operator" />
              <InputField label="Date of Joining (जॉइनिंग की तारीख)" name="dateOfJoining" type="date" value={formData.dateOfJoining} onChange={handleInputChange} required />
              <InputField label="Highest Qualification (उच्चतम योग्यता)" name="highestQualification" value={formData.highestQualification} onChange={handleInputChange} placeholder="e.g. 12th Pass" />
            </div>
          </SectionCard>

          {/* 3. Contact Information */}
          <SectionCard title="Contact Information" icon={Phone}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <PhoneInputField label="Mobile No. (मोबाइल नंबर)" name="mobileNo" value={formData.mobileNo} onChange={handleInputChange} required placeholder="9999999999" />
              <InputField label="Personal Email (व्यक्तिगत ईमेल)" name="personalEmail" type="email" value={formData.personalEmail} onChange={handleInputChange} placeholder="email@example.com" />
              <PhoneInputField label="Family Mobile No. (पारिवारिक मोबाइल नंबर)" name="familyMobileNo" value={formData.familyMobileNo} onChange={handleInputChange} placeholder="9999999999" />
              <InputField label="Relationship With Family (परिवार के साथ संबंध)" name="relationshipWithFamily" value={formData.relationshipWithFamily} onChange={handleInputChange} placeholder="e.g. Father" />
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Current Address (वर्तमान पता)</label>
                <textarea
                  name="currentAddress"
                  value={formData.currentAddress}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#991B1B] focus:ring-4 focus:ring-[#991B1B]/5 outline-none transition-all resize-none bg-slate-50 focus:bg-white"
                  placeholder="Enter full residential address..."
                ></textarea>
              </div>
            </div>
          </SectionCard>

          {/* 4. Financial Details */}
          <SectionCard title="Financial Details" icon={CreditCard}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InputField label="Bank Account No. (बैंक खाता संख्या)" name="bankAccountNo" value={formData.bankAccountNo} onChange={handleInputChange} placeholder="Account Number" />
              <InputField label="IFSC Code (आईएफएससी कोड)" name="ifscCode" value={formData.ifscCode} onChange={handleInputChange} placeholder="IFSC Code" />
              <InputField label="Branch Name (शाखा का नाम)" name="branchName" value={formData.branchName} onChange={handleInputChange} placeholder="Branch Name" />
            </div>
          </SectionCard>

          {/* 5. Documents */}
          <SectionCard title="Documents Upload" icon={FileText}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FileUploadField
                label="Passport Size Photo (पासपोर्ट साइज फोटो)"
                name="passportPhoto"
                onChange={(e) => handleFileChange(e, 'passportPhoto')}
                file={formData.passportPhoto}
              />
              <FileUploadField
                label="Aadhar Card (आधार कार्ड)"
                name="aadharCardPhoto"
                onChange={(e) => handleFileChange(e, 'aadharCardPhoto')}
                file={formData.aadharCardPhoto}
              />
              <FileUploadField
                label="Bank Passbook (बैंक पासबुक)"
                name="bankPassbookPhoto"
                onChange={(e) => handleFileChange(e, 'bankPassbookPhoto')}
                file={formData.bankPassbookPhoto}
              />
            </div>
          </SectionCard>

          {/* Action Buttons */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/85 backdrop-blur-xl border-t border-slate-200/80 z-50">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left text-xs text-slate-400 font-medium opacity-80 order-3 md:order-1">
                &copy; 2025 Botivate Services LLP. All rights reserved.
              </div>

              <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 order-2 md:order-2">
                <span>Powered by</span>
                <a
                  href="https://www.botivate.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#991B1B] font-bold tracking-tight"
                >
                  Botivate
                </a>
              </div>

              <div className="flex items-center gap-4 order-1 md:order-3 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={fillDummyData}
                  className="hidden md:block text-xs font-medium text-slate-400 hover:text-[#991B1B] transition-colors"
                >
                  Fill Dummy Data
                </button>
                <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
                <button
                  type="button"
                  className="px-6 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`
                    px-8 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all duration-200 flex items-center gap-2
                    ${submitting
                      ? 'bg-slate-100 text-slate-400 cursor-wait'
                      : 'bg-[#991B1B] hover:bg-[#7F1D1D] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'}
                  `}
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application</span>
                      <CheckCircle size={16} strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Reusable UI Components

const SectionCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
    <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
      <div className="bg-red-50 p-2 rounded-lg text-[#991B1B]">
        <Icon size={18} strokeWidth={2.5} />
      </div>
      <h2 className="font-bold text-slate-800 text-lg">{title}</h2>
    </div>
    <div className="p-6 md:p-8 bg-white">
      {children}
    </div>
  </div>
);

const InputField = ({ label, name, type = "text", value, onChange, placeholder, required, readOnly }) => (
  <div className="group">
    <label className="block text-sm font-semibold text-slate-700 mb-2 group-focus-within:text-[#991B1B] transition-colors">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      readOnly={readOnly}
      className={`w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#991B1B] focus:ring-4 focus:ring-[#991B1B]/5 outline-none transition-all placeholder:text-slate-400
        ${readOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-100' : 'bg-slate-50 focus:bg-white'}
      `}
    />
  </div>
);

const SelectField = ({ label, name, value, onChange, options, required }) => (
  <div className="group">
    <label className="block text-sm font-semibold text-slate-700 mb-2 group-focus-within:text-[#991B1B] transition-colors">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#991B1B] focus:ring-4 focus:ring-[#991B1B]/5 outline-none transition-all appearance-none bg-slate-50 focus:bg-white cursor-pointer"
      >
        <option value="">Select {label}</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-[#991B1B]" size={18} />
    </div>
  </div>
);

const FileUploadField = ({ label, name, onChange, file }) => (
  <div className="space-y-2">
    <label className="block text-sm font-semibold text-slate-700">{label}</label>
    <div className="relative group">
      <input
        type="file"
        id={name}
        onChange={onChange}
        className="hidden"
        accept="image/*,.pdf"
      />
      <label
        htmlFor={name}
        className={`flex flex-col items-center justify-center gap-3 px-4 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300
          ${file
            ? 'border-red-200 bg-red-50/50'
            : 'border-slate-200 hover:border-[#991B1B]/40 hover:bg-slate-50'}`}
      >
        <div className={`p-3 rounded-full transition-colors ${file ? 'bg-white text-[#991B1B] shadow-sm' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-[#991B1B] group-hover:shadow-sm'}`}>
          <Upload size={20} />
        </div>
        <div className="text-center">
          <p className={`text-sm font-medium transition-colors ${file ? 'text-[#991B1B]' : 'text-slate-700 group-hover:text-slate-900'}`}>
            {file ? (file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name) : "Click to upload"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "SVG, PNG, JPG (Max 5MB)"}
          </p>
        </div>
      </label>
    </div>
  </div>
);

const PhoneInputField = ({ label, name, value, onChange, placeholder, required }) => {
  const displayValue = value ? value.replace(/^\+91/, '') : '';

  return (
    <div className="group">
      <label className="block text-sm font-semibold text-slate-700 mb-2 group-focus-within:text-[#991B1B] transition-colors">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-slate-500 font-medium border-r pr-3 border-slate-300 group-focus-within:text-slate-700 group-focus-within:border-[#991B1B]/30 transition-colors">+91</span>
        </div>
        <input
          type="text"
          name={name}
          value={displayValue}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="w-full pl-20 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#991B1B] focus:ring-4 focus:ring-[#991B1B]/5 outline-none transition-all bg-slate-50 focus:bg-white"
          maxLength={10}
        />
      </div>
    </div>
  );
};

export default JoiningForm;
