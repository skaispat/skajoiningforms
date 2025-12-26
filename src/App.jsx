import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import JoiningForm from './pages/JoiningForm'
import ApprovalForm from './pages/ApprovalForm'
import GatePassApproval from './pages/gatepassApproval'


function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/joining-form/:joiningId?" element={<JoiningForm />} />
        <Route path="/leave-form/:approverId/:id" element={<ApprovalForm />} />
        <Route path="/gatepass-approve/:approverId/:id" element={<GatePassApproval />} />
        <Route path="/" element={<Navigate to="/joining-form" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
