import { createBrowserRouter } from "react-router";
import React from "react";
import Login from "./pages/Login";
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
import Layout from "./components/Layout";
import PrivateRoute from "./components/PrivateRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    element: <PrivateRoute />,
    children: [
      { element: <Layout />, children: [
        { path: "/dashboard", element: <Dashboard /> },
        { path: "/schedule", element: <Schedule /> },
        { path: "/medical-records", element: <MedicalRecords /> },
        { path: "/patients", element: <Patients /> },
        { path: "/patients/:id", element: <PatientProfile /> },
        { path: "/admission", element: <NewAdmission /> },
        { path: "/evolution/:patientId", element: <NewEvolution /> },
        { path: "/workshops", element: <Workshops /> },
        { path: "/group-session", element: <GroupSession /> },
        { path: "/daily-production", element: <DailyProduction /> },
        { path: "/absences", element: <Absences /> },
        { path: "/referrals", element: <Referrals /> },
        { path: "/appointment-session", element: <AppointmentSession /> },
      ] },
    ],
  },
]);
