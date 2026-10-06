import { createBrowserRouter } from "react-router";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientProfile from "./pages/PatientProfile";
import NewAdmission from "./pages/NewAdmission";
import NewEvolution from "./pages/NewEvolution";
import Workshops from "./pages/Workshops";
import GroupSession from "./pages/GroupSession";
import DailyProduction from "./pages/DailyProduction";
import Absences from "./pages/Absences";
import Referrals from "./pages/Referrals";
import AppointmentSession from "./pages/AppointmentSession";
import Schedule from "./pages/Schedule";
import MedicalRecords from "./pages/MedicalRecords";
import Users from "./pages/Users";
import Layout from "./components/Layout";
import PrivateRoute from "./components/PrivateRoute";
import { ADMIN_ROLES, CLINICAL_ROLES, PATIENT_ROLES, STAFF_ROLES } from "./roles";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    element: <PrivateRoute />,
    children: [
      { path: "/change-password", element: <ChangePassword /> },
      {
        element: <Layout />,
        children: [
          {
            element: <PrivateRoute roles={STAFF_ROLES} />,
            children: [
              { path: "/dashboard", element: <Dashboard /> },
              { path: "/schedule", element: <Schedule /> },
              { path: "/workshops", element: <Workshops /> },
              { path: "/group-session", element: <GroupSession /> },
              { path: "/daily-production", element: <DailyProduction /> },
              { path: "/absences", element: <Absences /> },
              { path: "/referrals", element: <Referrals /> },
              { path: "/appointment-session", element: <AppointmentSession /> },
            ],
          },
          {
            element: <PrivateRoute roles={PATIENT_ROLES} />,
            children: [
              { path: "/patients", element: <Patients /> },
              { path: "/patients/:id", element: <PatientProfile /> },
              { path: "/admission", element: <NewAdmission /> },
            ],
          },
          {
            element: <PrivateRoute roles={CLINICAL_ROLES} />,
            children: [
              { path: "/medical-records", element: <MedicalRecords /> },
              { path: "/evolution/:patientId", element: <NewEvolution /> },
            ],
          },
          {
            element: <PrivateRoute roles={ADMIN_ROLES} />,
            children: [{ path: "/users", element: <Users /> }],
          },
        ],
      },
    ],
  },
]);
